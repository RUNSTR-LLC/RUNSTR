/**
 * RUNSTR Season 2 Type Definitions
 *
 * Two-month distance-based competition with charity integration.
 * January 1 - March 1, 2025
 */

export type Season2ActivityType = 'running' | 'walking' | 'cycling';

export interface Season2Participant {
  pubkey: string;
  npub?: string;
  name?: string;
  picture?: string;
  totalDistance: number; // meters
  workoutCount: number;
  charityId?: string;
  charityName?: string;
  isLocalJoin: boolean; // True if user joined locally but not yet on official list
  isPrivateCompetitor?: boolean; // True if user is competing privately (not official participant)
}

export interface Season2Leaderboard {
  activityType: Season2ActivityType;
  participants: Season2Participant[];
  charityRankings: CharityRanking[];
  lastUpdated: number;
  totalParticipants: number;
}

export interface CharityRanking {
  rank: number;
  charityId: string;
  charityName: string;
  lightningAddress?: string;
  totalDistance: number; // kilometers (km)
  participantCount: number; // Number of participants contributing
}

export interface Season2Config {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  entryFeeSats: number;
  prizePoolBonus: number; // sats for bonus giveaway
  prizePoolCharity: number; // sats for charity prizes
  adminPubkey: string;
  participantListDTag: string;
  paymentUrl: string;
}

export interface LocalJoin {
  pubkey: string;
  joinedAt: number; // timestamp
}

// Season status for UI display
export type Season2Status = 'upcoming' | 'active' | 'ended';
