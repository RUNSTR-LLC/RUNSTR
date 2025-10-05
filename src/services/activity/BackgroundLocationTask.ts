/**
 * BackgroundLocationTask - Handles location updates when app is in background
 * Implements TaskManager for continuous tracking during workouts
 */

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationPoint } from './LocationTrackingService';

export const BACKGROUND_LOCATION_TASK = 'runstr-background-location';
const BACKGROUND_LOCATION_STORAGE = '@runstr:background_locations';
const SESSION_STATE_KEY = '@runstr:active_session_state';

interface BackgroundLocationData {
  locations: Location.LocationObject[];
  sessionId: string;
  activityType: string;
}

/**
 * Define the background task that will handle location updates
 * This runs even when the app is minimized or screen is locked
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    try {
      // Get current session state
      const sessionStateStr = await AsyncStorage.getItem(SESSION_STATE_KEY);
      if (!sessionStateStr) {
        console.log('No active session, ignoring background locations');
        return;
      }

      const sessionState = JSON.parse(sessionStateStr);
      if (sessionState.isPaused) {
        console.log('Session paused, ignoring background locations');
        return;
      }

      // Process and validate locations
      const validLocations = locations
        .map(loc => ({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          altitude: loc.coords.altitude || undefined,
          timestamp: loc.timestamp,
          accuracy: loc.coords.accuracy || undefined,
          speed: loc.coords.speed || undefined,
        } as LocationPoint))
        .filter(loc => loc.accuracy && loc.accuracy < 50); // Only keep accurate points

      if (validLocations.length === 0) {
        return;
      }

      // Store locations in batches for later processing
      const existingDataStr = await AsyncStorage.getItem(BACKGROUND_LOCATION_STORAGE);
      const existingData = existingDataStr ? JSON.parse(existingDataStr) : [];

      const newBatch = {
        sessionId: sessionState.sessionId,
        timestamp: Date.now(),
        locations: validLocations,
      };

      existingData.push(newBatch);

      // Keep only last 100 batches to prevent memory issues
      if (existingData.length > 100) {
        existingData.shift();
      }

      await AsyncStorage.setItem(
        BACKGROUND_LOCATION_STORAGE,
        JSON.stringify(existingData)
      );

      console.log(`Stored ${validLocations.length} background locations`);
    } catch (err) {
      console.error('Error processing background locations:', err);
    }
  }
});

/**
 * Start background location tracking
 */
export async function startBackgroundLocationTracking(
  activityType: 'running' | 'walking' | 'cycling',
  sessionId: string
): Promise<boolean> {
  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);

    if (!isRegistered) {
      console.log('Background task not registered, cannot start background tracking');
      return false;
    }

    // Store session state for background task
    await AsyncStorage.setItem(
      SESSION_STATE_KEY,
      JSON.stringify({
        sessionId,
        activityType,
        isPaused: false,
        startTime: Date.now(),
      })
    );

    // Configure location options based on activity type
    const locationOptions = getBackgroundLocationOptions(activityType);

    // Start location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, locationOptions);

    console.log(`Started background tracking for ${activityType}`);
    return true;
  } catch (error) {
    console.error('Failed to start background location tracking:', error);
    return false;
  }
}

/**
 * Stop background location tracking
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);

    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('Stopped background location tracking');
    }

    // Clear session state
    await AsyncStorage.removeItem(SESSION_STATE_KEY);
  } catch (error) {
    console.error('Error stopping background location tracking:', error);
  }
}

/**
 * Pause background location tracking
 */
export async function pauseBackgroundTracking(): Promise<void> {
  try {
    const sessionStateStr = await AsyncStorage.getItem(SESSION_STATE_KEY);
    if (sessionStateStr) {
      const sessionState = JSON.parse(sessionStateStr);
      sessionState.isPaused = true;
      sessionState.pausedAt = Date.now();
      await AsyncStorage.setItem(SESSION_STATE_KEY, JSON.stringify(sessionState));
    }
  } catch (error) {
    console.error('Error pausing background tracking:', error);
  }
}

/**
 * Resume background location tracking
 */
export async function resumeBackgroundTracking(): Promise<void> {
  try {
    const sessionStateStr = await AsyncStorage.getItem(SESSION_STATE_KEY);
    if (sessionStateStr) {
      const sessionState = JSON.parse(sessionStateStr);
      sessionState.isPaused = false;
      delete sessionState.pausedAt;
      await AsyncStorage.setItem(SESSION_STATE_KEY, JSON.stringify(sessionState));
    }
  } catch (error) {
    console.error('Error resuming background tracking:', error);
  }
}

/**
 * Get stored background locations and clear storage
 */
export async function getAndClearBackgroundLocations(): Promise<LocationPoint[]> {
  try {
    const dataStr = await AsyncStorage.getItem(BACKGROUND_LOCATION_STORAGE);
    if (!dataStr) {
      return [];
    }

    const batches = JSON.parse(dataStr);
    const allLocations: LocationPoint[] = [];

    // Flatten all batches into single array
    for (const batch of batches) {
      allLocations.push(...batch.locations);
    }

    // Clear storage after retrieval
    await AsyncStorage.removeItem(BACKGROUND_LOCATION_STORAGE);

    return allLocations;
  } catch (error) {
    console.error('Error retrieving background locations:', error);
    return [];
  }
}

/**
 * Check if background task is registered
 */
export async function isBackgroundTaskRegistered(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
}

/**
 * Get location options based on activity type
 */
function getBackgroundLocationOptions(activityType: string): Location.LocationTaskOptions {
  // Activity-specific notification messages
  const activityNotifications = {
    running: { title: 'RUNSTR - Run Tracking', body: 'Tracking your run in the background' },
    walking: { title: 'RUNSTR - Walk Tracking', body: 'Tracking your walk in the background' },
    cycling: { title: 'RUNSTR - Ride Tracking', body: 'Tracking your ride in the background' },
  };

  const notification = activityNotifications[activityType as keyof typeof activityNotifications] || {
    title: 'RUNSTR - Activity Tracking',
    body: 'Tracking your activity in the background',
  };

  const baseOptions: Location.LocationTaskOptions = {
    accuracy: Location.Accuracy.BestForNavigation,
    // iOS-specific: Use fitness-optimized GPS algorithms
    activityType: Location.ActivityType.Fitness,
    // iOS-specific: Don't auto-pause during workouts
    pausesUpdatesAutomatically: false,
    // iOS-specific: Show blue bar when tracking in background (user transparency)
    showsBackgroundLocationIndicator: true,
    // Android-specific: Foreground service to prevent Doze Mode from stopping tracking
    foregroundService: {
      notificationTitle: notification.title,
      notificationBody: notification.body,
      notificationColor: '#FF6B35', // RUNSTR orange color
    },
  };

  switch (activityType) {
    case 'running':
      return {
        ...baseOptions,
        timeInterval: 3000, // Every 3 seconds in background
        distanceInterval: 5,
        mayShowUserSettingsDialog: false,
      };
    case 'walking':
      return {
        ...baseOptions,
        timeInterval: 5000, // Every 5 seconds
        distanceInterval: 10,
        mayShowUserSettingsDialog: false,
      };
    case 'cycling':
      return {
        ...baseOptions,
        timeInterval: 2000, // Every 2 seconds for better speed tracking
        distanceInterval: 10,
        mayShowUserSettingsDialog: false,
      };
    default:
      return {
        ...baseOptions,
        timeInterval: 5000,
        distanceInterval: 10,
      };
  }
}