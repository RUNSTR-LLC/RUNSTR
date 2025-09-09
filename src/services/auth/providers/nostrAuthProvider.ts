/**
 * Nostr Authentication Provider
 * Handles Nostr-based authentication using nsec private keys
 */

import { supabase } from '../../supabase';
import {
  generateNostrKeyPair,
  validateNsec,
  nsecToNpub,
  storeNsecLocally,
  generateDisplayName,
  normalizeNsecInput,
} from '../../../utils/nostr';
import {
  nostrProfileService,
  type NostrProfile,
} from '../../../services/nostr/NostrProfileService';
import type { AuthResult, CreateUserData, User } from '../../../types';
import { DirectNostrProfileService, type DirectNostrUser } from '../../user/directNostrProfileService';

export class NostrAuthProvider {
  /**
   * Sign in with Nostr using nsec
   */
  async signIn(nsecInput: string): Promise<AuthResult> {
    try {
      console.log('NostrAuthProvider: Starting Nostr authentication');

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
      const displayName = generateDisplayName(npub);

      console.log('NostrAuthProvider: Valid Nostr keys, npub:', npub);

      // Fetch Nostr profile data from kind 0 events
      console.log('NostrAuthProvider: Fetching Nostr profile from relays...');
      const nostrProfile = await nostrProfileService.getProfile(npub);

      console.log('NostrAuthProvider: Profile fetch result:', {
        found: !!nostrProfile,
        name: nostrProfile?.display_name || nostrProfile?.name,
        hasAvatar: !!nostrProfile?.picture,
        hasBanner: !!nostrProfile?.banner,
        hasLightning: !!nostrProfile?.lud16,
      });

      // Check if user exists by npub first (existing users)
      const { data: existingUsers, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('npub', npub)
        .limit(1);

      if (queryError) {
        console.error('NostrAuthProvider: Database query error:', queryError);
        return {
          success: false,
          error: 'Failed to check existing user',
        };
      }

      let user: User;
      let needsOnboarding = false;
      let needsRoleSelection = false;

      if (existingUsers && existingUsers.length > 0) {
        // Existing user - update with latest profile data and sign them in
        user = existingUsers[0] as User;
        console.log('NostrAuthProvider: Found existing user:', user.id);

        // Update user with latest Nostr profile data
        if (nostrProfile) {
          const updatedUser = await this.updateUserWithProfileData(
            user,
            nostrProfile
          );
          user = updatedUser || user;
        }

        // Check if they need role selection
        needsRoleSelection = !user.role;
      } else {
        // New user - create database record with imported profile data
        console.log('NostrAuthProvider: Creating new user account');

        const userData: CreateUserData = {
          name: nostrProfile?.display_name || nostrProfile?.name || displayName,
          npub,
          nsec, // Will be stored locally, not in database
          authProvider: 'nostr',
        };

        const createResult = await this.createUserProfileWithNostrData(
          userData,
          nostrProfile
        );

        if (!createResult.success || !createResult.user) {
          return {
            success: false,
            error: createResult.error || 'Failed to create user account',
          };
        }

        user = createResult.user;
        needsOnboarding = true;
        needsRoleSelection = true;
      }

      // Store nsec locally (encrypted)
      await storeNsecLocally(nsec, user.id);

      console.log('NostrAuthProvider: Nostr authentication successful');

      return {
        success: true,
        user,
        needsOnboarding,
        needsRoleSelection,
        needsWalletCreation: true, // Always need wallet creation for new auth
      };
    } catch (error) {
      console.error('NostrAuthProvider: Nostr authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Create user profile in database with specific ID
   */
  private async createUserProfileWithId(
    userData: CreateUserData,
    userId: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('NostrAuthProvider: Creating user profile with ID:', userId);

      const userRecord = {
        id: userId, // Use the ID from Supabase Auth
        name: userData.name,
        email: userData.email || null,
        npub: userData.npub,
        role: userData.role || null, // Will be set during role selection
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('users')
        .insert([userRecord])
        .select('*')
        .single();

      if (error) {
        console.error('NostrAuthProvider: Database insert error:', error);
        return {
          success: false,
          error: 'Failed to create user account in database',
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'No user data returned from database',
        };
      }

      const user: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        npub: data.npub,
        role: data.role,
        teamId: data.current_team_id,
        currentTeamId: data.current_team_id,
        createdAt: data.created_at,
        lastSyncAt: data.last_sync_at,
      };

      console.log(
        'NostrAuthProvider: User profile created successfully:',
        user.id
      );
      return { success: true, user };
    } catch (error) {
      console.error('NostrAuthProvider: Create user profile error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create user profile',
      };
    }
  }

  /**
   * Update existing user with Nostr profile data
   */
  private async updateUserWithProfileData(
    user: User,
    nostrProfile: NostrProfile
  ): Promise<User | null> {
    try {
      console.log('NostrAuthProvider: Updating user profile with Nostr data');

      const updates = {
        bio: nostrProfile.about,
        website: nostrProfile.website,
        picture: nostrProfile.picture,
        banner: nostrProfile.banner,
        lud16: nostrProfile.lud16,
        display_name: nostrProfile.display_name,
        updated_at: new Date().toISOString(),
      };

      // Filter out undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(cleanUpdates).length === 0) {
        console.log('NostrAuthProvider: No profile updates to apply');
        return user;
      }

      const { data, error } = await supabase
        .from('users')
        .update(cleanUpdates)
        .eq('id', user.id)
        .select('*')
        .single();

      if (error) {
        console.error(
          'NostrAuthProvider: Failed to update user profile:',
          error
        );
        return user; // Return original user if update fails
      }

      // Convert database row to User object
      const updatedUser: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        npub: data.npub,
        role: data.role,
        teamId: data.current_team_id,
        currentTeamId: data.current_team_id,
        createdAt: data.created_at,
        lastSyncAt: data.last_sync_at,
        // Nostr profile fields
        bio: data.bio,
        website: data.website,
        picture: data.picture,
        banner: data.banner,
        lud16: data.lud16,
        displayName: data.display_name,
      };

      console.log('NostrAuthProvider: User profile updated successfully');
      return updatedUser;
    } catch (error) {
      console.error('NostrAuthProvider: Error updating user profile:', error);
      return user; // Return original user if update fails
    }
  }

  /**
   * Create user profile with Nostr data
   */
  private async createUserProfileWithNostrData(
    userData: CreateUserData,
    nostrProfile: NostrProfile | null
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('NostrAuthProvider: Creating user profile with Nostr data');

      const userRecord = {
        name: userData.name,
        email: userData.email || null,
        npub: userData.npub,
        role: userData.role || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Nostr profile fields
        bio: nostrProfile?.about || null,
        website: nostrProfile?.website || null,
        picture: nostrProfile?.picture || null,
        banner: nostrProfile?.banner || null,
        lud16: nostrProfile?.lud16 || null,
        display_name: nostrProfile?.display_name || null,
      };

      const { data, error } = await supabase
        .from('users')
        .insert([userRecord])
        .select('*')
        .single();

      if (error) {
        console.error('NostrAuthProvider: Database insert error:', error);
        return {
          success: false,
          error: 'Failed to create user account in database',
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'No user data returned from database',
        };
      }

      const user: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        npub: data.npub,
        role: data.role,
        teamId: data.current_team_id,
        currentTeamId: data.current_team_id,
        createdAt: data.created_at,
        lastSyncAt: data.last_sync_at,
        // Nostr profile fields
        bio: data.bio,
        website: data.website,
        picture: data.picture,
        banner: data.banner,
        lud16: data.lud16,
        displayName: data.display_name,
      };

      console.log(
        'NostrAuthProvider: User profile with Nostr data created successfully:',
        user.id
      );
      return { success: true, user };
    } catch (error) {
      console.error('NostrAuthProvider: Create user profile error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create user profile',
      };
    }
  }

  /**
   * Create user profile in database (legacy method for backwards compatibility)
   */
  private async createUserProfile(
    userData: CreateUserData
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log(
        'NostrAuthProvider: Creating user profile for:',
        userData.npub
      );

      const userRecord = {
        name: userData.name,
        email: userData.email || null,
        npub: userData.npub,
        role: userData.role || null, // Will be set during role selection
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('users')
        .insert([userRecord])
        .select('*')
        .single();

      if (error) {
        console.error('NostrAuthProvider: Database insert error:', error);
        return {
          success: false,
          error: 'Failed to create user account in database',
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'No user data returned from database',
        };
      }

      const user: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        npub: data.npub,
        role: data.role,
        teamId: data.current_team_id,
        currentTeamId: data.current_team_id,
        createdAt: data.created_at,
        lastSyncAt: data.last_sync_at,
      };

      console.log(
        'NostrAuthProvider: User profile created successfully:',
        user.id
      );
      return { success: true, user };
    } catch (error) {
      console.error('NostrAuthProvider: Create user profile error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create user profile',
      };
    }
  }

  /**
   * Pure Nostr authentication - bypasses Supabase entirely
   * Uses DirectNostrProfileService for complete Nostr-native authentication
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
      };

      console.log('✅ NostrAuthProvider: Pure Nostr authentication successful:', {
        id: user.id,
        name: user.name,
        npub: user.npub.slice(0, 20) + '...',
        hasPicture: !!user.picture,
        hasLightning: !!user.lud16,
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
}

export default NostrAuthProvider;
