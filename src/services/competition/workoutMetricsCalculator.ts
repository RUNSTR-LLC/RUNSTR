/**
 * Workout Metrics Calculator - Extract and calculate competition metrics from Nostr 1301 events
 * Supports all competition types from League/Event creation wizards
 */

import { NostrWorkout } from '../../types/nostrWorkout';
import { WorkoutRecord } from '../database/databaseUtils';
import { CompetitionType, calculateCompetitionScore, getScoreBreakdown } from './competitionScoring';

export interface CalculatedMetrics {
  // Basic metrics
  totalDistance: number;
  totalDuration: number;
  totalCalories: number;
  workoutCount: number;
  
  // Performance metrics
  avgPace: number;
  best5k: number;
  best10k: number;
  bestMile: number;
  maxHeartRate: number;
  avgHeartRate: number;
  
  // Achievement metrics
  longestRun: number;
  longestWorkout: number;
  totalElevation: number;
  prCount: number;
  
  // Consistency metrics
  workoutStreak: number;
  weeklyConsistency: number;
  dailyAverage: number;
}

export interface CompetitionScore {
  npub: string;
  score: number;
  rank: number;
  metrics: CalculatedMetrics;
  breakdown: Record<string, number>;
}

import { CompetitionType, calculateCompetitionScore, getScoreBreakdown } from './competitionScoring';

export class WorkoutMetricsCalculator {
  private static instance: WorkoutMetricsCalculator;

  static getInstance(): WorkoutMetricsCalculator {
    if (!WorkoutMetricsCalculator.instance) {
      WorkoutMetricsCalculator.instance = new WorkoutMetricsCalculator();
    }
    return WorkoutMetricsCalculator.instance;
  }

