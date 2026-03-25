/**
 * Cardio Performance Analytics Service
 * Analyzes cardio workout data for pace, distance, heart rate, VO2 Max, and recovery patterns
 * All calculations happen locally on-device
 */

import type { LocalWorkout } from '../fitness/LocalWorkoutStorageService';
import type {
  CardioPerformanceMetrics,
  PaceTrend,
  DistanceTrend,
  HeartRateTrend,
  VO2MaxData,
  PersonalRecords,
  RecoveryPattern,
  HealthProfile,
} from '../../types/analytics';

export class CardioPerformanceAnalytics {
  /**
   * Calculate all cardio performance metrics from workout data
   */
  static calculateMetrics(
    workouts: LocalWorkout[],
    healthProfile?: HealthProfile
  ): CardioPerformanceMetrics | null {
    const cardioWorkouts = this.filterCardioWorkouts(workouts);

    if (cardioWorkouts.length === 0) {
      return null;
    }

    return {
      paceImprovement: this.calculatePaceTrend(cardioWorkouts),
      distanceProgression: this.calculateDistanceTrend(cardioWorkouts),
      // TODO: Heart rate data not available in LocalWorkout - requires HealthKit integration
      heartRateEfficiency: undefined as unknown as HeartRateTrend,
      vo2MaxEstimate: healthProfile
        ? this.estimateVO2Max(cardioWorkouts, healthProfile)
        : undefined,
      personalRecords: this.calculatePersonalRecords(cardioWorkouts),
      recoveryPatterns: this.calculateRecoveryPatterns(cardioWorkouts),
    };
  }

  /**
   * Filter workouts to only cardio activities (running, cycling, walking, hiking)
   */
  private static filterCardioWorkouts(
    workouts: LocalWorkout[]
  ): LocalWorkout[] {
    const cardioTypes = ['running', 'cycling', 'walking', 'hiking'];
    return workouts
      .filter(
        (w) => cardioTypes.includes(w.type) && w.distance && w.distance > 0
      )
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
  }

  /**
   * Calculate pace improvement trend over time
   */
  private static calculatePaceTrend(workouts: LocalWorkout[]): PaceTrend {
    if (workouts.length === 0) {
      return {
        currentAvgPace: 0,
        previousAvgPace: 0,
        percentChange: 0,
        trend: 'stable',
        weeklyPaces: [],
      };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Recent 30 days
    const recentWorkouts = workouts.filter(
      (w) => new Date(w.startTime) >= thirtyDaysAgo
    );

    // Previous 30 days (30-60 days ago)
    const previousWorkouts = workouts.filter(
      (w) =>
        new Date(w.startTime) >= sixtyDaysAgo &&
        new Date(w.startTime) < thirtyDaysAgo
    );

    const currentAvgPace = this.calculateAveragePace(recentWorkouts);
    const previousAvgPace = this.calculateAveragePace(previousWorkouts);

    const percentChange =
      previousAvgPace > 0
        ? ((previousAvgPace - currentAvgPace) / previousAvgPace) * 100 // Positive = faster
        : 0;

    const trend: PaceTrend['trend'] =
      percentChange > 2
        ? 'improving'
        : percentChange < -2
        ? 'declining'
        : 'stable';

    // Weekly paces for last 12 weeks
    const weeklyPaces = this.calculateWeeklyPaces(workouts, 12);

    return {
      currentAvgPace,
      previousAvgPace,
      percentChange,
      trend,
      weeklyPaces,
    };
  }

  /**
   * Calculate average pace (seconds per km) from workouts
   * Note: LocalWorkout stores distance in METERS, so we divide by 1000 for km
   */
  private static calculateAveragePace(workouts: LocalWorkout[]): number {
    if (workouts.length === 0) return 0;

    const totalDistance = workouts.reduce(
      (sum, w) => sum + (w.distance || 0),
      0
    );
    const totalTime = workouts.reduce((sum, w) => sum + w.duration, 0);

    if (totalDistance === 0) return 0;

    // distance stored in meters, divide by 1000 for km
    return totalTime / (totalDistance / 1000); // seconds per km
  }

  /**
   * Calculate weekly average paces
   */
  private static calculateWeeklyPaces(
    workouts: LocalWorkout[],
    weeks: number
  ): Array<{ week: string; avgPace: number }> {
    const result: Array<{ week: string; avgPace: number }> = [];
    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(
        now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000
      );
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

      const weekWorkouts = workouts.filter((w) => {
        const date = new Date(w.startTime);
        return date >= weekStart && date < weekEnd;
      });

      const avgPace = this.calculateAveragePace(weekWorkouts);

      result.push({
        week: this.formatWeek(weekStart),
        avgPace,
      });
    }

    return result;
  }

