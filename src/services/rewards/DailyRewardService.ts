/**
 * DailyRewardService - Local Tracking for Workout Rewards
 *
 * REWARD FLOW (v3 - External Service):
 * 1. User publishes kind 1301 workout event with reward_destination tag
 * 2. External service monitors Nostr for kind 1301 events
 * 3. External service validates workout, checks anti-cheat, reads reward_destination
 * 4. External service sends 100 sats to user or charity based on tag
 * 5. This service only tracks rewards LOCALLY for UI display
 *
 * ARCHITECTURE (v3):
 * - NWC credentials stored ONLY in external reward service (not Supabase!)
 * - All reward routing info embedded in kind 1301 tags:
 *   - ['reward_destination', 'user' | 'charity']
 *   - ['lightning', 'user@getalby.com']
 *   - ['charity', 'charity-id', 'Charity Name', 'charity@lightning.address']
 * - This service tracks local stats (total earned, weekly earned) for UI
 * - No Supabase calls for payments - external service handles all payments
 *
 * NOTE: Step rewards (5 sats/1k steps) have been REMOVED to simplify fraud detection.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { REWARD_CONFIG, REWARD_STORAGE_KEYS } from '../../config/rewards';
import { RewardDestinationService } from './RewardDestinationService';
import { RewardNotificationManager } from './RewardNotificationManager';
import { DonationTrackingService } from '../donation/DonationTrackingService';
import { PledgeService } from '../pledge/PledgeService';
import { EinundzwanzigService } from '../challenge/EinundzwanzigService';
import { isEinundzwanzigActive, EINUNDZWANZIG_REWARD_CONFIG } from '../../constants/einundzwanzig';
import { nip19 } from '@nostr-dev-kit/ndk';

// Note: Supabase imports removed - rewards are now handled by external service
// The external service monitors kind 1301 events and sends rewards based on tags

// DEBUG FLAG: Set to false for production (only shows debug alerts for failures)
const DEBUG_REWARDS = false;

// In-memory lock to prevent concurrent reward claims (race condition guard)
let _rewardClaimLock = false;

// Workout sources that count as "reward-eligible"
// Includes GPS tracking, manual entry, and health app imports
// Note: 'imported_nostr' excluded - prevents gaming via Nostr syncs
const REWARD_ELIGIBLE_SOURCES = [
  'gps_tracker',
  'manual_entry',
  'healthkit',       // Apple Health imports (source set by healthKitService)
  'health_connect',  // Android Health Connect imports (source set by healthConnectService)
];

// Activity types that qualify for daily rewards
// Cardio, strength, and journal entries earn the daily reward
const REWARD_ELIGIBLE_ACTIVITY_TYPES = ['running', 'walking', 'cycling', 'hiking', 'strength', 'journal'];

// Cardio-only subset used for boosted subscriber rewards (1000 rewards)
const CARDIO_ACTIVITY_TYPES = ['running', 'walking', 'cycling', 'hiking'];

export interface RewardResult {
  success: boolean;
  amount?: number;
  reason?: string;
}

// Import from utility for local use, and re-export for backward compatibility
import { isBoostedQualified as _isBoostedQualified } from '../../utils/rewardEligibility';
export const isBoostedQualified = _isBoostedQualified;

// Diagnostic entry for reward attempts
export interface RewardDiagnosticEntry {
  timestamp: number;
  userPubkey: string;
  action: 'check' | 'send' | 'pledge';
  success: boolean;
  reason?: string;
  amount?: number;
}

// Maximum diagnostic entries to keep
const MAX_REWARD_DIAGNOSTICS = 30;

// Diagnostic buffer for reward attempts (viewable in Settings)
const rewardDiagnosticLog: RewardDiagnosticEntry[] = [];

/**
 * Add a diagnostic entry to the reward log
 */
function addRewardDiagnostic(
  userPubkey: string,
  action: RewardDiagnosticEntry['action'],
  success: boolean,
  reason?: string,
  amount?: number
): void {
  rewardDiagnosticLog.push({
    timestamp: Date.now(),
    userPubkey: userPubkey.slice(0, 8) + '...',
    action,
    success,
    reason,
    amount,
  });

  // Keep only recent entries
  if (rewardDiagnosticLog.length > MAX_REWARD_DIAGNOSTICS) {
    rewardDiagnosticLog.splice(0, rewardDiagnosticLog.length - MAX_REWARD_DIAGNOSTICS);
  }
}

