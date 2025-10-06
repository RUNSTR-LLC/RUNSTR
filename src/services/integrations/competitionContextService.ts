/**
 * Competition Context Service
 * Intelligently determines which competitions a workout should count toward
 * Handles active competition detection, eligibility validation, and performance caching
 */

// @ts-nocheck - Supabase code needs Nostr rewrite

// import { supabase } from '../supabase';  // REMOVED: Project now uses pure Nostr
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutData } from '../../types/workout';
import type { Event, Challenge, League } from '../../types/team';

export interface Competition {
  id: string;
  type: 'event' | 'challenge' | 'league';
  name: string;
  teamId: string;
  startDate?: string;
  endDate?: string;
  deadline?: string;
  isActive: boolean;
  eligibilityRules?: CompetitionRules;
}

export interface CompetitionRules {
  workoutTypes?: string[];
  minimumDistance?: number;
  minimumDuration?: number;
  teamMembersOnly?: boolean;
}

export interface CompetitionContext {
  userId: string;
  activeCompetitions: Competition[];
  teamMemberships: string[];
  cachedAt: string;
  expiresAt: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'competition_context_cache';

export class CompetitionContextService {
  private static instance: CompetitionContextService;
  private contextCache = new Map<string, CompetitionContext>();

  private constructor() {}

  static getInstance(): CompetitionContextService {
    if (!CompetitionContextService.instance) {
      CompetitionContextService.instance = new CompetitionContextService();
    }
    return CompetitionContextService.instance;
  }

  /**
   * Get active competitions for user at specific date
   * Uses intelligent caching for performance
   */
  async getActiveCompetitionsForUser(
    userId: string,
    workoutDate: Date = new Date()
  ): Promise<Competition[]> {
    try {
      console.log(
        `Getting active competitions for user ${userId} at ${workoutDate.toISOString()}`
      );

      // Check cache first
      const cachedContext = await this.getCachedCompetitionContext(userId);
      if (cachedContext && this.isCacheValid(cachedContext)) {
        console.log(`Using cached competition context for user ${userId}`);
        return this.filterCompetitionsByDate(
          cachedContext.activeCompetitions,
          workoutDate
        );
      }

      // Fetch fresh data
      const competitions = await this.fetchActiveCompetitions(
        userId,
        workoutDate
      );

      // Cache the results
      await this.cacheCompetitionContext(userId, competitions);

      console.log(
        `Found ${competitions.length} active competitions for user ${userId}`
      );
      return competitions;
    } catch (error) {
      console.error('Error getting active competitions:', error);
      return [];
    }
  }

  /**
   * Validate if workout meets competition criteria
   */
  validateWorkoutForCompetition(
    workout: WorkoutData,
    competition: Competition
  ): boolean {
    try {
      const workoutDate = new Date(workout.startTime);

      // Check date eligibility
      if (!this.isWorkoutWithinCompetitionDates(workoutDate, competition)) {
        return false;
      }

      // Check team membership
      if (workout.teamId !== competition.teamId) {
        return false;
      }

      // Check competition-specific rules
      if (competition.eligibilityRules) {
        return this.validateAgainstRules(workout, competition.eligibilityRules);
      }

      return true;
    } catch (error) {
      console.error('Error validating workout for competition:', error);
      return false;
    }
  }

  /**
   * Get applicable competitions for a specific workout
   */
  async getApplicableCompetitions(
    workout: WorkoutData,
    userId: string
  ): Promise<Competition[]> {
    try {
      const workoutDate = new Date(workout.startTime);
      const activeCompetitions = await this.getActiveCompetitionsForUser(
        userId,
        workoutDate
      );

      return activeCompetitions.filter((competition) =>
        this.validateWorkoutForCompetition(workout, competition)
      );
    } catch (error) {
      console.error('Error getting applicable competitions:', error);
      return [];
    }
  }

  /**
   * Get cached competition context with validation
   */
  async getCachedCompetitionContext(
    userId: string
  ): Promise<CompetitionContext | null> {
    try {
      // Check memory cache first
      const memoryCache = this.contextCache.get(userId);
      if (memoryCache && this.isCacheValid(memoryCache)) {
        return memoryCache;
      }

      // Check persistent cache
      const cacheKey = `${STORAGE_KEY}_${userId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (cachedData) {
        const context: CompetitionContext = JSON.parse(cachedData);
        if (this.isCacheValid(context)) {
          this.contextCache.set(userId, context);
          return context;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting cached competition context:', error);
      return null;
    }
  }

  /**
   * Fetch active competitions from database
   */
  private async fetchActiveCompetitions(
    userId: string,
    workoutDate: Date
  ): Promise<Competition[]> {
    const competitions: Competition[] = [];

    try {
      // Get user's team memberships
      const { data: teamMemberships, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (teamError) throw teamError;

      const teamIds = teamMemberships?.map((tm) => tm.team_id) || [];
      if (teamIds.length === 0) return [];

      // Fetch active events
      const { data: events, error: eventsError } = await supabase
        .from('activities')
        .select('*')
        .eq('activity_type', 'event')
        .in('team_id', teamIds)
        .eq('status', 'active');

      if (!eventsError && events) {
        events.forEach((event) => {
          competitions.push({
            id: event.id,
            type: 'event',
            name: event.name,
            teamId: event.team_id,
            startDate: event.start_date,
            endDate: event.end_date,
            isActive: true,
            eligibilityRules: this.parseEventRules(event),
          });
        });
      }

      // Fetch active challenges
      const { data: challenges, error: challengesError } = await supabase
        .from('activities')
        .select('*')
        .eq('activity_type', 'challenge')
        .in('team_id', teamIds)
        .in('status', ['active', 'accepted'])
        .lte('created_at', workoutDate.toISOString())
        .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`);

      if (!challengesError && challenges) {
        challenges.forEach((challenge) => {
          competitions.push({
            id: challenge.id,
            type: 'challenge',
            name: challenge.name,
            teamId: challenge.team_id,
            startDate: challenge.created_at,
            deadline: challenge.deadline,
            isActive: true,
            eligibilityRules: this.parseChallengeRules(challenge),
          });
        });
      }

      // Fetch active leagues
      const { data: leagues, error: leaguesError } = await supabase
        .from('activities')
        .select('*')
        .eq('activity_type', 'league')
        .in('team_id', teamIds)
        .eq('status', 'active');

      if (!leaguesError && leagues) {
        leagues.forEach((league) => {
          competitions.push({
            id: league.id,
            type: 'league',
            name: league.title,
            teamId: league.team_id,
            startDate: league.created_at,
            isActive: true,
            eligibilityRules: this.parseLeagueRules(league),
          });
        });
      }

      return competitions;
    } catch (error) {
      console.error('Error fetching active competitions:', error);
      return [];
    }
  }

