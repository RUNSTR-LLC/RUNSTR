/**
 * Team utility functions for captain detection and team management
 * Simple utility functions for common team operations
 */

import type { NostrTeam } from '../services/nostr/NostrTeamService';
import type { DiscoveryTeam } from '../types';
import { nip19 } from 'nostr-tools';

/**
 * Check if a user is the captain of a specific team
 * @param userNpub - User's Nostr public key
 * @param team - Team to check (either NostrTeam or DiscoveryTeam format)
 * @returns Boolean indicating if user is the team captain
 */
export function isTeamCaptain(
  userNpub: string | undefined | null, 
  team: NostrTeam | DiscoveryTeam | undefined | null
): boolean {
  // Early return if missing required data
  if (!userNpub || !team) {
    return false;
  }

  // Extract captain ID from team (try multiple possible field names)
  const captainId = 'captainNpub' in team ? team.captainNpub :
                    'captainId' in team ? team.captainId : null;

  if (!captainId) {
    return false;
  }

  // Handle format conversion between hex and npub
  try {
    // If userNpub is npub format and captainId is hex, convert hex to npub
    if (userNpub.startsWith('npub1') && !captainId.startsWith('npub1') && captainId.length === 64) {
      const captainNpub = nip19.npubEncode(captainId);
      return captainNpub === userNpub;
    }
    
    // If both are same format, direct comparison
    if ((userNpub.startsWith('npub1') && captainId.startsWith('npub1')) ||
        (!userNpub.startsWith('npub1') && !captainId.startsWith('npub1'))) {
      return captainId === userNpub;
    }
    
    // If userNpub is hex and captainId is npub, convert npub to hex
    if (!userNpub.startsWith('npub1') && captainId.startsWith('npub1')) {
      const { data: captainHex } = nip19.decode(captainId);
      return captainHex === userNpub;
    }
  } catch (error) {
    console.error('Error in captain detection format conversion:', error);
    return false;
  }

  return false;
}

/**
 * Check if a user is a member of a specific team
 * @param userNpub - User's Nostr public key
 * @param team - Team to check (either NostrTeam or DiscoveryTeam format)
 * @returns Boolean indicating if user is a team member (includes captain)
 */
export function isTeamMember(
  userNpub: string | undefined | null,
  team: NostrTeam | DiscoveryTeam | undefined | null
): boolean {
  // Early return if missing required data
  if (!userNpub || !team) {
    return false;
  }

  // Captain is always a member
  if (isTeamCaptain(userNpub, team)) {
    return true;
  }

  // TODO: Add actual membership check logic here
  // For now, only captains are considered members
  // This will show "Join Team" for everyone except captains
  return false;
}

/**
 * Extract captain npub from a Nostr team event
 * @param teamEvent - Raw Nostr team event with tags
 * @returns Captain's npub or null if not found
 */
export function getCaptainFromTeamEvent(teamEvent: { tags: string[][] }): string | null {
  const captainTag = teamEvent.tags.find((tag) => tag[0] === 'captain');
  return captainTag ? captainTag[1] : null;
}

/**
 * Check if user is captain of multiple teams from a list
 * @param userNpub - User's Nostr public key  
 * @param teams - Array of teams to check
 * @returns Array of teams where user is captain
 */
export function getCaptainTeams<T extends NostrTeam | DiscoveryTeam>(
  userNpub: string | undefined | null,
  teams: T[]
): T[] {
  if (!userNpub || !teams) {
    return [];
  }

  return teams.filter(team => isTeamCaptain(userNpub, team));
}

/**
 * Count number of teams where user is captain
 * @param userNpub - User's Nostr public key
 * @param teams - Array of teams to check
 * @returns Number of teams where user is captain
 */
export function getCaptainTeamCount(
  userNpub: string | undefined | null,
  teams: (NostrTeam | DiscoveryTeam)[]
): number {
  return getCaptainTeams(userNpub, teams).length;
}