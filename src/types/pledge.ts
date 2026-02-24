/**
 * Pledge System Types
 *
 * Defines the data structures for the workout pledge system.
 * Users pledge future daily rewards (100 sats each) to join events.
 * Pledges route rewards to event creators or charities instead of user's wallet.
 */

/**
 * Pledge - A commitment to route future daily rewards to an event destination
 */
export interface Pledge {
  /** Unique identifier for the pledge */
  id: string;

  /** Event this pledge is for */
  eventId: string;

  /** Human-readable event name for display */
  eventName: string;

  /** User's hex pubkey who made the pledge */
  userPubkey: string;

  /** Total number of daily workouts pledged (e.g., 5) */
  totalWorkouts: number;

  /** Number of workouts completed so far (starts at 0) */
  completedWorkouts: number;

  /** Where rewards are routed: captain or charity */
  destinationType: 'captain' | 'charity';

  /** Lightning address to send rewards to */
  destinationAddress: string;

  /** Human-readable name of recipient (captain name or charity name) */
  destinationName: string;

  /** Unix timestamp when pledge was created */
  createdAt: number;

  /** Unix timestamp when pledge was fulfilled (all workouts completed) */
  completedAt?: number;

  /** Current status of the pledge */
  status: 'active' | 'completed';
}

/**
 * PledgeProgress - Summary of user's current pledge status
 */
export interface PledgeProgress {
  /** Whether user has an active pledge */
  hasActivePledge: boolean;

  /** The active pledge details (if any) */
  pledge?: Pledge;

  /** Number of workouts remaining to complete pledge */
  remainingWorkouts: number;

  /** Completion percentage (0-100) */
  progressPercent: number;
}

/**
 * PledgeDestination - Where pledged rewards should be sent
 */
export interface PledgeDestination {
  /** Type of destination */
  type: 'captain' | 'charity';

  /** Lightning address to receive payments */
  lightningAddress: string;

  /** Display name for the recipient */
  name: string;

  /** If charity, the charity ID for reference */
  charityId?: string;
}

/**
 * CreatePledgeParams - Parameters for creating a new pledge
 */
export interface CreatePledgeParams {
  /** Event ID this pledge is for */
  eventId: string;

  /** Event name for display */
  eventName: string;

  /** Number of daily workouts to pledge */
  totalWorkouts: number;

  /** Where rewards should be routed */
  destination: PledgeDestination;

  /** User's hex pubkey */
  userPubkey: string;
}

/**
 * PledgeEligibility - Result of checking if user can create a pledge
 */
export interface PledgeEligibility {
  /** Whether the user is allowed to create a new pledge */
  allowed: boolean;

  /** Reason if not allowed */
  reason?: 'active_pledge_exists' | 'no_lightning_address' | 'error';

  /** Human-readable message for display */
  message?: string;

  /** Current active pledge if one exists */
  activePledge?: Pledge;
}

/**
 * Event pledge configuration - fields added to event definition
 */
export interface EventPledgeConfig {
  /** Number of daily workouts required to join (0 = free) */
  pledgeCost: number;

  /** Where pledged rewards go */
  pledgeDestination: 'captain' | 'charity';

  /** If charity, which one */
  pledgeCharityId?: string;

  /** Charity name for display */
  pledgeCharityName?: string;

  /** Charity Lightning address */
  pledgeCharityAddress?: string;
}

/**
 * Event rank requirement - fields for rank gating
 */
export interface EventRankRequirement {
  /** Minimum RUNSTR rank score required (e.g., 0.0001 for 'Known') */
  minimumRank: number;

  /** Human-readable tier name ('Emerging', 'New', 'Known', 'Trusted', 'Elite') */
  minimumRankTier: string;
}

/**
 * Rank tier thresholds - matches WoTService.getRankTier()
 */
export const RANK_TIERS = {
  ELITE: { score: 0.01, name: 'Elite' },
  TRUSTED: { score: 0.001, name: 'Trusted' },
  KNOWN: { score: 0.0001, name: 'Known' },
  NEW: { score: 0.00001, name: 'New' },
  EMERGING: { score: 0, name: 'Emerging' },
} as const;

/**
 * Get rank tier info from tier name
 */
export function getRankTierByName(
  tierName: string
): { score: number; name: string } | undefined {
  const tiers = Object.values(RANK_TIERS);
  return tiers.find((tier) => tier.name.toLowerCase() === tierName.toLowerCase());
}

/**
 * Check if a user's rank meets the minimum requirement
 */
export function meetsRankRequirement(
  userRankScore: number | null,
  minimumRank: number
): boolean {
  if (userRankScore === null) return false;
  return userRankScore >= minimumRank;
}
