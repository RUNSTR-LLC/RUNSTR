/**
 * Nostr Authentication Provider
 * Pure Nostr-based authentication using nsec private keys
 * Supabase integration disabled for immediate crash fix - will be re-enabled for optional sync
 */

import {
  generateNostrKeyPair,
  validateNsec,
  nsecToNpub,
  storeNsecLocally,
  generateDisplayName,
  normalizeNsecInput,
} from '../../../utils/nostr';
import type { AuthResult, CreateUserData, User } from '../../../types';
import { DirectNostrProfileService, type DirectNostrUser } from '../../user/directNostrProfileService';

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

      // Store keys locally (no database interaction)
      await storeNsecLocally(nsec, npub);
      console.log('✅ NostrAuthProvider: Keys stored locally');

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