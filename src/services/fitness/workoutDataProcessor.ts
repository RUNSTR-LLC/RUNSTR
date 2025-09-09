/**
 * Workout Data Processor
 * Normalizes and processes workout data from all sources
 * Calculates scores, leaderboard rankings, and team statistics
 */

import { supabase } from '../supabase';
import competitionLeaderboardManager from '../competitions/competitionLeaderboardManager';
import type {
  WorkoutData,
  WorkoutStats,
  LeaderboardEntry,
  WorkoutType,
} from '../../types';
import type { NostrWorkoutCompetition } from '../../types/nostrWorkout';

// Scoring weights for different workout types
const WORKOUT_SCORING = {
  running: { distanceWeight: 1.0, durationWeight: 0.3, calorieWeight: 0.1 },
  walking: { distanceWeight: 0.6, durationWeight: 0.2, calorieWeight: 0.1 },
  cycling: { distanceWeight: 0.8, durationWeight: 0.3, calorieWeight: 0.1 },
  hiking: { distanceWeight: 1.2, durationWeight: 0.4, calorieWeight: 0.1 },
  strength_training: {
    distanceWeight: 0.0,
    durationWeight: 0.8,
    calorieWeight: 0.3,
  },
  yoga: { distanceWeight: 0.0, durationWeight: 0.5, calorieWeight: 0.2 },
  other: { distanceWeight: 0.5, durationWeight: 0.3, calorieWeight: 0.2 },
} as const;

// Nostr-specific scoring bonuses
const NOSTR_BONUSES = {
  heartRateData: 20, // bonus for having heart rate data
  paceData: 15, // bonus for having pace data
  elevationData: 10, // bonus for having elevation data
  authenticatedSource: 25, // bonus for verified Nostr events
} as const;

// Performance thresholds for bonus points
const PERFORMANCE_BONUSES = {
  distance: {
    excellent: 10000, // 10km+
    good: 5000, // 5km+
    bonus: 50, // points
  },
  duration: {
    excellent: 3600, // 1 hour+
    good: 1800, // 30 min+
    bonus: 25, // points
  },
  consistency: {
    dailyStreak: 10, // points per day
    weeklyGoal: 100, // 7 workouts in a week
  },
} as const;

export class WorkoutDataProcessor {
  private static instance: WorkoutDataProcessor;

  private constructor() {}

  static getInstance(): WorkoutDataProcessor {
    if (!WorkoutDataProcessor.instance) {
      WorkoutDataProcessor.instance = new WorkoutDataProcessor();
    }
    return WorkoutDataProcessor.instance;
  }

