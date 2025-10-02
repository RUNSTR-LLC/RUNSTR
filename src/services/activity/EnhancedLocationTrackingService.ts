/**
 * EnhancedLocationTrackingService - Production-ready GPS tracking
 * Integrates all improvements: background tracking, validation, recovery, battery optimization
 */

import * as Location from 'expo-location';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityStateMachine } from './ActivityStateMachine';
import { LocationValidator } from './LocationValidator';
import { StreamingLocationStorage } from './StreamingLocationStorage';
import { SessionRecoveryService } from './SessionRecoveryService';
import { BatteryOptimizationService } from './BatteryOptimizationService';
import { locationPermissionService } from './LocationPermissionService';
import { SplitTrackingService, type Split } from './SplitTrackingService';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  pauseBackgroundTracking,
  resumeBackgroundTracking,
  getAndClearBackgroundLocations,
} from './BackgroundLocationTask';

const LOCATION_STORAGE_KEY = '@runstr:location_data';
const GPS_SIGNAL_TIMEOUT = 10000; // 10 seconds without update = signal lost

export interface EnhancedLocationPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  confidence: number; // 0-1 confidence score
  source: 'gps' | 'network' | 'interpolated';
  batteryLevel?: number;
}

export interface EnhancedTrackingSession {
  id: string;
  startTime: number;
  endTime?: number;
  activityType: 'running' | 'walking' | 'cycling';
  totalDistance: number;
  totalElevationGain: number;
  duration: number; // Active duration excluding pauses
  pausedDuration: number;
  pauseStartTime?: number; // Timestamp when pause started (for calculating pause duration)
  gpsSignalStrength: 'strong' | 'medium' | 'weak' | 'none';
  lastGPSUpdate: number;
  isBackgroundTracking: boolean;
  batteryMode: 'high_accuracy' | 'balanced' | 'battery_saver';
  splits: Split[]; // Kilometer splits for running activities
  statistics: {
    averageSpeed: number;
    maxSpeed: number;
    averageAccuracy: number;
    gpsOutages: number;
    interpolatedPoints: number;
  };
}

export class EnhancedLocationTrackingService {
  private static instance: EnhancedLocationTrackingService;

  // Core services
  private stateMachine: ActivityStateMachine;
  private validator: LocationValidator | null = null;
  private storage: StreamingLocationStorage | null = null;
  private recoveryService: SessionRecoveryService;
  private batteryService: BatteryOptimizationService;
  private splitTracker: SplitTrackingService;

  // Tracking state
  private currentSession: EnhancedTrackingSession | null = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  private lastValidLocation: EnhancedLocationPoint | null = null;
  private appStateSubscription: any = null;
  private gpsCheckTimer: NodeJS.Timeout | null = null;

  // Metrics
  private totalValidPoints = 0;
  private totalInvalidPoints = 0;
  private gpsOutageStart: number | null = null;

  // Transport detection
  private justResumedFromPause = false;

  // GPS recovery tracking
  private pointsAfterRecovery: number = 0;
  private wasInGpsLostState: boolean = false;
  private recoveryStartTime: number | null = null;
  private readonly GPS_RECOVERY_TIMEOUT_MS = 30000; // 30 seconds max recovery time

  private constructor() {
    this.stateMachine = new ActivityStateMachine();
    this.recoveryService = SessionRecoveryService.getInstance();
    this.batteryService = BatteryOptimizationService.getInstance();
    this.splitTracker = new SplitTrackingService();
    this.initializeAppStateHandling();
    this.checkForRecoverableSessions();
  }

  static getInstance(): EnhancedLocationTrackingService {
    if (!EnhancedLocationTrackingService.instance) {
      EnhancedLocationTrackingService.instance = new EnhancedLocationTrackingService();
    }
    return EnhancedLocationTrackingService.instance;
  }

