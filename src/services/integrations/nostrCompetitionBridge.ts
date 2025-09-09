/**
 * Nostr Competition Bridge
 * Converts Nostr workout data (kind 1301) to competition-compatible format
 * Handles batch processing, eligibility validation, and leaderboard updates
 */

import { supabase } from '../supabase';
import competitionContextService, {
  Competition,
} from './competitionContextService';
import competitionLeaderboardManager from '../competitions/competitionLeaderboardManager';
import type {
  NostrWorkoutCompetition,
  NostrWorkoutMetrics,
} from '../../types/nostrWorkout';
import type { WorkoutData, WorkoutType } from '../../types/workout';

export interface NostrCompetitionResult {
  success: boolean;
  processedWorkouts: number;
  competitionsUpdated: number;
  leaderboardUpdates: number;
  errors: string[];
  processingTimeMs: number;
}

export interface WorkoutConversionResult {
  success: boolean;
  workoutData?: WorkoutData;
  error?: string;
  competitionsFound: number;
}

export class NostrCompetitionBridge {
  private static instance: NostrCompetitionBridge;

  private constructor() {}

  static getInstance(): NostrCompetitionBridge {
    if (!NostrCompetitionBridge.instance) {
      NostrCompetitionBridge.instance = new NostrCompetitionBridge();
    }
    return NostrCompetitionBridge.instance;
  }

