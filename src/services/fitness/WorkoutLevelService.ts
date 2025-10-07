/**
 * Workout Level Service
 * Calculates XP, levels, and progression from kind 1301 workout events
 * Caches level data in AsyncStorage for performance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NostrWorkout } from '../../types/nostrWorkout';
import type {
  WorkoutLevel,
  XPCalculation,
  LevelStats,
  LevelMilestone,
} from '../../types/workoutLevel';
import { XP_CONSTANTS, LEVEL_MILESTONES } from '../../types/workoutLevel';

const CACHE_KEY_PREFIX = '@runstr:workout_level:';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedLevelData {
  stats: LevelStats;
  timestamp: number;
}

export class WorkoutLevelService {
  private static instance: WorkoutLevelService;

  private constructor() {}

  static getInstance(): WorkoutLevelService {
    if (!WorkoutLevelService.instance) {
      WorkoutLevelService.instance = new WorkoutLevelService();
    }
    return WorkoutLevelService.instance;
  }

  /**
   * Calculate XP earned from a single workout
   */
  calculateWorkoutXP(workout: NostrWorkout): XPCalculation {
    // Base XP: 10 per workout
    const baseXP = XP_CONSTANTS.BASE_PER_WORKOUT;

    // Distance bonus: +1 XP per km (distance is in meters)
    const distanceKm = (workout.distance || 0) / 1000;
    const distanceBonus = Math.floor(distanceKm * XP_CONSTANTS.PER_KM);

    // Duration bonus: +1 XP per 10 minutes (duration is in seconds)
    const durationMinutes = (workout.duration || 0) / 60;
    const durationBonus = Math.floor(durationMinutes / 10) * XP_CONSTANTS.PER_10_MINUTES;

    // Calorie bonus: +5 XP per 100 calories
    const calories = workout.calories || 0;
    const calorieBonus = Math.floor(calories / 100) * XP_CONSTANTS.PER_100_CALORIES;

    const totalXP = baseXP + distanceBonus + durationBonus + calorieBonus;

    return {
      baseXP,
      distanceBonus,
      durationBonus,
      calorieBonus,
      totalXP,
    };
  }

  /**
   * Calculate level from total XP
   */
  calculateLevel(totalXP: number): WorkoutLevel {
    const level = Math.floor(totalXP / XP_CONSTANTS.XP_PER_LEVEL);
    const currentXP = totalXP % XP_CONSTANTS.XP_PER_LEVEL;
    const xpForNextLevel = XP_CONSTANTS.XP_PER_LEVEL;
    const progress = currentXP / xpForNextLevel;

    return {
      level,
      currentXP,
      xpForNextLevel,
      totalXP,
      progress,
    };
  }

  /**
   * Calculate complete level stats from workout array
   */
  calculateLevelStats(workouts: NostrWorkout[]): LevelStats {
    let totalXP = 0;
    let totalDistance = 0;
    let totalDuration = 0;
    let totalCalories = 0;

    // Calculate XP and totals from all workouts
    workouts.forEach((workout) => {
      const xp = this.calculateWorkoutXP(workout);
      totalXP += xp.totalXP;
      totalDistance += workout.distance || 0;
      totalDuration += workout.duration || 0;
      totalCalories += workout.calories || 0;
    });

    const level = this.calculateLevel(totalXP);

    return {
      totalWorkouts: workouts.length,
      totalDistance,
      totalDuration,
      totalCalories,
      level,
    };
  }

  /**
   * Get level stats with caching (for performance)
   */
  async getLevelStats(
    pubkey: string,
    workouts: NostrWorkout[],
    forceRefresh = false
  ): Promise<LevelStats> {
    const cacheKey = `${CACHE_KEY_PREFIX}${pubkey}`;

    // Check cache first
    if (!forceRefresh) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const cachedData: CachedLevelData = JSON.parse(cached);
          const age = Date.now() - cachedData.timestamp;

          if (age < CACHE_TTL) {
            console.log(`[WorkoutLevel] Cache hit: ${cachedData.stats.level.level} (age: ${Math.floor(age / 1000)}s)`);
            return cachedData.stats;
          }
        }
      } catch (error) {
        console.warn('[WorkoutLevel] Cache read error:', error);
      }
    }

    // Calculate fresh stats
    console.log(`[WorkoutLevel] Calculating stats from ${workouts.length} workouts...`);
    const stats = this.calculateLevelStats(workouts);

    // Cache the results
    try {
      const cacheData: CachedLevelData = {
        stats,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('[WorkoutLevel] Cache write error:', error);
    }

    return stats;
  }

  /**
   * Get unlocked milestones for current level
   */
  getUnlockedMilestones(currentLevel: number): LevelMilestone[] {
    return LEVEL_MILESTONES.filter((milestone) => currentLevel >= milestone.level);
  }

  /**
   * Get next milestone to unlock
   */
  getNextMilestone(currentLevel: number): LevelMilestone | null {
    const nextMilestone = LEVEL_MILESTONES.find((milestone) => currentLevel < milestone.level);
    return nextMilestone || null;
  }

  /**
   * Format level for display
   */
  formatLevel(level: number): string {
    return `Level ${level}`;
  }

  /**
   * Format XP for display
   */
  formatXP(xp: number): string {
    if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}K XP`;
    }
    return `${xp} XP`;
  }

  /**
   * Clear cached level data (useful for debugging)
   */
  async clearCache(pubkey: string): Promise<void> {
    const cacheKey = `${CACHE_KEY_PREFIX}${pubkey}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log('[WorkoutLevel] Cache cleared');
  }
}

export default WorkoutLevelService.getInstance();
