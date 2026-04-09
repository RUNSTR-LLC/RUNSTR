/**
 * Event Types - NIP-52 Calendar Events
 *
 * Core event type definitions used throughout the RUNSTR event system.
 * - Kind 31923: Calendar event definitions
 * - Kind 31925: RSVPs/attendance
 *
 * RUNSTR events include additional tags for scoring, payouts, and join methods.
 */

import type {
  RunstrScoringType,
  RunstrPayoutScheme,
  RunstrJoinMethod,
  RunstrDuration,
  RunstrActivityType,
} from './runstrEvent';

// Sport types supported by RUNSTR
export type SatlantisSportType =
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'triathlon'
  | 'walking'
  | 'hiking'
  | 'other';

/**
 * Parsed calendar event (kind 31923)
 */
export interface SatlantisEvent {
  /** Event ID (d-tag) */
  id: string;

  /** Organizer's pubkey (hex format) */
  pubkey: string;

  /** Event name/title */
  title: string;

  /** Event description */
  description: string;

  /** Event banner/image URL */
  image?: string;

  /** Physical location */
  location?: string;

  /** Start time (Unix timestamp in seconds) */
  startTime: number;

  /** End time (Unix timestamp in seconds) */
  endTime: number;

  /** Inferred sport type from tags/title */
  sportType: SatlantisSportType;

  /** Target distance in km (if applicable) */
  distance?: number;

  /** Distance unit */
  distanceUnit?: 'km' | 'miles';

  /** All #t tags from the event */
  tags: string[];

  /** Cached participant count (from RSVPs) */
  participantCount?: number;

  /** Raw NDK event for debugging */
  rawEvent?: unknown;

  // ============================================================================
  // RUNSTR-Specific Fields (parsed from events with 'runstr' tag)
  // ============================================================================

  /** True if event has 'runstr' tag - indicates RUNSTR-hosted event */
  isRunstrEvent?: boolean;

  /** Leaderboard scoring type */
  scoringType?: RunstrScoringType;

  /** Prize payout scheme */
  payoutScheme?: RunstrPayoutScheme;

  /** Join method (open, paid, donation) */
  joinMethod?: RunstrJoinMethod;

  /** Suggested donation in satoshis (for donation events) */
  suggestedDonationSats?: number;

  /** @deprecated Use suggestedDonationSats - kept for backward compatibility */
  entryFeeSats?: number;

  /** Total prize pool in satoshis */
  prizePoolSats?: number;

  /** Fixed payout amount per person (for fixed_amount scheme) */
  fixedPayoutSats?: number;

  /** Duration type preset */
  durationType?: RunstrDuration;

  /** Activity type from RUNSTR */
  activityType?: RunstrActivityType;

  /** Whether creator has NWC configured for auto-payout */
  creatorHasNWC?: boolean;

  /** Creator's profile (cached with event for 7 days) */
  creatorProfile?: {
    name: string;
    picture?: string;
  };

  // ============================================================================
  // Pledge/Commitment System Fields
  // ============================================================================

  /** Number of daily workouts to commit (1, 3, 5, 7) */
  pledgeCost?: number;

  /** Where committed rewards are sent */
  pledgeDestination?: 'captain' | 'charity';

  /** Captain's Lightning address (for reward routing when destination is 'captain') */
  captainLightningAddress?: string;

  /** Charity's Lightning address (when destination is 'charity') */
  pledgeCharityAddress?: string;

  /** Charity display name */
  pledgeCharityName?: string;

  // ============================================================================
  // Impact Level Gating Fields (donation-based)
  // ============================================================================

  /** Minimum Impact Level required to join (e.g., 5 for 'Supporter') */
  minimumImpactLevel?: number;

  /** Human-readable Impact tier name ('Supporter' | 'Contributor' | 'Champion' | 'Legend' | 'Philanthropist') */
  minimumImpactTier?: string;

  // ============================================================================
  // Rank Gating Fields (DEPRECATED - kept for backward compatibility)
  // ============================================================================

  /** @deprecated Use minimumImpactLevel - Minimum RUNSTR rank score required to join */
  minimumRank?: number;

  /** @deprecated Use minimumImpactTier - Human-readable rank tier name */
  minimumRankTier?: string;

  // ============================================================================
  // Team Competition Fields
  // ============================================================================

  /** Whether this event uses team competition mode (aggregates scores by team) */
  isTeamCompetition?: boolean;
}

/**
 * RSVP status for kind 31925 events
 */
export type RSVPStatus = 'accepted' | 'declined' | 'tentative';

/**
 * Parsed RSVP event (kind 31925)
 */
export interface SatlantisRSVP {
  /** Participant's pubkey (hex format) */
  pubkey: string;

  /** Reference to the calendar event (a-tag value: 31923:pubkey:d-tag) */
  eventRef: string;

  /** RSVP status */
  status: RSVPStatus;

  /** When the RSVP was created (Unix timestamp) */
  createdAt: number;
}

/**
 * Leaderboard entry for Satlantis events
 */
export interface SatlantisLeaderboardEntry {
  /** Position in leaderboard (1-indexed) */
  rank: number;

  /** Participant's npub */
  npub: string;

  /** Display name (resolved from profile) */
  name: string;

  /** Score value - duration in seconds for fastest time */
  score: number;

  /** Formatted score for display (e.g., "32:45") */
  formattedScore: string;

  /** Number of qualifying workouts */
  workoutCount: number;

  /** Reference to the qualifying workout event ID */
  workoutId?: string;

  /** True if entry is only visible to the participant themselves (non-Season II) */
  isPrivate?: boolean;
}

/**
 * Filter options for event discovery
 */
export interface SatlantisEventFilter {
  /** Filter by sport types */
  sportTypes?: SatlantisSportType[];

  /** Filter by specific tags */
  tags?: string[];

  /** Only events starting after this timestamp */
  startAfter?: number;

  /** Only events starting before this timestamp */
  startBefore?: number;

  /** Only events with a physical location */
  hasLocation?: boolean;

  /** Include past events (default: false, only future) */
  includePast?: boolean;
}

/**
 * Event status based on current time
 */
export type SatlantisEventStatus = 'upcoming' | 'live' | 'ended';

/**
 * Helper to determine event status
 */
export function getEventStatus(event: SatlantisEvent): SatlantisEventStatus {
  const now = Math.floor(Date.now() / 1000);
  if (now < event.startTime) return 'upcoming';
  if (now <= event.endTime) return 'live';
  return 'ended';
}

/**
 * Map Satlantis sport type to RUNSTR activity type for workout queries
 */
export function mapSportToActivityType(sportType: SatlantisSportType): string {
  const mapping: Record<SatlantisSportType, string> = {
    running: 'Running',
    cycling: 'Cycling',
    walking: 'Walking',
    hiking: 'Walking',
    swimming: 'Any', // RUNSTR doesn't track swimming separately
    triathlon: 'Any',
    other: 'Any',
  };
  return mapping[sportType] || 'Any';
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format event date for display
 */
export function formatEventDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format full event date/time for detail view
 */
export function formatEventDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
