/**
 * rewardTags - Shared helper for building reward routing tags
 *
 * Called by ALL Supabase submission paths (GPS, HealthKit, HealthConnect, manual)
 * to ensure the DB auto-reward trigger sends 100 sats to the right address.
 *
 * Routing logic:
 * - "Self" team → ["lightning", userAddress] → user gets 100 sats
 * - Charity team → ["lightning", charityAddress] → charity gets 100 sats
 * - PPQ.AI team → handled separately via ppq_bolt11 field
 * - No team selected → ["lightning", userAddress] → user gets 100 sats (default)
 *
 * The PostgreSQL trigger (migration 132) extracts ["lightning", "..."] from
 * raw_event.tags and sends 100 sats to that address. Missing tag = no reward.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RewardLightningAddressService } from '../services/rewards/RewardLightningAddressService';
import { getCharityById, isSelfTeam, isPPQTeam, isCommunityTeam, extractCommunityTeamUUID } from '../constants/charities';
import { UserTeamService } from '../services/backend/UserTeamService';
import { PledgeService } from '../services/pledge/PledgeService';
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
        team = await Promise.race([
          UserTeamService.getTeamById(uuid),
          new Promise<null>((resolve) => setTimeout(() => {
            console.warn(`[buildRewardTags] Timed out fetching community team '${uuid}'`);
            resolve(null);
          }, 5000)),
        ]);
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

  // PLEDGE OVERRIDE: If user has an active pledge, route reward to captain's address
  const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
  if (hexPubkey) {
    try {
      const activePledge = await PledgeService.getActivePledge(hexPubkey);
      if (activePledge && activePledge.destinationAddress) {
        console.log(`[buildRewardTags] Active pledge: routing to ${activePledge.destinationName} (${activePledge.destinationAddress})`);
        rewardLightningAddress = activePledge.destinationAddress;
        rewardDestination = 'charity'; // captain treated as charity for routing purposes
      }
    } catch (err) {
      console.warn('[buildRewardTags] Pledge check failed (non-blocking):', err);
    }
  }

  // 1. Lightning address (CRITICAL: DB trigger extracts this tag to send 100 sats)
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

  // 5. Club tag (for club leaderboard grouping)
  // GPS workouts add this separately in workoutPublishingService, but HealthKit/
  // Health Connect/manual submissions go through buildRewardTags() and were missing it.
  const clubTag = await buildClubTag();
  if (clubTag) {
    tags.push(clubTag);
  }

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

/**
 * Get the Lightning address of the user's current club.
 * Used to route 10-sat club rewards per qualified workout.
 * Returns null if user has no club or club has no Lightning address.
 */
export async function getClubLightningAddress(): Promise<string | null> {
  const clubId = await AsyncStorage.getItem('@runstr:club_id');
  if (!clubId) return null;

  if (!isSupabaseConfigured()) return null;

  try {
    // 5s timeout prevents hanging the entire workout submission
    const team = await Promise.race([
      UserTeamService.getTeamById(clubId),
      new Promise<null>((resolve) => setTimeout(() => {
        console.warn(`[getClubLightningAddress] Timed out fetching club ${clubId}`);
        resolve(null);
      }, 5000)),
    ]);
    return team?.lightning_address || null;
  } catch (err) {
    console.warn('[getClubLightningAddress] Failed to fetch club:', err);
    return null;
  }
}
