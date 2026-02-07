/**
 * ActivityMetricsService - Real-time metric calculations
 * Handles pace, speed, steps, and other activity metrics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STRIDE_LENGTH_KEY = '@runstr:stride_length';
const UNIT_PREFERENCE_KEY = '@runstr:unit_preference';

export type UnitSystem = 'metric' | 'imperial';

export interface ActivityMetrics {
  distance: number; // meters
  duration: number; // seconds
  pace?: number; // seconds per km or mile
  speed?: number; // km/h or mph
  steps?: number;
  calories?: number;
  elevationGain?: number; // meters
  averageSpeed?: number; // km/h or mph
  effortScore?: number; // 0-100 intensity score
}

export interface FormattedMetrics {
  distance: string;
  duration: string;
  pace?: string;
  speed?: string;
  steps?: string;
  calories?: string;
  elevation?: string;
}

class ActivityMetricsService {
  private static instance: ActivityMetricsService;
  private strideLength: number = 0.73; // meters (default)
  private unitSystem: UnitSystem = 'metric';

  private constructor() {
    this.loadPreferences();
  }

  static getInstance(): ActivityMetricsService {
    if (!ActivityMetricsService.instance) {
      ActivityMetricsService.instance = new ActivityMetricsService();
    }
    return ActivityMetricsService.instance;
  }

  /**
   * Load user preferences
   */
  private async loadPreferences() {
    try {
      const [strideLength, unitSystem] = await Promise.all([
        AsyncStorage.getItem(STRIDE_LENGTH_KEY),
        AsyncStorage.getItem(UNIT_PREFERENCE_KEY),
      ]);

      if (strideLength) {
        this.strideLength = parseFloat(strideLength);
      }
      if (unitSystem) {
        this.unitSystem = unitSystem as UnitSystem;
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }

  /**
   * Set stride length for step calculations
   */
  async setStrideLength(meters: number) {
    this.strideLength = meters;
    await AsyncStorage.setItem(STRIDE_LENGTH_KEY, meters.toString());
  }

  /**
   * Set unit system preference
   */
  async setUnitSystem(system: UnitSystem) {
    this.unitSystem = system;
    await AsyncStorage.setItem(UNIT_PREFERENCE_KEY, system);
  }

  /**
   * Calculate pace (time per distance)
   */
  calculatePace(
    distanceMeters: number,
    durationSeconds: number
  ): number | undefined {
    if (distanceMeters <= 0 || durationSeconds <= 0) {
      return undefined;
    }

    const distanceKm = distanceMeters / 1000;
    const distanceUnits =
      this.unitSystem === 'imperial'
        ? distanceKm * 0.621371 // Convert to miles
        : distanceKm;

    if (distanceUnits <= 0) {
      return undefined;
    }

    return durationSeconds / distanceUnits; // seconds per km or mile
  }

  /**
   * Calculate speed (distance per time)
   */
  calculateSpeed(distanceMeters: number, durationSeconds: number): number {
    if (durationSeconds <= 0) {
      return 0;
    }

    const hours = durationSeconds / 3600;
    const distanceKm = distanceMeters / 1000;
    const speed = distanceKm / hours;

    return this.unitSystem === 'imperial'
      ? speed * 0.621371 // Convert to mph
      : speed; // km/h
  }

  /**
   * Estimate steps from distance
   */
  estimateSteps(distanceMeters: number): number {
    return Math.round(distanceMeters / this.strideLength);
  }

  /**
   * Estimate distance from step count
   * @param steps Number of steps
   * @returns Estimated distance in meters
   */
  estimateDistanceFromSteps(steps: number): number {
    return steps * this.strideLength;
  }

  /**
   * Calculate total daily distance combining GPS workouts with step estimates
   * GPS distance is used for tracked workouts, step estimates for remaining activity
   *
   * Formula:
   * Total Distance = GPS Workout Distance + Non-Workout Step Distance
   *
   * Where:
   * - GPS Workout Distance = sum of all GPS workouts completed today
   * - GPS Step Equivalent = GPS Distance ÷ stride length
   * - Non-Workout Steps = Total Daily Steps - GPS Step Equivalent
   * - Non-Workout Step Distance = Non-Workout Steps × stride length
   *
   * @param totalSteps Total steps from HealthKit/Health Connect today
   * @param gpsWorkoutDistanceMeters Sum of GPS-tracked workout distances today (in meters)
   * @returns Combined distance in meters
   */
  calculateCombinedDailyDistance(
    totalSteps: number,
    gpsWorkoutDistanceMeters: number
  ): number {
    // If no GPS workouts, return pure step estimate
    if (gpsWorkoutDistanceMeters <= 0) {
      return this.estimateDistanceFromSteps(totalSteps);
    }

    // Estimate how many steps the GPS distance represents
    const gpsStepEquivalent = this.estimateSteps(gpsWorkoutDistanceMeters);

    // Calculate non-workout steps (steps outside of GPS workouts)
    // Clamp to 0 to handle cases where GPS steps > total steps
    const nonWorkoutSteps = Math.max(0, totalSteps - gpsStepEquivalent);

    // Non-workout distance from step estimate
    const nonWorkoutDistance = this.estimateDistanceFromSteps(nonWorkoutSteps);

    // Total = actual GPS distance + estimated non-workout distance
    return gpsWorkoutDistanceMeters + nonWorkoutDistance;
  }

  /**
   * Estimate calories burned
   */
  estimateCalories(
    activityType: 'running' | 'walking' | 'cycling',
    distanceMeters: number,
    durationSeconds: number,
    weightKg: number = 70 // Default weight
  ): number {
    const hours = durationSeconds / 3600;
    const km = distanceMeters / 1000;
    const speedKmh = km / hours;

    let met: number; // Metabolic Equivalent of Task

    switch (activityType) {
      case 'running':
        // MET values based on speed
        if (speedKmh < 8) met = 8;
        else if (speedKmh < 10) met = 10;
        else if (speedKmh < 12) met = 11.5;
        else if (speedKmh < 14) met = 13;
        else met = 15;
        break;
      case 'walking':
        if (speedKmh < 3.2) met = 2.5;
        else if (speedKmh < 4.8) met = 3.5;
        else if (speedKmh < 6.4) met = 5;
        else met = 7;
        break;
      case 'cycling':
        if (speedKmh < 16) met = 4;
        else if (speedKmh < 20) met = 6;
        else if (speedKmh < 24) met = 8;
        else if (speedKmh < 28) met = 10;
        else met = 12;
        break;
      default:
        met = 4;
    }

    // Calories = MET * weight(kg) * time(hours)
    return Math.round(met * weightKg * hours);
  }

  /**
   * Format duration to display string
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format pace to display string
   * Input: seconds per km (canonical unit)
   * Output: formatted string with appropriate unit conversion
   */
  formatPace(secondsPerKm: number | undefined): string {
    if (!secondsPerKm || secondsPerKm <= 0 || !isFinite(secondsPerKm)) {
      return '--:--';
    }

    // Convert from seconds/km to seconds/mi for imperial users
    const paceSeconds =
      this.unitSystem === 'imperial' ? secondsPerKm * 1.60934 : secondsPerKm;
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);

    const unit = this.unitSystem === 'imperial' ? '/mi' : '/km';
    return `${minutes}:${seconds.toString().padStart(2, '0')}${unit}`;
  }

  /**
   * Format speed to display string
   * Input: km/h (canonical unit)
   * Output: formatted string with appropriate unit conversion
   */
  formatSpeed(speedKmH: number): string {
    if (speedKmH <= 0 || !isFinite(speedKmH)) {
      return '0.0';
    }

    // Convert from km/h to mph for imperial users
    const speed =
      this.unitSystem === 'imperial' ? speedKmH * 0.621371 : speedKmH;
    const unit = this.unitSystem === 'imperial' ? 'mph' : 'km/h';
    return `${speed.toFixed(1)} ${unit}`;
  }

  /**
   * Format distance to display string
   */
  formatDistance(meters: number): string {
    if (this.unitSystem === 'imperial') {
      const miles = meters * 0.000621371;
      return `${miles.toFixed(2)} mi`;
    } else {
      const km = meters / 1000;
      return `${km.toFixed(2)} km`;
    }
  }

  /**
   * Format elevation to display string
   */
  formatElevation(meters: number): string {
    if (this.unitSystem === 'imperial') {
      const feet = meters * 3.28084;
      return `${Math.round(feet)} ft`;
    } else {
      return `${Math.round(meters)} m`;
    }
  }

  /**
   * Format steps to display string
   */
  formatSteps(steps: number): string {
    if (steps >= 10000) {
      return `${(steps / 1000).toFixed(1)}k`;
    }
    return steps.toLocaleString();
  }

  /**
   * Get formatted metrics for display
   */
  getFormattedMetrics(
    metrics: ActivityMetrics,
    activityType: 'running' | 'walking' | 'cycling'
  ): FormattedMetrics {
    const formatted: FormattedMetrics = {
      distance: this.formatDistance(metrics.distance),
      duration: this.formatDuration(metrics.duration),
    };

    if (activityType === 'running') {
      formatted.pace = this.formatPace(metrics.pace);
    } else if (activityType === 'walking') {
      formatted.steps = this.formatSteps(metrics.steps || 0);
    } else if (activityType === 'cycling') {
      formatted.speed = this.formatSpeed(metrics.speed || 0);
    }

    if (metrics.calories) {
      formatted.calories = `${metrics.calories} cal`;
    }

    // Always set elevation with fallback to 0
    formatted.elevation =
      metrics.elevationGain !== undefined
        ? this.formatElevation(metrics.elevationGain)
        : '0 m';

    return formatted;
  }

  /**
   * Convert meters to user's preferred unit
   */
  convertDistance(meters: number): { value: number; unit: string } {
    if (this.unitSystem === 'imperial') {
      return {
        value: meters * 0.000621371,
        unit: 'mi',
      };
    }
    return {
      value: meters / 1000,
      unit: 'km',
    };
  }

  /**
   * Calculate effort score (0-100) based on workout intensity
   * Factors: distance, pace variation, elevation, duration
   */
  calculateEffortScore(
    activityType: 'running' | 'walking' | 'cycling',
    distanceMeters: number,
    durationSeconds: number,
    elevationGainMeters: number = 0,
    pace?: number
  ): number {
    if (distanceMeters <= 0 || durationSeconds <= 0) {
      return 0;
    }

    const distanceKm = distanceMeters / 1000;
    const durationMinutes = durationSeconds / 60;
    const speedKmh = (distanceKm / durationMinutes) * 60;

    // Base score from distance and time (0-40 points)
    let baseScore = Math.min(40, distanceKm * 5 + durationMinutes * 0.5);

    // Intensity score from speed (0-30 points)
    let intensityScore = 0;
    switch (activityType) {
      case 'running':
        // Running: 6 km/h = 0 points, 20 km/h = 30 points
        intensityScore = Math.min(30, Math.max(0, (speedKmh - 6) * 2));
        break;
      case 'walking':
        // Walking: 3 km/h = 0 points, 8 km/h = 30 points
        intensityScore = Math.min(30, Math.max(0, (speedKmh - 3) * 6));
        break;
      case 'cycling':
        // Cycling: 10 km/h = 0 points, 40 km/h = 30 points
        intensityScore = Math.min(30, Math.max(0, (speedKmh - 10) * 1));
        break;
    }

    // Elevation score (0-30 points)
    // 100m elevation = 10 points, 300m+ = 30 points
    const elevationScore = Math.min(30, (elevationGainMeters / 100) * 10);

    // Total effort score (0-100)
    const totalScore = Math.round(baseScore + intensityScore + elevationScore);

    return Math.min(100, Math.max(0, totalScore));
  }

  /**
   * Get effort level label for display
   */
  getEffortLevel(effortScore: number): {
    label: string;
    color: string;
    emoji: string;
  } {
    if (effortScore >= 80) {
      return { label: 'Extreme', color: '#FF3B30', emoji: '🔥' };
    } else if (effortScore >= 60) {
      return { label: 'Hard', color: '#FF9500', emoji: '💪' };
    } else if (effortScore >= 40) {
      return { label: 'Moderate', color: '#FFCC00', emoji: '⚡' };
    } else if (effortScore >= 20) {
      return { label: 'Light', color: '#34C759', emoji: '✨' };
    } else {
      return { label: 'Easy', color: '#5AC8FA', emoji: '🌟' };
    }
  }
}

export const activityMetricsService = ActivityMetricsService.getInstance();
