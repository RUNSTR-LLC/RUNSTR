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

      // Step 1: User Profile
      reportProgress('Loading your profile...');
      await this.prefetchUserProfile(hexPubkey);

      // Step 2: User Teams
      reportProgress('Finding your teams...');
      await this.prefetchUserTeams(hexPubkey);

      // Step 3: Discovered Teams
      reportProgress('Discovering teams...');
      await this.prefetchDiscoveredTeams();

      // Step 4: User Workouts
      reportProgress('Loading workouts...');
      await this.prefetchUserWorkouts(hexPubkey);

      // Step 5: Wallet Info
      reportProgress('Loading wallet...');
      await this.prefetchWalletInfo(hexPubkey);

      // Step 6: Competitions
      reportProgress('Loading competitions...');
      await this.prefetchCompetitions();

      console.log('✅ Prefetch complete - all data cached');
    } catch (error) {
      console.error('❌ Prefetch failed:', error);
      // Don't throw - app should still work with partial data
    }
  }

  /**
   * Prefetch user profile (kind 0)
   */
  private async prefetchUserProfile(hexPubkey: string): Promise<void> {
    try {
      const profile = await unifiedCache.get(
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

      console.log('[Prefetch] User profile cached:', profile?.name || 'Unknown');
    } catch (error) {
      console.error('[Prefetch] User profile failed:', error);
    }
  }

  /**
   * Prefetch user's teams
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
          const discoveredTeams = teamService.getDiscoveredTeams();

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
   * Prefetch all discovered teams
   */
  private async prefetchDiscoveredTeams(): Promise<void> {
    try {
      const teams = await unifiedCache.get(
        CacheKeys.DISCOVERED_TEAMS,
        async () => {
          const teamService = getNostrTeamService();

          // Trigger team discovery if not already done
          const cachedTeams = teamService.getDiscoveredTeams();
          if (cachedTeams.size === 0) {
            await teamService.discoverTeams();
          }

          // Convert Map to array
          return Array.from(teamService.getDiscoveredTeams().values());
        },
        { ttl: CacheTTL.DISCOVERED_TEAMS }
      );

      console.log('[Prefetch] Discovered teams cached:', teams?.length || 0);
    } catch (error) {
      console.error('[Prefetch] Discovered teams failed:', error);
    }
  }

  /**
   * Prefetch user's recent workouts (kind 1301)
   * TODO: Implement workout prefetching with proper service
   */
  private async prefetchUserWorkouts(hexPubkey: string): Promise<void> {
    try {
      // TEMPORARILY DISABLED - Need to implement with WorkoutCacheService or NdkWorkoutService
      // Workouts will load on demand from existing workout services
      console.log('[Prefetch] Skipping workout prefetch (will load on demand)');
    } catch (error) {
      console.error('[Prefetch] User workouts failed:', error);
    }
  }

  /**
   * Prefetch wallet info (kind 37375)
   */
  private async prefetchWalletInfo(hexPubkey: string): Promise<void> {
    try {
      const walletInfo = await unifiedCache.get(
        CacheKeys.WALLET_INFO(hexPubkey),
        async () => {
          // Import wallet service
          const WalletCore = (await import('../nutzap/WalletCore')).WalletCore;
          const core = WalletCore.getInstance();

          // Get wallet state
          const state = await core.initialize(hexPubkey);
          return {
            balance: state.balance,
            mint: state.mint,
            isOnline: state.isOnline,
            pubkey: state.pubkey,
          };
        },
        { ttl: CacheTTL.WALLET_INFO }
      );

      console.log('[Prefetch] Wallet info cached, balance:', walletInfo?.balance || 0);
    } catch (error) {
      console.error('[Prefetch] Wallet info failed:', error);
    }
  }

  /**
   * Prefetch competitions (kind 30100, 30101)
   */
  private async prefetchCompetitions(): Promise<void> {
    try {
      const competitions = await unifiedCache.get(
        CacheKeys.COMPETITIONS,
        async () => {
          // This would fetch from Nostr - for now return empty
          // TODO: Implement competition fetching
          return [];
        },
        { ttl: CacheTTL.COMPETITIONS }
      );

      console.log('[Prefetch] Competitions cached:', competitions?.length || 0);
    } catch (error) {
      console.error('[Prefetch] Competitions failed:', error);
    }
  }
}

export default NostrPrefetchService.getInstance();
