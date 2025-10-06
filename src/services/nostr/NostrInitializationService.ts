import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import { getNostrTeamService } from './NostrTeamService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appCache } from '../../utils/cache';
import { getNpubFromStorage } from '../../utils/nostr';
import { TeamCacheService } from '../cache/TeamCacheService';
import { GlobalNDKService } from './GlobalNDKService';

interface InitializationProgress {
  step: string;
  progress: number;
  message: string;
}

export class NostrInitializationService {
  private static instance: NostrInitializationService;
  private ndk: NDK | null = null;
  private isInitialized = false;
  private prefetchedTeams: any[] = [];
  private teamService: ReturnType<typeof getNostrTeamService>;

  private constructor() {
    this.teamService = getNostrTeamService();
  }

  static getInstance(): NostrInitializationService {
    if (!NostrInitializationService.instance) {
      NostrInitializationService.instance = new NostrInitializationService();
    }
    return NostrInitializationService.instance;
  }

  async connectToRelays(): Promise<void> {
    console.log('🔌 Connecting to Nostr relays...');

    try {
      // Initialize relay manager with default relays
      const defaultRelays = [
        'wss://relay.damus.io',
        'wss://relay.primal.net',
        'wss://nos.lol',
        'wss://relay.nostr.band',
      ];

      // Store relay URLs for later use
      await AsyncStorage.setItem('nostr_relays', JSON.stringify(defaultRelays));

      // Pre-initialize relay connections
      for (const relay of defaultRelays) {
        try {
          console.log(`Connecting to ${relay}...`);
          // Simulate connection (actual connection happens in NDK)
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.warn(`Failed to connect to ${relay}:`, error);
        }
      }

      console.log('✅ Relay connections prepared');
    } catch (error) {
      console.error('❌ Relay connection failed:', error);
      throw error;
    }
  }

  async initializeNDK(): Promise<NDK> {
    if (this.isInitialized && this.ndk) {
      console.log('✅ NDK already initialized');
      return this.ndk;
    }

    console.log('🚀 Initializing NDK via GlobalNDKService...');

    try {
      // ✅ OPTIMIZATION: Use GlobalNDKService instead of creating new instance
      // This ensures only ONE NDK instance exists across the entire app
      this.ndk = await GlobalNDKService.getInstance();

      // Store NDK instance globally for backward compatibility
      (global as any).preInitializedNDK = this.ndk;

      this.isInitialized = true;
      console.log('✅ NDK initialized successfully via GlobalNDKService');

      return this.ndk;
    } catch (error) {
      console.error('❌ NDK initialization failed:', error);
      throw error;
    }
  }

  async prefetchTeams(): Promise<void> {
    console.log('🏃 Pre-fetching teams using TeamCacheService (30-min cache)...');

    try {
      // Use TeamCacheService as single source of truth (30-min TTL + 5-min background refresh)
      const cacheService = TeamCacheService.getInstance();
      const teams = await cacheService.getTeams();

      if (teams && teams.length > 0) {
        this.prefetchedTeams = teams;
        console.log(`✅ Pre-fetched and cached ${teams.length} teams via TeamCacheService`);
      } else {
        console.log('⚠️ No teams found during prefetch');
      }
    } catch (error) {
      console.error('❌ Team pre-fetch failed:', error);
      // Don't throw - this is non-critical
    }
  }

