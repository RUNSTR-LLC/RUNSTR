/**
 * Rewards Configuration
 * Settings for automated daily workout rewards
 */

export const REWARD_CONFIG = {
  /**
   * Sender NWC Connection String (Fallback only)
   * This is the wallet that sends automated rewards to users
   *
   * SECURITY: Keep plaintext NWC values out of source.
   * Use the encrypted-secrets pipeline (`npm run prebuild:secrets`)
   * and runtime `secretDecryptor` flow instead of client-side env decrypt helpers.
   *
   * This fallback is for local/dev scaffolding only.
   * Never commit actual NWC strings to this file.
   */
  SENDER_NWC: 'nostr+walletconnect://YOUR_NWC_STRING_HERE',

  /**
   * Daily Workout Reward Amount (base / 5K tier)
   * Rewards are distance-tiered — see REWARD_DISTANCE_TIERS and
   * getWorkoutRewardAmount() below, which are the source of truth. This base
   * value (the 5K tier) is retained as a fallback for callers that don't have a
   * distance. The actual payout is made by the external zapper, which these
   * amounts must stay in sync with.
   */
  DAILY_WORKOUT_REWARD: 500,

  /**
   * Minimum Workout Distance for Reward
   * Distance in meters required to qualify for any reward (5K). Workouts below
   * this — including non-GPS activities with no distance — earn nothing.
   */
  MIN_WORKOUT_DISTANCE_METERS: 5000, // 5km minimum (lowest reward tier)

  /**
   * Maximum Rewards Per Day
   * How many times a user can earn rewards in one day
   */
  MAX_REWARDS_PER_DAY: 1,

  /**
   * Reward Eligibility
   * Minimum workout duration to qualify for reward (in seconds)
   */
  MIN_WORKOUT_DURATION: 60, // 1 minute minimum

  /**
   * Retry Configuration
   * If reward payment fails, how many times to retry
   */
  MAX_RETRY_ATTEMPTS: 0, // 0 = no retries (silent failure)
  RETRY_DELAY_MS: 0,

  /**
   * Boosted Rewards (Supporter/Pro subscribers)
   * Subscribers earn 1000 sats per qualifying workout instead of 50
   * Up to 5 boosted workouts per week, then base rate applies
   * Qualifications: running, walking, cycling, pushups, journal, 5k+ steps
   */
  BOOSTED_WORKOUT_REWARD: 1000,           // sats per boosted workout
  BOOSTED_MAX_PER_WEEK: 5,               // max boosted workouts per week

} as const;

/**
 * Distance-tiered workout rewards (highest milestone crossed).
 *
 * A workout earns the reward for the highest distance milestone it passes:
 *   < 5K            → 0    (does not qualify)
 *   5K  – 9.99K     → 500
 *   10K – 21.0K     → 1000
 *   21.1K (half)    → 2100
 *   42.2K (marathon)→ 4200
 *
 * These MUST stay in sync with the external zapper, which is the system that
 * actually pays. Thresholds are in meters; named milestones use 21.1K/42.2K
 * (not the exact 21.0975K/42.195K) to match the zapper.
 *
 * Ordered descending so the first match is the highest milestone crossed.
 */
export const REWARD_DISTANCE_TIERS: ReadonlyArray<{ minMeters: number; reward: number }> = [
  { minMeters: 42200, reward: 4200 }, // Marathon
  { minMeters: 21100, reward: 2100 }, // Half marathon
  { minMeters: 10000, reward: 1000 }, // 10K
  { minMeters: 5000, reward: 500 },   // 5K
];

/**
 * Resolve the reward amount for a workout from its distance.
 * Returns 0 for anything below the 5K minimum (including undefined/0 distance,
 * e.g. non-GPS activities), meaning "no reward".
 *
 * @param distanceMeters Workout distance in meters
 */
export function getWorkoutRewardAmount(distanceMeters?: number | null): number {
  const meters = distanceMeters ?? 0;
  for (const tier of REWARD_DISTANCE_TIERS) {
    if (meters >= tier.minMeters) {
      return tier.reward;
    }
  }
  return 0;
}

/**
 * Storage keys for reward tracking
 */
export const REWARD_STORAGE_KEYS = {
  LAST_REWARD_DATE: '@runstr:last_reward_date',
  REWARD_COUNT_TODAY: '@runstr:reward_count_today',
  TOTAL_REWARDS_EARNED: '@runstr:total_rewards_earned',
  WEEKLY_REWARDS_EARNED: '@runstr:weekly_rewards_earned',
  WEEKLY_REWARDS_WEEK: '@runstr:weekly_rewards_week',
  BOOSTED_COUNT_THIS_WEEK: '@runstr:boosted_count_this_week',
  BOOSTED_WEEK_START: '@runstr:boosted_week_start',
} as const;
