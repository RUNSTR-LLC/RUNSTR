/**
 * WorkoutAnalyticsService - Performance Calculations & Analytics
 * 
 * Analyzes workout data to calculate meaningful performance metrics:
 * - Best times for standard distances (5K, 10K, half marathon, marathon)
 * - Current and longest workout streaks
 * - Personal records and achievements
 * - Trends and comparisons (this year vs last year)
 * - Monthly/weekly volume analysis
 */

import type { UnifiedWorkout } from '../fitness/workoutMergeService';
import type { WorkoutType } from '../../types/workout';

// Performance Analytics Interfaces
export interface PersonalRecord {
  distance: number; // meters
  distanceDisplay: string; // "5K", "10K", etc.
  time: number; // seconds
  timeDisplay: string; // "22:15"
  date: string; // ISO date
  pace: number; // seconds per km
  paceDisplay: string; // "4:27 /km"
  workout?: UnifiedWorkout; // Reference to the workout
}

export interface WorkoutStreak {
  current: number; // Current streak in days
  longest: number; // Longest streak ever
  longestPeriod?: {
    start: string;
    end: string;
  };
}

export interface VolumeStats {
  totalDistance: number; // meters
  totalTime: number; // seconds
  totalWorkouts: number;
  averageDistance: number;
  averageDuration: number;
  workoutsPerWeek: number;
}

export interface YearComparison {
  thisYear: VolumeStats;
  lastYear: VolumeStats;
  improvement: {
    distance: number; // percentage change
    workouts: number; // percentage change
    avgPace: number; // percentage change (negative = faster)
  };
}

export interface PerformanceAnalytics {
  // Hero Stats
  personalRecords: PersonalRecord[];
  streak: WorkoutStreak;
  
  // Volume Analysis
  thisYear: VolumeStats;
  thisMonth: VolumeStats;
  yearComparison: YearComparison;
  
  // Activity Breakdown
  activityBreakdown: Array<{
    type: WorkoutType;
    count: number;
    percentage: number;
    totalDistance: number;
    totalTime: number;
    avgPace?: number;
  }>;
  
  // Recent Achievements
  recentPRs: PersonalRecord[];
  milestones: Array<{
    type: 'distance' | 'time' | 'workouts' | 'streak';
    value: number;
    description: string;
    achievedDate: string;
  }>;
  
  // Data Quality
  totalWorkoutsAnalyzed: number;
  dataDateRange: {
    earliest: string;
    latest: string;
  };
  lastUpdated: string;
}

// Standard race distances in meters
const STANDARD_DISTANCES = [
  { meters: 1000, display: '1K' },
  { meters: 5000, display: '5K' },
  { meters: 10000, display: '10K' },
  { meters: 21097, display: 'Half Marathon' },
  { meters: 42195, display: 'Marathon' },
] as const;

export class WorkoutAnalyticsService {
  private static instance: WorkoutAnalyticsService;

  private constructor() {}

  static getInstance(): WorkoutAnalyticsService {
    if (!WorkoutAnalyticsService.instance) {
      WorkoutAnalyticsService.instance = new WorkoutAnalyticsService();
    }
    return WorkoutAnalyticsService.instance;
  }

  /**
   * Main analytics calculation - processes all workout data
   */
  async calculatePerformanceAnalytics(workouts: UnifiedWorkout[]): Promise<PerformanceAnalytics> {
    const startTime = Date.now();
    console.log(`📊 WorkoutAnalyticsService: Analyzing ${workouts.length} workouts...`);

    if (workouts.length === 0) {
      return this.getEmptyAnalytics();
    }

    // Sort workouts by date (newest first) for consistent processing
    const sortedWorkouts = [...workouts].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    // Calculate all analytics components in parallel
    const [
      personalRecords,
      streak,
      thisYear,
      thisMonth,
      yearComparison,
      activityBreakdown,
      recentPRs,
      milestones,
      dataDateRange
    ] = await Promise.all([
      this.calculatePersonalRecords(sortedWorkouts),
      this.calculateStreaks(sortedWorkouts),
      this.calculateVolumeStats(sortedWorkouts, 'thisYear'),
      this.calculateVolumeStats(sortedWorkouts, 'thisMonth'),
      this.calculateYearComparison(sortedWorkouts),
      this.calculateActivityBreakdown(sortedWorkouts),
      this.findRecentPRs(sortedWorkouts, 90), // Last 90 days
      this.calculateMilestones(sortedWorkouts),
      this.getDataDateRange(sortedWorkouts)
    ]);

    const analytics: PerformanceAnalytics = {
      personalRecords,
      streak,
      thisYear,
      thisMonth,
      yearComparison,
      activityBreakdown,
      recentPRs,
      milestones,
      totalWorkoutsAnalyzed: sortedWorkouts.length,
      dataDateRange,
      lastUpdated: new Date().toISOString()
    };

    const duration = Date.now() - startTime;
    console.log(`✅ Analytics calculated in ${duration}ms: ${personalRecords.length} PRs, ${streak.current} day streak`);

    return analytics;
  }

