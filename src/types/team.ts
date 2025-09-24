/**
 * Team and Competition Types
 * TypeScript definitions for teams, leagues, challenges, and events
 */

// Team Core Types
export interface Team {
  id: string;
  name: string;
  description: string;
  captainId: string;
  prizePool: number; // satoshis
  memberCount: number;
  joinReward?: number; // satoshis for joining
  exitFee: number; // default 2000 sats
  sponsoredBy?: string; // "Sponsored by Blockstream"
  avatar?: string;
  createdAt: string;
  isActive: boolean;
  charityId?: string; // ID of the charity this team supports (e.g., 'opensats', 'hrf')
  shopUrl?: string; // Validated marketplace URL (Shopstr or Plebeian Market)
}

// League/Leaderboard Types
export interface League {
  id: string;
  teamId: string;
  name: string;
  metric: 'distance' | 'duration' | 'calories' | 'consistency';
  payoutFrequency: 'daily' | 'weekly' | 'monthly';
  payoutAmount: number; // satoshis per payout
  isActive: boolean;
  createdAt: string;
  lastPayoutAt?: string; // Optional - tracks when last payout occurred
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  rank: number;
  score: number; // Based on league metric
  avatar?: string;
  npub?: string; // User's npub for zapping functionality
}

// Event Types
export interface Event {
  id: string;
  teamId: string;
  name: string;
  description: string;
  type: 'running' | 'cycling' | 'walking' | 'gym' | 'other';
  startDate: string;
  endDate: string;
  prizePool: number; // satoshis
  entryFee?: number; // satoshis, 0 for free events
  isPayToPlay: boolean;
  createdBy: string; // userId
  participants: string[]; // userIds
  status: 'upcoming' | 'active' | 'completed';
}

// Challenge Types
export interface Challenge {
  id: string;
  teamId: string;
  name: string;
  description: string;
  challengerId: string; // User who created challenge
  challengedId: string; // User being challenged
  type: 'running' | 'cycling' | 'walking' | 'gym' | 'other';
  metric: 'distance' | 'time' | 'pace';
  target?: number; // Optional target value
  prizePool: number; // satoshis
  deadline: string; // ISO datetime
  status: 'pending' | 'accepted' | 'active' | 'completed' | 'disputed';
  winnerId?: string;
  createdAt: string;
}

// Team Screen Data
export interface TeamScreenData {
  team: Team;
  leaderboard: LeaderboardEntry[];
  events: Event[];
  challenges: Challenge[];
}

// Team Discovery Types
export type DifficultyLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'elite';

export interface TeamActivity {
  id: string;
  type: 'event' | 'challenge' | 'announcement';
  description: string;
  timestamp: string;
}

export interface TeamStats {
  memberCount: number;
  avgPace: string; // Formatted like "6:45/mi"
  activeEvents: number;
  activeChallenges: number;
}

export interface TeamPayout {
  amount: number; // satoshis
  timestamp: string;
  description: string;
}

export interface DiscoveryTeam extends Team {
  about: string;
  difficulty: DifficultyLevel;
  stats: TeamStats;
  recentActivities: TeamActivity[];
  recentPayout?: TeamPayout;
  isFeatured: boolean;
}

// Team Discovery Management
export interface TeamSearchFilters {
  query?: string;
  difficulty?: DifficultyLevel;
  minPrizePool?: number;
  maxMembers?: number;
  hasRecentActivity?: boolean;
}

export interface TeamJoinResult {
  success: boolean;
  error?: string;
  team?: DiscoveryTeam;
}

// Team Discovery Store State
export interface TeamDiscoveryState {
  teams: DiscoveryTeam[];
  featuredTeams: DiscoveryTeam[];
  userTeam: DiscoveryTeam | null;
  selectedTeam: DiscoveryTeam | null;
  isLoading: boolean;
  isJoining: boolean;
  error: string | null;
  searchFilters: TeamSearchFilters;

  // Actions
  loadTeams: () => Promise<void>;
  searchTeams: (filters: TeamSearchFilters) => Promise<void>;
  joinTeam: (teamId: string, userId: string) => Promise<TeamJoinResult>;
  leaveTeam: (userId: string) => Promise<TeamJoinResult>;
  selectTeam: (team: DiscoveryTeam) => void;
  setSearchFilters: (filters: TeamSearchFilters) => void;
  clearError: () => void;
}

// Formatted Display Types for UI
export interface FormattedEvent {
  id: string;
  name: string;
  date: string; // Formatted date string like "Dec 15"
  details: string;
  prizePoolSats?: number; // Optional prize pool amount in sats
}

export interface FormattedChallenge {
  id: string;
  name: string;
  date: string; // Formatted date string like "Dec 22"
  details: string;
  prize: string; // Formatted prize like "1,000 sats"
  participant1?: string; // For p2p challenges: "Alice"
  participant2?: string; // For p2p challenges: "Bob"
  type?: 'p2p' | 'team'; // Challenge type
}

export interface FormattedLeaderboardEntry {
  userId: string;
  name: string;
  rank: number;
  avatar: string; // Single letter initial
  isTopThree: boolean;
  npub?: string; // User's npub for zapping functionality (not displayed)
}

// Team Creation Wizard Types
export type TeamCreationStep =
  | 'team_basics'
  | 'league_settings'
  | 'first_event'
  | 'wallet_setup'
  | 'review_launch';

export interface TeamCreationData {
  // Team Basics (Step 1)
  teamName: string;
  teamAbout: string;
  charityId?: string; // Selected charity ID (e.g., 'opensats', 'hrf')
  flashUrl?: string; // Flash subscription URL for recurring Bitcoin payments

  // League Settings (Step 2)
  competitionType?: 'streaks' | 'distance' | 'speed';
  duration?: 'weekly' | 'monthly';
  payoutStructure?: 'top3' | 'top5' | 'top10';
  prizePool?: number;

  // First Event (Step 3)
  eventName?: string;
  eventType?: 'streaks' | 'distance' | 'speed';
  eventStartDate?: string;
  eventStartTime?: string;
  eventPrizeAmount?: number;
  eventRepeatWeekly?: boolean;

  // Wallet Setup (Step 4) - Team Wallet
  walletCreated?: boolean;
  walletTeamId?: string;
  walletAddress?: string; // Lightning address
  walletBalance?: number; // Initial balance in sats
}

export interface TeamCreationStepProps {
  data: TeamCreationData;
  onDataChange: (updates: Partial<TeamCreationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Team Helper Types
export type CompetitionType = 'streaks' | 'distance' | 'speed';
export type CompetitionDuration = 'weekly' | 'monthly';
export type PayoutStructure = 'top3' | 'top5' | 'top10';
export type PrizePoolAmount = 5000 | 21000 | 50000;
