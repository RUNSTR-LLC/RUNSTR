/**
 * Cache TTL (Time To Live) Constants
 *
 * Centralized configuration for all cache expiration times.
 * Values are in milliseconds.
 *
 * Categories:
 * - STATIC: Data that rarely changes (hours/days)
 * - SEMI_STATIC: Data that changes occasionally (30min-1hr)
 * - DYNAMIC: Data that changes frequently (1-5min)
 * - REAL_TIME: Data that needs to be fresh (no cache or <30s)
 */

// Time unit constants
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Cache TTL configuration
 */
export const CacheTTL = {
  // ============================================================================
  // STATIC DATA - Rarely changes (long TTL)
  // ============================================================================

  /**
   * User profile data (kind 0)
   * Changes when user updates their profile (infrequent)
   */
  USER_PROFILE: 24 * HOUR,

  /**
   * Team metadata (kind 33404)
   * Changes when captain updates team settings (infrequent)
   */
  TEAM_METADATA: 12 * HOUR,

  /**
   * Discovered teams list
   * New teams appear occasionally, existing teams rarely change
   */
  DISCOVERED_TEAMS: 1 * HOUR,

  /**
   * Competition definitions (kind 30100, 30101)
   * Created once, rarely modified
   */
  COMPETITIONS: 1 * HOUR,

  /**
   * League definitions (kind 30100)
   * Long-running competitions with stable rules
   */
  LEAGUES: 2 * HOUR,

  // ============================================================================
  // SEMI-STATIC DATA - Changes occasionally (medium TTL)
  // ============================================================================

  /**
   * Team member lists (kind 30000)
   * Changes when members join/leave (occasional)
   */
  TEAM_MEMBERS: 30 * MINUTE,

  /**
   * User's teams list
   * Changes when user joins/leaves teams (occasional)
   */
  USER_TEAMS: 30 * MINUTE,

  /**
   * Captain status cache
   * Changes when team ownership transfers (rare)
   */
  CAPTAIN_STATUS: 1 * HOUR,

  /**
   * Event definitions (kind 30101)
   * Time-bounded competitions with fixed parameters
   */
  EVENTS: 30 * MINUTE,

  /**
   * User workout history (kind 1301)
   * New workouts added regularly, but historical data is stable
   */
  USER_WORKOUTS: 15 * MINUTE,

  // ============================================================================
  // DYNAMIC DATA - Changes frequently (short TTL)
  // ============================================================================

  /**
   * Team join requests (kind 1104)
   * New requests arrive frequently, captains approve/deny quickly
   */
  JOIN_REQUESTS: 1 * MINUTE,

  /**
   * Event join requests (kind 1105)
   * Similar to team join requests
   */
  EVENT_JOIN_REQUESTS: 1 * MINUTE,

  /**
   * Competition leaderboards
   * Updates as participants post new workouts
   */
  LEADERBOARDS: 5 * MINUTE,

  /**
   * Recent team activity
   * Workouts, joins, announcements - frequently updated
   */
  TEAM_ACTIVITY: 2 * MINUTE,

  /**
   * Wallet info (kind 37375)
   * Balance changes with incoming/outgoing payments
   */
  WALLET_INFO: 1 * MINUTE,

  // ============================================================================
  // REAL-TIME DATA - Needs to be fresh (very short TTL or no cache)
  // ============================================================================

  /**
   * Wallet balance
   * Changes with every payment - needs to be current
   */
  WALLET_BALANCE: 30 * SECOND,

  /**
   * Nutzap events (kind 9321)
   * Incoming payments - must be real-time
   * NOTE: Should bypass cache entirely
   */
  NUTZAPS: 0, // No cache

  /**
   * Live workout tracking
   * Active workout in progress - real-time updates required
   * NOTE: Should bypass cache entirely
   */
  LIVE_WORKOUTS: 0, // No cache

  /**
   * Active challenge updates
   * Real-time competition status
   */
  ACTIVE_CHALLENGES: 15 * SECOND,

  /**
   * Live leaderboards
   * Real-time competition rankings during active events
   */
  LIVE_LEADERBOARDS: 10 * SECOND,

  // ============================================================================
  // SPECIAL CASES
  // ============================================================================

  /**
   * Default TTL for unspecified cache entries
   */
  DEFAULT: 5 * MINUTE,

  /**
   * Error responses
   * Cache failed requests briefly to avoid hammering relays
   */
  ERROR: 10 * SECOND,

  /**
   * Prefetched data during initial load
   * Longer TTL since we loaded everything upfront
   */
  PREFETCH: 1 * HOUR,
} as const;

/**
 * Cache key prefixes for organized namespacing
 */
export const CacheKeys = {
  // User data
  USER_PROFILE: (pubkey: string) => `user_profile_${pubkey}`,
  USER_TEAMS: (pubkey: string) => `user_teams_${pubkey}`,
  USER_WORKOUTS: (pubkey: string) => `user_workouts_${pubkey}`,

  // Team data
  TEAM_METADATA: (teamId: string) => `team_metadata_${teamId}`,
  TEAM_MEMBERS: (teamId: string) => `team_members_${teamId}`,
  TEAM_ACTIVITY: (teamId: string) => `team_activity_${teamId}`,
  JOIN_REQUESTS: (teamId: string) => `join_requests_${teamId}`,

  // Global data
  DISCOVERED_TEAMS: 'discovered_teams',
  COMPETITIONS: 'competitions',
  LEAGUES: 'leagues',

  // Wallet data
  WALLET_INFO: (pubkey: string) => `wallet_info_${pubkey}`,
  WALLET_BALANCE: (pubkey: string) => `wallet_balance_${pubkey}`,

  // Captain data
  CAPTAIN_STATUS: (pubkey: string, teamId: string) => `captain_${pubkey}_${teamId}`,
  CAPTAIN_TEAMS: (pubkey: string) => `captain_teams_${pubkey}`,

  // Competition data
  LEADERBOARD: (competitionId: string) => `leaderboard_${competitionId}`,
  EVENT_PARTICIPANTS: (eventId: string) => `event_participants_${eventId}`,
} as const;

/**
 * Helper to determine if a cache entry should be persisted to AsyncStorage
 * Real-time data (TTL < 1 minute) typically shouldn't be persisted
 */
export function shouldPersist(ttl: number): boolean {
  return ttl >= 1 * MINUTE;
}

/**
 * Helper to get recommended TTL for a cache key
 */
export function getRecommendedTTL(key: string): number {
  // Check key patterns
  if (key.includes('user_profile_')) return CacheTTL.USER_PROFILE;
  if (key.includes('team_metadata_')) return CacheTTL.TEAM_METADATA;
  if (key.includes('team_members_')) return CacheTTL.TEAM_MEMBERS;
  if (key.includes('user_teams_')) return CacheTTL.USER_TEAMS;
  if (key.includes('join_requests_')) return CacheTTL.JOIN_REQUESTS;
  if (key.includes('wallet_balance_')) return CacheTTL.WALLET_BALANCE;
  if (key.includes('wallet_info_')) return CacheTTL.WALLET_INFO;
  if (key.includes('user_workouts_')) return CacheTTL.USER_WORKOUTS;
  if (key.includes('leaderboard_')) return CacheTTL.LEADERBOARDS;
  if (key === 'discovered_teams') return CacheTTL.DISCOVERED_TEAMS;
  if (key === 'competitions') return CacheTTL.COMPETITIONS;

  // Default fallback
  return CacheTTL.DEFAULT;
}
