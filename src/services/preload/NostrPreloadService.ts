/**
 * Nostr Preload Service  
 * Background data preloading during app boot to mask Nostr loading delays
 * Starts all Nostr queries immediately when app opens, caches results
 */

import { getNpubFromStorage } from '../../utils/nostr';
import { DirectNostrProfileService } from '../user/directNostrProfileService';
import { nostrProfileService } from '../nostr/NostrProfileService';
import { NostrWorkoutParser } from '../../utils/nostrWorkoutParser';
import { getNostrTeamService } from '../nostr/NostrTeamService';
import { NostrCacheService } from '../cache/NostrCacheService';

export class NostrPreloadService {
  private static isPreloading = false;
  private static preloadStartTime = 0;

  /**
   * Start background preloading immediately when app boots
   * Non-blocking - runs all queries in parallel
   */
  static async startBackgroundPreload(): Promise<void> {
    if (this.isPreloading) {
      console.log('🔄 NostrPreload: Already preloading, skipping duplicate request');
      return;
    }

    try {
      this.isPreloading = true;
      this.preloadStartTime = Date.now();
      console.log('🚀 NostrPreload: Starting background preload...');

      // Get stored npub first
      const npub = await getNpubFromStorage();
      if (!npub) {
        console.log('❌ NostrPreload: No stored npub, skipping preload');
        return;
      }

      console.log('✅ NostrPreload: Found npub, starting parallel preload operations...');

      // Start all operations in parallel (non-blocking)
      const preloadPromises = [
        this.preloadProfileData(npub),
        this.preloadWorkoutData(npub), 
        this.preloadTeamsData(),
      ];

      // Don't await - let them run in background
      Promise.allSettled(preloadPromises).then(results => {
        const duration = Date.now() - this.preloadStartTime;
        console.log(`✅ NostrPreload: Background preload completed in ${duration}ms`);
        
        // Log results
        results.forEach((result, index) => {
          const operation = ['profile', 'workouts', 'teams'][index];
          if (result.status === 'fulfilled') {
            console.log(`   ✅ ${operation} preload: success`);
          } else {
            console.log(`   ❌ ${operation} preload: failed -`, result.reason);
          }
        });
        
        this.isPreloading = false;
      });

    } catch (error) {
      console.error('❌ NostrPreload: Error starting background preload:', error);
      this.isPreloading = false;
    }
  }

  /**
   * Preload profile data and cache it
   */
  private static async preloadProfileData(npub: string): Promise<void> {
    try {
      console.log('📡 NostrPreload: Preloading profile data...');
      
      // Check if already cached
      const cachedProfile = await NostrCacheService.getCachedProfile(npub);
      if (cachedProfile) {
        console.log('⚡ NostrPreload: Profile already cached, skipping fetch');
        return;
      }

      // Fetch fresh profile data with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile preload timeout')), 8000); // 8 sec timeout
      });

      const profilePromise = nostrProfileService.getProfile(npub);
      
