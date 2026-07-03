/**
 * AppInitializationService
 * Background data loading service - runs silently without blocking UI
 * Handles initial data prefetching for authenticated users
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NostrInitializationService } from '../nostr/NostrInitializationService';
import nostrPrefetchService from '../nostr/NostrPrefetchService';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import { WoTService } from '../wot/WoTService';
import { SELF_TEAM_ID, COINOS_TEAM_ID } from '../../constants/charities';

class AppInitializationService {
  private static instance: AppInitializationService | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private abortController: AbortController | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private _hasCompleted = false;

  private constructor() {}

  static getInstance(): AppInitializationService {
    if (!AppInitializationService.instance) {
      AppInitializationService.instance = new AppInitializationService();
    }
    return AppInitializationService.instance;
  }

  /**
   * Initialize app data in background
   * Non-blocking - app can show UI while this runs
   */
  async initializeInBackground(): Promise<void> {
    // Prevent duplicate initializations
    if (this.isInitialized || this.isInitializing) {
      console.log('⏭️ AppInit: Already initialized or in progress, skipping');
      return;
    }

    this.isInitializing = true;
    this._hasCompleted = false; // Reset completion flag
    const MAX_INIT_TIME = 12000; // 12 second timeout (increased for first launch)

    // Create AbortController for proper cancellation
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const initializationPromise = (async () => {
      try {
        // Run one-time CoinOS → Self team migration
        await this.migrateCoinOSToSelf();

        console.log('🚀 AppInit: Starting background data loading...');

        // Step 1: Connect to Nostr relays
        console.log('📡 AppInit: Connecting to Nostr relays...');

        // Check if aborted before expensive operations
        if (signal.aborted) {
          console.log('⚠️ AppInit: Aborted before relay connection');
          return;
        }

        const { GlobalNDKService } = await import('../nostr/GlobalNDKService');
        const initService = NostrInitializationService.getInstance();

        try {
          await initService.connectToRelays();
          await GlobalNDKService.getInstance();
          // Wait for minimum 2 relays (fast threshold)
          await GlobalNDKService.waitForMinimumConnection(2, 2000);
          console.log('✅ AppInit: Nostr connected');
        } catch (ndkError) {
          console.error(
            '⚠️ AppInit: NDK connection failed, continuing offline'
          );
          GlobalNDKService.startBackgroundRetry();
        }

        // Step 2: Load user profile
        console.log('👤 AppInit: Loading profile...');

        // Check if aborted before profile operations
        if (signal.aborted) {
          console.log('⚠️ AppInit: Aborted before profile load');
          return;
        }

        const identifiers = await getUserNostrIdentifiers();

        if (identifiers) {
          const { DirectNostrProfileService } = await import(
            '../user/directNostrProfileService'
          );
          await DirectNostrProfileService.getCurrentUserProfile().catch(() =>
            console.warn('Profile fetch failed, using cache')
          );
          console.log('✅ AppInit: Profile loaded');

          // Pre-fetch WoT score for social posting eligibility
          // This gates Kind 1 posting to users with WoT > 0
          if (identifiers.hexPubkey) {
            try {
              console.log('🔐 AppInit: Pre-fetching WoT score...');
              const wotService = WoTService.getInstance();
              await wotService.fetchAndCacheScore(identifiers.hexPubkey);
              console.log('✅ AppInit: WoT score cached');
            } catch (error) {
              console.warn('⚠️ AppInit: WoT pre-fetch failed (non-blocking):', error);
            }
          }

          // Check if aborted before prefetch
          if (signal.aborted) {
            console.log('⚠️ AppInit: Aborted before data prefetch');
            return;
          }

          // Step 3: Prefetch all user data (teams, workouts, wallet, competitions)
          console.log('📦 AppInit: Prefetching all data...');
          await nostrPrefetchService.prefetchAllUserData(
            (step, total, message) => {
              console.log(`📊 AppInit: ${message} (${step}/${total})`);
            }
          );

          console.log('✅ AppInit: All data loaded!');

          // Step 4: Set up HealthKit background delivery (iOS only)
          // Must be re-registered every app launch per Apple requirements
          if (Platform.OS === 'ios') {
            try {
              const { HealthKitService } = await import('../fitness/healthKitService');
              const healthKit = HealthKitService.getInstance();
              if (healthKit.getStatus().authorized) {
                const { HealthKitBackgroundService } = await import(
                  '../fitness/HealthKitBackgroundService'
                );
                await HealthKitBackgroundService.getInstance().setupBackgroundDelivery();
                console.log('✅ AppInit: HealthKit background delivery registered');
              }
            } catch (hkError) {
              console.warn('⚠️ AppInit: HealthKit background setup failed (non-blocking):', hkError);
            }
          }
        }

        // CRITICAL FIX: Only set flags if not aborted and not already completed
        if (!signal.aborted && !this._hasCompleted) {
          this._hasCompleted = true; // Mark as completed to prevent timeout from running
          this.isInitialized = true;

          // Cancel the timeout since we succeeded
          if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
            console.log(
              '✅ AppInit: Timeout cancelled - initialization succeeded'
            );
          }

          // Set completion flag ONLY if we weren't aborted
          try {
            await AsyncStorage.setItem('@runstr:app_init_completed', 'true');
          } catch (error) {
            console.warn('⚠️ AppInit: Failed to save completion flag:', error);
          }
        }
      } catch (error) {
        console.error('❌ AppInit: Initialization error:', error);
        // Continue - app can work with cached/partial data
      } finally {
        this.isInitializing = false;
      }
    })();

    // Emergency timeout with proper cleanup
    const timeoutPromise = new Promise<void>((resolve) => {
      this.timeoutId = setTimeout(() => {
        // Only execute timeout if initialization hasn't completed
        if (!this._hasCompleted) {
          console.warn('⚠️ AppInit: Timeout reached - partial data loaded');
          this._hasCompleted = true; // Prevent success path from running

          // CRITICAL: Abort the initialization to prevent orphaned promises
          if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
          }

          // Clean up state
          this.isInitializing = false;
          this.isInitialized = false;
          this.timeoutId = null;
        } else {
          console.log(
            '✅ AppInit: Timeout skipped - initialization already completed'
          );
        }

        resolve();
      }, MAX_INIT_TIME);
    });

    // Race between initialization and timeout
    await Promise.race([initializationPromise, timeoutPromise]);

    // Final cleanup
    this.abortController = null;
  }

  /**
   * One-time migration: CoinOS team → Self team
   * If user had CoinOS selected, swap to 'self' and recover Lightning address
   */
  private async migrateCoinOSToSelf(): Promise<void> {
    const MIGRATION_KEY = '@runstr:migration_coinos_to_self_done';
    try {
      const done = await AsyncStorage.getItem(MIGRATION_KEY);
      if (done === 'true') return;

      const selectedTeam = await AsyncStorage.getItem('@runstr:selected_team_id');
      if (selectedTeam !== COINOS_TEAM_ID) {
        await AsyncStorage.setItem(MIGRATION_KEY, 'true');
        return;
      }

      console.log('🔄 AppInit: Migrating CoinOS team → Self team...');

      // Check if user already has a reward Lightning address
      const { RewardLightningAddressService } = await import('../rewards/RewardLightningAddressService');
      const hasAddress = await RewardLightningAddressService.hasRewardLightningAddress();

      if (hasAddress) {
        // User has Lightning address - just swap team
        await AsyncStorage.setItem('@runstr:selected_team_id', SELF_TEAM_ID);
        console.log('✅ AppInit: Migrated CoinOS → Self (existing Lightning address)');
      } else {
        // Try to recover address from CoinOS account
        const { CoinOSAccountService } = await import('../wallet/CoinOSAccountService');
        const hasCoinOS = await CoinOSAccountService.hasAccount();

        if (hasCoinOS) {
          const addr = await CoinOSAccountService.getLightningAddress();
          if (addr) {
            await RewardLightningAddressService.setRewardLightningAddress(addr);
            await AsyncStorage.setItem('@runstr:selected_team_id', SELF_TEAM_ID);
            console.log(`✅ AppInit: Migrated CoinOS → Self (recovered ${addr})`);
          } else {
            // CoinOS account but no address - default to self (post cardio-only simplification)
            await AsyncStorage.setItem('@runstr:selected_team_id', SELF_TEAM_ID);
            console.log('⚠️ AppInit: CoinOS no address, defaulting to Self');
          }
        } else {
          // No CoinOS account at all - default to self
          await AsyncStorage.setItem('@runstr:selected_team_id', SELF_TEAM_ID);
          console.log('⚠️ AppInit: No CoinOS account, defaulting to Self');
        }
      }

      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    } catch (error) {
      console.warn('⚠️ AppInit: CoinOS migration failed (non-blocking):', error);
      // Don't block app startup - mark as done to avoid retrying
      await AsyncStorage.setItem(MIGRATION_KEY, 'true').catch(() => {});
    }
  }

  /**
   * Check if initialization has completed
   */
  async hasCompleted(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(
        '@runstr:app_init_completed'
      );
      return completed === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Reset initialization state (for testing)
   */
  async reset(): Promise<void> {
    this.isInitialized = false;
    this.isInitializing = false;
    await AsyncStorage.removeItem('@runstr:app_init_completed');
  }
}

export default AppInitializationService.getInstance();
