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
import { AmberAuthProvider } from './providers/amberAuthProvider';
import { storeAuthenticationData } from '../../utils/nostrAuth';

export class AuthService {
  /**
   * Sign out with Nostr and wallet cleanup
   */
  static async signOut(): Promise<ApiResponse> {
    try {
      console.log('🔓 AuthService: Starting sign out with full cleanup...');

      // Clear Nostr keys and data
      await clearNostrStorage();

      // Import AsyncStorage for wallet cleanup
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

      // Clear wallet-related data and onboarding flags to prevent cross-user contamination
      await AsyncStorage.multiRemove([
        '@runstr:wallet_proofs',
        '@runstr:wallet_pubkey',
        '@runstr:wallet_mint',
        '@runstr:hex_pubkey',
        '@runstr:tx_history',
        '@runstr:last_sync',
        '@runstr:onboarding_completed' // Clear onboarding flag to ensure clean state
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

      // Clear captain cache
      try {
        const { CaptainCache } = await import('../../utils/captainCache');
        await CaptainCache.clearAll();
        console.log('✅ AuthService: Captain cache cleared');
      } catch (err) {
        console.warn('⚠️ AuthService: Captain cache clear failed:', err);
      }

      // Clear team cache service
      try {
        const { TeamCacheService } = await import('../cache/TeamCacheService');
        const teamCache = TeamCacheService.getInstance();
        await teamCache.clearCache();
        console.log('✅ AuthService: Team cache cleared');
      } catch (err) {
        console.warn('⚠️ AuthService: Team cache clear failed:', err);
      }

      // Clear competition cache service
      try {
        const { CompetitionCacheService } = await import('../cache/CompetitionCacheService');
        const compCache = CompetitionCacheService.getInstance();
        await compCache.clearCache();
        console.log('✅ AuthService: Competition cache cleared');
      } catch (err) {
        console.warn('⚠️ AuthService: Competition cache clear failed:', err);
      }

      // Reset nutzap service if initialized
      try {
        const nutzapService = (await import('../nutzap/nutzapService')).default;
        if (nutzapService) {
          nutzapService.reset();
        }
        console.log('✅ AuthService: NutZap service reset');
      } catch (err) {
        console.warn('⚠️ AuthService: NutZap service reset skipped:', err);
      }

      // Reset wallet store state (Zustand)
      try {
        const { useWalletStore } = await import('../../store/walletStore');
        useWalletStore.getState().reset();
        console.log('✅ AuthService: Wallet store reset successful');
      } catch (err) {
        console.warn('⚠️ AuthService: Wallet store reset skipped:', err);
      }

      console.log('✅ AuthService: Sign out complete - all caches and data cleared');

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
          error: 'Amber is not installed. Please install Amber from the Play Store.',
        };
      }

      // Use Amber provider to authenticate
      const amberProvider = new AmberAuthProvider();
      const result = await amberProvider.signIn();

      if (!result.success) {
        return result;
      }

      console.log('AuthService: Amber authentication successful');
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
      console.log('AuthService: Starting Nostr signup (generating new identity)...');

      const nostrProvider = new NostrAuthProvider();
      const result = await nostrProvider.signUpPureNostr();

      if (!result.success || !result.user) {
        return result;
      }

      console.log('AuthService: Nostr signup successful - new identity created');

      return result;
    } catch (error) {
      console.error('AuthService: Nostr signup error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Nostr identity',
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
