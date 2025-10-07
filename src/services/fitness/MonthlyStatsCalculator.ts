/**
 * Monthly Stats Calculator
 * Calculates detailed monthly workout insights and comparisons
 */

import type { Workout } from '../../types/workout';
import type { NostrWorkout } from '../../types/nostrWorkout';

export interface MonthlyStats {
  // Basic counts
  totalWorkouts: number;
  activeDays: number;
  totalDays: number;

  // Aggregate stats
  totalDistance: number; // in meters
  totalDuration: number; // in seconds
  totalCalories: number;

  // Averages
  avgDistance: number; // in meters
  avgDuration: number; // in seconds
  avgCalories: number;

  // Activity breakdown
  activityBreakdown: ActivityBreakdown[];
  mostCommonActivity: string;

  // Best workout
  bestWorkout: BestWorkout;

  // Weekly breakdown
  weeklyStats: WeeklyStats[];

  // Comparison with previous month
  comparison: MonthComparison | null;
}

export interface ActivityBreakdown {
  type: string;
  count: number;
  percentage: number;
  totalDistance: number;
  totalDuration: number;
}

export interface BestWorkout {
  type: 'distance' | 'duration' | 'calories';
  value: number;
  workout: Workout;
}

export interface WeeklyStats {
  weekNumber: number; // 1-5
  workouts: number;
  distance: number;
  duration: number;
}

export interface MonthComparison {
  workoutChange: number; // percentage change
  distanceChange: number; // percentage change
  durationChange: number; // percentage change
}

export class MonthlyStatsCalculator {
  /**
   * Calculate complete monthly statistics
   */
  static calculate(workouts: Workout[], previousMonthWorkouts?: Workout[]): MonthlyStats {
    // Basic counts
    const totalWorkouts = workouts.length;
    const activeDays = this.countActiveDays(workouts);
    const totalDays = this.getTotalDaysInMonth(workouts);

    // Aggregate stats
    const { totalDistance, totalDuration, totalCalories } = this.calculateTotals(workouts);

    // Averages
    const avgDistance = totalWorkouts > 0 ? totalDistance / totalWorkouts : 0;
    const avgDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;
    const avgCalories = totalWorkouts > 0 ? totalCalories / totalWorkouts : 0;

    // Activity breakdown
    const activityBreakdown = this.calculateActivityBreakdown(workouts);
    const mostCommonActivity = activityBreakdown[0]?.type || 'None';

    // Best workout
    const bestWorkout = this.findBestWorkout(workouts);

    // Weekly breakdown
    const weeklyStats = this.calculateWeeklyStats(workouts);

    // Comparison with previous month
    const comparison = previousMonthWorkouts
      ? this.compareWithPreviousMonth(workouts, previousMonthWorkouts)
      : null;

    return {
      totalWorkouts,
      activeDays,
      totalDays,
      totalDistance,
      totalDuration,
      totalCalories,
      avgDistance,
      avgDuration,
      avgCalories,
      activityBreakdown,
      mostCommonActivity,
      bestWorkout,
      weeklyStats,
      comparison,
    };
  }

  /**
   * Count unique active days
   */
  private static countActiveDays(workouts: Workout[]): number {
    const uniqueDays = new Set<string>();
    workouts.forEach((workout) => {
      const date = new Date(workout.startTime);
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      uniqueDays.add(dayKey);
    });
    return uniqueDays.size;
  }