  /**
   * Cache competition context for performance
   */
  private async cacheCompetitionContext(
    userId: string,
    competitions: Competition[]
  ): Promise<void> {
    try {
      const context: CompetitionContext = {
        userId,
        activeCompetitions: competitions,
        teamMemberships: [...new Set(competitions.map((c) => c.teamId))],
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_DURATION).toISOString(),
      };

      // Store in memory cache
      this.contextCache.set(userId, context);

      // Store in persistent cache
      const cacheKey = `${STORAGE_KEY}_${userId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(context));
    } catch (error) {
      console.error('Error caching competition context:', error);
    }
  }

  /**
   * Check if cached context is still valid
   */
  private isCacheValid(context: CompetitionContext): boolean {
    const now = new Date();
    const expiresAt = new Date(context.expiresAt);
    return now < expiresAt;
  }

  /**
   * Filter competitions by workout date
   */
  private filterCompetitionsByDate(
    competitions: Competition[],
    workoutDate: Date
  ): Competition[] {
    return competitions.filter((competition) =>
      this.isWorkoutWithinCompetitionDates(workoutDate, competition)
    );
  }

  /**
   * Check if workout date is within competition period
   */
  private isWorkoutWithinCompetitionDates(
    workoutDate: Date,
    competition: Competition
  ): boolean {
    const workoutTime = workoutDate.getTime();

    // Check start date
    if (competition.startDate) {
      const startTime = new Date(competition.startDate).getTime();
      if (workoutTime < startTime) return false;
    }

    // Check end date or deadline
    const endDateStr = competition.endDate || competition.deadline;
    if (endDateStr) {
      const endTime = new Date(endDateStr).getTime();
      if (workoutTime > endTime) return false;
    }

    return true;
  }

  /**
   * Validate workout against competition rules
   */
  private validateAgainstRules(
    workout: WorkoutData,
    rules: CompetitionRules
  ): boolean {
    // Check workout type
    if (rules.workoutTypes && !rules.workoutTypes.includes(workout.type)) {
      return false;
    }

    // Check minimum distance
    if (
      rules.minimumDistance &&
      (workout.distance || 0) < rules.minimumDistance
    ) {
      return false;
    }

    // Check minimum duration
    if (rules.minimumDuration && workout.duration < rules.minimumDuration) {
      return false;
    }

    return true;
  }

  /**
   * Parse event-specific eligibility rules
   */
  private parseEventRules(event: any): CompetitionRules {
    return {
      workoutTypes: event.allowed_workout_types
        ? event.allowed_workout_types.split(',')
        : undefined,
      minimumDistance: event.minimum_distance,
      minimumDuration: event.minimum_duration,
      teamMembersOnly: true,
    };
  }

  /**
   * Parse challenge-specific eligibility rules
   */
  private parseChallengeRules(challenge: any): CompetitionRules {
    return {
      workoutTypes: challenge.challenge_type
        ? [challenge.challenge_type]
        : undefined,
      teamMembersOnly: true,
    };
  }

  /**
   * Parse league-specific eligibility rules
   */
  private parseLeagueRules(league: any): CompetitionRules {
    return {
      teamMembersOnly: true,
    };
  }

  /**
   * Clear cache for user (useful for testing or data refresh)
   */
  async clearCache(userId?: string): Promise<void> {
    try {
      if (userId) {
        // Clear specific user cache
        this.contextCache.delete(userId);
        const cacheKey = `${STORAGE_KEY}_${userId}`;
        await AsyncStorage.removeItem(cacheKey);
      } else {
        // Clear all cache
        this.contextCache.clear();
        const keys = await AsyncStorage.getAllKeys();
        const contextKeys = keys.filter((key) => key.startsWith(STORAGE_KEY));
        await AsyncStorage.multiRemove(contextKeys);
      }

      console.log(
        `Competition context cache cleared${
          userId ? ` for user ${userId}` : ''
        }`
      );
    } catch (error) {
      console.error('Error clearing competition context cache:', error);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { memoryEntries: number; totalCompetitions: number } {
    let totalCompetitions = 0;

    this.contextCache.forEach((context) => {
      totalCompetitions += context.activeCompetitions.length;
    });

    return {
      memoryEntries: this.contextCache.size,
      totalCompetitions,
    };
  }
}

export default CompetitionContextService.getInstance();
