/**
 * Nostr Authentication Provider
 * Pure Nostr-based authentication using nsec private keys
 * Supabase integration disabled for immediate crash fix - will be re-enabled for optional sync
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
import { DirectNostrProfileService, type DirectNostrUser } from '../../user/directNostrProfileService';
import nutzapService from '../../nutzap/nutzapService';
import { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';

export class NostrAuthProvider {
  /**
   * Pure Nostr authentication - bypasses Supabase entirely
   * Uses DirectNostrProfileService for complete Nostr-native authentication
   * This is the ONLY active authentication method for crash fix
   */
  async signInPureNostr(nsecInput: string): Promise<AuthResult> {
    try {
      console.log('🔐 NostrAuthProvider: Starting pure Nostr authentication...');

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

      console.log('✅ NostrAuthProvider: Valid nsec provided, npub:', npub.slice(0, 20) + '...');

      // Store keys using unified auth system with verification
      // Use npub as userId for consistent key generation
      const stored = await storeAuthenticationData(nsec, npub);
      if (!stored) {
        console.error('❌ NostrAuthProvider: Failed to store authentication data');
        return {
          success: false,
          error: 'Failed to save authentication. Please try again.',
        };
      }
      console.log('✅ NostrAuthProvider: Authentication stored and verified');

      // Import AsyncStorage and store current user pubkey for wallet verification
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const { npubToHex } = await import('../../../utils/ndkConversion');
      const hexPubkey = npubToHex(npub);
      if (hexPubkey) {
        await AsyncStorage.setItem('@runstr:current_user_pubkey', hexPubkey);
        console.log('✅ NostrAuthProvider: Current user pubkey stored for wallet verification');
      }

      // Initialize NutZap wallet for user (auto-creates if doesn't exist)
      try {
        console.log('💰 NostrAuthProvider: Initializing NutZap wallet...');
        const walletState = await nutzapService.initialize(nsec);
        if (walletState.created) {
          console.log('✅ NostrAuthProvider: New NutZap wallet created for user');
        } else {
          console.log('✅ NostrAuthProvider: Existing NutZap wallet loaded');
        }
      } catch (walletError) {
        // Don't fail auth if wallet creation fails - wallet can be created later
        console.warn('⚠️ NostrAuthProvider: NutZap wallet initialization failed (non-fatal):', walletError);
      }

      // Get profile using DirectNostrProfileService (pure Nostr)
      const directUser = await DirectNostrProfileService.getCurrentUserProfile();
      
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
        // Hybrid model flag - will be used for future Supabase sync
        isSupabaseSynced: false, // Pure Nostr users start unsynced
      };

      console.log('✅ NostrAuthProvider: Pure Nostr authentication successful:', {
        id: user.id,
        name: user.name,
        npub: user.npub.slice(0, 20) + '...',
        hasPicture: !!user.picture,
        hasLightning: !!user.lud16,
        isSupabaseSynced: user.isSupabaseSynced,
      });

      return {
        success: true,
        user,
        needsOnboarding: false, // Pure Nostr users don't need traditional onboarding
        needsRoleSelection: false, // Default to member role
      };
    } catch (error) {
      console.error('❌ NostrAuthProvider: Pure Nostr authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pure Nostr authentication failed',
      };
    }
  }

  /**
   * Sign up with new Nostr identity - generates new keypair
   * Creates a fresh Nostr identity for users without existing keys
   */
  async signUpPureNostr(): Promise<AuthResult> {
    try {
      console.log('🔐 NostrAuthProvider: Starting Nostr signup (generating new identity)...');

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
          console.log('🔑 Standard generation returned no key, trying alternate method...');
          // Import the global crypto that was polyfilled in index.js
          // @ts-ignore - crypto is polyfilled globally
          if (typeof global.crypto !== 'undefined' && global.crypto.getRandomValues) {
            const randomBytes = global.crypto.getRandomValues(new Uint8Array(32));
            privateKeyHex = Array.from(randomBytes)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
          } else {
            // Final fallback: use NDK's internal utilities
            const { randomBytes } = await import('@noble/hashes/utils');
            const privateKeyBytes = randomBytes(32);
            privateKeyHex = Array.from(privateKeyBytes)
              .map(b => b.toString(16).padStart(2, '0'))
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
        if (typeof global.crypto !== 'undefined' && global.crypto.getRandomValues) {
          const randomBytes = global.crypto.getRandomValues(new Uint8Array(32));
          privateKeyHex = Array.from(randomBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        } else {
          // Use noble/hashes as final fallback
          const { randomBytes } = await import('@noble/hashes/utils');
          const privateKeyBytes = randomBytes(32);
          privateKeyHex = Array.from(privateKeyBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }

        // Create signer from the hex private key
        signer = new NDKPrivateKeySigner(privateKeyHex);
        ndkUser = await signer.user();
      }

      console.log('🔑 Generated private key (hex):', privateKeyHex ? privateKeyHex.slice(0, 16) + '...' : 'null');

      if (!privateKeyHex || privateKeyHex.length !== 64) {
        throw new Error('Failed to generate valid 32-byte private key');
      }

      // Use our custom bech32 encoding that works in React Native
      const { nsecEncode } = await import('../../../utils/nostrEncoding');
      const nsec = nsecEncode(privateKeyHex);
      const npub = ndkUser.npub;
      const hexPubkey = ndkUser.pubkey;

      console.log('🔑 Generated nsec using custom encoder:', nsec ? nsec.slice(0, 10) + '...' : 'null');
      console.log('🔑 NDK provided npub:', npub ? npub.slice(0, 20) + '...' : 'null');

      // Validate all generated values
      if (!nsec || !nsec.startsWith('nsec1')) {
        console.error('❌ NostrAuthProvider: Invalid nsec generated:', nsec?.slice(0, 10) || 'null');
        console.error('❌ NostrAuthProvider: hex private key was:', privateKeyHex?.slice(0, 16) || 'null');
        throw new Error('Failed to generate valid nsec format');
      }

      if (!npub || !npub.startsWith('npub1')) {
        console.error('❌ NostrAuthProvider: Invalid npub generated:', npub?.slice(0, 10) || 'null');
        throw new Error('Failed to generate valid npub format');
      }

      if (!hexPubkey || hexPubkey.length !== 64) {
        console.error('❌ NostrAuthProvider: Invalid hex pubkey generated:', hexPubkey?.slice(0, 16) || 'null');
        throw new Error('Failed to generate valid hex pubkey');
      }

      console.log('✅ NostrAuthProvider: Generated new Nostr identity:', {
        nsec: nsec.slice(0, 10) + '...',
        npub: npub.slice(0, 20) + '...',
        hexPubkey: hexPubkey.slice(0, 16) + '...'
      });

      // Store keys using unified auth system with verification
      console.log('💾 NostrAuthProvider: Storing generated identity...');
      const stored = await storeAuthenticationData(nsec, npub);
      if (!stored) {
        console.error('❌ NostrAuthProvider: Failed to store generated authentication data');
        console.error('❌ NostrAuthProvider: Storage failed for nsec:', nsec.slice(0, 10) + '...');
        console.error('❌ NostrAuthProvider: Storage failed for npub:', npub.slice(0, 20) + '...');
        return {
          success: false,
          error: 'Failed to save generated identity. Please check device storage and try again.',
        };
      }
      console.log('✅ NostrAuthProvider: Generated identity stored and verified');

      // Import AsyncStorage and store current user pubkey for wallet verification
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('@runstr:current_user_pubkey', hexPubkey);
      console.log('✅ NostrAuthProvider: Current user pubkey stored for wallet verification');

      // Initialize NutZap wallet for new user (auto-creates wallet)
      try {
        console.log('💰 NostrAuthProvider: Creating NutZap wallet for new user...');
        const walletState = await nutzapService.initialize(nsec);
        if (walletState.created) {
          console.log('✅ NostrAuthProvider: NutZap wallet created for new user');
        } else {
          console.log('✅ NostrAuthProvider: NutZap wallet already exists for user');
        }
        console.log('💰 NostrAuthProvider: Wallet initialization completed successfully');
      } catch (walletError) {
        // Don't fail signup if wallet creation fails - wallet can be created later
        console.warn('⚠️ NostrAuthProvider: NutZap wallet initialization failed (non-fatal):', walletError);
        console.warn('⚠️ NostrAuthProvider: User can still proceed without wallet - wallet creation will be retried later');
      }

      // Create a basic user profile for the new identity
      console.log('👤 NostrAuthProvider: Creating user profile...');
      const displayName = generateDisplayName(npub);
      const now = new Date().toISOString();
      console.log('👤 NostrAuthProvider: Generated display name:', displayName);

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
        // Nostr profile fields - empty for new user
        bio: '',
        website: '',
        picture: '',
        banner: '',
        lud16: '',
        displayName: displayName,
        // Hybrid model flag
        isSupabaseSynced: false,
      };

      console.log('✅ NostrAuthProvider: Nostr signup successful - new identity created:', {
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        npub: user.npub.slice(0, 20) + '...',
        role: user.role,
        createdAt: user.createdAt,
      });

      return {
        success: true,
        user,
        needsOnboarding: false, // New Nostr users can edit profile later
        needsRoleSelection: false, // Default to member role
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
          errorMessage = 'Failed to generate valid private key. Please try again.';
        } else if (error.message.includes('npub format')) {
          errorMessage = 'Failed to generate valid public key. Please try again.';
        } else if (error.message.includes('storage')) {
          errorMessage = 'Failed to save identity to device storage. Please check available storage space.';
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

  /*
   * FUTURE SUPABASE INTEGRATION METHODS
   * These will be re-enabled when user opts in via Profile → Account → "Enable Enhanced Features"
   * 
   * TODO: Add these methods for optional Supabase sync:
   * - signInWithSupabaseSync(nsecInput: string) - Creates Supabase user record
   * - updateUserWithProfileData(user: User, nostrProfile: NostrProfile) - Updates existing Supabase record
   * - createUserProfileWithNostrData(userData: CreateUserData, nostrProfile: NostrProfile) - New Supabase record
   * - syncUserToSupabase(user: User) - One-time sync of existing Nostr user to Supabase
   */
}

export default NostrAuthProvider;