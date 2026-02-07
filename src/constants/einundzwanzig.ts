/**
 * Einundzwanzig Fitness Challenge Configuration
 *
 * A team-based charity fundraiser for the Einundzwanzig community
 * (German-speaking Bitcoin community). Participants select a charity
 * and their running/walking distance contributes to that charity's total.
 *
 * Einundzwanzig donates sats proportional to total distance.
 *
 * Production dates: January 21 - February 21, 2026
 */

// ============================================
// Demo Mode & Competition ID
// ============================================

/**
 * Demo mode - Simulates an active event (started 10 days ago)
 * Set to true during development, false for production
 *
 * When enabled:
 * - Start date shifts to 10 days ago
 * - End date shifts to 21 days from now
 * - Event appears "active" instead of "upcoming"
 * - Uses real EIN competition data (not Season II)
 */
export const EINUNDZWANZIG_DEMO_MODE = false;

// Demo mode dates - pretend event started 10 days ago
const DEMO_START = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
const DEMO_END = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000); // 21 days from now

/**
 * Single Supabase competition ID for combined running+walking leaderboard
 */
export const EINUNDZWANZIG_COMPETITION_ID = 'einundzwanzig';

/**
 * Featured charities for the Einundzwanzig Challenge
 * These 3 charities are highlighted on the detail screen with total distances
 */
export const EINUNDZWANZIG_FEATURED_CHARITIES = [
  'als-foundation',
  'ashigaru',
  'buho-go',
] as const;

// ============================================
// Core Configuration
// ============================================

export interface EinundzwanzigConfig {
  eventId: string;
  eventName: string;
  startDate: Date;
  endDate: Date;
  eligibleActivityTypes: string[];
  satsPerKm: number;
  description: string;
  website: string;
  bannerImage: number;
}

export const EINUNDZWANZIG_CONFIG: EinundzwanzigConfig = {
  eventId: 'einundzwanzig-2026',
  eventName: 'Einundzwanzig Fitness Challenge',
  // Use demo dates when demo mode is enabled, otherwise production dates
  startDate: EINUNDZWANZIG_DEMO_MODE ? DEMO_START : new Date('2026-01-21T00:00:00Z'),
  endDate: EINUNDZWANZIG_DEMO_MODE ? DEMO_END : new Date('2026-02-21T23:59:59Z'),
  eligibleActivityTypes: ['running', 'walking'],
  satsPerKm: 1000, // 1 km = 1,000 sats donated
  description:
    'Run or walk for a cause! Every kilometer you cover earns 1,000 sats for your selected team. Join the Einundzwanzig community in supporting Bitcoin worldwide.',
  website: 'https://einundzwanzig.space',
  bannerImage: require('../../assets/images/einundzwanzig/banner.png'),
};

/**
 * Check if the Einundzwanzig Challenge is currently active
 */
export function isEinundzwanzigActive(): boolean {
  const now = new Date();
  return (
    now >= EINUNDZWANZIG_CONFIG.startDate &&
    now <= EINUNDZWANZIG_CONFIG.endDate
  );
}

/**
 * Get the current status of the Einundzwanzig Challenge
 */
export function getEinundzwanzigStatus(): 'upcoming' | 'active' | 'ended' {
  const now = new Date();

  if (now < EINUNDZWANZIG_CONFIG.startDate) {
    return 'upcoming';
  }

  if (now > EINUNDZWANZIG_CONFIG.endDate) {
    return 'ended';
  }

  return 'active';
}

/**
 * Get Unix timestamp for start date (for Nostr queries)
 */
export function getEinundzwanzigStartTimestamp(): number {
  return Math.floor(EINUNDZWANZIG_CONFIG.startDate.getTime() / 1000);
}

/**
 * Get Unix timestamp for end date (for Nostr queries)
 */
export function getEinundzwanzigEndTimestamp(): number {
  return Math.floor(EINUNDZWANZIG_CONFIG.endDate.getTime() / 1000);
}

/**
 * Check if an activity type is eligible for the challenge
 */
export function isEligibleActivityType(activityType: string): boolean {
  return EINUNDZWANZIG_CONFIG.eligibleActivityTypes.includes(
    activityType.toLowerCase()
  );
}

/**
 * Get days remaining until challenge ends
 */
export function getDaysRemaining(): number {
  const now = new Date();
  const end = EINUNDZWANZIG_CONFIG.endDate;

  if (now >= end) {
    return 0;
  }

  const diffMs = end.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get days until challenge starts
 */
export function getDaysUntilStart(): number {
  const now = new Date();
  const start = EINUNDZWANZIG_CONFIG.startDate;

  if (now >= start) {
    return 0;
  }

  const diffMs = start.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get days since challenge started
 */
export function getDaysSinceStart(): number {
  const now = new Date();
  const start = EINUNDZWANZIG_CONFIG.startDate;

  if (now < start) {
    return 0;
  }

  const diffMs = now.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate estimated sats from total distance
 */
export function calculateSatsFromDistance(distanceKm: number): number {
  return Math.floor(distanceKm * EINUNDZWANZIG_CONFIG.satsPerKm);
}

// ============================================
// Double Rewards Configuration
// ============================================

/**
 * Einundzwanzig participants with featured team tags earn double rewards (100 sats)
 * instead of the standard 50 sats per daily workout during the challenge period.
 */
export const EINUNDZWANZIG_REWARD_CONFIG = {
  baseRewardSats: 50,
  bonusRewardSats: 100,
  requiresFeaturedTeam: true,
  featuredTeams: EINUNDZWANZIG_FEATURED_CHARITIES,
} as const;

// ============================================
// Payout Configuration
// ============================================

/**
 * Storage keys for payout tracking
 */
export const EINUNDZWANZIG_PAYOUT_KEY = '@runstr:einundzwanzig_payout_completed';
export const EINUNDZWANZIG_PAYOUT_RESULTS_KEY = '@runstr:einundzwanzig_payout_results';

/**
 * Maximum total payout amount (3M sats cap)
 */
export const EINUNDZWANZIG_MAX_PAYOUT_SATS = 3_000_000;
