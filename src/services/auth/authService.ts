/**
 * Authentication Service
 * Handles user authentication, sign in/out operations with Nostr support and CoinOS integration
 */

import { supabase } from '../supabase';
import coinosService from '../coinosService';
import { storeAuthMethod, clearNostrStorage } from '../../utils/nostr';
import type {
  ApiResponse,
  AuthResult,
  CreateUserData,
  User,
  UserWithWallet,
  RoleSelectionData,
} from '../../types';
import { AppleAuthProvider } from './providers/appleAuthProvider';
import { NostrAuthProvider } from './providers/nostrAuthProvider';

export class AuthService {
  /**
   * Enhanced sign out with Nostr and CoinOS cleanup
   */
  static async signOut(): Promise<ApiResponse> {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      // Clear Nostr keys and auth method
      await clearNostrStorage();

      // Clear CoinOS credentials
      await coinosService.signOut();

      console.log('AuthService: Complete sign out successful');

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
   * Get current authenticated user
   */
  static async getCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated (supports Nostr + Supabase auth)
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      // First check Supabase session for Apple/Google users
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        return true;
      }

      // For Nostr-only users, check if we have stored Nostr credentials
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

  // ====== PHASE 1 ENHANCED AUTHENTICATION METHODS ======

  /**
   * Sign in with Nostr using nsec
   */
  static async signInWithNostr(nsecInput: string): Promise<AuthResult> {
    try {
      const nostrProvider = new NostrAuthProvider();
      const result = await nostrProvider.signIn(nsecInput);

      if (!result.success || !result.user) {
        return result;
      }

      // Store authentication method and initialize session
      await storeAuthMethod('nostr');
      await this.initializeUserSession(result.user);

      // Check if they need wallet creation
      const needsWalletCreation = !(await coinosService.hasWalletCredentials());

      return {
        ...result,
        needsWalletCreation,
      };
    } catch (error) {
      console.error('AuthService: Nostr authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Apple Sign-In implementation
   */
  static async signInWithApple(): Promise<AuthResult> {
    try {
      const appleProvider = new AppleAuthProvider();
      const authResult = await appleProvider.signIn();

      if (!authResult.success || !(authResult as any).userData) {
        return authResult;
      }

      const userData = (authResult as any).userData;

      // Check if user exists
      const { data: existingUsers, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('npub', userData.npub)
        .limit(1);

      if (queryError) {
        return { success: false, error: 'Failed to check existing user' };
      }

      let user: User;
      if (existingUsers && existingUsers.length > 0) {
        user = existingUsers[0] as User;
      } else {
        const createResult = await this.createUserProfile(userData);
        if (!createResult.success || !createResult.user) {
          return {
            success: false,
            error: createResult.error || 'Failed to create user',
          };
        }
        user = createResult.user;
      }

      await storeAuthMethod('apple');
      await this.initializeUserSession(user);

      return {
        success: true,
        user,
        needsOnboarding: !existingUsers || existingUsers.length === 0,
        needsRoleSelection: !user.role,
        needsWalletCreation: !(await coinosService.hasWalletCredentials()),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Apple Sign-In failed',
      };
    }
  }

  /**
   * Google OAuth implementation
   */
  static async signInWithGoogle(): Promise<AuthResult> {
    try {
      console.log('AuthService: Google OAuth requested');

      // Import Google provider dynamically to avoid bundling issues
      const { GoogleAuthProvider } = await import(
        './providers/googleAuthProvider'
      );
      const googleProvider = new GoogleAuthProvider();

      // Validate configuration before proceeding
      const validation = await googleProvider.validateConfiguration();
      if (!validation.isValid) {
        return {
          success: false,
          error:
            validation.error || 'Google Sign-In is not properly configured',
        };
      }

      // Perform Google OAuth
      const authResult = await googleProvider.signIn();
      if (!authResult.success) {
        return authResult;
      }

      // Process authentication result
      if (!authResult.userData) {
        return {
          success: false,
          error: 'No user data received from Google',
        };
      }

      const userData = authResult.userData;
      console.log('AuthService: Processing Google user:', userData.email);

      // Check if user exists in database
      const { data: existingUsers, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('npub', userData.npub)
        .limit(1);

      if (queryError) {
        console.error('AuthService: Database query error:', queryError);
        return {
          success: false,
          error: 'Failed to check existing user',
        };
      }

      let user: User;
      if (existingUsers && existingUsers.length > 0) {
        user = existingUsers[0] as User;
        console.log('AuthService: Found existing Google user:', user.id);
      } else {
        // Create new user with Google data
        const createResult = await this.createUserProfile({
          name: userData.name,
          email: userData.email,
          npub: userData.npub,
          authProvider: 'google',
        });
        if (!createResult.success || !createResult.user) {
          return {
            success: false,
            error: createResult.error || 'Failed to create user',
          };
        }
        user = createResult.user;
        console.log('AuthService: Created new Google user:', user.id);
      }

      await storeAuthMethod('google');
      await this.initializeUserSession(user);

      return {
        success: true,
        user,
        needsOnboarding: !existingUsers || existingUsers.length === 0,
        needsRoleSelection: !user.role,
        needsWalletCreation: !(await coinosService.hasWalletCredentials()),
      };
    } catch (error) {
      console.error('AuthService: Google OAuth error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google Sign-In failed',
      };
    }
  }

  /**
   * Create user profile in database
   */
  static async createUserProfile(
    userData: CreateUserData
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('AuthService: Creating user profile for:', userData.npub);

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
        console.error('AuthService: Database insert error:', error);
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

      console.log('AuthService: User profile created successfully:', user.id);
      return { success: true, user };
    } catch (error) {
      console.error('AuthService: Create user profile error:', error);
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
   * Update user role after selection
   */
  static async updateUserRole(
    userId: string,
    roleData: RoleSelectionData
  ): Promise<ApiResponse> {
    try {
      console.log(
        `AuthService: Updating user role to ${roleData.role} for user:`,
        userId
      );

      const updateData: any = {
        role: roleData.role,
        updated_at: new Date().toISOString(),
      };

      // If wallet address was created, store it
      if (roleData.personalWalletAddress) {
        updateData.personal_wallet_address = roleData.personalWalletAddress;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('AuthService: Role update error:', error);
        return {
          success: false,
          error: 'Failed to update user role',
        };
      }

      console.log('AuthService: User role updated successfully');
      return {
        success: true,
        message: 'User role updated successfully',
      };
    } catch (error) {
      console.error('AuthService: Update user role error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update role',
      };
    }
  }

  /**
   * Create personal wallet for user
   */
  static async createPersonalWallet(
    userId: string
  ): Promise<{ success: boolean; lightningAddress?: string; error?: string }> {
    try {
      console.log('AuthService: Creating personal wallet for user:', userId);

      // Initialize CoinOS service
      await coinosService.initialize();

      // Create wallet via CoinOS
      const walletResult = await coinosService.createPersonalWallet(userId);

      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Failed to create personal wallet',
        };
      }

      // Update user record with wallet info
      const { error: updateError } = await supabase
        .from('users')
        .update({
          personal_wallet_address: walletResult.wallet.lightningAddress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error(
          'AuthService: Failed to update user with wallet info:',
          updateError
        );
        // Don't fail the entire operation, wallet was created successfully
      }

      console.log(
        'AuthService: Personal wallet created:',
        walletResult.wallet.lightningAddress
      );

      return {
        success: true,
        lightningAddress: walletResult.wallet.lightningAddress,
      };
    } catch (error) {
      console.error('AuthService: Create personal wallet error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create wallet',
      };
    }
  }

  /**
   * Initialize user session after authentication
   */
  static async initializeUserSession(user: User): Promise<void> {
    try {
      console.log('AuthService: Initializing user session for:', user.id);

      // Initialize CoinOS service
      await coinosService.initialize();

      // Additional session initialization can be added here
      // (e.g., load user preferences, sync settings, etc.)

      console.log('AuthService: User session initialized');
    } catch (error) {
      console.error('AuthService: Session initialization error:', error);
      // Don't throw - session init failures shouldn't break authentication
    }
  }

  /**
   * Get enhanced user data with wallet info (supports Nostr + Supabase auth)
   */
  static async getCurrentUserWithWallet(): Promise<UserWithWallet | null> {
    try {
      let userId: string | null = null;

      // First try Supabase auth (for Apple/Google users)
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();
      if (authUser && !error) {
        userId = authUser.id;
      } else {
        // For Nostr-only users, get user ID from stored credentials
        const { getNpubFromStorage } = await import('../../utils/nostr');
        const storedNpub = await getNpubFromStorage();

        if (storedNpub) {
          // Find user by npub
          const { data: nostrUser, error: nostrError } = await supabase
            .from('users')
            .select('id')
            .eq('npub', storedNpub)
            .single();

          if (nostrUser && !nostrError) {
            userId = nostrUser.id;
            console.log('AuthService: Found Nostr user by npub:', userId);
          }
        }
      }

      if (!userId) {
        console.log('AuthService: No authenticated user found');
        return null;
      }

      // Get user profile from database
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        console.error(
          'AuthService: Error fetching user profile:',
          profileError
        );
        return null;
      }

      // Get Lightning address and wallet info based on user type
      let lightningAddress: string | null = null;
      let walletBalance = 0;
      let hasWalletCredentials = false;

      // For regular members: prioritize Nostr profile Lightning address (lud16)
      if (userProfile.role === 'member') {
        // For members: use stored personal_wallet_address or fallback to empty
        // TODO: Implement Nostr profile Lightning address fetching in next iteration
        lightningAddress = userProfile.personal_wallet_address || null;
        console.log(
          'AuthService: Using stored Lightning address for member:',
          lightningAddress
        );

        // Members don't need CoinOS wallets - they receive payments directly to their Lightning address
        // Keep wallet balance as 0 since they don't manage funds through the app
      } else {
        // For captains: check for CoinOS wallet credentials for team management
        try {
          hasWalletCredentials = await coinosService.hasWalletCredentials();

          if (hasWalletCredentials) {
            // Get CoinOS Lightning address for team operations
            const coinosAddress = await coinosService.getLightningAddress();
            if (coinosAddress) {
              lightningAddress = coinosAddress;
            }

            // Get wallet balance for captain dashboard
            const balance = await coinosService.getWalletBalance();
            walletBalance = balance.total;
            console.log(
              'AuthService: Using CoinOS wallet for captain:',
              lightningAddress
            );
          } else {
            console.log(
              'AuthService: Captain has no CoinOS wallet credentials'
            );
          }
        } catch (error) {
          console.error(
            'AuthService: Error getting captain wallet info:',
            error
          );
        }
      }

      const userWithWallet: UserWithWallet = {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email || undefined,
        npub: userProfile.npub,
        role: userProfile.role,
        teamId: userProfile.current_team_id,
        currentTeamId: userProfile.current_team_id || undefined,
        createdAt: userProfile.created_at,
        lastSyncAt: userProfile.last_sync_at,
        personalWalletAddress: userProfile.personal_wallet_address || undefined,
        lightningAddress: lightningAddress || undefined,
        walletBalance,
        hasWalletCredentials,
      };

      return userWithWallet;
    } catch (error) {
      console.error(
        'AuthService: Error getting current user with wallet:',
        error
      );
      return null;
    }
  }

  /**
   * Check authentication status with detailed info
   */
  static async getAuthenticationStatus(): Promise<{
    isAuthenticated: boolean;
    user?: UserWithWallet;
    needsOnboarding?: boolean;
    needsRoleSelection?: boolean;
    needsWalletCreation?: boolean;
  }> {
    try {
      const isAuthenticated = await this.isAuthenticated();

      if (!isAuthenticated) {
        return { isAuthenticated: false };
      }

      const user = await this.getCurrentUserWithWallet();

      if (!user) {
        return { isAuthenticated: false };
      }

      const needsRoleSelection = !user.role;
      const needsWalletCreation = !user.hasWalletCredentials;
      const needsOnboarding = needsRoleSelection || needsWalletCreation;

      return {
        isAuthenticated: true,
        user,
        needsOnboarding,
        needsRoleSelection,
        needsWalletCreation,
      };
    } catch (error) {
      console.error(
        'AuthService: Error checking authentication status:',
        error
      );
      return { isAuthenticated: false };
    }
  }
}