      // Race between fetch and timeout
      try {
        const nostrProfile = await Promise.race([profilePromise, timeoutPromise]);
        
        if (nostrProfile) {
          // Create and cache the profile
          const directUser = {
            id: 'nostr_' + npub.slice(-10),
            npub: npub,
            name: nostrProfile?.display_name || nostrProfile?.name || `user_${npub.slice(5, 13)}`,
            displayName: nostrProfile?.display_name || nostrProfile?.name,
            role: 'member' as const,
            createdAt: new Date().toISOString(),
            
            // Nostr profile data
            bio: nostrProfile?.about,
            website: nostrProfile?.website,
            picture: nostrProfile?.picture,
            banner: nostrProfile?.banner,
            lud16: nostrProfile?.lud16,
            
            // Basic settings
            lightningAddress: nostrProfile?.lud16,
            personalWalletAddress: nostrProfile?.lud16,
            walletBalance: 0,
            hasWalletCredentials: false,
          };

          await NostrCacheService.setCachedProfile(npub, directUser);
          console.log('✅ NostrPreload: Profile preloaded and cached');
        } else {
          console.log('⚠️ NostrPreload: No profile data returned');
        }
      } catch (timeoutError) {
        console.warn('⏰ NostrPreload: Profile preload timed out');
      }
    } catch (error) {
      console.error('❌ NostrPreload: Error preloading profile:', error);
    }
  }

  /**
   * Preload workout data and cache it
   */
  private static async preloadWorkoutData(npub: string): Promise<void> {
    try {
      console.log('🏃‍♂️ NostrPreload: Preloading workout data...');
      
      // Check if already cached
      const cachedWorkouts = await NostrCacheService.getCachedWorkouts(npub);
      if (cachedWorkouts.length > 0) {
        console.log('⚡ NostrPreload: Workouts already cached, skipping fetch');
        return;
      }

      // Fetch workout data with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Workout preload timeout')), 15000); // 15 sec timeout
      });

      const { NostrWorkoutService } = await import('../fitness/nostrWorkoutService');
      const workoutService = NostrWorkoutService.getInstance();
      const { nip19 } = await import('nostr-tools');
      const { data: pubkeyBytes } = nip19.decode(npub);
      const pubkey = pubkeyBytes as string;
      
      const workoutPromise = workoutService.fetchUserWorkouts(pubkey, {
        userId: 'nostr_' + npub.slice(-10),
        limit: 50, // Reasonable limit for preloading
      });
      
      // Race between fetch and timeout
      try {
        const syncResult = await Promise.race([workoutPromise, timeoutPromise]);
        
        if (syncResult && syncResult.workouts && syncResult.workouts.length > 0) {
          await NostrCacheService.setCachedWorkouts(npub, syncResult.workouts);
          console.log(`✅ NostrPreload: ${syncResult.workouts.length} workouts preloaded and cached`);
        } else {
          console.log('⚠️ NostrPreload: No workout data found');
        }
      } catch (timeoutError) {
        console.warn('⏰ NostrPreload: Workout preload timed out');
        // Cache empty array so we don't retry immediately
        await NostrCacheService.setCachedWorkouts(npub, []);
      }
    } catch (error) {
      console.error('❌ NostrPreload: Error preloading workouts:', error);
    }
  }

  /**
   * Preload teams data and cache it
   */
  private static async preloadTeamsData(): Promise<void> {
    try {
      console.log('👥 NostrPreload: Preloading teams data...');
      
      // Check if already cached
      const cachedTeams = await NostrCacheService.getCachedTeams();
      if (cachedTeams.length > 0) {
        console.log('⚡ NostrPreload: Teams already cached, skipping fetch');
        return;
      }

      // Fetch teams data with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Teams preload timeout')), 10000); // 10 sec timeout
      });

      const nostrTeamService = getNostrTeamService();
      const teamsPromise = nostrTeamService.discoverFitnessTeams({
        limit: 50, // Increased limit for better discovery
        // Removed since filter to access ALL historical teams
      });
      
      // Race between fetch and timeout
      try {
        const nostrTeams = await Promise.race([teamsPromise, timeoutPromise]);
        
        if (nostrTeams && nostrTeams.length > 0) {
          // Convert to DiscoveryTeam format
          const discoveryTeams = nostrTeams.map((team) => ({
            id: team.id,
            name: team.name,
            description: team.description,
            about: team.description,
            captainId: team.captainId,
            prizePool: 0,
            memberCount: team.memberCount,
            joinReward: 0,
            exitFee: 0,
            isActive: team.isPublic,
            avatar: '',
            createdAt: new Date(team.createdAt * 1000).toISOString(),
            difficulty: 'intermediate' as const,
            stats: {
              memberCount: team.memberCount,
              avgPace: 'N/A',
              activeEvents: 0,
              activeChallenges: 0,
            },
            recentActivities: [],
            recentPayout: undefined,
            isFeatured: false,
          }));

          await NostrCacheService.setCachedTeams(discoveryTeams);
          console.log(`✅ NostrPreload: ${discoveryTeams.length} teams preloaded and cached`);
        } else {
          console.log('⚠️ NostrPreload: No teams data found');
        }
      } catch (timeoutError) {
        console.warn('⏰ NostrPreload: Teams preload timed out');
        // Cache empty array so we don't retry immediately
        await NostrCacheService.setCachedTeams([]);
      }
    } catch (error) {
      console.error('❌ NostrPreload: Error preloading teams:', error);
    }
  }

  /**
   * Get preload status for debugging
   */
  static getPreloadStatus(): {
    isPreloading: boolean;
    duration: number;
  } {
    return {
      isPreloading: this.isPreloading,
      duration: this.isPreloading ? Date.now() - this.preloadStartTime : 0
    };
  }

  /**
   * Force stop preloading (for app shutdown)
   */
  static stopPreloading(): void {
    console.log('🛑 NostrPreload: Stopping background preload');
    this.isPreloading = false;
  }

  /**
   * Clear all preloaded cache (for sign out)
   */
  static async clearPreloadedData(): Promise<void> {
    console.log('🧹 NostrPreload: Clearing all preloaded data');
    await NostrCacheService.clearAllCache();
    this.isPreloading = false;
  }
}