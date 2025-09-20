/**
 * Authentication Service
 * Handles user authentication with Nostr-only support
 */

import { clearNostrStorage } from '../../utils/nostr';
import type {
  ApiResponse,
  AuthResult,
  User,
} from '../../types';
import { NostrAuthProvider } from './providers/nostrAuthProvider';
import { AppleAuthProvider } from './providers/appleAuthProvider';
import { storeAuthenticationData } from '../../utils/nostrAuth';

export class AuthService {
  /**
   * Sign out with Nostr cleanup
   */
  static async signOut(): Promise<ApiResponse> {
    try {
      // Clear Nostr keys and data
      await clearNostrStorage();

      console.log('AuthService: Nostr sign out successful');

      return {
        success: true,
        message: 'Successfully signed out',
      };
    } catch (error) {
      console.error('Error signing out:', error);
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
   * Sign in with Apple and generate deterministic Nostr keys
   */
  static async signInWithApple(): Promise<AuthResult> {
    try {
      console.log('AuthService: Starting Apple Sign-In...');

      // Check if Apple Sign-In is available
      const isAvailable = await AppleAuthProvider.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Apple Sign-In is not available on this device',
        };
      }

      // Use Apple provider to authenticate
      const appleProvider = new AppleAuthProvider();
      const result = await appleProvider.signIn();

      if (!result.success) {
        return result;
      }

      // Extract user data with generated Nostr keys
      const userData = (result as any).userData;
      if (!userData || !userData.nsec || !userData.npub) {
        return {
          success: false,
          error: 'Failed to generate authentication keys',
        };
      }

      // Store the generated Nostr keys using unified auth system with verification
      const stored = await storeAuthenticationData(userData.nsec, userData.npub);
      if (!stored) {
        return {
          success: false,
          error: 'Failed to save authentication credentials',
        };
      }
      console.log('AuthService: ✅ Stored and verified Apple-generated Nostr keys');

      // Load the user profile using the generated Nostr identity
      const { DirectNostrProfileService } = await import('../user/directNostrProfileService');
      let directUser = null;

      try {
        directUser = await DirectNostrProfileService.getCurrentUserProfile();
      } catch (profileError) {
        console.warn('⚠️  Profile load failed, using fallback:', profileError);
        directUser = await DirectNostrProfileService.getFallbackProfile();
      }

      if (directUser) {
        // Convert DirectNostrUser to User for app compatibility
        const user: User = {
          id: directUser.id,
          name: userData.name || directUser.name,
          email: userData.email || directUser.email,
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
          displayName: userData.name || directUser.displayName,
        };

        console.log('AuthService: Apple authentication successful');
        return {
          success: true,
          user,
        };
      }

      // If no profile exists yet, create a basic user
      const user: User = {
        id: userData.npub,
        name: userData.name || 'Apple User',
        email: userData.email,
        npub: userData.npub,
        role: 'member',
        createdAt: new Date().toISOString(),
      };

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('AuthService: Apple authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Apple Sign-In failed',
      };
    }
  }

  /**
   * Get current authenticated user
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { DirectNostrProfileService } = await import('../user/directNostrProfileService');
      let directUser = null;
      
      try {
        directUser = await DirectNostrProfileService.getCurrentUserProfile();
      } catch (profileError) {
        console.warn('⚠️  Profile load failed, using fallback:', profileError);
        directUser = await DirectNostrProfileService.getFallbackProfile();
      }
      
      if (directUser) {
        // Convert DirectNostrUser to User for app compatibility
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
        };

        return user;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get current user with wallet info (placeholder for compatibility)
   */
  static async getCurrentUserWithWallet(): Promise<User | null> {
    // For now, just return the current user
    // Wallet functionality can be added later if needed
    return this.getCurrentUser();
  }

  /**
   * Check authentication status (placeholder for compatibility)
   */
  static async getAuthenticationStatus(): Promise<{
    isAuthenticated: boolean;
    user?: User;
    needsOnboarding?: boolean;
    needsRoleSelection?: boolean;
    needsWalletCreation?: boolean;
  }> {
    try {
      const isAuthenticated = await this.isAuthenticated();
      
      if (!isAuthenticated) {
        return { isAuthenticated: false };
      }

      const user = await this.getCurrentUser();

      if (!user) {
        return { isAuthenticated: false };
      }

      return {
        isAuthenticated: true,
        user,
        needsOnboarding: false,
        needsRoleSelection: false,
        needsWalletCreation: false,
      };
    } catch (error) {
      console.error('AuthService: Error checking authentication status:', error);
      return { isAuthenticated: false };
    }
  }

  /**
   * Update user role (placeholder for compatibility)
   */
  static async updateUserRole(
    userId: string,
    roleData: any
  ): Promise<ApiResponse> {
    console.log('AuthService: updateUserRole called but not implemented in Nostr-only mode');
    return {
      success: true,
      message: 'User role update not needed in Nostr-only mode',
    };
  }

  /**
   * Create personal wallet (placeholder for compatibility)
   */
  static async createPersonalWallet(
    userId: string
  ): Promise<{ success: boolean; lightningAddress?: string; error?: string }> {
    console.log('AuthService: createPersonalWallet called but not implemented in Nostr-only mode');
    return {
      success: true,
      lightningAddress: 'user@getalby.com',
    };
  }
}
