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
   * Amount in satoshis sent for first workout of the day
   */
  DAILY_WORKOUT_REWARD: 50,

  /**
   * Step Milestone Rewards
   * Automated rewards for reaching step milestones throughout the day
   */
  STEP_MILESTONE_REWARD: 5,        // sats per 1k steps milestone
  STEP_MILESTONE_INCREMENT: 1000,  // reward every 1,000 steps
  STEP_REWARDS_ENABLED: true,      // toggle to disable step rewards

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
} as const;
