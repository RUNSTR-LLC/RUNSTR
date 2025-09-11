/**
 * League Ranking Service - Real-time competition leaderboards from local data
 * Transforms static team members into dynamic competitive rankings
 * Supports all league types from wizard competition parameters
 */

import workoutDatabase from '../database/workoutDatabase';
import type { WorkoutRecord, LeaderboardCache } from '../database/workoutDatabase';
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
  private database: any; // Will be lazily initialized
  private rankingCache = new Map<string, LeagueRankingResult>();
  private cacheExpiry = 60000; // 1 minute cache

  static getInstance(): LeagueRankingService {
    if (!LeagueRankingService.instance) {
      LeagueRankingService.instance = new LeagueRankingService();
    }
    return LeagueRankingService.instance;
  }

  private initDatabase() {
    if (!this.database) {
      this.database = workoutDatabase;
    }
  }

  /**
   * Calculate live league rankings for team display
   */
  async calculateLeagueRankings(
    competitionId: string,
    participants: LeagueParticipant[],
    parameters: LeagueParameters
  ): Promise<LeagueRankingResult> {
    this.initDatabase(); // Ensure database is initialized
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

      // Get workout data for all participants
      const workoutMetrics = await this.database.getWorkoutMetrics(
        this.mapActivityTypeToWorkoutType(parameters.activityType),
        participantNpubs
      );

      console.log(`📈 Retrieved metrics for ${workoutMetrics.length} participants`);

      // Calculate scores based on competition type
      const rankings = await this.calculateScores(
        workoutMetrics,
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
    metrics: Awaited<ReturnType<WorkoutDatabase['getWorkoutMetrics']>>,
    parameters: LeagueParameters,
    participants: LeagueParticipant[]
  ): Promise<LeagueRankingEntry[]> {
    const { activityType, competitionType } = parameters;

    return metrics.map(metric => {
      const participant = participants.find(p => p.npub === metric.npub);
      let score = 0;
      let formattedScore = '0';

      // Calculate score based on competition type
      switch (competitionType) {
        case 'Total Distance':
          score = metric.totalDistance || 0;
          formattedScore = this.formatDistance(score);
          break;

        case 'Average Pace':
          score = metric.avgPace ? (1 / metric.avgPace) * 1000 : 0; // Invert pace for ranking
          formattedScore = this.formatPace(metric.avgPace || 0);
          break;

        case 'Longest Run':
        case 'Longest Ride':
          // Get longest single workout (would need additional query)
          score = metric.totalDistance || 0;
          formattedScore = this.formatDistance(score);
          break;

        case 'Total Workouts':
          score = metric.workoutCount || 0;
          formattedScore = `${score} workouts`;
          break;

        case 'Total Duration':
          score = metric.totalDuration || 0;
          formattedScore = this.formatDuration(score);
          break;

        case 'Most Consistent':
          // Calculate consistency score (workouts per day)
          const daySpan = this.getDaysBetween(parameters.startDate, parameters.endDate);
          score = daySpan > 0 ? (metric.workoutCount / daySpan) * 100 : 0;
          formattedScore = `${Math.round(score)}% consistency`;
          break;

        case 'Weekly Streaks':
          // Would need additional streak calculation
          score = metric.workoutCount || 0;
          formattedScore = `${score} week streak`;
          break;

        case 'Personal Records':
          // Count PRs achieved
          score = 0; // Would need PR tracking
          formattedScore = `${score} PRs`;
          break;

        default:
          score = metric.totalDistance || 0;
          formattedScore = this.formatDistance(score);
      }

      return {
        npub: metric.npub,
        name: participant?.name || this.formatNpub(metric.npub),
        avatar: participant?.avatar || this.generateAvatar(metric.npub),
        rank: 0, // Will be set after sorting
        score,
        formattedScore,
        isTopThree: false, // Will be set after ranking
        workoutCount: metric.workoutCount,
        lastActivity: undefined, // Could be populated from last workout date
      };
    });
  }

  /**
   * Get current rankings for a competition (cached or fresh)
   */
  async getCurrentRankings(competitionId: string): Promise<LeagueRankingResult | null> {
    this.initDatabase(); // Ensure database is initialized
    // Try cache first
    const cached = this.getCachedRankings(competitionId);
    if (cached) {
      return cached;
    }

    // Try database cache
    const dbCached = await this.database.getLeaderboard(competitionId);
    if (dbCached.length > 0) {
      return this.convertDbCacheToRankings(competitionId, dbCached);
    }

    return null;
  }

  /**
   * Update rankings when new workout data arrives
   */
  async updateRankingsForNewWorkout(
    competitionId: string,
    userNpub: string,
    workout: WorkoutRecord
  ): Promise<void> {
    console.log(`🔄 Updating rankings for new workout: ${userNpub.slice(0, 8)}...`);

    // Invalidate cache for this competition
    this.rankingCache.delete(competitionId);

    // Could trigger real-time UI updates here if needed
    console.log(`✅ Rankings cache invalidated for: ${competitionId}`);
  }

  /**
   * Get league summary statistics
   */
  async getLeagueStats(competitionId: string): Promise<{
    totalWorkouts: number;
    totalDistance: number;
    totalDuration: number;
    activeParticipants: number;
  }> {
    this.initDatabase(); // Ensure database is initialized
    // Would aggregate stats from database
    const dbStats = await this.database.getStats();
    
    return {
      totalWorkouts: dbStats.workoutCount,
      totalDistance: 0, // Would need calculation
      totalDuration: 0, // Would need calculation
      activeParticipants: 0, // Would need participant counting
    };
  }

  // ================================================================================
  // PRIVATE HELPER METHODS
  // ================================================================================

  /**
   * Map activity type to workout database type
   */
  private mapActivityTypeToWorkoutType(activityType: NostrActivityType): string {
    const mapping: Record<NostrActivityType, string> = {
      'Running': 'running',
      'Walking': 'walking',
      'Cycling': 'cycling',
      'Strength Training': 'strength_training',
      'Meditation': 'meditation',
      'Yoga': 'yoga',
      'Diet': 'diet',
    };
    
    return mapping[activityType] || 'other';
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

    // Also store in database cache
    const leaderboardEntries = result.rankings.map(ranking => ({
      competitionId,
      npub: ranking.npub,
      score: ranking.score,
      rank: ranking.rank,
    }));

    this.database.updateLeaderboard(leaderboardEntries).catch(error => {
      console.warn('⚠️ Failed to cache leaderboard to database:', error);
    });
  }

  /**
   * Convert database cache to rankings format
   */
  private convertDbCacheToRankings(
    competitionId: string,
    dbCache: LeaderboardCache[]
  ): LeagueRankingResult {
    const rankings: LeagueRankingEntry[] = dbCache.map(entry => ({
      npub: entry.npub,
      name: this.formatNpub(entry.npub),
      avatar: this.generateAvatar(entry.npub),
      rank: entry.rank,
      score: entry.score,
      formattedScore: this.formatDistance(entry.score), // Default formatting
      isTopThree: entry.rank <= 3,
      workoutCount: 0, // Not stored in cache
    }));

    return {
      rankings,
      totalParticipants: dbCache.length,
      lastUpdated: dbCache[0]?.lastCalculated || new Date().toISOString(),
      competitionId,
      isActive: true, // Assume active if cached
    };
  }

  /**
   * Format distance for display
   */
  private formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  }

  /**
   * Format pace for display
   */
  private formatPace(pace: number): string {
    if (!pace || pace === 0) return '0:00/km';
    
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  }

  /**
   * Format duration for display
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  }

  /**
   * Get days between two dates
   */
  private getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Format npub for display
   */
  private formatNpub(npub: string): string {
    return `${npub.slice(0, 8)}...${npub.slice(-4)}`;
  }

  /**
   * Generate avatar from npub
   */
  private generateAvatar(npub: string): string {
    return npub.charAt(4).toUpperCase(); // Simple initial from npub
  }

  /**
   * Clear all ranking caches
   */
  clearCache(): void {
    this.rankingCache.clear();
    console.log('🧹 League ranking cache cleared');
  }
}

export default LeagueRankingService.getInstance();