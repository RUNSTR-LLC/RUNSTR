/**
 * Team utility functions for captain detection and team management
 * Simple utility functions for common team operations
 */

import type { NostrTeam } from '../services/nostr/NostrTeamService';
import type { DiscoveryTeam } from '../types';
import { nip19 } from 'nostr-tools';

/**
 * Check if a user is the captain of a specific team
 * @param userNpub - User's Nostr public key (npub or hex format)
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
  // Priority: captain (new field with hex) > captainId > captainNpub (deprecated)
  const captainId = 'captain' in team ? (team as any).captain :
                    'captainId' in team ? team.captainId :
                    'captainNpub' in team ? (team as any).captainNpub : null;

  if (!captainId) {
    return false;
  }

  // Simple string comparison if formats match
  if (captainId === userNpub) {
    return true;
  }

  // Handle format conversion between hex and npub
  try {
    // Convert both to hex for comparison (hex comparison is simpler)
    const userHex = userNpub.startsWith('npub1')
      ? String(nip19.decode(userNpub).data)
      : userNpub;

    const captainHex = captainId.startsWith('npub1')
      ? String(nip19.decode(captainId).data)
      : captainId;

    return userHex === captainHex;
  } catch (error) {
    console.error('Error in captain detection format conversion:', error);
    return false;
  }
}

/**
 * Enhanced captain detection with both npub and hex support
 * Uses the stored hex pubkey for faster comparisons
 * @param userIdentifiers - Object with both npub and hex pubkey
 * @param team - Team to check
 * @returns Boolean indicating if user is the team captain
 */
export function isTeamCaptainEnhanced(
  userIdentifiers: { npub?: string | null; hexPubkey?: string | null } | null,
  team: NostrTeam | DiscoveryTeam | undefined | null
): boolean {
  // Early return if missing required data
  if (!userIdentifiers || !team) {
    return false;
  }

  const { npub, hexPubkey } = userIdentifiers;

  // Need at least one identifier
  if (!npub && !hexPubkey) {
    return false;
  }

  // Extract captain ID from team (try multiple possible field names)
  // Priority: captain (new field with hex) > captainId > captainNpub (deprecated)
  const captainId = 'captain' in team ? (team as any).captain :
                    'captainId' in team ? team.captainId :
                    'captainNpub' in team ? (team as any).captainNpub : null;

  if (!captainId) {
    return false;
  }

  // Direct comparison if we have matching formats
  if (npub && captainId === npub) return true;
  if (hexPubkey && captainId === hexPubkey) return true;

  // If captain ID is in hex format and we have hex
  if (hexPubkey && !captainId.startsWith('npub1') && captainId.length === 64) {
    return hexPubkey === captainId;
  }

  // If captain ID is in npub format and we have npub
  if (npub && captainId.startsWith('npub1')) {
    return npub === captainId;
  }

  // Try format conversion as last resort
  try {
    if (captainId.startsWith('npub1')) {
      // Captain is npub, convert to hex and compare
      const captainHex = String(nip19.decode(captainId).data);
      return hexPubkey === captainHex;
    } else if (captainId.length === 64) {
      // Captain is hex, convert to npub and compare
      const captainNpub = nip19.npubEncode(captainId);
      return npub === captainNpub;
    }
  } catch (error) {
    console.error('Error in enhanced captain detection:', error);
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