  /**
   * Process Nostr workout data
   * Converts and scores Nostr workout with enhanced metadata support
   */
  async processNostrWorkout(
    nostrWorkout: NostrWorkoutCompetition,
    userId: string,
    teamId?: string
  ): Promise<{
    success: boolean;
    score?: number;
    workoutData?: WorkoutData;
    error?: string;
  }> {
    try {
      console.log(
        `Processing Nostr workout ${nostrWorkout.id} for user ${userId}`
      );

      // Convert Nostr workout to standard WorkoutData format
      const workoutData = this.convertNostrToWorkoutData(
        nostrWorkout,
        userId,
        teamId
      );

      // Calculate base score
      const baseScore = this.calculateBaseScore(workoutData);

      // Apply performance bonuses
      const bonusScore = await this.calculateBonusPoints(workoutData);

      // Apply Nostr-specific bonuses
      const nostrBonus = this.calculateNostrBonuses(nostrWorkout);

      // Calculate final score
      const totalScore = Math.round(baseScore + bonusScore + nostrBonus);

      // Store workout in database
      const { error: insertError } = await supabase.from('workouts').insert({
        id: workoutData.id,
        user_id: userId,
        team_id: teamId,
        type: workoutData.type,
        source: 'nostr',
        distance_meters: workoutData.distance,
        duration_seconds: workoutData.duration,
        calories: workoutData.calories,
        start_time: workoutData.startTime,
        end_time: workoutData.endTime,
        score: totalScore,
        synced_at: workoutData.syncedAt,
        processed_at: new Date().toISOString(),
        metadata: workoutData.metadata,
      });

      if (insertError) {
        // Handle duplicate workout (already processed)
        if (insertError.code === '23505') {
          console.log(
            `Nostr workout ${nostrWorkout.id} already processed, skipping`
          );
          return { success: true, score: 0, workoutData };
        }
        throw insertError;
      }

      // Update user's team statistics
      if (teamId) {
        await this.updateTeamStats(
          userId,
          teamId,
          totalScore,
          workoutData.distance || 0
        );
      }

      console.log(
        `Nostr workout processed: ${nostrWorkout.id} = ${totalScore} points`
      );
      return { success: true, score: totalScore, workoutData };
    } catch (error) {
      console.error('Error processing Nostr workout:', error);
      return {
        success: false,
        error: `Nostr processing failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Process and score a workout
   */
  async processWorkout(workout: WorkoutData): Promise<{
    success: boolean;
    score?: number;
    error?: string;
  }> {
    try {
      console.log(
        `Processing workout ${workout.id} for user ${workout.userId}`
      );

      // Calculate base score
      const baseScore = this.calculateBaseScore(workout);

      // Apply performance bonuses
      const bonusScore = await this.calculateBonusPoints(workout);

      // Calculate final score
      const totalScore = Math.round(baseScore + bonusScore);

      // Update workout with calculated score
      const { error: updateError } = await supabase
        .from('workouts')
        .update({
          score: totalScore,
          processed_at: new Date().toISOString(),
        })
        .eq('id', workout.id);

      if (updateError) throw updateError;

      // Update user's team statistics
      if (workout.teamId) {
        await this.updateTeamStats(
          workout.userId,
          workout.teamId,
          totalScore,
          workout.distance || 0
        );
      }

      // Update competition leaderboards
      if (workout.teamId) {
        await competitionLeaderboardManager.updateCompetitionLeaderboards(
          workout,
          totalScore
        );
      }

      console.log(`Workout processed: ${workout.id} = ${totalScore} points`);
      return { success: true, score: totalScore };
    } catch (error) {
      console.error('Error processing workout:', error);
      return {
        success: false,
        error: `Processing failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Calculate base score using workout metrics
   */
  private calculateBaseScore(workout: WorkoutData): number {
    const scoring =
      WORKOUT_SCORING[workout.type as keyof typeof WORKOUT_SCORING] ||
      WORKOUT_SCORING.other;

    // Distance score (meters -> points)
    const distanceScore =
      (workout.distance || 0) * scoring.distanceWeight * 0.01;

    // Duration score (seconds -> points)
    const durationScore =
      (workout.duration || 0) * scoring.durationWeight * 0.1;

    // Calorie score (calories -> points)
    const calorieScore = (workout.calories || 0) * scoring.calorieWeight;

    return distanceScore + durationScore + calorieScore;
  }

  /**
   * Calculate bonus points for exceptional performance
   */
  private async calculateBonusPoints(workout: WorkoutData): Promise<number> {
    let bonusPoints = 0;

    // Distance bonuses
    if (workout.distance) {
      if (workout.distance >= PERFORMANCE_BONUSES.distance.excellent) {
        bonusPoints += PERFORMANCE_BONUSES.distance.bonus * 2;
      } else if (workout.distance >= PERFORMANCE_BONUSES.distance.good) {
        bonusPoints += PERFORMANCE_BONUSES.distance.bonus;
      }
    }

    // Duration bonuses
    if (workout.duration) {
      if (workout.duration >= PERFORMANCE_BONUSES.duration.excellent) {
        bonusPoints += PERFORMANCE_BONUSES.duration.bonus * 2;
      } else if (workout.duration >= PERFORMANCE_BONUSES.duration.good) {
        bonusPoints += PERFORMANCE_BONUSES.duration.bonus;
      }
    }

    // Consistency bonuses
    const consistencyBonus = await this.calculateConsistencyBonus(
      workout.userId
    );
    bonusPoints += consistencyBonus;

    return bonusPoints;
  }

  /**
   * Calculate consistency bonus based on recent activity
   */
  private async calculateConsistencyBonus(userId: string): Promise<number> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get workouts from last 7 days
      const { data: recentWorkouts, error } = await supabase
        .from('workouts')
        .select('start_time')
        .eq('user_id', userId)
        .gte('start_time', sevenDaysAgo.toISOString())
        .order('start_time', { ascending: false });

      if (error || !recentWorkouts) return 0;

      // Count unique days with workouts
      const workoutDays = new Set(
        recentWorkouts.map((w) => new Date(w.start_time).toDateString())
      );

      const streakDays = workoutDays.size;

      if (streakDays >= 7) {
        return PERFORMANCE_BONUSES.consistency.weeklyGoal;
      }

      return streakDays * PERFORMANCE_BONUSES.consistency.dailyStreak;
    } catch (error) {
      console.error('Error calculating consistency bonus:', error);
      return 0;
    }
  }

  /**
   * Update team statistics after workout processing
   */
  private async updateTeamStats(
    userId: string,
    teamId: string,
    score: number,
    distance: number = 0
  ): Promise<void> {
    try {
      // Update or insert team member stats
      const { data: existing, error: fetchError } = await supabase
        .from('team_members')
        .select('total_workouts, total_distance_meters, total_score')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existing) {
        // Update existing member stats
        const { error: updateError } = await supabase
          .from('team_members')
          .update({
            total_workouts: existing.total_workouts + 1,
            total_distance_meters:
              (existing.total_distance_meters || 0) + distance,
            total_score: (existing.total_score || 0) + score,
            last_workout_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('team_id', teamId);

        if (updateError) throw updateError;
      } else {
        // Insert new member stats
        const { error: insertError } = await supabase
          .from('team_members')
          .insert({
            user_id: userId,
            team_id: teamId,
            total_workouts: 1,
            total_distance_meters: distance,
            total_score: score,
            joined_at: new Date().toISOString(),
            last_workout_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      console.log(`Updated team stats for user ${userId} in team ${teamId}`);
    } catch (error) {
      console.error('Error updating team stats:', error);
    }
  }

  /**
   * Generate team leaderboard
   */
  async generateTeamLeaderboard(
    teamId: string,
    limit: number = 50
  ): Promise<LeaderboardEntry[]> {
    try {
      const { data: members, error } = await supabase
        .from('team_members')
        .select(
          `
          user_id,
          total_workouts,
          total_distance_meters,
          total_score,
          users!inner(name, avatar)
        `
        )
        .eq('team_id', teamId)
        .order('total_score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return members.map((member, index) => ({
        userId: member.user_id,
        userName: (member.users as any).name,
        rank: index + 1,
        score: member.total_score || 0,
        avatar:
          (member.users as any).avatar ||
          (member.users as any).name.charAt(0).toUpperCase(),
        stats: {
          totalWorkouts: member.total_workouts,
          totalDistance: member.total_distance_meters,
        },
      }));
    } catch (error) {
      console.error('Error generating team leaderboard:', error);
      return [];
    }
  }

  /**
   * Get user workout statistics
   */
  async getUserWorkoutStats(
    userId: string,
    teamId?: string
  ): Promise<WorkoutStats | null> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get recent workouts
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', thirtyDaysAgo.toISOString())
        .order('start_time', { ascending: false });

      if (error) throw error;

      if (!workouts || workouts.length === 0) {
        return {
          totalWorkouts: 0,
          totalDistance: 0,
          totalDuration: 0,
          totalScore: 0,
          averageScore: 0,
          weeklyAverage: 0,
          currentStreak: 0,
          favoriteWorkoutType: 'running',
        };
      }

      // Calculate statistics
      const totalWorkouts = workouts.length;
      const totalDistance = workouts.reduce(
        (sum, w) => sum + (w.distance_meters || 0),
        0
      );
      const totalDuration = workouts.reduce(
        (sum, w) => sum + (w.duration_seconds || 0),
        0
      );
      const totalScore = workouts.reduce((sum, w) => sum + (w.score || 0), 0);
      const averageScore = Math.round(totalScore / totalWorkouts);
      const weeklyAverage = Math.round(totalWorkouts / 4.3); // 30 days ≈ 4.3 weeks

      // Calculate current streak
      const currentStreak = this.calculateCurrentStreak(workouts);

      // Find favorite workout type
      const workoutTypeCounts = workouts.reduce((counts, workout) => {
        counts[workout.type] = (counts[workout.type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      const favoriteWorkoutType = (Object.entries(workoutTypeCounts).sort(
        ([, a], [, b]) => (b as number) - (a as number)
      )[0]?.[0] || 'running') as WorkoutType;

      return {
        totalWorkouts,
        totalDistance,
        totalDuration,
        totalScore,
        averageScore,
        weeklyAverage,
        currentStreak,
        favoriteWorkoutType,
      };
    } catch (error) {
      console.error('Error getting user workout stats:', error);
      return null;
    }
  }

  /**
   * Calculate current workout streak
   */
  private calculateCurrentStreak(workouts: any[]): number {
    if (workouts.length === 0) return 0;

    const sortedWorkouts = workouts
      .map((w) => new Date(w.start_time))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 1;
    let currentDate = new Date(sortedWorkouts[0]);

    for (let i = 1; i < sortedWorkouts.length; i++) {
      const workoutDate = sortedWorkouts[i];
      const daysDiff = Math.floor(
        (currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff <= 2) {
        // Allow 1-day gap
        streak++;
        currentDate = workoutDate;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Process batch of workouts (for bulk sync operations)
   */
  async processBatchWorkouts(workouts: WorkoutData[]): Promise<{
    success: boolean;
    processedCount: number;
    totalScore: number;
    errors: string[];
  }> {
    let processedCount = 0;
    let totalScore = 0;
    const errors: string[] = [];

    console.log(`Processing batch of ${workouts.length} workouts`);

    for (const workout of workouts) {
      const result = await this.processWorkout(workout);

      if (result.success) {
        processedCount++;
        totalScore += result.score || 0;
      } else {
        errors.push(`${workout.id}: ${result.error}`);
      }
    }

    console.log(
      `Batch processing completed: ${processedCount}/${workouts.length} successful`
    );

    return {
      success: processedCount > 0,
      processedCount,
      totalScore,
      errors,
    };
  }

  /**
   * Convert Nostr workout to standard WorkoutData format
   */
  private convertNostrToWorkoutData(
    nostrWorkout: NostrWorkoutCompetition,
    userId: string,
    teamId?: string
  ): WorkoutData {
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
      this.estimateCaloriesForNostr(workoutType, duration, distance);

    return {
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
  }

  /**
   * Calculate Nostr-specific bonus points
   */
  private calculateNostrBonuses(nostrWorkout: NostrWorkoutCompetition): number {
    let bonusPoints = 0;

    // Bonus for authenticated Nostr source
    bonusPoints += NOSTR_BONUSES.authenticatedSource;

    // Bonus for heart rate data
    if (nostrWorkout.metrics?.heartRate) {
      bonusPoints += NOSTR_BONUSES.heartRateData;
    }

    // Bonus for pace data
    if (nostrWorkout.metrics?.pace) {
      bonusPoints += NOSTR_BONUSES.paceData;
    }

    // Bonus for elevation data
    if (nostrWorkout.metrics?.elevation) {
      bonusPoints += NOSTR_BONUSES.elevationData;
    }

    return bonusPoints;
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
   * Estimate calories for Nostr workouts when not provided
   */
  private estimateCaloriesForNostr(
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
   * Get workout source type for enhanced processing
   */
  private getWorkoutSource(
    workout: WorkoutData
  ): 'healthkit' | 'googlefit' | 'nostr' | 'manual' {
    if (workout.source === 'nostr') return 'nostr';
    if (workout.source === 'healthkit') return 'healthkit';
    if (workout.source === 'googlefit') return 'googlefit';
    return 'manual';
  }
}

export default WorkoutDataProcessor.getInstance();
