/**
 * PledgeService - Manages workout pledge lifecycle
 *
 * Users pledge future daily rewards to join events. This service handles:
 * - Creating pledges when users join paid events
 * - Tracking pledge progress as workouts are completed
 * - Routing rewards to pledge destinations
 * - Enforcing one-pledge-at-a-time rule
 *
 * Storage:
 * - Active pledge: @runstr:active_pledge:{userPubkey}
 * - Pledge history: @runstr:pledge_history:{userPubkey}
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Pledge,
  PledgeProgress,
  CreatePledgeParams,
  PledgeEligibility,
} from '../../types/pledge';
import { RewardLightningAddressService } from '../rewards/RewardLightningAddressService';

// Storage key patterns
const STORAGE_KEYS = {
  ACTIVE_PLEDGE: (pubkey: string) => `@runstr:active_pledge:${pubkey}`,
  PLEDGE_HISTORY: (pubkey: string) => `@runstr:pledge_history:${pubkey}`,
} as const;

// Pledges expire after 30 days to prevent permanent blocking
const PLEDGE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

class PledgeServiceClass {
  /**
   * Get the user's active pledge (if any)
   */
  async getActivePledge(userPubkey: string): Promise<Pledge | null> {
    try {
      const key = STORAGE_KEYS.ACTIVE_PLEDGE(userPubkey);
      const pledgeJson = await AsyncStorage.getItem(key);

      if (!pledgeJson) {
        return null;
      }

      const pledge: Pledge = JSON.parse(pledgeJson);

      // Verify pledge is still active
      if (pledge.status !== 'active') {
        // Clean up stale active pledge
        await AsyncStorage.removeItem(key);
        return null;
      }

      // Auto-expire pledges older than 30 days
      if (Date.now() - pledge.createdAt > PLEDGE_EXPIRY_MS) {
        console.log('[PledgeService] Pledge expired after 30 days:', pledge.id);
        pledge.status = 'completed';
        pledge.completedAt = Date.now();
        await this.addToHistory(userPubkey, pledge);
        await AsyncStorage.removeItem(key);
        return null;
      }

      return pledge;
    } catch (error) {
      console.error('[PledgeService] Error getting active pledge:', error);
      return null;
    }
  }

  /**
   * Check if user can create a new pledge
   * Returns eligibility status with reason if not allowed
   */
  async canCreatePledge(userPubkey: string): Promise<PledgeEligibility> {
    try {
      // Check for existing active pledge
      const activePledge = await this.getActivePledge(userPubkey);
      if (activePledge) {
        return {
          allowed: false,
          reason: 'active_pledge_exists',
          message: `Complete your current pledge for "${activePledge.eventName}" first (${activePledge.completedWorkouts}/${activePledge.totalWorkouts} workouts)`,
          activePledge,
        };
      }

      // Check if user has a lightning address (required to receive rewards after pledge)
      const lightningAddress =
        await RewardLightningAddressService.getRewardLightningAddress();
      if (!lightningAddress) {
        return {
          allowed: false,
          reason: 'no_lightning_address',
          message:
            'Set up a Lightning address in Rewards settings to receive future rewards',
        };
      }

      return {
        allowed: true,
      };
    } catch (error) {
      console.error('[PledgeService] Error checking pledge eligibility:', error);
      return {
        allowed: false,
        reason: 'error',
        message: 'Unable to check pledge eligibility',
      };
    }
  }

  /**
   * Create a new pledge for an event
   * Fails if user already has an active pledge
   */
  async createPledge(params: CreatePledgeParams): Promise<Pledge | null> {
    try {
      const { eventId, eventName, totalWorkouts, destination, userPubkey } =
        params;

      // Verify user can create pledge
      const eligibility = await this.canCreatePledge(userPubkey);
      if (!eligibility.allowed) {
        console.log(
          '[PledgeService] Cannot create pledge:',
          eligibility.message
        );
        return null;
      }

      // Generate unique pledge ID
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const pledgeId = `pledge_${timestamp}_${random}`;

      const pledge: Pledge = {
        id: pledgeId,
        eventId,
        eventName,
        userPubkey,
        totalWorkouts,
        completedWorkouts: 0,
        destinationType: destination.type,
        destinationAddress: destination.lightningAddress,
        destinationName: destination.name,
        createdAt: timestamp,
        status: 'active',
      };

      // Save as active pledge
      const key = STORAGE_KEYS.ACTIVE_PLEDGE(userPubkey);
      await AsyncStorage.setItem(key, JSON.stringify(pledge));

      console.log(
        '[PledgeService] Created pledge:',
        pledgeId,
        'for event:',
        eventName
      );
      return pledge;
    } catch (error) {
      console.error('[PledgeService] Error creating pledge:', error);
      return null;
    }
  }

  /**
   * Increment pledge progress when a daily reward is earned
   * Returns the updated pledge (or null if no active pledge)
   *
   * If pledge is completed, moves it to history
   */
  async incrementPledgeProgress(userPubkey: string): Promise<Pledge | null> {
    try {
      const pledge = await this.getActivePledge(userPubkey);
      if (!pledge) {
        return null;
      }

      // Increment completed workouts
      pledge.completedWorkouts += 1;

      // Check if pledge is now complete
      if (pledge.completedWorkouts >= pledge.totalWorkouts) {
        pledge.status = 'completed';
        pledge.completedAt = Date.now();

        // Move to history
        await this.addToHistory(userPubkey, pledge);

        // Remove from active
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_PLEDGE(userPubkey));

        console.log(
          '[PledgeService] Pledge completed!',
          pledge.id,
          'Total workouts:',
          pledge.totalWorkouts
        );
      } else {
        // Update active pledge
        await AsyncStorage.setItem(
          STORAGE_KEYS.ACTIVE_PLEDGE(userPubkey),
          JSON.stringify(pledge)
        );

        console.log(
          '[PledgeService] Pledge progress:',
          pledge.completedWorkouts,
          '/',
          pledge.totalWorkouts
        );
      }

      return pledge;
    } catch (error) {
      console.error('[PledgeService] Error incrementing pledge:', error);
      return null;
    }
  }

  /**
   * Get pledge progress summary
   */
  async getPledgeProgress(userPubkey: string): Promise<PledgeProgress> {
    const pledge = await this.getActivePledge(userPubkey);

    if (!pledge) {
      return {
        hasActivePledge: false,
        remainingWorkouts: 0,
        progressPercent: 0,
      };
    }

    const remaining = pledge.totalWorkouts - pledge.completedWorkouts;
    const percent = Math.round(
      (pledge.completedWorkouts / pledge.totalWorkouts) * 100
    );

    return {
      hasActivePledge: true,
      pledge,
      remainingWorkouts: remaining,
      progressPercent: percent,
    };
  }

  /**
   * Get pledge history for a user
   * Returns completed pledges, most recent first
   */
  async getPledgeHistory(userPubkey: string): Promise<Pledge[]> {
    try {
      const key = STORAGE_KEYS.PLEDGE_HISTORY(userPubkey);
      const historyJson = await AsyncStorage.getItem(key);

      if (!historyJson) {
        return [];
      }

      const history: Pledge[] = JSON.parse(historyJson);
      // Sort by completedAt descending (most recent first)
      return history.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    } catch (error) {
      console.error('[PledgeService] Error getting pledge history:', error);
      return [];
    }
  }

  /**
   * Add a completed pledge to history
   */
  private async addToHistory(
    userPubkey: string,
    pledge: Pledge
  ): Promise<void> {
    try {
      const history = await this.getPledgeHistory(userPubkey);
      history.unshift(pledge); // Add to beginning

      // Keep only last 50 pledges to prevent unbounded growth
      const trimmedHistory = history.slice(0, 50);

      const key = STORAGE_KEYS.PLEDGE_HISTORY(userPubkey);
      await AsyncStorage.setItem(key, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('[PledgeService] Error adding to history:', error);
    }
  }

  /**
   * Get total sats pledged in history
   * Useful for stats display
   */
  async getTotalSatsPledged(
    userPubkey: string,
    satsPerWorkout: number = 50
  ): Promise<number> {
    const history = await this.getPledgeHistory(userPubkey);
    const activePledge = await this.getActivePledge(userPubkey);

    let total = 0;

    // Add completed pledges
    for (const pledge of history) {
      total += pledge.totalWorkouts * satsPerWorkout;
    }

    // Add completed workouts from active pledge
    if (activePledge) {
      total += activePledge.completedWorkouts * satsPerWorkout;
    }

    return total;
  }

  /**
   * Remove the active pledge only (used for rollback when join fails)
   */
  async clearActivePledge(userPubkey: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_PLEDGE(userPubkey));
      console.log('[PledgeService] Cleared active pledge for', userPubkey.slice(0, 8) + '...');
    } catch (error) {
      console.error('[PledgeService] Error clearing active pledge:', error);
    }
  }

  /**
   * Clear all pledge data for a user (for debugging/testing)
   */
  async clearPledgeData(userPubkey: string): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_PLEDGE(userPubkey)),
        AsyncStorage.removeItem(STORAGE_KEYS.PLEDGE_HISTORY(userPubkey)),
      ]);
      console.log('[PledgeService] Cleared pledge data for', userPubkey);
    } catch (error) {
      console.error('[PledgeService] Error clearing pledge data:', error);
    }
  }
}

// Export singleton instance
export const PledgeService = new PledgeServiceClass();
export default PledgeService;
