/**
 * Nostr Competition Context Service
 * Pure Nostr implementation for competition context management
 * Replaces Supabase-dependent CompetitionContextService with Nostr-native approach
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NostrCompetitionService } from '../nostr/NostrCompetitionService';
import type { NostrTeamService } from '../nostr/NostrTeamService';
import type { WorkoutData } from '../../types/workout';
import type {
  NostrLeagueDefinition,
  NostrEventDefinition,
  CompetitionGoalType,
} from '../../types/nostrCompetition';

// Updated Competition interface for Nostr compatibility
export interface NostrCompetition {
  id: string;
  type: 'event' | 'league';
  name: string;
  teamId: string;
  startDate?: string;
  endDate?: string;
  eventDate?: string; // For events
  duration?: number; // For leagues
  isActive: boolean;
  goalType: CompetitionGoalType;
  activityType: string;
  competitionType: string;
  captainPubkey: string;
  maxParticipants: number;
  entryFeesSats: number;
  requireApproval: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NostrCompetitionRules {
  activityTypes: string[];
  goalType: CompetitionGoalType;
  teamMembersOnly: boolean;
}

export interface NostrCompetitionContext {
  userId: string;
  userPubkey: string;
  activeCompetitions: NostrCompetition[];
  teamMemberships: string[];
  cachedAt: string;
  expiresAt: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'nostr_competition_context_cache';

export class NostrCompetitionContextService {
  private static instance: NostrCompetitionContextService;
  private contextCache = new Map<string, NostrCompetitionContext>();
  private competitionService: NostrCompetitionService;
  private teamService: NostrTeamService | null = null;

  private constructor() {
    this.competitionService = NostrCompetitionService.getInstance();
  }

  static getInstance(): NostrCompetitionContextService {
    if (!NostrCompetitionContextService.instance) {
      NostrCompetitionContextService.instance = new NostrCompetitionContextService();
    }
    return NostrCompetitionContextService.instance;
  }

  /**
   * Set team service for team membership validation
   */
  setTeamService(teamService: NostrTeamService) {
    this.teamService = teamService;
  }

  /**
   * Get active competitions for user at specific date
   */
  async getActiveCompetitionsForUser(
    userId: string,
    userPubkey: string,
    workoutDate: Date = new Date()
  ): Promise<NostrCompetition[]> {
    try {
      console.log(
        `Getting active Nostr competitions for user ${userId} at ${workoutDate.toISOString()}`
      );

      // Check cache first
      const cachedContext = await this.getCachedCompetitionContext(userId);
      if (cachedContext && this.isCacheValid(cachedContext)) {
        console.log(`Using cached Nostr competition context for user ${userId}`);
        return this.filterCompetitionsByDate(
          cachedContext.activeCompetitions,
          workoutDate
        );
      }

      // Fetch fresh data from Nostr
      const competitions = await this.fetchActiveCompetitionsFromNostr(
        userId,
        userPubkey,
        workoutDate
      );

      // Cache the results
      await this.cacheCompetitionContext(userId, userPubkey, competitions);

      console.log(
        `Found ${competitions.length} active Nostr competitions for user ${userId}`
      );
      return competitions;
    } catch (error) {
      console.error('Error getting active Nostr competitions:', error);
      return [];
    }
  }

  /**
   * Validate if workout meets competition criteria
   */
  validateWorkoutForCompetition(
    workout: WorkoutData,
    competition: NostrCompetition
  ): boolean {
    try {
      const workoutDate = new Date(workout.startTime);

      // Check date eligibility
      if (!this.isWorkoutWithinCompetitionDates(workoutDate, competition)) {
        console.log(`Workout ${workout.id} outside competition date range`);
        return false;
      }

      // Check team membership
      if (workout.teamId !== competition.teamId) {
        console.log(`Workout ${workout.id} not from competition team`);
        return false;
      }

      // Check activity type matching
      const workoutActivityType = this.mapWorkoutTypeToActivityType(workout.type);
      if (workoutActivityType !== competition.activityType.toLowerCase()) {
        console.log(`Workout type ${workout.type} doesn't match competition activity ${competition.activityType}`);
        return false;
      }

      console.log(`✅ Workout ${workout.id} validates for competition ${competition.name}`);
      return true;
    } catch (error) {
      console.error('Error validating workout for Nostr competition:', error);
      return false;
    }
  }

  /**
   * Get applicable competitions for a specific workout
   */
  async getApplicableCompetitions(
    workout: WorkoutData,
    userId: string,
    userPubkey: string
  ): Promise<NostrCompetition[]> {
    try {
      const workoutDate = new Date(workout.startTime);
      const activeCompetitions = await this.getActiveCompetitionsForUser(
        userId,
        userPubkey,
        workoutDate
      );

      const applicableCompetitions = activeCompetitions.filter((competition) =>
        this.validateWorkoutForCompetition(workout, competition)
      );

      console.log(
        `Found ${applicableCompetitions.length} applicable competitions for workout ${workout.id}`
      );

      return applicableCompetitions;
    } catch (error) {
      console.error('Error getting applicable Nostr competitions:', error);
      return [];
    }
  }

  // ================================================================================
  // PRIVATE METHODS
  // ================================================================================

  /**
   * Fetch active competitions from Nostr relays
   */
  private async fetchActiveCompetitionsFromNostr(
    userId: string,
    userPubkey: string,
    workoutDate: Date
  ): Promise<NostrCompetition[]> {
    try {
      console.log('📡 Fetching competitions from Nostr relays');

      // Get user's team memberships (would need team service integration)
      const userTeams = await this.getUserTeamMemberships(userPubkey);
      
      if (userTeams.length === 0) {
        console.log('User has no team memberships');
        return [];
      }

      // Query all competitions from these teams
      const competitionResult = await this.competitionService.queryCompetitions({
        kinds: [30100, 30101], // Leagues and Events
        '#team': userTeams,
        '#status': ['upcoming', 'active'],
        since: Math.floor((Date.now() - (30 * 24 * 60 * 60 * 1000)) / 1000), // Last 30 days
        limit: 500,
      });

      const competitions: NostrCompetition[] = [];

      // Convert leagues to competition format
      competitionResult.leagues.forEach((league) => {
        const goalType = this.competitionService.getCompetitionGoalType(league);
        competitions.push({
          id: league.id,
          type: 'league',
          name: league.name,
          teamId: league.teamId,
          startDate: league.startDate,
          endDate: league.endDate,
          duration: league.duration,
          isActive: this.isCompetitionActive(league),
          goalType,
          activityType: league.activityType,
          competitionType: league.competitionType,
          captainPubkey: league.captainPubkey,
          maxParticipants: league.maxParticipants,
          entryFeesSats: league.entryFeesSats,
          requireApproval: league.requireApproval,
          createdAt: league.createdAt,
          updatedAt: league.updatedAt,
        });
      });

      // Convert events to competition format
      competitionResult.events.forEach((event) => {
        const goalType = this.competitionService.getCompetitionGoalType(event);
        competitions.push({
          id: event.id,
          type: 'event',
          name: event.name,
          teamId: event.teamId,
          eventDate: event.eventDate,
          isActive: this.isCompetitionActive(event),
          goalType,
          activityType: event.activityType,
          competitionType: event.competitionType,
          captainPubkey: event.captainPubkey,
          maxParticipants: event.maxParticipants,
          entryFeesSats: event.entryFeesSats,
          requireApproval: event.requireApproval,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        });
      });

      console.log(`✅ Fetched ${competitions.length} competitions from Nostr`);
      return competitions;
    } catch (error) {
      console.error('Error fetching competitions from Nostr:', error);
      return [];
    }
  }

  /**
   * Get user's team memberships (placeholder - would integrate with NostrTeamService)
   */
  private async getUserTeamMemberships(userPubkey: string): Promise<string[]> {
    try {
      // TODO: Integrate with NostrTeamService to get actual team memberships
      // For now, return empty array - this would be populated by team service
      if (this.teamService) {
        // This would be the actual implementation when teamService is available
        // return await this.teamService.getUserTeamMemberships(userPubkey);
      }
      
      console.log('⚠️ Team service not available, returning empty team memberships');
      return [];
    } catch (error) {
      console.error('Error getting user team memberships:', error);
      return [];
    }
  }

  /**
   * Check if competition is currently active
   */
  private isCompetitionActive(
    competition: NostrLeagueDefinition | NostrEventDefinition
  ): boolean {
    const now = new Date();

    if ('duration' in competition) {
      // It's a league
      const startDate = new Date(competition.startDate);
      const endDate = new Date(competition.endDate);
      return startDate <= now && now <= endDate && competition.status === 'active';
    } else {
      // It's an event
      const eventDate = new Date(competition.eventDate);
      const eventStart = new Date(eventDate);
      eventStart.setHours(0, 0, 0, 0);
      const eventEnd = new Date(eventDate);
      eventEnd.setHours(23, 59, 59, 999);
      return eventStart <= now && now <= eventEnd && competition.status === 'active';
    }
  }

  /**
   * Check if workout date is within competition period
   */
  private isWorkoutWithinCompetitionDates(
    workoutDate: Date,
    competition: NostrCompetition
  ): boolean {
    const workoutTime = workoutDate.getTime();

    if (competition.type === 'league') {
      // Check league date range
      if (competition.startDate && competition.endDate) {
        const startTime = new Date(competition.startDate).getTime();
        const endTime = new Date(competition.endDate).getTime();
        return workoutTime >= startTime && workoutTime <= endTime;
      }
    } else {
      // Check event date
      if (competition.eventDate) {
        const eventDate = new Date(competition.eventDate);
        const eventStart = new Date(eventDate);
        eventStart.setHours(0, 0, 0, 0);
        const eventEnd = new Date(eventDate);
        eventEnd.setHours(23, 59, 59, 999);
        
        return workoutTime >= eventStart.getTime() && workoutTime <= eventEnd.getTime();
      }
    }

    return false;
  }

  /**
   * Filter competitions by workout date
   */
  private filterCompetitionsByDate(
    competitions: NostrCompetition[],
    workoutDate: Date
  ): NostrCompetition[] {
    return competitions.filter((competition) =>
      this.isWorkoutWithinCompetitionDates(workoutDate, competition)
    );
  }

  /**
   * Map workout type to activity type for validation
   */
  private mapWorkoutTypeToActivityType(workoutType: string): string {
    const mapping: Record<string, string> = {
      'running': 'running',
      'walking': 'walking', 
      'cycling': 'cycling',
      'strength_training': 'strength training',
      'yoga': 'yoga',
      'gym': 'strength training',
      'other': 'other',
    };

    return mapping[workoutType.toLowerCase()] || workoutType.toLowerCase();
  }

  // ================================================================================
  // CACHING METHODS
  // ================================================================================

  /**
   * Get cached competition context
   */
  private async getCachedCompetitionContext(
    userId: string
  ): Promise<NostrCompetitionContext | null> {
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
        const context: NostrCompetitionContext = JSON.parse(cachedData);
        if (this.isCacheValid(context)) {
          this.contextCache.set(userId, context);
          return context;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting cached Nostr competition context:', error);
      return null;
    }
  }

  /**
   * Cache competition context
   */
  private async cacheCompetitionContext(
    userId: string,
    userPubkey: string,
    competitions: NostrCompetition[]
  ): Promise<void> {
    try {
      const context: NostrCompetitionContext = {
        userId,
        userPubkey,
        activeCompetitions: competitions,
        teamMemberships: Array.from(new Set(competitions.map((c) => c.teamId))),
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_DURATION).toISOString(),
      };

      // Store in memory cache
      this.contextCache.set(userId, context);

      // Store in persistent cache
      const cacheKey = `${STORAGE_KEY}_${userId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(context));
    } catch (error) {
      console.error('Error caching Nostr competition context:', error);
    }
  }

  /**
   * Check if cached context is still valid
   */
  private isCacheValid(context: NostrCompetitionContext): boolean {
    const now = new Date();
    const expiresAt = new Date(context.expiresAt);
    return now < expiresAt;
  }

  /**
   * Clear cache for user
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
        `Nostr competition context cache cleared${
          userId ? ` for user ${userId}` : ''
        }`
      );
    } catch (error) {
      console.error('Error clearing Nostr competition context cache:', error);
    }
  }

  /**
   * Get cache statistics
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

export default NostrCompetitionContextService.getInstance();