/**
 * rewardTags - Shared helper for building reward routing tags
 *
 * Called by ALL Supabase submission paths (GPS, HealthKit, HealthConnect, manual)
 * to ensure the DB auto-reward trigger and external services can:
 * 1. Send 50 sats to user's Lightning address (["lightning", "..."] tag)
 * 2. Route charity donations (["charity", id, name, address] tag)
 * 3. Determine reward destination (["reward_destination", "user"|"charity"] tag)
 *
 * The PostgreSQL trigger (migration 127) extracts ["lightning", "..."] from
 * raw_event.tags to auto-send rewards. Missing tag = no reward.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RewardLightningAddressService } from '../services/rewards/RewardLightningAddressService';
import { getCharityById, isSelfTeam, isPPQTeam } from '../constants/charities';

/**
 * Build reward-related tags for Supabase submissions.
 * Returns tags array like:
 *   [['lightning', 'user@getalby.com'], ['team', 'als-foundation'],
 *    ['charity', 'als-foundation', 'ALS Network', 'RunningBTC@primal.net'],
 *    ['reward_destination', 'user']]
 */
export async function buildRewardTags(): Promise<string[][]> {
  const tags: string[][] = [];

  // 1. Lightning address (CRITICAL: DB auto-reward trigger extracts this tag)
  const lightningAddress = await RewardLightningAddressService.getRewardLightningAddress();
  if (lightningAddress) {
    tags.push(['lightning', lightningAddress]);
  } else {
    console.warn('[buildRewardTags] No lightning address set — auto-reward trigger will skip this workout');
  }

  // 2. Team + charity tags (for leaderboard grouping and charity reward routing)
  const selectedTeamId = await AsyncStorage.getItem('@runstr:selected_team_id');
  if (selectedTeamId) {
    tags.push(['team', selectedTeamId]);

    // Only add charity tag for non-self teams
    if (!isSelfTeam(selectedTeamId)) {
      const charity = getCharityById(selectedTeamId);
      if (charity) {
        if (charity.lightningAddress) {
          tags.push(['charity', charity.id, charity.name, charity.lightningAddress]);
        } else {
          tags.push(['charity', charity.id, charity.name]);
        }
      } else {
        console.warn(`[buildRewardTags] getCharityById('${selectedTeamId}') returned undefined — charity tag not added`);
      }
    }
  }

  // 3. Reward destination (tells external services where to route the reward)
  const isSelf = selectedTeamId ? isSelfTeam(selectedTeamId) : false;
  const isPPQ = selectedTeamId ? isPPQTeam(selectedTeamId) : false;
  let rewardDestination: 'user' | 'charity' | 'ppq';
  if (isSelf || lightningAddress) {
    rewardDestination = 'user';
  } else if (isPPQ) {
    rewardDestination = 'ppq';
  } else {
    rewardDestination = 'charity';
  }
  tags.push(['reward_destination', rewardDestination]);

  return tags;
}
