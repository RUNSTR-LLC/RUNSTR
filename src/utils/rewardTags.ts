/**
 * rewardTags - Shared helper for building reward routing tags
 *
 * Called by ALL Supabase submission paths (GPS, HealthKit, HealthConnect, manual)
 * to ensure the DB auto-reward trigger sends 50 sats to the right address.
 *
 * Routing logic:
 * - "Self" team → ["lightning", userAddress] → user gets 50 sats
 * - Charity team → ["lightning", charityAddress] → charity gets 50 sats
 * - PPQ.AI team → handled separately via ppq_bolt11 field
 * - No team selected → ["lightning", userAddress] → user gets 50 sats (default)
 *
 * The PostgreSQL trigger (migration 132) extracts ["lightning", "..."] from
 * raw_event.tags and sends 50 sats to that address. Missing tag = no reward.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RewardLightningAddressService } from '../services/rewards/RewardLightningAddressService';
import { getCharityById, isSelfTeam, isPPQTeam, isCommunityTeam, extractCommunityTeamUUID } from '../constants/charities';
import { UserTeamService } from '../services/backend/UserTeamService';
import { isSupabaseConfigured } from './supabase';

/**
 * Build reward-related tags for Supabase submissions.
 *
 * The ["lightning"] tag determines WHERE the 50-sat reward goes:
 * - Self team or no team: user's lightning address
 * - Charity team: charity's lightning address
 * - PPQ team: no lightning tag (PPQ uses bolt11 invoice instead)
 */
export async function buildRewardTags(): Promise<string[][]> {
  const tags: string[][] = [];

  const userLightningAddress = await RewardLightningAddressService.getRewardLightningAddress();
  const selectedTeamId = await AsyncStorage.getItem('@runstr:selected_team_id');

  const isSelf = selectedTeamId ? isSelfTeam(selectedTeamId) : false;
  const isPPQ = selectedTeamId ? isPPQTeam(selectedTeamId) : false;
  const isCommunity = selectedTeamId ? isCommunityTeam(selectedTeamId) : false;
  const isCharity = selectedTeamId && !isSelf && !isPPQ && !isCommunity;

  // Determine reward destination and lightning address to pay
  let rewardDestination: 'user' | 'charity' | 'ppq';
  let rewardLightningAddress: string | null = null;

  // Community team name/address for metadata tags
  let communityTeamName: string | null = null;
  let communityTeamLightningAddress: string | null = null;

  if (isPPQ) {
    rewardDestination = 'ppq';
    // PPQ uses bolt11 invoice, not lightning address
  } else if (isCommunity && selectedTeamId) {
    // Community team from Supabase user_teams table
    const uuid = extractCommunityTeamUUID(selectedTeamId);
    let team = null;
    if (isSupabaseConfigured()) {
      try {
        team = await UserTeamService.getTeamById(uuid);
      } catch (err) {
        console.warn(`[buildRewardTags] Failed to fetch community team '${uuid}':`, err);
      }
    }

    if (team?.lightning_address) {
      rewardDestination = 'charity';
      rewardLightningAddress = team.lightning_address;
      communityTeamName = team.name;
      communityTeamLightningAddress = team.lightning_address;
    } else {
      // Community team has no lightning address -- fall back to user
      console.warn(`[buildRewardTags] Community team '${selectedTeamId}' has no lightning address, falling back to user`);
      rewardDestination = 'user';
      rewardLightningAddress = userLightningAddress;
      communityTeamName = team?.name || null;
    }
  } else if (isCharity) {
    const charity = getCharityById(selectedTeamId);
    if (charity?.lightningAddress) {
      rewardDestination = 'charity';
      rewardLightningAddress = charity.lightningAddress;
    } else {
      // Charity has no lightning address -- fall back to user
      console.warn(`[buildRewardTags] Charity '${selectedTeamId}' has no lightning address, falling back to user`);
      rewardDestination = 'user';
      rewardLightningAddress = userLightningAddress;
    }
  } else {
    // Self team, no team, or unknown -- reward goes to user
    rewardDestination = 'user';
    rewardLightningAddress = userLightningAddress;
  }

  // 1. Lightning address (CRITICAL: DB trigger extracts this tag to send 50 sats)
  if (rewardLightningAddress) {
    tags.push(['lightning', rewardLightningAddress]);
  } else if (!isPPQ) {
    console.warn('[buildRewardTags] No lightning address for reward -- auto-reward trigger will skip this workout');
  }

  // 2. Team tag (for leaderboard grouping)
  if (selectedTeamId) {
    tags.push(['team', selectedTeamId]);
  }

  // 3. Charity metadata (for display/audit, not used by trigger)
  if (isCommunity && communityTeamName) {
    // Community team metadata
    if (communityTeamLightningAddress) {
      tags.push(['charity', selectedTeamId!, communityTeamName, communityTeamLightningAddress]);
    } else {
      tags.push(['charity', selectedTeamId!, communityTeamName]);
    }
  } else if (isCharity) {
    const charity = getCharityById(selectedTeamId);
    if (charity) {
      if (charity.lightningAddress) {
        tags.push(['charity', charity.id, charity.name, charity.lightningAddress]);
      } else {
        tags.push(['charity', charity.id, charity.name]);
      }
    }
  }

  // 4. Reward destination (for audit trail and external services)
  tags.push(['reward_destination', rewardDestination]);

  return tags;
}

/**
 * Build the club tag for kind 1301 events.
 * Separate from reward routing -- this is purely for club leaderboard grouping.
 */
export async function buildClubTag(): Promise<string[] | null> {
  const clubId = await AsyncStorage.getItem('@runstr:club_id');
  if (!clubId) return null;
  return ['club', clubId];
}
