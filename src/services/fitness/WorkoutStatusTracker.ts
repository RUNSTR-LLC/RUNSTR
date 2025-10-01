/**
 * WorkoutStatusTracker - Tracks posting status of workouts
 * Prevents duplicate submissions and maintains UI state
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type WorkoutStatus = {
  postedToNostr: boolean;
  competedInNostr: boolean;
  postedAt?: string;
  competedAt?: string;
  nostrEventId?: string;
  competitionEventId?: string;
};

export class WorkoutStatusTracker {
  private static instance: WorkoutStatusTracker;
  private statusCache: Map<string, WorkoutStatus> = new Map();

  private constructor() {
    this.loadCache();
  }

  static getInstance(): WorkoutStatusTracker {
    if (!WorkoutStatusTracker.instance) {
      WorkoutStatusTracker.instance = new WorkoutStatusTracker();
    }
    return WorkoutStatusTracker.instance;
  }

  /**
   * Load status cache from AsyncStorage
   */
  private async loadCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const workoutKeys = keys.filter(k =>
        k.startsWith('@runstr:workout_status:')
      );

      if (workoutKeys.length > 0) {
        const values = await AsyncStorage.multiGet(workoutKeys);
        values.forEach(([key, value]) => {
          if (value) {
            const workoutId = key.replace('@runstr:workout_status:', '');
            this.statusCache.set(workoutId, JSON.parse(value));
          }
        });
      }
    } catch (error) {
      console.error('Failed to load workout status cache:', error);
    }
  }

  /**
   * Get workout status
   */
  async getStatus(workoutId: string): Promise<WorkoutStatus> {
    // Check cache first
    const cached = this.statusCache.get(workoutId);
    if (cached) {
      return cached;
    }

    // Load from storage
    try {
      const key = `@runstr:workout_status:${workoutId}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const status = JSON.parse(stored) as WorkoutStatus;
        this.statusCache.set(workoutId, status);
        return status;
      }
    } catch (error) {
      console.error('Failed to get workout status:', error);
    }

    // Return default status
    return {
      postedToNostr: false,
      competedInNostr: false,
    };
  }

  /**
   * Mark workout as posted to social (kind 1)
   */
  async markAsPosted(
    workoutId: string,
    eventId?: string
  ): Promise<void> {
    try {
      const currentStatus = await this.getStatus(workoutId);
      const updatedStatus: WorkoutStatus = {
        ...currentStatus,
        postedToNostr: true,
        postedAt: new Date().toISOString(),
        nostrEventId: eventId || currentStatus.nostrEventId,
      };

      const key = `@runstr:workout_status:${workoutId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedStatus));
      this.statusCache.set(workoutId, updatedStatus);

      console.log(`✅ Marked workout ${workoutId} as posted`);
    } catch (error) {
      console.error('Failed to mark workout as posted:', error);
      throw error;
    }
  }

  /**
   * Mark workout as competed (kind 1301)
   */
  async markAsCompeted(
    workoutId: string,
    eventId?: string
  ): Promise<void> {
    try {
      const currentStatus = await this.getStatus(workoutId);
      const updatedStatus: WorkoutStatus = {
        ...currentStatus,
        competedInNostr: true,
        competedAt: new Date().toISOString(),
        competitionEventId: eventId || currentStatus.competitionEventId,
      };

      const key = `@runstr:workout_status:${workoutId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedStatus));
      this.statusCache.set(workoutId, updatedStatus);

      console.log(`✅ Marked workout ${workoutId} as competed`);
    } catch (error) {
      console.error('Failed to mark workout as competed:', error);
      throw error;
    }
  }

  /**
   * Check if workout can be posted
   */
  async canPost(workoutId: string): Promise<boolean> {
    const status = await this.getStatus(workoutId);
    return !status.postedToNostr;
  }

  /**
   * Check if workout can be competed
   */
  async canCompete(workoutId: string): Promise<boolean> {
    const status = await this.getStatus(workoutId);
    return !status.competedInNostr;
  }

  /**
   * Clear status for a workout
   */
  async clearStatus(workoutId: string): Promise<void> {
    try {
      const key = `@runstr:workout_status:${workoutId}`;
      await AsyncStorage.removeItem(key);
      this.statusCache.delete(workoutId);
    } catch (error) {
      console.error('Failed to clear workout status:', error);
    }
  }

  /**
   * Get all tracked workout IDs
   */
  getTrackedWorkoutIds(): string[] {
    return Array.from(this.statusCache.keys());
  }

  /**
   * Clear all status data (for debugging)
   */
  async clearAllStatus(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const workoutKeys = keys.filter(k =>
        k.startsWith('@runstr:workout_status:')
      );

      if (workoutKeys.length > 0) {
        await AsyncStorage.multiRemove(workoutKeys);
      }

      this.statusCache.clear();
      console.log('✅ Cleared all workout status data');
    } catch (error) {
      console.error('Failed to clear all workout status:', error);
    }
  }
}

export default WorkoutStatusTracker.getInstance();