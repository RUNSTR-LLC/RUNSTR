/**
 * Workout Level Service
 * Simplified flat XP system: 300 XP per workout, 500 XP per level, cap at 50
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  WorkoutLevel,
  LevelStats,
  LevelMilestone,
} from '../../types/workoutLevel';
import {
  XP_VALUES,
  XP_PER_LEVEL,
  MAX_LEVEL,
  LEVEL_MILESTONES,
} from '../../types/workoutLevel';

const CACHE_KEY_PREFIX = '@runstr:workout_level:';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedLevelData {
  stats: LevelStats;
  timestamp: number;
}

// Workout interface for local workouts
interface LocalWorkout {
  id: string;
  type: string;
  distance?: number; // in meters
  duration?: number;
  startTime: string;
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
   * Get the current milestone title for a level
   */
  getMilestoneTitle(level: number): string {
    const unlockedMilestones = LEVEL_MILESTONES.filter(
      (m) => level >= m.level
    ).sort((a, b) => b.level - a.level);

    return unlockedMilestones.length > 0
      ? unlockedMilestones[0].title
      : 'Beginner';
  }

  /**
   * Calculate level from total XP using linear scaling
   * 500 XP per level, capped at MAX_LEVEL (50)
   */
  calculateLevel(totalXP: number): WorkoutLevel {
    const level = Math.min(Math.floor(totalXP / XP_PER_LEVEL), MAX_LEVEL);
    const currentXP = level >= MAX_LEVEL ? 0 : totalXP - level * XP_PER_LEVEL;
    const xpForNextLevel = level >= MAX_LEVEL ? 0 : XP_PER_LEVEL;
    const progress =
      level >= MAX_LEVEL ? 1 : xpForNextLevel > 0 ? currentXP / xpForNextLevel : 0;
    const title = this.getMilestoneTitle(level);

    return {
      level,
      currentXP,
      xpForNextLevel,
      totalXP,
      progress: Math.min(progress, 1),
      title,
    };
  }

  /**
   * Calculate complete level stats from local workout array
   * Flat 300 XP per workout
   */
  calculateLevelStats(workouts: LocalWorkout[]): LevelStats {
    let totalDistance = 0;

    workouts.forEach((workout) => {
      totalDistance += workout.distance || 0;
    });

    const totalXP = workouts.length * XP_VALUES.WORKOUT_SUBMITTED;
    const level = this.calculateLevel(totalXP);

    return {
      totalWorkouts: workouts.length,
      totalDistance,
      level,
    };
  }

  /**
   * Get level stats with caching (for performance)
   */
  async getLevelStats(
    pubkey: string,
    workouts: LocalWorkout[],
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
            console.log(
              `[WorkoutLevel] Cache hit: Level ${
                cachedData.stats.level.level
              } "${cachedData.stats.level.title}" (age: ${Math.floor(
                age / 1000
              )}s)`
            );
            return cachedData.stats;
          }
        }
      } catch (error) {
        console.warn('[WorkoutLevel] Cache read error:', error);
      }
    }

    // Calculate fresh stats
    console.log(
      `[WorkoutLevel] Calculating stats from ${workouts.length} workouts...`
    );
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
    return LEVEL_MILESTONES.filter(
      (milestone) => currentLevel >= milestone.level
    );
  }

  /**
   * Get next milestone to unlock
   */
  getNextMilestone(currentLevel: number): LevelMilestone | null {
    const nextMilestone = LEVEL_MILESTONES.find(
      (milestone) => currentLevel < milestone.level
    );
    return nextMilestone || null;
  }

  /**
   * Format XP for display with K suffix for large numbers
   */
  formatXP(xp: number): string {
    if (xp >= 10000) {
      return `${(xp / 1000).toFixed(1)}K`;
    }
    if (xp >= 1000) {
      return xp.toLocaleString();
    }
    return `${xp}`;
  }

  /**
   * Clear cached level data
   */
  async clearCache(pubkey: string): Promise<void> {
    const cacheKey = `${CACHE_KEY_PREFIX}${pubkey}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log('[WorkoutLevel] Cache cleared');
  }
}

export default WorkoutLevelService.getInstance();
