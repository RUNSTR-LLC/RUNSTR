/**
 * Captain Cache Utility
 * Simple caching mechanism for captain status using AsyncStorage
 * This improves reliability and performance of captain detection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CAPTAIN_CACHE_PREFIX = 'captain_';
const CAPTAIN_TEAMS_KEY = 'captain_teams_list';

export class CaptainCache {
  /**
   * Store captain status for a specific team
   */
  static async setCaptainStatus(teamId: string, isCaptain: boolean): Promise<void> {
    try {
      const key = `${CAPTAIN_CACHE_PREFIX}${teamId}`;
      await AsyncStorage.setItem(key, isCaptain ? 'true' : 'false');

      // Also maintain a list of teams where user is captain
      if (isCaptain) {
        const teams = await this.getCaptainTeams();
        if (!teams.includes(teamId)) {
          teams.push(teamId);
          await AsyncStorage.setItem(CAPTAIN_TEAMS_KEY, JSON.stringify(teams));
        }
      } else {
        // Remove from captain teams list
        const teams = await this.getCaptainTeams();
        const filtered = teams.filter(id => id !== teamId);
        await AsyncStorage.setItem(CAPTAIN_TEAMS_KEY, JSON.stringify(filtered));
      }

      console.log(`✅ CaptainCache: Stored captain status for team ${teamId}: ${isCaptain}`);
    } catch (error) {
      console.error('❌ CaptainCache: Error storing captain status:', error);
    }
  }

  /**
   * Get cached captain status for a specific team
   */
  static async getCaptainStatus(teamId: string): Promise<boolean | null> {
    try {
      const key = `${CAPTAIN_CACHE_PREFIX}${teamId}`;
      const value = await AsyncStorage.getItem(key);

      if (value === null) {
        console.log(`🔍 CaptainCache: No cached status for team ${teamId}`);
        return null;
      }

      const isCaptain = value === 'true';
      console.log(`✅ CaptainCache: Retrieved captain status for team ${teamId}: ${isCaptain}`);
      return isCaptain;
    } catch (error) {
      console.error('❌ CaptainCache: Error retrieving captain status:', error);
      return null;
    }
  }

  /**
   * Get list of all teams where user is captain
   */
  static async getCaptainTeams(): Promise<string[]> {
    try {
      const teamsJson = await AsyncStorage.getItem(CAPTAIN_TEAMS_KEY);
      if (teamsJson) {
        return JSON.parse(teamsJson);
      }
      return [];
    } catch (error) {
      console.error('❌ CaptainCache: Error retrieving captain teams:', error);
      return [];
    }
  }

  /**
   * Check if user is captain of any team
   */
  static async isUserCaptainOfAnyTeam(): Promise<boolean> {
    try {
      const teams = await this.getCaptainTeams();
      return teams.length > 0;
    } catch (error) {
      console.error('❌ CaptainCache: Error checking captain status:', error);
      return false;
    }
  }

  /**
   * Clear all captain cache data (useful on logout)
   */
  static async clearCache(): Promise<void> {
    try {
      // Get all keys
      const keys = await AsyncStorage.getAllKeys();

      // Filter captain-related keys
      const captainKeys = keys.filter(key =>
        key.startsWith(CAPTAIN_CACHE_PREFIX) || key === CAPTAIN_TEAMS_KEY
      );

      // Remove all captain keys
      if (captainKeys.length > 0) {
        await AsyncStorage.multiRemove(captainKeys);
        console.log(`✅ CaptainCache: Cleared ${captainKeys.length} cached entries`);
      }
    } catch (error) {
      console.error('❌ CaptainCache: Error clearing cache:', error);
    }
  }

  /**
   * Update captain status from team data
   * This is the main entry point when we have fresh team data from Nostr
   */
  static async updateFromTeamData(
    teamId: string,
    team: any,
    userNpub: string | null | undefined
  ): Promise<boolean> {
    if (!userNpub || !team) {
      return false;
    }

    // Check if user is captain based on team data
    const teamCaptain = team.captain || team.captainId || team.captainNpub;
    const isCaptain = !!(teamCaptain && (
      teamCaptain === userNpub ||
      teamCaptain.toLowerCase() === userNpub.toLowerCase()
    ));

    // Cache the result
    await this.setCaptainStatus(teamId, isCaptain);

    return isCaptain;
  }
}