/**
 * Workout Grouping Utility
 * Groups workouts by time periods and calculates aggregated statistics
 */

import type { UnifiedWorkout } from '../services/fitness/workoutMergeService';
import type { WorkoutType } from '../types/workout';

export type TimeGroupKey =
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'earlierThisMonth'
  | 'earlierThisYear'
  | string; // For year groups like '2024', '2023'

export interface WorkoutGroup {
  key: TimeGroupKey;
  title: string;
  workouts: UnifiedWorkout[];
  stats: GroupStats;
  dateRange: {
    start: Date;
    end: Date;
  };
  isExpanded: boolean;
}

export interface GroupStats {
  totalWorkouts: number;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  totalCalories: number;
  averagePace?: number; // seconds per km
  favoriteActivity: WorkoutType;
  activityBreakdown: Record<WorkoutType, number>;
}

export class WorkoutGroupingService {
  /**
   * Groups workouts by time periods
   */
  static groupWorkoutsByTime(
    workouts: UnifiedWorkout[],
    referenceDate = new Date()
  ): WorkoutGroup[] {
    const groups: Map<TimeGroupKey, UnifiedWorkout[]> = new Map();

    // Calculate date boundaries
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);

    const startOfWeek = this.getStartOfWeek(today);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Group workouts
    workouts.forEach(workout => {
      const workoutDate = new Date(workout.startTime);
      const key = this.getTimeGroupKey(workoutDate, {
        today,
        startOfWeek,
        startOfLastWeek,
        startOfMonth,
        startOfLastMonth,
        startOfYear
      });

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(workout);
    });

    // Convert to WorkoutGroup objects with stats
    const result: WorkoutGroup[] = [];
    const sortedKeys = this.sortGroupKeys(Array.from(groups.keys()));

    sortedKeys.forEach(key => {
      const groupWorkouts = groups.get(key) || [];
      if (groupWorkouts.length > 0) {
        result.push({
          key,
          title: this.getGroupTitle(key),
          workouts: groupWorkouts.sort((a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          ),
          stats: this.calculateGroupStats(groupWorkouts),
          dateRange: this.getDateRange(key, referenceDate),
          isExpanded: key === 'thisWeek' // Expand current week by default
        });
      }
    });

    return result;
  }

  /**
   * Get the Monday of the week for a given date
   */
  private static getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(d.setDate(diff));
  }

  /**
   * Determine which time group a workout belongs to
   */
  private static getTimeGroupKey(
    workoutDate: Date,
    boundaries: {
      today: Date;
      startOfWeek: Date;
      startOfLastWeek: Date;
      startOfMonth: Date;
      startOfLastMonth: Date;
      startOfYear: Date;
    }
  ): TimeGroupKey {
    const { today, startOfWeek, startOfLastWeek, startOfMonth, startOfLastMonth, startOfYear } = boundaries;

    if (workoutDate >= startOfWeek && workoutDate <= today) {
      return 'thisWeek';
    }

    if (workoutDate >= startOfLastWeek && workoutDate < startOfWeek) {
      return 'lastWeek';
    }

    if (workoutDate >= startOfMonth && workoutDate < startOfLastWeek) {
      return 'earlierThisMonth';
    }

    if (workoutDate >= startOfLastMonth && workoutDate < startOfMonth) {
      return 'lastMonth';
    }

    if (workoutDate >= startOfYear && workoutDate < startOfLastMonth) {
      return 'earlierThisYear';
    }

    // Previous years
    return workoutDate.getFullYear().toString();
  }

  /**
   * Sort group keys chronologically (most recent first)
   */
  private static sortGroupKeys(keys: TimeGroupKey[]): TimeGroupKey[] {
    const order = ['thisWeek', 'lastWeek', 'earlierThisMonth', 'lastMonth', 'earlierThisYear'];
    const yearKeys = keys.filter(k => !order.includes(k)).sort((a, b) => parseInt(b) - parseInt(a));

    return [...order.filter(k => keys.includes(k)), ...yearKeys];
  }

  /**
   * Get human-readable title for a group
   */
  private static getGroupTitle(key: TimeGroupKey): string {
    const titles: Record<string, string> = {
      thisWeek: 'Week',
      lastWeek: 'Last Week',
      earlierThisMonth: 'Month',
      lastMonth: 'Month',
      earlierThisYear: 'Year'
    };

    return titles[key] || key; // Year groups use the year as title
  }

  /**
   * Calculate aggregated statistics for a group of workouts
   */
  static calculateGroupStats(workouts: UnifiedWorkout[]): GroupStats {
    const activityBreakdown: Record<WorkoutType, number> = {} as Record<WorkoutType, number>;

    let totalDistance = 0;
    let totalDuration = 0;
    let totalCalories = 0;

    workouts.forEach(workout => {
      totalDistance += workout.distance || 0;
      totalDuration += workout.duration;
      totalCalories += workout.calories || 0;

      const type = workout.type;
      activityBreakdown[type] = (activityBreakdown[type] || 0) + 1;
    });

    // Find favorite activity
    let favoriteActivity: WorkoutType = 'other';
    let maxCount = 0;
    Object.entries(activityBreakdown).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteActivity = type as WorkoutType;
      }
    });

    // Calculate average pace if distance workouts exist
    const averagePace = totalDistance > 0
      ? (totalDuration / (totalDistance / 1000)) // seconds per km
      : undefined;

    return {
      totalWorkouts: workouts.length,
      totalDistance,
      totalDuration,
      totalCalories,
      averagePace,
      favoriteActivity,
      activityBreakdown
    };
  }

  /**
   * Get date range for a time group
   */
  private static getDateRange(key: TimeGroupKey, referenceDate = new Date()): { start: Date; end: Date } {
    const today = new Date(referenceDate);
    today.setHours(23, 59, 59, 999);

    const startOfWeek = this.getStartOfWeek(today);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const startOfYear = new Date(today.getFullYear(), 0, 1);

    switch (key) {
      case 'thisWeek':
        return { start: startOfWeek, end: today };
      case 'lastWeek':
        return { start: startOfLastWeek, end: new Date(startOfWeek.getTime() - 1) };
      case 'earlierThisMonth':
        return { start: startOfMonth, end: new Date(startOfLastWeek.getTime() - 1) };
      case 'lastMonth':
        return { start: startOfLastMonth, end: endOfLastMonth };
      case 'earlierThisYear':
        return { start: startOfYear, end: new Date(startOfLastMonth.getTime() - 1) };
      default:
        // Year groups
        const year = parseInt(key);
        return {
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31, 23, 59, 59, 999)
        };
    }
  }
}