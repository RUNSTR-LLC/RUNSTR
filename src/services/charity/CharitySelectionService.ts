/**
 * CharitySelectionService - Manages user's charity selection and stats
 * Stores charity preference in AsyncStorage
 * Tracks total sats earned for charity from competition wins
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCharityById, CHARITIES } from '../../constants/charities';
import type { Charity } from '../../constants/charities';

const STORAGE_KEYS = {
  // Must match TeamsScreen storage key for consistency
  SELECTED_CHARITY: '@runstr:selected_team_id',
  CHARITY_STATS: '@runstr:charity_stats',
};

export interface CharityStats {
  totalSatsEarned: number; // Total sats earned for charity from wins
  lastUpdated: number; // Timestamp
}

class CharitySelectionServiceClass {
  private cachedCharity: Charity | null | undefined = undefined;
  private cachedStats: CharityStats | null = null;

  /**
   * Get user's selected charity (returns null if none selected)
   * Users can select/deselect charities in TeamsScreen
   */
  async getSelectedCharity(): Promise<Charity | null> {
    // Return cached charity if available
    if (this.cachedCharity !== undefined) {
      return this.cachedCharity;
    }

    try {
      const charityId = await AsyncStorage.getItem(
        STORAGE_KEYS.SELECTED_CHARITY
      );

      // If no charity selected, return null (selection is optional)
      if (!charityId) {
        this.cachedCharity = null;
        return null;
      }

      // Get charity by stored ID
      const charity = getCharityById(charityId);
      if (charity) {
        this.cachedCharity = charity;
        return charity;
      }

      // Charity ID not found - return null
      this.cachedCharity = null;
      return null;
    } catch (error) {
      console.error('[CharitySelection] Error getting charity:', error);
      return null;
    }
  }

  /**
   * Set user's selected charity
   */
  async setSelectedCharity(charityId: string): Promise<boolean> {
    try {
      const charity = getCharityById(charityId);
      if (!charity) {
        console.error('[CharitySelection] Invalid charity ID:', charityId);
        return false;
      }

      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CHARITY, charityId);
      this.cachedCharity = charity;
      console.log('[CharitySelection] Charity set to:', charity.name);
      return true;
    } catch (error) {
      console.error('[CharitySelection] Error setting charity:', error);
      return false;
    }
  }

  /**
   * Get charity stats (total sats earned)
   */
  async getCharityStats(): Promise<CharityStats> {
    // Return cached stats if available
    if (this.cachedStats) {
      return this.cachedStats;
    }

    try {
      const statsJson = await AsyncStorage.getItem(STORAGE_KEYS.CHARITY_STATS);

      if (!statsJson) {
        const defaultStats = {
          totalSatsEarned: 0,
          lastUpdated: Date.now(),
        };
        this.cachedStats = defaultStats;
        return defaultStats;
      }

      const stats = JSON.parse(statsJson) as CharityStats;
      this.cachedStats = stats;
      return stats;
    } catch (error) {
      console.error('[CharitySelection] Error getting stats:', error);
      const defaultStats = {
        totalSatsEarned: 0,
        lastUpdated: Date.now(),
      };
      return defaultStats;
    }
  }

  /**
   * Add sats earned for charity (when user wins competition/challenge)
   */
  async addSatsEarned(sats: number): Promise<boolean> {
    try {
      const currentStats = await this.getCharityStats();
      const newStats: CharityStats = {
        totalSatsEarned: currentStats.totalSatsEarned + sats,
        lastUpdated: Date.now(),
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.CHARITY_STATS,
        JSON.stringify(newStats)
      );

      // Update cache
      this.cachedStats = newStats;

      console.log(
        '[CharitySelection] Added',
        sats,
        'sats. New total:',
        newStats.totalSatsEarned
      );
      return true;
    } catch (error) {
      console.error('[CharitySelection] Error adding sats:', error);
      return false;
    }
  }

  /**
   * Clear cache (useful when user logs out or switches accounts)
   */
  clearCache(): void {
    this.cachedCharity = undefined;
    this.cachedStats = null;
  }

  /**
   * Get all available charities
   */
  getAllCharities(): Charity[] {
    return CHARITIES;
  }

  /**
   * Get charity options formatted for dropdowns
   */
  getCharityOptions(): Array<{ label: string; value: string }> {
    return CHARITIES.map((charity) => ({
      label: charity.name,
      value: charity.id,
    }));
  }
}

export const CharitySelectionService = new CharitySelectionServiceClass();
export default CharitySelectionService;
