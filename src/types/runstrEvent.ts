/**
 * RUNSTR Event Types
 *
 * Type definitions for user-created fitness events published as NIP-52 kind 31923 calendar events.
 * These events support configurable leaderboards, payment options, and automated prize payouts.
 */

import type { SatlantisEvent } from './satlantis';

// ============================================================================
// Scoring Types
// ============================================================================

/**
 * Leaderboard scoring types
 * - fastest_time: Race to complete target distance (lowest time wins)
 * - most_distance: Accumulate distance over event duration (highest km wins)
 * - participation: Everyone who completes a qualifying workout is eligible
 */
export type RunstrScoringType = 'fastest_time' | 'most_distance' | 'participation';

// ============================================================================
// Payout Types
// ============================================================================

/**
 * Prize payout schemes
 * - winner_takes_all: 1st place gets 100% (Top 1)
 * - top_3_split: 60% / 25% / 15% split (Top 3)
 * - top_5_split: 40% / 25% / 17% / 11% / 7% split (Top 5)
 * - fixed_amount: Each participant gets fixed sats amount (for Complete scoring)
 */
export type RunstrPayoutScheme =
  | 'winner_takes_all'
  | 'top_3_split'
  | 'top_5_split'
  | 'fixed_amount'
  | 'random_winner';

/**
 * Get valid payout schemes for a scoring type
 * Participation (Complete) scoring only allows fixed_amount
 * Speed/Distance scoring allows Top 1, Top 3, Top 5
 */
export function getValidPayoutSchemes(scoringType: RunstrScoringType): RunstrPayoutScheme[] {
  if (scoringType === 'participation') {
    return ['fixed_amount', 'random_winner'];
  }
  return ['winner_takes_all', 'top_3_split', 'top_5_split'];
}

// ============================================================================
// Pledge System (Entry Cost)
// ============================================================================

/**
 * Pledge cost options for event entry
 * Users pledge X daily workout rewards to join an event
 * Each workout = 100 sats, so 5 workouts = 500 sats pledged
 */
export type RunstrPledgeCost = 1 | 3 | 5 | 7;

/**
 * Where pledged rewards go
 * - captain: Event creator receives the pledged sats
 * - charity: A selected charity receives the pledged sats
 */
export type RunstrPledgeDestination = 'captain' | 'charity';

// Legacy join method type - kept for backward compatibility
export type RunstrJoinMethod = 'open' | 'paid' | 'donation';

// ============================================================================
// Duration Types
// ============================================================================

/**
 * Event duration presets
 * - 1d: 24 hours (default for Speed/Complete)
 * - 1w: 7 days (for Distance competitions)
 * - 1m: 30 days (for Distance competitions)
 */
export type RunstrDuration = '1d' | '1w' | '1m';

/**
 * Get duration in seconds for a duration type
 */
export function getDurationSeconds(duration: RunstrDuration): number {
  switch (duration) {
    case '1d':
      return 24 * 60 * 60; // 86400 (1 day)
    case '1w':
      return 7 * 24 * 60 * 60; // 604800 (1 week)
    case '1m':
      return 30 * 24 * 60 * 60; // 2592000 (1 month)
    default:
      return 24 * 60 * 60; // Default to 1 day
  }
}

/**
 * Get human-readable duration label
 */
export function getDurationLabel(duration: RunstrDuration): string {
  switch (duration) {
    case '1d':
      return '1 Day';
    case '1w':
      return '1 Week';
    case '1m':
      return '1 Month';
    default:
      return '1 Day';
  }
}

// ============================================================================
// Activity Types
// ============================================================================

/**
 * Supported activity types for RUNSTR events
 * These map to kind 1301 workout exercise types
 */
export type RunstrActivityType = 'running' | 'cycling' | 'walking';

/**
 * Get human-readable activity label
 */
export function getActivityLabel(activity: RunstrActivityType): string {
  switch (activity) {
    case 'running':
      return 'Running';
    case 'cycling':
      return 'Cycling';
    case 'walking':
      return 'Walking';
  }
}

// ============================================================================
// Event Configuration
// ============================================================================

/**
 * Configuration for creating a new RUNSTR event
 */
export interface RunstrEventConfig {
  // Basic info
  title: string;
  description?: string;
  location?: string; // Event location (e.g., "Austin, TX" or "Virtual")
  bannerImageUrl?: string; // URL of uploaded banner image

  // Activity
  activityType: RunstrActivityType;

  // Scoring
  scoringType: RunstrScoringType;
  targetDistance?: number; // km (for fastest_time events)
  targetDistanceUnit?: 'km' | 'miles';

  // Payout
  payoutScheme: RunstrPayoutScheme;
  prizePoolSats: number;
  fixedPayoutAmount?: number; // sats per person (for fixed_amount scheme)

  // Entry cost (Pledge system)
  pledgeCost?: number; // Number of daily workouts to commit (1, 3, 5, 7)
  pledgeDestination?: RunstrPledgeDestination; // 'captain' or 'charity'
  pledgeCharityAddress?: string; // Lightning address for charity (if destination is 'charity')
  pledgeCharityName?: string; // Display name for charity

