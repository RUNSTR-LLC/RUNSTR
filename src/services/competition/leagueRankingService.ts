/**
 * League Ranking Service - Real-time competition leaderboards from Nostr events
 * Queries kind 1301 workout events from team members
 * Supports all league types from wizard competition parameters
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
  private rankingCache = new Map<string, LeagueRankingResult>();
  private cacheExpiry = 60000; // 1 minute cache

  constructor() {
    this.queryService = Competition1301QueryService;
  }

  static getInstance(): LeagueRankingService {
    if (!LeagueRankingService.instance) {
      LeagueRankingService.instance = new LeagueRankingService();
    }
    return LeagueRankingService.instance;
  }

  /**
   * Calculate live league rankings for team display
   */
  async calculateLeagueRankings(
    competitionId: string,
    participants: LeagueParticipant[],
    parameters: LeagueParameters
  ): Promise<LeagueRankingResult> {
    console.log(`🏆 Calculating league rankings for: ${competitionId}`);
    console.log(`📊 Competition: ${parameters.activityType} - ${parameters.competitionType}`);

    // Check cache first
    const cached = this.getCachedRankings(competitionId);
    if (cached) {
      console.log('✅ Returning cached rankings');
      return cached;
    }

    try {
      const participantNpubs = participants
        .filter(p => p.isActive)
        .map(p => p.npub);

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

      // Cache the result
      this.cacheRankings(competitionId, result);

      console.log(`✅ Rankings calculated: ${rankings.length} entries`);
      return result;

    } catch (error) {
      console.error('❌ Failed to calculate league rankings:', error);
      throw error;
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
   * Get current rankings for a competition (cached or fresh)
   */
  async getCurrentRankings(competitionId: string): Promise<LeagueRankingResult | null> {
    // Try cache first
    const cached = this.getCachedRankings(competitionId);
    if (cached) {
      return cached;
    }

    // No database fallback anymore - pure Nostr
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

    // Invalidate cache for this competition
    this.rankingCache.delete(competitionId);

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
   * Clear all caches
   */
  clearCache() {
    this.rankingCache.clear();
    this.queryService.clearCache();
    console.log('🧹 Cleared all ranking caches');
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
   * Get cached rankings if valid
   */
  private getCachedRankings(competitionId: string): LeagueRankingResult | null {
    const cached = this.rankingCache.get(competitionId);
    if (!cached) return null;

    const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
    if (cacheAge > this.cacheExpiry) {
      this.rankingCache.delete(competitionId);
      return null;
    }

    return cached;
  }

  /**
   * Cache rankings result
   */
  private cacheRankings(competitionId: string, result: LeagueRankingResult): void {
    this.rankingCache.set(competitionId, result);
    console.log(`💾 Cached rankings for competition: ${competitionId}`);
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