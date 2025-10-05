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
import { KalmanDistanceFilter } from './KalmanDistanceFilter';
import { TTSAnnouncementService } from './TTSAnnouncementService';
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
  totalDistance: number; // Kalman-smoothed distance for display
  rawCumulativeDistance: number; // Actual GPS-measured distance (for accuracy tracking)
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
    recoveryAttempts: number; // Number of GPS recovery sequences
    distanceSkippedInRecovery: number; // Meters of phantom distance prevented
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
  private kalmanFilter: KalmanDistanceFilter;

  // Tracking state
  private currentSession: EnhancedTrackingSession | null = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  private lastValidLocation: EnhancedLocationPoint | null = null;
  private appStateSubscription: any = null;
  private gpsCheckTimer: NodeJS.Timeout | null = null;
  private backgroundSyncTimer: NodeJS.Timeout | null = null;

  // Metrics
  private totalValidPoints = 0;
  private totalInvalidPoints = 0;
  private gpsOutageStart: number | null = null;

  // Transport detection
  private justResumedFromPause = false;

  // GPS warmup tracking (prevents premature recovery mode on startup)
  private isInWarmup: boolean = false;
  private warmupStartTime: number | null = null;
  private readonly GPS_WARMUP_DURATION_MS = 10000; // 10 seconds warmup period

  // GPS recovery tracking
  private pointsAfterRecovery: number = 0;
  private wasInGpsLostState: boolean = false;
  private recoveryStartTime: number | null = null;
  private recoveryAccuracyThreshold: number = 50; // Initial accuracy threshold for recovery
  private skippedRecoveryDistance: number = 0; // Track phantom distance during recovery
  private readonly GPS_RECOVERY_TIMEOUT_MS = 10000; // 10 seconds max recovery time
  private readonly GPS_RECOVERY_POINTS = 3; // Number of points to skip after GPS recovery

  // Distance freeze detection
  private lastDistanceUpdateTime: number = 0;
  private lastDistanceValue: number = 0;
  private readonly DISTANCE_FREEZE_THRESHOLD_MS = 10000; // 10 seconds without distance change = freeze

  private constructor() {
    this.stateMachine = new ActivityStateMachine();
    this.recoveryService = SessionRecoveryService.getInstance();
    this.batteryService = BatteryOptimizationService.getInstance();
    this.splitTracker = new SplitTrackingService();
    this.kalmanFilter = new KalmanDistanceFilter();
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

      // Check if permissions are already granted first
      console.log(`🔐 [${Platform.OS.toUpperCase()}] Checking location permissions...`);
      const permissionStatus = await locationPermissionService.checkPermissionStatus();

      if (permissionStatus.foreground !== 'granted') {
        console.log(`📍 [${Platform.OS.toUpperCase()}] Location permissions not granted, requesting...`);
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
          console.error(`❌ [${Platform.OS.toUpperCase()}] Location permissions denied`);
          // Reset state machine if permissions denied
          this.stateMachine.send({ type: 'RESET' });
          return false;
        }
      } else {
        console.log(`✅ [${Platform.OS.toUpperCase()}] Location permissions already granted`);
        this.stateMachine.send({ type: 'PERMISSIONS_GRANTED' });
      }

      // Create session
      const sessionId = `session_${Date.now()}`;
      const startTime = Date.now();
      this.currentSession = {
        id: sessionId,
        startTime,
        activityType,
        totalDistance: 0,
        rawCumulativeDistance: 0,
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
          recoveryAttempts: 0,
          distanceSkippedInRecovery: 0,
        },
      };

      // Start GPS warmup period
      this.isInWarmup = true;
      this.warmupStartTime = Date.now();
      console.log(`🔥 GPS warmup started (${this.GPS_WARMUP_DURATION_MS / 1000}s) - recovery mode disabled during warmup`);

      // Initialize distance freeze detection
      this.lastDistanceValue = 0;
      this.lastDistanceUpdateTime = Date.now();

      // Start split tracking for running activities
      if (activityType === 'running') {
        this.splitTracker.start(startTime);
      }

      // Initialize services
      this.validator = new LocationValidator(activityType);
      this.storage = new StreamingLocationStorage(sessionId);
      this.recoveryService.startSession(sessionId, activityType);
      this.kalmanFilter.reset(); // Reset Kalman filter for new session
      console.log('🔵 Kalman distance filter initialized');

      // Start GPS monitoring
      this.startGPSMonitoring();

      // Start periodic background location sync
      this.startBackgroundLocationSync();

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

      // Check if we're still in warmup period
      if (this.isInWarmup && this.warmupStartTime) {
        const warmupElapsed = Date.now() - this.warmupStartTime;
        if (warmupElapsed >= this.GPS_WARMUP_DURATION_MS) {
          this.isInWarmup = false;
          this.warmupStartTime = null;
          console.log(`✅ GPS warmup complete (${(warmupElapsed / 1000).toFixed(1)}s) - recovery mode now active`);
        }
      }

      // Check if we're recovering from GPS loss
      // Skip distance accumulation for first few points after recovery to prevent
      // "straight line" phantom distance through obstacles (tunnels, buildings, etc.)
      // IMPORTANT: Don't enter recovery mode during warmup period
      const previousState = this.stateMachine.getPreviousState();
      const isRecoveringFromGpsLoss = !this.isInWarmup && (this.wasInGpsLostState || previousState === 'gps_lost');

      if (isRecoveringFromGpsLoss) {
        // Start recovery timer if not already started
        if (this.recoveryStartTime === null) {
          this.recoveryStartTime = Date.now();
          this.pointsAfterRecovery = 0;
          this.skippedRecoveryDistance = 0;
          this.recoveryAccuracyThreshold = 50; // Start with lenient threshold
          this.currentSession.statistics.recoveryAttempts++;
          console.log(`🔄 GPS Recovery #${this.currentSession.statistics.recoveryAttempts}: Starting recovery buffer (${this.GPS_RECOVERY_POINTS} points)`);
        }

        // Check if recovery has timed out (10 seconds max)
        const recoveryDuration = Date.now() - this.recoveryStartTime;
        const hasTimedOut = recoveryDuration > this.GPS_RECOVERY_TIMEOUT_MS;

        if (hasTimedOut) {
          console.log(`⏰ GPS Recovery: Timeout after ${(recoveryDuration / 1000).toFixed(1)}s, forcing exit from recovery mode`);
          console.log(`   Skipped ${this.skippedRecoveryDistance.toFixed(1)}m of phantom distance during recovery`);

          // Update statistics
          this.currentSession.statistics.distanceSkippedInRecovery += this.skippedRecoveryDistance;

          // Reset recovery state
          this.wasInGpsLostState = false;
          this.pointsAfterRecovery = 0;
          this.recoveryStartTime = null;
          this.skippedRecoveryDistance = 0;
          // Continue to normal distance tracking below
        } else if (this.pointsAfterRecovery < this.GPS_RECOVERY_POINTS) {
          // Calculate what the distance would have been (phantom distance)
          if (this.lastValidLocation) {
            const phantomDistance = this.calculateDistance(this.lastValidLocation, pointToStore);
            this.skippedRecoveryDistance += phantomDistance;
          }

          // Check if GPS accuracy is improving
          const currentAccuracy = pointToStore.accuracy || 50;
          const isImprovingQuality = currentAccuracy <= this.recoveryAccuracyThreshold;

          if (isImprovingQuality) {
            // Quality is good or improving, accept this recovery point
            this.pointsAfterRecovery++;
            this.recoveryAccuracyThreshold = currentAccuracy; // Lower threshold for next point

            console.log(`📍 GPS Recovery: Point ${this.pointsAfterRecovery}/${this.GPS_RECOVERY_POINTS} (accuracy: ${currentAccuracy.toFixed(1)}m, skipped: ${this.skippedRecoveryDistance.toFixed(1)}m, ${(recoveryDuration / 1000).toFixed(1)}s elapsed)`);
          } else {
            // Quality not improving, skip this point but don't count it toward recovery
            console.log(`⚠️ GPS Recovery: Rejected point with poor accuracy ${currentAccuracy.toFixed(1)}m > ${this.recoveryAccuracyThreshold.toFixed(1)}m threshold`);
          }

          // During recovery, use Kalman prediction for smooth UI updates
          // This prevents phantom distance while still showing progress
          if (this.kalmanFilter.isReady() && isImprovingQuality && this.lastValidLocation) {
            const recoveryTimeDelta = (pointToStore.timestamp - this.lastValidLocation.timestamp) / 1000;
            const estimatedDistance = this.kalmanFilter.predict(recoveryTimeDelta);
            this.currentSession.totalDistance = Math.max(
              this.currentSession.totalDistance,
              estimatedDistance
            );
            console.log(`🔵 Recovery interpolation: using Kalman prediction ${estimatedDistance.toFixed(1)}m (actual point not counted)`);
          }

          // Store the point but don't count it toward distance
          this.lastValidLocation = pointToStore;
          await this.storage.addPoint({
            latitude: pointToStore.latitude,
            longitude: pointToStore.longitude,
            altitude: pointToStore.altitude,
            timestamp: pointToStore.timestamp,
            accuracy: pointToStore.accuracy,
            speed: pointToStore.speed,
          });

          // Still update GPS signal strength and recovery service
          this.updateGPSSignalStrength(pointToStore.accuracy || 20);
          this.currentSession.lastGPSUpdate = Date.now();

          // After required points with good quality, we're fully recovered
          if (this.pointsAfterRecovery >= this.GPS_RECOVERY_POINTS) {
            console.log(`✅ GPS fully recovered! Prevented ${this.skippedRecoveryDistance.toFixed(1)}m of phantom distance`);
            console.log(`   Final accuracy: ${currentAccuracy.toFixed(1)}m, Recovery took ${(recoveryDuration / 1000).toFixed(1)}s`);

            // Update statistics
            this.currentSession.statistics.distanceSkippedInRecovery += this.skippedRecoveryDistance;

            // Reset recovery state
            this.wasInGpsLostState = false;
            this.pointsAfterRecovery = 0;
            this.recoveryStartTime = null;
            this.skippedRecoveryDistance = 0;
          }

          return; // Skip the rest of the distance calculation
        }
      }

      // Update metrics (normal flow when not recovering)
      if (this.lastValidLocation) {
        const rawDistance = this.calculateDistance(this.lastValidLocation, pointToStore);
        const timeDelta = (pointToStore.timestamp - this.lastValidLocation.timestamp) / 1000;

        // Update Kalman filter with measurement
        const kalmanState = this.kalmanFilter.update({
          distance: rawDistance,
          timeDelta: timeDelta,
          accuracy: pointToStore.accuracy || 20,
          confidence: pointToStore.confidence,
        });

        // Update raw cumulative distance (actual GPS measurements)
        this.currentSession.rawCumulativeDistance += rawDistance;

        // Use Kalman-filtered distance with monotonicity guarantee
        // Distance should never decrease (prevents oscillations)
        const newSmoothedDistance = kalmanState.distance;
        const previousDistance = this.currentSession.totalDistance;
        this.currentSession.totalDistance = Math.max(
          this.currentSession.totalDistance,
          newSmoothedDistance
        );

        // Track distance updates for freeze detection
        if (this.currentSession.totalDistance > this.lastDistanceValue) {
          this.lastDistanceValue = this.currentSession.totalDistance;
          this.lastDistanceUpdateTime = Date.now();
        }

        // Debug logging for Kalman filtering
        if (Platform.OS === 'android') {
          console.log(`📏 [ANDROID] Raw distance: +${rawDistance.toFixed(1)}m, Kalman total: ${kalmanState.distance.toFixed(1)}m (velocity: ${kalmanState.velocity.toFixed(2)}m/s, error: ${kalmanState.estimateError.toFixed(1)}m)`);
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

          // If a new split was recorded, add it to session and announce it
          if (newSplit) {
            this.currentSession.splits.push(newSplit);
            // Announce the split via TTS (non-blocking)
            TTSAnnouncementService.announceSplit(newSplit).catch((err) => {
              console.error('Failed to announce split:', err);
            });
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
   * Monitor GPS signal timeout and distance freeze detection
   */
  private startGPSMonitoring(): void {
    this.stopGPSMonitoring();

    this.gpsCheckTimer = setInterval(() => {
      if (!this.currentSession) return;

      const now = Date.now();
      const timeSinceLastUpdate = now - this.currentSession.lastGPSUpdate;

      // Check for GPS signal timeout
      if (timeSinceLastUpdate > GPS_SIGNAL_TIMEOUT) {
        this.currentSession.gpsSignalStrength = 'none';
        this.stateMachine.send({ type: 'GPS_LOST' });
        console.log(`⚠️ GPS timeout: No updates for ${(timeSinceLastUpdate / 1000).toFixed(1)}s`);
        // Mark for recovery tracking when signal returns
        this.wasInGpsLostState = true;
      }

      // Check for distance freeze (GPS is working but distance not updating)
      if (this.lastDistanceUpdateTime > 0) {
        const timeSinceDistanceUpdate = now - this.lastDistanceUpdateTime;
        if (timeSinceDistanceUpdate > this.DISTANCE_FREEZE_THRESHOLD_MS &&
            this.currentSession.gpsSignalStrength !== 'none') {
          console.log(`⚠️ DISTANCE FREEZE DETECTED: GPS receiving updates but distance stuck at ${this.lastDistanceValue.toFixed(1)}m for ${(timeSinceDistanceUpdate / 1000).toFixed(1)}s`);
          console.log(`   Current state: ${this.stateMachine.getState()}`);
          console.log(`   GPS signal: ${this.currentSession.gpsSignalStrength}`);
          console.log(`   In recovery mode: ${this.isInRecoveryMode()}`);
          console.log(`   Points after recovery: ${this.pointsAfterRecovery}/${this.GPS_RECOVERY_POINTS}`);
          console.log(`   Valid points: ${this.totalValidPoints}, Invalid: ${this.totalInvalidPoints}`);
        }
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
   * Start periodic background location sync
   * Checks for background locations every 5 seconds and processes them
   * This ensures distance updates even when app is backgrounded
   */
  private startBackgroundLocationSync(): void {
    this.stopBackgroundLocationSync();

    this.backgroundSyncTimer = setInterval(async () => {
      await this.syncBackgroundLocations();
    }, 5000); // Check every 5 seconds

    console.log('Started periodic background location sync');
  }

  /**
   * Stop periodic background location sync
   */
  private stopBackgroundLocationSync(): void {
    if (this.backgroundSyncTimer) {
      clearInterval(this.backgroundSyncTimer);
      this.backgroundSyncTimer = null;
    }
  }

  /**
   * Sync background locations
   * Processes background locations through validation and distance calculation
   */
  private async syncBackgroundLocations(): Promise<void> {
    const backgroundLocations = await getAndClearBackgroundLocations();
    if (backgroundLocations.length === 0) return;

    console.log(`📱 Syncing ${backgroundLocations.length} background locations`);

    // Process each background location through normal validation pipeline
    for (const loc of backgroundLocations) {
      // Convert to LocationObject format expected by handleLocationUpdate
      const locationObject: Location.LocationObject = {
        coords: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          altitude: loc.altitude || null,
          accuracy: loc.accuracy || null,
          altitudeAccuracy: null,
          heading: null,
          speed: loc.speed || null,
        },
        timestamp: loc.timestamp,
      };

      // Process through normal pipeline (includes validation, distance calc, etc.)
      await this.handleLocationUpdate(locationObject);
    }

    console.log(`✅ Processed ${backgroundLocations.length} background locations`);
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
    this.stopBackgroundLocationSync();

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
        rawCumulativeDistance: result.session.totalDistance, // Initialize raw to same as smoothed
        totalElevationGain: result.session.totalElevationGain,
        duration: result.session.duration,
        pausedDuration: result.session.pausedDuration,
        pauseStartTime: undefined,
        gpsSignalStrength: 'searching' as any,
        lastGPSUpdate: Date.now(),
        isBackgroundTracking: false,
        batteryMode: this.batteryService.getCurrentMode(),
        splits: [], // Recovered sessions start with empty splits
        statistics: {
          averageSpeed: 0,
          maxSpeed: 0,
          averageAccuracy: 0,
          gpsOutages: 0,
          interpolatedPoints: 0,
          recoveryAttempts: 0,
          distanceSkippedInRecovery: 0,
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
   * Calculate distance between two points using Haversine formula
   * Returns horizontal (2D) distance only - industry standard for running apps
   * Elevation gain is tracked separately in totalElevationGain
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

    const horizontalDistance = R * c;

    // Return horizontal distance only (2D)
    // This matches industry standards (Nike, Strava, Garmin) and official race distance measurement
    // Elevation changes are tracked separately as totalElevationGain
    return horizontalDistance;
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
    this.isInWarmup = false;
    this.warmupStartTime = null;
    this.pointsAfterRecovery = 0;
    this.wasInGpsLostState = false;
    this.recoveryStartTime = null;
    this.recoveryAccuracyThreshold = 50;
    this.skippedRecoveryDistance = 0;
    this.splitTracker.reset();
    this.kalmanFilter.reset();
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
    gpsOutages: number;
    recoveryAttempts: number;
    distanceSkippedInRecovery: number;
  } {
    return {
      validPoints: this.totalValidPoints,
      invalidPoints: this.totalInvalidPoints,
      accuracy: this.currentSession?.statistics.averageAccuracy || 0,
      batteryMode: this.batteryService.getCurrentMode(),
      gpsOutages: this.currentSession?.statistics.gpsOutages || 0,
      recoveryAttempts: this.currentSession?.statistics.recoveryAttempts || 0,
      distanceSkippedInRecovery: this.currentSession?.statistics.distanceSkippedInRecovery || 0,
    };
  }

  /**
   * Check if currently in GPS recovery mode
   */
  isInRecoveryMode(): boolean {
    return this.wasInGpsLostState && this.recoveryStartTime !== null;
  }

  /**
   * Get interpolated distance for smooth UI updates
   * Uses Kalman filter velocity prediction between GPS updates
   */
  getInterpolatedDistance(): number {
    if (!this.currentSession) return 0;

    // Don't interpolate in background mode - prevents oscillations from throttled GPS
    if (this.currentSession.isBackgroundTracking) {
      return this.currentSession.totalDistance;
    }

    // If Kalman filter is ready and has velocity estimate, use prediction for sub-second smoothing
    if (this.kalmanFilter.isReady() && this.lastValidLocation) {
      const timeSinceLastGPS = (Date.now() - this.lastValidLocation.timestamp) / 1000;

      // Only interpolate for very short durations (< 1 second)
      // Prevents oscillations from long GPS gaps
      if (timeSinceLastGPS < 1.0) {
        const predicted = this.kalmanFilter.predict(timeSinceLastGPS);
        // Apply monotonicity guarantee - never show less than current distance
        return Math.max(this.currentSession.totalDistance, predicted);
      }
    }

    // Fall back to actual distance if interpolation not available
    return this.currentSession.totalDistance;
  }

  /**
   * Get current recovery progress
   */
  getRecoveryProgress(): {
    isRecovering: boolean;
    pointsCompleted: number;
    pointsRequired: number;
    skippedDistance: number;
    duration: number;
  } | null {
    if (!this.isInRecoveryMode()) {
      return null;
    }

    return {
      isRecovering: true,
      pointsCompleted: this.pointsAfterRecovery,
      pointsRequired: this.GPS_RECOVERY_POINTS,
      skippedDistance: this.skippedRecoveryDistance,
      duration: this.recoveryStartTime ? Date.now() - this.recoveryStartTime : 0,
    };
  }
}

export const enhancedLocationTrackingService = EnhancedLocationTrackingService.getInstance();