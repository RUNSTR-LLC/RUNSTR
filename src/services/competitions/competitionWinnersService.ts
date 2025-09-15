/**
 * Competition Winners Service
 * Fetches real competition winners from completed competitions using Nostr data
 * Integrates with existing ranking services to display actual winners
 */

import { LeagueRankingService } from '../competition/leagueRankingService';
import LeagueDataBridge from '../competition/leagueDataBridge';
import type { CompetitionWinner } from '../../components/team/CompetitionWinnersCard';
import type { LeagueRankingEntry } from '../competition/leagueRankingService';

export class CompetitionWinnersService {
  private static instance: CompetitionWinnersService;
  private rankingService: LeagueRankingService;
  private dataBridge: typeof LeagueDataBridge;
  private winnersCache = new Map<string, CompetitionWinner[]>();
  private cacheExpiry = 300000; // 5 minute cache
  private cacheTimestamps = new Map<string, number>();

  constructor() {
    this.rankingService = LeagueRankingService.getInstance();
    this.dataBridge = LeagueDataBridge;
  }

  static getInstance(): CompetitionWinnersService {
    if (!CompetitionWinnersService.instance) {
      CompetitionWinnersService.instance = new CompetitionWinnersService();
    }
    return CompetitionWinnersService.instance;
  }

  /**
   * Get competition winners from active and recent league rankings
   * Fetches real winners from current competitions via Nostr data
   */
  async fetchTeamCompetitionWinners(teamId: string): Promise<CompetitionWinner[]> {
    console.log(`🏆 Getting competition winners for team: ${teamId}`);

    // Check cache first
    const cached = this.getCachedWinners(teamId);
    if (cached) {
      console.log('✅ Returning cached winners');
      return cached;
    }

    try {
      const winners: CompetitionWinner[] = [];

      // Get active league for the team
      const activeLeague = await this.dataBridge.getActiveLeagueForTeam(teamId);

      if (activeLeague) {
        console.log(`📊 Found active league: ${activeLeague.name}`);

        // Get current rankings
        const rankings = await this.rankingService.calculateLeagueRankings(
          activeLeague.competitionId,
          activeLeague.participants,
          activeLeague.parameters
        );

        // Convert top 3 performers to winners format
        if (rankings && rankings.rankings.length > 0) {
          const topPerformers = rankings.rankings
            .filter(r => r.score > 0)
            .slice(0, 3);

          topPerformers.forEach((entry, index) => {
            winners.push({
              id: `${activeLeague.competitionId}_current_${index}`,
              winnerNpub: entry.npub,
              winnerName: entry.name || 'Anonymous',
              winnerAvatar: entry.avatar,
              competitionName: activeLeague.name || 'Current Competition',
              competitionType: 'league',
              satsWon: 0, // Prize pools hidden for now
              date: new Date().toISOString(),
              rank: index + 1,
            });
          });
        }
      }

      // If no real winners found, return empty array instead of mock data
      if (winners.length === 0) {
        console.log('📭 No competition winners found for team');
      } else {
        console.log(`✅ Found ${winners.length} real winners`);
      }

      // Cache the results
      this.cacheWinners(teamId, winners);
      return winners;

    } catch (error) {
      console.error('❌ Failed to fetch team competition winners:', error);
      // Return empty array on error instead of mock data
      return [];
    }
  }

  /**
   * Calculate prize distribution based on rank
   */
  private calculatePrize(totalPrize: number, rank: number): number {
    const distribution = [0.5, 0.3, 0.2]; // 50% for 1st, 30% for 2nd, 20% for 3rd
    if (rank <= 3) {
      return Math.floor(totalPrize * distribution[rank - 1]);
    }
    return 0;
  }

  /**
   * Check cache for winners
   */
  private getCachedWinners(teamId: string): CompetitionWinner[] | null {
    const cached = this.winnersCache.get(teamId);
    const timestamp = this.cacheTimestamps.get(teamId);

    if (cached && timestamp && Date.now() - timestamp < this.cacheExpiry) {
      return cached;
    }

    return null;
  }

  /**
   * Cache winners data
   */
  private cacheWinners(teamId: string, winners: CompetitionWinner[]): void {
    this.winnersCache.set(teamId, winners);
    this.cacheTimestamps.set(teamId, Date.now());
  }

  /**
   * Convert current league rankings to winner format
   * This can be used when a competition completes
   */
  convertRankingsToWinners(
    rankings: LeagueRankingEntry[],
    competitionName: string,
    competitionType: 'league' | 'event',
    prizePool: number,
    endDate: string
  ): CompetitionWinner[] {
    const winners: CompetitionWinner[] = [];

    // Prize distribution: 50% for 1st, 30% for 2nd, 20% for 3rd
    const prizeDistribution = [0.5, 0.3, 0.2];

    // Get top 3 performers
    const topThree = rankings.slice(0, 3);

    topThree.forEach((entry, index) => {
      if (entry.score > 0) { // Only include if they have a score
        winners.push({
          id: `${competitionName}_winner_${index}`,
          winnerNpub: entry.npub,
          winnerName: entry.name,
          winnerAvatar: entry.avatar,
          competitionName,
          competitionType,
          satsWon: Math.floor(prizePool * prizeDistribution[index]),
          date: endDate,
          rank: index + 1,
        });
      }
    });

    return winners;
  }

  /**
   * Clear winners cache
   */
  clearCache(teamId?: string): void {
    if (teamId) {
      this.winnersCache.delete(teamId);
      this.cacheTimestamps.delete(teamId);
    } else {
      this.winnersCache.clear();
      this.cacheTimestamps.clear();
    }
  }
}

export default CompetitionWinnersService.getInstance();