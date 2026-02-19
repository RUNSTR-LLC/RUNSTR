/**
 * SimpleRunTrackerTask - Background GPS point collection
 *
 * CRITICAL: This file must be imported in index.js BEFORE app initialization
 * so TaskManager knows about the background task.
 *
 * Architecture: Direct cache updates (like Nike Run Club / Strava)
 * GPS → This task → SimpleRunTracker.appendGpsPointsToCache() → Real-time UI updates
 */

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { SIMPLE_TRACKER_TASK, simpleRunTracker } from './SimpleRunTracker';
import { calculateDistance } from '../../utils/gpsValidation';
import type { GPSPoint } from './SimpleRunTracker';

// Storage keys
const SESSION_STATE_KEY = '@runstr:session_state';
const LAST_GPS_POINT_KEY = '@runstr:last_gps_point'; // Only store last point for filtering (not full array)

// Activity-specific GPS filtering thresholds
// SIMPLIFIED based on October 2024 implementation that worked for 10K runs
// Key insight: GPS hardware already filters, we should trust it more
const ACTIVITY_THRESHOLDS = {
  running: {
    maxAccuracy: Platform.OS === 'android' ? 100 : 50, // Trust GPS hardware more
    maxSpeed: 20, // m/s (~72 km/h) - only reject truly impossible
    maxTeleport: Platform.OS === 'android' ? 150 : 100, // Only reject extreme jumps
    minDistance: 0.5, // meters - match October's jitter filter
  },
  walking: {
    // FIX: Match running thresholds - stricter 35m was rejecting all GPS points on some devices
    // Urban environments commonly report 40-80m accuracy, causing 0.0 km walks
    maxAccuracy: Platform.OS === 'android' ? 100 : 50, // Same as running - trust GPS hardware
    maxSpeed: 12, // m/s (~43 km/h) - keep walking speed limit
    maxTeleport: Platform.OS === 'android' ? 150 : 100, // Same as running
    minDistance: 0.5, // meters - same as running
  },
  cycling: {
    maxAccuracy: Platform.OS === 'android' ? 100 : 50, // Trust GPS hardware more
    maxSpeed: 30, // m/s (~108 km/h) - downhill can be fast
    maxTeleport: Platform.OS === 'android' ? 200 : 150, // Only reject extreme jumps
    minDistance: 1.0, // meters
  },
} as const;

type ActivityType = keyof typeof ACTIVITY_THRESHOLDS;

/**
 * Define the background task
 * This runs even when app is minimized or screen is locked
 */
