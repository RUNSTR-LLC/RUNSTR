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
  gpsSignalStrength: 'strong' | 'medium' | 'weak' | 'none';
  lastGPSUpdate: number;
  isBackgroundTracking: boolean;
  batteryMode: 'high_accuracy' | 'balanced' | 'battery_saver';
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

  private constructor() {
    this.stateMachine = new ActivityStateMachine();
    this.recoveryService = SessionRecoveryService.getInstance();
    this.batteryService = BatteryOptimizationService.getInstance();
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
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    this.stateMachine.send({ type: 'START_TRACKING', activityType: 'running' });

    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        this.stateMachine.send({ type: 'PERMISSIONS_DENIED' });
        return false;
      }

      // Request background permissions
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      console.log('Background permission status:', backgroundStatus);

      this.stateMachine.send({ type: 'PERMISSIONS_GRANTED' });
      return true;
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
      // Check state machine
      if (!this.stateMachine.canStart()) {
        console.warn('Cannot start tracking in current state:', this.stateMachine.getState());
        return false;
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      // Create session
      const sessionId = `session_${Date.now()}`;
      this.currentSession = {
        id: sessionId,
        startTime: Date.now(),
        activityType,
        totalDistance: 0,
        totalElevationGain: 0,
        duration: 0,
        pausedDuration: 0,
        gpsSignalStrength: 'searching' as any,
        lastGPSUpdate: Date.now(),
        isBackgroundTracking: AppState.currentState !== 'active',
        batteryMode: this.batteryService.getCurrentMode(),
        statistics: {
          averageSpeed: 0,
          maxSpeed: 0,
          averageAccuracy: 0,
          gpsOutages: 0,
          interpolatedPoints: 0,
        },
      };

      // Initialize services
      this.validator = new LocationValidator(activityType);
      this.storage = new StreamingLocationStorage(sessionId);
      this.recoveryService.startSession(sessionId, activityType);

      // Start GPS monitoring
      this.startGPSMonitoring();

      // Get location options from battery service
      const locationOptions = this.batteryService.getLocationOptions(activityType);

      // Start foreground tracking
      this.locationSubscription = await Location.watchPositionAsync(
        locationOptions,
        (location) => this.handleLocationUpdate(location)
      );

      // Start background tracking
      await startBackgroundLocationTracking(activityType, sessionId);

      // Update state machine
      this.stateMachine.send({ type: 'INITIALIZATION_COMPLETE', sessionId });

      console.log(`Started enhanced tracking for ${activityType}`);
      return true;
    } catch (error) {
      console.error('Failed to start tracking:', error);
      this.stateMachine.send({ type: 'INITIALIZATION_FAILED', error: error.message });
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

    // Validate point
    const validationResult = this.validator.validatePoint(newPoint, this.lastValidLocation || undefined);

    if (validationResult.isValid) {
      // Use corrected point if available
      const pointToStore = validationResult.correctedPoint || newPoint;
      pointToStore.confidence = validationResult.confidence;

      // Update metrics
      if (this.lastValidLocation) {
        const distance = this.calculateDistance(this.lastValidLocation, pointToStore);
        this.currentSession.totalDistance += distance;

        if (pointToStore.altitude && this.lastValidLocation.altitude) {
          const elevationDiff = pointToStore.altitude - this.lastValidLocation.altitude;
          if (elevationDiff > 0) {
            this.currentSession.totalElevationGain += elevationDiff;
          }
        }
      }

      // Store point
      await this.storage.addPoint(pointToStore);
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
      console.log(`Invalid point rejected: ${validationResult.reason}`);
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
      if (this.gpsOutageStart) {
        this.currentSession.statistics.gpsOutages++;
        this.gpsOutageStart = null;
      }
    } else if (previousStrength !== 'none' && strength === 'none') {
      this.stateMachine.send({ type: 'GPS_LOST' });
      this.gpsOutageStart = Date.now();
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

    this.stateMachine.send({ type: 'PAUSE' });
    await pauseBackgroundTracking();
    this.recoveryService.pauseSession();
  }

  /**
   * Resume tracking
   */
  async resumeTracking(): Promise<void> {
    if (!this.stateMachine.canResume()) return;

    this.stateMachine.send({ type: 'RESUME' });
    await resumeBackgroundTracking();
    const pauseDuration = Date.now(); // Calculate actual pause duration
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
   * Calculate distance between two points
   */
  private calculateDistance(p1: EnhancedLocationPoint, p2: EnhancedLocationPoint): number {
    const R = 6371000;
    const φ1 = (p1.latitude * Math.PI) / 180;
    const φ2 = (p2.latitude * Math.PI) / 180;
    const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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