  /**
   * Extract workout data from Nostr 1301 event
   */
  extractWorkoutFromNostrEvent(nostrWorkout: NostrWorkout): WorkoutRecord {
    return {
      npub: nostrWorkout.pubkey,
      nostrEventId: nostrWorkout.nostrEventId,
      type: this.normalizeWorkoutType(nostrWorkout.type),
      duration: nostrWorkout.duration || 0,
      distance: nostrWorkout.distance,
      calories: nostrWorkout.calories,
      startTime: nostrWorkout.startTime,
      heartRateAvg: nostrWorkout.heartRate,
      heartRateMax: undefined,
      pace: this.calculatePace(nostrWorkout.duration, nostrWorkout.distance),
      elevationGain: undefined,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate comprehensive metrics for a user's workouts
   */
  calculateUserMetrics(workouts: WorkoutRecord[]): CalculatedMetrics {
    if (workouts.length === 0) {
      return this.getZeroMetrics();
    }

    const runningWorkouts = workouts.filter(w => w.type.toLowerCase() === 'running');
    
    return {
      // Basic metrics
      totalDistance: this.sumValues(workouts, 'distance'),
      totalDuration: this.sumValues(workouts, 'duration'),
      totalCalories: this.sumValues(workouts, 'calories'),
      workoutCount: workouts.length,
      
      // Performance metrics
      avgPace: this.calculateAveragePace(runningWorkouts),
      best5k: this.findBestTime(runningWorkouts, 5000),
      best10k: this.findBestTime(runningWorkouts, 10000),
      bestMile: this.findBestTime(runningWorkouts, 1609),
      maxHeartRate: this.maxValue(workouts, 'heartRateMax') || 0,
      avgHeartRate: this.avgValue(workouts, 'heartRateAvg') || 0,
      
      // Achievement metrics
      longestRun: this.maxValue(runningWorkouts, 'distance') || 0,
      longestWorkout: this.maxValue(workouts, 'duration') || 0,
      totalElevation: this.sumValues(workouts, 'elevationGain'),
      prCount: 0, // TODO: Calculate PRs
      
      // Consistency metrics
      workoutStreak: this.calculateCurrentStreak(workouts),
      weeklyConsistency: this.calculateWeeklyConsistency(workouts),
      dailyAverage: workouts.length > 0 ? this.calculateDailyAverage(workouts) : 0,
    };
  }

  /**
   * Calculate competition scores for multiple participants
   */
  calculateCompetitionScores(
    participantWorkouts: Record<string, WorkoutRecord[]>,
    competitionType: CompetitionType,
    activityType: string
  ): CompetitionScore[] {
    const scores: CompetitionScore[] = [];

    // Calculate metrics for each participant
    for (const [npub, workouts] of Object.entries(participantWorkouts)) {
      const filteredWorkouts = this.filterWorkoutsByActivity(workouts, activityType);
      const metrics = this.calculateUserMetrics(filteredWorkouts);
      const score = calculateCompetitionScore(metrics, competitionType);
      const breakdown = getScoreBreakdown(metrics, competitionType);

      scores.push({
        npub,
        score,
        rank: 0, // Will be assigned after sorting
        metrics,
        breakdown,
      });
    }

    // Sort by score (descending) and assign ranks
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((score, index) => {
      score.rank = index + 1;
    });

    return scores;
  }



  // ================================================================================
  // HELPER METHODS
  // ================================================================================

  /**
   * Normalize workout type names
   */
  private normalizeWorkoutType(type: string): string {
    const normalized = type.toLowerCase().trim();
    
    const typeMap: Record<string, string> = {
      'run': 'running',
      'jog': 'running',
      'bike': 'cycling',
      'cycle': 'cycling',
      'walk': 'walking',
      'hike': 'walking',
      'strength': 'strength_training',
      'weights': 'strength_training',
      'gym': 'strength_training',
      'meditate': 'meditation',
      'mindfulness': 'meditation',
    };

    return typeMap[normalized] || normalized;
  }

  /**
   * Calculate pace in seconds per kilometer
   */
  private calculatePace(duration: number | undefined, distance: number | undefined): number | undefined {
    if (!duration || !distance || distance === 0) return undefined;
    
    const distanceKm = distance / 1000;
    return duration / distanceKm;
  }

  /**
   * Filter workouts by activity type
   */
  private filterWorkoutsByActivity(workouts: WorkoutRecord[], activityType: string): WorkoutRecord[] {
    const normalizedActivity = this.normalizeWorkoutType(activityType);
    return workouts.filter(w => this.normalizeWorkoutType(w.type) === normalizedActivity);
  }

  /**
   * Sum values from workout records
   */
  private sumValues(workouts: WorkoutRecord[], field: keyof WorkoutRecord): number {
    return workouts.reduce((sum, workout) => {
      const value = workout[field] as number;
      return sum + (value || 0);
    }, 0);
  }

  /**
   * Get maximum value from workout records
   */
  private maxValue(workouts: WorkoutRecord[], field: keyof WorkoutRecord): number | undefined {
    const values = workouts.map(w => w[field] as number).filter(v => v != null);
    return values.length > 0 ? Math.max(...values) : undefined;
  }

  /**
   * Get average value from workout records
   */
  private avgValue(workouts: WorkoutRecord[], field: keyof WorkoutRecord): number | undefined {
    const values = workouts.map(w => w[field] as number).filter(v => v != null);
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : undefined;
  }

  /**
   * Calculate average pace for running workouts
   */
  private calculateAveragePace(runningWorkouts: WorkoutRecord[]): number {
    const pacedWorkouts = runningWorkouts.filter(w => w.pace != null);
    return pacedWorkouts.length > 0 
      ? pacedWorkouts.reduce((sum, w) => sum + w.pace!, 0) / pacedWorkouts.length
      : 0;
  }

  /**
   * Find best time for specific distance
   */
  private findBestTime(workouts: WorkoutRecord[], targetDistance: number): number {
    const eligibleWorkouts = workouts.filter(w => 
      w.distance && w.distance >= targetDistance && w.duration
    );

    if (eligibleWorkouts.length === 0) return 0;

    // For races at exact distance, use actual time
    const exactDistance = eligibleWorkouts.filter(w => 
      Math.abs(w.distance! - targetDistance) < 100
    );

    if (exactDistance.length > 0) {
      return Math.min(...exactDistance.map(w => w.duration));
    }

    // For longer distances, estimate time using pace
    const withPace = eligibleWorkouts.filter(w => w.pace);
    if (withPace.length === 0) return 0;

    const bestPace = Math.min(...withPace.map(w => w.pace!));
    return (bestPace * targetDistance) / 1000;
  }

  /**
   * Calculate current workout streak
   */
  private calculateCurrentStreak(workouts: WorkoutRecord[]): number {
    if (workouts.length === 0) return 0;

    // Sort by date (most recent first)
    const sorted = [...workouts].sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const workout of sorted) {
      const workoutDate = new Date(workout.startTime);
      workoutDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (24 * 60 * 60 * 1000));

      if (diffDays === streak || (streak === 0 && diffDays <= 1)) {
        streak = diffDays + 1;
        currentDate = workoutDate;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate weekly consistency score
   */
  private calculateWeeklyConsistency(workouts: WorkoutRecord[]): number {
    if (workouts.length === 0) return 0;

    const weeksWithWorkouts = new Set<string>();
    
    for (const workout of workouts) {
      const date = new Date(workout.startTime);
      const year = date.getFullYear();
      const week = this.getWeekOfYear(date);
      weeksWithWorkouts.add(`${year}-${week}`);
    }

    const totalWeeks = Math.max(1, this.calculateWeekSpan(workouts));
    return weeksWithWorkouts.size / totalWeeks;
  }

  /**
   * Calculate daily average workouts
   */
  private calculateDailyAverage(workouts: WorkoutRecord[]): number {
    if (workouts.length === 0) return 0;

    const daySpan = this.calculateDaySpan(workouts);
    return workouts.length / Math.max(1, daySpan);
  }

  /**
   * Get week of year
   */
  private getWeekOfYear(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Calculate week span
   */
  private calculateWeekSpan(workouts: WorkoutRecord[]): number {
    if (workouts.length === 0) return 1;

    const dates = workouts.map(w => new Date(w.startTime));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const diffTime = latest.getTime() - earliest.getTime();
    const diffWeeks = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000));
    
    return Math.max(1, diffWeeks);
  }

  /**
   * Calculate day span
   */
  private calculateDaySpan(workouts: WorkoutRecord[]): number {
    if (workouts.length === 0) return 1;

    const dates = workouts.map(w => new Date(w.startTime));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const diffTime = latest.getTime() - earliest.getTime();
    const diffDays = Math.ceil(diffTime / (24 * 60 * 60 * 1000));
    
    return Math.max(1, diffDays);
  }

  /**
   * Get zero metrics for empty data
   */
  private getZeroMetrics(): CalculatedMetrics {
    return {
      totalDistance: 0,
      totalDuration: 0,
      totalCalories: 0,
      workoutCount: 0,
      avgPace: 0,
      best5k: 0,
      best10k: 0,
      bestMile: 0,
      maxHeartRate: 0,
      avgHeartRate: 0,
      longestRun: 0,
      longestWorkout: 0,
      totalElevation: 0,
      prCount: 0,
      workoutStreak: 0,
      weeklyConsistency: 0,
      dailyAverage: 0,
    };
  }
}

export default WorkoutMetricsCalculator.getInstance();