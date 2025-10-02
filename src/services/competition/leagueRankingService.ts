/**
 * League Ranking Service - Real-time competition leaderboards from Nostr events
 * Queries kind 1301 workout events from competition participants
 * Supports all league types from wizard competition parameters
 *
 * PERFORMANCE OPTIMIZATION: Uses persistent cache for instant app resume
 */

import Competition1301QueryService, {
  WorkoutMetrics,
  CompetitionQuery,
  QueryResult,
} from './Competition1301QueryService';
import type {
  NostrActivityType,
  NostrLeagueCompetitionType,
} from '../../types/nostrCompetition';
import NostrCompetitionParticipantService from '../nostr/NostrCompetitionParticipantService';
import { UnifiedCacheService } from '../cache/UnifiedCacheService';

export interface LeagueParticipant {
  npub: string;
  name?: string;
  avatar?: string;
  isActive: boolean;
}

export interface LeagueRankingEntry {
  npub: string;
  name: string;
  avatar: string;
  rank: number;
  score: number;
  formattedScore: string;
  isTopThree: boolean;
  trend?: 'up' | 'down' | 'same';
  workoutCount: number;
  lastActivity?: string;
}

export interface LeagueParameters {
  activityType: NostrActivityType;
  competitionType: NostrLeagueCompetitionType;
  startDate: string;
  endDate: string;
  scoringFrequency: 'daily' | 'weekly' | 'total';
}

export interface LeagueRankingResult {
  rankings: LeagueRankingEntry[];
  totalParticipants: number;
  lastUpdated: string;
  competitionId: string;
  isActive: boolean;
}

export class LeagueRankingService {
  private static instance: LeagueRankingService;
  private queryService: typeof Competition1301QueryService;
  private participantService: NostrCompetitionParticipantService;

  // Cache configuration
  private readonly CACHE_PREFIX = 'league_rankings:';
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh
  private readonly STALE_TTL_MS = 10 * 60 * 1000; // 10 minutes max (including stale)

  constructor() {
    this.queryService = Competition1301QueryService;
    this.participantService = NostrCompetitionParticipantService.getInstance();
  }

  static getInstance(): LeagueRankingService {
    if (!LeagueRankingService.instance) {
      LeagueRankingService.instance = new LeagueRankingService();
    }
    return LeagueRankingService.instance;
  }

  /**
   * Get cache key for a competition
   */
  private getCacheKey(competitionId: string): string {
    return `${this.CACHE_PREFIX}${competitionId}`;
  }

