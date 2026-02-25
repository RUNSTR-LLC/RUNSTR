/**
 * NostrPrefetchService - Comprehensive data prefetching for app initialization
 *
 * Loads ALL necessary data before app becomes interactive:
 * - User profile
 * - User teams
 * - All discovered teams
 * - User workouts
 * - Wallet info
 * - Competitions
 *
 * This eliminates loading states throughout the app by ensuring
 * all data is cached before screens render.
 *
 * Usage:
 * ```typescript
 * const prefetch = NostrPrefetchService.getInstance();
 * await prefetch.prefetchAllUserData(userPubkey);
 * ```
 */

import { DirectNostrProfileService } from '../user/directNostrProfileService';
import { TeamMembershipService } from '../team/teamMembershipService';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import unifiedCache from '../cache/UnifiedNostrCache';
import { CacheTTL, CacheKeys } from '../../constants/cacheTTL';
import { CaptainCache } from '../../utils/captainCache';
// NOTE: WorkoutEventStore import removed - deprecated, using UnifiedWorkoutCache instead
import { UnifiedWorkoutCache } from '../cache/UnifiedWorkoutCache';
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
      // ✅ PERFORMANCE: Skip cache initialization - lazy load on demand
      // await unifiedCache.initialize(); // REMOVED

      // Get user identifiers
      const identifiers = await getUserNostrIdentifiers();
      if (!identifiers) {
        throw new Error('No user identifiers found');
      }

      const { npub, hexPubkey } = identifiers;

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

      // ❌ DISABLED FOR TESTING: Baseline-only mode
      // UnifiedWorkoutCache.initialize(hexPubkey || undefined).catch((err) => {
      //   console.warn('[Prefetch] UnifiedWorkoutCache init failed:', err?.message);
      // });
      console.log('📦 Prefetch: Skipping UnifiedWorkoutCache (baseline-only mode)');

      // NOTE: WorkoutEventStore init removed - it's deprecated, UnifiedWorkoutCache is the single source of truth

      // Season 2 avatars are now bundled with the app (no prefetch needed)

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

  // NOTE: initializeWorkoutStore method removed - WorkoutEventStore is deprecated
  // UnifiedWorkoutCache is now the single source of truth for 1301 events

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

      // Invalidate the cache
      await unifiedCache.invalidate(CacheKeys.USER_TEAMS(hexPubkey));

      // Re-fetch teams
      await this.prefetchUserTeams(hexPubkey);
      console.log('✅ User teams cache refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh user teams cache:', error);
    }
  }

  /**
   * Prefetch all discovered teams
   * PERFORMANCE: With 5-second timeout to prevent blocking
   */
  private async prefetchDiscoveredTeams(): Promise<void> {
    // Teams/clubs now loaded from Supabase via ClubService — no relay prefetch needed
    console.log('[Prefetch] Teams loaded from Supabase (no relay prefetch)');
  }

  /**
   * Prefetch user's recent workouts (kind 1301)
   * ✅ OPTIMIZED: Now fetches only LAST 20 WORKOUTS for faster startup
   * With 5-second timeout to prevent blocking
   */
  private async prefetchUserWorkouts(hexPubkey: string): Promise<void> {
    try {
      // ✅ Check cache first - avoid redundant fetch if already prefetched
      const cachedWorkouts = unifiedCache.getCached<any[]>(
        CacheKeys.USER_WORKOUTS(hexPubkey)
      );
      if (cachedWorkouts && cachedWorkouts.length > 0) {
        console.log(
          `[Prefetch] Workouts already cached (${cachedWorkouts.length} workouts), skipping fetch`
        );
        return;
      }

      console.log('[Prefetch] Fetching last 20 user workouts (kind 1301)...');

      // ✅ OPTIMIZED: Fetch with limit for faster performance
      const workoutFetchPromise = (async () => {
        const { Nuclear1301Service } = await import(
          '../fitness/Nuclear1301Service'
        );
        const nuclear1301 = Nuclear1301Service.getInstance();

        // Fetch only last 20 Nostr 1301 events (limited for performance)
        const nostrWorkouts = await nuclear1301.getUserWorkoutsWithLimit(
          hexPubkey,
          20
        );

        // Cache in UnifiedNostrCache for instant access
        await unifiedCache.set(
          CacheKeys.USER_WORKOUTS(hexPubkey),
          nostrWorkouts,
          CacheTTL.USER_WORKOUTS
        );

        console.log(
          `[Prefetch] ✅ Cached ${nostrWorkouts.length} recent workouts (limited to 20)`
        );
        return nostrWorkouts;
      })();

      // ✅ 3-second timeout for even faster startup
      await Promise.race([
        workoutFetchPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Workout fetch timeout')), 3000)
        ),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message === 'Workout fetch timeout') {
        console.warn(
          '[Prefetch] Workout fetch timed out after 3s - workouts will load on demand'
        );
      } else {
        console.error('[Prefetch] User workouts prefetch failed:', error);
      }
      // Non-blocking - workouts will load on demand if prefetch fails
    }
  }

  /**
   * DEPRECATED: NIP60 wallet prefetch removed - using NWC instead
   * Keeping method for reference but no longer called during startup
   *
   * Prefetch wallet info (kind 37375)
   * NON-BLOCKING: Wallet loads in background, doesn't block app startup
   *
   * @deprecated NIP60/Cashu wallet disabled, using NWC instead
   */
  // private async prefetchWalletInfo(hexPubkey: string): Promise<void> {
  //   try {
  //     // PERFORMANCE FIX: Don't block on wallet initialization
  //     // Wallet will initialize lazily when user accesses wallet features
  //     console.log('[Prefetch] Wallet will initialize on-demand (non-blocking)');

  //     // Start wallet initialization in background without waiting
  //     setTimeout(async () => {
  //       try {
  //         const WalletCore = (await import('../nutzap/WalletCore')).WalletCore;
  //         const core = WalletCore.getInstance();
  //         const state = await core.initialize(hexPubkey);

  //         await unifiedCache.set(
  //           CacheKeys.WALLET_INFO(hexPubkey),
  //           {
  //             balance: state.balance,
  //             mint: state.mint,
  //             isOnline: state.isOnline,
  //             pubkey: state.pubkey,
  //           },
  //           CacheTTL.WALLET_INFO
  //         );

  //         console.log(
  //           '[Prefetch] Wallet initialized in background, balance:',
  //           state.balance
  //         );
  //       } catch (bgError) {
  //         console.warn('[Prefetch] Background wallet init failed:', bgError);
  //       }
  //     }, 0);
  //   } catch (error) {
  //     console.error('[Prefetch] Wallet info failed:', error);
  //   }
  // }

  /**
   * Prefetch team events (kind 30101)
   * OPTIMIZED: 5-second timeout to prevent blocking
   * NOTE: Leagues (kind 30100) removed - app only uses Season 1 global league
   */
  private async prefetchCompetitions(): Promise<void> {
    try {
      // ✅ Fetch team events only (leagues no longer used)
      const eventsFetchPromise = unifiedCache.get(
        CacheKeys.COMPETITIONS,
        async () => {
          const SimpleCompetitionService = (
            await import('../competition/SimpleCompetitionService')
          ).default;
          return await SimpleCompetitionService.getInstance().getAllEvents();
        },
        { ttl: CacheTTL.COMPETITIONS }
      );

      // ✅ PERFORMANCE: 5-second timeout for events
      const events = await Promise.race([
        eventsFetchPromise,
        new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('Events fetch timeout')), 5000)
        ),
      ]);

      console.log(
        `[Prefetch] Events cached: ${events?.length || 0} team events`
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Events fetch timeout') {
        console.warn(
          '[Prefetch] Events fetch timed out after 5s - events will load on demand'
        );
      } else {
        console.error('[Prefetch] Events fetch failed:', error);
      }
    }
  }
}

export default NostrPrefetchService.getInstance();