  /**
   * Get total days in month
   */
  private static getTotalDaysInMonth(workouts: Workout[]): number {
    if (workouts.length === 0) return 0;
    const date = new Date(workouts[0].startTime);
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  /**
   * Calculate total distance, duration, and calories
   */
  private static calculateTotals(workouts: Workout[]): {
    totalDistance: number;
    totalDuration: number;
    totalCalories: number;
  } {
    let totalDistance = 0;
    let totalDuration = 0;
    let totalCalories = 0;

    workouts.forEach((workout) => {
      totalDistance += workout.distance || 0;
      totalDuration += workout.duration || 0;
      totalCalories += workout.calories || 0;
    });

    return { totalDistance, totalDuration, totalCalories };
  }

  /**
   * Calculate activity type breakdown
   */
  private static calculateActivityBreakdown(workouts: Workout[]): ActivityBreakdown[] {
    const activityMap = new Map<
      string,
      { count: number; distance: number; duration: number }
    >();

    workouts.forEach((workout) => {
      const type = workout.type || 'other';
      const current = activityMap.get(type) || { count: 0, distance: 0, duration: 0 };
      activityMap.set(type, {
        count: current.count + 1,
        distance: current.distance + (workout.distance || 0),
        duration: current.duration + (workout.duration || 0),
      });
    });

    const breakdown: ActivityBreakdown[] = [];
    activityMap.forEach((stats, type) => {
      breakdown.push({
        type,
        count: stats.count,
        percentage: (stats.count / workouts.length) * 100,
        totalDistance: stats.distance,
        totalDuration: stats.duration,
      });
    });

    // Sort by count (descending)
    return breakdown.sort((a, b) => b.count - a.count);
  }

  /**
   * Find best workout (longest distance, longest duration, or most calories)
   */
  private static findBestWorkout(workouts: Workout[]): BestWorkout {
    if (workouts.length === 0) {
      return {
        type: 'distance',
        value: 0,
        workout: {} as Workout,
      };
    }

    // Find longest distance
    const longestDistance = workouts.reduce((best, workout) => {
      return (workout.distance || 0) > (best.distance || 0) ? workout : best;
    }, workouts[0]);

    // Find longest duration
    const longestDuration = workouts.reduce((best, workout) => {
      return (workout.duration || 0) > (best.duration || 0) ? workout : best;
    }, workouts[0]);

    // Find most calories
    const mostCalories = workouts.reduce((best, workout) => {
      return (workout.calories || 0) > (best.calories || 0) ? workout : best;
    }, workouts[0]);

    // Return the most impressive (prioritize distance)
    if ((longestDistance.distance || 0) > 5000) {
      // >5km
      return {
        type: 'distance',
        value: longestDistance.distance || 0,
        workout: longestDistance,
      };
    } else if ((longestDuration.duration || 0) > 3600) {
      // >1 hour
      return {
        type: 'duration',
        value: longestDuration.duration || 0,
        workout: longestDuration,
      };
    } else {
      return {
        type: 'calories',
        value: mostCalories.calories || 0,
        workout: mostCalories,
      };
    }
  }

  /**
   * Calculate weekly statistics (4-5 weeks per month)
   */
  private static calculateWeeklyStats(workouts: Workout[]): WeeklyStats[] {
    if (workouts.length === 0) return [];

    const weekMap = new Map<
      number,
      { workouts: number; distance: number; duration: number }
    >();

    workouts.forEach((workout) => {
      const date = new Date(workout.startTime);
      const weekNumber = Math.ceil(date.getDate() / 7);
      const current = weekMap.get(weekNumber) || { workouts: 0, distance: 0, duration: 0 };
      weekMap.set(weekNumber, {
        workouts: current.workouts + 1,
        distance: current.distance + (workout.distance || 0),
        duration: current.duration + (workout.duration || 0),
      });
    });

    const weeklyStats: WeeklyStats[] = [];
    weekMap.forEach((stats, weekNumber) => {
      weeklyStats.push({
        weekNumber,
        workouts: stats.workouts,
        distance: stats.distance,
        duration: stats.duration,
      });
    });

    return weeklyStats.sort((a, b) => a.weekNumber - b.weekNumber);
  }

  /**
   * Compare with previous month
   */
  private static compareWithPreviousMonth(
    currentMonth: Workout[],
    previousMonth: Workout[]
  ): MonthComparison {
    const currentTotals = this.calculateTotals(currentMonth);
    const previousTotals = this.calculateTotals(previousMonth);

    const workoutChange = this.calculatePercentageChange(
      currentMonth.length,
      previousMonth.length
    );
    const distanceChange = this.calculatePercentageChange(
      currentTotals.totalDistance,
      previousTotals.totalDistance
    );
    const durationChange = this.calculatePercentageChange(
      currentTotals.totalDuration,
      previousTotals.totalDuration
    );

    return {
      workoutChange,
      distanceChange,
      durationChange,
    };
  }

  /**
   * Calculate percentage change
   */
  private static calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }
}
