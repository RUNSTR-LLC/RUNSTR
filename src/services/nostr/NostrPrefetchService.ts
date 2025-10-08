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
import { getNostrTeamService } from './NostrTeamService';
import { TeamMembershipService } from '../team/teamMembershipService';
import { getNpubFromHex, getUserNostrIdentifiers } from '../../utils/nostr';
import unifiedCache from '../cache/UnifiedNostrCache';
import { CacheTTL, CacheKeys } from '../../constants/cacheTTL';
import { CaptainCache } from '../../utils/captainCache';

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
   * OPTIMIZED: Parallel fetching for faster app startup
   * This is the main entry point called from SplashInitScreen
   */
  async prefetchAllUserData(
    onProgress?: (step: number, total: number, message: string) => void
  ): Promise<void> {
    const totalSteps = 6;
    let currentStep = 0;

    const reportProgress = (message: string) => {
      currentStep++;
      if (onProgress) {
        onProgress(currentStep, totalSteps, message);
      }
      console.log(`[Prefetch ${currentStep}/${totalSteps}] ${message}`);
    };

    try {
      // Initialize cache
      await unifiedCache.initialize();

      // Get user identifiers
      const identifiers = await getUserNostrIdentifiers();
      if (!identifiers) {
        throw new Error('No user identifiers found');
      }

      const { npub, hexPubkey } = identifiers;

      console.log('🚀 [Prefetch] Starting PARALLEL prefetch for faster startup...');

      // ✅ OPTIMIZATION: Group 1 - Independent fetches (run in parallel)
      // These don't depend on each other and can fetch simultaneously
      // ✅ FIX: Ensure progress callbacks ALWAYS fire, even on failure
      await Promise.all([
        this.prefetchUserProfile(hexPubkey)
          .then(() => reportProgress('Profile loaded'))
          .catch((err) => {
            console.warn('[Prefetch] Profile failed, continuing anyway:', err?.message);
            reportProgress('Profile loaded'); // Report progress even on failure
          }),
        this.prefetchDiscoveredTeams()
          .then(() => reportProgress('Teams discovered'))
          .catch((err) => {
            console.warn('[Prefetch] Teams failed, continuing anyway:', err?.message);
            reportProgress('Teams discovered'); // CRITICAL: Report even on failure
          }),
        this.prefetchCompetitions()
          .then(() => reportProgress('Competitions loaded'))
          .catch((err) => {
            console.warn('[Prefetch] Competitions failed, continuing anyway:', err?.message);
            reportProgress('Competitions loaded'); // Report even on failure
          }),
        this.prefetchWalletInfo(hexPubkey)
          .then(() => reportProgress('Wallet initialized'))
          .catch((err) => {
            console.warn('[Prefetch] Wallet failed, continuing anyway:', err?.message);
            reportProgress('Wallet initialized'); // Report even on failure
          }),
      ]);

      // ✅ Step 5: User Teams (depends on discovered teams, so runs after Group 1)
      reportProgress('Finding your teams...');
      await this.prefetchUserTeams(hexPubkey);

      // ✅ Step 6: User Workouts - WAIT for completion before showing app
      reportProgress('Loading workouts...');
      await this.prefetchUserWorkouts(hexPubkey).catch(err => {
        console.warn('[Prefetch] Workout fetch failed, continuing anyway:', err?.message);
        reportProgress('Loading workouts...'); // Report progress even on failure
      });

      console.log('✅ Prefetch complete - all data cached and ready');
    } catch (error) {
      console.error('❌ Prefetch failed:', error);
      // Don't throw - app should still work with partial data
    }
  }

  /**
   * Prefetch user profile (kind 0)
   * OPTIMIZED: 3-second timeout for fast failure
   */
  private async prefetchUserProfile(hexPubkey: string): Promise<void> {
    try {
      const profileFetchPromise = unifiedCache.get(
        CacheKeys.USER_PROFILE(hexPubkey),
        async () => {
          const user = await DirectNostrProfileService.getCurrentUserProfile();
          if (!user) {
            return await DirectNostrProfileService.getFallbackProfile();
          }
          return user;
        },
        { ttl: CacheTTL.USER_PROFILE }
      );

      // ✅ PERFORMANCE: 3-second timeout for profile fetch
      const profile = await Promise.race([
        profileFetchPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
        )
      ]);

      console.log('[Prefetch] User profile cached:', (profile as any)?.name || 'Unknown');
    } catch (error) {
      if (error instanceof Error && error.message === 'Profile fetch timeout') {
        console.warn('[Prefetch] Profile fetch timed out after 3s - using fallback');
      } else {
        console.error('[Prefetch] User profile failed:', error);
      }
    }
  }

  /**
   * Prefetch user's teams
   * OPTIMIZED: Ensures discovered teams exist before matching memberships
   */
  private async prefetchUserTeams(hexPubkey: string): Promise<void> {
    try {
      const teams = await unifiedCache.get(
        CacheKeys.USER_TEAMS(hexPubkey),
        async () => {
          // Get all user teams
          const membershipService = TeamMembershipService.getInstance();
          const localMemberships = await membershipService.getLocalMemberships(hexPubkey);

          const teamService = getNostrTeamService();
          let discoveredTeams = teamService.getDiscoveredTeams();

          // ✅ DEPENDENCY FIX: Ensure discovered teams exist before matching
          if (discoveredTeams.size === 0) {
            console.log('[Prefetch] No discovered teams found, triggering discovery...');
            await teamService.discoverFitnessTeams();
            discoveredTeams = teamService.getDiscoveredTeams();
            console.log(`[Prefetch] Discovered ${discoveredTeams.size} teams for membership matching`);
          }

          const userTeams: any[] = [];

          for (const membership of localMemberships) {
            const team = discoveredTeams.get(membership.teamId);
            if (team) {
              userTeams.push({
                id: team.id,
                name: team.name,
                description: team.description || '',
                memberCount: team.memberCount || 0,
                isActive: true,
                role: membership.role || 'member',
                bannerImage: team.bannerImage,
                captainId: team.captainId,
              });
            } else {
              console.warn(`[Prefetch] Team ${membership.teamId} not found in discovered teams`);
            }
          }

          return userTeams;
        },
        { ttl: CacheTTL.USER_TEAMS }
      );

      console.log('[Prefetch] User teams cached:', teams?.length || 0);
    } catch (error) {
      console.error('[Prefetch] User teams failed:', error);
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
    try {
      // PERFORMANCE FIX: Add timeout to prevent indefinite blocking
      const teams = await Promise.race([
        unifiedCache.get(
          CacheKeys.DISCOVERED_TEAMS,
          async () => {
            const teamService = getNostrTeamService();

            // Trigger team discovery if not already done
            const cachedTeams = teamService.getDiscoveredTeams();
            if (cachedTeams.size === 0) {
              await teamService.discoverFitnessTeams();
            }

            // Convert Map to array
            return Array.from(teamService.getDiscoveredTeams().values());
          },
          { ttl: CacheTTL.DISCOVERED_TEAMS }
        ),
        new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('Team discovery timeout')), 5000)
        )
      ]);

      // Populate CaptainCache for all discovered teams
      // This ensures captain status is detected during prefetch
      const identifiers = await getUserNostrIdentifiers();
      if (identifiers && teams && teams.length > 0) {
        const { hexPubkey, npub } = identifiers;
        console.log('[Prefetch] Checking captain status for', teams.length, 'teams');

        for (const team of teams) {
          const teamCaptain = team.captain || team.captainId || team.captainNpub;
          if (teamCaptain) {
            const isCaptain = teamCaptain === hexPubkey || teamCaptain === npub;
            if (isCaptain) {
              await CaptainCache.setCaptainStatus(team.id, true);
              console.log(`[Prefetch] ✅ User is captain of team: ${team.name}`);
            }
          }
        }
      }

      console.log('[Prefetch] Discovered teams cached:', teams?.length || 0);
    } catch (error) {
      if (error instanceof Error && error.message === 'Team discovery timeout') {
        console.warn('[Prefetch] Team discovery timed out - teams will load on demand');
      } else {
        console.error('[Prefetch] Discovered teams failed:', error);
      }
      // Continue without blocking - teams will load on demand
    }
  }

  /**
   * Prefetch user's recent workouts (kind 1301)
   * CLEAN ARCHITECTURE: Fetches ONLY Nostr 1301 events (no HealthKit, no merging)
   * OPTIMIZED: Fetches 500 workouts with 5s timeout
   */
  private async prefetchUserWorkouts(hexPubkey: string): Promise<void> {
    try {
      // ✅ Check cache first - avoid redundant fetch if already prefetched
      const cachedWorkouts = unifiedCache.getCached<any[]>(CacheKeys.USER_WORKOUTS(hexPubkey));
      if (cachedWorkouts && cachedWorkouts.length > 0) {
        console.log(`[Prefetch] Workouts already cached (${cachedWorkouts.length} workouts), skipping fetch`);
        return;
      }

      console.log('[Prefetch] Fetching user Nostr workouts (kind 1301)...');

      // ✅ CLEAN: Direct Nuclear1301Service call (no merging, no HealthKit)
      const workoutFetchPromise = (async () => {
        const { Nuclear1301Service } = await import('../fitness/Nuclear1301Service');
        const nuclear1301 = Nuclear1301Service.getInstance();

        // Fetch Nostr 1301 events only
        const nostrWorkouts = await nuclear1301.getUserWorkouts(hexPubkey);

        // Cache in UnifiedNostrCache for instant access
        await unifiedCache.set(
          CacheKeys.USER_WORKOUTS(hexPubkey),
          nostrWorkouts,
          CacheTTL.USER_WORKOUTS
        );

        console.log(`[Prefetch] ✅ Cached ${nostrWorkouts.length} Nostr workouts (kind 1301)`);
      })();

      // ✅ 5-second timeout for faster failure
      await Promise.race([
        workoutFetchPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Workout fetch timeout')), 5000)
        )
      ]);
    } catch (error) {
      if (error instanceof Error && error.message === 'Workout fetch timeout') {
        console.warn('[Prefetch] Workout fetch timed out after 5s - workouts will load on demand');
      } else {
        console.error('[Prefetch] User workouts prefetch failed:', error);
      }
      // Non-blocking - workouts will load on demand if prefetch fails
    }
  }

  /**
   * Prefetch wallet info (kind 37375)
   * NON-BLOCKING: Wallet loads in background, doesn't block app startup
   */
  private async prefetchWalletInfo(hexPubkey: string): Promise<void> {
    try {
      // PERFORMANCE FIX: Don't block on wallet initialization
      // Wallet will initialize lazily when user accesses wallet features
      console.log('[Prefetch] Wallet will initialize on-demand (non-blocking)');

      // Start wallet initialization in background without waiting
      setTimeout(async () => {
        try {
          const WalletCore = (await import('../nutzap/WalletCore')).WalletCore;
          const core = WalletCore.getInstance();
          const state = await core.initialize(hexPubkey);

          await unifiedCache.set(
            CacheKeys.WALLET_INFO(hexPubkey),
            {
              balance: state.balance,
              mint: state.mint,
              isOnline: state.isOnline,
              pubkey: state.pubkey,
            },
            { ttl: CacheTTL.WALLET_INFO }
          );

          console.log('[Prefetch] Wallet initialized in background, balance:', state.balance);
        } catch (bgError) {
          console.warn('[Prefetch] Background wallet init failed:', bgError);
        }
      }, 0);
    } catch (error) {
      console.error('[Prefetch] Wallet info failed:', error);
    }
  }

  /**
   * Prefetch competitions (kind 30100 leagues, 30101 events)
   * OPTIMIZED: 5-second timeout to prevent blocking
   */
  private async prefetchCompetitions(): Promise<void> {
    try {
      // ✅ Fetch leagues and events in parallel with timeout
      const competitionsFetchPromise = Promise.all([
        unifiedCache.get(
          CacheKeys.LEAGUES,
          async () => {
            const SimpleCompetitionService = (await import('../competition/SimpleCompetitionService')).default;
            return await SimpleCompetitionService.getAllLeagues();
          },
          { ttl: CacheTTL.LEAGUES }
        ),
        unifiedCache.get(
          CacheKeys.COMPETITIONS,
          async () => {
            const SimpleCompetitionService = (await import('../competition/SimpleCompetitionService')).default;
            return await SimpleCompetitionService.getAllEvents();
          },
          { ttl: CacheTTL.COMPETITIONS }
        )
      ]);

      // ✅ PERFORMANCE: 5-second timeout for competitions
      const [leagues, events] = await Promise.race([
        competitionsFetchPromise,
        new Promise<[any[], any[]]>((_, reject) =>
          setTimeout(() => reject(new Error('Competitions fetch timeout')), 5000)
        )
      ]);

      console.log(`[Prefetch] Competitions cached: ${leagues?.length || 0} leagues, ${events?.length || 0} events`);
    } catch (error) {
      if (error instanceof Error && error.message === 'Competitions fetch timeout') {
        console.warn('[Prefetch] Competitions fetch timed out after 5s - competitions will load on demand');
      } else {
        console.error('[Prefetch] Competitions failed:', error);
      }
    }
  }
}

export default NostrPrefetchService.getInstance();
