/**
 * RewardDestinationService - Simplified reward destination routing
 *
 * Routes rewards based on Lightning address presence:
 * - Has Lightning address → rewards go to user
 * - No Lightning address → rewards go to charity
 *
 * This eliminates the need for a toggle - the presence of a Lightning address
 * is the implicit signal for reward routing.
 *
 * IMPORTANT: Charity is ALWAYS the fallback. If user has no Lightning address
 * configured (most users!), rewards automatically go to their selected team.
 * This ensures workouts always contribute value - either to the user or their team.
 *
 * Storage keys:
 * - @runstr:selected_team_id - charity ID (default: 'als-foundation')
 * - @runstr:reward_lightning_address - user's Lightning address for rewards
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCharityById, Charity, CHARITIES, isPPQTeam, isSelfTeam } from '../../constants/charities';
import { RewardLightningAddressService } from './RewardLightningAddressService';

// Storage keys
const SELECTED_TEAM_KEY = '@runstr:selected_team_id';

// Default charity ID (ALS Network - honoring Hal Finney)
const DEFAULT_CHARITY_ID = 'als-foundation';

export interface RewardDestination {
  address: string;      // Lightning address (empty for PPQ.AI - uses bolt11 instead)
  isCharity: boolean;   // true if going to charity
  isPPQ: boolean;       // true if PPQ.AI team (rewards go to bolt11 invoice, not Lightning address)
  charityName: string;  // Team name (for toast), empty if going to user
  charityId: string;    // Charity ID for tracking, empty if going to user
}

class RewardDestinationServiceClass {
  /**
   * Get user's Lightning address from Settings
   * NOTE: Only returns address from Settings input, NOT from Nostr profile
   */
  private async getUserLightningAddress(): Promise<string | null> {
    try {
      return await RewardLightningAddressService.getRewardLightningAddress();
    } catch (error) {
      console.error('[RewardDestination] Error getting user Lightning address:', error);
      return null;
    }
  }

  /**
   * Get selected charity (team)
   * Defaults to ALS Network if no charity selected
   */
  async getSelectedCharity(): Promise<Charity> {
    try {
      const charityId = await AsyncStorage.getItem(SELECTED_TEAM_KEY);
      const charity = getCharityById(charityId || DEFAULT_CHARITY_ID);

      // If charity not found (maybe removed from list), use default
      if (!charity) {
        return getCharityById(DEFAULT_CHARITY_ID) || CHARITIES[0];
      }

      return charity;
    } catch (error) {
      console.error('[RewardDestination] Error getting selected charity:', error);
      return getCharityById(DEFAULT_CHARITY_ID) || CHARITIES[0];
    }
  }

  /**
   * Get the destination Lightning address for rewards
   *
   * ALWAYS returns a valid address - never null.
   *
   * Logic (simplified):
   * - If user has a Lightning address → send to user
   * - No Lightning address → send to charity
   *
   * This ensures rewards are never lost - they either go to the user or their team.
   */
  async getDestinationAddress(): Promise<RewardDestination> {
    const userAddress = await this.getUserLightningAddress();
    const charity = await this.getSelectedCharity();

    // If user has Lightning address or self team → send to user
    if (userAddress && userAddress.length > 0) {
      console.log('[RewardDestination] Routing rewards to user:', userAddress);
      return {
        address: userAddress,
        isCharity: false,
        isPPQ: false,
        charityName: '',
        charityId: '',
      };
    }

    // Self team without Lightning address shouldn't happen (selection requires it),
    // but handle gracefully by falling through to default charity
    if (isSelfTeam(charity.id)) {
      console.warn('[RewardDestination] Self team but no Lightning address - falling to charity');
    }

    // PPQ.AI team: no Lightning address, rewards go via bolt11 invoice
    if (isPPQTeam(charity.id)) {
      console.log('[RewardDestination] Routing rewards to PPQ.AI (bolt11 invoice)');
      return {
        address: '',
        isCharity: false,
        isPPQ: true,
        charityName: charity.name,
        charityId: charity.id,
      };
    }

    // No Lightning address → send to charity
    console.log(
      `[RewardDestination] Routing rewards to charity: ${charity.name} (${charity.lightningAddress})`
    );
    return {
      address: charity.lightningAddress || '',
      isCharity: true,
      isPPQ: false,
      charityName: charity.name,
      charityId: charity.id,
    };
  }

  /**
   * Check if user has a Lightning address configured
   * Used by UI to determine which section to show
   */
  async hasUserLightningAddress(): Promise<boolean> {
    const address = await this.getUserLightningAddress();
    return !!address && address.length > 0;
  }

  /**
   * Check if rewards should be sent to user (vs charity/PPQ.AI)
   * Returns true only if user has a Lightning address configured
   */
  async shouldSendToUser(): Promise<boolean> {
    return this.hasUserLightningAddress();
  }
}

// Export singleton instance
export const RewardDestinationService = new RewardDestinationServiceClass();
export default RewardDestinationService;
