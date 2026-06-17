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
   * Daily Workout Reward Amount
   * Base reward for the first qualified workout of the day. Drives the
   * "Reward Earned!" banner shown after a workout; the actual payout is made by
   * the external zapper, which this must stay in sync with (currently 50).
   * NOTE: held at 50 — the backend needs work before the increase can go live.
   * Streak bonus applied server-side: 2d +10%, 3d +20%, 4d +30%, 5d+ +40%.
   */
  DAILY_WORKOUT_REWARD: 50,

  /**
   * Minimum Workout Distance for Reward
   * Distance in meters required to qualify for a reward
   */
  MIN_WORKOUT_DISTANCE_METERS: 1000, // 1km minimum

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