  // Ticketing (pledge-based entry)
  ticketPledgeDays?: number;               // 1-7 workout days as entry fee (captain receives rewards)
  winnerSelection?: 'ranked' | 'random';   // How winner is picked (default: 'ranked')
  qualifyingDistance?: number;              // km — minimum distance to qualify as finisher

  // Legacy join method (kept for backward compatibility)
  joinMethod: RunstrJoinMethod;
  suggestedDonationSats?: number; // Legacy: suggested donation for 'donation' join method

  // Duration
  duration: RunstrDuration;
  startTime: number; // Unix timestamp (seconds)
  endTime: number; // Calculated from duration

  // Payment automation
  creatorHasNWC: boolean; // Creator can auto-payout

  // Impact Level gating (donation-based)
  minimumImpactLevel?: number; // Minimum Impact Level required (e.g., 5 for 'Supporter')
  minimumImpactTier?: string; // Human-readable tier ('Supporter' | 'Contributor' | 'Champion' | 'Legend' | 'Philanthropist')

  // @deprecated - Use minimumImpactLevel/minimumImpactTier instead
  minimumRank?: number; // Legacy WoT score threshold
  minimumRankTier?: string; // Legacy WoT tier name

  // Team competition
  isTeamCompetition: boolean; // Enable team vs team competition mode
}

/**
 * Extended SatlantisEvent with RUNSTR-specific configuration
 */
export interface RunstrEvent extends SatlantisEvent {
  /** RUNSTR-specific configuration parsed from tags */
  runstrConfig?: RunstrEventConfig;

  /** True if event has 'runstr' tag */
  isRunstrEvent: boolean;

  /** Creator's pubkey matches current user */
  isCreator?: boolean;
}

// ============================================================================
// Form State
// ============================================================================

/**
 * Form state for event creation wizard
 */
export interface RunstrEventFormState {
  title: string;
  description: string;
  location: string; // Event location (e.g., "Austin, TX" or "Virtual")
  activityType: RunstrActivityType;
  scoringType: RunstrScoringType;
  targetDistance: string; // String for input field
  duration: RunstrDuration;
  pledgeCost: number; // Number of daily workouts to pledge (1, 3, 5, 7)
  pledgeDestination: RunstrPledgeDestination; // 'captain' or 'charity'
  pledgeCharityId: string | null; // ID of selected charity when destination is 'charity'
  payoutScheme: RunstrPayoutScheme;
  prizePool: string; // String for input field
  fixedPayout: string; // String for input field
  bannerImageUrl: string; // URL of uploaded banner image
  // Impact Level gating (donation-based)
  requireImpactLevel: boolean;
  minimumImpactTier: 'Supporter' | 'Contributor' | 'Champion' | 'Legend' | 'Philanthropist';
  minimumImpactLevel: number; // Level threshold for the tier (5, 10, 20, 50, 100)
  // Legacy fields - kept for backward compatibility
  joinMethod?: RunstrJoinMethod;
  suggestedDonation?: string;
  // Team competition
  isTeamCompetition: boolean; // Enable team vs team competition mode
  // Ticketing
  ticketPledgeDays: number;          // 1-7 workout days as entry fee (0 = free)
  winnerSelection: 'ranked' | 'random';
  qualifyingDistance: string;         // Input field for qualifying distance in km
  // Start date for the event
  startDate: Date | null; // null = starts immediately on creation
}

/**
 * Default form state
 */
export const DEFAULT_FORM_STATE: RunstrEventFormState = {
  title: '',
  description: '',
  location: '', // Empty by default - optional field
  activityType: 'running',
  scoringType: 'fastest_time',
  targetDistance: '5',
  duration: '1d',
  pledgeCost: 1, // Default: 1 daily workout pledge (100 sats)
  pledgeDestination: 'captain', // Default: rewards go to event creator
  pledgeCharityId: null, // No charity selected by default
  payoutScheme: 'winner_takes_all',
  prizePool: '',
  fixedPayout: '',
  bannerImageUrl: '',
  // Impact Level gating defaults (donation-based)
  requireImpactLevel: false,
  minimumImpactTier: 'Supporter',
  minimumImpactLevel: 5,
  // Team competition default
  isTeamCompetition: false,
  // Ticketing defaults
  ticketPledgeDays: 0,
  winnerSelection: 'ranked' as const,
  qualifyingDistance: '',
  // Start date default - today at midnight
  startDate: null,
};

// ============================================================================
// Distance Presets
// ============================================================================

export interface DistancePreset {
  label: string;
  value: number; // km
  tags: string[]; // Additional Nostr tags
}

export const DISTANCE_PRESETS: DistancePreset[] = [
  { label: '5K', value: 5, tags: ['5k'] },
  { label: '10K', value: 10, tags: ['10k'] },
  { label: '21K', value: 21.1, tags: ['half-marathon', 'half'] },
  { label: '42K', value: 42.2, tags: ['marathon'] },
];

// ============================================================================
// Payout Calculations
// ============================================================================

