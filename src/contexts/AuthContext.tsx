/**
 * AuthContext - Single source of truth for authentication state
 * iOS-inspired authentication management with React Context
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/auth/authService';
import { getNpubFromStorage, getUserNostrIdentifiers } from '../utils/nostr';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';
import { locationPermissionService } from '../services/activity/LocationPermissionService';
import unifiedCache from '../services/cache/UnifiedNostrCache';
import { CacheKeys } from '../constants/cacheTTL';
import { UnifiedSigningService } from '../services/auth/UnifiedSigningService';
import type { User } from '../types';
import { PerformanceLogger } from '../utils/PerformanceLogger';
import { NostrFetchLogger } from '../utils/NostrFetchLogger';
import { LocalTeamMembershipService } from '../services/team/LocalTeamMembershipService';
import VerificationService from '../services/verification/VerificationService';

// Authentication state interface
interface AuthState {
  isInitializing: boolean;
  isAuthenticated: boolean | null;
  currentUser: User | null;
  connectionStatus: string;
  isConnected: boolean;
  initError: string | null;
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
  const [connectionStatus, setConnectionStatus] = useState(
    'Connecting to Nostr...'
  );
  const [isConnected, setIsConnected] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  /**
   * Check for stored credentials (FAST - no network calls)
   * Profile loaded from UnifiedCache (prefetched by SplashInit)
   */
  const checkStoredCredentials = useCallback(async (): Promise<void> => {
    NostrFetchLogger.start('AuthContext.checkStoredCredentials');
    try {
      const storedNpub = await getNpubFromStorage();

      if (storedNpub) {
        // FAST: Set authenticated state immediately
        setIsAuthenticated(true);
        setConnectionStatus('Loading...');

        // Get user identifiers
        const identifiers = await getUserNostrIdentifiers();
        if (!identifiers) {
          console.warn('⚠️ AuthContext: No user identifiers');
          setIsAuthenticated(false);
          setCurrentUser(null);
          NostrFetchLogger.end('AuthContext.checkStoredCredentials', 0, 'no identifiers');
          return;
        }

        const { hexPubkey } = identifiers;

        // ✅ PERFORMANCE FIX: Skip cache initialization - lazy load on demand
        // This saves 1-2s on app startup by deferring AsyncStorage reads
        // Cache will initialize automatically on first getCached() call
        // PerformanceLogger.start('AuthContext: unifiedCache.initialize()');
        // await unifiedCache.initialize(); // REMOVED
        // PerformanceLogger.end('AuthContext: unifiedCache.initialize()');

        // ✅ PROFILE CACHE FIX: Try memory cache first (instant)
        let cachedUser = unifiedCache.getCached<User>(
          CacheKeys.USER_PROFILE(hexPubkey)
        );

        // ✅ PERFORMANCE FIX: If memory cache empty, try AsyncStorage (no artificial timeout)
        if (!cachedUser) {
          console.log(
            '⚡ AuthContext: Memory cache miss, checking AsyncStorage...'
          );
          try {
            PerformanceLogger.start(
              'AuthContext: getCachedAsync (AsyncStorage read)',
              1
            );
            cachedUser = await unifiedCache.getCachedAsync<User>(
              CacheKeys.USER_PROFILE(hexPubkey)
            );
            PerformanceLogger.end(
              'AuthContext: getCachedAsync (AsyncStorage read)'
            );
            if (cachedUser) {
              console.log('✅ AuthContext: Loaded user from AsyncStorage');
            }
          } catch (asyncCacheError) {
            console.warn(
              '⚠️ AuthContext: AsyncStorage cache check failed:',
              asyncCacheError
            );
          }
        } else {
          console.log(
            '⚡ AuthContext: Loaded user from memory cache (instant)'
          );
        }

        if (cachedUser) {
          NostrFetchLogger.cacheHit('AuthContext.checkStoredCredentials', 'user profile');
          setCurrentUser(cachedUser);
          setIsConnected(true);
          setConnectionStatus('Connected');
          NostrFetchLogger.end('AuthContext.checkStoredCredentials', 1, 'cached user');

          // Subscribe to profile updates
          unifiedCache.subscribe(
            CacheKeys.USER_PROFILE(hexPubkey),
            (updatedUser) => {
              console.log('🔄 AuthContext: User profile updated from cache');
              setCurrentUser(updatedUser);
            }
          );
        } else {
          NostrFetchLogger.cacheMiss('AuthContext.checkStoredCredentials', 'user profile');
          // ✅ ANDROID FIX: If no cached user, load from Nostr with timeout protection
          console.log(
            '⚠️ AuthContext: No cached user - fetching from Nostr...'
          );
          setIsConnected(true);
          setConnectionStatus('Loading profile...');

          // ✅ ANDROID FIX: Set fallback user immediately, upgrade when profile loads
          const fallbackUser: User = {
            id: 'fallback_' + hexPubkey.slice(-10),
            npub: storedNpub,
            name: 'User ' + storedNpub.slice(5, 13),
            email: '',
            role: 'member',
            createdAt: new Date().toISOString(),
          } as User;

          setCurrentUser(fallbackUser);

          // Try to upgrade to full profile in background (non-blocking)
          NostrFetchLogger.end('AuthContext.checkStoredCredentials', 1, 'fallback user');
          loadUserProfile().catch((err) => {
            console.warn(
              '⚠️ AuthContext: Profile upgrade failed, using fallback:',
              err
            );
          });
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        NostrFetchLogger.end('AuthContext.checkStoredCredentials', 0, 'no stored npub');
      }
    } catch (error) {
      NostrFetchLogger.error('AuthContext.checkStoredCredentials', error as Error);
      console.error(
        '❌ AuthContext: Error checking stored credentials:',
        error
      );
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  }, []);

  /**
   * Load user profile asynchronously (called after initial render)
   * Uses global NDK instance for Nostr operations
   */
  const loadUserProfile = async (): Promise<void> => {
    NostrFetchLogger.start('AuthContext.loadUserProfile');
    try {
      setConnectionStatus('Loading profile...');

      // Check if NDK was pre-initialized
      const preInitializedNDK = (global as any).preInitializedNDK;
      if (preInitializedNDK) {
        console.log('✅ Using pre-initialized NDK instance');
      }

      // Try to load from cache first
      const { appCache } = await import('../utils/cache');
      const cachedUser = await appCache.get<User>('current_user_profile');

      if (cachedUser) {
        NostrFetchLogger.cacheHit('AuthContext.loadUserProfile', 'appCache');
        // Show cached user immediately for fast startup
        setCurrentUser(cachedUser);
        setIsConnected(true);
        setConnectionStatus('Connected');

        // ALWAYS fetch fresh Nostr profile data to get bio, picture, banner
        console.log('📡 Fetching fresh Nostr profile data...');
        try {
          const directUser =
            await DirectNostrProfileService.getCurrentUserProfile();
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
              displayName: updatedUser.displayName,
            });

            setCurrentUser(updatedUser);
            // Update cache with fresh data
            await appCache.set(
              'current_user_profile',
              updatedUser,
              5 * 60 * 1000
            );
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch fresh profile data:', error);
          // Continue with cached data
        }

        NostrFetchLogger.end('AuthContext.loadUserProfile', 1, 'from cache + refresh');
        return;
      }

      // No cache, load from Nostr
      NostrFetchLogger.cacheMiss('AuthContext.loadUserProfile', 'appCache');
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
        NostrFetchLogger.end('AuthContext.loadUserProfile', 1, 'from Nostr');
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        NostrFetchLogger.end('AuthContext.loadUserProfile', 0, 'no profile found');
      }
    } catch (error) {
      NostrFetchLogger.error('AuthContext.loadUserProfile', error as Error);
      console.error('❌ Error loading profile:', error);
      setInitError(
        error instanceof Error ? error.message : 'Failed to load profile'
      );
    }
  };

  /**
   * Refresh profile in background without blocking
   */
  const refreshProfileInBackground = async (): Promise<void> => {
    try {
      const directUser =
        await DirectNostrProfileService.getCurrentUserProfile();
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
  const signIn = useCallback(
    async (nsec: string): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log('🚀 AuthContext: Starting sign in process...');
        setConnectionStatus('Authenticating...');

        // Use existing AuthService for validation and storage
        const result = await AuthService.signInWithNostr(nsec);

        if (!result.success || !result.user) {
          console.error('❌ AuthContext: Authentication failed:', result.error);
          return { success: false, error: result.error };
        }

        console.log(
          '✅ AuthContext: Authentication successful - updating state'
        );

        // ✅ FIX: Clear new signup flag for returning users
        // This prevents returning users from seeing onboarding wizard
        await AsyncStorage.setItem('@runstr:is_new_signup', 'false');

        // Direct state updates (like iOS app)
        setIsAuthenticated(true);
        setConnectionStatus('Loading your fitness journey...');

        // Start loading profile in background while showing splash
        setTimeout(() => {
          setCurrentUser(result.user);
          setIsConnected(true);
          setConnectionStatus('Connected');
          setInitError(null);
        }, 100);

        // Fetch verification code in background (non-blocking)
        if (result.user?.npub) {
          VerificationService.fetchAndStoreCode(result.user.npub).catch((err) => {
            console.warn('[Auth] Verification code fetch failed:', err);
          });
        }

        return { success: true };
      } catch (error) {
        console.error('❌ AuthContext: Sign in error:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Authentication failed';
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  /**
   * Sign up with new Nostr identity - generates fresh keypair
   * One-click signup that creates a new Nostr identity
   */
  const signUp = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      console.log(
        '🚀 AuthContext: Starting sign up process (generating new identity)...'
      );
      setConnectionStatus('Generating identity...');

      // Use AuthService to generate new Nostr identity
      const result = await AuthService.signUpWithNostr();

      if (!result.success || !result.user) {
        console.error('❌ AuthContext: Signup failed:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ AuthContext: Signup successful - new identity created');

      // Mark this as completed signup (same as manual login for persistence)
      // Changed from 'true' to 'false' to fix auto-generated account persistence issue
      await AsyncStorage.setItem('@runstr:is_new_signup', 'false');

      // Direct state updates (like iOS app)
      setIsAuthenticated(true);
      setConnectionStatus('Setting up your fitness journey...');

      // Ensure profile is cached before navigation (fixes blank profile issue)
      try {
        const { DirectNostrProfileService } = await import(
          '../services/user/directNostrProfileService'
        );
        await Promise.race([
          DirectNostrProfileService.getCurrentUserProfile(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile cache timeout')), 2000)
          ),
        ]);
        console.log('✅ Profile cached successfully after signup');
      } catch (error) {
        console.warn(
          '⚠️ Profile cache timeout, using signup defaults:',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      // NOW set user in state (profile data ready)
      setCurrentUser(result.user);
      setIsConnected(true);
      setConnectionStatus('Connected');
      setInitError(null);

      // Fetch verification code in background (non-blocking)
      if (result.user?.npub) {
        VerificationService.fetchAndStoreCode(result.user.npub).catch((err) => {
          console.warn('[Auth] Verification code fetch failed:', err);
        });
      }

      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Sign up error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create identity';
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Sign in with Amber - uses external key management
   */
  const signInWithAmber = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      console.log('🟠 AuthContext: Starting Amber Sign-In process...');
      setConnectionStatus('Authenticating with Amber...');

      // Use AuthService for Amber authentication
      const result = await AuthService.signInWithAmber();

      if (!result.success || !result.user) {
        console.error(
          '❌ AuthContext: Amber authentication failed:',
          result.error
        );
        return { success: false, error: result.error };
      }

      console.log(
        '✅ AuthContext: Amber authentication successful - updating state'
      );

      // Direct state updates (like iOS app)
      setIsAuthenticated(true);
      setConnectionStatus('Loading your fitness journey...');

      // Start loading profile in background while showing splash
      setTimeout(() => {
        setCurrentUser(result.user);
      }, 100);
      setIsConnected(true);
      setConnectionStatus('Connected');
      setInitError(null);

      // Initialize signer on GlobalNDK (belt & suspenders backup)
      try {
        const signer = await UnifiedSigningService.getInstance().getSigner();
        if (signer) {
          const { GlobalNDKService } = await import(
            '../services/nostr/GlobalNDKService'
          );
          const ndk = await GlobalNDKService.getInstance();
          ndk.signer = signer;
          console.log(
            '✅ AuthContext: Set Amber signer on GlobalNDK after login'
          );
        }
      } catch (signerError) {
        console.error(
          '⚠️ AuthContext: Failed to set signer on GlobalNDK:',
          signerError
        );
        // Don't fail the login if signer setup fails - UnifiedSigningService will handle it
      }

      // Cache the profile
      const { appCache } = await import('../utils/cache');
      await appCache.set('current_user_profile', result.user, 5 * 60 * 1000);

      // Fetch verification code in background (non-blocking)
      if (result.user?.npub) {
        VerificationService.fetchAndStoreCode(result.user.npub).catch((err) => {
          console.warn('[Auth] Verification code fetch failed:', err);
        });
      }

      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Amber Sign-In error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Amber Sign-In failed';
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Sign in with Apple - generates deterministic Nostr keys
   */
  const signInWithApple = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      console.log('🍎 AuthContext: Starting Apple Sign-In process...');
      setConnectionStatus('Authenticating with Apple...');

      // Use AuthService for Apple authentication
      const result = await AuthService.signInWithApple();

      if (!result.success || !result.user) {
        console.error(
          '❌ AuthContext: Apple authentication failed:',
          result.error
        );
        return { success: false, error: result.error };
      }

      console.log(
        '✅ AuthContext: Apple authentication successful - updating state'
      );

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

      // Fetch verification code in background (non-blocking)
      if (result.user?.npub) {
        VerificationService.fetchAndStoreCode(result.user.npub).catch((err) => {
          console.warn('[Auth] Verification code fetch failed:', err);
        });
      }

      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Apple Sign-In error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Apple Sign-In failed';
      return { success: false, error: errorMessage };
    }
  }, [refreshProfileInBackground]);

  /**
   * Sign out - clear all authentication state
   * Similar to iOS signOut() method
   */
  const signOut = useCallback(async (): Promise<void> => {
    console.log('🔓 AuthContext: Starting sign out process...');

    // CRITICAL: Set state FIRST to trigger navigation immediately
    // This ensures user sees Login screen even if cleanup takes time
    setIsAuthenticated(false);
    setCurrentUser(null);
    setIsConnected(false);
    setConnectionStatus('Disconnected');
    setInitError(null);

    console.log('✅ AuthContext: State cleared - navigation should happen now');

    // Do cleanup in the background (non-blocking)
    try {
      // Clean up notification handlers
      try {
        const { notificationCleanupService } = await import(
          '../services/notifications/NotificationCleanupService'
        );
        await notificationCleanupService.cleanupAllHandlers();
        console.log('✅ AuthContext: Notification handlers cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ AuthContext: Notification cleanup failed:', cleanupError);
      }

      // Clear verification code
      await VerificationService.clearCode();
      console.log('✅ AuthContext: Verification code cleared');

      // Clear storage and caches
      await AuthService.signOut();
      console.log('✅ AuthContext: Sign out cleanup complete');
    } catch (error) {
      console.error('❌ AuthContext: Sign out cleanup error:', error);
      // State already cleared, so user is logged out regardless
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
        setInitError(
          error instanceof Error ? error.message : 'Initialization failed'
        );
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [checkStoredCredentials]);

  // Sync health platform workouts on app foreground and cold start
  // Replaces the disabled BackgroundSyncService (which conflicted with active GPS tracking).
  // This is safe because it only fires on foreground (user isn't mid-workout) and has a 5-min throttle.
  useEffect(() => {
    if (!isAuthenticated || isInitializing) return;

    const { AppStateManager } = require('../services/core/AppStateManager');
    const { HealthSyncManager } = require('../services/fitness/HealthSyncManager');

    // Run once on cold start (delayed to avoid blocking startup)
    const timer = setTimeout(() => {
      HealthSyncManager.syncTodayToLeaderboard().catch(() => {});
    }, 3000);

    // Run on each foreground transition
    const unsubscribe = AppStateManager.onStateChange((isActive: boolean) => {
      if (isActive) {
        HealthSyncManager.syncTodayToLeaderboard().catch(() => {});
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [isAuthenticated, isInitializing]);

  // Register push token_key so the external zapping tool can send reward notifications.
  // Fire-and-forget: tagged to the existing broadcast_tokens row via sha256(npub).
  useEffect(() => {
    if (!isAuthenticated || isInitializing) return;

    (async () => {
      try {
        const npub = await getNpubFromStorage();
        if (!npub) return;

        const provider = (await import('../services/notifications/ExpoNotificationProvider'))
          .ExpoNotificationProvider.getInstance();
        await provider.initialize();
        const token = provider.getDeviceToken();
        if (!token) return;

        const Crypto = await import('expo-crypto');
        const tokenKey = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          npub
        );

        const { supabase, isSupabaseConfigured } = await import('../utils/supabase');
        if (!isSupabaseConfigured() || !supabase) return;

        await supabase
          .from('broadcast_tokens')
          .update({ token_key: tokenKey })
          .eq('token', token);

        console.log('[Auth] Push token_key registered for reward notifications');
      } catch (err) {
        console.warn('[Auth] token_key registration failed (silent):', err);
      }
    })();
  }, [isAuthenticated, isInitializing]);

  // Context value - memoized to prevent unnecessary re-renders
  // This prevents cascading re-renders when context consumers check for changes
  const contextValue = useMemo<AuthContextType>(
    () => ({
      // State
      isInitializing,
      isAuthenticated,
      currentUser,
      connectionStatus,
      isConnected,
      initError,

      // Actions (already stable via useCallback)
      signIn,
      signUp,
      signInWithApple,
      signInWithAmber,
      signOut,
      refreshAuthentication,
      checkStoredCredentials,
    }),
    [
      isInitializing,
      isAuthenticated,
      currentUser,
      connectionStatus,
      isConnected,
      initError,
      signIn,
      signUp,
      signInWithApple,
      signInWithAmber,
      signOut,
      refreshAuthentication,
      checkStoredCredentials,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
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
