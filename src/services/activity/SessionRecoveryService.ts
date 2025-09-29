/**
 * SessionRecoveryService - Handles crash recovery and session persistence
 * Auto-saves sessions and offers recovery on app restart
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationPoint } from './LocationTrackingService';
import { StreamingLocationStorage } from './StreamingLocationStorage';

const ACTIVE_SESSION_KEY = '@runstr:active_session';
const RECOVERY_SESSIONS_KEY = '@runstr:recovery_sessions';
const AUTO_SAVE_INTERVAL = 30000; // Auto-save every 30 seconds

export interface RecoverableSession {
  id: string;
  activityType: 'running' | 'walking' | 'cycling';
  startTime: number;
  lastUpdateTime: number;
  totalDistance: number;
  totalElevationGain: number;
  duration: number; // Total active time excluding pauses
  pausedDuration: number;
  isPaused: boolean;
  lastKnownLocation?: LocationPoint;
  checkpoints: SessionCheckpoint[];
  crashed: boolean;
}

export interface SessionCheckpoint {
  timestamp: number;
  distance: number;
  duration: number;
  location: LocationPoint;
  batteryLevel?: number;
}

export interface RecoveryResult {
  success: boolean;
  session?: RecoverableSession;
  locations?: LocationPoint[];
  message: string;
}

export class SessionRecoveryService {
  private static instance: SessionRecoveryService;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private currentSession: RecoverableSession | null = null;

  private constructor() {
    this.checkForRecoverableSessions();
  }

  static getInstance(): SessionRecoveryService {
    if (!SessionRecoveryService.instance) {
      SessionRecoveryService.instance = new SessionRecoveryService();
    }
    return SessionRecoveryService.instance;
  }

  /**
   * Start tracking a new session with recovery support
   */
  startSession(
    sessionId: string,
    activityType: 'running' | 'walking' | 'cycling'
  ): void {
    this.currentSession = {
      id: sessionId,
      activityType,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      totalDistance: 0,
      totalElevationGain: 0,
      duration: 0,
      pausedDuration: 0,
      isPaused: false,
      checkpoints: [],
      crashed: false,
    };

    // Start auto-save timer
    this.startAutoSave();

    // Mark session as active
    this.saveActiveSession();
  }

  /**
   * Update session with new metrics
   */
  updateSession(
    distance: number,
    elevationGain: number,
    duration: number,
    lastLocation?: LocationPoint,
    batteryLevel?: number
  ): void {
    if (!this.currentSession) return;

    this.currentSession.totalDistance = distance;
    this.currentSession.totalElevationGain = elevationGain;
    this.currentSession.duration = duration;
    this.currentSession.lastUpdateTime = Date.now();

    if (lastLocation) {
      this.currentSession.lastKnownLocation = lastLocation;

      // Add checkpoint every 5 minutes or 1km
      const shouldCheckpoint =
        this.currentSession.checkpoints.length === 0 ||
        duration - this.getLastCheckpoint().duration > 300 || // 5 minutes
        distance - this.getLastCheckpoint().distance > 1000; // 1km

      if (shouldCheckpoint) {
        this.addCheckpoint(distance, duration, lastLocation, batteryLevel);
      }
    }
  }

  /**
   * Pause the current session
   */
  pauseSession(): void {
    if (this.currentSession && !this.currentSession.isPaused) {
      this.currentSession.isPaused = true;
      this.currentSession.lastUpdateTime = Date.now();
      this.saveActiveSession();
    }
  }

  /**
   * Resume the current session
   */
  resumeSession(pauseDuration: number): void {
    if (this.currentSession && this.currentSession.isPaused) {
      this.currentSession.isPaused = false;
      this.currentSession.pausedDuration += pauseDuration;
      this.currentSession.lastUpdateTime = Date.now();
      this.saveActiveSession();
    }
  }

  /**
   * End session normally
   */
  async endSession(): Promise<void> {
    this.stopAutoSave();

    // Remove from active sessions
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);

    // Clear recovery data
    if (this.currentSession) {
      await this.clearRecoveryData(this.currentSession.id);
    }

    this.currentSession = null;
  }

  /**
   * Check for recoverable sessions on app start
   */
  async checkForRecoverableSessions(): Promise<RecoverableSession | null> {
    try {
      const activeSessionStr = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      if (!activeSessionStr) return null;

      const session: RecoverableSession = JSON.parse(activeSessionStr);

      // Check if session is recent (within last 24 hours)
      const hoursSinceLastUpdate = (Date.now() - session.lastUpdateTime) / (1000 * 60 * 60);
      if (hoursSinceLastUpdate > 24) {
        // Too old, clear it
        await this.clearRecoveryData(session.id);
        return null;
      }

      // Mark as crashed for recovery
      session.crashed = true;

      // Store in recovery sessions
      await this.addToRecoverySessions(session);

      return session;
    } catch (error) {
      console.error('Error checking for recoverable sessions:', error);
      return null;
    }
  }

  /**
   * Attempt to recover a session
   */
  async recoverSession(sessionId: string): Promise<RecoveryResult> {
    try {
      // Get session from recovery storage
      const sessions = await this.getRecoverySessions();
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        return {
          success: false,
          message: 'Session not found',
        };
      }

      // Try to recover location data
      const storageKey = `@runstr:location_stream_${sessionId}`;
      const keys = await AsyncStorage.getAllKeys();
      const locationKeys = keys.filter(k => k.startsWith(storageKey));

      const locations: LocationPoint[] = [];
      for (const key of locationKeys) {
        const segmentStr = await AsyncStorage.getItem(key);
        if (segmentStr) {
          const segment = JSON.parse(segmentStr);
          locations.push(...segment.points);
        }
      }

      // Restore as current session
      this.currentSession = {
        ...session,
        crashed: false,
        lastUpdateTime: Date.now(),
      };

      // Restart auto-save
      this.startAutoSave();

      return {
        success: true,
        session,
        locations,
        message: `Recovered ${locations.length} location points`,
      };
    } catch (error) {
      console.error('Error recovering session:', error);
      return {
        success: false,
        message: 'Failed to recover session',
      };
    }
  }

  /**
   * Discard a recoverable session
   */
  async discardRecoverableSession(sessionId: string): Promise<void> {
    await this.clearRecoveryData(sessionId);

    // Remove from recovery sessions list
    const sessions = await this.getRecoverySessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await AsyncStorage.setItem(RECOVERY_SESSIONS_KEY, JSON.stringify(filtered));
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    this.stopAutoSave();

    this.autoSaveTimer = setInterval(() => {
      this.saveActiveSession();
    }, AUTO_SAVE_INTERVAL);
  }

  /**
   * Stop auto-save timer
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Save current session as active
   */
  private async saveActiveSession(): Promise<void> {
    if (!this.currentSession) return;

    try {
      await AsyncStorage.setItem(
        ACTIVE_SESSION_KEY,
        JSON.stringify(this.currentSession)
      );
    } catch (error) {
      console.error('Error saving active session:', error);
    }
  }

  /**
   * Add checkpoint to current session
   */
  private addCheckpoint(
    distance: number,
    duration: number,
    location: LocationPoint,
    batteryLevel?: number
  ): void {
    if (!this.currentSession) return;

    const checkpoint: SessionCheckpoint = {
      timestamp: Date.now(),
      distance,
      duration,
      location,
      batteryLevel,
    };

    this.currentSession.checkpoints.push(checkpoint);

    // Keep only last 20 checkpoints
    if (this.currentSession.checkpoints.length > 20) {
      this.currentSession.checkpoints.shift();
    }
  }

  /**
   * Get last checkpoint
   */
  private getLastCheckpoint(): SessionCheckpoint {
    if (!this.currentSession || this.currentSession.checkpoints.length === 0) {
      return {
        timestamp: Date.now(),
        distance: 0,
        duration: 0,
        location: { latitude: 0, longitude: 0, timestamp: Date.now() },
      };
    }

    return this.currentSession.checkpoints[this.currentSession.checkpoints.length - 1];
  }

  /**
   * Add session to recovery sessions list
   */
  private async addToRecoverySessions(session: RecoverableSession): Promise<void> {
    const sessions = await this.getRecoverySessions();

    // Check if session already exists
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    // Keep only last 5 sessions
    if (sessions.length > 5) {
      sessions.shift();
    }

    await AsyncStorage.setItem(RECOVERY_SESSIONS_KEY, JSON.stringify(sessions));
  }

  /**
   * Get all recovery sessions
   */
  async getRecoverySessions(): Promise<RecoverableSession[]> {
    try {
      const sessionsStr = await AsyncStorage.getItem(RECOVERY_SESSIONS_KEY);
      return sessionsStr ? JSON.parse(sessionsStr) : [];
    } catch (error) {
      console.error('Error getting recovery sessions:', error);
      return [];
    }
  }

  /**
   * Clear all recovery data for a session
   */
  private async clearRecoveryData(sessionId: string): Promise<void> {
    // Clear location storage
    const storagePrefix = `@runstr:location_stream_${sessionId}`;
    const keys = await AsyncStorage.getAllKeys();
    const locationKeys = keys.filter(k => k.startsWith(storagePrefix));

    for (const key of locationKeys) {
      await AsyncStorage.removeItem(key);
    }

    // Clear from active session if it matches
    const activeStr = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    if (activeStr) {
      const active = JSON.parse(activeStr);
      if (active.id === sessionId) {
        await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    }
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): {
    hasActiveSession: boolean;
    sessionId?: string;
    timeSinceLastUpdate?: number;
    checkpointCount?: number;
  } {
    if (!this.currentSession) {
      return { hasActiveSession: false };
    }

    return {
      hasActiveSession: true,
      sessionId: this.currentSession.id,
      timeSinceLastUpdate: Date.now() - this.currentSession.lastUpdateTime,
      checkpointCount: this.currentSession.checkpoints.length,
    };
  }
}