  /**
   * Calculate personal records for standard distances
   */
  private async calculatePersonalRecords(workouts: UnifiedWorkout[]): Promise<PersonalRecord[]> {
    const records: PersonalRecord[] = [];

    // Only process running workouts with distance
    const runningWorkouts = workouts.filter(w => 
      (w.type === 'running' || w.type === 'walking') && 
      w.distance && w.distance > 0 && w.duration > 0
    );

    for (const targetDistance of STANDARD_DISTANCES) {
      // Find workouts within 5% of target distance (to account for GPS variations)
      const tolerance = targetDistance.meters * 0.05;
      const candidateWorkouts = runningWorkouts.filter(w => 
        Math.abs(w.distance! - targetDistance.meters) <= tolerance
      );

      if (candidateWorkouts.length === 0) continue;

      // Find the fastest workout for this distance
      const bestWorkout = candidateWorkouts.reduce((best, current) => {
        const bestPace = best.duration / (best.distance! / 1000);
        const currentPace = current.duration / (current.distance! / 1000);
        return currentPace < bestPace ? current : best;
      });

      const pace = bestWorkout.duration / (bestWorkout.distance! / 1000); // seconds per km
      const record: PersonalRecord = {
        distance: targetDistance.meters,
        distanceDisplay: targetDistance.display,
        time: bestWorkout.duration,
        timeDisplay: this.formatTime(bestWorkout.duration),
        date: bestWorkout.startTime.split('T')[0], // Extract date
        pace,
        paceDisplay: this.formatPace(pace),
        workout: bestWorkout
      };

      records.push(record);
    }

    return records.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Calculate current and longest workout streaks
   */
  private async calculateStreaks(workouts: UnifiedWorkout[]): Promise<WorkoutStreak> {
    if (workouts.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Get unique workout dates (in local timezone)
    const workoutDates = new Set(
      workouts.map(w => new Date(w.startTime).toLocaleDateString())
    );

    const sortedDates = Array.from(workoutDates).sort();
    
    let currentStreak = 0;
    let longestStreak = 0;
    let longestPeriod: { start: string; end: string } | undefined;
    let currentStreakStart = '';

    // Calculate current streak (working backwards from today)
    const today = new Date().toLocaleDateString();
    let checkDate = new Date();
    
    while (workoutDates.has(checkDate.toLocaleDateString())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak
    let tempStreak = 1;
    let tempStart = sortedDates[0];
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Consecutive days
        tempStreak++;
      } else {
        // Streak broken, check if it's the longest
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
          longestPeriod = {
            start: tempStart,
            end: sortedDates[i - 1]
          };
        }
        tempStreak = 1;
        tempStart = sortedDates[i];
      }
    }
    
    // Check final streak
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
      longestPeriod = {
        start: tempStart,
        end: sortedDates[sortedDates.length - 1]
      };
    }