  async prefetchWorkouts(): Promise<void> {
    console.log('🏋️ ================================');
    console.log('🏋️ WORKOUT PREFETCH STARTING');
    console.log('🏋️ ================================');
    console.log('🔍 Checking AsyncStorage for user credentials...');

    try {
      const userNpub = await getNpubFromStorage();
      const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');

      // DEBUG: Log what we found (safely)
      console.log('📝 Storage Check:');
      console.log(`   - userNpub: ${userNpub ? userNpub.slice(0, 20) + '...' : '❌ NULL'}`);
      console.log(`   - hexPubkey: ${hexPubkey ? hexPubkey.slice(0, 20) + '...' : '❌ NULL'}`);

      if (!userNpub) {
        console.error('❌ ================================');
        console.error('❌ CRITICAL: No user npub found in storage!');
        console.error('❌ This means user authentication is incomplete');
        console.error('❌ Expected key: @runstr:npub');
        console.error('❌ WORKOUTS WILL NOT LOAD');
        console.error('❌ ================================');
        // Don't throw - continue app loading but make error visible
        return;
      }

      if (!hexPubkey) {
        console.error('❌ ================================');
        console.error('❌ CRITICAL: No hex pubkey found in storage!');
        console.error('❌ This means user authentication is incomplete');
        console.error('❌ Expected key: @runstr:hex_pubkey');
        console.error('❌ WORKOUTS WILL NOT LOAD');
        console.error('❌ ================================');
        // Don't throw - continue app loading but make error visible
        return;
      }

      console.log('✅ User credentials found, starting workout prefetch...');

      // Use WorkoutCacheService for centralized caching strategy
      // This ensures cache key alignment and proper data format
      const { WorkoutCacheService } = await import('../cache/WorkoutCacheService');
      const cacheService = WorkoutCacheService.getInstance();

      console.log('📞 Calling WorkoutCacheService.getMergedWorkouts()...');
      console.log(`   Parameters: pubkey=${hexPubkey.slice(0, 10)}..., limit=500`);

      // Fetch workouts using centralized service (limit: 500 for safety)
      // This will cache in 'user_workouts_merged' key that all screens expect
      // CRITICAL: Only pass hexPubkey and limit (2 params, not 3!)
      const result = await cacheService.getMergedWorkouts(hexPubkey, 500);

      console.log('📊 ================================');
      console.log('📊 PREFETCH COMPLETE');
      console.log('📊 ================================');

      if (result.allWorkouts.length === 0) {
        console.log('⚠️ Prefetch completed but found 0 workouts');
        console.log('   This could mean:');
        console.log('   1. User has no kind 1301 workout events on Nostr');
        console.log('   2. Nostr relay query failed (check logs above)');
        console.log('   3. Network/relay connection issue');
        console.log('   4. Incorrect npub/hex_pubkey format');
      } else {
        console.log(`✅ Successfully cached ${result.allWorkouts.length} workouts`);
        console.log(`   📊 HealthKit: ${result.healthKitCount}`);
        console.log(`   📊 Nostr: ${result.nostrCount}`);
        console.log(`   📊 Duplicates removed: ${result.duplicateCount}`);
        console.log(`   📊 From cache: ${result.fromCache}`);
        console.log(`   ⏱️  Load duration: ${result.loadDuration}ms`);
      }

      console.log('📊 ================================');
    } catch (error) {
      console.error('❌ ================================');
      console.error('❌ WORKOUT PREFETCH FAILED');
      console.error('❌ ================================');
      console.error('❌ Error:', error);
      console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error && error.stack) {
        console.error('❌ Stack trace:', error.stack);
      }
      console.error('❌ ================================');
      // Don't throw - continue app loading
    }
  }

  async prefetchSeason1(): Promise<void> {
    console.log('🏆 ================================');
    console.log('🏆 SEASON 1 PREFETCH STARTING');
    console.log('🏆 ================================');

    try {
      const { season1Service } = await import('../season/Season1Service');

      console.log('📞 Calling Season1Service.prefetchAll()...');
      await season1Service.prefetchAll();

      console.log('📊 ================================');
      console.log('📊 SEASON 1 PREFETCH COMPLETE');
      console.log('📊 ================================');
      console.log('✅ All Season 1 data cached and ready');
    } catch (error) {
      console.error('❌ ================================');
      console.error('❌ SEASON 1 PREFETCH FAILED');
      console.error('❌ ================================');
      console.error('❌ Error:', error);
      console.error('❌ ================================');
      // Don't throw - continue app loading
    }
  }

  getPrefetchedTeams(): any[] {
    return this.prefetchedTeams;
  }

  getNDK(): NDK | null {
    return this.ndk;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async cleanup(): Promise<void> {
    if (this.ndk) {
      // Disconnect from relays
      for (const relay of this.ndk.pool.relays.values()) {
        relay.disconnect();
      }
      this.ndk = null;
      this.isInitialized = false;
    }
  }
}