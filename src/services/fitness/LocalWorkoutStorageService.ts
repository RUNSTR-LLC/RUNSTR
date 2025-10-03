/**
 * LocalWorkoutStorageService - Persistent storage for Activity Tracker workouts
 * Stores GPS-tracked and manually-entered workouts until synced to Nostr
 * Integrates with WorkoutMergeService for unified workout history display
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutType } from '../../types/workout';
import type { Split } from './SplitTrackingService';

export interface LocalWorkout {
  id: string; // Unique identifier for deduplication
  type: WorkoutType;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  duration: number; // seconds
  distance?: number; // meters
  calories?: number;
  source: 'gps_tracker' | 'manual_entry';

  // GPS-specific fields
  elevation?: number; // meters
  pace?: number; // minutes per km
  speed?: number; // km/h
  splits?: Split[];

  // Manual entry fields
  reps?: number;
  sets?: number;
  notes?: string;

  // Metadata
  createdAt: string; // ISO timestamp
  syncedToNostr: boolean;
  nostrEventId?: string; // Set when synced
  syncedAt?: string; // ISO timestamp when synced
}

const STORAGE_KEYS = {
  LOCAL_WORKOUTS: 'local_workouts',
  WORKOUT_ID_COUNTER: 'local_workout_id_counter',
};

export class LocalWorkoutStorageService {
  private static instance: LocalWorkoutStorageService;

  private constructor() {}

  static getInstance(): LocalWorkoutStorageService {
    if (!LocalWorkoutStorageService.instance) {
      LocalWorkoutStorageService.instance = new LocalWorkoutStorageService();
    }
    return LocalWorkoutStorageService.instance;
  }

  /**
   * Generate unique workout ID for local storage
   */
  private async generateWorkoutId(): Promise<string> {
    try {
      const counterStr = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_ID_COUNTER);
      const counter = counterStr ? parseInt(counterStr, 10) : 0;
      const newCounter = counter + 1;
      await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_ID_COUNTER, newCounter.toString());

      // Format: local_[timestamp]_[counter]_[random]
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      return `local_${timestamp}_${newCounter}_${random}`;
    } catch (error) {
      console.error('❌ Failed to generate workout ID:', error);
      // Fallback to simple timestamp-based ID
      return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
  }

  /**
   * Save GPS-tracked workout to local storage
   */
  async saveGPSWorkout(workout: {
    type: WorkoutType;
    distance: number; // meters
    duration: number; // seconds
    calories: number;
    elevation?: number; // meters
    pace?: number; // minutes per km
    speed?: number; // km/h
    splits?: Split[];
  }): Promise<string> {
    try {
      const workoutId = await this.generateWorkoutId();
      const now = new Date().toISOString();
      const startTime = new Date(Date.now() - workout.duration * 1000).toISOString();

      const localWorkout: LocalWorkout = {
        id: workoutId,
        type: workout.type,
        startTime,
        endTime: now,
        duration: workout.duration,
        distance: workout.distance,
        calories: workout.calories,
        elevation: workout.elevation,
        pace: workout.pace,
        speed: workout.speed,
        splits: workout.splits,
        source: 'gps_tracker',
        createdAt: now,
        syncedToNostr: false,
      };

      await this.saveWorkout(localWorkout);
      console.log(`✅ Saved GPS workout locally: ${workoutId} (${workout.type}, ${(workout.distance / 1000).toFixed(2)}km)`);
      return workoutId;
    } catch (error) {
      console.error('❌ Failed to save GPS workout:', error);
      throw error;
    }
  }

  /**
   * Save manually-entered workout to local storage
   */
  async saveManualWorkout(workout: {
    type: WorkoutType;
    duration?: number; // minutes
    distance?: number; // km
    reps?: number;
    sets?: number;
    notes?: string;
  }): Promise<string> {
    try {
      const workoutId = await this.generateWorkoutId();
      const now = new Date().toISOString();

      // Convert duration from minutes to seconds
      const durationSeconds = workout.duration ? workout.duration * 60 : 0;
      const startTime = workout.duration
        ? new Date(Date.now() - durationSeconds * 1000).toISOString()
        : now;

      // Convert distance from km to meters (if provided)
      const distanceMeters = workout.distance ? workout.distance * 1000 : undefined;

      const localWorkout: LocalWorkout = {
        id: workoutId,
        type: workout.type,
        startTime,
        endTime: now,
        duration: durationSeconds,
        distance: distanceMeters,
        reps: workout.reps,
        sets: workout.sets,
        notes: workout.notes,
        source: 'manual_entry',
        createdAt: now,
        syncedToNostr: false,
      };

      await this.saveWorkout(localWorkout);
      console.log(`✅ Saved manual workout locally: ${workoutId} (${workout.type})`);
      return workoutId;
    } catch (error) {
      console.error('❌ Failed to save manual workout:', error);
      throw error;
    }
  }

  /**
   * Internal method to save workout to AsyncStorage
   */
  private async saveWorkout(workout: LocalWorkout): Promise<void> {
    try {
      const workouts = await this.getAllWorkouts();
      workouts.push(workout);
      await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_WORKOUTS, JSON.stringify(workouts));
    } catch (error) {
      console.error('❌ Failed to save workout to storage:', error);
      throw error;
    }
  }

  /**
   * Get all local workouts (both synced and unsynced)
   */
  async getAllWorkouts(): Promise<LocalWorkout[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_WORKOUTS);
      if (!data) return [];

      const workouts: LocalWorkout[] = JSON.parse(data);

      // Sort by start time (newest first)
      return workouts.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    } catch (error) {
      console.error('❌ Failed to retrieve local workouts:', error);
      return [];
    }
  }

  /**
   * Get only unsynced workouts
   */
  async getUnsyncedWorkouts(): Promise<LocalWorkout[]> {
    const allWorkouts = await this.getAllWorkouts();
    return allWorkouts.filter(w => !w.syncedToNostr);
  }

  /**
   * Mark workout as synced to Nostr
   */
  async markAsSynced(workoutId: string, nostrEventId: string): Promise<void> {
    try {
      const workouts = await this.getAllWorkouts();
      const workout = workouts.find(w => w.id === workoutId);

      if (!workout) {
        console.warn(`⚠️ Workout ${workoutId} not found in local storage`);
        return;
      }

      workout.syncedToNostr = true;
      workout.nostrEventId = nostrEventId;
      workout.syncedAt = new Date().toISOString();

      await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_WORKOUTS, JSON.stringify(workouts));
      console.log(`✅ Marked workout ${workoutId} as synced (Nostr event: ${nostrEventId})`);
    } catch (error) {
      console.error('❌ Failed to mark workout as synced:', error);
      throw error;
    }
  }

  /**
   * Clean up old synced workouts (optional - keeps storage lean)
   * Removes synced workouts older than specified days
   */
  async cleanupSyncedWorkouts(olderThanDays: number = 30): Promise<number> {
    try {
      const workouts = await this.getAllWorkouts();
      const cutoffDate = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

      const remainingWorkouts = workouts.filter(workout => {
        if (!workout.syncedToNostr) return true; // Keep unsynced workouts
        if (!workout.syncedAt) return true; // Keep if sync date unknown

        const syncDate = new Date(workout.syncedAt).getTime();
        return syncDate > cutoffDate; // Keep if synced recently
      });

      const removedCount = workouts.length - remainingWorkouts.length;

      if (removedCount > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_WORKOUTS, JSON.stringify(remainingWorkouts));
        console.log(`✅ Cleaned up ${removedCount} synced workouts older than ${olderThanDays} days`);
      }

      return removedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup synced workouts:', error);
      return 0;
    }
  }

  /**
   * Delete a specific workout by ID
   */
  async deleteWorkout(workoutId: string): Promise<void> {
    try {
      const workouts = await this.getAllWorkouts();
      const filteredWorkouts = workouts.filter(w => w.id !== workoutId);

      await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_WORKOUTS, JSON.stringify(filteredWorkouts));
      console.log(`✅ Deleted workout ${workoutId} from local storage`);
    } catch (error) {
      console.error('❌ Failed to delete workout:', error);
      throw error;
    }
  }

  /**
   * Clear all local workouts (use with caution)
   */
  async clearAllWorkouts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_WORKOUTS);
      console.log('✅ Cleared all local workouts');
    } catch (error) {
      console.error('❌ Failed to clear local workouts:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics for UI display
   */
  async getStats(): Promise<{
    total: number;
    synced: number;
    unsynced: number;
    totalStorageKB: number;
  }> {
    try {
      const workouts = await this.getAllWorkouts();
      const synced = workouts.filter(w => w.syncedToNostr).length;

      const data = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_WORKOUTS);
      const storageBytes = data ? new Blob([data]).size : 0;

      return {
        total: workouts.length,
        synced,
        unsynced: workouts.length - synced,
        totalStorageKB: Math.round(storageBytes / 1024),
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return { total: 0, synced: 0, unsynced: 0, totalStorageKB: 0 };
    }
  }
}

export default LocalWorkoutStorageService.getInstance();