export interface PayoutRecipient {
  npub: string;
  rank: number;
  lightningAddress?: string;
}

export interface PayoutCalculation {
  recipient: PayoutRecipient;
  amountSats: number;
  percentage?: number;
}

/**
 * Calculate payout amounts based on scheme
 */
export function calculatePayouts(
  prizePoolSats: number,
  payoutScheme: RunstrPayoutScheme,
  recipients: PayoutRecipient[],
  fixedAmountPerPerson?: number
): PayoutCalculation[] {
  if (recipients.length === 0 || prizePoolSats <= 0) {
    return [];
  }

  switch (payoutScheme) {
    case 'winner_takes_all': {
      const winner = recipients.find((r) => r.rank === 1);
      if (!winner) return [];
      return [{ recipient: winner, amountSats: prizePoolSats, percentage: 100 }];
    }

    case 'top_3_split': {
      const payouts: PayoutCalculation[] = [];
      const splits = [0.6, 0.25, 0.15];

      for (let rank = 1; rank <= Math.min(3, recipients.length); rank++) {
        const recipient = recipients.find((r) => r.rank === rank);
        if (recipient) {
          const percentage = splits[rank - 1] * 100;
          payouts.push({
            recipient,
            amountSats: Math.floor(prizePoolSats * splits[rank - 1]),
            percentage,
          });
        }
      }
      return payouts;
    }

    case 'top_5_split': {
      const payouts: PayoutCalculation[] = [];
      const splits = [0.40, 0.25, 0.17, 0.11, 0.07]; // 40/25/17/11/7

      for (let rank = 1; rank <= Math.min(5, recipients.length); rank++) {
        const recipient = recipients.find((r) => r.rank === rank);
        if (recipient) {
          const percentage = splits[rank - 1] * 100;
          payouts.push({
            recipient,
            amountSats: Math.floor(prizePoolSats * splits[rank - 1]),
            percentage,
          });
        }
      }
      return payouts;
    }

    case 'random_winner': {
      // Deterministic random: seed from event context, computed at finalization time
      // At calculation time, just show that one winner gets the full pool
      if (recipients.length === 0) return [];
      const winner = recipients[0]; // Actual winner determined at finalization
      return [{ recipient: winner, amountSats: prizePoolSats, percentage: 100 }];
    }

    case 'fixed_amount': {
      if (!fixedAmountPerPerson || fixedAmountPerPerson <= 0) {
        return [];
      }

      // Cap at available prize pool
      const maxRecipients = Math.floor(prizePoolSats / fixedAmountPerPerson);
      const eligibleRecipients = recipients.slice(0, maxRecipients);

      return eligibleRecipients.map((recipient) => ({
        recipient,
        amountSats: fixedAmountPerPerson,
      }));
    }

    default:
      return [];
  }
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate event form state
 */
export function validateEventForm(form: RunstrEventFormState): ValidationError[] {
  const errors: ValidationError[] = [];

  // Title required
  if (!form.title.trim()) {
    errors.push({ field: 'title', message: 'Event name is required' });
  }

  // Distance required for fastest_time
  if (form.scoringType === 'fastest_time') {
    const distance = parseFloat(form.targetDistance);
    if (isNaN(distance) || distance <= 0) {
      errors.push({ field: 'targetDistance', message: 'Target distance is required' });
    }
  }

  // Suggested donation is optional for donation events (soft requirement)
  // No validation error - users can set 0 or leave empty

  // Prize pool validation (optional but if set, must be positive)
  if (form.prizePool) {
    const prizePool = parseInt(form.prizePool, 10);
    if (isNaN(prizePool) || prizePool < 0) {
      errors.push({ field: 'prizePool', message: 'Prize pool must be a positive number' });
    }
  }

  // Fixed payout required if scheme is fixed_amount
  if (form.payoutScheme === 'fixed_amount') {
    const fixedPayout = parseInt(form.fixedPayout, 10);
    if (isNaN(fixedPayout) || fixedPayout <= 0) {
      errors.push({
        field: 'fixedPayout',
        message: 'Fixed payout amount is required',
      });
    }
  }

  // Payout scheme validation for participation (Complete scoring)
  if (
    form.scoringType === 'participation' &&
    form.payoutScheme !== 'fixed_amount'
  ) {
    errors.push({
      field: 'payoutScheme',
      message: 'Complete scoring requires Fixed Amount payout',
    });
  }

  return errors;
}

// ============================================================================
// Team Competition Types
// ============================================================================

/**
 * Leaderboard entry for team competitions
 * Aggregates scores from all team members
 */
export interface TeamLeaderboardEntry {
  /** Position in team leaderboard (1-indexed) */
  rank: number;

  /** Team ID from hardcoded teams */
  teamId: string;

  /** Team display name */
  teamName: string;

  /** Total aggregated score (sum of all member scores) */
  totalScore: number;

  /** Formatted score for display (e.g., "45.23 km" or "2:34:45") */
  formattedScore: string;

  /** Number of team members who contributed workouts */
  memberCount: number;
}
