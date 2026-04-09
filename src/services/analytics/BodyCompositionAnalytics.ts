/**
 * Body Composition Analytics Service
 * Calculates BMI, VO2 Max, Fitness Age, and healthy weight ranges
 * All calculations happen locally using health profile data
 *
 * FORMULAS AND REFERENCES:
 * - BMI: WHO standard (weight_kg / height_m²)
 * - VO2 Max: Jack Daniels' VDOT formula (Daniels' Running Formula, 3rd Ed, 2013)
 * - VO2 Max Fallback: Léger & Mercier running economy formula
 * - Percentiles: ACSM Guidelines for Exercise Testing and Prescription (11th Ed, 2021)
 * - Fitness Age: NTNU methodology (Nes et al., 2013) - VO2 Max + Activity Level
 *
 * ACCURACY NOTES:
 * - VO2 Max is most accurate from timed 5K/10K race efforts
 * - Pace-based estimates are labeled as "estimated" with lower confidence
 * - BMI doesn't account for muscle mass (athletes may show "overweight")
 * - Fitness Age uses VO2 Max (85%) + Activity Level (15%), no BMI penalty
 */

import type { LocalWorkout } from '../fitness/LocalWorkoutStorageService';
import type {
  BodyCompositionMetrics,
  HealthProfile,
} from '../../types/analytics';

// ACSM Percentile Tables by age group and sex
// Values are VO2 Max (ml/kg/min) at each percentile
const VO2_PERCENTILE_TABLES = {
  male: {
    '20-29': { 10: 33, 25: 38, 50: 43, 75: 48, 90: 53 },
    '30-39': { 10: 31, 25: 36, 50: 41, 75: 46, 90: 51 },
    '40-49': { 10: 28, 25: 33, 50: 38, 75: 43, 90: 48 },
    '50-59': { 10: 25, 25: 30, 50: 35, 75: 40, 90: 45 },
    '60+': { 10: 22, 25: 27, 50: 32, 75: 37, 90: 42 },
  },
  female: {
    '20-29': { 10: 28, 25: 33, 50: 38, 75: 43, 90: 48 },
    '30-39': { 10: 26, 25: 31, 50: 36, 75: 41, 90: 46 },
    '40-49': { 10: 24, 25: 29, 50: 34, 75: 39, 90: 44 },
    '50-59': { 10: 22, 25: 27, 50: 32, 75: 37, 90: 42 },
    '60+': { 10: 20, 25: 25, 50: 30, 75: 35, 90: 40 },
  },
} as const;

// Age-specific VO2 Max norms for fitness age calculation (ACSM standards)
const VO2_AGE_NORMS = {
  male: {
    20: 43, 25: 42, 30: 41, 35: 39, 40: 38,
    45: 37, 50: 36, 55: 35, 60: 34, 65: 33, 70: 32,
  },
  female: {
    20: 39, 25: 38, 30: 37, 35: 36, 40: 35,
    45: 34, 50: 33, 55: 32, 60: 31, 65: 30, 70: 29,
  },
} as const;

export interface VO2MaxResult {
  estimate: number;
  percentile: number;
  fitnessAge: number;
  category: 'poor' | 'fair' | 'good' | 'excellent' | 'superior';
  confidence: 'high' | 'medium' | 'low';
  method: '10k' | '5k' | 'pace_estimate';
  methodDescription: string;
}

/**
 * RUNSTR Fitness Age Result
 * A more encouraging, activity-focused fitness age calculation
 * that rewards consistency, variety, and showing up
 */
export interface RunstrFitnessAgeResult {
  fitnessAge: number;
  chronologicalAge: number;
  breakdown: {
    consistencyBonus: number;      // Up to -5 years (workout frequency)
    volumeBonus: number;           // Up to -5 years (weekly distance/time)
    varietyBonus: number;          // Up to -3 years (activity types)
    cardioBonus: number;           // Up to -5 years (cardio performance)
    inactivityPenalty: number;     // Up to +5 years (only if sedentary)
  };
  summary: string;
  encouragement: string;
}

