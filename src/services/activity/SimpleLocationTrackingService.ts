/**
 * SimpleLocationTrackingService - Simplified GPS tracking based on reference implementation
 *
 * Replaces the complex EnhancedLocationTrackingService (1,183 lines) with a simple,
 * proven pattern from the working reference implementation (~400 lines).
 *
 * Philosophy: Start simple, add complexity only when proven necessary by user data.
 *
 * See: docs/ACTIVITY_TRACKING_SIMPLIFICATION.md for full migration details
 */

import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform } from 'react-native';
import { locationPermissionService } from './LocationPermissionService';

// Types
export interface LocationPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

export interface Split {
  splitNumber: number; // 1, 2, 3, etc.
  distance: number; // meters
  duration: number; // seconds (cumulative time at this split)
  pace: number; // seconds per km/mile
}

export interface TrackingSession {
  id: string;
  activityType: 'running' | 'walking' | 'cycling';
  startTime: number;
  endTime?: number;
  distance: number; // meters
  duration: number; // seconds (excluding pauses)
  pausedDuration: number; // seconds
  elevationGain: number; // meters
  splits: Split[];
  positions: LocationPoint[];
}

export type GPSSignalStrength = 'none' | 'weak' | 'medium' | 'strong' | 'searching';

// Simple location tracking service
export class SimpleLocationTrackingService {
  private static instance: SimpleLocationTrackingService;

  // Core tracking state (simple booleans, no complex state machine)
  private isTracking = false;
  private isPaused = false;

  // Session data
  private sessionId: string | null = null;
  private activityType: 'running' | 'walking' | 'cycling' = 'running';
  private startTime: number = 0;
  private pauseStartTime: number = 0;
  private totalPausedTime: number = 0; // milliseconds

  // GPS data
  private distance: number = 0; // meters
  private positions: LocationPoint[] = [];
  private elevationGain: number = 0;
  private lastAltitude: number | null = null;
  private splits: Split[] = [];
  private lastSplitDistance: number = 0; // meters

  // Location subscription
  private locationSubscription: Location.LocationSubscription | null = null;
  private lastPosition: LocationPoint | null = null;

  // GPS signal tracking
  private lastGPSUpdate: number = 0;
  private currentAccuracy: number | undefined;

  // Constants
  private readonly SPLIT_DISTANCE_METERS = 1000; // 1 km (TODO: support miles)
  private readonly GPS_SIGNAL_TIMEOUT_MS = 10000; // 10 seconds
  private readonly MIN_MOVEMENT_THRESHOLD_METERS = 0.5; // Filter micro-jitter

  private constructor() {
    console.log('[SimpleLocationTrackingService] Initialized');
  }

  static getInstance(): SimpleLocationTrackingService {
    if (!SimpleLocationTrackingService.instance) {
      SimpleLocationTrackingService.instance = new SimpleLocationTrackingService();
    }
    return SimpleLocationTrackingService.instance;
  }

  /**
   * Start GPS tracking
   */
  async startTracking(activityType: 'running' | 'walking' | 'cycling'): Promise<boolean> {
    try {
      console.log(`[SimpleLocationTrackingService] Starting ${activityType} tracking`);

      // Don't allow starting if already tracking
      if (this.isTracking) {
        console.warn('[SimpleLocationTrackingService] Already tracking, call stopTracking() first');
        return false;
      }

      // 1. Check permissions FIRST (before any tracking logic)
      const permissionStatus = await locationPermissionService.checkPermissionStatus();
      if (permissionStatus.foreground !== 'granted') {
        console.log('[SimpleLocationTrackingService] Requesting permissions...');
        const granted = await locationPermissionService.requestActivityTrackingPermissions();
        if (!granted.foreground) {
          console.error('[SimpleLocationTrackingService] Location permissions denied');
          return false;
        }
      }

      // 2. Initialize session
      this.sessionId = `session_${Date.now()}`;
      this.activityType = activityType;
      this.startTime = Date.now();
      this.pauseStartTime = 0;
      this.totalPausedTime = 0;

      // Reset tracking data
      this.distance = 0;
      this.positions = [];
      this.elevationGain = 0;
      this.lastAltitude = null;
      this.splits = [];
      this.lastSplitDistance = 0;
      this.lastPosition = null;
      this.lastGPSUpdate = Date.now();
      this.currentAccuracy = undefined;

      // 3. Start location tracking
      console.log('[SimpleLocationTrackingService] Starting GPS location updates...');
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every second
          distanceInterval: 0, // Get all updates (we'll filter in code)
          // iOS-specific options
          ...(Platform.OS === 'ios' && {
            activityType: Location.ActivityType.Fitness,
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true,
          }),
        },
        (location) => this.handleLocationUpdate(location)
      );

