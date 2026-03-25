/**
 * NostrPrefetchService - Essential data prefetching for app initialization
 *
 * Loads only the user profile before app becomes interactive.
 * All other data (teams, workouts, competitions) loads on-demand.
 */

import { DirectNostrProfileService } from '../user/directNostrProfileService';
import { TeamMembershipService } from '../team/teamMembershipService';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import unifiedCache from '../cache/UnifiedNostrCache';
import { CacheTTL, CacheKeys } from '../../constants/cacheTTL';
import { CaptainCache } from '../../utils/captainCache';
import { FrozenEventStore } from '../cache/FrozenEventStore';
import { NostrFetchLogger } from '../../utils/NostrFetchLogger';

export class NostrPrefetchService {
  private static instance: NostrPrefetchService;

  private constructor() {}

  static getInstance(): NostrPrefetchService {
    if (!NostrPrefetchService.instance) {
      NostrPrefetchService.instance = new NostrPrefetchService();
    }
    return NostrPrefetchService.instance;
  }

  /**
   * Prefetch all user-specific and global data
   * ✅ PERFORMANCE FIX: Only fetch ESSENTIAL data (profile only)
   * All other data loads on-demand when screens are accessed
   * This reduces prefetch from 16s to <1s
   */
  async prefetchAllUserData(
    onProgress?: (step: number, total: number, message: string) => void
  ): Promise<void> {
    NostrFetchLogger.start('Prefetch.prefetchAllUserData');
    const totalSteps = 1; // Only profile now
    let currentStep = 0;

    const reportProgress = (message: string) => {
      currentStep++;
      if (onProgress) {
        onProgress(currentStep, totalSteps, message);
      }
      console.log(`[Prefetch ${currentStep}/${totalSteps}] ${message}`);
    };

    try {
      // Get user identifiers
      const identifiers = await getUserNostrIdentifiers();
      if (!identifiers) {
        throw new Error('No user identifiers found');
      }

      const { hexPubkey } = identifiers;

      if (!hexPubkey) {
        console.warn('[Prefetch] No hex pubkey available');
        return;
      }

      console.log(
        '🚀 [Prefetch] Starting ESSENTIAL-ONLY prefetch (profile only)...'
      );

      // ✅ PERFORMANCE FIX: Only fetch profile (1s timeout)
      // Teams, competitions, and workouts load on-demand
      await this.prefetchUserProfile(hexPubkey)
        .then(() => reportProgress('Profile loaded'))
        .catch((err) => {
          console.warn(
            '[Prefetch] Profile failed, continuing anyway:',
            err?.message
          );
          reportProgress('Profile loaded (fallback)');
        });

      // ❄️ Initialize FrozenEventStore (instant - reads from AsyncStorage)
      // Enables instant display of ended event leaderboards
      FrozenEventStore.initializeMemoryCache().catch((err) => {
        console.warn('[Prefetch] FrozenEventStore init failed:', err?.message);
      });

      NostrFetchLogger.end('Prefetch.prefetchAllUserData', 1, 'essential only');
      console.log(
        '✅ Prefetch complete (<1s) - non-essential data loads on-demand'
      );
    } catch (error) {
      NostrFetchLogger.error('Prefetch.prefetchAllUserData', error as Error);
      console.error('❌ Prefetch failed:', error);
      // Don't throw - app should still work with partial data
    }
  }

  /**
   * Prefetch user profile (kind 0)
   * ✅ PERFORMANCE FIX: 1-second timeout for fast app startup
   */
  private async prefetchUserProfile(hexPubkey: string): Promise<void> {
    NostrFetchLogger.start('Prefetch.prefetchUserProfile');
    try {
      const profileFetchPromise = unifiedCache.get(
        CacheKeys.USER_PROFILE(hexPubkey),
        async () => {
          NostrFetchLogger.cacheMiss('Prefetch.prefetchUserProfile');
          const user = await DirectNostrProfileService.getCurrentUserProfile();
          if (!user) {
            return await DirectNostrProfileService.getFallbackProfile();
          }
          return user;
        },
        { ttl: CacheTTL.USER_PROFILE }
      );

      // ✅ PERFORMANCE FIX: 1-second timeout (reduced from 3s)
      const profile = await Promise.race([
        profileFetchPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 1000)
        ),
      ]);

      NostrFetchLogger.end('Prefetch.prefetchUserProfile', 1, (profile as any)?.name || 'Unknown');
      console.log(
        '[Prefetch] User profile cached:',
        (profile as any)?.name || 'Unknown'
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Profile fetch timeout') {
        NostrFetchLogger.timeout('Prefetch.prefetchUserProfile', 1000);
        console.warn(
          '[Prefetch] Profile fetch timed out after 1s - using fallback'
        );
      } else {
        NostrFetchLogger.error('Prefetch.prefetchUserProfile', error as Error);
        console.error('[Prefetch] User profile failed:', error);
      }
    }
  }

  /**
   * Prefetch user's teams
   * ✅ OPTIMIZED: Now fetches user teams since we prefetch all teams anyway
   * This gives instant display on My Teams screen
   * ✅ FIX: Enriches team data with discovered teams to match NavigationDataContext format
   */
  private async prefetchUserTeams(hexPubkey: string): Promise<void> {
    try {
      const userTeams = await unifiedCache.get(
        CacheKeys.USER_TEAMS(hexPubkey),
        async () => {
          const membershipService = TeamMembershipService.getInstance();
          const memberships = await membershipService.getLocalMemberships(
            hexPubkey
          );

          const userTeams: any[] = [];

          // 1. Get teams where user is captain
          const captainTeams = await CaptainCache.getCaptainTeams();
          for (const teamId of captainTeams) {
            userTeams.push({
              id: teamId,
              name: 'Team',
              description: '',
              prizePool: 0,
              memberCount: 0,
              isActive: true,
              role: 'captain',
            });
          }

          // 2. Get all local memberships
          for (const membership of memberships) {
            if (userTeams.some((t) => t.id === membership.teamId)) continue;
            userTeams.push({
              id: membership.teamId,
              name: membership.teamName,
              description: '',
              prizePool: 0,
              memberCount: 0,
              isActive: true,
              role: membership.status === 'official' ? 'member' : 'pending',
              captainId: membership.captainPubkey,
            });
          }

          console.log(`[Prefetch] ✅ Built ${userTeams.length} teams for user`);
          return userTeams;
        },
        { ttl: CacheTTL.USER_TEAMS }
      );

      console.log(
        `[Prefetch] ✅ User is member of ${userTeams?.length || 0} teams`
      );
    } catch (error) {
      console.error('[Prefetch] User teams failed:', error);
      await unifiedCache.set(
        CacheKeys.USER_TEAMS(hexPubkey),
        [],
        CacheTTL.USER_TEAMS
      );
    }
  }

  /**
   * Force refresh user teams cache
   * Call this after joining/leaving a team to update My Teams screen
   */
  async refreshUserTeamsCache(): Promise<void> {
    try {
      const identifiers = await getUserNostrIdentifiers();
      if (!identifiers) {
        console.warn('[Prefetch] Cannot refresh teams - no user identifiers');
        return;
      }

      const { hexPubkey } = identifiers;

      if (!hexPubkey) {
        console.warn('[Prefetch] No hex pubkey for team refresh');
        return;
      }

      // Invalidate the cache
      await unifiedCache.invalidate(CacheKeys.USER_TEAMS(hexPubkey));

      // Re-fetch teams
      await this.prefetchUserTeams(hexPubkey);
      console.log('✅ User teams cache refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh user teams cache:', error);
    }
  }

}

export default NostrPrefetchService.getInstance();
