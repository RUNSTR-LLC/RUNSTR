/**
 * WorkoutRecovery - Crash recovery for interrupted workouts
 *
 * Saves periodic checkpoints during workout and offers recovery on app restart
 * Handles app crashes, force quits, and battery death gracefully
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GPSPoint } from './SimpleRunTracker';

const CHECKPOINT_KEY = '@runstr:workout_checkpoint';
const CHECKPOINT_INTERVAL_MS = 30000; // Save checkpoint every 30 seconds

export interface WorkoutCheckpoint {
  sessionId: string;
  activityType: 'running' | 'walking' | 'cycling' | 'hiking';
  startTime: number;
  distance: number;
  duration: number;
  pausedDuration: number;
  gpsPoints: GPSPoint[]; // Last 100 points
  timestamp: number;
}

export class WorkoutRecovery {
  private checkpointTimer: NodeJS.Timeout | null = null;

  /**
   * Start saving periodic checkpoints
   */
  startCheckpointing(
    sessionId: string,
    activityType: 'running' | 'walking' | 'cycling' | 'hiking',
    startTime: number,
    getSessionData: () => {
      distance: number;
      duration: number;
      pausedDuration: number;
      gpsPoints: GPSPoint[];
    }
  ) {
    // Clear any existing timer
    this.stopCheckpointing();

    // Save checkpoint every 30 seconds
    this.checkpointTimer = setInterval(async () => {
      try {
        const data = getSessionData();

        const checkpoint: WorkoutCheckpoint = {
          sessionId,
          activityType,
          startTime,
          distance: data.distance,
          duration: data.duration,
          pausedDuration: data.pausedDuration,
          gpsPoints: data.gpsPoints.slice(-100), // Last 100 points only
          timestamp: Date.now(),
        };

        await AsyncStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
        console.log('[WorkoutRecovery] Checkpoint saved');
      } catch (error) {
        console.error('[WorkoutRecovery] Failed to save checkpoint:', error);
      }
    }, CHECKPOINT_INTERVAL_MS);

    console.log('[WorkoutRecovery] Checkpointing started');
  }

  /**
   * Stop saving checkpoints (call when workout ends normally)
   */
  stopCheckpointing() {
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = null;
      console.log('[WorkoutRecovery] Checkpointing stopped');
    }
  }

  /**
   * Check if there's a recoverable workout
   * Call on app startup
   */
  async checkForRecoverableWorkout(): Promise<WorkoutCheckpoint | null> {
    try {
      const checkpointStr = await AsyncStorage.getItem(CHECKPOINT_KEY);
      if (!checkpointStr) {
        return null;
      }

      const checkpoint: WorkoutCheckpoint = JSON.parse(checkpointStr);

      // Check if checkpoint is recent (< 1 hour old)
      const age = Date.now() - checkpoint.timestamp;
      const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

      if (age > MAX_AGE_MS) {
        console.log('[WorkoutRecovery] Checkpoint too old, discarding');
        await this.clearCheckpoint();
        return null;
      }

      // Check if workout was substantial (> 1 minute and > 10 meters)
      if (checkpoint.duration < 60 || checkpoint.distance < 10) {
        console.log('[WorkoutRecovery] Checkpoint too short, discarding');
        await this.clearCheckpoint();
        return null;
      }

      console.log(
        `[WorkoutRecovery] Found recoverable workout: ${checkpoint.sessionId}`
      );
      return checkpoint;
    } catch (error) {
      console.error(
        '[WorkoutRecovery] Error checking for recoverable workout:',
        error
      );
      return null;
    }
  }

  /**
   * Clear checkpoint (call when workout is resumed or discarded)
   */
  async clearCheckpoint() {
    try {
      await AsyncStorage.removeItem(CHECKPOINT_KEY);
      console.log('[WorkoutRecovery] Checkpoint cleared');
    } catch (error) {
      console.error('[WorkoutRecovery] Error clearing checkpoint:', error);
    }
  }

  /**
   * Save a final checkpoint before normal workout end
   * This ensures we can recover even if save fails
   */
  async saveFinalCheckpoint(
    sessionId: string,
    activityType: 'running' | 'walking' | 'cycling' | 'hiking',
    startTime: number,
    distance: number,
    duration: number,
    pausedDuration: number,
    gpsPoints: GPSPoint[]
  ) {
    try {
      const checkpoint: WorkoutCheckpoint = {
        sessionId,
        activityType,
        startTime,
        distance,
        duration,
        pausedDuration,
        gpsPoints: gpsPoints.slice(-100),
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
      console.log('[WorkoutRecovery] Final checkpoint saved');
    } catch (error) {
      console.error(
        '[WorkoutRecovery] Failed to save final checkpoint:',
        error
      );
    }
  }
}

// Export singleton instance
export const workoutRecovery = new WorkoutRecovery();