  /**
   * Calculate live league rankings for team display
   * Uses persistent cache-first strategy with stale-while-revalidate pattern
   * PERFORMANCE: Returns cached data instantly on app resume (<100ms)
   */
  async calculateLeagueRankings(
    competitionId: string,
    participants: LeagueParticipant[],
    parameters: LeagueParameters
  ): Promise<LeagueRankingResult> {
    console.log(`🏆 Calculating league rankings for: ${competitionId}`);
    console.log(`📊 Competition: ${parameters.activityType} - ${parameters.competitionType}`);

    const cacheKey = this.getCacheKey(competitionId);

    // Check persistent cache first - return fresh cache immediately
    const cachedData = await UnifiedCacheService.get<{ result: LeagueRankingResult; timestamp: number }>(cacheKey);

    if (cachedData) {
      const cacheAge = Date.now() - cachedData.timestamp;

      // Fresh cache (< 5 minutes) - return immediately
      if (cacheAge < this.CACHE_TTL_MS) {
        console.log(`✅ Returning fresh cached rankings (age: ${Math.round(cacheAge / 1000)}s)`);
        return cachedData.result;
      }

      // Stale cache (5-10 minutes) - return immediately, refresh in background
      if (cacheAge < this.STALE_TTL_MS) {
        console.log(`⚡ Returning stale cache (age: ${Math.round(cacheAge / 1000)}s), refreshing in background`);
        // Trigger background refresh without blocking
        this.refreshRankingsInBackground(competitionId, participants, parameters);
        return cachedData.result;
      }

      console.log(`🗑️ Cache too old (age: ${Math.round(cacheAge / 1000)}s), fetching fresh`);
    }

    try {
      // Get participant list from competition if it exists
      const competitionParticipantList = await this.participantService.getParticipantList(competitionId);

      let participantNpubs: string[];

      if (competitionParticipantList && competitionParticipantList.participants.length > 0) {
        // Use approved participants from competition list
        console.log('📋 Using competition participant list');
        participantNpubs = competitionParticipantList.participants
          .filter(p => p.status === 'approved')
          .map(p => p.npub || p.hexPubkey); // Use npub if available, fallback to hex
      } else {
        // Fall back to team members (for backward compatibility)
        console.log('📋 Falling back to team member list');
        participantNpubs = participants
          .filter(p => p.isActive)
          .map(p => p.npub);
      }

      // Query workout data from Nostr
      const query: CompetitionQuery = {
        memberNpubs: participantNpubs,
        activityType: parameters.activityType as NostrActivityType | 'Any',
        startDate: new Date(parameters.startDate),
        endDate: new Date(parameters.endDate),
      };

      const queryResult = await this.queryService.queryMemberWorkouts(query);
      console.log(`📈 Retrieved metrics for ${queryResult.metrics.size} participants`);

      // Calculate scores based on competition type
      const rankings = await this.calculateScores(
        queryResult.metrics,
        parameters,
        participants
      );

      // Sort by score and assign ranks
      rankings.sort((a, b) => b.score - a.score);
      rankings.forEach((entry, index) => {
        entry.rank = index + 1;
        entry.isTopThree = index < 3;
      });

      const result: LeagueRankingResult = {
        rankings,
        totalParticipants: participantNpubs.length,
        lastUpdated: new Date().toISOString(),
        competitionId,
        isActive: this.isCompetitionActive(parameters),
      };

      // Cache the result with persistent storage
      await this.cacheRankings(competitionId, result);

      console.log(`✅ Rankings calculated: ${rankings.length} entries`);
      return result;

    } catch (error) {
      console.error('❌ Failed to calculate league rankings:', error);
      throw error;
    }
  }