export class BodyCompositionAnalytics {
  /**
   * Calculate all body composition metrics
   */
  static calculateMetrics(
    healthProfile: HealthProfile,
    workouts: LocalWorkout[]
  ): BodyCompositionMetrics | null {
    if (!healthProfile.weight || !healthProfile.height) {
      console.log('ℹ️ No weight/height data - body composition metrics unavailable');
      return null;
    }

    const bmi = this.calculateBMI(healthProfile.weight, healthProfile.height);
    const healthyWeightRange = this.getHealthyWeightRange(healthProfile.height);

    return {
      currentBMI: bmi.value,
      bmiCategory: bmi.category,
      healthyWeightRange,
      weightTrend: [],
    };
  }

  /**
   * Calculate BMI (Body Mass Index)
   * Formula: weight (kg) / height (m)² - WHO Standard
   */
  static calculateBMI(
    weightKg: number,
    heightCm: number
  ): {
    value: number;
    category: 'underweight' | 'normal' | 'overweight' | 'obese';
  } {
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    let category: 'underweight' | 'normal' | 'overweight' | 'obese';
    if (bmi < 18.5) category = 'underweight';
    else if (bmi < 25) category = 'normal';
    else if (bmi < 30) category = 'overweight';
    else category = 'obese';

    return {
      value: Math.round(bmi * 10) / 10,
      category,
    };
  }

  /**
   * Calculate healthy weight range for given height
   * Based on BMI range of 18.5-24.9 (normal)
   */
  static getHealthyWeightRange(heightCm: number): { min: number; max: number } {
    const heightM = heightCm / 100;
    const minWeight = 18.5 * heightM * heightM;
    const maxWeight = 24.9 * heightM * heightM;

    return {
      min: Math.round(minWeight * 10) / 10,
      max: Math.round(maxWeight * 10) / 10,
    };
  }

  /**
   * Estimate VO2 Max from running workouts
   * Uses Jack Daniels' VDOT formula for timed runs (industry standard)
   * Falls back to Léger & Mercier formula for pace-based estimates
   */
  static estimateVO2Max(
    workouts: LocalWorkout[],
    healthProfile: HealthProfile
  ): VO2MaxResult | undefined {
    // Filter for running workouts with distance
    const runningWorkouts = workouts.filter(
      (w) =>
        (w.type === 'running' || w.type === 'walking') &&
        w.distance &&
        w.distance > 0 &&
        w.duration > 0
    );

    if (runningWorkouts.length === 0) {
      return undefined;
    }

    // Try 10K first (more accurate), then 5K
    const tenKWorkouts = runningWorkouts.filter(
      (w) => w.distance && w.distance >= 9800 && w.distance <= 10200
    );
    const fiveKWorkouts = runningWorkouts.filter(
      (w) => w.distance && w.distance >= 4900 && w.distance <= 5100
    );

    let vo2Max: number;
    let method: '10k' | '5k' | 'pace_estimate';
    let methodDescription: string;
    let confidence: 'high' | 'medium' | 'low';

    if (tenKWorkouts.length > 0) {
      // Use 10K time - most accurate
      const fastest10K = this.getFastestWorkout(tenKWorkouts);
      vo2Max = this.calculateVO2MaxFromRace(fastest10K.distance!, fastest10K.duration);
      method = '10k';
      methodDescription = `Based on your fastest 10K: ${this.formatDuration(fastest10K.duration)}`;
      confidence = 'high';
    } else if (fiveKWorkouts.length > 0) {
      // Use 5K time - very accurate
      const fastest5K = this.getFastestWorkout(fiveKWorkouts);
      vo2Max = this.calculateVO2MaxFromRace(fastest5K.distance!, fastest5K.duration);
      method = '5k';
      methodDescription = `Based on your fastest 5K: ${this.formatDuration(fastest5K.duration)}`;
      confidence = 'high';
    } else {
      // Fall back to pace-based estimate using Léger & Mercier formula
      const paceEstimate = this.estimateVO2MaxFromPace(runningWorkouts);
      if (!paceEstimate) return undefined;
      vo2Max = paceEstimate;
      method = 'pace_estimate';
      methodDescription = 'Estimated from average running pace (complete a timed 5K/10K for more accuracy)';
      confidence = 'low';
    }

    // Calculate percentile using ACSM tables
    const percentile = this.calculateVO2MaxPercentile(
      vo2Max,
      healthProfile.age || 30,
      healthProfile.biologicalSex
    );

    // Calculate fitness age using new formula (VO2 + Activity, no BMI)
    const fitnessAge = this.calculateFitnessAge(
      vo2Max,
      healthProfile.age || 30,
      healthProfile.biologicalSex,
      workouts
    );

    const category = this.categorizeVO2Max(
      vo2Max,
      healthProfile.age || 30,
      healthProfile.biologicalSex
    );

    return {
      estimate: Math.round(vo2Max * 10) / 10,
      percentile: Math.round(percentile),
      fitnessAge: Math.round(fitnessAge),
      category,
      confidence,
      method,
      methodDescription,
    };
  }