    return {
      current: currentStreak,
      longest: longestStreak,
      longestPeriod
    };
  }

  /**
   * Calculate volume statistics for specified period
   */
  private async calculateVolumeStats(workouts: UnifiedWorkout[], period: 'thisYear' | 'thisMonth'): Promise<VolumeStats> {
    const now = new Date();
    const startDate = period === 'thisYear' 
      ? new Date(now.getFullYear(), 0, 1) // Start of this year
      : new Date(now.getFullYear(), now.getMonth(), 1); // Start of this month

    const periodWorkouts = workouts.filter(w => 
      new Date(w.startTime) >= startDate
    );

    if (periodWorkouts.length === 0) {
      return {
        totalDistance: 0,
        totalTime: 0,
        totalWorkouts: 0,
        averageDistance: 0,
        averageDuration: 0,
        workoutsPerWeek: 0
      };
    }

    const totalDistance = periodWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
    const totalTime = periodWorkouts.reduce((sum, w) => sum + w.duration, 0);
    
    // Calculate time period for rate calculations
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeksInPeriod = Math.max(1, daysSinceStart / 7);

    return {
      totalDistance,
      totalTime,
      totalWorkouts: periodWorkouts.length,
      averageDistance: totalDistance / periodWorkouts.length,
      averageDuration: totalTime / periodWorkouts.length,
      workoutsPerWeek: periodWorkouts.length / weeksInPeriod
    };
  }

  /**
   * Calculate year-over-year comparison
   */
  private async calculateYearComparison(workouts: UnifiedWorkout[]): Promise<YearComparison> {
    const thisYear = await this.calculateVolumeStats(workouts, 'thisYear');
    
    // Calculate last year stats
    const now = new Date();
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
    
    const lastYearWorkouts = workouts.filter(w => {
      const workoutDate = new Date(w.startTime);
      return workoutDate >= lastYearStart && workoutDate <= lastYearEnd;
    });
    
    const lastYear = await this.calculateVolumeStatsFromWorkouts(lastYearWorkouts);
    
    // Calculate improvements (percentage change)
    const distanceImprovement = lastYear.totalDistance > 0 
      ? ((thisYear.totalDistance - lastYear.totalDistance) / lastYear.totalDistance) * 100 
      : 0;
    
    const workoutsImprovement = lastYear.totalWorkouts > 0
      ? ((thisYear.totalWorkouts - lastYear.totalWorkouts) / lastYear.totalWorkouts) * 100
      : 0;
    
    // Calculate average pace improvement (negative means faster)
    const thisYearPace = thisYear.totalDistance > 0 ? thisYear.totalTime / (thisYear.totalDistance / 1000) : 0;
    const lastYearPace = lastYear.totalDistance > 0 ? lastYear.totalTime / (lastYear.totalDistance / 1000) : 0;
    const paceImprovement = lastYearPace > 0 ? ((thisYearPace - lastYearPace) / lastYearPace) * 100 : 0;

    return {
      thisYear,
      lastYear,
      improvement: {
        distance: distanceImprovement,
        workouts: workoutsImprovement,
        avgPace: paceImprovement
      }
    };
  }

  /**
   * Helper to calculate volume stats from workout array
   */
  private async calculateVolumeStatsFromWorkouts(workouts: UnifiedWorkout[]): Promise<VolumeStats> {
    if (workouts.length === 0) {
      return {
        totalDistance: 0,
        totalTime: 0,
        totalWorkouts: 0,
        averageDistance: 0,
        averageDuration: 0,
        workoutsPerWeek: 0
      };
    }

    const totalDistance = workouts.reduce((sum, w) => sum + (w.distance || 0), 0);
    const totalTime = workouts.reduce((sum, w) => sum + w.duration, 0);
    
    return {
      totalDistance,
      totalTime,
      totalWorkouts: workouts.length,
      averageDistance: totalDistance / workouts.length,
      averageDuration: totalTime / workouts.length,
      workoutsPerWeek: workouts.length / 52 // Approximate for year data
    };
  }

  /**
   * Calculate activity type breakdown
   */
  private async calculateActivityBreakdown(workouts: UnifiedWorkout[]) {
    const breakdown = new Map<WorkoutType, {
      count: number;
      totalDistance: number;
      totalTime: number;
      totalPaceTime: number; // For pace calculation
    }>();

    workouts.forEach(workout => {
      const current = breakdown.get(workout.type) || {
        count: 0,
        totalDistance: 0,
        totalTime: 0,
        totalPaceTime: 0
      };

      current.count++;
      current.totalDistance += workout.distance || 0;
      current.totalTime += workout.duration;
      
      // Only add to pace calculation if it's a distance-based activity
      if (workout.distance && workout.distance > 0 && 
          (workout.type === 'running' || workout.type === 'walking' || workout.type === 'cycling')) {
        current.totalPaceTime += workout.duration;
      }

      breakdown.set(workout.type, current);
    });

    const total = workouts.length;
    return Array.from(breakdown.entries()).map(([type, stats]) => ({
      type,
      count: stats.count,
      percentage: (stats.count / total) * 100,
      totalDistance: stats.totalDistance,
      totalTime: stats.totalTime,
      avgPace: stats.totalDistance > 0 ? stats.totalPaceTime / (stats.totalDistance / 1000) : undefined
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Find recent personal records
   */
  private async findRecentPRs(workouts: UnifiedWorkout[], daysBack: number): Promise<PersonalRecord[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    const recentWorkouts = workouts.filter(w => 
      new Date(w.startTime) >= cutoffDate
    );
    
    // For now, return a subset of all PRs that were achieved recently
    // In a full implementation, this would track historical bests vs recent achievements
    const allPRs = await this.calculatePersonalRecords(workouts);
    return allPRs.filter(pr => new Date(pr.date) >= cutoffDate).slice(0, 3);
  }

  /**
   * Calculate achievement milestones
   */
  private async calculateMilestones(workouts: UnifiedWorkout[]) {
    const milestones: Array<{
      type: 'distance' | 'time' | 'workouts' | 'streak';
      value: number;
      description: string;
      achievedDate: string;
    }> = [];

    // Total distance milestones
    const totalDistance = workouts.reduce((sum, w) => sum + (w.distance || 0), 0);
    const distanceKm = Math.floor(totalDistance / 1000);
    
    if (distanceKm >= 1000) {
      milestones.push({
        type: 'distance',
        value: distanceKm,
        description: `${distanceKm.toLocaleString()}km total distance`,
        achievedDate: new Date().toISOString().split('T')[0]
      });
    }

    // Workout count milestones
    if (workouts.length >= 100) {
      milestones.push({
        type: 'workouts',
        value: workouts.length,
        description: `${workouts.length} workouts completed`,
        achievedDate: new Date().toISOString().split('T')[0]
      });
    }

    return milestones;
  }

  /**
   * Get data date range
   */
  private getDataDateRange(workouts: UnifiedWorkout[]) {
    if (workouts.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      return { earliest: today, latest: today };
    }

    const dates = workouts.map(w => w.startTime.split('T')[0]).sort();
    return {
      earliest: dates[0],
      latest: dates[dates.length - 1]
    };
  }

  /**
   * Return empty analytics structure
   */
  private getEmptyAnalytics(): PerformanceAnalytics {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      personalRecords: [],
      streak: { current: 0, longest: 0 },
      thisYear: {
        totalDistance: 0,
        totalTime: 0,
        totalWorkouts: 0,
        averageDistance: 0,
        averageDuration: 0,
        workoutsPerWeek: 0
      },
      thisMonth: {
        totalDistance: 0,
        totalTime: 0,
        totalWorkouts: 0,
        averageDistance: 0,
        averageDuration: 0,
        workoutsPerWeek: 0
      },
      yearComparison: {
        thisYear: {
          totalDistance: 0,
          totalTime: 0,
          totalWorkouts: 0,
          averageDistance: 0,
          averageDuration: 0,
          workoutsPerWeek: 0
        },
        lastYear: {
          totalDistance: 0,
          totalTime: 0,
          totalWorkouts: 0,
          averageDistance: 0,
          averageDuration: 0,
          workoutsPerWeek: 0
        },
        improvement: { distance: 0, workouts: 0, avgPace: 0 }
      },
      activityBreakdown: [],
      recentPRs: [],
      milestones: [],
      totalWorkoutsAnalyzed: 0,
      dataDateRange: { earliest: today, latest: today },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Format time in MM:SS or HH:MM:SS
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Format pace as MM:SS /km
   */
  private formatPace(secondsPerKm: number): string {
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
  }
}

// Export singleton instance
export default WorkoutAnalyticsService.getInstance();