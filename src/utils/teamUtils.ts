/**
 * Team utility functions for captain detection and team management
 * Simple utility functions for common team operations
 */

import type { NostrTeam } from '../services/nostr/NostrTeamService';
import type { DiscoveryTeam } from '../types';

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

  // Handle NostrTeam format (has captainNpub property)
  if ('captainNpub' in team && team.captainNpub) {
    return team.captainNpub === userNpub;
  }

  // Handle NostrTeam format (has captainId property) 
  if ('captainId' in team && team.captainId) {
    return team.captainId === userNpub;
  }

  // Handle DiscoveryTeam format (has captainId property)
  if ('captainId' in team && team.captainId) {
    return team.captainId === userNpub;
  }

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