  /**
   * Calculate VO2 Max from race time using Jack Daniels' VDOT formula
   * Formula: VO2 = -4.6 + 0.182258 × velocity + 0.000104 × velocity²
   * where velocity = distance(m) / time(min)
   */
  private static calculateVO2MaxFromRace(distanceMeters: number, durationSeconds: number): number {
    const timeMinutes = durationSeconds / 60;
    const velocity = distanceMeters / timeMinutes; // meters per minute

    // Jack Daniels' VDOT formula
    const vo2Max = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;

    return vo2Max;
  }

  /**
   * Estimate VO2 Max from average running pace using Léger & Mercier formula
   * More scientifically valid than the previous arbitrary formula
   */
  private static estimateVO2MaxFromPace(runningWorkouts: LocalWorkout[]): number | undefined {
    if (runningWorkouts.length === 0) return undefined;

    // Calculate average pace (seconds per km)
    const totalDistance = runningWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
    const totalTime = runningWorkouts.reduce((sum, w) => sum + w.duration, 0);

    if (totalDistance === 0) return undefined;

    const avgPaceSecondsPerKm = totalTime / (totalDistance / 1000);

    // Convert pace to speed in km/h
    const speedKmH = 3600 / avgPaceSecondsPerKm;

    // Léger & Mercier running economy formula (ml/kg/min at submaximal pace)
    // VO2 = 2.209 + 3.163×speed(km/h) + 0.000525542×speed³
    const runningVO2 = 2.209 + 3.163 * speedKmH + 0.000525542 * Math.pow(speedKmH, 3);

    // Estimate VO2 Max assuming average pace is ~77% effort (midpoint of 75-80%)
    const estimatedVO2Max = runningVO2 / 0.77;

    // Clamp to reasonable range (20-80 ml/kg/min)
    return Math.max(20, Math.min(80, estimatedVO2Max));
  }

  /**
   * Calculate VO2 Max percentile using ACSM tables with interpolation
   */
  private static calculateVO2MaxPercentile(
    vo2Max: number,
    age: number,
    sex?: 'male' | 'female'
  ): number {
    const gender = sex === 'female' ? 'female' : 'male';
    const ageGroup = this.getAgeGroup(age);
    const table = VO2_PERCENTILE_TABLES[gender][ageGroup];

    // Interpolate percentile from table
    const percentiles = [10, 25, 50, 75, 90] as const;

    // If below 10th percentile
    if (vo2Max <= table[10]) {
      return Math.max(1, (vo2Max / table[10]) * 10);
    }

    // If above 90th percentile
    if (vo2Max >= table[90]) {
      return Math.min(99, 90 + ((vo2Max - table[90]) / table[90]) * 10);
    }

    // Find the bracket and interpolate
    for (let i = 0; i < percentiles.length - 1; i++) {
      const lowerP = percentiles[i];
      const upperP = percentiles[i + 1];
      const lowerVO2 = table[lowerP];
      const upperVO2 = table[upperP];

      if (vo2Max >= lowerVO2 && vo2Max <= upperVO2) {
        // Linear interpolation
        const ratio = (vo2Max - lowerVO2) / (upperVO2 - lowerVO2);
        return lowerP + ratio * (upperP - lowerP);
      }
    }

    return 50; // Default fallback
  }

