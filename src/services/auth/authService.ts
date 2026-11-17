/**
 * Authentication Service
 * Handles user authentication with Nostr-only support
 */

import { clearNostrStorage } from '../../utils/nostr';
import type { ApiResponse, AuthResult, User } from '../../types';
import { NostrAuthProvider } from './providers/nostrAuthProvider';
import { AmberAuthProvider } from './providers/amberAuthProvider';
import { storeAuthenticationData } from '../../utils/nostrAuth';
import { DirectNostrProfileService } from '../user/directNostrProfileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  stashRunsForSignOut,
  claimStashedRuns,
} from '../fitness/accountRunStash';

const HEX_PUBKEY_KEY = '@runstr:hex_pubkey';
const claimRunsForSignedInUser = async () =>
  claimStashedRuns(await AsyncStorage.getItem(HEX_PUBKEY_KEY));

export class AuthService {
  /**
   * Sign out with Nostr and wallet cleanup
   */
  static async signOut(): Promise<ApiResponse> {
    try {
      console.log('🔓 AuthService: Starting sign out with full cleanup...');

      // Keep this account's runs on the phone, keyed by its pubkey, so the
      // next account starts empty and this one gets them back on sign-in
      await stashRunsForSignOut(await AsyncStorage.getItem(HEX_PUBKEY_KEY));

      // Clear Nostr keys and data
      await clearNostrStorage();

      // CRITICAL: Clear GlobalNDK signer to prevent stale signing identity after logout
      try {
        const { GlobalNDKService } = await import('../nostr/GlobalNDKService');
        const ndk = await GlobalNDKService.getInstance();
        ndk.signer = undefined;
        console.log('✅ AuthService: GlobalNDK signer cleared');
      } catch (err) {
        console.warn('⚠️ AuthService: Failed to clear GlobalNDK signer:', err);
      }

      // Clear wallet-related data and onboarding flags to prevent cross-user contamination
      await AsyncStorage.multiRemove([
        '@runstr:wallet_proofs',
        '@runstr:wallet_pubkey',
        '@runstr:wallet_mint',
        '@runstr:hex_pubkey',
        '@runstr:tx_history',
        '@runstr:last_sync',
        '@runstr:onboarding_completed', // Clear onboarding flag to ensure clean state
      ]);
      console.log('✅ AuthService: Wallet data cleared');

      // CRITICAL: Clear all caches to prevent cross-user data contamination
      try {
        const { appCache } = await import('../../utils/cache');
        await appCache.clear();
        console.log('✅ AuthService: App cache cleared');
      } catch (err) {
        console.warn('⚠️ AuthService: App cache clear failed:', err);
      }

      // SECURITY: Clear UnifiedSigningService cache (critical for Amber logout)
      try {
        const { UnifiedSigningService } = await import(
          './UnifiedSigningService'
        );
        UnifiedSigningService.getInstance().clearCache();
        console.log('✅ AuthService: UnifiedSigningService cache cleared');
      } catch (err) {
        console.warn(
          '⚠️ AuthService: UnifiedSigningService cache clear skipped:',
          err
        );
      }

      // Remove any wallet connection string left in SecureStore by older
      // versions (the in-app wallet no longer exists)
      try {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.deleteItemAsync('nwc_string');
      } catch (err) {
        console.warn('⚠️ AuthService: Legacy wallet key clear failed:', err);
      }

      // Clear unified Nostr cache
      try {
        const unifiedCache = (await import('../cache/UnifiedNostrCache')).default;
        await unifiedCache.clear();
        console.log('✅ AuthService: Unified Nostr cache cleared');
      } catch (err) {
        console.warn('⚠️ AuthService: Unified cache clear failed:', err);
      }

      // Clear all remaining user-specific AsyncStorage keys
      try {
        await AsyncStorage.multiRemove([
          '@runstr:app_init_completed',
          '@runstr:first_launch',
          '@runstr:is_new_signup',
          '@runstr:session_state',
          '@runstr:gps_points',
          '@runstr:nutzap_wallet',
          '@runstr:daily_step_data',
          '@runstr:streak_data',
          'nwc_manual_connection',
          // Challenge join states (prevent cross-user contamination)
          '@runstr:running_bitcoin_joined',
          '@runstr:running_bitcoin_rewards_claimed',
          // Club state (prevent cross-user contamination)
          '@runstr:club_id',
          '@runstr:club_name',
          '@runstr:club_role',
          '@runstr:club_reconciled_at',
          // Team/charity state (prevent cross-user contamination)
          '@runstr:selected_team_id',
          '@runstr:charity_stats',
          // Lightning address (CRITICAL: prevent rewards going to wrong user)
          '@runstr:reward_lightning_address',
          '@runstr:lightning_address',
        ]);
        console.log('✅ AuthService: Additional user data cleared');
      } catch (err) {
        console.warn('⚠️ AuthService: Additional data clear failed:', err);
      }

      console.log(
        '✅ AuthService: Sign out complete - all caches and data cleared'
      );

      return {
        success: true,
        message: 'Successfully signed out',
      };
    } catch (error) {
      console.error('❌ AuthService: Sign out error:', error);
      return {
        success: false,
        error: 'Failed to sign out',
      };
    }
  }

  /**
   * Check if user is authenticated with Nostr
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      // Check if we have stored Nostr credentials
      const { hasStoredNostrKeys } = await import('../../utils/nostr');
      const hasNostrKeys = await hasStoredNostrKeys();
      if (hasNostrKeys) {
        console.log('AuthService: Found stored Nostr credentials');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Sign in with Nostr using nsec
   */
  static async signInWithNostr(nsecInput: string): Promise<AuthResult> {
    try {
      const nostrProvider = new NostrAuthProvider();
      const result = await nostrProvider.signInPureNostr(nsecInput);

      if (!result.success || !result.user) {
        return result;
      }

      console.log('AuthService: Nostr authentication successful');
      await claimRunsForSignedInUser();
      return result;
    } catch (error) {
      console.error('AuthService: Nostr authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Sign in with Amber - external key management
   */
  static async signInWithAmber(): Promise<AuthResult> {
    try {
      console.log('AuthService: Starting Amber Sign-In...');

      // Check if Amber Sign-In is available
      const isAvailable = await AmberAuthProvider.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error:
            'Amber is not installed. Please install Amber from the Play Store.',
        };
      }

      // Use Amber provider to authenticate
      const amberProvider = new AmberAuthProvider();
      const result = await amberProvider.signIn();

      if (!result.success) {
        return result;
      }

      console.log('AuthService: Amber authentication successful');
      await claimRunsForSignedInUser();
      return result;
    } catch (error) {
      console.error('AuthService: Amber authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Amber Sign-In failed',
      };
    }
  }

  /**
   * Sign up with new Nostr identity - generates fresh keypair
   */
  static async signUpWithNostr(): Promise<AuthResult> {
    try {
      console.log(
        'AuthService: Starting Nostr signup (generating new identity)...'
      );

      const nostrProvider = new NostrAuthProvider();
      const result = await nostrProvider.signUpPureNostr();

      if (!result.success || !result.user) {
        return result;
      }

      console.log(
        'AuthService: Nostr signup successful - new identity created'
      );

      return result;
    } catch (error) {
      console.error('AuthService: Nostr signup error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create Nostr identity',
      };
    }
  }
}