  /**
   * Initialize app state handling for background/foreground
   */
  private initializeAppStateHandling(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (this.currentSession) {
        if (nextAppState === 'background') {
          this.stateMachine.send({ type: 'ENTER_BACKGROUND' });
          this.currentSession.isBackgroundTracking = true;
        } else if (nextAppState === 'active') {
          this.stateMachine.send({ type: 'ENTER_FOREGROUND' });
          this.currentSession.isBackgroundTracking = false;
          this.syncBackgroundLocations();
        }
      }
    });
  }

  /**
   * Check for recoverable sessions on startup
   */
  private async checkForRecoverableSessions(): Promise<void> {
    const recoverableSession = await this.recoveryService.checkForRecoverableSessions();
    if (recoverableSession) {
      console.log('Found recoverable session:', recoverableSession.id);
      // App will show recovery prompt to user
    }
  }

  /**
   * Request location permissions using the centralized service
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('📍 Requesting activity tracking permissions...');

      // Use the centralized permission service
      const result = await locationPermissionService.requestActivityTrackingPermissions();

      if (result.foreground) {
        this.stateMachine.send({ type: 'PERMISSIONS_GRANTED' });

        // Log background permission status
        if (result.background) {
          console.log('✅ Full location permissions granted (foreground + background)');
        } else {
          console.log('⚠️ Foreground permission granted, background permission not available');
          console.log('   Tracking will pause when app goes to background');
        }

        return true;
      } else {
        this.stateMachine.send({ type: 'PERMISSIONS_DENIED' });
        return false;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      this.stateMachine.send({ type: 'PERMISSIONS_DENIED' });
      return false;
    }
  }

  /**
   * Start tracking with all enhancements
   */
  async startTracking(activityType: 'running' | 'walking' | 'cycling'): Promise<boolean> {
    try {
      console.log(`🚀 [${Platform.OS.toUpperCase()}] Starting ${activityType} tracking...`);

      // Check state machine
      if (!this.stateMachine.canStart()) {
        console.warn('Cannot start tracking in current state:', this.stateMachine.getState());
        return false;
      }

      // Send start tracking event to state machine
      this.stateMachine.send({ type: 'START_TRACKING', activityType });

      // Request permissions
      console.log(`🔐 [${Platform.OS.toUpperCase()}] Requesting location permissions...`);
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.error(`❌ [${Platform.OS.toUpperCase()}] Location permissions denied`);
        // Reset state machine if permissions denied
        this.stateMachine.send({ type: 'RESET' });
        return false;
      }
      console.log(`✅ [${Platform.OS.toUpperCase()}] Location permissions granted`);

      // Create session
      const sessionId = `session_${Date.now()}`;
      const startTime = Date.now();
      this.currentSession = {
        id: sessionId,
        startTime,
        activityType,
        totalDistance: 0,
        totalElevationGain: 0,
        duration: 0,
        pausedDuration: 0,
        pauseStartTime: undefined,
        gpsSignalStrength: 'searching' as any,
        lastGPSUpdate: Date.now(),
        isBackgroundTracking: AppState.currentState !== 'active',
        batteryMode: this.batteryService.getCurrentMode(),
        splits: [],
        statistics: {
          averageSpeed: 0,
          maxSpeed: 0,
          averageAccuracy: 0,
          gpsOutages: 0,
          interpolatedPoints: 0,
        },
      };

      // Start split tracking for running activities
      if (activityType === 'running') {
        this.splitTracker.start(startTime);
      }

      // Initialize services
      this.validator = new LocationValidator(activityType);
      this.storage = new StreamingLocationStorage(sessionId);
      this.recoveryService.startSession(sessionId, activityType);

      // Start GPS monitoring
      this.startGPSMonitoring();

      // Get location options from battery service
      const locationOptions = this.batteryService.getLocationOptions(activityType);

      console.log(`📍 [${Platform.OS.toUpperCase()}] Location options:`, JSON.stringify(locationOptions, null, 2));

      // Start foreground tracking
      console.log(`📡 [${Platform.OS.toUpperCase()}] Starting foreground location tracking...`);
      this.locationSubscription = await Location.watchPositionAsync(
        locationOptions,
        (location) => this.handleLocationUpdate(location)
      );
      console.log(`✅ [${Platform.OS.toUpperCase()}] Foreground location tracking started`);

      // Start background tracking
      console.log(`🌙 [${Platform.OS.toUpperCase()}] Starting background location tracking...`);
      await startBackgroundLocationTracking(activityType, sessionId);

      // Update state machine
      this.stateMachine.send({ type: 'INITIALIZATION_COMPLETE', sessionId });

      console.log(`🎉 [${Platform.OS.toUpperCase()}] Enhanced tracking fully initialized for ${activityType}`);
      return true;
    } catch (error) {
      console.error('Failed to start tracking:', error);
      this.stateMachine.send({ type: 'INITIALIZATION_FAILED', error: String(error) });
      return false;
    }
  }

  /**
   * Handle location update with validation
   */
  private async handleLocationUpdate(location: Location.LocationObject): Promise<void> {
    if (!this.currentSession || !this.validator || !this.storage) return;

    // Create enhanced location point
    const newPoint: EnhancedLocationPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude || undefined,
      timestamp: location.timestamp,
      accuracy: location.coords.accuracy || undefined,
      speed: location.coords.speed || undefined,
      confidence: 1,
      source: 'gps',
      batteryLevel: this.batteryService.getBatteryLevel(),
    };

    // Android debugging: Log location updates
    if (Platform.OS === 'android') {
      console.log(`📍 [ANDROID] Location received: lat=${newPoint.latitude.toFixed(6)}, lon=${newPoint.longitude.toFixed(6)}, accuracy=${newPoint.accuracy?.toFixed(1)}m`);
    }

    // Validate point (validator expects basic LocationPoint interface)
    const pointForValidation = {
      latitude: newPoint.latitude,
      longitude: newPoint.longitude,
      altitude: newPoint.altitude,
      timestamp: newPoint.timestamp,
      accuracy: newPoint.accuracy,
      speed: newPoint.speed,
    };
    const validationResult = this.validator.validatePoint(pointForValidation, this.lastValidLocation ? {
      latitude: this.lastValidLocation.latitude,
      longitude: this.lastValidLocation.longitude,
      altitude: this.lastValidLocation.altitude,
      timestamp: this.lastValidLocation.timestamp,
      accuracy: this.lastValidLocation.accuracy,
      speed: this.lastValidLocation.speed,
    } : undefined, this.justResumedFromPause);

    if (validationResult.isValid) {
      // Android debugging: Log validation success
      if (Platform.OS === 'android') {
        console.log(`✅ [ANDROID] Point validated (confidence: ${validationResult.confidence.toFixed(2)})`);
      }

      // Reset pause flag after first valid point
      if (this.justResumedFromPause) {
        console.log('First valid point after resume accepted');
        this.justResumedFromPause = false;
      }

      // Use corrected point if available, or original point
      let pointToStore: EnhancedLocationPoint;
      if (validationResult.correctedPoint) {
        pointToStore = {
          ...validationResult.correctedPoint,
          confidence: validationResult.confidence,
          source: 'gps',
          batteryLevel: this.batteryService.getBatteryLevel(),
        };
      } else {
        pointToStore = {
          ...newPoint,
          confidence: validationResult.confidence,
        };
      }

      // Check if we're recovering from GPS loss
      // Skip distance accumulation for first few points after recovery
      // Alternative check: use state machine's previous state
      const previousState = this.stateMachine.getPreviousState();
      const isRecoveringFromGpsLoss = this.wasInGpsLostState || previousState === 'gps_lost';

      if (isRecoveringFromGpsLoss) {
        // Start recovery timer if not already started
        if (this.recoveryStartTime === null) {
          this.recoveryStartTime = Date.now();
          this.pointsAfterRecovery = 0;
          console.log('🔄 GPS Recovery: Starting recovery mode, will skip distance for up to 3 clean points');
        }

        // Check if recovery has timed out (30 seconds max)
        const recoveryDuration = Date.now() - this.recoveryStartTime;
        const hasTimedOut = recoveryDuration > this.GPS_RECOVERY_TIMEOUT_MS;

        if (hasTimedOut) {
          console.log(`⏰ GPS Recovery: Timeout after ${(recoveryDuration / 1000).toFixed(1)}s, forcing exit from recovery mode`);
          this.wasInGpsLostState = false;
          this.pointsAfterRecovery = 0;
          this.recoveryStartTime = null;
          // Continue to normal distance tracking below
        } else if (this.pointsAfterRecovery < 3) {
          this.pointsAfterRecovery++;
          console.log(`📍 GPS Recovery: Skipping distance for point ${this.pointsAfterRecovery}/3 to avoid straight line through obstacles (${(recoveryDuration / 1000).toFixed(1)}s elapsed)`);

          // Store the point but don't accumulate distance
          this.lastValidLocation = pointToStore;
          await this.storage.addPoint({
            latitude: pointToStore.latitude,
            longitude: pointToStore.longitude,
            altitude: pointToStore.altitude,
            timestamp: pointToStore.timestamp,
            accuracy: pointToStore.accuracy,
            speed: pointToStore.speed,
          });

          // Still update GPS signal and recovery service
          this.updateGPSSignalStrength(pointToStore.accuracy || 20);
          this.currentSession.lastGPSUpdate = Date.now();

          // After 3 points, we're fully recovered
          if (this.pointsAfterRecovery >= 3) {
            this.wasInGpsLostState = false;
            this.pointsAfterRecovery = 0;
            this.recoveryStartTime = null;
            console.log('✅ GPS fully recovered, resuming normal distance tracking');
          }

          return; // Skip the rest of the distance calculation
        }
      }

      // Update metrics (normal flow when not recovering)
      if (this.lastValidLocation) {
        const distance = this.calculateDistance(this.lastValidLocation, pointToStore);
        this.currentSession.totalDistance += distance;

        // Android debugging: Log distance accumulation
        if (Platform.OS === 'android') {
          console.log(`📏 [ANDROID] Distance added: +${distance.toFixed(1)}m, Total: ${this.currentSession.totalDistance.toFixed(1)}m (${(this.currentSession.totalDistance / 1000).toFixed(2)}km)`);
        }

        if (pointToStore.altitude && this.lastValidLocation.altitude) {
          const elevationDiff = pointToStore.altitude - this.lastValidLocation.altitude;
          if (elevationDiff > 0) {
            this.currentSession.totalElevationGain += elevationDiff;
          }
        }

        // Update split tracking for running activities
        if (this.currentSession.activityType === 'running') {
          const now = Date.now();
          const totalElapsed = Math.floor((now - this.currentSession.startTime - this.currentSession.pausedDuration) / 1000);
          const newSplit = this.splitTracker.update(
            this.currentSession.totalDistance,
            totalElapsed,
            this.currentSession.pausedDuration
          );

          // If a new split was recorded, add it to session
          if (newSplit) {
            this.currentSession.splits.push(newSplit);
          }
        }
      }

      // Store point (storage expects basic LocationPoint)
      await this.storage.addPoint({
        latitude: pointToStore.latitude,
        longitude: pointToStore.longitude,
        altitude: pointToStore.altitude,
        timestamp: pointToStore.timestamp,
        accuracy: pointToStore.accuracy,
        speed: pointToStore.speed,
      });
      this.lastValidLocation = pointToStore;
      this.totalValidPoints++;

      // Update GPS signal strength
      this.updateGPSSignalStrength(pointToStore.accuracy || 20);
      this.currentSession.lastGPSUpdate = Date.now();

      // Update recovery service
      this.recoveryService.updateSession(
        this.currentSession.totalDistance,
        this.currentSession.totalElevationGain,
        this.currentSession.duration,
        pointToStore,
        this.batteryService.getBatteryLevel()
      );
    } else {
      this.totalInvalidPoints++;

      // Enhanced logging for Android to help diagnose rejection issues
      if (Platform.OS === 'android') {
        console.log(`❌ [ANDROID] Point rejected: ${validationResult.reason} (accuracy: ${newPoint.accuracy?.toFixed(1)}m, total rejected: ${this.totalInvalidPoints})`);
      } else {
        console.log(`Invalid point rejected: ${validationResult.reason}`);
      }
    }
  }

  /**
   * Update GPS signal strength based on accuracy
   */
  private updateGPSSignalStrength(accuracy: number): void {
    if (!this.currentSession) return;

    let strength: 'strong' | 'medium' | 'weak' | 'none';

    if (accuracy < 10) {
      strength = 'strong';
    } else if (accuracy < 20) {
      strength = 'medium';
    } else if (accuracy < 50) {
      strength = 'weak';
    } else {
      strength = 'none';
    }

    const previousStrength = this.currentSession.gpsSignalStrength;
    this.currentSession.gpsSignalStrength = strength;

    // Update state machine if signal changed significantly
    if (previousStrength === 'none' && strength !== 'none') {
      this.stateMachine.send({ type: 'GPS_RECOVERED' });
      console.log('🔄 GPS signal recovered, will enter recovery buffer on next point');
      // Mark that we were in GPS lost state for recovery handling
      this.wasInGpsLostState = true;
      this.pointsAfterRecovery = 0;
      this.recoveryStartTime = null; // Will be set on first point after recovery

      if (this.gpsOutageStart) {
        const outageDuration = Date.now() - this.gpsOutageStart;
        console.log(`📡 GPS outage lasted ${(outageDuration / 1000).toFixed(1)}s`);
        this.currentSession.statistics.gpsOutages++;
        this.gpsOutageStart = null;
      }
    } else if (previousStrength !== 'none' && strength === 'none') {
      this.stateMachine.send({ type: 'GPS_LOST' });
      this.gpsOutageStart = Date.now();
      console.log('📡 GPS signal lost, distance tracking paused');
      // Mark for recovery tracking when signal returns
      this.wasInGpsLostState = true;
    } else if (strength === 'weak') {
      this.stateMachine.send({ type: 'GPS_WEAK' });
    }
  }

  /**
   * Monitor GPS signal timeout
   */
  private startGPSMonitoring(): void {
    this.stopGPSMonitoring();

    this.gpsCheckTimer = setInterval(() => {
      if (!this.currentSession) return;

      const timeSinceLastUpdate = Date.now() - this.currentSession.lastGPSUpdate;
      if (timeSinceLastUpdate > GPS_SIGNAL_TIMEOUT) {
        this.currentSession.gpsSignalStrength = 'none';
        this.stateMachine.send({ type: 'GPS_LOST' });
        console.log(`⚠️ GPS timeout: No updates for ${(timeSinceLastUpdate / 1000).toFixed(1)}s`);
        // Mark for recovery tracking when signal returns
        this.wasInGpsLostState = true;
      }
    }, 5000);
  }

  /**
   * Stop GPS monitoring
   */
  private stopGPSMonitoring(): void {
    if (this.gpsCheckTimer) {
      clearInterval(this.gpsCheckTimer);
      this.gpsCheckTimer = null;
    }
  }

  /**
   * Sync background locations when app comes to foreground
   */
  private async syncBackgroundLocations(): Promise<void> {
    const backgroundLocations = await getAndClearBackgroundLocations();
    if (backgroundLocations.length > 0 && this.storage) {
      console.log(`Syncing ${backgroundLocations.length} background locations`);
      await this.storage.addPoints(backgroundLocations);
    }
  }

  /**
   * Pause tracking
   */
  async pauseTracking(): Promise<void> {
    if (!this.stateMachine.canPause()) return;

    // Store when pause started
    if (this.currentSession) {
      this.currentSession.pauseStartTime = Date.now();
    }

    this.stateMachine.send({ type: 'PAUSE' });
    await pauseBackgroundTracking();
    this.recoveryService.pauseSession();
  }

  /**
   * Resume tracking
   */
  async resumeTracking(): Promise<void> {
    if (!this.stateMachine.canResume()) return;

    // Calculate actual pause duration
    let pauseDuration = 0;
    if (this.currentSession?.pauseStartTime) {
      pauseDuration = Date.now() - this.currentSession.pauseStartTime;
      this.currentSession.pauseStartTime = undefined; // Clear after calculating
    }

    this.stateMachine.send({ type: 'RESUME' });
    this.justResumedFromPause = true; // Flag for transport detection
    await resumeBackgroundTracking();
    this.recoveryService.resumeSession(pauseDuration);
  }

  /**
   * Stop tracking and finalize session
   */
  async stopTracking(): Promise<EnhancedTrackingSession | null> {
    if (!this.stateMachine.canStop()) return null;

    this.stateMachine.send({ type: 'STOP' });

    // Stop location updates
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    await stopBackgroundLocationTracking();
    this.stopGPSMonitoring();

    if (this.currentSession && this.storage) {
      // Get final statistics
      const stats = this.storage.getStatistics();
      this.currentSession.statistics.averageSpeed = stats.averageSpeed;
      this.currentSession.statistics.maxSpeed = stats.maxSpeed;
      this.currentSession.endTime = Date.now();
      this.currentSession.duration =
        (this.currentSession.endTime - this.currentSession.startTime - this.currentSession.pausedDuration) / 1000;

      // Save session
      await this.saveSession(this.currentSession);

      // Clear recovery data
      await this.recoveryService.endSession();

      // Reset state
      const session = { ...this.currentSession };
      this.cleanup();

      this.stateMachine.send({ type: 'RESET' });
      this.stateMachine.send({ type: 'RESET' }); // Move to idle

      return session;
    }

    return null;
  }

  /**
   * Recover a crashed session
   */
  async recoverSession(sessionId: string): Promise<boolean> {
    const result = await this.recoveryService.recoverSession(sessionId);
    if (result.success && result.session) {
      // Restore tracking with recovered data
      this.currentSession = {
        id: result.session.id,
        startTime: result.session.startTime,
        activityType: result.session.activityType,
        totalDistance: result.session.totalDistance,
        totalElevationGain: result.session.totalElevationGain,
        duration: result.session.duration,
        pausedDuration: result.session.pausedDuration,
        pauseStartTime: undefined,
        gpsSignalStrength: 'searching' as any,
        lastGPSUpdate: Date.now(),
        isBackgroundTracking: false,
        batteryMode: this.batteryService.getCurrentMode(),
        statistics: {
          averageSpeed: 0,
          maxSpeed: 0,
          averageAccuracy: 0,
          gpsOutages: 0,
          interpolatedPoints: 0,
        },
      };

      // Reinitialize services
      this.validator = new LocationValidator(result.session.activityType);
      this.storage = new StreamingLocationStorage(result.session.id);

      // Resume tracking
      return this.startTracking(result.session.activityType);
    }
    return false;
  }

  /**
   * Calculate distance between two points with 3D consideration
   * Uses Haversine formula for horizontal distance, then applies Pythagorean theorem for altitude
   */
  private calculateDistance(p1: EnhancedLocationPoint, p2: EnhancedLocationPoint): number {
    // Calculate 2D horizontal distance using Haversine formula
    const R = 6371000; // Earth's radius in meters
    const φ1 = (p1.latitude * Math.PI) / 180;
    const φ2 = (p2.latitude * Math.PI) / 180;
    const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const flatDistance = R * c;

    // Add altitude component if both points have altitude data
    if (p1.altitude !== undefined && p2.altitude !== undefined) {
      const altitudeDiff = p2.altitude - p1.altitude;

      // Apply Pythagorean theorem for 3D distance
      // This is especially important for trail running and mountain biking
      const distance3D = Math.sqrt(flatDistance * flatDistance + altitudeDiff * altitudeDiff);

      // Log significant altitude changes for debugging
      if (Math.abs(altitudeDiff) > 10) {
        console.log(`\ud83c\udfde️ 3D distance calculation: horizontal=${flatDistance.toFixed(1)}m, altitude∆=${altitudeDiff.toFixed(1)}m, 3D=${distance3D.toFixed(1)}m`);
      }

      return distance3D;
    }

    // Return 2D distance if altitude data is unavailable
    return flatDistance;
  }

  /**
   * Save session to storage
   */
  private async saveSession(session: EnhancedTrackingSession): Promise<void> {
    try {
      const existingSessions = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      const sessions = existingSessions ? JSON.parse(existingSessions) : [];
      sessions.push(session);

      if (sessions.length > 50) {
        sessions.shift();
      }

      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.currentSession = null;
    this.lastValidLocation = null;
    this.validator?.reset();
    this.validator = null;
    this.storage?.clearStorage();
    this.storage = null;
    this.totalValidPoints = 0;
    this.totalInvalidPoints = 0;
    this.gpsOutageStart = null;
    this.pointsAfterRecovery = 0;
    this.wasInGpsLostState = false;
    this.recoveryStartTime = null;
    this.splitTracker.reset();
  }

  /**
   * Get current session state
   */
  getCurrentSession(): EnhancedTrackingSession | null {
    return this.currentSession;
  }

  /**
   * Get tracking state
   */
  getTrackingState(): string {
    return this.stateMachine.getState();
  }

  /**
   * Get GPS signal strength
   */
  getGPSSignalStrength(): 'strong' | 'medium' | 'weak' | 'none' | 'searching' {
    if (!this.currentSession) return 'none';
    if (this.stateMachine.getState() === 'initializing') return 'searching';
    return this.currentSession.gpsSignalStrength;
  }

  /**
   * Get tracking statistics
   */
  getStatistics(): {
    validPoints: number;
    invalidPoints: number;
    accuracy: number;
    batteryMode: string;
  } {
    return {
      validPoints: this.totalValidPoints,
      invalidPoints: this.totalInvalidPoints,
      accuracy: this.currentSession?.statistics.averageAccuracy || 0,
      batteryMode: this.batteryService.getCurrentMode(),
    };
  }
}

export const enhancedLocationTrackingService = EnhancedLocationTrackingService.getInstance();