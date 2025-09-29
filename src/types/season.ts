/**
 * RUNSTR Season 1 Type Definitions
 */

export type SeasonActivityType = 'running' | 'walking' | 'cycling';

export interface Season1Participant {
  pubkey: string;
  npub?: string;
  name?: string;
  picture?: string;
  totalDistance: number; // meters
  workoutCount: number;
  lastActivityDate?: string;
  weeklyDistance?: number; // meters in last 7 days
}

export interface Season1Leaderboard {
  activityType: SeasonActivityType;
  participants: Season1Participant[];
  lastUpdated: number;
  totalParticipants: number;
}

export interface Season1Config {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  prizePool: number; // in sats
  adminPubkey: string;
  participantListDTag: string;
  prizeDistribution: {
    first: number; // percentage
    second: number;
    third: number;
  };
}

// Constants
export const SEASON_1_CONFIG: Season1Config = {
  startDate: '2025-07-11T00:00:00Z',  // Official RUNSTR Season 1 start
  endDate: '2025-10-09T23:59:59Z',    // Official RUNSTR Season 1 end
  prizePool: 200000,
  adminPubkey: 'f241654d23b2aede8275dedd1eba1791e292d9ee0d887752e68a404debc888cc',
  participantListDTag: 'runstr-season-1-participants',
  prizeDistribution: {
    first: 33.333, // 66,667 sats per category
    second: 16.667, // 33,333 sats per category
    third: 8.333,   // 16,667 sats per category
  }
};

// Helper to calculate prize for a rank and category
export const calculatePrize = (rank: number): number => {
  const totalPrize = SEASON_1_CONFIG.prizePool;
  const categoryPrize = totalPrize / 3; // Split equally among 3 categories

  switch (rank) {
    case 1:
      return Math.floor(categoryPrize * (SEASON_1_CONFIG.prizeDistribution.first / 100) * 3);
    case 2:
      return Math.floor(categoryPrize * (SEASON_1_CONFIG.prizeDistribution.second / 100) * 3);
    case 3:
      return Math.floor(categoryPrize * (SEASON_1_CONFIG.prizeDistribution.third / 100) * 3);
    default:
      return 0;
  }
};