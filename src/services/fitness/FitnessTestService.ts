/**
 * FitnessTestService - RUNSTR Fitness Test management
 *
 * Handles test lifecycle, scoring, history, and Nostr publishing for the
 * standardized RUNSTR Fitness Test (pushups, situps, 5K run in 60 minutes).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import LocalWorkoutStorageService from './LocalWorkoutStorageService';
import type {
  FitnessTestResult,
  ActiveFitnessTest,
  FitnessTestComponent,
  FitnessTestGrade,
} from '../../types/fitnessTest';
import { FITNESS_TEST_GRADES } from '../../types/fitnessTest';

const STORAGE_KEYS = {
  ACTIVE_TEST: '@runstr:active_fitness_test',
  TEST_HISTORY: '@runstr:fitness_test_history',
};

// Test configuration
const TEST_CONFIG = {
  MAX_DURATION_SECONDS: 3600, // 60 minutes
  STRENGTH_DURATION_MIN: 105, // 2 minutes - 15 seconds tolerance
  STRENGTH_DURATION_MAX: 135, // 2 minutes + 15 seconds tolerance
  MIN_5K_DISTANCE_METERS: 5000, // 5 kilometers
};

export class FitnessTestService {
  private static instance: FitnessTestService;

  private constructor() {}

  static getInstance(): FitnessTestService {
    if (!FitnessTestService.instance) {
      FitnessTestService.instance = new FitnessTestService();
    }
    return FitnessTestService.instance;
  }

  /**
   * Start a new fitness test
   * Creates an active test record with start time
   */
  async startTest(): Promise<string> {
    try {
      // Check if there's already an active test
      const existingTest = await this.getActiveTest();
      if (existingTest) {
        console.warn('⚠️ Test already in progress, canceling previous test');
        await this.cancelTest();
      }

      const testId = `test_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      const activeTest: ActiveFitnessTest = {
        id: testId,
        startTime: Date.now(),
        status: 'active',
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.ACTIVE_TEST,
        JSON.stringify(activeTest)
      );

      console.log(`✅ Fitness test started: ${testId}`);
      return testId;
    } catch (error) {
      console.error('❌ Failed to start fitness test:', error);
      throw error;
    }
  }

  /**
   * Get currently active test (if any)
   */
  async getActiveTest(): Promise<ActiveFitnessTest | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TEST);
      if (!data) return null;

      const activeTest: ActiveFitnessTest = JSON.parse(data);

      // Check if test has exceeded max duration (60 minutes)
      const elapsed = Date.now() - activeTest.startTime;
      if (elapsed > TEST_CONFIG.MAX_DURATION_SECONDS * 1000) {
        console.warn('⚠️ Active test exceeded 60-minute limit');
        // Don't auto-cancel - let user finish manually
      }

      return activeTest;
    } catch (error) {
      console.error('❌ Failed to get active test:', error);
      return null;
    }
  }

  /**
   * Cancel active test without saving results
   */
  async cancelTest(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_TEST);
      console.log('✅ Fitness test canceled');
    } catch (error) {
      console.error('❌ Failed to cancel test:', error);
      throw error;
    }
  }

  /**
   * Finish active test and calculate results
   * Queries workout history for most recent qualifying workouts
   */
  async finishTest(): Promise<FitnessTestResult> {
    try {
      const activeTest = await this.getActiveTest();
      if (!activeTest) {
        throw new Error('No active test found');
      }

      const testDuration = Math.floor(
        (Date.now() - activeTest.startTime) / 1000
      );

      // Query local workout storage for qualifying workouts
      const workouts = await LocalWorkoutStorageService.getAllWorkouts();

      // Find most recent pushup workout (after test start)
      const pushupWorkout = workouts.find(
        (w) =>
          w.type === 'strength' &&
          w.exerciseType === 'pushups' &&
          w.duration >= TEST_CONFIG.STRENGTH_DURATION_MIN &&
          w.duration <= TEST_CONFIG.STRENGTH_DURATION_MAX &&
          new Date(w.startTime).getTime() >= activeTest.startTime
      );

      // Find most recent situp workout (after test start)
      const situpWorkout = workouts.find(
        (w) =>
          w.type === 'strength' &&
          w.exerciseType === 'situps' &&
          w.duration >= TEST_CONFIG.STRENGTH_DURATION_MIN &&
          w.duration <= TEST_CONFIG.STRENGTH_DURATION_MAX &&
          new Date(w.startTime).getTime() >= activeTest.startTime
      );

      // Find most recent 5K+ run (after test start)
      const runWorkout = workouts.find(
        (w) =>
          w.type === 'running' &&
          (w.distance ?? 0) >= TEST_CONFIG.MIN_5K_DISTANCE_METERS &&
          new Date(w.startTime).getTime() >= activeTest.startTime
      );

      // Calculate component scores
      const pushups: FitnessTestComponent | null = pushupWorkout
        ? {
            reps: pushupWorkout.reps ?? 0,
            score: this.calculatePushupScore(pushupWorkout.reps ?? 0),
            workoutId: pushupWorkout.id,
          }
        : null;

      const situps: FitnessTestComponent | null = situpWorkout
        ? {
            reps: situpWorkout.reps ?? 0,
            score: this.calculateSitupScore(situpWorkout.reps ?? 0),
            workoutId: situpWorkout.id,
          }
        : null;

      const run: FitnessTestComponent | null = runWorkout
        ? {
            timeSeconds: runWorkout.duration,
            score: this.calculateRunScore(runWorkout.duration),
            workoutId: runWorkout.id,
          }
        : null;

      // Calculate composite score
      const compositeScore =
        (pushups?.score ?? 0) + (situps?.score ?? 0) + (run?.score ?? 0);

      // Determine grade
      const grade = this.calculateGrade(compositeScore);

      // Create test result
      const result: FitnessTestResult = {
        id: activeTest.id,
        timestamp: Date.now(),
        testDuration,
        pushups,
        situps,
        run,
        compositeScore,
        grade: grade.name,
        publishedToNostr: false,
      };

      // Save to history
      await this.saveTestResult(result);

      // Save as local workout for unified history display
      await this.saveTestAsWorkout(result, activeTest.startTime);

      // Clear active test
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_TEST);

      console.log(
        `✅ Fitness test completed: ${compositeScore}/300 (${grade.name})`
      );
      return result;
    } catch (error) {
      console.error('❌ Failed to finish test:', error);
      throw error;
    }
  }

  /**
   * Calculate pushup score (1 rep = 1 point, max 100)
   */
  private calculatePushupScore(reps: number): number {
    return Math.min(reps, 100);
  }

  /**
   * Calculate situp score (1 rep = 1 point, max 100)
   */
  private calculateSitupScore(reps: number): number {
    return Math.min(reps, 100);
  }

  /**
   * Calculate 5K run score based on time (time-based thresholds)
   */
  private calculateRunScore(timeSeconds: number): number {
    const minutes = timeSeconds / 60;

    if (minutes < 20) {
      // Elite: < 20 min = 100 points
      return 100;
    } else if (minutes < 25) {
      // 20-25 min: 85-99 points (linear interpolation)
      return Math.round(99 - ((minutes - 20) / 5) * 14);
    } else if (minutes < 30) {
      // 25-30 min: 70-84 points
      return Math.round(84 - ((minutes - 25) / 5) * 14);
    } else if (minutes < 40) {
      // 30-40 min: 55-69 points
      return Math.round(69 - ((minutes - 30) / 10) * 14);
    } else if (minutes < 60) {
      // 40-60 min: 40-54 points
      return Math.round(54 - ((minutes - 40) / 20) * 14);
    } else {
      // > 60 min: 0-39 points
      return Math.max(0, 39 - Math.floor((minutes - 60) / 5));
    }
  }

  /**
   * Determine grade based on composite score
   */
  private calculateGrade(score: number): FitnessTestGrade {
    for (const grade of FITNESS_TEST_GRADES) {
      if (score >= grade.minScore && score <= grade.maxScore) {
        return grade;
      }
    }
    return FITNESS_TEST_GRADES[FITNESS_TEST_GRADES.length - 1]; // Default to Baseline
  }

  /**
   * Save test result to history
   */
  private async saveTestResult(result: FitnessTestResult): Promise<void> {
    try {
      const history = await this.getTestHistory();
      history.unshift(result); // Add to beginning (newest first)

      await AsyncStorage.setItem(
        STORAGE_KEYS.TEST_HISTORY,
        JSON.stringify(history)
      );

      console.log(`✅ Test result saved to history: ${result.id}`);

    } catch (error) {
      console.error('❌ Failed to save test result:', error);
      throw error;
    }
  }

  /**
   * Save test result as local workout for unified history display
   */
  private async saveTestAsWorkout(
    result: FitnessTestResult,
    startTime: number
  ): Promise<void> {
    try {
      await LocalWorkoutStorageService.saveFitnessTestWorkout({
        testId: result.id,
        startTime: startTime,
        endTime: result.timestamp,
        duration: result.testDuration,
        score: result.compositeScore,
        grade: result.grade,
        pushups: result.pushups as { reps: number; score: number; } | null,
        situps: result.situps as { reps: number; score: number; } | null,
        run5k: result.run as { timeSeconds: number; score: number; } | null,
      });

      console.log(`✅ Test saved as workout in Local history: ${result.id}`);
    } catch (error) {
      console.error('❌ Failed to save test as workout:', error);
      // Don't throw - test history is already saved
    }
  }

  /**
   * Get all test history (sorted newest first)
   */
  async getTestHistory(): Promise<FitnessTestResult[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TEST_HISTORY);
      if (!data) return [];

      const history: FitnessTestResult[] = JSON.parse(data);
      return history;
    } catch (error) {
      console.error('❌ Failed to get test history:', error);
      return [];
    }
  }

  /**
   * Get a specific test result by ID
   */
  async getTestById(testId: string): Promise<FitnessTestResult | null> {
    try {
      const history = await this.getTestHistory();
      return history.find((t) => t.id === testId) ?? null;
    } catch (error) {
      console.error('❌ Failed to get test by ID:', error);
      return null;
    }
  }

  /**
   * Get personal best composite score
   */
  async getPersonalBest(): Promise<FitnessTestResult | null> {
    try {
      const history = await this.getTestHistory();
      if (history.length === 0) return null;

      return history.reduce((best, current) =>
        current.compositeScore > best.compositeScore ? current : best
      );
    } catch (error) {
      console.error('❌ Failed to get personal best:', error);
      return null;
    }
  }

  /**
   * Mark test as published to Nostr
   */
  async markAsPublished(
    testId: string,
    kind: 'kind1301' | 'kind1',
    eventId: string
  ): Promise<void> {
    try {
      const history = await this.getTestHistory();
      const test = history.find((t) => t.id === testId);

      if (!test) {
        console.warn(`⚠️ Test ${testId} not found in history`);
        return;
      }

      test.publishedToNostr = true;
      if (kind === 'kind1301') {
        test.kind1301EventId = eventId;
      } else {
        test.kind1EventId = eventId;
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.TEST_HISTORY,
        JSON.stringify(history)
      );

      console.log(`✅ Test ${testId} marked as published (${kind})`);
    } catch (error) {
      console.error('❌ Failed to mark test as published:', error);
      throw error;
    }
  }

  /**
   * Clear all test history (use with caution)
   */
  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TEST_HISTORY);
      console.log('✅ Test history cleared');
    } catch (error) {
      console.error('❌ Failed to clear test history:', error);
      throw error;
    }
  }
}

export default FitnessTestService.getInstance();
