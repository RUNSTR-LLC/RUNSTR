/**
 * CaptainDetectionService - Determines if user is captain of teams
 * Integrates with NostrTeamService to check captain status across teams
 * Provides caching for performance optimization
 */

import { NostrTeamService } from '../nostr/NostrTeamService';
import type { NostrTeam } from '../nostr/NostrTeamService';

export interface CaptainStatus {
  isCaptain: boolean;
  captainOfTeams: string[]; // Array of team IDs where user is captain
  lastChecked: number;
}

export class CaptainDetectionService {
  private teamService: NostrTeamService;
  private captainStatusCache: Map<string, CaptainStatus> = new Map();
  private cacheExpiryMs = 5 * 60 * 1000; // 5 minutes cache
  private static instance: CaptainDetectionService;

  constructor(teamService?: NostrTeamService) {
    this.teamService = teamService || new NostrTeamService();
  }

  static getInstance(teamService?: NostrTeamService): CaptainDetectionService {
    if (!CaptainDetectionService.instance) {
      CaptainDetectionService.instance = new CaptainDetectionService(
        teamService
      );
    }
    return CaptainDetectionService.instance;
  }

  /**
   * Check if user is captain of any team
   */
  async isCaptainOfAnyTeam(userPubkey: string): Promise<boolean> {
    const status = await this.getCaptainStatus(userPubkey);
    return status.isCaptain;
  }

  /**
   * Check if user is captain of a specific team
   */
  async isCaptainOfTeam(userPubkey: string, teamId: string): Promise<boolean> {
    const status = await this.getCaptainStatus(userPubkey);
    return status.captainOfTeams.includes(teamId);
  }

  /**
   * Get comprehensive captain status for user
   */
  async getCaptainStatus(userPubkey: string): Promise<CaptainStatus> {
    // Check cache first
    const cached = this.captainStatusCache.get(userPubkey);
    if (cached && this.isCacheValid(cached.lastChecked)) {
      return cached;
    }

    console.log(`🔍 Checking captain status for: ${userPubkey.slice(0, 8)}...`);

    try {
      // Get all teams and check which ones user captains
      const allTeams = await this.teamService.discoverFitnessTeams({
        limit: 100, // Check recent teams
      });

      const captainOfTeams: string[] = [];

      for (const team of allTeams) {
        if (team.captainId === userPubkey) {
          captainOfTeams.push(team.id);
        }
      }

      const status: CaptainStatus = {
        isCaptain: captainOfTeams.length > 0,
        captainOfTeams,
        lastChecked: Date.now(),
      };

      // Cache the result
      this.captainStatusCache.set(userPubkey, status);

      console.log(
        `✅ Captain status: ${status.isCaptain ? 'YES' : 'NO'} (${
          captainOfTeams.length
        } teams)`
      );
      return status;
    } catch (error) {
      console.error('Failed to check captain status:', error);

      // Return cached result if available, otherwise false
      if (cached) {
        return cached;
      }

      return {
        isCaptain: false,
        captainOfTeams: [],
        lastChecked: Date.now(),
      };
    }
  }

  /**
   * Get teams where user is captain
   */
  async getCaptainTeams(userPubkey: string): Promise<NostrTeam[]> {
    try {
      const allTeams = await this.teamService.discoverFitnessTeams({
        limit: 100,
      });

      return allTeams.filter((team) => team.captainId === userPubkey);
    } catch (error) {
      console.error('Failed to get captain teams:', error);
      return [];
    }
  }

  /**
   * Get user's primary captain team (first team they captain)
   */
  async getPrimaryCaptainTeam(userPubkey: string): Promise<NostrTeam | null> {
    const captainTeams = await this.getCaptainTeams(userPubkey);
    return captainTeams[0] || null;
  }

  /**
   * Force refresh captain status (bypass cache)
   */
  async refreshCaptainStatus(userPubkey: string): Promise<CaptainStatus> {
    // Clear cache for this user
    this.captainStatusCache.delete(userPubkey);

    // Get fresh status
    return await this.getCaptainStatus(userPubkey);
  }

  /**
   * Subscribe to team updates to invalidate captain status cache
   * TODO: Implement when NostrTeamService has subscription support
   */
  async subscribeToTeamUpdates(userPubkey: string): Promise<string> {
    console.log(
      `🔔 Subscribing to team updates for captain detection: ${userPubkey.slice(
        0,
        8
      )}...`
    );

    // TODO: Subscribe to team updates when available
    // For now, return a placeholder subscription ID
    return `captain_updates_${userPubkey.slice(0, 8)}`;
  }

  /**
   * Get captain status for team discovery UI
   */
  async getCaptainStatusForTeamDiscovery(userPubkey: string): Promise<{
    showCaptainDashboard: boolean;
    primaryTeam: NostrTeam | null;
    captainTeamCount: number;
  }> {
    const status = await this.getCaptainStatus(userPubkey);
    const primaryTeam = status.isCaptain
      ? await this.getPrimaryCaptainTeam(userPubkey)
      : null;

    return {
      showCaptainDashboard: status.isCaptain,
      primaryTeam,
      captainTeamCount: status.captainOfTeams.length,
    };
  }

  // ================================================================================
  // UTILITIES
  // ================================================================================

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(lastChecked: number): boolean {
    return Date.now() - lastChecked < this.cacheExpiryMs;
  }

  /**
   * Clear all cached captain status
   */
  clearCache(): void {
    console.log('🧹 Clearing captain detection cache');
    this.captainStatusCache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    entriesCount: number;
    validEntries: number;
    expiredEntries: number;
  } {
    let validEntries = 0;
    let expiredEntries = 0;

    for (const status of this.captainStatusCache.values()) {
      if (this.isCacheValid(status.lastChecked)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      entriesCount: this.captainStatusCache.size,
      validEntries,
      expiredEntries,
    };
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupExpiredCache(): void {
    const expiredKeys: string[] = [];

    for (const [pubkey, status] of this.captainStatusCache.entries()) {
      if (!this.isCacheValid(status.lastChecked)) {
        expiredKeys.push(pubkey);
      }
    }

    for (const key of expiredKeys) {
      this.captainStatusCache.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(
        `🧹 Cleaned up ${expiredKeys.length} expired captain status entries`
      );
    }
  }
}

export default CaptainDetectionService.getInstance();
