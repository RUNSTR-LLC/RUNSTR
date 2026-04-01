import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appCache } from '../../utils/cache';
import { getNpubFromStorage } from '../../utils/nostr';
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

  private constructor() {}

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
      ];

      // Store relay URLs for later use
      await AsyncStorage.setItem('nostr_relays', JSON.stringify(defaultRelays));

      // Pre-initialize relay connections
      for (const relay of defaultRelays) {
        try {
          console.log(`Connecting to ${relay}...`);
          // Simulate connection (actual connection happens in NDK)
          await new Promise((resolve) => setTimeout(resolve, 200));
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
    // Teams/clubs now loaded from Supabase via ClubService — no relay prefetch needed
    console.log('⚡ Teams loaded from Supabase (no relay prefetch needed)');
  }

  async prefetchWorkouts(): Promise<void> {
    console.log('[NostrInit] Starting workout prefetch...');

    try {
      const userNpub = await getNpubFromStorage();
      const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');

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

      // Use WorkoutCacheService for centralized caching strategy
      // This ensures cache key alignment and proper data format
      const { WorkoutCacheService } = await import(
        '../cache/WorkoutCacheService'
      );
      const cacheService = WorkoutCacheService.getInstance();

      // ✅ OPTIMIZATION: Reduced from 100 → 20 workouts for FAST initial load
      // Fetch only recent workouts for initial screen display (limit: 20 for speed)
      // This will cache in 'user_workouts_merged' key that all screens expect
      // Full workout history loaded lazily when user opens WorkoutHistory screen
      // CRITICAL: Only pass hexPubkey and limit (2 params, not 3!)
      const result = await cacheService.getMergedWorkouts(hexPubkey, 20);

      if (result.allWorkouts.length === 0) {
        console.log('[NostrInit] Workout prefetch complete: 0 workouts found');
      } else {
        console.log(`[NostrInit] Workout prefetch complete: ${result.allWorkouts.length} workouts cached in ${result.loadDuration}ms`);
      }
    } catch (error) {
      console.error('❌ ================================');
      console.error('❌ WORKOUT PREFETCH FAILED');
      console.error('❌ ================================');
      console.error('❌ Error:', error);
      console.error(
        '❌ Error type:',
        error instanceof Error ? error.constructor.name : typeof error
      );
      console.error(
        '❌ Error message:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      if (error instanceof Error && error.stack) {
        console.error('❌ Stack trace:', error.stack);
      }
      console.error('❌ ================================');
      // Don't throw - continue app loading
    }
  }

  async prefetchSeason1(): Promise<void> {
    try {
      const { season1Service } = await import('../season/Season1Service');
      await season1Service.prefetchAll();
      console.log('[NostrInit] Season 1 prefetch complete');
    } catch (error) {
      console.error('❌ ================================');
      console.error('❌ SEASON 1 PREFETCH FAILED');
      console.error('❌ ================================');
      console.error('❌ Error:', error);
      console.error('❌ ================================');
      // Don't throw - continue app loading
    }
  }

  /**
   * Prefetch Satlantis events (kind 31923) during splash
   * These are the main events shown in the app
   */
  async prefetchSatlantisEvents(): Promise<void> {
    try {
      const { SatlantisEventService } = await import(
        '../satlantis/SatlantisEventService'
      );

      // Fetch all sports events (will be cached by SatlantisEventService)
      const events = await SatlantisEventService.discoverSportsEvents();
      console.log(`[NostrInit] Satlantis events prefetch complete: ${events.length} events`);
    } catch (error) {
      console.error('❌ ================================');
      console.error('❌ SATLANTIS EVENTS PREFETCH FAILED');
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
