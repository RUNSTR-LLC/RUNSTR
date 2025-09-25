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
      const signer = NDKPrivateKeySigner.generate();

      // Get the user from signer to extract keys
      const ndkUser = await signer.user();

      // Extract the nsec from the signer's private key
      const nsec = signer.privateKey; // This is already in nsec format from NDK
      const npub = ndkUser.npub;
      const hexPubkey = ndkUser.pubkey;

      console.log('✅ NostrAuthProvider: Generated new Nostr identity:', {
        npub: npub.slice(0, 20) + '...',
        hexPubkey: hexPubkey.slice(0, 16) + '...'
      });

      // Store keys using unified auth system with verification
      const stored = await storeAuthenticationData(nsec, npub);
      if (!stored) {
        console.error('❌ NostrAuthProvider: Failed to store generated authentication data');
        return {
          success: false,
          error: 'Failed to save generated identity. Please try again.',
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
        }
      } catch (walletError) {
        // Don't fail signup if wallet creation fails - wallet can be created later
        console.warn('⚠️ NostrAuthProvider: NutZap wallet initialization failed (non-fatal):', walletError);
      }

      // Create a basic user profile for the new identity
      const displayName = generateDisplayName(npub);
      const now = new Date().toISOString();

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
        npub: user.npub.slice(0, 20) + '...',
      });

      return {
        success: true,
        user,
        needsOnboarding: false, // New Nostr users can edit profile later
        needsRoleSelection: false, // Default to member role
      };
    } catch (error) {
      console.error('❌ NostrAuthProvider: Nostr signup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate Nostr identity',
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