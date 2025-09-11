/**
 * Workout Database Service - SQLite foundation for Phase 1
 * Local storage for workout metrics enabling fast competition calculations
 * Provides the data layer foundation for all competition features
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NostrWorkout } from '../../types/nostrWorkout';
import type { WorkoutType } from '../../types/workout';

// Simple in-memory implementation for Phase 1 foundation
// TODO: Replace with actual SQLite implementation using expo-sqlite
export interface WorkoutMetrics {
  id: string;
  npub: string;
  nostrEventId: string;
  type: WorkoutType;
  duration?: number; // minutes
  distance?: number; // meters
  calories?: number;
  startTime: string;
  createdAt: string;
  // Calculated metrics
  totalDistance?: number;
  best5k?: number; // minutes
  avgPace?: number; // minutes per km
  caloriesBurned?: number;
  prAchieved?: boolean;
}

export interface CompetitionCache {
  competitionId: string;
  type: 'league' | 'event';
  parameters: Record<string, any>;
  participants: string[];
  lastUpdated: string;
}

export interface LeaderboardEntry {
  competitionId: string;
  npub: string;
  score: number;
  rank: number;
  lastCalculated: string;
}

// Additional types for LeagueRankingService compatibility
export interface WorkoutRecord extends WorkoutMetrics {
  // WorkoutRecord is the same as WorkoutMetrics
}

export interface LeaderboardCache {
  competitionId: string;
  rankings: LeaderboardEntry[];
  cachedAt: string;
  expiresAt: string;
}

const STORAGE_KEYS = {
  WORKOUTS: 'workout_database_workouts',
  METRICS: 'workout_database_metrics', 
  COMPETITIONS: 'workout_database_competitions',
  LEADERBOARDS: 'workout_database_leaderboards',
};

export class WorkoutDatabase {
  private static instance: WorkoutDatabase;
  private isInitialized = false;

  constructor() {
    // Initialize in-memory storage
  }

  static getInstance(): WorkoutDatabase {
    if (!WorkoutDatabase.instance) {
      WorkoutDatabase.instance = new WorkoutDatabase();
    }
    return WorkoutDatabase.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing WorkoutDatabase (in-memory storage)...');
      // TODO: Initialize SQLite database
      // await this.createTables();
      this.isInitialized = true;
      console.log('✅ WorkoutDatabase initialized (Phase 1 foundation ready)');
    } catch (error) {
      console.error('❌ Failed to initialize WorkoutDatabase:', error);
      throw error;
    }
  }

  // ================================================================================
  // WORKOUT STORAGE
  // ================================================================================

  async storeWorkout(workout: NostrWorkout, npub: string): Promise<void> {
    try {
      const metrics: WorkoutMetrics = {
        id: workout.nostrEventId,
        npub,
        nostrEventId: workout.nostrEventId,
        type: workout.type,
        duration: workout.duration,
        distance: workout.distance,
        calories: workout.calories,
        startTime: workout.startTime,
        createdAt: new Date().toISOString(),
        // Calculate additional metrics
        totalDistance: workout.distance,
        avgPace: this.calculatePace(workout.duration, workout.distance),
        caloriesBurned: workout.calories,
        prAchieved: false, // TODO: Calculate PR logic
      };

      // Store in AsyncStorage (temporary implementation)
      const existingWorkouts = await this.getStoredWorkouts(npub);
      const updatedWorkouts = [...existingWorkouts, metrics];
      
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.WORKOUTS}_${npub}`,
        JSON.stringify(updatedWorkouts)
      );

      console.log(`✅ Stored workout: ${workout.type} - ${workout.distance}m`);
    } catch (error) {
      console.error('❌ Failed to store workout:', error);
      throw error;
    }
  }

  async getStoredWorkouts(npub: string): Promise<WorkoutMetrics[]> {
    try {
      const data = await AsyncStorage.getItem(`${STORAGE_KEYS.WORKOUTS}_${npub}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Failed to get stored workouts:', error);
      return [];
    }
  }

  async getWorkoutsByType(npub: string, type: WorkoutType): Promise<WorkoutMetrics[]> {
    const allWorkouts = await this.getStoredWorkouts(npub);
    return allWorkouts.filter(workout => workout.type === type);
  }

  async getWorkoutsInDateRange(
    npub: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<WorkoutMetrics[]> {
    const allWorkouts = await this.getStoredWorkouts(npub);
    return allWorkouts.filter(workout => {
      const workoutDate = new Date(workout.startTime);
      return workoutDate >= startDate && workoutDate <= endDate;
    });
  }

  // ================================================================================
  // COMPETITION CALCULATIONS
  // ================================================================================

  async calculateTotalDistance(npub: string, activityType?: WorkoutType): Promise<number> {
    const workouts = activityType 
      ? await this.getWorkoutsByType(npub, activityType)
      : await this.getStoredWorkouts(npub);
    
    return workouts.reduce((total, workout) => total + (workout.distance || 0), 0);
  }

  async calculateBestTime(npub: string, distance: number, activityType: WorkoutType): Promise<number | null> {
    const workouts = await this.getWorkoutsByType(npub, activityType);
    const matchingWorkouts = workouts.filter(w => 
      w.distance && Math.abs(w.distance - distance) < 100 // Within 100m tolerance
    );

    if (matchingWorkouts.length === 0) return null;

    return Math.min(...matchingWorkouts.map(w => w.duration || Infinity));
  }

  async calculateWorkoutCount(npub: string, activityType?: WorkoutType): Promise<number> {
    const workouts = activityType 
      ? await this.getWorkoutsByType(npub, activityType)
      : await this.getStoredWorkouts(npub);
    
    return workouts.length;
  }

  async calculateAveragePace(npub: string, activityType: WorkoutType): Promise<number | null> {
    const workouts = await this.getWorkoutsByType(npub, activityType);
    const workoutsWithPace = workouts.filter(w => w.distance && w.duration && w.distance > 0);
    
    if (workoutsWithPace.length === 0) return null;

    const totalPace = workoutsWithPace.reduce((sum, workout) => {
      const pace = this.calculatePace(workout.duration, workout.distance);
      return sum + (pace || 0);
    }, 0);

    return totalPace / workoutsWithPace.length;
  }

  async calculateConsistencyScore(npub: string, activityType: WorkoutType): Promise<number> {
    const workouts = await this.getWorkoutsByType(npub, activityType);
    
    if (workouts.length < 3) return 0; // Need at least 3 workouts

    // Simple consistency: how many workouts in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentWorkouts = workouts.filter(w => 
      new Date(w.startTime) >= thirtyDaysAgo
    );

    // Consistency score: percentage of days with workouts
    return Math.min(100, (recentWorkouts.length / 30) * 100);
  }

  // ================================================================================
  // LEADERBOARD CALCULATIONS
  // ================================================================================

  async calculateLeagueRankings(
    competitionId: string,
    participants: string[],
    scoringType: 'total_distance' | 'best_time' | 'consistency' | 'workout_count',
    activityType: WorkoutType
  ): Promise<LeaderboardEntry[]> {
    
    console.log(`📊 Calculating rankings for ${participants.length} participants`);
    
    const rankings: LeaderboardEntry[] = [];

    for (const npub of participants) {
      let score = 0;

      switch (scoringType) {
        case 'total_distance':
          score = await this.calculateTotalDistance(npub, activityType);
          break;
        case 'best_time':
          const bestTime = await this.calculateBestTime(npub, 5000, activityType); // 5K default
          score = bestTime ? (3600 - bestTime) : 0; // Inverse score (lower time = higher score)
          break;
        case 'consistency':
          score = await this.calculateConsistencyScore(npub, activityType);
          break;
        case 'workout_count':
          score = await this.calculateWorkoutCount(npub, activityType);
          break;
      }

      rankings.push({
        competitionId,
        npub,
        score,
        rank: 0, // Will be set after sorting
        lastCalculated: new Date().toISOString(),
      });
    }

    // Sort by score (descending) and assign ranks
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Cache the results
    await this.cacheLeaderboard(competitionId, rankings);

    console.log(`✅ Calculated rankings: ${rankings.length} entries`);
    return rankings;
  }

  async getLeaderboard(competitionId: string): Promise<LeaderboardEntry[]> {
    try {
      const data = await AsyncStorage.getItem(`${STORAGE_KEYS.LEADERBOARDS}_${competitionId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Failed to get leaderboard:', error);
      return [];
    }
  }

  private async cacheLeaderboard(competitionId: string, rankings: LeaderboardEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.LEADERBOARDS}_${competitionId}`,
        JSON.stringify(rankings)
      );
    } catch (error) {
      console.error('❌ Failed to cache leaderboard:', error);
    }
  }

  // ================================================================================
  // UTILITIES
  // ================================================================================

  private calculatePace(duration?: number, distance?: number): number | null {
    if (!duration || !distance || distance === 0) return null;
    
    const distanceKm = distance / 1000;
    return duration / distanceKm; // minutes per km
  }

  async clearUserData(npub: string): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        `${STORAGE_KEYS.WORKOUTS}_${npub}`,
        `${STORAGE_KEYS.METRICS}_${npub}`,
      ]);
      console.log('✅ Cleared workout database for user');
    } catch (error) {
      console.error('❌ Failed to clear workout database:', error);
    }
  }

  async getStorageStats(): Promise<{
    workoutCount: number;
    leaderboardCount: number;
    storageSize: number;
  }> {
    try {
      // Get all keys and count workout-related ones
      const allKeys = await AsyncStorage.getAllKeys();
      const workoutKeys = allKeys.filter(key => key.startsWith(STORAGE_KEYS.WORKOUTS));
      const leaderboardKeys = allKeys.filter(key => key.startsWith(STORAGE_KEYS.LEADERBOARDS));
      
      return {
        workoutCount: workoutKeys.length,
        leaderboardCount: leaderboardKeys.length,
        storageSize: 0, // TODO: Calculate actual storage size
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return { workoutCount: 0, leaderboardCount: 0, storageSize: 0 };
    }
  }

  // ================================================================================
  // LEAGUE RANKING SERVICE COMPATIBILITY METHODS
  // ================================================================================

  async getWorkoutMetrics(activityType: string, participantNpubs: string[]): Promise<Array<{
    npub: string;
    totalDistance: number;
    avgPace: number | null;
    totalDuration: number;
    workoutCount: number;
  }>> {
    const results = [];
    
    for (const npub of participantNpubs) {
      const workouts = await this.getStoredWorkouts(npub);
      const filteredWorkouts = activityType === 'other' 
        ? workouts 
        : workouts.filter(w => w.type === activityType);
      
      const totalDistance = filteredWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
      const totalDurationMinutes = filteredWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
      const avgPace = await this.calculateAveragePace(npub, activityType as any);
      
      results.push({
        npub,
        totalDistance,
        avgPace,
        totalDuration: totalDurationMinutes * 60, // Convert to seconds for compatibility
        workoutCount: filteredWorkouts.length,
      });
    }
    
    return results;
  }

  async getStats(): Promise<{
    workoutCount: number;
  }> {
    const stats = await this.getStorageStats();
    return {
      workoutCount: stats.workoutCount,
    };
  }

  async updateLeaderboard(entries: Array<{
    competitionId: string;
    npub: string;
    score: number;
    rank: number;
  }>): Promise<void> {
    if (entries.length === 0) return;
    
    const competitionId = entries[0].competitionId;
    const rankings = entries.map(entry => ({
      ...entry,
      lastCalculated: new Date().toISOString(),
    }));
    
    await this.cacheLeaderboard(competitionId, rankings);
  }
}

// Export both class and instance for compatibility
export { WorkoutDatabase };
export default WorkoutDatabase.getInstance();