  /**
   * Refresh rankings in background without blocking UI
   * Used when returning stale cache for instant display
   */
  private async refreshRankingsInBackground(
    competitionId: string,
    participants: LeagueParticipant[],
    parameters: LeagueParameters
  ): Promise<void> {
    try {
      console.log('🔄 Background refresh started for:', competitionId);

      // Get participant list from competition if it exists
      const competitionParticipantList = await this.participantService.getParticipantList(competitionId);

      let participantNpubs: string[];

      if (competitionParticipantList && competitionParticipantList.participants.length > 0) {
        participantNpubs = competitionParticipantList.participants
          .filter(p => p.status === 'approved')
          .map(p => p.npub || p.hexPubkey);
      } else {
        participantNpubs = participants
          .filter(p => p.isActive)
          .map(p => p.npub);
      }

      // Query workout data from Nostr
      const query: CompetitionQuery = {
        memberNpubs: participantNpubs,
        activityType: parameters.activityType as NostrActivityType | 'Any',
        startDate: new Date(parameters.startDate),
        endDate: new Date(parameters.endDate),
      };

      const queryResult = await this.queryService.queryMemberWorkouts(query);

      // Calculate scores
      const rankings = await this.calculateScores(
        queryResult.metrics,
        parameters,
        participants
      );

      // Sort and assign ranks
      rankings.sort((a, b) => b.score - a.score);
      rankings.forEach((entry, index) => {
        entry.rank = index + 1;
        entry.isTopThree = index < 3;
      });

      const result: LeagueRankingResult = {
        rankings,
        totalParticipants: participantNpubs.length,
        lastUpdated: new Date().toISOString(),
        competitionId,
        isActive: this.isCompetitionActive(parameters),
      };

      // Update persistent cache with fresh data
      await this.cacheRankings(competitionId, result);

      console.log(`✅ Background refresh complete for ${competitionId}`);
    } catch (error) {
      console.error('❌ Background refresh failed:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Calculate scores based on competition type
   */
  private async calculateScores(
    metrics: Map<string, WorkoutMetrics>,
    parameters: LeagueParameters,
    participants: LeagueParticipant[]
  ): Promise<LeagueRankingEntry[]> {
    const { activityType, competitionType } = parameters;

    const entries: LeagueRankingEntry[] = [];

    for (const [npub, metric] of metrics) {
      const participant = participants.find(p => p.npub === npub);
      let score = 0;
      let formattedScore = '0';

      // Calculate score based on competition type
      switch (competitionType) {
        case 'Total Distance':
          score = metric.totalDistance || 0;
          formattedScore = this.formatDistance(score);
          break;

        case '5K Race':
        case '10K Race':
        case 'Half Marathon':
        case 'Marathon':
          // For races: fastest time (lowest duration) for the target distance wins
          // We need to find the fastest workout that meets the distance requirement
          const targetDistance = competitionType === '5K Race' ? 5000 :
                                competitionType === '10K Race' ? 10000 :
                                competitionType === 'Half Marathon' ? 21097 :
                                42195; // Marathon

          // Get fastest time for this distance (will need to be implemented in metrics)
          if (metric.averagePace && metric.totalDistance >= targetDistance) {
            // Use inverse of time as score (faster = higher score)
            const estimatedTime = (targetDistance / 1000) * metric.averagePace; // time in minutes
            score = estimatedTime > 0 ? 100000 / estimatedTime : 0; // Higher score for faster time
            formattedScore = this.formatDuration(estimatedTime * 60); // Convert to seconds for formatting
          } else {
            score = 0;
            formattedScore = 'Not completed';
          }
          break;

        case 'Average Pace':
          score = metric.averagePace ? (1 / metric.averagePace) * 1000 : 0; // Invert pace for ranking
          formattedScore = this.formatPace(metric.averagePace || 0);
          break;

        case 'Average Speed':
          score = metric.averageSpeed || 0;
          formattedScore = `${score.toFixed(1)} km/h`;
          break;

        case 'Longest Run':
        case 'Longest Ride':
          score = metric.longestDistance || 0;
          formattedScore = this.formatDistance(score);
          break;

        case 'Total Workouts':
        case 'Session Count':
          score = metric.workoutCount || 0;
          formattedScore = `${score} workouts`;
          break;

        case 'Total Duration':
          score = metric.totalDuration || 0;
          formattedScore = this.formatDuration(score);
          break;

        case 'Most Consistent':
          // Use active days as consistency metric
          score = metric.activeDays || 0;
          formattedScore = `${score} active days`;
          break;

        case 'Weekly Streaks':
        case 'Daily Average':
          score = metric.streakDays || 0;
          formattedScore = `${score} day streak`;
          break;

        case 'Total Elevation':
          // Would need elevation data from workouts
          score = 0;
          formattedScore = `${score}m elevation`;
          break;

        case 'Calorie Consistency':
          score = metric.totalCalories || 0;
          formattedScore = `${score.toLocaleString()} cal`;
          break;

        case 'Longest Session':
          score = metric.longestDuration || 0;
          formattedScore = this.formatDuration(score);
          break;

        default:
          score = metric.totalDistance || 0;
          formattedScore = this.formatDistance(score);
      }

      const entry: LeagueRankingEntry = {
        npub: npub,
        name: participant?.name || this.formatNpub(npub),
        avatar: participant?.avatar || this.generateAvatar(npub),
        rank: 0, // Will be set after sorting
        score,
        formattedScore,
        isTopThree: false, // Will be set after ranking
        workoutCount: metric.workoutCount,
        lastActivity: metric.lastActivityDate,
      };

      entries.push(entry);
    }

    return entries;
  }

  /**
   * Get current rankings for a competition (from persistent cache only)
   */
  async getCurrentRankings(competitionId: string): Promise<LeagueRankingResult | null> {
    const cacheKey = this.getCacheKey(competitionId);
    const cachedData = await UnifiedCacheService.get<{ result: LeagueRankingResult; timestamp: number }>(cacheKey);

    if (cachedData) {
      return cachedData.result;
    }

    // No database fallback - pure Nostr + cache
    return null;
  }

  /**
   * Update rankings when new workout data arrives
   */
  async updateRankingsForNewWorkout(
    competitionId: string,
    userNpub: string
  ): Promise<void> {
    console.log(`🔄 Updating rankings for new workout: ${userNpub.slice(0, 8)}...`);

    // Invalidate persistent cache for this competition
    const cacheKey = this.getCacheKey(competitionId);
    await UnifiedCacheService.invalidate(cacheKey);

    // Also clear query cache to force fresh data
    this.queryService.clearCache();

    console.log(`✅ Rankings cache invalidated for: ${competitionId}`);
  }

  /**
   * Get league summary statistics
   */
  async getLeagueStats(
    competitionId: string,
    participants: LeagueParticipant[],
    parameters: LeagueParameters
  ): Promise<{
    totalWorkouts: number;
    totalDistance: number;
    totalDuration: number;
    activeParticipants: number;
  }> {
    const participantNpubs = participants.map(p => p.npub);

    const query: CompetitionQuery = {
      memberNpubs: participantNpubs,
      activityType: parameters.activityType as NostrActivityType | 'Any',
      startDate: new Date(parameters.startDate),
      endDate: new Date(parameters.endDate),
    };

    const queryResult = await this.queryService.queryMemberWorkouts(query);

    let totalWorkouts = 0;
    let totalDistance = 0;
    let totalDuration = 0;
    let activeParticipants = 0;

    for (const metrics of queryResult.metrics.values()) {
      if (metrics.workoutCount > 0) {
        activeParticipants++;
        totalWorkouts += metrics.workoutCount;
        totalDistance += metrics.totalDistance;
        totalDuration += metrics.totalDuration;
      }
    }

    return {
      totalWorkouts,
      totalDistance,
      totalDuration,
      activeParticipants,
    };
  }

  // ================================================================================
  // PRIVATE HELPER METHODS
  // ================================================================================

  /**
   * Clear all ranking caches (persistent + query cache)
   */
  async clearCache(): Promise<void> {
    // Clear all persistent ranking caches using pattern matching
    await UnifiedCacheService.invalidate(`${this.CACHE_PREFIX}*`);
    this.queryService.clearCache();
    console.log('🧹 Cleared all ranking caches (persistent + query)');
  }

  /**
   * Check if competition is currently active
   */
  private isCompetitionActive(parameters: LeagueParameters): boolean {
    const now = new Date();
    const start = new Date(parameters.startDate);
    const end = new Date(parameters.endDate);
    
    return now >= start && now <= end;
  }

  /**
   * Cache rankings result with timestamp in persistent storage
   * Survives app backgrounding for instant resume
   */
  private async cacheRankings(competitionId: string, result: LeagueRankingResult): Promise<void> {
    const cacheKey = this.getCacheKey(competitionId);
    const cacheData = {
      result,
      timestamp: Date.now()
    };

    // Store with 10-minute TTL (covers fresh + stale periods)
    await UnifiedCacheService.set(cacheKey, cacheData, 'leaderboards');
    console.log(`💾 Cached rankings to persistent storage: ${competitionId}`);
  }

  /**
   * Format distance for display
   */
  private formatDistance(distance: number): string {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(2)} km`;
  }

  /**
   * Format duration for display
   */
  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  }

  /**
   * Format pace for display (min/km)
   */
  private formatPace(pace: number): string {
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
  }

  /**
   * Format npub for display
   */
  private formatNpub(npub: string): string {
    return `${npub.slice(0, 8)}...`;
  }

  /**
   * Generate avatar initial from npub
   */
  private generateAvatar(npub: string): string {
    // Use first character of npub after 'npub1' prefix
    return npub.charAt(5).toUpperCase();
  }

  /**
   * Calculate days between two dates
   */
  private getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

}

export default LeagueRankingService.getInstance();