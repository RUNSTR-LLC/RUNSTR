/**
 * AuthContext - Single source of truth for authentication state
 * iOS-inspired authentication management with React Context
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/auth/authService';
import { getNpubFromStorage } from '../utils/nostr';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';
import { locationPermissionService } from '../services/activity/LocationPermissionService';
import type { User } from '../types';

// Authentication state interface
interface AuthState {
  isInitializing: boolean;
  isAuthenticated: boolean | null;
  currentUser: User | null;
  connectionStatus: string;
  isConnected: boolean;
  initError: string | null;
  showLoadingSplash: boolean;
}

// Authentication actions interface
interface AuthActions {
  signIn: (nsec: string) => Promise<{ success: boolean; error?: string }>;
  signUp: () => Promise<{ success: boolean; error?: string }>;
  signInWithApple: () => Promise<{ success: boolean; error?: string }>;
  signInWithAmber: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshAuthentication: () => Promise<void>;
  checkStoredCredentials: () => Promise<void>;
  onSplashComplete: () => void;
}

// Combined context interface
interface AuthContextType extends AuthState, AuthActions {}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: React.ReactNode;
}

// AuthProvider component - manages all authentication state
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Authentication state (like iOS @Published properties)
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting to Nostr...');
  const [isConnected, setIsConnected] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showLoadingSplash, setShowLoadingSplash] = useState(false);

  /**
   * Check for stored credentials (FAST - no network calls)
   * Profile loading is deferred until after app renders
   */
  const checkStoredCredentials = useCallback(async (): Promise<void> => {
    try {
      const storedNpub = await getNpubFromStorage();

      if (storedNpub) {
        // Just set authenticated state - no profile loading yet
        setIsAuthenticated(true);
        setConnectionStatus('Loading...');

        // Defer profile loading to after initial render
        setTimeout(() => {
          loadUserProfile();
        }, 100);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('❌ AuthContext: Error checking stored credentials:', error);
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  }, []);

  /**
   * Load user profile asynchronously (called after initial render)
   * Now leverages pre-initialized NDK from SplashInitScreen
   */
  const loadUserProfile = async (): Promise<void> => {
    try {
      setConnectionStatus('Loading profile...');

      // Check if NDK was pre-initialized
      const preInitializedNDK = (global as any).preInitializedNDK;
      if (preInitializedNDK) {
        console.log('✅ Using pre-initialized NDK from SplashInitScreen');
      }

      // Try to load from cache first
      const { appCache } = await import('../utils/cache');
      const cachedUser = await appCache.get<User>('current_user_profile');

      if (cachedUser) {
        // Show cached user immediately for fast startup
        setCurrentUser(cachedUser);
        setIsConnected(true);
        setConnectionStatus('Connected');

        // ALWAYS fetch fresh Nostr profile data to get bio, picture, banner
        console.log('📡 Fetching fresh Nostr profile data...');
        try {
          const directUser = await DirectNostrProfileService.getCurrentUserProfile();
          if (directUser) {
            // Merge fresh Nostr data with cached user
            const updatedUser: User = {
              ...cachedUser,
              bio: directUser.bio,
              website: directUser.website,
              picture: directUser.picture,
              banner: directUser.banner,
              lud16: directUser.lud16,
              displayName: directUser.displayName || cachedUser.displayName,
              name: directUser.name || cachedUser.name,
            };

            console.log('✅ Updated user with fresh Nostr profile data:', {
              hasBio: !!updatedUser.bio,
              hasPicture: !!updatedUser.picture,
              hasBanner: !!updatedUser.banner,
              displayName: updatedUser.displayName
            });

            setCurrentUser(updatedUser);
            // Update cache with fresh data
            await appCache.set('current_user_profile', updatedUser, 5 * 60 * 1000);
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch fresh profile data:', error);
          // Continue with cached data
        }

        return;
      }

      // No cache, load from Nostr
      let directUser = null;

      try {
        directUser = await DirectNostrProfileService.getCurrentUserProfile();
      } catch (profileError) {
        console.warn('⚠️  Profile load failed, using fallback');
        directUser = await DirectNostrProfileService.getFallbackProfile();
      }

      if (directUser) {
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

        setCurrentUser(user);
        setIsConnected(true);
        setConnectionStatus('Connected');

        // Cache the profile
        await appCache.set('current_user_profile', user, 5 * 60 * 1000);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      setInitError(error instanceof Error ? error.message : 'Failed to load profile');
    }
  };

  /**
   * Refresh profile in background without blocking
   */
  const refreshProfileInBackground = async (): Promise<void> => {
    try {
      const directUser = await DirectNostrProfileService.getCurrentUserProfile();
      if (directUser) {
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

        setCurrentUser(user);

        // Update cache
        const { appCache } = await import('../utils/cache');
        await appCache.set('current_user_profile', user, 5 * 60 * 1000);
      }
    } catch (error) {
      // Silent fail for background refresh
    }
  };

  /**
   * Sign in with nsec - directly updates authentication state
   * Similar to iOS signInWithNostrKey() method
   */
  const signIn = useCallback(async (nsec: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🚀 AuthContext: Starting sign in process...');
      setConnectionStatus('Authenticating...');
      
      // Use existing AuthService for validation and storage
      const result = await AuthService.signInWithNostr(nsec);
      
      if (!result.success || !result.user) {
        console.error('❌ AuthContext: Authentication failed:', result.error);
        return { success: false, error: result.error };
      }
      
      console.log('✅ AuthContext: Authentication successful - updating state');

      // Direct state updates (like iOS app)
      setIsAuthenticated(true);
      setShowLoadingSplash(true); // Show loading splash after successful login
      setConnectionStatus('Loading your fitness journey...');

      // Start loading profile in background while showing splash
      setTimeout(() => {
        setCurrentUser(result.user);
        setIsConnected(true);
        setConnectionStatus('Connected');
        setInitError(null);
      }, 100);

      // Request location permissions after successful login (in background)
      setTimeout(async () => {
        console.log('📍 Requesting location permissions after login...');
        await locationPermissionService.requestActivityTrackingPermissions();
      }, 500);

      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Sign up with new Nostr identity - generates fresh keypair
   * One-click signup that creates a new Nostr identity
   */
  const signUp = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🚀 AuthContext: Starting sign up process (generating new identity)...');
      setConnectionStatus('Generating identity...');

      // Use AuthService to generate new Nostr identity
      const result = await AuthService.signUpWithNostr();

      if (!result.success || !result.user) {
        console.error('❌ AuthContext: Signup failed:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ AuthContext: Signup successful - new identity created');

      // Mark this as a new signup (for onboarding flow)
      await AsyncStorage.setItem('@runstr:is_new_signup', 'true');

      // Direct state updates (like iOS app)
      setIsAuthenticated(true);
      setShowLoadingSplash(true); // Show loading splash after successful signup
      setConnectionStatus('Setting up your fitness journey...');

      // Start loading profile in background while showing splash
      setTimeout(() => {
        setCurrentUser(result.user);
        setIsConnected(true);
        setConnectionStatus('Connected');
        setInitError(null);
      }, 100);

      // Request location permissions after successful signup (in background)
      setTimeout(async () => {
        console.log('📍 Requesting location permissions after signup...');
        await locationPermissionService.requestActivityTrackingPermissions();
      }, 500);

      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create identity';
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Handle splash screen completion
   */
  const onSplashComplete = useCallback(() => {
    console.log('✅ AuthContext: Splash screen completed');
    setShowLoadingSplash(false);
  }, []);

  /**
   * Sign in with Amber - uses external key management
   */
  const signInWithAmber = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🟠 AuthContext: Starting Amber Sign-In process...');
      setConnectionStatus('Authenticating with Amber...');

      // Use AuthService for Amber authentication
      const result = await AuthService.signInWithAmber();

      if (!result.success || !result.user) {
        console.error('❌ AuthContext: Amber authentication failed:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ AuthContext: Amber authentication successful - updating state');

      // Direct state updates (like iOS app)
      setIsAuthenticated(true);
      setShowLoadingSplash(true); // Show loading splash after successful login
      setConnectionStatus('Loading your fitness journey...');

      // Start loading profile in background while showing splash
      setTimeout(() => {
        setCurrentUser(result.user);
      }, 100);
      setIsConnected(true);
      setConnectionStatus('Connected');
      setInitError(null);

      // Cache the profile
      const { appCache } = await import('../utils/cache');
      await appCache.set('current_user_profile', result.user, 5 * 60 * 1000);

      // Request location permissions after successful Amber login (in background)
      setTimeout(async () => {
        console.log('📍 Requesting location permissions after Amber login...');
        await locationPermissionService.requestActivityTrackingPermissions();
      }, 500);

      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Amber Sign-In error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Amber Sign-In failed';
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Sign in with Apple - generates deterministic Nostr keys
   */
  const signInWithApple = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🍎 AuthContext: Starting Apple Sign-In process...');
      setConnectionStatus('Authenticating with Apple...');

      // Use AuthService for Apple authentication
      const result = await AuthService.signInWithApple();

      if (!result.success || !result.user) {
        console.error('❌ AuthContext: Apple authentication failed:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ AuthContext: Apple authentication successful - updating state');

      // Direct state updates (like iOS app)
      setIsAuthenticated(true);
      setCurrentUser(result.user);
      setIsConnected(true);
      setConnectionStatus('Connected');
      setInitError(null);

      // Cache the profile
      const { appCache } = await import('../utils/cache');
      await appCache.set('current_user_profile', result.user, 5 * 60 * 1000);

      // Trigger background profile refresh if needed
      setTimeout(() => {
        refreshProfileInBackground();
      }, 1000);

      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Apple Sign-In error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Apple Sign-In failed';
      return { success: false, error: errorMessage };
    }
  }, [refreshProfileInBackground]);

  /**
   * Sign out - clear all authentication state
   * Similar to iOS signOut() method
   */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      console.log('🔓 AuthContext: Starting sign out process...');
      
      await AuthService.signOut();
      
      // Clear all state (like iOS app)
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsConnected(false);
      setConnectionStatus('Disconnected');
      setInitError(null);
      
      console.log('✅ AuthContext: Sign out complete');
    } catch (error) {
      console.error('❌ AuthContext: Sign out error:', error);
      // Still clear state even if service call fails
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  }, []);

  /**
   * Refresh authentication - re-check stored credentials
   * This is what LoginScreen will call after successful login
   */
  const refreshAuthentication = useCallback(async (): Promise<void> => {
    console.log('🔄 AuthContext: Refreshing authentication state...');
    await checkStoredCredentials();
  }, [checkStoredCredentials]);

  /**
   * Initialize authentication on app startup
   * Checks for stored credentials and auto-authenticates if found
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkStoredCredentials();
      } catch (error) {
        console.error('❌ AuthContext: Initialization failed:', error);
        setInitError(error instanceof Error ? error.message : 'Initialization failed');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [checkStoredCredentials]);

  // Initialize background services after app is interactive
  useEffect(() => {
    if (isAuthenticated && !isInitializing) {
      // Delay background service init to avoid blocking startup
      const timer = setTimeout(async () => {
        try {
          const { BackgroundSyncService } = await import(
            '../services/fitness/backgroundSyncService'
          );
          const syncService = BackgroundSyncService.getInstance();
          await syncService.initialize();
        } catch (bgError) {
          // Silent fail - non-critical
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isInitializing]);

  // Context value - all state and actions
  const contextValue: AuthContextType = {
    // State
    isInitializing,
    isAuthenticated,
    currentUser,
    connectionStatus,
    isConnected,
    initError,
    showLoadingSplash,

    // Actions
    signIn,
    signUp,
    signInWithApple,
    signInWithAmber,
    signOut,
    refreshAuthentication,
    checkStoredCredentials,
    onSplashComplete,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export for convenience
export type { AuthContextType, AuthState, AuthActions };