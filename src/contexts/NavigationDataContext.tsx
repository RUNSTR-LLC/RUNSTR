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
  ReactNode,
} from 'react';
import { AuthService } from '../services/auth/authService';
import { getNostrTeamService } from '../services/nostr/NostrTeamService';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';
import { CaptainCache } from '../utils/captainCache';
import { TeamMembershipService } from '../services/team/teamMembershipService';
import { isTeamCaptainEnhanced } from '../utils/teamUtils';
import { getUserNostrIdentifiers } from '../utils/nostr';
import { useAuth } from './AuthContext';
import unifiedCache from '../services/cache/UnifiedNostrCache';
import { CacheKeys, CacheTTL } from '../constants/cacheTTL';
import type {
  TeamScreenData,
  ProfileScreenData,
  UserWithWallet,
  DiscoveryTeam,
} from '../types';
import type { CaptainDashboardData } from '../screens/CaptainDashboardScreen';
import type { WalletData } from '../screens/WalletScreen';

export interface NavigationData {
  user: UserWithWallet | null;
  teamData: TeamScreenData | null;
  profileData: ProfileScreenData | null;
  walletData: WalletData | null;
  captainDashboardData: CaptainDashboardData | null;
  availableTeams: DiscoveryTeam[];
  isLoading: boolean;
  isLoadingTeam: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadTeams: () => Promise<void>;
  loadWallet: () => Promise<void>;
  loadCaptainDashboard: () => Promise<void>;
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
  console.log('🚀 NavigationDataProvider: Initializing...');
  const { currentUser } = useAuth();
  const [user, setUser] = useState<UserWithWallet | null>(null);
  const [teamData, setTeamData] = useState<TeamScreenData | null>(null);
  const [profileData, setProfileData] = useState<ProfileScreenData | null>(
    null
  );
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [captainDashboardData, setCaptainDashboardData] =
    useState<CaptainDashboardData | null>(null);
  const [availableTeams, setAvailableTeams] = useState<DiscoveryTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [teamsLastLoaded, setTeamsLastLoaded] = useState<number>(0);
  const [walletLoaded, setWalletLoaded] = useState(false);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [leaguesPrefetched, setLeaguesPrefetched] = useState(false);