TaskManager.defineTask(SIMPLE_TRACKER_TASK, async ({ data, error }) => {
  // WATCHDOG HEARTBEAT: Write timestamp immediately to prove we're alive
  // The foreground watchdog reads this to detect if GPS has silently died
  try {
    await AsyncStorage.setItem('@runstr:last_gps_time', Date.now().toString());
  } catch (e) {
    // Non-fatal: heartbeat write failed, watchdog will detect GPS silence and recover
  }

  if (error) {
    console.error('[GPS-FLOW] ❌ TaskManager error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    console.log(`[GPS-FLOW] 📍 Received ${locations.length} raw GPS points`);

    try {
      // FIX 2: Validate session state with proper error handling
      let sessionState;
      try {
        const sessionStateStr = await AsyncStorage.getItem(SESSION_STATE_KEY);
        if (!sessionStateStr) {
          console.log('[GPS-FLOW] ⏹️ No active session in AsyncStorage, ignoring');
          return;
        }
        sessionState = JSON.parse(sessionStateStr);

        // Validate session is recent (within last 4 hours - covers ultramarathons)
        const sessionAge = Date.now() - (sessionState.startTime || 0);
        if (sessionAge > 14400000) { // 4 hours
          console.warn('[GPS-FLOW] ⚠️ Stale session detected (>4h old), ignoring');
          return;
        }
      } catch (parseError) {
        console.error('[GPS-FLOW] ❌ Failed to parse session state:', parseError);
        return;
      }

      console.log(
        `[GPS-FLOW] 📋 Session active: ${sessionState.activityType}, paused: ${sessionState.isPaused}`
      );

      if (sessionState.isPaused) {
        console.log('[GPS-FLOW] ⏸️ Session paused, ignoring');
        return;
      }

      // Get activity-specific thresholds
      const activityType = (sessionState.activityType || 'running') as ActivityType;
      const thresholds = ACTIVITY_THRESHOLDS[activityType] || ACTIVITY_THRESHOLDS.running;

      // MEMORY-ONLY ARCHITECTURE: Only read last GPS point (not full array)
      // This eliminates AsyncStorage write storms that caused 30-min crashes
      let lastValidLocation: GPSPoint | null = null;
      try {
        const lastPointStr = await AsyncStorage.getItem(LAST_GPS_POINT_KEY);
        if (lastPointStr) {
          lastValidLocation = JSON.parse(lastPointStr);
        }
      } catch (storageError) {
        console.error('[GPS-FLOW] ❌ Failed to read last GPS point:', storageError);
        // Continue - will use first point as baseline
      }

      // Simplified filtering - trust GPS hardware more (based on October 2024 implementation)
      // REMOVED: warm-up buffer that delayed first distance update by 9+ seconds
      const validLocations = [];

      for (const loc of locations) {
        const accuracy = loc.coords.accuracy || 999;

        // 1. Accuracy check (relaxed threshold - GPS hardware already filters)
        if (accuracy > thresholds.maxAccuracy) {
          console.log(
            `[SimpleRunTrackerTask] Rejected: poor accuracy ${accuracy.toFixed(
              1
            )}m > ${thresholds.maxAccuracy}m`
          );
          continue;
        }

        // FIX 6: Validate coordinates are in valid range
        // Some Android devices occasionally return garbage coordinates
        if (
          loc.coords.latitude < -90 ||
          loc.coords.latitude > 90 ||
          loc.coords.longitude < -180 ||
          loc.coords.longitude > 180 ||
          !Number.isFinite(loc.coords.latitude) ||
          !Number.isFinite(loc.coords.longitude)
        ) {
          console.warn(
            `[SimpleRunTrackerTask] Invalid coordinates: lat=${loc.coords.latitude}, lon=${loc.coords.longitude}`
          );
          continue;
        }

        const currentPoint: GPSPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          altitude: loc.coords.altitude || undefined,
          timestamp: loc.timestamp,
          accuracy: loc.coords.accuracy || undefined,
          speed: loc.coords.speed || undefined,
        };

        // If this is the first valid point, accept it as baseline
        if (!lastValidLocation) {
          validLocations.push(currentPoint);
          lastValidLocation = currentPoint;
          continue;
        }

        // 3. Minimum time interval (reduce noise from too-frequent updates)
        const timeDiff = (loc.timestamp - lastValidLocation.timestamp) / 1000; // seconds
        if (timeDiff < 1.0) {
          console.log(
            `[SimpleRunTrackerTask] Rejected: too soon (${timeDiff.toFixed(
              2
            )}s < 1.0s)`
          );
          continue;
        }

        // 4. Calculate distance for validation
        const distance = calculateDistance(
          {
            latitude: lastValidLocation.latitude,
            longitude: lastValidLocation.longitude,
            timestamp: lastValidLocation.timestamp,
            accuracy: lastValidLocation.accuracy,
          },
          {
            latitude: currentPoint.latitude,
            longitude: currentPoint.longitude,
            timestamp: currentPoint.timestamp,
            accuracy: currentPoint.accuracy,
          }
        );

        // 5. GPS jitter filter (activity-specific minimum distance)
        if (distance < thresholds.minDistance) {
          // Don't log - this is normal when stationary
          continue;
        }

        // 6. GPS teleportation filter (activity-specific threshold)
        if (distance > thresholds.maxTeleport) {
          console.log(
            `[SimpleRunTrackerTask] Rejected: jump too large (${distance.toFixed(
              1
            )}m > ${thresholds.maxTeleport}m)`
          );
          continue;
        }

        // 7. Speed validation (activity-specific threshold)
        const speed = loc.coords.speed || distance / timeDiff;
        if (speed > thresholds.maxSpeed) {
          console.log(
            `[SimpleRunTrackerTask] Rejected: unrealistic speed (${speed.toFixed(
              1
            )} m/s > ${thresholds.maxSpeed} m/s)`
          );
          continue;
        }

        // Point passed all validation checks
        validLocations.push(currentPoint);
        lastValidLocation = currentPoint;
      }

      if (validLocations.length === 0) {
        console.log('[GPS-FLOW] ⚠️ All points filtered out, nothing to send');
        return;
      }

      // REAL-TIME UPDATES: Update SimpleRunTracker cache directly!
      // This is how Nike Run Club / Strava work - direct data flow
      // GPS → This task → Tracker cache → UI sees fresh data
      //
      // CRITICAL: This call goes to the singleton in the background JS context.
      // The isTracking check was removed from appendGpsPointsToCache() because
      // the background singleton has isTracking=false (separate JS context).
      // Session validation is done above via AsyncStorage (which IS shared).
      console.log(
        `[GPS-FLOW] 📤 Sending ${validLocations.length} valid points to cache...`
      );
      simpleRunTracker.appendGpsPointsToCache(validLocations);

      // Track points received for debug UI
      simpleRunTracker.incrementPointsReceived(
        validLocations.length,
        lastValidLocation?.accuracy
      );

      // Reset GPS watchdog restart counter - GPS is working!
      // This allows unlimited recovery from intermittent failures (e.g., Samsung battery management)
      // by resetting the counter each time we successfully receive GPS data.
      simpleRunTracker.resetGPSRestartCounter();

      // MEMORY-ONLY ARCHITECTURE: Only save the LAST valid point for next filter check
      // This is a tiny write (single point) instead of growing array (eliminated 30-min crash)
      if (lastValidLocation) {
        await AsyncStorage.setItem(LAST_GPS_POINT_KEY, JSON.stringify(lastValidLocation));
      }

      console.log(
        `[GPS-FLOW] ✅ SUCCESS: ${validLocations.length} GPS points added to tracker cache (memory-only)`
      );
    } catch (err) {
      console.error('[GPS-FLOW] ❌ Error processing locations:', err);
    }
  }
});

console.log('[SimpleRunTrackerTask] Task registered successfully');

// Export task name for verification
export { SIMPLE_TRACKER_TASK };