  /**
   * Calculate distance progression trend
   */
  private static calculateDistanceTrend(
    workouts: LocalWorkout[]
  ): DistanceTrend {
    if (workouts.length === 0) {
      return {
        currentWeeklyAvg: 0,
        previousWeeklyAvg: 0,
        percentChange: 0,
        trend: 'stable',
        monthlyTotals: [],
      };
    }

    // Last 4 weeks
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);
    const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);

    const recentWorkouts = workouts.filter(
      (w) => new Date(w.startTime) >= fourWeeksAgo
    );
    const previousWorkouts = workouts.filter(
      (w) =>
        new Date(w.startTime) >= eightWeeksAgo &&
        new Date(w.startTime) < fourWeeksAgo
    );

    const currentWeeklyAvg = this.calculateWeeklyDistance(recentWorkouts);
    const previousWeeklyAvg = this.calculateWeeklyDistance(previousWorkouts);

    const percentChange =
      previousWeeklyAvg > 0
        ? ((currentWeeklyAvg - previousWeeklyAvg) / previousWeeklyAvg) * 100
        : 0;

    const trend: DistanceTrend['trend'] =
      percentChange > 5
        ? 'increasing'
        : percentChange < -5
        ? 'decreasing'
        : 'stable';

    const monthlyTotals = this.calculateMonthlyDistances(workouts, 6);

    return {
      currentWeeklyAvg,
      previousWeeklyAvg,
      percentChange,
      trend,
      monthlyTotals,
    };
  }

  /**
   * Calculate weekly average distance
   */
  private static calculateWeeklyDistance(workouts: LocalWorkout[]): number {
    if (workouts.length === 0) return 0;

    const totalDistance = workouts.reduce(
      (sum, w) => sum + (w.distance || 0),
      0
    );
    const firstDate = new Date(workouts[0].startTime);
    const lastDate = new Date(workouts[workouts.length - 1].startTime);
    const daysDiff = Math.max(
      1,
      (lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    const weeks = Math.max(1, daysDiff / 7);

    return totalDistance / 1000 / weeks; // km per week
  }

  /**
   * Calculate monthly distance totals
   */
  private static calculateMonthlyDistances(
    workouts: LocalWorkout[],
    months: number
  ): Array<{ month: string; totalKm: number }> {
    const result: Array<{ month: string; totalKm: number }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthWorkouts = workouts.filter((w) => {
        const date = new Date(w.startTime);
        return date >= monthStart && date <= monthEnd;
      });

      const totalKm =
        monthWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0) / 1000;

      result.push({
        month: this.formatMonth(monthStart),
        totalKm,
      });
    }

    return result;
  }

  /**
   * Calculate heart rate efficiency trend
   */
  private static calculateHeartRateTrend(
    workouts: LocalWorkout[]
  ): HeartRateTrend {
    const workoutsWithHR = workouts.filter((w) => (w as any).heartRate?.avg);

    if (workoutsWithHR.length === 0) {
      return {
        currentAvgHR: 0,
        previousAvgHR: 0,
        percentChange: 0,
        trend: 'stable',
        avgHRByPace: [],
      };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentWorkouts = workoutsWithHR.filter(
      (w) => new Date(w.startTime) >= thirtyDaysAgo
    );
    const previousWorkouts = workoutsWithHR.filter(
      (w) =>
        new Date(w.startTime) >= sixtyDaysAgo &&
        new Date(w.startTime) < thirtyDaysAgo
    );

    const currentAvgHR = this.calculateAverageHR(recentWorkouts);
    const previousAvgHR = this.calculateAverageHR(previousWorkouts);

    const percentChange =
      previousAvgHR > 0
        ? ((previousAvgHR - currentAvgHR) / previousAvgHR) * 100 // Positive = lower HR (better)
        : 0;

    const trend: HeartRateTrend['trend'] =
      percentChange > 2
        ? 'improving'
        : percentChange < -2
        ? 'declining'
        : 'stable';

    const avgHRByPace = this.calculateHRByPace(workoutsWithHR);

    return {
      currentAvgHR,
      previousAvgHR,
      percentChange,
      trend,
      avgHRByPace,
    };
  }

  /**
   * Calculate average heart rate
   */
  private static calculateAverageHR(workouts: LocalWorkout[]): number {
    if (workouts.length === 0) return 0;

    const totalHR = workouts.reduce(
      (sum, w) => sum + ((w as any).heartRate?.avg || 0),
      0
    );
    return totalHR / workouts.length;
  }

  /**
   * Calculate average HR by pace buckets
   */
  private static calculateHRByPace(
    workouts: LocalWorkout[]
  ): Array<{ pace: number; avgHR: number }> {
    // Group by pace ranges (e.g., 4:00-4:30, 4:30-5:00, etc.)
    const paceBuckets: Map<number, { totalHR: number; count: number }> =
      new Map();

    workouts.forEach((w) => {
      if (!w.distance || !(w as any).heartRate?.avg) return;

      const pace = w.duration / (w.distance / 1000); // seconds per km
      const paceBucket = Math.floor(pace / 30) * 30; // 30-second buckets

      if (!paceBuckets.has(paceBucket)) {
        paceBuckets.set(paceBucket, { totalHR: 0, count: 0 });
      }

      const bucket = paceBuckets.get(paceBucket)!;
      bucket.totalHR += (w as any).heartRate.avg;
      bucket.count += 1;
    });

    return Array.from(paceBuckets.entries())
      .map(([pace, data]) => ({
        pace,
        avgHR: data.totalHR / data.count,
      }))
      .sort((a, b) => a.pace - b.pace);
  }

  /**
   * Estimate VO2 Max from race times using complete Jack Daniels VDOT formula
   *
   * COMPLETE VO2 MAX CALCULATION (Paragraph 3 of 5):
   * Uses the Jack Daniels VDOT formula to convert race performance to VO2 max.
   * Formula: VO2max = numerator / denominator
   *
   * Numerator = -4.60 + 0.182258 × V + 0.000104 × V²
   * Denominator = 0.8 + 0.1894393 × e^(-0.012778 × T) + 0.2989558 × e^(-0.1932605 × T)
   *
   * Where V = velocity in meters per MINUTE, T = time in MINUTES
   * Example: 56-minute 10K (age 34) → VO2 max ~35 ml/kg/min
   *
   * Source: Daniels, Jack. "Daniels' Running Formula." 3rd ed. Human Kinetics, 2013.
   */
  private static estimateVO2Max(
    workouts: LocalWorkout[],
    healthProfile: HealthProfile
  ): VO2MaxData | undefined {
    // Find best 5K or 10K time
    const fiveKWorkouts = workouts.filter(
      (w) => w.distance && w.distance >= 4900 && w.distance <= 5100
    );
    const tenKWorkouts = workouts.filter(
      (w) => w.distance && w.distance >= 9900 && w.distance <= 10100
    );

    let vo2Max: number;
    const age = healthProfile.age || 30;

    // Prefer 10K if available (more accurate for VO2 max estimation)
    if (tenKWorkouts.length > 0) {
      const fastest10K = tenKWorkouts.reduce((fastest, current) => {
        return current.duration < fastest.duration ? current : fastest;
      });

      // Complete Jack Daniels VDOT formula
      const distanceMeters = fastest10K.distance!;
      const timeMinutes = fastest10K.duration / 60;
      const velocityMPM = distanceMeters / timeMinutes; // CRITICAL: meters per MINUTE (not per second!)

      const numerator =
        -4.6 + 0.182258 * velocityMPM + 0.000104 * (velocityMPM * velocityMPM);
      const denominator =
        0.8 +
        0.1894393 * Math.exp(-0.012778 * timeMinutes) +
        0.2989558 * Math.exp(-0.1932605 * timeMinutes);

      vo2Max = numerator / denominator;
    } else if (fiveKWorkouts.length > 0) {
      const fastest5K = fiveKWorkouts.reduce((fastest, current) => {
        return current.duration < fastest.duration ? current : fastest;
      });

      // Complete Jack Daniels VDOT formula for 5K
      const distanceMeters = fastest5K.distance!;
      const timeMinutes = fastest5K.duration / 60;
      const velocityMPM = distanceMeters / timeMinutes; // CRITICAL: meters per MINUTE (not per second!)

      const numerator =
        -4.6 + 0.182258 * velocityMPM + 0.000104 * (velocityMPM * velocityMPM);
      const denominator =
        0.8 +
        0.1894393 * Math.exp(-0.012778 * timeMinutes) +
        0.2989558 * Math.exp(-0.1932605 * timeMinutes);

      vo2Max = numerator / denominator;
    } else {
      return undefined;
    }

    // Cap VO2 max to reasonable range (20-80)
    vo2Max = Math.max(20, Math.min(80, vo2Max));

    // Calculate percentile
    const percentile = this.calculateVO2MaxPercentile(
      vo2Max,
      age,
      healthProfile.biologicalSex
    );

    // Calculate fitness age with 2-metric system (75% VO2 + 25% BMI)
    let bmi: number | undefined;
    if (healthProfile.weight && healthProfile.height) {
      const heightM = healthProfile.height / 100;
      bmi = healthProfile.weight / (heightM * heightM);
    }

    const fitnessAge = this.calculateFitnessAge(
      vo2Max,
      age,
      healthProfile.biologicalSex,
      bmi
    );

    // Categorize
    const category = this.categorizeVO2Max(
      vo2Max,
      age,
      healthProfile.biologicalSex
    );

    return {
      estimate: Math.round(vo2Max * 10) / 10,
      percentile,
      fitnessAge,
      category,
    };
  }

  /**
   * Calculate VO2 Max percentile (simplified)
   */
  private static calculateVO2MaxPercentile(
    vo2Max: number,
    age: number,
    sex?: 'male' | 'female'
  ): number {
    // Simplified percentile calculation
    // Real implementation would use lookup tables
    const avgVO2Max = sex === 'female' ? 35 : 42;
    const deviation = vo2Max - avgVO2Max;
    return Math.max(0, Math.min(100, 50 + deviation * 5));
  }

  /**
   * Calculate fitness age - delegates to BodyCompositionAnalytics for 2-metric calculation
   * Uses 75% VO2 Max Age + 25% BMI Age
   */
  private static calculateFitnessAge(
    vo2Max: number,
    chronologicalAge: number,
    sex?: 'male' | 'female',
    bmi?: number
  ): number {
    // Import at runtime to avoid circular dependency
    const { BodyCompositionAnalytics } = require('./BodyCompositionAnalytics');
    return BodyCompositionAnalytics.calculateFitnessAge(
      vo2Max,
      chronologicalAge,
      sex,
      bmi
    );
  }

  /**
   * Categorize VO2 Max level
   */
  private static categorizeVO2Max(
    vo2Max: number,
    age: number,
    sex?: 'male' | 'female'
  ): VO2MaxData['category'] {
    // Simplified categorization
    if (sex === 'female') {
      if (vo2Max >= 45) return 'superior';
      if (vo2Max >= 40) return 'excellent';
      if (vo2Max >= 35) return 'good';
      if (vo2Max >= 30) return 'fair';
      return 'poor';
    } else {
      if (vo2Max >= 52) return 'superior';
      if (vo2Max >= 46) return 'excellent';
      if (vo2Max >= 40) return 'good';
      if (vo2Max >= 35) return 'fair';
      return 'poor';
    }
  }

  /**
   * Calculate personal records
   */
  private static calculatePersonalRecords(
    workouts: LocalWorkout[]
  ): PersonalRecords {
    const records: PersonalRecords = {};

    // 5K PR
    const fiveKWorkouts = workouts.filter(
      (w) => w.distance && w.distance >= 4900 && w.distance <= 5100
    );
    if (fiveKWorkouts.length > 0) {
      const fastest = fiveKWorkouts.reduce((best, current) =>
        current.duration < best.duration ? current : best
      );
      records.fiveK = {
        time: fastest.duration,
        date: fastest.startTime,
        pace: fastest.duration / (fastest.distance! / 1000),
      };
    }

    // 10K PR
    const tenKWorkouts = workouts.filter(
      (w) => w.distance && w.distance >= 9900 && w.distance <= 10100
    );
    if (tenKWorkouts.length > 0) {
      const fastest = tenKWorkouts.reduce((best, current) =>
        current.duration < best.duration ? current : best
      );
      records.tenK = {
        time: fastest.duration,
        date: fastest.startTime,
        pace: fastest.duration / (fastest.distance! / 1000),
      };
    }

    // Longest run
    const longestRun = workouts.reduce((longest, current) => {
      const currentDist = current.distance || 0;
      const longestDist = longest.distance || 0;
      return currentDist > longestDist ? current : longest;
    }, workouts[0]);

    if (longestRun) {
      records.longestRun = {
        distance: longestRun.distance || 0,
        date: longestRun.startTime,
      };
    }

    return records;
  }

  /**
   * Calculate recovery patterns
   */
  private static calculateRecoveryPatterns(
    workouts: LocalWorkout[]
  ): RecoveryPattern {
    if (workouts.length < 2) {
      return {
        avgTimeBetweenWorkouts: 0,
        optimalRecoveryTime: 48,
        overtrainingRisk: 'low',
      };
    }

    // Calculate average time between workouts
    const intervals: number[] = [];
    for (let i = 1; i < workouts.length; i++) {
      const prevTime = new Date(workouts[i - 1].endTime).getTime();
      const currTime = new Date(workouts[i].startTime).getTime();
      intervals.push((currTime - prevTime) / (60 * 60 * 1000)); // hours
    }

    const avgTimeBetweenWorkouts =
      intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

    // Optimal recovery time (simplified)
    const optimalRecoveryTime = 48; // hours

    // Overtraining risk
    const recentIntervals = intervals.slice(-10); // Last 10 workouts
    const shortRecoveries = recentIntervals.filter((i) => i < 24).length;

    const overtrainingRisk: RecoveryPattern['overtrainingRisk'] =
      shortRecoveries > 5 ? 'high' : shortRecoveries > 3 ? 'moderate' : 'low';

    return {
      avgTimeBetweenWorkouts: Math.round(avgTimeBetweenWorkouts),
      optimalRecoveryTime,
      overtrainingRisk,
    };
  }

  /**
   * Format week for display
   */
  private static formatWeek(date: Date): string {
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  }

  /**
   * Format month for display
   */
  private static formatMonth(date: Date): string {
    return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }
}
