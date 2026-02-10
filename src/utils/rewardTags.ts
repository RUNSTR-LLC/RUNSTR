/**
 * rewardTags - Shared helper for building lightning address + charity tags
 *
 * Called by all Supabase submission paths (GPS, HealthKit foreground, HealthKit background)
 * to ensure the external zapper can find the user's lightning address and charity preference.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RewardLightningAddressService } from '../services/rewards/RewardLightningAddressService';
import { getCharityById } from '../constants/charities';

/**
 * Build reward-related tags (lightning address + charity) for Supabase submissions.
 * Returns tags array like:
 *   [['lightning', 'user@getalby.com'], ['team', 'als-foundation'], ['charity', 'als-foundation', 'ALS Network', 'RunningBTC@primal.net']]
 */
export async function buildRewardTags(): Promise<string[][]> {
  const tags: string[][] = [];

  // Lightning address (for auto-reward trigger)
  const lightningAddress = await RewardLightningAddressService.getRewardLightningAddress();
  if (lightningAddress) {
    tags.push(['lightning', lightningAddress]);
  }

  // Charity tag (for zapper charity routing)
  const selectedTeamId = await AsyncStorage.getItem('@runstr:selected_team_id');
  if (selectedTeamId) {
    tags.push(['team', selectedTeamId]);
    const charity = getCharityById(selectedTeamId);
    if (charity) {
      if (charity.lightningAddress) {
        tags.push(['charity', charity.id, charity.name, charity.lightningAddress]);
      } else {
        tags.push(['charity', charity.id, charity.name]);
      }
    }
  }

  return tags;
}
