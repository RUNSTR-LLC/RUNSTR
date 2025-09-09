/**
 * AuthContext - Single source of truth for authentication state
 * iOS-inspired authentication management with React Context
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/auth/authService';
import { getNpubFromStorage } from '../utils/nostr';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';
import type { User } from '../types';

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
  const [connectionStatus, setConnectionStatus] = useState('Connecting to Nostr...');
  const [isConnected, setIsConnected] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  /**
   * Check for stored credentials and load profile
   * Similar to iOS checkAuthenticationStatus() method
   */
  const checkStoredCredentials = useCallback(async (): Promise<void> => {
    try {
      console.log('🔍 AuthContext: Checking for stored Nostr keys...');
      
      const storedNpub = await getNpubFromStorage();
      
      if (storedNpub) {
        console.log('✅ AuthContext: Found stored Nostr keys - loading user profile...');
        setConnectionStatus('Loading profile...');
        
        // Load user profile using stored keys
        let directUser = null;
        
        try {
          directUser = await DirectNostrProfileService.getCurrentUserProfile();
        } catch (profileError) {
          console.warn('⚠️  AuthContext: Profile load failed, using fallback:', profileError);
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

          console.log('✅ AuthContext: User profile loaded - authenticated:', user.name || 'Unknown');
          setIsAuthenticated(true);
          setCurrentUser(user);
          setIsConnected(true);
          setConnectionStatus('Connected');
        } else {
          console.log('❌ AuthContext: Failed to load user profile');
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } else {
        console.log('❌ AuthContext: No stored Nostr keys found');
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('❌ AuthContext: Error checking stored credentials:', error);
      setInitError(error instanceof Error ? error.message : 'Failed to check credentials');
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  }, []);

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
      setCurrentUser(result.user);
      setIsConnected(true);
      setConnectionStatus('Connected');
      setInitError(null);
      
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      return { success: false, error: errorMessage };
    }
  }, []);

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
   * Similar to iOS app initialization flow
   */
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🚀 AuthContext: Initializing authentication...');
      
      try {
        await checkStoredCredentials();
        
        // Initialize background services if authenticated
        if (isAuthenticated) {
          try {
            console.log('🏃‍♂️ AuthContext: Initializing background services...');
            const { BackgroundSyncService } = await import(
              '../services/fitness/backgroundSyncService'
            );
            const syncService = BackgroundSyncService.getInstance();
            const result = await syncService.initialize();

            if (result.success) {
              console.log('✅ AuthContext: Background sync activated');
            } else {
              console.warn('⚠️  AuthContext: Background sync initialization failed:', result.error);
            }
          } catch (bgError) {
            console.warn('⚠️  AuthContext: Background services failed to initialize:', bgError);
          }
        }
        
      } catch (error) {
        console.error('❌ AuthContext: Initialization failed:', error);
        setInitError(error instanceof Error ? error.message : 'Initialization failed');
      } finally {
        console.log('🏁 AuthContext: Initialization complete - setting isInitializing to false');
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [isAuthenticated, checkStoredCredentials]);

  // Context value - all state and actions
  const contextValue: AuthContextType = {
    // State
    isInitializing,
    isAuthenticated,
    currentUser,
    connectionStatus,
    isConnected,
    initError,
    
    // Actions
    signIn,
    signOut,
    refreshAuthentication,
    checkStoredCredentials,
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