  /**
   * Get age group for ACSM table lookup
   */
  private static getAgeGroup(age: number): '20-29' | '30-39' | '40-49' | '50-59' | '60+' {
    if (age < 30) return '20-29';
    if (age < 40) return '30-39';
    if (age < 50) return '40-49';
    if (age < 60) return '50-59';
    return '60+';
  }

  /**
   * Calculate fitness age using VO2 Max (85%) + Activity Level (15%)
   * Based on NTNU research - removes arbitrary BMI penalties
   */
  static calculateFitnessAge(
    vo2Max: number,
    chronologicalAge: number,
    sex?: 'male' | 'female',
    workouts?: LocalWorkout[]
  ): number {
    const gender = sex === 'female' ? 'female' : 'male';
    const norms = VO2_AGE_NORMS[gender];

    // Find the age where VO2 max matches the user's current VO2 max
    let vo2Age = chronologicalAge;
    let smallestDiff = Infinity;

    for (const [ageStr, normVO2] of Object.entries(norms)) {
      const age = parseInt(ageStr);
      const diff = Math.abs(normVO2 - vo2Max);

      if (diff < smallestDiff) {
        smallestDiff = diff;
        vo2Age = age;
      }
    }

    // Cap at 20 (minimum) and 70 (maximum)
    if (vo2Max > norms[20]) vo2Age = 20;
    if (vo2Max < norms[70]) vo2Age = 70;

    // Calculate activity-adjusted age (15% weight)
    let activityAge = chronologicalAge;
    if (workouts && workouts.length > 0) {
      const avgWeeklyWorkouts = this.getAverageWeeklyWorkouts(workouts, 4);

      if (avgWeeklyWorkouts >= 5) {
        activityAge = chronologicalAge - 3; // Very active: -3 years
      } else if (avgWeeklyWorkouts >= 3) {
        activityAge = chronologicalAge - 1; // Active: -1 year
      } else if (avgWeeklyWorkouts >= 1) {
        activityAge = chronologicalAge; // Somewhat active: no change
      } else {
        activityAge = chronologicalAge + 2; // Sedentary: +2 years
      }
    }

    // Weighted average: 85% VO2 Age + 15% Activity Age
    const fitnessAge = vo2Age * 0.85 + activityAge * 0.15;

    return Math.round(fitnessAge);
  }

  /**
   * Calculate average weekly workouts over specified weeks
   */
  static getAverageWeeklyWorkouts(workouts: LocalWorkout[], weeks: number): number {
    const now = new Date();
    const startDate = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);

    // Filter workouts in the time range (exclude daily_steps)
    const recentWorkouts = workouts.filter((w) => {
      const workoutDate = new Date(w.startTime);
      return (
        workoutDate >= startDate &&
        workoutDate <= now &&
        w.source !== 'daily_steps'
      );
    });