      // 4. Activate KeepAwake to prevent GPS throttling
      try {
        await activateKeepAwakeAsync('activity-tracking');
        console.log('[SimpleLocationTrackingService] KeepAwake activated');
      } catch (error) {
        console.warn('[SimpleLocationTrackingService] Failed to activate KeepAwake:', error);
      }

      // 5. Set tracking flag
      this.isTracking = true;
      this.isPaused = false;

      console.log(`[SimpleLocationTrackingService] ✅ ${activityType} tracking started successfully`);
      return true;
    } catch (error) {
      console.error('[SimpleLocationTrackingService] Failed to start tracking:', error);
      return false;
    }
  }

  /**
   * Handle incoming GPS location update
   */
  private handleLocationUpdate(location: Location.LocationObject): void {
    // Ignore updates if paused
    if (this.isPaused) {
      return;
    }

    // Create location point
    const newPoint: LocationPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude || undefined,
      timestamp: location.timestamp,
      accuracy: location.coords.accuracy || undefined,
      speed: location.coords.speed || undefined,
    };

    // Update GPS signal tracking
    this.lastGPSUpdate = Date.now();
    this.currentAccuracy = newPoint.accuracy;

    // Platform-specific logging
    if (Platform.OS === 'android') {
      console.log(
        `[ANDROID] GPS update: lat=${newPoint.latitude.toFixed(6)}, ` +
        `lon=${newPoint.longitude.toFixed(6)}, accuracy=${newPoint.accuracy?.toFixed(1)}m`
      );
    }

    // Calculate distance if we have a previous position
    if (this.lastPosition) {
      const segmentDistance = this.calculateDistance(this.lastPosition, newPoint);

      // Filter out micro-movements (GPS jitter)
      if (segmentDistance >= this.MIN_MOVEMENT_THRESHOLD_METERS) {
        this.distance += segmentDistance;

        // Platform-specific logging
        if (Platform.OS === 'android') {
          console.log(`[ANDROID] Distance update: +${segmentDistance.toFixed(1)}m, total=${this.distance.toFixed(1)}m`);
        }

        // Check for split milestone
        this.checkForSplit();
      }
    }

    // Update elevation if available
    if (newPoint.altitude !== undefined) {
      this.updateElevation(newPoint.altitude);
    }

    // Store position
    this.positions.push(newPoint);
    this.lastPosition = newPoint;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * (Same as reference implementation)
   */
  private calculateDistance(p1: LocationPoint, p2: LocationPoint): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (p1.latitude * Math.PI) / 180;
    const φ2 = (p2.latitude * Math.PI) / 180;
    const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Update elevation gain
   */
  private updateElevation(altitude: number): void {
    if (this.lastAltitude !== null) {
      const diff = altitude - this.lastAltitude;

      // Filter out small fluctuations (less than 1 meter)
      if (diff > 1) {
        this.elevationGain += diff;
      }
    }
    this.lastAltitude = altitude;
  }

  /**
   * Check if we've reached a split milestone (1 km)
   */
  private checkForSplit(): void {
    // Only track splits for running
    if (this.activityType !== 'running') {
      return;
    }

    // Check if we've completed another kilometer
    if (Math.floor(this.distance / this.SPLIT_DISTANCE_METERS) > Math.floor(this.lastSplitDistance / this.SPLIT_DISTANCE_METERS)) {
      const splitNumber = Math.floor(this.distance / this.SPLIT_DISTANCE_METERS);
      const currentDuration = this.getElapsedTime(); // seconds

      // Calculate split pace (seconds per km)
      const previousSplitTime = this.splits.length > 0 ? this.splits[this.splits.length - 1].duration : 0;
      const splitDuration = currentDuration - previousSplitTime;
      const splitPace = splitDuration; // seconds per km (since split is 1 km)

      const split: Split = {
        splitNumber,
        distance: this.distance,
        duration: currentDuration,
        pace: splitPace,
      };

      this.splits.push(split);
      this.lastSplitDistance = this.distance;

      console.log(`[SimpleLocationTrackingService] Split ${splitNumber}: ${splitPace.toFixed(0)}s/km`);
    }
  }

  /**
   * Pause tracking (stops distance accumulation but keeps GPS active)
   */
  async pauseTracking(): Promise<void> {
    if (!this.isTracking || this.isPaused) {
      console.warn('[SimpleLocationTrackingService] Cannot pause - not tracking or already paused');
      return;
    }

    this.isPaused = true;
    this.pauseStartTime = Date.now();
    console.log('[SimpleLocationTrackingService] Tracking paused');
  }

  /**
   * Resume tracking
   */
  async resumeTracking(): Promise<void> {
    if (!this.isTracking || !this.isPaused) {
      console.warn('[SimpleLocationTrackingService] Cannot resume - not tracking or not paused');
      return;
    }

    // Calculate pause duration
    const pauseDuration = Date.now() - this.pauseStartTime;
    this.totalPausedTime += pauseDuration;

    this.isPaused = false;
    this.pauseStartTime = 0;
    this.lastPosition = null; // Reset to avoid jumps after pause

    console.log(`[SimpleLocationTrackingService] Tracking resumed (paused for ${(pauseDuration / 1000).toFixed(0)}s)`);
  }

  /**
   * Stop tracking and return session data
   */
  async stopTracking(): Promise<TrackingSession | null> {
    if (!this.isTracking) {
      console.warn('[SimpleLocationTrackingService] Not tracking, nothing to stop');
      return null;
    }

    console.log('[SimpleLocationTrackingService] Stopping tracking...');

    // Stop location updates
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Deactivate KeepAwake
    try {
      deactivateKeepAwake('activity-tracking');
      console.log('[SimpleLocationTrackingService] KeepAwake deactivated');
    } catch (error) {
      console.warn('[SimpleLocationTrackingService] Failed to deactivate KeepAwake:', error);
    }

    // Calculate final metrics
    const endTime = Date.now();
    const totalDuration = Math.floor((endTime - this.startTime - this.totalPausedTime) / 1000); // seconds

    // Create session object
    const session: TrackingSession = {
      id: this.sessionId || `session_${Date.now()}`,
      activityType: this.activityType,
      startTime: this.startTime,
      endTime,
      distance: this.distance,
      duration: totalDuration,
      pausedDuration: Math.floor(this.totalPausedTime / 1000), // seconds
      elevationGain: this.elevationGain,
      splits: this.splits,
      positions: this.positions,
    };

    // Reset state
    this.isTracking = false;
    this.isPaused = false;
    this.sessionId = null;

    console.log(
      `[SimpleLocationTrackingService] ✅ Session completed: ` +
      `${this.distance.toFixed(0)}m in ${totalDuration}s (${this.positions.length} GPS points)`
    );

    return session;
  }

  /**
   * Get current session data (for live updates)
   */
  getCurrentSession(): TrackingSession | null {
    if (!this.isTracking) {
      return null;
    }

    const currentDuration = this.getElapsedTime();

    return {
      id: this.sessionId || `session_${Date.now()}`,
      activityType: this.activityType,
      startTime: this.startTime,
      distance: this.distance,
      duration: currentDuration,
      pausedDuration: Math.floor(this.totalPausedTime / 1000),
      elevationGain: this.elevationGain,
      splits: this.splits,
      positions: this.positions,
    };
  }

  /**
   * Get elapsed time in seconds (excluding pauses)
   */
  private getElapsedTime(): number {
    if (!this.isTracking) {
      return 0;
    }

    const now = Date.now();
    const currentPauseDuration = this.isPaused ? now - this.pauseStartTime : 0;
    return Math.floor((now - this.startTime - this.totalPausedTime - currentPauseDuration) / 1000);
  }

  /**
   * Get GPS signal strength based on time since last update and accuracy
   */
  getGPSSignalStrength(): GPSSignalStrength {
    if (!this.isTracking) {
      return 'none';
    }

    // Check for GPS timeout
    const timeSinceUpdate = Date.now() - this.lastGPSUpdate;
    if (timeSinceUpdate > this.GPS_SIGNAL_TIMEOUT_MS) {
      return 'none';
    }

    // Check accuracy
    if (!this.currentAccuracy) {
      return 'searching';
    }

    if (this.currentAccuracy < 10) {
      return 'strong';
    } else if (this.currentAccuracy < 20) {
      return 'medium';
    } else if (this.currentAccuracy < 50) {
      return 'weak';
    } else {
      return 'weak';
    }
  }

  /**
   * Get current tracking state
   */
  getTrackingState(): 'idle' | 'tracking' | 'paused' {
    if (!this.isTracking) {
      return 'idle';
    }
    return this.isPaused ? 'paused' : 'tracking';
  }

  /**
   * Check if tracking can start (simple check, no complex state machine)
   */
  canStart(): boolean {
    return !this.isTracking;
  }

  /**
   * Check if tracking can be paused
   */
  canPause(): boolean {
    return this.isTracking && !this.isPaused;
  }

  /**
   * Check if tracking can be resumed
   */
  canResume(): boolean {
    return this.isTracking && this.isPaused;
  }

  /**
   * Check if tracking can be stopped
   */
  canStop(): boolean {
    return this.isTracking;
  }
}

// Export singleton instance
export const simpleLocationTrackingService = SimpleLocationTrackingService.getInstance();