/**
 * Get diagnostics from DailyRewardService
 * Useful for debugging reward issues in Settings
 */
export function getRewardDiagnostics(): {
  rewardAttempts: RewardDiagnosticEntry[];
  serverSidePayments: boolean;
} {
  return {
    rewardAttempts: [...rewardDiagnosticLog],
    serverSidePayments: true, // v3: Payments handled by external service monitoring kind 1301 events
  };
}

/**
 * Service for managing daily workout rewards
 * Tracks eligibility and sends automated payments
 */
class DailyRewardServiceClass {
  /**
   * Check if user can claim reward today
   * Returns true if user hasn't claimed yet today
   */
  async canClaimToday(userPubkey: string): Promise<boolean> {
    try {
      const lastRewardKey = `${REWARD_STORAGE_KEYS.LAST_REWARD_DATE}:${userPubkey}`;
      const lastRewardStr = await AsyncStorage.getItem(lastRewardKey);

      if (!lastRewardStr) {
        // Never claimed before
        return true;
      }

      const lastRewardDate = new Date(lastRewardStr).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      // Can claim if last reward was on a different day
      return lastRewardDate !== today;
    } catch (error) {
      console.error('[Reward] Error checking claim eligibility:', error);
      // If error, assume not eligible (safer)
      return false;
    }
  }

  /**
   * Check if workout should trigger streak reward
   * Only user-generated cardio workouts on a new day trigger rewards
   *
   * This method combines source filtering with atomic "streak incremented today" tracking
   * to prevent race conditions when multiple workouts are saved concurrently.
   *
   * @param userPubkey - User's public key
   * @param workoutSource - The workout.source field (e.g., 'gps_tracker', 'imported_nostr')
   * @param workoutType - The workout.type field (e.g., 'running', 'strength')
   */
  async checkStreakAndReward(
    userPubkey: string,
    workoutSource: string,
    workoutType?: string
  ): Promise<RewardResult> {
    // Step 1: Filter by source - only user-generated workouts
    if (!REWARD_ELIGIBLE_SOURCES.includes(workoutSource)) {
      console.log(`[Reward] Skipping reward for ${workoutSource} (not user-generated)`);
      return { success: false, reason: 'source_not_eligible' };
    }

    // Step 1.5: Filter by activity type - only eligible types earn rewards
    if (workoutType && !REWARD_ELIGIBLE_ACTIVITY_TYPES.includes(workoutType)) {
      console.log(`[Reward] Skipping reward for ${workoutType} (not reward-eligible activity)`);
      return { success: false, reason: 'activity_type_not_eligible' };
    }

    // Step 2: Atomic streak check - only first workout of the day PER USER
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const streakKey = `@runstr:streak_incremented_today:${today}:${userPubkey}`;

    // Rate limit: Only one reward per day per user
    // Use in-memory lock to prevent concurrent execution (race condition guard)
    if (_rewardClaimLock) {
      console.log('[Reward] Reward claim already in progress, skipping');
      return { success: false, reason: 'reward_claim_in_progress' };
    }
    _rewardClaimLock = true;
    try {
      const alreadyIncremented = await AsyncStorage.getItem(streakKey);
      if (alreadyIncremented) {
        console.log('[Reward] Streak already incremented today, skipping reward');
        return { success: false, reason: 'streak_already_incremented' };
      }

      // Step 3: Mark streak as incremented BEFORE sending reward (prevents race condition)
      await AsyncStorage.setItem(streakKey, new Date().toISOString());
      console.log('[Reward] Streak incremented! Triggering daily reward...');

      // Step 4: Send the reward
      return this.sendReward(userPubkey);
    } finally {
      _rewardClaimLock = false;
    }
  }

  /**
   * Get reward destination using unified RewardDestinationService
   *
   * SIMPLIFIED LOGIC:
   * - If user has toggle ON AND has Lightning address → user's address
   * - Otherwise → charity's address (charity is always the fallback)
   *
   * This ensures rewards are never lost - they go to user or their team.
   *
   * ERROR HANDLING:
   * - Returns default charity destination on any error
   * - Errors are logged but don't block reward flow
   */
  private async getRewardDestination(): Promise<{
    address: string;
    isCharity: boolean;
    isPPQ: boolean;
    charityName: string;
    charityId: string;
  }> {
    try {
      return await RewardDestinationService.getDestinationAddress();
    } catch (error) {
      console.error('[DailyReward] Error getting reward destination, using default:', error);
      // Return a safe default - charity fallback ensures rewards aren't lost
      return {
        address: '', // Empty address will be handled by external service
        isCharity: true,
        isPPQ: false,
        charityName: 'RUNSTR',
        charityId: 'runstr',
      };
    }
  }