    return recentWorkouts.length / weeks;
  }

  /**
   * Calculate RUNSTR Fitness Age
   * A more encouraging, activity-focused fitness age that rewards:
   * - Consistency (showing up regularly)
   * - Volume (total weekly activity)
   * - Variety (different workout types)
   * - Cardio capacity (any running/cardio effort)
   *
   * Philosophy: Most people who exercise regularly are healthier than average.
   * This calculation rewards the act of consistent movement rather than
   * comparing against elite athletic standards.
   */
  static calculateRunstrFitnessAge(
    chronologicalAge: number,
    workouts: LocalWorkout[]
  ): RunstrFitnessAgeResult {
    // Start with chronological age
    let fitnessAge = chronologicalAge;

    // Get recent workouts (last 4 weeks, excluding daily step accumulations)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentWorkouts = workouts.filter((w) => {
      const workoutDate = new Date(w.startTime);
      return workoutDate >= fourWeeksAgo && w.source !== 'daily_steps';
    });

    // === CONSISTENCY BONUS (up to -5 years) ===
    // Based on average workouts per week over last 4 weeks
    const avgWeeklyWorkouts = recentWorkouts.length / 4;
    let consistencyBonus = 0;

    if (avgWeeklyWorkouts >= 6) {
      consistencyBonus = -5; // Elite consistency
    } else if (avgWeeklyWorkouts >= 5) {
      consistencyBonus = -4;
    } else if (avgWeeklyWorkouts >= 4) {
      consistencyBonus = -3;
    } else if (avgWeeklyWorkouts >= 3) {
      consistencyBonus = -2;
    } else if (avgWeeklyWorkouts >= 2) {
      consistencyBonus = -1;
    } else if (avgWeeklyWorkouts >= 1) {
      consistencyBonus = 0; // At least showing up
    }

    // === VOLUME BONUS (up to -5 years) ===
    // Based on weekly distance (running/walking/cycling) or time (other activities)
    const totalDistanceKm = recentWorkouts.reduce((sum, w) => {
      if (w.distance && (w.type === 'running' || w.type === 'walking' || w.type === 'cycling' || w.type === 'hiking')) {
        return sum + w.distance / 1000;
      }
      return sum;
    }, 0);
    const weeklyDistanceKm = totalDistanceKm / 4;

    const totalActiveMinutes = recentWorkouts.reduce((sum, w) => {
      return sum + (w.duration || 0) / 60;
    }, 0);
    const weeklyActiveMinutes = totalActiveMinutes / 4;

    let volumeBonus = 0;
    // Distance-based (for cardio activities)
    if (weeklyDistanceKm >= 40) {
      volumeBonus = Math.min(volumeBonus, -5); // 40+ km/week
    } else if (weeklyDistanceKm >= 30) {
      volumeBonus = Math.min(volumeBonus, -4);
    } else if (weeklyDistanceKm >= 20) {
      volumeBonus = Math.min(volumeBonus, -3);
    } else if (weeklyDistanceKm >= 10) {
      volumeBonus = Math.min(volumeBonus, -2);
    } else if (weeklyDistanceKm >= 5) {
      volumeBonus = Math.min(volumeBonus, -1);
    }

    // Time-based fallback (for strength, meditation, etc.)
    if (volumeBonus === 0 && weeklyActiveMinutes > 0) {
      if (weeklyActiveMinutes >= 300) {
        volumeBonus = -4; // 5+ hours/week
      } else if (weeklyActiveMinutes >= 200) {
        volumeBonus = -3;
      } else if (weeklyActiveMinutes >= 150) {
        volumeBonus = -2; // WHO recommendation
      } else if (weeklyActiveMinutes >= 75) {
        volumeBonus = -1;
      }
    }

    // === VARIETY BONUS (up to -3 years) ===
    // Reward diverse training (cardio + strength + flexibility)
    const activityTypes = new Set(recentWorkouts.map(w => w.type));
    let varietyBonus = 0;

    const hasCardio = activityTypes.has('running') || activityTypes.has('walking') ||
                      activityTypes.has('cycling') || activityTypes.has('hiking');
    const hasStrength = activityTypes.has('strength');
    const hasMindfulness = activityTypes.has('meditation') || activityTypes.has('yoga');

    if (hasCardio && hasStrength && hasMindfulness) {
      varietyBonus = -3; // Complete athlete
    } else if ((hasCardio && hasStrength) || (hasCardio && hasMindfulness) || (hasStrength && hasMindfulness)) {
      varietyBonus = -2; // Balanced training
    } else if (activityTypes.size >= 2) {
      varietyBonus = -1; // Some variety
    }

    // === CARDIO PERFORMANCE BONUS (up to -5 years) ===
    // Based on actual cardio capacity - but more generous than VO2 Max calculation
    // Completing any timed cardio is an achievement!
    const cardioWorkouts = recentWorkouts.filter(w =>
      (w.type === 'running' || w.type === 'walking' || w.type === 'cycling') &&
      w.distance && w.distance > 0 && w.duration > 0
    );

    let cardioBonus = 0;

    if (cardioWorkouts.length > 0) {
      // Find best 5K effort (if any)
      const fiveKWorkouts = cardioWorkouts.filter(w =>
        w.distance && w.distance >= 4800 && w.distance <= 5200
      );

      if (fiveKWorkouts.length > 0) {
        const fastest5K = fiveKWorkouts.reduce((best, w) => {
          const pace = w.duration / (w.distance! / 1000);
          const bestPace = best.duration / (best.distance! / 1000);
          return pace < bestPace ? w : best;
        });

        const time5KMinutes = fastest5K.duration / 60;

        // More generous 5K time brackets
        if (time5KMinutes <= 20) {
          cardioBonus = -5; // Elite
        } else if (time5KMinutes <= 25) {
          cardioBonus = -4; // Very fast
        } else if (time5KMinutes <= 30) {
          cardioBonus = -3; // Fast
        } else if (time5KMinutes <= 35) {
          cardioBonus = -2; // Good - this includes 31:25!
        } else if (time5KMinutes <= 40) {
          cardioBonus = -1; // Completed a 5K - that's an achievement!
        } else {
          cardioBonus = -1; // Any 5K completion gets credit
        }
      } else {
        // No 5K, but has cardio workouts - give credit for effort
        const avgPaceMinPerKm = cardioWorkouts.reduce((sum, w) => {
          return sum + (w.duration / 60) / (w.distance! / 1000);
        }, 0) / cardioWorkouts.length;

        // Generous pace-based bonus
        if (avgPaceMinPerKm <= 5) {
          cardioBonus = -3; // Fast runner
        } else if (avgPaceMinPerKm <= 6) {
          cardioBonus = -2; // Good pace
        } else if (avgPaceMinPerKm <= 8) {
          cardioBonus = -1; // Active
        } else {
          cardioBonus = -1; // Any cardio is good cardio!
        }
      }
    }

    // === INACTIVITY PENALTY (up to +5 years) ===
    // Only applies if truly sedentary (no workouts in 4 weeks)
    let inactivityPenalty = 0;

    if (recentWorkouts.length === 0) {
      // Check longer history
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

      const olderWorkouts = workouts.filter((w) => {
        const workoutDate = new Date(w.startTime);
        return workoutDate >= threeMonthsAgo && w.source !== 'daily_steps';
      });

      if (olderWorkouts.length === 0) {
        inactivityPenalty = 5; // No activity in 3 months
      } else if (olderWorkouts.length < 5) {
        inactivityPenalty = 3; // Very low activity
      } else {
        inactivityPenalty = 1; // Recently inactive
      }
    }

    // === CALCULATE FINAL FITNESS AGE ===
    fitnessAge = chronologicalAge +
                 consistencyBonus +
                 volumeBonus +
                 varietyBonus +
                 cardioBonus +
                 inactivityPenalty;

    // Cap at reasonable bounds (can't be younger than 18 or older than age + 10)
    fitnessAge = Math.max(18, Math.min(chronologicalAge + 10, fitnessAge));
    fitnessAge = Math.round(fitnessAge);

    // Generate summary and encouragement
    const totalBonus = consistencyBonus + volumeBonus + varietyBonus + cardioBonus + inactivityPenalty;
    let summary = '';
    let encouragement = '';

    if (totalBonus <= -10) {
      summary = 'Elite fitness level';
      encouragement = 'Your dedication is exceptional. Keep inspiring others!';
    } else if (totalBonus <= -6) {
      summary = 'Excellent fitness level';
      encouragement = 'You\'re in great shape. Your consistency is paying off!';
    } else if (totalBonus <= -3) {
      summary = 'Good fitness level';
      encouragement = 'You\'re doing great! Every workout counts.';
    } else if (totalBonus < 0) {
      summary = 'Above average fitness';
      encouragement = 'You\'re ahead of most people. Keep it up!';
    } else if (totalBonus === 0) {
      summary = 'Average fitness level';
      encouragement = 'You\'re on the right track. Small improvements add up!';
    } else {
      summary = 'Room to grow';
      encouragement = 'Every journey starts somewhere. Your next workout awaits!';
    }

    return {
      fitnessAge,
      chronologicalAge,
      breakdown: {
        consistencyBonus,
        volumeBonus,
        varietyBonus,
        cardioBonus,
        inactivityPenalty,
      },
      summary,
      encouragement,
    };
  }

  /**
   * Categorize VO2 Max level based on ACSM standards
   */
  private static categorizeVO2Max(
    vo2Max: number,
    age: number,
    sex?: 'male' | 'female'
  ): VO2MaxResult['category'] {
    if (sex === 'female') {
      if (age < 30) {
        if (vo2Max >= 45) return 'superior';
        if (vo2Max >= 39) return 'excellent';
        if (vo2Max >= 33) return 'good';
        if (vo2Max >= 28) return 'fair';
        return 'poor';
      } else if (age < 50) {
        if (vo2Max >= 42) return 'superior';
        if (vo2Max >= 36) return 'excellent';
        if (vo2Max >= 30) return 'good';
        if (vo2Max >= 25) return 'fair';
        return 'poor';
      } else {
        if (vo2Max >= 38) return 'superior';
        if (vo2Max >= 32) return 'excellent';
        if (vo2Max >= 26) return 'good';
        if (vo2Max >= 22) return 'fair';
        return 'poor';
      }
    } else {
      // Male
      if (age < 30) {
        if (vo2Max >= 52) return 'superior';
        if (vo2Max >= 46) return 'excellent';
        if (vo2Max >= 40) return 'good';
        if (vo2Max >= 35) return 'fair';
        return 'poor';
      } else if (age < 50) {
        if (vo2Max >= 48) return 'superior';
        if (vo2Max >= 42) return 'excellent';
        if (vo2Max >= 36) return 'good';
        if (vo2Max >= 31) return 'fair';
        return 'poor';
      } else {
        if (vo2Max >= 44) return 'superior';
        if (vo2Max >= 38) return 'excellent';
        if (vo2Max >= 32) return 'good';
        if (vo2Max >= 27) return 'fair';
        return 'poor';
      }
    }
  }

  /**
   * Get fastest workout from a list (by pace)
   */
  private static getFastestWorkout(workouts: LocalWorkout[]): LocalWorkout {
    return workouts.reduce((fastest, current) => {
      const currentPace = current.duration / (current.distance! / 1000);
      const fastestPace = fastest.duration / (fastest.distance! / 1000);
      return currentPace < fastestPace ? current : fastest;
    });
  }

  /**
   * Format duration in seconds to MM:SS or HH:MM:SS
   */
  private static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Legacy method for backwards compatibility - now deprecated
  /** @deprecated Use calculateFitnessAge with workouts parameter instead */
  static calculateBMIAge(bmi: number, chronologicalAge: number): number {
    console.warn('calculateBMIAge is deprecated - BMI is no longer used in fitness age calculation');
    return chronologicalAge;
  }
}
