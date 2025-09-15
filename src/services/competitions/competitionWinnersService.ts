/**
 * Competition Winners Service
 * Reuses existing league ranking logic to display competition winners
 * Provides a simple interface for the CompetitionWinnersCard component
 */

import { LeagueRankingService } from '../competition/leagueRankingService';
import type { CompetitionWinner } from '../../components/team/CompetitionWinnersCard';
import type { LeagueRankingEntry } from '../competition/leagueRankingService';

export class CompetitionWinnersService {
  private static instance: CompetitionWinnersService;
  private rankingService: LeagueRankingService;
  private mockWinnersCache = new Map<string, CompetitionWinner[]>();

  constructor() {
    this.rankingService = LeagueRankingService.getInstance();
  }

  static getInstance(): CompetitionWinnersService {
    if (!CompetitionWinnersService.instance) {
      CompetitionWinnersService.instance = new CompetitionWinnersService();
    }
    return CompetitionWinnersService.instance;
  }

  /**
   * Get competition winners from existing league rankings
   * For MVP, we'll show recent top performers from active competitions
   */
  async fetchTeamCompetitionWinners(teamId: string): Promise<CompetitionWinner[]> {
    console.log(`🏆 Getting competition winners for team: ${teamId}`);

    // For MVP, return mock data showing example winners
    // In production, this would pull from completed competitions
    const mockWinners: CompetitionWinner[] = [
      {
        id: 'winner_1',
        winnerNpub: 'npub1example1',
        winnerName: 'Sarah Runner',
        winnerAvatar: undefined,
        competitionName: 'December Distance Challenge',
        competitionType: 'event',
        satsWon: 50000,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        rank: 1,
      },
      {
        id: 'winner_2',
        winnerNpub: 'npub1example2',
        winnerName: 'Mike Speedster',
        winnerAvatar: undefined,
        competitionName: 'Holiday Hustle League',
        competitionType: 'league',
        satsWon: 30000,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        rank: 1,
      },
      {
        id: 'winner_3',
        winnerNpub: 'npub1example3',
        winnerName: 'Emma Cyclist',
        winnerAvatar: undefined,
        competitionName: 'Weekly Warrior Event',
        competitionType: 'event',
        satsWon: 15000,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        rank: 2,
      },
      {
        id: 'winner_4',
        winnerNpub: 'npub1example4',
        winnerName: 'John Consistent',
        winnerAvatar: undefined,
        competitionName: 'November Consistency League',
        competitionType: 'league',
        satsWon: 75000,
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        rank: 1,
      },
    ];

    // Store in cache for consistency
    this.mockWinnersCache.set(teamId, mockWinners);

    return mockWinners;
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
   * Clear mock data cache
   */
  clearCache(teamId?: string): void {
    if (teamId) {
      this.mockWinnersCache.delete(teamId);
    } else {
      this.mockWinnersCache.clear();
    }
  }
}

export default CompetitionWinnersService.getInstance();