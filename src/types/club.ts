/**
 * Club Types
 * TypeScript definitions for fitness clubs, memberships, and club chat
 */

// Club - maps to user_teams table in Supabase
export interface Club {
  id: string;
  name: string;
  description: string | null;
  lightning_address: string | null;
  created_by_npub: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
  banner_url: string | null;
  leaderboard_metric: 'distance' | 'steps';
}

// Club membership - maps to club_memberships table
export interface ClubMembership {
  id: string;
  club_id: string;
  member_npub: string;
  role: 'member' | 'captain';
  joined_at: string;
}

// Club chat message - maps to club_messages table
export interface ClubMessage {
  id: string;
  club_id: string;
  sender_npub: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
}

// Result type for join/leave operations
export interface ClubJoinResult {
  success: boolean;
  error?: string;
  club?: Club;
}

// User's current club state (cached in AsyncStorage)
export interface ClubState {
  clubId: string;
  clubName: string;
  role: 'member' | 'captain';
}

// Club leaderboard entry
export interface ClubLeaderboardEntry {
  npub: string;
  profile_name: string | null;
  profile_picture: string | null;
  total_distance_km: number;
  workout_count: number;
  rank: number;
}

// Club wallet info (from club-wallet edge function)
export interface ClubWalletInfo {
  lightning_address: string;
  balance_sats: number;
  has_wallet: boolean;
}

// Club payout result (from club_payout_log table)
export interface ClubPayoutResult {
  competition_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'insufficient_funds';
  total_prize_sats: number;
  total_paid_sats: number;
  results: Array<{
    npub: string;
    amount: number;
    rank: number;
    success: boolean;
    error?: string;
  }>;
}
