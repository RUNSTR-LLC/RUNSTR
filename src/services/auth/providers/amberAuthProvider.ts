/**
 * Amber Authentication Provider
 * Secure authentication using Amber app on Android
 * Private keys never leave the Amber app
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NDKUser } from '@nostr-dev-kit/ndk';
import type { AuthResult, User } from '../../../types';
import { AmberNDKSigner } from '../amber/AmberNDKSigner';
import { DirectNostrProfileService } from '../../user/directNostrProfileService';
import nutzapService from '../../nutzap/nutzapService';
import * as Linking from 'expo-linking';

export class AmberAuthProvider {
  private signer: AmberNDKSigner | null = null;

  /**
   * Check if Amber is available on the device
   * Amber cannot be reliably detected - just check platform
   */
  static async isAvailable(): Promise<boolean> {
    // Amber is Android-only, but we can't reliably detect if it's installed
    // The security model prevents detection by design
    // Just return true for Android and handle launch failures gracefully
    return Platform.OS === 'android';
  }

  /**
   * Sign in with Amber
   */
  async signIn(): Promise<AuthResult> {
    try {
      console.log('🟠 AmberAuthProvider: Starting Amber authentication...');

      // Check platform
      if (Platform.OS !== 'android') {
        return {
          success: false,
          error: 'Amber authentication is only available on Android'
        };
      }

      // Don't check if Amber is installed - just try to use it
      // Amber's security model prevents reliable detection by design
      console.log('🟠 AmberAuthProvider: Attempting Amber connection...');

      // Create and initialize Amber signer
      this.signer = new AmberNDKSigner();

      try {
        await this.signer.blockUntilReady();
      } catch (error) {
        console.error('❌ AmberAuthProvider: Failed to initialize Amber:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to connect to Amber'
        };
      }

      // Get user from signer
      const ndkUser = await this.signer.user();
      if (!ndkUser || !ndkUser.pubkey) {
        return {
          success: false,
          error: 'Failed to get public key from Amber'
        };
      }

      const npub = ndkUser.npub;
      const hexPubkey = ndkUser.pubkey;

      console.log('✅ AmberAuthProvider: Got pubkey from Amber:', npub.slice(0, 20) + '...');

      // Store authentication method and keys
      await AsyncStorage.setItem('@runstr:auth_method', 'amber');
      await AsyncStorage.setItem('@runstr:amber_pubkey', hexPubkey);
      await AsyncStorage.setItem('@runstr:npub', npub);
      await AsyncStorage.setItem('@runstr:hex_pubkey', hexPubkey);

      // Initialize NutZap wallet (optional, don't fail auth if it fails)
      try {
        console.log('💰 AmberAuthProvider: Initializing NutZap wallet...');
        // For Amber, we don't have access to nsec, so pass null
        // NutZap can work with just pubkey for receiving
        const walletState = await nutzapService.initializeForReceiveOnly(hexPubkey);
        if (walletState.created) {
          console.log('✅ AmberAuthProvider: NutZap wallet configured for receiving');
        }
      } catch (walletError) {
        console.warn('⚠️ AmberAuthProvider: NutZap initialization failed (non-fatal):', walletError);
      }

      // Get profile from Nostr using DirectNostrProfileService
      let directUser = null;
      try {
        // Set the public key for DirectNostrProfileService to use
        await AsyncStorage.setItem('@runstr:hex_pubkey', hexPubkey);
        directUser = await DirectNostrProfileService.getCurrentUserProfile();
      } catch (profileError) {
        console.warn('⚠️ Profile load failed, using fallback:', profileError);
        directUser = await DirectNostrProfileService.getFallbackProfile();
      }

      if (!directUser) {
        // Create a basic user if no profile exists
        const user: User = {
          id: npub,
          name: 'Amber User',
          email: '',
          npub: npub,
          role: 'member',
          createdAt: new Date().toISOString()
        };

        console.log('✅ AmberAuthProvider: Created basic user profile');

        return {
          success: true,
          user,
          needsOnboarding: false,
          needsRoleSelection: false
        };
      }

      // Convert DirectNostrUser to User
      const user: User = {
        id: directUser.id,
        name: directUser.name,
        email: directUser.email,
        npub: directUser.npub,
        role: directUser.role || 'member',
        teamId: directUser.teamId,
        currentTeamId: directUser.currentTeamId,
        createdAt: directUser.createdAt,
        lastSyncAt: directUser.lastSyncAt,
        bio: directUser.bio,
        website: directUser.website,
        picture: directUser.picture,
        banner: directUser.banner,
        lud16: directUser.lud16,
        displayName: directUser.displayName,
        isSupabaseSynced: false
      };

      console.log('✅ AmberAuthProvider: Amber authentication successful:', {
        id: user.id,
        name: user.name,
        npub: user.npub.slice(0, 20) + '...',
        hasPicture: !!user.picture,
        hasLightning: !!user.lud16
      });

      return {
        success: true,
        user,
        needsOnboarding: false,
        needsRoleSelection: false
      };
    } catch (error) {
      console.error('❌ AmberAuthProvider: Authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Amber authentication failed'
      };
    }
  }

  /**
   * Get the current Amber signer instance
   */
  getSigner(): AmberNDKSigner | null {
    return this.signer;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.signer) {
      this.signer.cleanup();
      this.signer = null;
    }
  }
}

export default AmberAuthProvider;