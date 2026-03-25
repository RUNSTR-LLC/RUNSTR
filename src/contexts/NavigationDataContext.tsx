/**
 * NavigationDataContext - Centralized navigation data management
 * Provides single source of truth for navigation data across all components
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
import { InteractionManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/auth/authService';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';
import { CaptainCache } from '../utils/captainCache';
import { TeamMembershipService } from '../services/team/teamMembershipService';
import { isTeamCaptainEnhanced } from '../utils/teamUtils';
import { getUserNostrIdentifiers } from '../utils/nostr';
import { useAuth } from './AuthContext';
import unifiedCache from '../services/cache/UnifiedNostrCache';
import { CacheKeys, CacheTTL } from '../constants/cacheTTL';
import { PerformanceLogger } from '../utils/PerformanceLogger';
import { NostrFetchLogger } from '../utils/NostrFetchLogger';
import type {
  TeamScreenData,
  ProfileScreenData,
  UserWithWallet,
} from '../types';
import type { WalletData } from '../screens/WalletScreen';

export interface NavigationData {
  user: UserWithWallet | null;
  teamData: TeamScreenData | null;
  profileData: ProfileScreenData | null;
  walletData: WalletData | null;
  isLoading: boolean;
  isLoadingTeam: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadWallet: () => Promise<void>;
  prefetchLeaguesInBackground: () => Promise<void>;
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
  const [user, setUser] = useState<UserWithWallet | null>(null);
  const [teamData, setTeamData] = useState<TeamScreenData | null>(null);
  const [profileData, setProfileData] = useState<ProfileScreenData | null>(
    null
  );
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletLoaded, setWalletLoaded] = useState(false);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [leaguesPrefetched, setLeaguesPrefetched] = useState(false);

  // Log only on actual mount, not every re-render
  useEffect(() => {
    console.log('🚀 NavigationDataProvider: Initializing...');
  }, []);

  // ✅ ANDROID FIX: Skip redundant fetching if AuthContext already has user
  const fetchUserData = async (): Promise<UserWithWallet | null> => {
    try {
      // ✅ OPTIMIZATION: If AuthContext already loaded user, use it immediately
      if (currentUser) {
        console.log(
          '✅ NavigationData: Using user from AuthContext (skip refetch)'
        );
        setUser(currentUser);
        setIsLoading(false);
        return currentUser;
      }

      const identifiers = await getUserNostrIdentifiers();
      if (!identifiers) {
        return await fetchUserDataFresh();
      }

      // Only fetch if not already in currentUser
      const hexPubkey = identifiers.hexPubkey || '';
      const user = await unifiedCache.get<UserWithWallet>(
        CacheKeys.USER_PROFILE(hexPubkey),
        async () => {
          // Fetcher function - called if cache miss or expired
          const directUser =
            await DirectNostrProfileService.getCurrentUserProfile();
          if (directUser) return directUser as UserWithWallet;

          const fallbackUser =
            await DirectNostrProfileService.getFallbackProfile();
          return fallbackUser as UserWithWallet;
        },
        {
          ttl: CacheTTL.USER_PROFILE,
          backgroundRefresh: true,
          persist: true,
        }
      );

      if (user) {
        setUser(user);
        setIsLoading(false);
        console.log('✅ fetchUserData: User profile loaded from cache');
      }

      return user;
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data');
      return null;
    }
  };

  const fetchUserDataFresh = async (forceRefresh: boolean = false): Promise<UserWithWallet | null> => {
    try {
      // Get user identifiers for caching
      const identifiers = await getUserNostrIdentifiers();
      const hexPubkey = identifiers?.hexPubkey || '';

      // When forceRefresh=true, actually fetch from DirectNostrProfileService (bypass currentUser shortcut)
      if (forceRefresh) {
        console.log('🔄 NavigationDataProvider: Force refresh - fetching fresh profile from Nostr');
        const directNostrUser = await DirectNostrProfileService.getCurrentUserProfile(true);
        if (directNostrUser) {
          console.log('✅ NavigationDataProvider: Fresh profile fetched, banner:', directNostrUser.banner ? 'present' : 'missing');
          setUser(directNostrUser);
          // Update cache with fresh data
          if (hexPubkey) {
            await unifiedCache.set(
              CacheKeys.USER_PROFILE(hexPubkey),
              directNostrUser,
              CacheTTL.USER_PROFILE
            );
          }
          return directNostrUser as UserWithWallet;
        }
        // Fall through to other methods if direct fetch fails
      }

      // First check if we have a user from AuthContext (only if NOT force refreshing)
      if (currentUser && !forceRefresh) {
        console.log(
          '✅ NavigationDataProvider: Using currentUser from AuthContext'
        );
        setUser(currentUser);
        // ✅ Cache in UnifiedNostrCache
        if (hexPubkey) {
          await unifiedCache.set(
            CacheKeys.USER_PROFILE(hexPubkey),
            currentUser,
            CacheTTL.USER_PROFILE
          );
        }
        return currentUser;
      }

      const fallbackUser = await DirectNostrProfileService.getFallbackProfile();
      if (fallbackUser) {
        setUser(fallbackUser);
      }

      try {
        const directNostrUser =
          await DirectNostrProfileService.getCurrentUserProfile();
        if (directNostrUser) {
          setUser(directNostrUser);
          // ✅ Cache in UnifiedNostrCache
          if (hexPubkey) {
            await unifiedCache.set(
              CacheKeys.USER_PROFILE(hexPubkey),
              directNostrUser,
              CacheTTL.USER_PROFILE
            );
          }
          return directNostrUser;
        }
      } catch (directError) {}

      try {
        const userData = await AuthService.getCurrentUserWithWallet();
        if (userData) {
          setUser(userData);
          // ✅ Cache in UnifiedNostrCache
          if (hexPubkey) {
            await unifiedCache.set(
              CacheKeys.USER_PROFILE(hexPubkey),
              userData,
              CacheTTL.USER_PROFILE
            );
          }
          return userData;
        }
      } catch (fetchError) {}

      if (fallbackUser) {
        // ✅ Cache in UnifiedNostrCache
        if (hexPubkey) {
          await unifiedCache.set(
            CacheKeys.USER_PROFILE(hexPubkey),
            fallbackUser,
            CacheTTL.USER_PROFILE
          );
        }
        return fallbackUser;
      }

      return null;
    } catch (error) {
      console.error('Error fetching fresh user data:', error);
      return null;
    }
  };

  /**
   * Get all teams user is a member of (multi-team support)
   * OPTIMIZED: Uses stale-while-revalidate for instant returns
   */
  const getAllUserTeams = async (user: UserWithWallet): Promise<any[]> => {
    PerformanceLogger.start('NavigationDataContext: getAllUserTeams()');
    setIsLoadingTeam(true);
    try {
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers) {
        console.log('No user identifiers found for team detection');
        setIsLoadingTeam(false);
        PerformanceLogger.end('NavigationDataContext: getAllUserTeams()');
        return [];
      }

      const hexPubkey = userIdentifiers.hexPubkey || '';
      const teams = await unifiedCache.get<any[]>(
        CacheKeys.USER_TEAMS(hexPubkey),
        async () => {
          const membershipService = TeamMembershipService.getInstance();
          const localMemberships = await membershipService.getLocalMemberships(
            hexPubkey
          );

          const userTeams: any[] = [];

          // 1. Get teams where user is captain (from local cache)
          const captainTeams = await CaptainCache.getCaptainTeams();
          console.log(`Found ${captainTeams.length} captain teams in cache`);

          for (const teamId of captainTeams) {
            userTeams.push({
              id: teamId,
              name: 'Team',
              description: '',
              prizePool: 0,
              memberCount: 0,
              isActive: true,
              role: 'captain',
            });
          }

          // 2. Get all local memberships
          console.log(`Found ${localMemberships.length} local memberships`);

          for (const membership of localMemberships) {
            if (userTeams.some((t) => t.id === membership.teamId)) {
              continue;
            }
            userTeams.push({
              id: membership.teamId,
              name: membership.teamName,
              description: '',
              prizePool: 0,
              memberCount: 0,
              isActive: true,
              role: membership.status === 'official' ? 'member' : 'pending',
              captainId: membership.captainPubkey,
            });
          }

          console.log(`✅ Built ${userTeams.length} teams for user`);
          return userTeams;
        },
        {
          ttl: CacheTTL.USER_TEAMS,
          backgroundRefresh: true,
          persist: true,
        }
      );

      console.log(
        `✅ getAllUserTeams: Returning ${teams?.length || 0} teams`
      );
      setIsLoadingTeam(false);
      PerformanceLogger.end('NavigationDataContext: getAllUserTeams()');
      return teams || [];
    } catch (error) {
      console.error('Error getting all user teams:', error);
      setIsLoadingTeam(false);
      PerformanceLogger.end('NavigationDataContext: getAllUserTeams()');
      return [];
    } finally {
      setIsLoadingTeam(false);
    }
  };

  /**
   * Get user's current team (backward compatibility - returns first team)
   * @deprecated Use getAllUserTeams() for multi-team support
   */
  const getUserTeamFromCache = async (user: UserWithWallet): Promise<any> => {
    const teams = await getAllUserTeams(user);
    if (teams.length > 0) {
      console.log(
        `✅ getUserTeamFromCache: Returning first of ${teams.length} teams`
      );
      return teams[0];
    }
    return null;
  };

  const fetchProfileData = async (user: UserWithWallet): Promise<void> => {
    PerformanceLogger.start('NavigationDataContext: fetchProfileData()');
    NostrFetchLogger.start('NavData.fetchProfileData');
    console.log(
      `[${new Date().toISOString()}] 🔍 NavigationData: fetchProfileData starting for user ${
        user.name
      }`
    );

    try {
      let realWalletBalance = user.walletBalance || 0;
      let currentTeam = undefined;
      let teams: any[] = [];
      let primaryTeamId: string | undefined = undefined;

      try {
        console.log(
          `[${new Date().toISOString()}] 🔍 NavigationData: About to fetch all teams...`
        );
        // Fetch all teams user is a member of (multi-team support)
        const allTeams = await getAllUserTeams(user);
        console.log(
          `[${new Date().toISOString()}] ✅ Profile: Found ${
            allTeams.length
          } team(s) for user`
        );

        // Filter out pending teams - only show teams where user is captain or verified member
        teams = allTeams.filter(
          (team) => team.role === 'captain' || team.role === 'member'
        );
        console.log(
          `✅ Profile: Filtered to ${teams.length} verified team(s) (excluding pending)`
        );

        // Get primary team ID from user preferences
        const userIdentifiers = await getUserNostrIdentifiers();
        if (userIdentifiers && teams.length > 0) {
          const membershipService = TeamMembershipService.getInstance();
          const primaryTeam = await membershipService.getPrimaryTeam(
            userIdentifiers.hexPubkey || userIdentifiers.npub || ''
          );
          if (primaryTeam) {
            primaryTeamId = primaryTeam.teamId;
            console.log(
              `✅ Profile: Primary team set to ${primaryTeam.teamName}`
            );
          } else if (teams.length > 0) {
            // Fallback: use first team as primary
            primaryTeamId = teams[0].id;
            console.log(
              `✅ Profile: Using first team as primary (${teams[0].name})`
            );
          }
        }

        // Keep currentTeam for backward compatibility (use first team)
        // Only set if user has verified teams (not pending)
        currentTeam = teams.length > 0 ? teams[0] : undefined;
      } catch (teamError) {
        console.log('Could not fetch user teams:', teamError);
      }

      const profileData: ProfileScreenData = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          npub: user.npub,
          avatar: user.avatar || '',
          role: user.role,
          teamId: user.teamId,
          createdAt: user.createdAt,
          lastSyncAt: user.lastSyncAt,
          bio: user.bio,
          website: user.website,
          picture: user.picture,
          banner: user.banner,
          lud16: user.lud16,
          displayName: user.displayName,
        },
        wallet: {
          id: 'wallet_' + user.id,
          userId: user.id,
          balance: realWalletBalance,
          address: user.lightningAddress || '',
          transactions: [],
        },
        syncSources: [
          {
            provider: 'healthkit',
            isConnected: false,
            permissions: [],
          },
        ],
        recentWorkouts: [],
        currentTeam, // Deprecated - kept for backward compatibility
        teams, // Multi-team support - all teams user is a member of
        primaryTeamId, // User's designated primary/favorite team
        subscription: {
          type: user.role,
          status: 'active',
        },
        notificationSettings: {
          eventNotifications: true,
          leagueUpdates: true,
          teamAnnouncements: true,
          bitcoinRewards: true,
          challengeUpdates: true,
          liveCompetitionUpdates: true,
          workoutReminders: false,
        },
      };

      setProfileData(profileData);
      PerformanceLogger.end('NavigationDataContext: fetchProfileData()');
      NostrFetchLogger.end('NavData.fetchProfileData', teams.length, 'success');
    } catch (error) {
      console.error('Error creating profile data:', error);
      PerformanceLogger.end('NavigationDataContext: fetchProfileData()');
      NostrFetchLogger.error('NavData.fetchProfileData', error as Error);
    }
  };

  const loadWallet = useCallback(async (): Promise<void> => {
    if (walletLoaded || !user) return;

    try {
      let realWalletBalance = user.walletBalance || 0;

      if (user.role === 'captain' && user.hasWalletCredentials) {
        try {
          // Team wallets deprecated - use P2P NIP-60/61 payments
          const walletBalance = {
            lightning: 0,
            onchain: 0,
            liquid: 0,
            total: 0,
          };
          realWalletBalance = walletBalance.total;
        } catch (error) {
          realWalletBalance = user.walletBalance || 0;
        }
      }

      const walletData: WalletData = {
        balance: {
          sats: realWalletBalance,
          usd: realWalletBalance / 2500,
          connected: true, // Offline-first WalletCore is always ready to receive
        },
        autoWithdraw: {
          enabled: false,
          threshold: 50000,
          lightningAddress: user.lightningAddress || '',
        },
        earnings: {
          thisWeek: { sats: 0, change: 0, changeType: 'positive' as const },
          thisMonth: { sats: 0, change: 0, changeType: 'positive' as const },
        },
        recentActivity: [],
      };

      setWalletData(walletData);
      setWalletLoaded(true);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  }, [user, walletLoaded]);

  /**
   * Prefetch league data in background for instant loading
   * Uses UnifiedNostrCache with competitions TTL
   * Non-blocking operation to avoid slowing down initial load
   */
  const prefetchLeaguesInBackground = useCallback(async (): Promise<void> => {
    // Only prefetch once
    if (leaguesPrefetched) {
      console.log('📦 Leagues already prefetched, skipping');
      return;
    }

    try {
      console.log('🏁 Prefetching leagues in background...');

      // ✅ Check if already cached in UnifiedNostrCache
      const cachedCompetitions = unifiedCache.getCached(CacheKeys.COMPETITIONS);
      if (cachedCompetitions) {
        console.log(
          '✅ Leagues already cached in UnifiedNostrCache, skipping prefetch'
        );
        setLeaguesPrefetched(true);
        return;
      }

      // Competitions load on-demand — no longer prefetched at startup

      console.log(
        '⚠️ Competitions not in cache - should have been prefetched by SplashInit'
      );
      setLeaguesPrefetched(true);
    } catch (error) {
      console.error('❌ Failed to prefetch leagues:', error);
      // Don't block app on prefetch failure
    }
  }, [leaguesPrefetched]);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setWalletLoaded(false);

    try {
      // ✅ Pass forceRefresh=true to actually fetch fresh profile from Nostr (including banner)
      const userData = await fetchUserDataFresh(true);
      if (userData) {
        await fetchProfileData(userData);
      }
    } catch (error) {
      console.error('Error refreshing navigation data:', error);
      setError('Failed to load app data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ ANDROID FIX: React to currentUser from AuthContext WITHOUT refetching
  useEffect(() => {
    if (currentUser && user?.id !== currentUser.id) {
      console.log(
        '✅ NavigationData: Using currentUser from AuthContext (no refetch needed)'
      );
      setUser(currentUser);
      // Always rebuild profile data when user changes (ensures avatar/bio appear immediately)
      fetchProfileData(currentUser);
    } else if (currentUser && !profileData) {
      // ✅ PROFILE CACHE FIX: User loaded from cache but profileData not built yet
      console.log('✅ NavigationData: Building profileData for cached user');
      fetchProfileData(currentUser);
    }
  }, [currentUser, user?.id]); // Fixed: Removed profileData to prevent infinite loop

  // ✅ FIX #18: NavigationDataContext relies on AppInitializationService for data loading
  // AppInitializationService handles all background initialization to prevent race conditions
  useEffect(() => {
    console.log(
      '[NavigationDataContext] 🎯 Simplified init - relying on AppInitializationService'
    );
    setIsLoading(false);
  }, []);

  // ✅ PERFORMANCE FIX: Memoize context value - callbacks excluded from deps (they're stable with useCallback)
  const value = useMemo<NavigationData>(
    () => ({
      user,
      teamData,
      profileData,
      walletData,
      isLoading,
      isLoadingTeam,
      error,
      refresh,
      loadWallet,
      prefetchLeaguesInBackground,
    }),
    [
      user,
      teamData,
      profileData,
      walletData,
      isLoading,
      isLoadingTeam,
      error,
      refresh,
      loadWallet,
      prefetchLeaguesInBackground,
    ]
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
    console.error(
      '❌ useNavigationData: Context is undefined! Make sure NavigationDataProvider is wrapping the component'
    );
    throw new Error(
      'useNavigationData must be used within a NavigationDataProvider'
    );
  }
  return context;
};