  /**
   * Record that user claimed reward
   * Saves timestamp for eligibility checking and updates weekly total
   */
  private async recordReward(
    userPubkey: string,
    amount: number
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      const lastRewardKey = `${REWARD_STORAGE_KEYS.LAST_REWARD_DATE}:${userPubkey}`;
      const totalKey = `${REWARD_STORAGE_KEYS.TOTAL_REWARDS_EARNED}:${userPubkey}`;

      // Save last reward date
      await AsyncStorage.setItem(lastRewardKey, now);

      // Update total rewards earned
      const totalStr = await AsyncStorage.getItem(totalKey);
      const currentTotal = totalStr ? parseInt(totalStr) : 0;
      const newTotal = currentTotal + amount;
      await AsyncStorage.setItem(totalKey, newTotal.toString());

      // Update weekly rewards earned
      await this.addWeeklyReward(userPubkey, amount);

      console.log('[Reward] Recorded reward:', {
        user: userPubkey.slice(0, 8) + '...',
        amount,
        totalEarned: newTotal,
      });
    } catch (error) {
      console.error('[Reward] Error recording reward:', error);
    }
  }

  /**
   * Get total rewards earned by user
   * Returns cumulative amount of all rewards
   */
  async getTotalRewardsEarned(userPubkey: string): Promise<number> {
    try {
      const totalKey = `${REWARD_STORAGE_KEYS.TOTAL_REWARDS_EARNED}:${userPubkey}`;
      const totalStr = await AsyncStorage.getItem(totalKey);
      return totalStr ? parseInt(totalStr) : 0;
    } catch (error) {
      console.error('[Reward] Error getting total rewards:', error);
      return 0;
    }
  }

  /**
   * Get current ISO week number (Mon-Sun)
   */
  private getCurrentWeekNumber(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    );
    const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNum}`;
  }

  /**
   * Get weekly rewards earned by user
   * Resets automatically when a new week starts (Monday)
   */
  async getWeeklyRewardsEarned(userPubkey: string): Promise<number> {
    try {
      const weeklyKey = `${REWARD_STORAGE_KEYS.WEEKLY_REWARDS_EARNED}:${userPubkey}`;
      const weekKey = `${REWARD_STORAGE_KEYS.WEEKLY_REWARDS_WEEK}:${userPubkey}`;

      const currentWeek = this.getCurrentWeekNumber();
      const savedWeek = await AsyncStorage.getItem(weekKey);

      // If new week, reset weekly total
      if (savedWeek !== currentWeek) {
        await AsyncStorage.setItem(weekKey, currentWeek);
        await AsyncStorage.setItem(weeklyKey, '0');
        return 0;
      }

      const weeklyStr = await AsyncStorage.getItem(weeklyKey);
      return weeklyStr ? parseInt(weeklyStr) : 0;
    } catch (error) {
      console.error('[Reward] Error getting weekly rewards:', error);
      return 0;
    }
  }

  /**
   * Add to weekly rewards total
   */
  private async addWeeklyReward(
    userPubkey: string,
    amount: number
  ): Promise<void> {
    try {
      const weeklyKey = `${REWARD_STORAGE_KEYS.WEEKLY_REWARDS_EARNED}:${userPubkey}`;
      const weekKey = `${REWARD_STORAGE_KEYS.WEEKLY_REWARDS_WEEK}:${userPubkey}`;
      const currentWeek = this.getCurrentWeekNumber();

      const savedWeek = await AsyncStorage.getItem(weekKey);
      let currentTotal = 0;

      // If same week, get current total
      if (savedWeek === currentWeek) {
        const weeklyStr = await AsyncStorage.getItem(weeklyKey);
        currentTotal = weeklyStr ? parseInt(weeklyStr) : 0;
      } else {
        // New week - save week identifier
        await AsyncStorage.setItem(weekKey, currentWeek);
      }

      const newTotal = currentTotal + amount;
      await AsyncStorage.setItem(weeklyKey, newTotal.toString());

      console.log('[Reward] Updated weekly total:', newTotal, 'sats');
    } catch (error) {
      console.error('[Reward] Error updating weekly rewards:', error);
    }
  }

  // Note: claimRewardViaSupabase, recordCharityPaymentToSupabase, and logCharityPaymentFailure
  // methods have been REMOVED. Rewards are now handled by external service monitoring kind 1301 events.
  // The external service:
  // - Monitors Nostr relays for new kind 1301 events
  // - Reads reward_destination, lightning, and charity tags
  // - Sends 100 sats to appropriate destination (user or charity)
  // - Handles anti-cheat validation, deduplication, and fraud detection

  /**
   * Track reward for pledge destination (captain or charity)
   * Called when user has an active pledge - bypasses normal charity split
   *
   * PLEDGE FLOW (v3 - External Service):
   * Note: Actual payment is handled by external service reading kind 1301 tags
   * This method only handles local tracking and notifications
   *
   * @param userPubkey - User's public key
   * @param pledge - Active pledge from PledgeService
   */
  private async sendPledgeReward(
    userPubkey: string,
    pledge: import('../../types/pledge').Pledge
  ): Promise<RewardResult> {
    try {
      const totalAmount = REWARD_CONFIG.DAILY_WORKOUT_REWARD;

      console.log(
        `[Reward] Tracking pledge reward: ${totalAmount} sats to`,
        pledge.destinationName
      );

      if (DEBUG_REWARDS) {
        Alert.alert(
          'Pledge Reward Debug',
          `Tracking ${totalAmount} sats to:\n` +
            `Destination: ${pledge.destinationName}\n` +
            `Progress: ${pledge.completedWorkouts + 1}/${pledge.totalWorkouts}\n\n` +
            `Note: Actual payment handled by external service`
        );
      }

      // External service handles payment via kind 1301 tags
      // Here we just track locally for UI

      // Increment pledge progress
      const updatedPledge = await PledgeService.incrementPledgeProgress(
        userPubkey
      );

      // Record the reward (for stats - counts as earned even though routed to pledge)
      await this.recordReward(userPubkey, totalAmount);

      // Show notification
      const newCompletedCount = updatedPledge
        ? updatedPledge.completedWorkouts
        : pledge.completedWorkouts + 1;
      const isComplete = newCompletedCount >= pledge.totalWorkouts;

      if (isComplete) {
        console.log('[Reward] Pledge completed!');
      }

      RewardNotificationManager.showPledgeRewardSent(
        totalAmount,
        pledge.eventName,
        pledge.destinationName,
        newCompletedCount,
        pledge.totalWorkouts
      );

      console.log(
        `[Reward] Pledge reward tracked locally:`,
        `${totalAmount} sats to ${pledge.destinationName}`,
        `(${newCompletedCount}/${pledge.totalWorkouts})`
      );

      return {
        success: true,
        amount: totalAmount,
      };
    } catch (error) {
      console.error('[Reward] Error tracking pledge reward:', error);
      return {
        success: false,
        reason: 'pledge_error',
      };
    }
  }

  /**
   * Track reward locally (actual payment handled by external service)
   * Main entry point for reward tracking
   *
   * v3 ARCHITECTURE:
   * - External service reads reward_destination tag from kind 1301 events
   * - External service sends 100 sats to user or charity based on tag
   * - This method ONLY tracks locally for UI display
   *
   * SILENT OPERATION:
   * - Local tracking always succeeds
   * - User sees notification that workout was published
   * - External service handles actual payment (user doesn't wait for it)
   *
   * PLEDGE OVERRIDE:
   * If user has an active pledge, bypasses this flow and calls sendPledgeReward()
   */
  async sendReward(userPubkey: string): Promise<RewardResult> {
    try {
      console.log(
        '[Reward] Tracking reward for',
        userPubkey.slice(0, 8) + '...'
      );

      if (DEBUG_REWARDS) {
        Alert.alert('Reward Debug', `Tracking reward!\n\nUser: ${userPubkey.slice(0, 8)}...\n\nActual payment handled by external service`);
      }

      // Check if user already claimed today (one reward per day limit - local check)
      const canClaim = await this.canClaimToday(userPubkey);
      if (!canClaim) {
        console.log('[Reward] User already claimed today');
        addRewardDiagnostic(userPubkey, 'check', false, 'already_claimed_today');
        if (DEBUG_REWARDS) {
          Alert.alert('Reward Debug', 'Already claimed today - only 1 reward per day allowed');
        }
        return {
          success: false,
          reason: 'already_claimed_today',
        };
      }

      // Get unified reward destination (user OR charity)
      const destination = await this.getRewardDestination();

      // ===== PLEDGE CHECK =====
      // If user has active pledge, route reward to pledge destination
      const activePledge = await PledgeService.getActivePledge(userPubkey);
      if (activePledge) {
        console.log(
          '[Reward] Active pledge found, tracking for:',
          activePledge.destinationName
        );
        return this.sendPledgeReward(userPubkey, activePledge);
      }
      // ===== END PLEDGE CHECK =====

      let totalAmount: number = REWARD_CONFIG.DAILY_WORKOUT_REWARD; // Default 100 sats

      // ===== EINUNDZWANZIG DOUBLE REWARDS =====
      if (isEinundzwanzigActive()) {
        const isInEinundzwanzig = await EinundzwanzigService.hasJoined(userPubkey);
        if (isInEinundzwanzig) {
          totalAmount = 100; // Double reward for Einundzwanzig participants
          console.log('[Reward] Einundzwanzig bonus active: 100 sats');
        }
      }
      // ===== END EINUNDZWANZIG CHECK =====

      const destinationLabel = destination.isPPQ ? 'PPQ.AI' : destination.isCharity ? destination.charityName : 'User';
      console.log('[Reward] Tracking reward locally:', {
        destination: destinationLabel,
        amount: totalAmount,
      });

      if (DEBUG_REWARDS) {
        Alert.alert('Reward Debug',
          `Destination: ${destinationLabel}\n` +
          `Amount: ${totalAmount} sats\n\n` +
          `Note: Payment handled by external service via kind 1301 tags`
        );
      }

      // ===== LOCAL TRACKING (no Supabase calls) =====
      // External service handles actual payment based on kind 1301 tags
      // Here we just track locally for UI display

      // Record the reward amount locally (for stats/UI)
      await this.recordReward(userPubkey, totalAmount);

      // Track charity donations for Impact Level XP (PPQ.AI is not a charity donation)
      if (destination.isCharity && !destination.isPPQ) {
        await DonationTrackingService.recordDonation({
          donorPubkey: userPubkey,
          amount: totalAmount,
          charityId: destination.charityId,
          charityName: destination.charityName,
        });
      }

      // Log success
      addRewardDiagnostic(userPubkey, 'send', true, undefined, totalAmount);
      console.log('[Reward] Reward tracked locally');

      return {
        success: true,
        amount: totalAmount,
      };
    } catch (error) {
      // SILENT FAILURE - just log error
      const errorMsg = error instanceof Error ? error.message : 'unknown_error';
      console.error('[Reward] Error tracking reward (silent):', error);
      addRewardDiagnostic(userPubkey, 'send', false, errorMsg);

      if (DEBUG_REWARDS) {
        Alert.alert('Reward Debug', `Unexpected error!\n\n${error instanceof Error ? error.message : String(error)}`);
      }

      return {
        success: false,
        reason: 'error',
      };
    }
  }

  /**
   * Send reward with workout tags for Einundzwanzig bonus checking
   * Called from SupabaseCompetitionService after successful submission
   *
   * @param npubOrPubkey - User's npub or hex pubkey
   * @param workoutType - Workout type (running, walking, cycling, etc.)
   * @param workoutTags - Nostr event tags for team/bonus detection
   */
  async sendRewardWithTags(
    npubOrPubkey: string,
    workoutType: string,
    workoutTags: string[][]
  ): Promise<RewardResult> {
    // Convert npub to hex pubkey if needed
    let userPubkey = npubOrPubkey;
    if (npubOrPubkey.startsWith('npub')) {
      try {
        const decoded = nip19.decode(npubOrPubkey);
        userPubkey = decoded.data as string;
      } catch (e) {
        console.error('[Reward] Failed to decode npub:', e);
        return { success: false, reason: 'invalid_npub' };
      }
    }

    // Only eligible activity types earn daily rewards
    if (!REWARD_ELIGIBLE_ACTIVITY_TYPES.includes(workoutType)) {
      console.log(`[Reward] Skipping reward for ${workoutType} (not reward-eligible activity)`);
      return { success: false, reason: 'activity_type_not_eligible' };
    }

    console.log('[Reward] sendRewardWithTags called:', {
      pubkey: userPubkey.slice(0, 8) + '...',
      workoutType,
      tagsCount: workoutTags.length,
    });

    // Calculate reward amount (100 sats base, boosted for subscribers)
    const rewardAmount = await this.getRewardAmount(userPubkey, workoutTags);
    console.log(`[Reward] Calculated reward amount: ${rewardAmount} sats`);

    // Call the main reward logic with the calculated amount
    return this.sendRewardWithAmount(userPubkey, rewardAmount);
  }

  /**
   * Get the reward amount based on event bonuses
   * Priority: Einundzwanzig bonus (100) > base (100)
   */
  private async getRewardAmount(
    userPubkey: string,
    workoutTags: string[][]
  ): Promise<number> {
    const baseReward = REWARD_CONFIG.DAILY_WORKOUT_REWARD;

    // Check for Einundzwanzig double rewards bonus
    const hasEinundzwanzigBonus = await this.checkEinundzwanzigBonus(
      userPubkey,
      workoutTags
    );

    if (hasEinundzwanzigBonus) {
      console.log('[Reward] Einundzwanzig bonus active: 100 sats');
      return EINUNDZWANZIG_REWARD_CONFIG.bonusRewardSats; // 100 sats
    }

    return baseReward;
  }

  /**
   * Get the number of boosted rewards claimed this week
   */
  private async getWeeklyBoostCount(): Promise<number> {
    try {
      const weekStart = await AsyncStorage.getItem(REWARD_STORAGE_KEYS.BOOSTED_WEEK_START);
      const now = new Date();
      const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const currentWeekKey = currentWeekStart.toISOString().split('T')[0];

      if (weekStart !== currentWeekKey) {
        // New week — reset counter
        await AsyncStorage.setItem(REWARD_STORAGE_KEYS.BOOSTED_WEEK_START, currentWeekKey);
        await AsyncStorage.setItem(REWARD_STORAGE_KEYS.BOOSTED_COUNT_THIS_WEEK, '0');
        return 0;
      }

      const count = await AsyncStorage.getItem(REWARD_STORAGE_KEYS.BOOSTED_COUNT_THIS_WEEK);
      return parseInt(count || '0', 10);
    } catch {
      return 0;
    }
  }

  /**
   * Increment the weekly boost counter
   */
  private async incrementWeeklyBoostCount(): Promise<void> {
    try {
      const count = await this.getWeeklyBoostCount();
      await AsyncStorage.setItem(REWARD_STORAGE_KEYS.BOOSTED_COUNT_THIS_WEEK, String(count + 1));
    } catch {
      // Silent failure — don't block reward
    }
  }

  /**
   * Check if workout qualifies for Einundzwanzig double rewards
   * Requirements:
   * 1. Challenge dates active (Jan 21 - Feb 21, 2026)
   * 2. User has joined the Einundzwanzig challenge
   * 3. Workout has one of the 3 featured team tags
   */
  private async checkEinundzwanzigBonus(
    userPubkey: string,
    workoutTags: string[][]
  ): Promise<boolean> {
    // 1. Check if within challenge dates
    if (!isEinundzwanzigActive()) {
      return false;
    }

    // 2. Check if user has joined the challenge
    const hasJoined = await EinundzwanzigService.hasJoined(userPubkey);
    if (!hasJoined) {
      return false;
    }

    // 3. Check if workout has one of the 3 featured team tags
    const teamTag = workoutTags.find(t => t[0] === 'team');
    const teamId = teamTag?.[1];

    if (!teamId) {
      console.log('[Reward] No team tag found - no Einundzwanzig bonus');
      return false;
    }

    const featuredTeams = EINUNDZWANZIG_REWARD_CONFIG.featuredTeams;
    const hasFeaturedTeam = featuredTeams.includes(teamId as typeof featuredTeams[number]);

    if (!hasFeaturedTeam) {
      console.log(`[Reward] Team ${teamId} is not a featured team - no Einundzwanzig bonus`);
      return false;
    }

    console.log(`[Reward] Einundzwanzig bonus qualifies: joined + featured team ${teamId}`);
    return true;
  }

  /**
   * Internal method to track reward with a specific amount (local tracking only)
   * Uses unified binary toggle for destination
   *
   * v3: Actual payment handled by external service reading kind 1301 tags
   */
  private async sendRewardWithAmount(
    userPubkey: string,
    totalAmount: number
  ): Promise<RewardResult> {
    try {
      console.log(
        '[Reward] Tracking reward for',
        userPubkey.slice(0, 8) + '...',
        `(${totalAmount} sats)`
      );

      if (DEBUG_REWARDS) {
        Alert.alert('Reward Debug', `Tracking reward!\n\nUser: ${userPubkey.slice(0, 8)}...\nAmount: ${totalAmount} sats\n\nPayment via external service`);
      }

      // Check if user already claimed today (one reward per day limit)
      const canClaim = await this.canClaimToday(userPubkey);
      if (!canClaim) {
        console.log('[Reward] User already claimed today');
        addRewardDiagnostic(userPubkey, 'check', false, 'already_claimed_today');
        if (DEBUG_REWARDS) {
          Alert.alert('Reward Debug', 'Already claimed today - only 1 reward per day allowed');
        }
        return {
          success: false,
          reason: 'already_claimed_today',
        };
      }

      // Get unified reward destination (user OR charity)
      const destination = await this.getRewardDestination();

      // ===== PLEDGE CHECK =====
      // If user has active pledge, route reward to pledge destination
      const activePledge = await PledgeService.getActivePledge(userPubkey);
      if (activePledge) {
        console.log(
          '[Reward] Active pledge found, tracking for:',
          activePledge.destinationName
        );
        return this.sendPledgeReward(userPubkey, activePledge);
      }
      // ===== END PLEDGE CHECK =====

      const destinationLabel = destination.isPPQ ? 'PPQ.AI' : destination.isCharity ? destination.charityName : 'User';
      console.log('[Reward] Tracking reward locally:', {
        destination: destinationLabel,
        amount: totalAmount,
      });

      // ===== LOCAL TRACKING (no Supabase calls) =====
      // External service handles actual payment based on kind 1301 tags

      // Record the reward amount locally (for stats/UI)
      await this.recordReward(userPubkey, totalAmount);

      // Track charity donations for Impact Level XP (PPQ.AI is not a charity donation)
      if (destination.isCharity && !destination.isPPQ) {
        await DonationTrackingService.recordDonation({
          donorPubkey: userPubkey,
          amount: totalAmount,
          charityId: destination.charityId,
          charityName: destination.charityName,
        });
      }

      // Log success
      addRewardDiagnostic(userPubkey, 'send', true, undefined, totalAmount);
      console.log('[Reward] Reward tracked locally');

      return {
        success: true,
        amount: totalAmount,
      };
    } catch (error) {
      // SILENT FAILURE - just log error
      const errorMsg = error instanceof Error ? error.message : 'unknown_error';
      console.error('[Reward] Error tracking reward (silent):', error);
      addRewardDiagnostic(userPubkey, 'send', false, errorMsg);

      if (DEBUG_REWARDS) {
        Alert.alert('Reward Debug', `Unexpected error!\n\n${error instanceof Error ? error.message : String(error)}`);
      }

      return {
        success: false,
        reason: 'error',
      };
    }
  }

  /**
   * Check reward eligibility without sending
   * Useful for UI to show "Earn X sats" prompts
   *
   * Note: With the simplified reward system, there's always a valid destination
   * (charity fallback), so eligibility is primarily about daily limit.
   */
  async checkEligibility(userPubkey: string): Promise<{
    eligible: boolean;
    reason?: string;
    nextEligibleTime?: Date;
  }> {
    try {
      const canClaim = await this.canClaimToday(userPubkey);

      if (!canClaim) {
        // Calculate next eligible time (tomorrow midnight)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        return {
          eligible: false,
          reason: 'already_claimed_today',
          nextEligibleTime: tomorrow,
        };
      }

      return {
        eligible: true,
      };
    } catch (error) {
      console.error('[Reward] Error checking eligibility:', error);
      return {
        eligible: false,
        reason: 'error',
      };
    }
  }
}

// Export singleton instance
export const DailyRewardService = new DailyRewardServiceClass();
export default DailyRewardService;
