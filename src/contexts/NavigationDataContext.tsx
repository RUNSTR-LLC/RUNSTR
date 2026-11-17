/**
 * NavigationDataContext - the signed-in user's profile for the Home screen.
 *
 * AuthContext owns identity; this context mirrors that user and lets Home
 * pull-to-refresh the kind 0 profile (name, picture, banner) from relays.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';
import { getUserNostrIdentifiers } from '../utils/nostr';
import { useAuth } from './AuthContext';
import unifiedCache from '../services/cache/UnifiedNostrCache';
import { CacheKeys, CacheTTL } from '../constants/cacheTTL';
import type { User } from '../types';

export interface NavigationData {
  user: User | null;
  error: string | null;
  refresh: () => Promise<void>;
}

const NavigationDataContext = createContext<NavigationData | undefined>(
  undefined
);

interface NavigationDataProviderProps {
  children: ReactNode;
}

export const NavigationDataProvider: React.FC<NavigationDataProviderProps> = ({
  children,
}) => {
  const { currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mirror AuthContext: it has already loaded the user, so never refetch here.
  // Signing out clears the mirror so the next account never sees a stale profile.
  useEffect(() => {
    if (!currentUser) {
      setUser(null);
    } else if (user?.id !== currentUser.id) {
      setUser(currentUser);
    }
  }, [currentUser, user?.id]);

  // Pull-to-refresh: fetch the fresh kind 0 profile from relays.
  const refresh = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const fresh = await DirectNostrProfileService.getCurrentUserProfile(true);
      if (!fresh) return;
      setUser(fresh);
      const identifiers = await getUserNostrIdentifiers();
      if (identifiers?.hexPubkey) {
        await unifiedCache.set(
          CacheKeys.USER_PROFILE(identifiers.hexPubkey),
          fresh,
          CacheTTL.USER_PROFILE
        );
      }
    } catch (refreshError) {
      console.error('Error refreshing profile:', refreshError);
      setError('Failed to load app data');
    }
  }, []);

  const value = useMemo<NavigationData>(
    () => ({ user, error, refresh }),
    [user, error, refresh]
  );

  return (
    <NavigationDataContext.Provider value={value}>
      {children}
    </NavigationDataContext.Provider>
  );
};

export const useNavigationData = (): NavigationData => {
  const context = useContext(NavigationDataContext);
  if (context === undefined) {
    throw new Error(
      'useNavigationData must be used within a NavigationDataProvider'
    );
  }
  return context;
};