  // ✅ ANDROID FIX: Skip redundant fetching if AuthContext already has user
  const fetchUserData = async (): Promise<UserWithWallet | null> => {
    try {
      // ✅ OPTIMIZATION: If AuthContext already loaded user, use it immediately
      if (currentUser) {
        console.log('✅ NavigationData: Using user from AuthContext (skip refetch)');
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
          const directUser = await DirectNostrProfileService.getCurrentUserProfile();
          if (directUser) return directUser as UserWithWallet;

          const fallbackUser = await DirectNostrProfileService.getFallbackProfile();
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

  const fetchUserDataFresh = async (): Promise<UserWithWallet | null> => {
    try {
      // Get user identifiers for caching
      const identifiers = await getUserNostrIdentifiers();
      const hexPubkey = identifiers?.hexPubkey || '';

      // First check if we have a user from AuthContext
      if (currentUser) {
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
      } catch (supabaseError) {}

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
    setIsLoadingTeam(true);
    try {
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers) {
        console.log('No user identifiers found for team detection');
        setIsLoadingTeam(false);
        return [];
      }

      // ✅ STALE-WHILE-REVALIDATE: Return cached teams, refresh in background
      const hexPubkey = userIdentifiers.hexPubkey || '';
      const teams = await unifiedCache.get<any[]>(
        CacheKeys.USER_TEAMS(hexPubkey),
        async () => {
          // Fetcher - builds user teams from memberships + discovered teams
          const membershipService = TeamMembershipService.getInstance();
          const localMemberships = await membershipService.getLocalMemberships(hexPubkey);

          const teamService = getNostrTeamService();
          let discoveredTeams = teamService.getDiscoveredTeams();

          // Ensure discovered teams exist
          if (discoveredTeams.size === 0) {
            await teamService.discoverFitnessTeams();
            discoveredTeams = teamService.getDiscoveredTeams();
          }

          // Initialize user teams array
          const userTeams: any[] = [];

          // 1. Get teams where user is captain
          const captainTeams = await CaptainCache.getCaptainTeams();
          console.log(`Found ${captainTeams.length} captain teams in cache`);

          for (const teamId of captainTeams) {
            const team = discoveredTeams.get(teamId);
            if (team) {
              console.log(`✅ Found captain's team: ${team.name}`);
              userTeams.push({
                id: team.id,
                name: team.name,
                description: team.description || '',
                prizePool: 0,
                memberCount: team.memberCount || 0,
                isActive: true,
                role: 'captain',
                bannerImage: team.bannerImage,
                captainId: team.captainId,
                charityId: team.charityId,
              });
            }
          }

          // 2. Get all local memberships
          console.log(`Found ${localMemberships.length} local memberships`);

          for (const membership of localMemberships) {
            // Skip if already added as captain
            if (userTeams.some((t) => t.id === membership.teamId)) {
              continue;
            }

            const team = discoveredTeams.get(membership.teamId);

            if (team) {
              const isCaptain = isTeamCaptainEnhanced(userIdentifiers, team);
              userTeams.push({
                id: team.id,
                name: team.name,
                description: team.description || '',
                prizePool: 0,
                memberCount: team.memberCount || 0,
                isActive: true,
                role: isCaptain ? 'captain' : 'member',
                bannerImage: team.bannerImage,
                captainId: team.captainId,
                charityId: team.charityId,
              });
            } else {
              // Team not in discovered teams, use membership data
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
          }

          console.log(`✅ Built ${userTeams.length} teams for user`);
          return userTeams;
        },
        {
          ttl: CacheTTL.USER_TEAMS,
          backgroundRefresh: true, // ✅ Return stale teams, refresh in background
          persist: true,
        }
      );

      console.log(`✅ getAllUserTeams: Returning ${teams?.length || 0} teams (with background refresh)`);
      setIsLoadingTeam(false);
      return teams || [];
    } catch (error) {
      console.error('Error getting all user teams:', error);
      setIsLoadingTeam(false);
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
    try {
      let realWalletBalance = user.walletBalance || 0;
      let currentTeam = undefined;
      let teams: any[] = [];
      let primaryTeamId: string | undefined = undefined;

      try {
        // Fetch all teams user is a member of (multi-team support)
        const allTeams = await getAllUserTeams(user);
        console.log(`✅ Profile: Found ${allTeams.length} team(s) for user`);

        // Filter out pending teams - only show teams where user is captain or verified member
        teams = allTeams.filter(team => team.role === 'captain' || team.role === 'member');
        console.log(`✅ Profile: Filtered to ${teams.length} verified team(s) (excluding pending)`);

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
    } catch (error) {
      console.error('Error creating profile data:', error);
    }
  };

  const loadTeams = useCallback(async (): Promise<void> => {
    // ✅ PERFORMANCE: Quick cache check first (runstr-github pattern)
    const now = Date.now();
    const timeSinceLastLoad = now - teamsLastLoaded;
    const MIN_RELOAD_INTERVAL = 60 * 1000; // 1 minute

    // ✅ OPTIMIZATION 1: Instant return if recently loaded
    if (teamsLoaded && timeSinceLastLoad < MIN_RELOAD_INTERVAL) {
      console.log('⚡ Teams recently loaded, using cached data (instant return)');
      return;
    }

    // ✅ OPTIMIZATION 2: Synchronous cache check for instant display
    const cachedTeams = unifiedCache.getCached<any[]>(CacheKeys.DISCOVERED_TEAMS);
    if (cachedTeams && cachedTeams.length > 0) {
      console.log(`⚡ Using ${cachedTeams.length} cached teams (instant display)`);
      setAvailableTeams(cachedTeams);
      setTeamsLoaded(true);
      setTeamsLastLoaded(now);

      // ✅ OPTIMIZATION 3: Background refresh if cache > 2 minutes old
      if (timeSinceLastLoad > 2 * 60 * 1000) {
        console.log('🔄 Triggering background team refresh');
        // Don't await - let it run in background
        unifiedCache.get<any[]>(
          CacheKeys.DISCOVERED_TEAMS,
          async () => {
            const teamService = getNostrTeamService();
            await teamService.discoverFitnessTeams();
            return Array.from(teamService.getDiscoveredTeams().values());
          },
          {
            ttl: CacheTTL.DISCOVERED_TEAMS,
            backgroundRefresh: true,
            persist: true,
          }
        ).then((updatedTeams) => {
          if (updatedTeams && updatedTeams.length > 0) {
            console.log(`✅ Background refresh complete: ${updatedTeams.length} teams`);
            setAvailableTeams(updatedTeams);
          }
        }).catch((err) => {
          console.warn('Background team refresh failed:', err);
        });
      }

      return; // Return immediately with cached data
    }

    // ✅ OPTIMIZATION 4: Full load only if no cache
    try {
      console.log('📡 No cache, fetching teams from Nostr...');
      const teams = await unifiedCache.get<any[]>(
        CacheKeys.DISCOVERED_TEAMS,
        async () => {
          const teamService = getNostrTeamService();
          await teamService.discoverFitnessTeams();
          return Array.from(teamService.getDiscoveredTeams().values());
        },
        {
          ttl: CacheTTL.DISCOVERED_TEAMS,
          backgroundRefresh: true,
          persist: true,
        }
      );

      console.log(`✅ Loaded ${teams?.length || 0} teams from Nostr`);
      setAvailableTeams(teams || []);
      setTeamsLoaded(true);
      setTeamsLastLoaded(now);
    } catch (error) {
      console.error('Error loading teams:', error);
      setError('Failed to load teams');
    }
  }, [teamsLoaded, teamsLastLoaded]);

  const fetchTeamsFresh = async (): Promise<any[]> => {
    try {
      // ✅ Fetch from Nostr using team service
      const teamService = getNostrTeamService();
      await teamService.discoverFitnessTeams(); // Fetches from Nostr
      const discoveredTeamsMap = teamService.getDiscoveredTeams();
      const teams = Array.from(discoveredTeamsMap.values());

      console.log(
        `✅ NavigationDataContext: Refreshed ${teams.length} teams from Nostr`
      );

      // ✅ Cache in UnifiedNostrCache
      await unifiedCache.set(
        CacheKeys.DISCOVERED_TEAMS,
        teams,
        CacheTTL.DISCOVERED_TEAMS
      );

      setAvailableTeams(teams);
      setTeamsLoaded(true);
      setTeamsLastLoaded(Date.now());

      return teams;
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
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

  const loadCaptainDashboard = useCallback(async (): Promise<void> => {
    if (!user || user.role !== 'captain') return;

    try {
      const dashboardData: CaptainDashboardData = {
        team: {
          id: 'team_default',
          name: 'Loading...',
          memberCount: 0,
          activeEvents: 0,
          activeChallenges: 0,
          prizePool: 0,
        },
        members: [],
        recentActivity: [],
      };

      setCaptainDashboardData(dashboardData);
    } catch (error) {
      console.error('Error loading captain dashboard:', error);
    }
  }, [user]);

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
        console.log('✅ Leagues already cached in UnifiedNostrCache, skipping prefetch');
        setLeaguesPrefetched(true);
        return;
      }

      // Note: Competitions are already prefetched by NostrPrefetchService in SplashInit
      // This is just a fallback check. The actual prefetching happens in:
      // src/services/nostr/NostrPrefetchService.ts -> prefetchCompetitions()

      console.log('⚠️ Competitions not in cache - should have been prefetched by SplashInit');
      setLeaguesPrefetched(true);
    } catch (error) {
      console.error('❌ Failed to prefetch leagues:', error);
      // Don't block app on prefetch failure
    }
  }, [leaguesPrefetched]);

  const refresh = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setTeamsLoaded(false);
    setWalletLoaded(false);

    try {
      const userData = await fetchUserDataFresh();
      if (userData) {
        await fetchProfileData(userData);
      }
    } catch (error) {
      console.error('Error refreshing navigation data:', error);
      setError('Failed to load app data');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ANDROID FIX: React to currentUser from AuthContext WITHOUT refetching
  useEffect(() => {
    if (currentUser && user?.id !== currentUser.id) {
      console.log(
        '✅ NavigationData: Using currentUser from AuthContext (no refetch needed)'
      );
      setUser(currentUser);
      // Always rebuild profile data when user changes (ensures avatar/bio appear immediately)
      fetchProfileData(currentUser);
    }
  }, [currentUser, user?.id]);

  // ✅ ANDROID FIX: Initial load - Skip if AuthContext already loaded user
  useEffect(() => {
    const init = async () => {
      // Skip initialization if AuthContext already loaded user
      if (currentUser) {
        console.log('✅ NavigationData: Skipping init (AuthContext already loaded user)');
        setUser(currentUser);
        setIsLoading(false);
        return;
      }

      console.log('🚀 NavigationDataProvider: Initial load from cache...');

      try {
        // Get user identifiers
        const identifiers = await getUserNostrIdentifiers();
        if (!identifiers) {
          console.warn('⚠️ NavigationDataProvider: No user identifiers');
          setIsLoading(false);
          return;
        }

        const { hexPubkey } = identifiers;

        // Read from cache (INSTANT - no fetching)
        const cachedProfile = unifiedCache.getCached(CacheKeys.USER_PROFILE(hexPubkey));
        const cachedTeams = unifiedCache.getCached(CacheKeys.USER_TEAMS(hexPubkey));
        const cachedDiscoveredTeams = unifiedCache.getCached(CacheKeys.DISCOVERED_TEAMS);
        const cachedWalletInfo = unifiedCache.getCached(CacheKeys.WALLET_INFO(hexPubkey));

        console.log('📦 NavigationDataProvider: Cache status:', {
          profile: !!cachedProfile,
          teams: cachedTeams?.length || 0,
          discoveredTeams: cachedDiscoveredTeams?.length || 0,
          wallet: !!cachedWalletInfo
        });

        // Set user from cached profile
        if (cachedProfile) {
          setUser(cachedProfile);
        }

        // Set teams from cache
        if (cachedDiscoveredTeams) {
          setAvailableTeams(cachedDiscoveredTeams);
        }

        // Build profile data from cached data
        if (cachedProfile) {
          const profileData: ProfileScreenData = {
            user: {
              id: cachedProfile.id,
              name: cachedProfile.name,
              email: cachedProfile.email || '',
              npub: cachedProfile.npub,
              avatar: cachedProfile.picture || '',
              role: cachedProfile.role || 'member',
              teamId: cachedProfile.teamId,
              createdAt: cachedProfile.createdAt,
              lastSyncAt: cachedProfile.lastSyncAt,
              bio: cachedProfile.bio,
              website: cachedProfile.website,
              picture: cachedProfile.picture,
              banner: cachedProfile.banner,
              lud16: cachedProfile.lud16,
              displayName: cachedProfile.displayName,
            },
            wallet: {
              id: 'wallet_' + cachedProfile.id,
              userId: cachedProfile.id,
              balance: cachedWalletInfo?.balance || 0,
              address: cachedProfile.lud16 || '',
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
            teams: cachedTeams || [],
            primaryTeamId: cachedTeams?.[0]?.id,
            subscription: {
              type: cachedProfile.role || 'member',
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
        }

        // UI is immediately ready - no fetching!
        setIsLoading(false);
        console.log('✅ NavigationDataProvider: Instant load complete from cache!');

        // Subscribe to cache updates for reactive data
        const unsubscribers = [
          unifiedCache.subscribe(CacheKeys.USER_PROFILE(hexPubkey), (profile) => {
            console.log('🔄 Profile updated from cache');
            setUser(profile);
          }),
          unifiedCache.subscribe(CacheKeys.USER_TEAMS(hexPubkey), (teams) => {
            console.log('🔄 Teams updated from cache');
            // Update profile data with new teams
            setProfileData(prev => prev ? { ...prev, teams } : null);
          }),
          unifiedCache.subscribe(CacheKeys.DISCOVERED_TEAMS, (teams) => {
            console.log('🔄 Discovered teams updated from cache');
            setAvailableTeams(teams);
          })
        ];

        // Cleanup subscriptions on unmount
        return () => {
          unsubscribers.forEach(unsub => unsub());
        };

      } catch (error) {
        console.error('❌ NavigationDataProvider: Init error:', error);
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const value: NavigationData = {
    user,
    teamData,
    profileData,
    walletData,
    captainDashboardData,
    availableTeams,
    isLoading,
    isLoadingTeam,
    error,
    refresh,
    loadTeams,
    loadWallet,
    loadCaptainDashboard,
    prefetchLeaguesInBackground,
  };

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
  console.log(
    '✅ useNavigationData: Context found, isLoading:',
    context.isLoading,
    'profileData:',
    !!context.profileData
  );
  return context;
};
