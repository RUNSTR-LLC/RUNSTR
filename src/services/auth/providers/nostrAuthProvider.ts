/**
 * Nostr Authentication Provider
 * Pure Nostr-based authentication using nsec private keys
 */

import {
  generateNostrKeyPair,
  validateNsec,
  nsecToNpub,
  generateDisplayName,
  normalizeNsecInput,
} from '../../../utils/nostr';
import { storeAuthenticationData } from '../../../utils/nostrAuth';
import type { AuthResult, CreateUserData, User } from '../../../types';
import {
  DirectNostrProfileService,
  type DirectNostrUser,
} from '../../user/directNostrProfileService';
// import nutzapService from '../../nutzap/nutzapService';
import { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { UnifiedSigningService } from '../UnifiedSigningService';

export class NostrAuthProvider {
  /**
   * Pure Nostr authentication
   * Uses DirectNostrProfileService for complete Nostr-native authentication
   */
  async signInPureNostr(nsecInput: string): Promise<AuthResult> {
    try {
      console.log(
        '🔐 NostrAuthProvider: Starting pure Nostr authentication...'
      );

      // CRITICAL: Clear any cached signer state before login
      // This ensures fresh signer creation after re-login
      UnifiedSigningService.getInstance().clearCache();
      console.log('🔐 NostrAuthProvider: Cleared signer cache for fresh login');

      // CRITICAL: Clear profile cache to prevent stale/wrong profile data
      // This ensures fresh profile fetch after re-login
      try {
        const { UnifiedNostrCache } = await import('../../cache/UnifiedNostrCache');
        const unifiedCache = UnifiedNostrCache.getInstance();
        await unifiedCache.clear();
        console.log('🗑️ NostrAuthProvider: Cleared UnifiedNostrCache for fresh login');
      } catch (e) {
        console.warn('⚠️ NostrAuthProvider: UnifiedNostrCache clear failed:', e);
      }

      // ALSO clear NostrProfileService cache to force fresh profile fetch
      // This ensures banner and other profile fields are fetched fresh from relays
      try {
        const { nostrProfileService } = await import('../../nostr/NostrProfileService');
        await nostrProfileService.clearCache();
        console.log('🗑️ NostrAuthProvider: Cleared NostrProfileService cache');
      } catch (e) {
        console.warn('⚠️ NostrAuthProvider: NostrProfileService cache clear failed:', e);
      }

      // Validate and normalize nsec input
      const nsec = normalizeNsecInput(nsecInput);

      if (!validateNsec(nsec)) {
        return {
          success: false,
          error: 'Invalid nsec format. Please check your private key.',
        };
      }

      // Generate npub from nsec
      const npub = nsecToNpub(nsec);
      if (!npub) {
        return {
          success: false,
          error: 'Failed to generate npub from nsec',
        };
      }

      console.log(
        '✅ NostrAuthProvider: Valid nsec provided, npub:',
        npub.slice(0, 20) + '...'
      );

      // Store keys using unified auth system with verification
      // Use npub as userId for consistent key generation
      const stored = await storeAuthenticationData(nsec, npub);
      if (!stored) {
        console.error(
          '❌ NostrAuthProvider: Failed to store authentication data'
        );
        return {
          success: false,
          error: 'Failed to save authentication. Please try again.',
        };
      }
      console.log('✅ NostrAuthProvider: Authentication stored and verified');

      // Import AsyncStorage and store current user pubkey for wallet verification
      // Also explicitly set auth method to prevent Amber fallback bug
      const AsyncStorage = (
        await import('@react-native-async-storage/async-storage')
      ).default;

      // Verify stored npub matches what we expect
      const verifyNpub = await AsyncStorage.getItem('@runstr:npub');
      console.log('🔑 NostrAuthProvider: Stored npub verification:', {
        expected: npub.slice(0, 20) + '...',
        stored: verifyNpub?.slice(0, 20) + '...',
        match: npub === verifyNpub,
      });

      // CRITICAL: Explicitly set auth method to prevent Amber fallback
      // Without this, if SecureNsecStorage.hasNsec() fails, the app falls back to
      // checking amber_pubkey and incorrectly uses AmberNDKSigner
      await AsyncStorage.setItem('@runstr:auth_method', 'nostr');

      // CRITICAL: Clear any leftover Amber data to prevent cross-contamination
      // This ensures users who previously tried Amber don't get NIP-55 signer dialogs
      await AsyncStorage.removeItem('@runstr:amber_pubkey');
      console.log('✅ NostrAuthProvider: Set auth_method=nostr, cleared amber_pubkey');

      // Store current user pubkey for wallet verification
      const { npubToHex } = await import('../../../utils/ndkConversion');
      const hexPubkey = npubToHex(npub);

      if (hexPubkey) {
        // CRITICAL: Store pubkey BEFORE wallet initialization to ensure correct user isolation
        await AsyncStorage.setItem('@runstr:hex_pubkey', hexPubkey);
        console.log(
          '✅ NostrAuthProvider: Current user pubkey stored for wallet verification'
        );
        console.log(
          '🔑 NostrAuthProvider: User pubkey (hex):',
          hexPubkey.slice(0, 16) + '...'
        );

        // Verify stored pubkey matches what we just set
        const verifyPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
        if (verifyPubkey !== hexPubkey) {
          console.error(
            '❌ NostrAuthProvider: CRITICAL - Stored pubkey mismatch!'
          );
          console.error('❌ Expected:', hexPubkey.slice(0, 16) + '...');
          console.error('❌ Got:', verifyPubkey?.slice(0, 16) + '...');
        } else {
          console.log('✅ NostrAuthProvider: Pubkey verification successful');
        }
      }

      // Initialize NutZap wallet for user (auto-creates if doesn't exist)
      try {
        console.log('💰 NostrAuthProvider: Initializing NutZap wallet...');
        console.log(
          '💰 NostrAuthProvider: Wallet will be isolated to pubkey:',
          hexPubkey?.slice(0, 16) + '...'
        );

        const walletState = await nutzapService.initialize(nsec);

        if (walletState.created) {
          console.log(
            '✅ NostrAuthProvider: New NutZap wallet created for user'
          );
          console.log('💰 Initial wallet balance: 0 sats');
        } else {
          console.log('✅ NostrAuthProvider: Existing NutZap wallet loaded');
          console.log(
            '💰 Current wallet balance:',
            walletState.balance,
            'sats'
          );
          console.log('💰 Wallet has', walletState.proofCount || 0, 'proofs');
        }

        // Verify wallet is using correct storage keys
        const walletProofsKey = `@runstr:wallet_proofs:${hexPubkey}`;
        const storedProofs = await AsyncStorage.getItem(walletProofsKey);
        console.log('💰 Wallet storage key:', walletProofsKey);
        console.log('💰 Wallet has stored proofs:', !!storedProofs);
      } catch (walletError) {
        // Don't fail auth if wallet creation fails - wallet can be created later
        console.warn(
          '⚠️ NostrAuthProvider: NutZap wallet initialization failed (non-fatal):',
          walletError
        );
      }

      // Get profile using DirectNostrProfileService (pure Nostr)
      const directUser =
        await DirectNostrProfileService.getCurrentUserProfile();

      if (!directUser) {
        return {
          success: false,
          error: 'Failed to load Nostr profile data',
        };
      }

      // Convert DirectNostrUser to User for compatibility
      const user: User = {
        id: directUser.id,
        name: directUser.name,
        email: directUser.email,
        npub: directUser.npub,
        role: directUser.role,
        teamId: directUser.teamId,
        currentTeamId: directUser.currentTeamId,
        createdAt: directUser.createdAt,
        lastSyncAt: directUser.lastSyncAt,
        // Nostr profile fields
        bio: directUser.bio,
        website: directUser.website,
        picture: directUser.picture,
        banner: directUser.banner,
        lud16: directUser.lud16,
        displayName: directUser.displayName,
      };

      console.log(
        '✅ NostrAuthProvider: Pure Nostr authentication successful:',
        {
          id: user.id,
          name: user.name,
          npub: user.npub.slice(0, 20) + '...',
          hasPicture: !!user.picture,
          hasBanner: !!user.banner,
          hasLightning: !!user.lud16,
        }
      );

      return {
        success: true,
        user,
        needsOnboarding: false, // Pure Nostr users don't need traditional onboarding
        needsRoleSelection: false, // Default to member role
      };
    } catch (error) {
      console.error(
        '❌ NostrAuthProvider: Pure Nostr authentication failed:',
        error
      );
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Pure Nostr authentication failed',
      };
    }
  }

  /**
   * Sign up with new Nostr identity - generates new keypair
   * Creates a fresh Nostr identity for users without existing keys
   */
  async signUpPureNostr(): Promise<AuthResult> {
    try {
      console.log(
        '🔐 NostrAuthProvider: Starting Nostr signup (generating new identity)...'
      );

      // CRITICAL: Clear any cached signer state before signup
      // This ensures fresh signer creation for new identity
      UnifiedSigningService.getInstance().clearCache();
      console.log('🔐 NostrAuthProvider: Cleared signer cache for fresh signup');

      // Generate new Nostr keypair using NDK (per CLAUDE.md requirements)
      console.log('🔑 Generating new Nostr keypair with NDK...');

      let signer;
      let privateKeyHex: string | undefined;
      let ndkUser;

      try {
        // Try the standard NDK generation method
        signer = NDKPrivateKeySigner.generate();

        // Get the user from signer to extract keys
        ndkUser = await signer.user();

        // Extract the private key in hex format from NDK
        privateKeyHex = signer.privateKey;

        // If privateKey is undefined, try alternate method
        if (!privateKeyHex) {
          console.log(
            '🔑 Standard generation returned no key, trying alternate method...'
          );
          // Import the global crypto that was polyfilled in index.js
          // @ts-ignore - crypto is polyfilled globally
          if (
            typeof global.crypto !== 'undefined' &&
            global.crypto.getRandomValues
          ) {
            const randomBytes = global.crypto.getRandomValues(
              new Uint8Array(32)
            );
            privateKeyHex = Array.from(randomBytes)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');
          } else {
            // Final fallback: use NDK's internal utilities
            const { randomBytes } = await import('@noble/hashes/utils');
            const privateKeyBytes = randomBytes(32);
            privateKeyHex = Array.from(privateKeyBytes)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');
          }

          // Create signer from the hex private key
          signer = new NDKPrivateKeySigner(privateKeyHex);
          ndkUser = await signer.user();
        }
      } catch (genError) {
        console.error('🔑 NDK generation failed, using fallback:', genError);

        // Fallback: Try multiple methods to generate random bytes
        // @ts-ignore - crypto might be polyfilled globally
        if (
          typeof global.crypto !== 'undefined' &&
          global.crypto.getRandomValues
        ) {
          const randomBytes = global.crypto.getRandomValues(new Uint8Array(32));
          privateKeyHex = Array.from(randomBytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        } else {
          // Use noble/hashes as final fallback
          const { randomBytes } = await import('@noble/hashes/utils');
          const privateKeyBytes = randomBytes(32);
          privateKeyHex = Array.from(privateKeyBytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        }

        // Create signer from the hex private key
        signer = new NDKPrivateKeySigner(privateKeyHex);
        ndkUser = await signer.user();
      }

      console.log(
        '🔑 Generated private key (hex):',
        privateKeyHex ? privateKeyHex.slice(0, 16) + '...' : 'null'
      );

      if (!privateKeyHex || privateKeyHex.length !== 64) {
        throw new Error('Failed to generate valid 32-byte private key');
      }

      // Use our custom bech32 encoding that works in React Native
      const { nsecEncode } = await import('../../../utils/nostrEncoding');
      const nsec = nsecEncode(privateKeyHex);
      const npub = ndkUser.npub;
      const hexPubkey = ndkUser.pubkey;

      console.log(
        '🔑 Generated nsec using custom encoder:',
        nsec ? nsec.slice(0, 10) + '...' : 'null'
      );
      console.log(
        '🔑 NDK provided npub:',
        npub ? npub.slice(0, 20) + '...' : 'null'
      );

      // Validate all generated values
      if (!nsec || !nsec.startsWith('nsec1')) {
        console.error(
          '❌ NostrAuthProvider: Invalid nsec generated:',
          nsec?.slice(0, 10) || 'null'
        );
        console.error(
          '❌ NostrAuthProvider: hex private key was:',
          privateKeyHex?.slice(0, 16) || 'null'
        );
        throw new Error('Failed to generate valid nsec format');
      }

      if (!npub || !npub.startsWith('npub1')) {
        console.error(
          '❌ NostrAuthProvider: Invalid npub generated:',
          npub?.slice(0, 10) || 'null'
        );
        throw new Error('Failed to generate valid npub format');
      }

      if (!hexPubkey || hexPubkey.length !== 64) {
        console.error(
          '❌ NostrAuthProvider: Invalid hex pubkey generated:',
          hexPubkey?.slice(0, 16) || 'null'
        );
        throw new Error('Failed to generate valid hex pubkey');
      }

      console.log('✅ NostrAuthProvider: Generated new Nostr identity:', {
        nsec: nsec.slice(0, 10) + '...',
        npub: npub.slice(0, 20) + '...',
        hexPubkey: hexPubkey.slice(0, 16) + '...',
      });

      // Store keys using unified auth system with verification
      console.log('💾 NostrAuthProvider: Storing generated identity...');
      const stored = await storeAuthenticationData(nsec, npub);
      if (!stored) {
        console.error(
          '❌ NostrAuthProvider: Failed to store generated authentication data'
        );
        console.error(
          '❌ NostrAuthProvider: Storage failed for nsec:',
          nsec.slice(0, 10) + '...'
        );
        console.error(
          '❌ NostrAuthProvider: Storage failed for npub:',
          npub.slice(0, 20) + '...'
        );
        return {
          success: false,
          error:
            'Failed to save generated identity. Please check device storage and try again.',
        };
      }
      console.log(
        '✅ NostrAuthProvider: Generated identity stored and verified'
      );

      // Import AsyncStorage for auth method and pubkey storage
      const AsyncStorage = (
        await import('@react-native-async-storage/async-storage')
      ).default;

      // CRITICAL: Explicitly set auth method to prevent Amber fallback
      // Without this, if SecureNsecStorage.hasNsec() fails, the app falls back to
      // checking amber_pubkey and incorrectly uses AmberNDKSigner
      await AsyncStorage.setItem('@runstr:auth_method', 'nostr');

      // CRITICAL: Clear any leftover Amber data to prevent cross-contamination
      // This ensures users who previously tried Amber don't get NIP-55 signer dialogs
      await AsyncStorage.removeItem('@runstr:amber_pubkey');
      console.log('✅ NostrAuthProvider: Set auth_method=nostr, cleared amber_pubkey');

      // Store current user pubkey for wallet verification
      await AsyncStorage.setItem('@runstr:hex_pubkey', hexPubkey);
      console.log(
        '✅ NostrAuthProvider: Current user pubkey stored for wallet verification'
      );

      // Initialize NutZap wallet for new user (auto-creates wallet)
      try {
        console.log(
          '💰 NostrAuthProvider: Creating NutZap wallet for new user...'
        );
        const walletState = await nutzapService.initialize(nsec);
        if (walletState.created) {
          console.log(
            '✅ NostrAuthProvider: NutZap wallet created for new user'
          );
        } else {
          console.log(
            '✅ NostrAuthProvider: NutZap wallet already exists for user'
          );
        }
        console.log(
          '💰 NostrAuthProvider: Wallet initialization completed successfully'
        );
      } catch (walletError) {
        // Don't fail signup if wallet creation fails - wallet can be created later
        console.warn(
          '⚠️ NostrAuthProvider: NutZap wallet initialization failed (non-fatal):',
          walletError
        );
        console.warn(
          '⚠️ NostrAuthProvider: User can still proceed without wallet - wallet creation will be retried later'
        );
      }

      // Publish default profile to Nostr for new user
      try {
        console.log(
          '👤 NostrAuthProvider: Publishing default profile to Nostr...'
        );
        const { NostrProfilePublisher } = await import(
          '../../nostr/NostrProfilePublisher'
        );
        const publisher = NostrProfilePublisher.getInstance();

        const defaultProfile = {
          name: 'Anonymous Athlete',
          display_name: 'Anonymous Athlete',
          about: 'Welcome to RUNSTR! Tap to edit your profile.',
          picture:
            'https://blossom.primal.net/3c33216e58dcfa8f24803302b642eb4ccb069d63002b62d2cc18fdcb6981f1d4.png',
          banner:
            'https://blossom.primal.net/4517738732ccb674e856c000a5f77975fb7770038ce9719815189aca9fb3642b.jpg',
        };

        const result = await publisher.publishProfileUpdate(defaultProfile);
        if (result.success) {
          console.log(
            '✅ NostrAuthProvider: Default profile published to Nostr successfully'
          );
        } else {
          console.warn(
            '⚠️ NostrAuthProvider: Failed to publish default profile (non-fatal):',
            result.error
          );
        }
      } catch (profileError) {
        // Don't fail signup if profile publishing fails
        console.warn(
          '⚠️ NostrAuthProvider: Profile publishing failed (non-fatal):',
          profileError
        );
      }

      // Create a basic user profile for the new identity
      console.log('👤 NostrAuthProvider: Creating user profile...');
      const displayName = 'Anonymous Athlete';
      const now = new Date().toISOString();
      console.log('👤 NostrAuthProvider: Display name:', displayName);

      const user: User = {
        id: npub,
        name: displayName,
        email: '',
        npub: npub,
        role: 'member',
        teamId: undefined,
        currentTeamId: undefined,
        createdAt: now,
        lastSyncAt: now,
        // Nostr profile fields - default values for new user
        bio: 'Welcome to RUNSTR! Tap to edit your profile.',
        website: '',
        picture:
          'https://blossom.primal.net/3c33216e58dcfa8f24803302b642eb4ccb069d63002b62d2cc18fdcb6981f1d4.png',
        banner:
          'https://blossom.primal.net/4517738732ccb674e856c000a5f77975fb7770038ce9719815189aca9fb3642b.jpg',
        lud16: '',
        displayName: displayName,
      };

      console.log(
        '✅ NostrAuthProvider: Nostr signup successful - new identity created:',
        {
          id: user.id,
          name: user.name,
          displayName: user.displayName,
          npub: user.npub.slice(0, 20) + '...',
          role: user.role,
          createdAt: user.createdAt,
        }
      );

      return {
        success: true,
        user,
        needsOnboarding: true, // New users should see onboarding
        needsRoleSelection: false, // Default to member role
        nsec, // Pass the nsec for the password notice screen
      };
    } catch (error) {
      console.error('❌ NostrAuthProvider: Nostr signup failed:', error);
      console.error('❌ NostrAuthProvider: Signup failure details:', {
        errorType: error?.constructor?.name || 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
      });

      // Provide specific error messages based on error type
      let errorMessage = 'Failed to generate Nostr identity';
      if (error instanceof Error) {
        if (error.message.includes('nsec format')) {
          errorMessage =
            'Failed to generate valid private key. Please try again.';
        } else if (error.message.includes('npub format')) {
          errorMessage =
            'Failed to generate valid public key. Please try again.';
        } else if (error.message.includes('storage')) {
          errorMessage =
            'Failed to save identity to device storage. Please check available storage space.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export default NostrAuthProvider;