  /**
   * Process single Nostr workout for competitions
   * Main entry point for real-time workout processing
   */
  async processNostrWorkoutForCompetitions(
    nostrWorkout: NostrWorkoutCompetition,
    userId: string,
    teamId?: string
  ): Promise<NostrCompetitionResult> {
    const startTime = Date.now();
    console.log(`Processing Nostr workout ${nostrWorkout.id} for competitions`);

    try {
      // Convert Nostr workout to standard format
      const conversion = await this.convertNostrWorkout(
        nostrWorkout,
        userId,
        teamId
      );

      if (!conversion.success || !conversion.workoutData) {
        return {
          success: false,
          processedWorkouts: 0,
          competitionsUpdated: 0,
          leaderboardUpdates: 0,
          errors: [conversion.error || 'Workout conversion failed'],
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Find applicable competitions
      const competitions =
        await competitionContextService.getApplicableCompetitions(
          conversion.workoutData,
          userId
        );

      if (competitions.length === 0) {
        console.log(
          `No applicable competitions found for workout ${nostrWorkout.id}`
        );
        return {
          success: true,
          processedWorkouts: 1,
          competitionsUpdated: 0,
          leaderboardUpdates: 0,
          errors: [],
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Update competition leaderboards
      const leaderboardUpdates = await this.updateCompetitionLeaderboards(
        conversion.workoutData,
        competitions
      );

      console.log(
        `Processed Nostr workout for ${competitions.length} competitions, ${leaderboardUpdates} leaderboard updates`
      );

      return {
        success: true,
        processedWorkouts: 1,
        competitionsUpdated: competitions.length,
        leaderboardUpdates,
        errors: [],
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Error processing Nostr workout for competitions:', error);
      return {
        success: false,
        processedWorkouts: 0,
        competitionsUpdated: 0,
        leaderboardUpdates: 0,
        errors: [
          error instanceof Error ? error.message : 'Unknown processing error',
        ],
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Process batch of Nostr workouts for competitions
   * Used during initial sync and bulk operations
   */
  async processBatchNostrWorkouts(
    nostrWorkouts: NostrWorkoutCompetition[],
    userId: string,
    teamId?: string
  ): Promise<NostrCompetitionResult> {
    const startTime = Date.now();
    console.log(
      `Processing batch of ${nostrWorkouts.length} Nostr workouts for competitions`
    );

    let processedWorkouts = 0;
    let competitionsUpdated = 0;
    let leaderboardUpdates = 0;
    const errors: string[] = [];

    try {
      // Process workouts in batches to avoid overwhelming the system
      const batchSize = 10;

      for (let i = 0; i < nostrWorkouts.length; i += batchSize) {
        const batch = nostrWorkouts.slice(i, i + batchSize);

        // Process batch in parallel
        const batchPromises = batch.map(async (workout) => {
          try {
            const result = await this.processNostrWorkoutForCompetitions(
              workout,
              userId,
              teamId
            );
            return result;
          } catch (error) {
            console.error(`Error processing workout ${workout.id}:`, error);
            return {
              success: false,
              processedWorkouts: 0,
              competitionsUpdated: 0,
              leaderboardUpdates: 0,
              errors: [
                error instanceof Error ? error.message : 'Processing error',
              ],
              processingTimeMs: 0,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);

        // Aggregate results
        batchResults.forEach((result) => {
          if (result.success) {
            processedWorkouts += result.processedWorkouts;
            competitionsUpdated += result.competitionsUpdated;
            leaderboardUpdates += result.leaderboardUpdates;
          }
          errors.push(...result.errors);
        });

        // Small delay between batches to prevent overwhelming the database
        if (i + batchSize < nostrWorkouts.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(
        `Batch processing complete: ${processedWorkouts} workouts, ${competitionsUpdated} competitions, ${leaderboardUpdates} updates in ${processingTime}ms`
      );

      return {
        success: processedWorkouts > 0,
        processedWorkouts,
        competitionsUpdated,
        leaderboardUpdates,
        errors: errors.filter((e) => e.length > 0),
        processingTimeMs: processingTime,
      };
    } catch (error) {
      console.error('Error in batch processing Nostr workouts:', error);
      return {
        success: false,
        processedWorkouts,
        competitionsUpdated,
        leaderboardUpdates,
        errors: [
          ...errors,
          error instanceof Error ? error.message : 'Batch processing error',
        ],
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Convert Nostr workout to standard WorkoutData format
   * Handles all the mapping and validation logic
   */
  async convertNostrWorkout(
    nostrWorkout: NostrWorkoutCompetition,
    userId: string,
    teamId?: string
  ): Promise<WorkoutConversionResult> {
    try {
      // Validate required fields
      if (!nostrWorkout.startTime || !nostrWorkout.endTime) {
        return {
          success: false,
          error: 'Missing required time fields in Nostr workout',
          competitionsFound: 0,
        };
      }

      // Map workout type
      const workoutType = this.mapNostrWorkoutType(nostrWorkout.type);

      // Calculate duration if not provided
      const duration =
        nostrWorkout.duration ||
        Math.floor(
          (new Date(nostrWorkout.endTime).getTime() -
            new Date(nostrWorkout.startTime).getTime()) /
            1000
        );

      // Convert distance from kilometers to meters if needed
      const distance = nostrWorkout.distance
        ? nostrWorkout.unit === 'km'
          ? nostrWorkout.distance * 1000
          : nostrWorkout.distance
        : undefined;

      // Calculate calories if not provided (basic estimation)
      const calories =
        nostrWorkout.calories ||
        this.estimateCalories(workoutType, duration, distance);

      // Create WorkoutData object
      const workoutData: WorkoutData = {
        id: `nostr_${nostrWorkout.id}`,
        userId,
        teamId,
        type: workoutType,
        source: 'nostr',
        distance,
        duration,
        calories,
        startTime: nostrWorkout.startTime,
        endTime: nostrWorkout.endTime,
        syncedAt: new Date().toISOString(),
        metadata: {
          nostrId: nostrWorkout.id,
          pubkey: nostrWorkout.pubkey,
          rawEvent: nostrWorkout.rawEvent,
          heartRate: nostrWorkout.metrics?.heartRate,
          pace: nostrWorkout.metrics?.pace,
          elevation: nostrWorkout.metrics?.elevation,
        },
      };

      // Get competition count for result
      const competitions =
        await competitionContextService.getApplicableCompetitions(
          workoutData,
          userId
        );

      return {
        success: true,
        workoutData,
        competitionsFound: competitions.length,
      };
    } catch (error) {
      console.error('Error converting Nostr workout:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conversion error',
        competitionsFound: 0,
      };
    }
  }

  /**
   * Update competition leaderboards with workout data
   */
  private async updateCompetitionLeaderboards(
    workoutData: WorkoutData,
    competitions: Competition[]
  ): Promise<number> {
    let updatesCompleted = 0;

    try {
      // Process each competition
      for (const competition of competitions) {
        try {
          console.log(
            `Updating ${competition.type} leaderboard for competition: ${competition.name}`
          );

          const updateResult =
            await competitionLeaderboardManager.updateCompetitionLeaderboards(
              workoutData,
              0 // score will be calculated by the leaderboard manager
            );

          if (updateResult.success) {
            updatesCompleted++;
            console.log(
              `✅ Updated ${competition.type} ${competition.id} leaderboard`
            );
          } else {
            console.error(
              `❌ Failed to update ${competition.type} ${competition.id}: ${updateResult.error}`
            );
          }
        } catch (error) {
          console.error(
            `Error updating competition ${competition.id} leaderboard:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('Error updating competition leaderboards:', error);
    }

    return updatesCompleted;
  }

  /**
   * Map Nostr workout type to standard workout type
   */
  private mapNostrWorkoutType(nostrType: string): WorkoutType {
    const typeMapping: Record<string, WorkoutType> = {
      running: 'running',
      run: 'running',
      cycling: 'cycling',
      bike: 'cycling',
      walking: 'walking',
      walk: 'walking',
      hiking: 'hiking',
      hike: 'hiking',
      gym: 'gym',
      weight_training: 'strength_training',
      strength: 'strength_training',
      yoga: 'yoga',
    };

    return typeMapping[nostrType.toLowerCase()] || 'other';
  }

  /**
   * Basic calorie estimation for missing data
   */
  private estimateCalories(
    type: WorkoutType,
    duration: number,
    distance?: number
  ): number {
    // Basic MET (Metabolic Equivalent) values
    const metValues: Record<WorkoutType, number> = {
      running: 8.0,
      cycling: 6.0,
      walking: 3.5,
      hiking: 6.0,
      strength_training: 4.0,
      yoga: 3.0,
      gym: 5.0,
      other: 4.0,
    };

    // Assume 70kg average weight for estimation
    const averageWeight = 70; // kg
    const met = metValues[type];
    const hours = duration / 3600;

    // Basic calorie calculation: METs × weight (kg) × time (hours)
    return Math.round(met * averageWeight * hours);
  }

  /**
   * Validate Nostr workout data quality
   */
  validateNostrWorkout(nostrWorkout: NostrWorkoutCompetition): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check required fields
    if (!nostrWorkout.startTime) issues.push('Missing start time');
    if (!nostrWorkout.endTime) issues.push('Missing end time');
    if (!nostrWorkout.type) issues.push('Missing workout type');

    // Check time validity
    if (nostrWorkout.startTime && nostrWorkout.endTime) {
      const start = new Date(nostrWorkout.startTime);
      const end = new Date(nostrWorkout.endTime);

      if (start >= end)
        issues.push('Invalid time range: start time must be before end time');
      if (start > new Date())
        issues.push('Invalid start time: workout cannot be in the future');
    }

    // Check duration consistency
    if (
      nostrWorkout.duration &&
      nostrWorkout.startTime &&
      nostrWorkout.endTime
    ) {
      const calculatedDuration = Math.floor(
        (new Date(nostrWorkout.endTime).getTime() -
          new Date(nostrWorkout.startTime).getTime()) /
          1000
      );
      const diff = Math.abs(calculatedDuration - nostrWorkout.duration);

      // Allow 5% variance in duration
      if (diff > calculatedDuration * 0.05) {
        issues.push('Duration inconsistent with time range');
      }
    }

    // Check distance reasonableness
    if (nostrWorkout.distance && nostrWorkout.distance > 100000) {
      issues.push('Distance seems unreasonably high (>100km)');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    totalProcessed: number;
    competitionUpdates: number;
    averageProcessingTime: number;
  }> {
    // In a real implementation, this could track statistics
    // For now, return placeholder data
    return {
      totalProcessed: 0,
      competitionUpdates: 0,
      averageProcessingTime: 0,
    };
  }

  /**
   * Test the bridge with sample data
   */
  async testConversion(
    sampleNostrWorkout: Partial<NostrWorkoutCompetition>
  ): Promise<WorkoutConversionResult> {
    const testWorkout: NostrWorkoutCompetition = {
      id: 'test_workout_123',
      pubkey: 'test_pubkey',
      type: 'running',
      startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      endTime: new Date().toISOString(),
      duration: 3600, // 1 hour
      distance: 10000, // 10km
      unit: 'meters',
      calories: 500,
      rawEvent: '{}',
      ...sampleNostrWorkout,
    };

    return await this.convertNostrWorkout(
      testWorkout,
      'test_user',
      'test_team'
    );
  }
}

export default NostrCompetitionBridge.getInstance();
