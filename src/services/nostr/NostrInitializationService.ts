import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import { getNostrTeamService } from './NostrTeamService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appCache } from '../../utils/cache';
import { getNpubFromStorage } from '../../utils/nostr';

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

    console.log('🚀 Initializing NDK...');

    try {
      // Get stored relay URLs
      const storedRelays = await AsyncStorage.getItem('nostr_relays');
      const relayUrls = storedRelays ? JSON.parse(storedRelays) : [
        'wss://relay.damus.io',
        'wss://relay.primal.net',
        'wss://nos.lol',
        'wss://relay.nostr.band',
      ];

      // Create NDK instance
      this.ndk = new NDK({
        explicitRelayUrls: relayUrls,
        autoConnectUserRelays: true,
        autoFetchUserMutelist: false,
      });

      // Connect to relays
      await this.ndk.connect(2000); // 2 second timeout

      // Store NDK instance globally for other services
      (global as any).preInitializedNDK = this.ndk;

      this.isInitialized = true;
      console.log('✅ NDK initialized successfully');

      return this.ndk;
    } catch (error) {
      console.error('❌ NDK initialization failed:', error);
      throw error;
    }
  }

  async prefetchTeams(): Promise<void> {
    console.log('🏃 Pre-fetching teams with caching...');

    try {
      // Use NostrTeamService for proper team discovery
      const teams = await this.teamService.discoverFitnessTeams();

      if (teams && teams.length > 0) {
        // Store in app cache with 10-minute TTL
        await appCache.set('teams_discovery', teams, 10 * 60 * 1000);

        // Also store timestamp for reference
        await appCache.set('teams_fetch_time', Date.now(), 10 * 60 * 1000);

        this.prefetchedTeams = teams;
        console.log(`✅ Pre-fetched and cached ${teams.length} teams`);
      } else {
        console.log('⚠️ No teams found during prefetch');
      }
    } catch (error) {
      console.error('❌ Team pre-fetch failed:', error);
      // Don't throw - this is non-critical
    }
  }

  async prefetchWorkouts(): Promise<void> {
    console.log('🏋️ Pre-fetching workouts with centralized caching...');

    try {
      const userNpub = await getNpubFromStorage();
      if (!userNpub) {
        console.log('⚠️ No user npub found, skipping workout prefetch');
        return;
      }

      // Get hex pubkey for WorkoutCacheService
      const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!hexPubkey) {
        console.log('⚠️ No hex pubkey found, skipping workout prefetch');
        return;
      }

      // Use WorkoutCacheService for centralized caching strategy
      // This ensures cache key alignment and proper data format
      const { WorkoutCacheService } = await import('../cache/WorkoutCacheService');
      const cacheService = WorkoutCacheService.getInstance();

      // Fetch workouts using centralized service (limit: 500 for safety)
      // This will cache in 'user_workouts_merged' key that all screens expect
      const result = await cacheService.getMergedWorkouts(hexPubkey, userNpub, 500);

      console.log(`✅ Pre-fetched and cached ${result.allWorkouts.length} workouts via WorkoutCacheService`);
      console.log(`   📊 HealthKit: ${result.healthKitCount}, Nostr: ${result.nostrCount}, Duplicates removed: ${result.duplicateCount}`);
    } catch (error) {
      console.error('❌ Failed to prefetch workouts:', error);
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