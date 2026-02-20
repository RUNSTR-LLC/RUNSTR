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
import { getNostrTeamService } from '../services/nostr/NostrTeamService';
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
import { HARDCODED_TEAMS } from '../constants/hardcodedTeams';
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
    NostrFetchLogger.start('NavData.getAllUserTeams');
    setIsLoadingTeam(true);
    try {
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers) {
        console.log('No user identifiers found for team detection');
        setIsLoadingTeam(false);
        PerformanceLogger.end('NavigationDataContext: getAllUserTeams()');
        NostrFetchLogger.end('NavData.getAllUserTeams', 0, 'no identifiers');
        return [];
      }

      // ✅ STALE-WHILE-REVALIDATE: Return cached teams, refresh in background
      const hexPubkey = userIdentifiers.hexPubkey || '';
      const teams = await unifiedCache.get<any[]>(
        CacheKeys.USER_TEAMS(hexPubkey),
        async () => {
          // Fetcher - builds user teams from memberships + discovered teams
          const membershipService = TeamMembershipService.getInstance();

          PerformanceLogger.start('  └─ getLocalMemberships()', 1);
          const localMemberships = await membershipService.getLocalMemberships(
            hexPubkey
          );
          PerformanceLogger.end('  └─ getLocalMemberships()');

          const teamService = getNostrTeamService();
          let discoveredTeams = teamService.getDiscoveredTeams();

          // ❌ ANDROID FIX: Skip team discovery on profile load to prevent freezing
          // Teams are now built from:
          // 1. Hardcoded teams (HARDCODED_TEAMS constant)
          // 2. Local memberships (AsyncStorage)
          // 3. Captain cache
          // Team discovery (kind 33404) will happen lazily when needed
          if (discoveredTeams.size === 0) {
            console.log(
              `[${new Date().toISOString()}] 🔍 NavigationData: No discovered teams - skipping Nostr query (Android fix)`
            );
            // Don't block on team discovery - use hardcoded teams and local memberships
            // Background refresh can happen later if needed
          } else {
            console.log(
              `[${new Date().toISOString()}] 🔍 NavigationData: Already have ${
                discoveredTeams.size
              } discovered teams, skipping discovery`
            );
          }

          // Initialize user teams array
          const userTeams: any[] = [];

          // 1. Get teams where user is captain
          PerformanceLogger.start('  └─ getCaptainTeams()', 1);
          const captainTeams = await CaptainCache.getCaptainTeams();
          PerformanceLogger.end('  └─ getCaptainTeams()');
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

          // 1.5. Check hardcoded teams for captain matches (LOCAL CHECK - NO NOSTR)
          console.log(
            '[getAllUserTeams] 🔍 Checking hardcoded teams for captain matches...'
          );
          console.log(`[getAllUserTeams] 📊 User identifiers:`, {
            hexPubkey: userIdentifiers.hexPubkey?.slice(0, 20) + '...',
            npub: userIdentifiers.npub?.slice(0, 20) + '...',
          });

          let hardcodedCaptainMatches = 0;
          for (const hardcodedTeam of HARDCODED_TEAMS) {
            // Skip if already added from Captain Cache
            if (userTeams.some((t) => t.id === hardcodedTeam.id)) {
              console.log(
                `[getAllUserTeams] ⏭️  Skipping ${hardcodedTeam.name} (already in captain teams)`
              );
              continue;
            }

            // Check if user is captain (compare hex OR npub, normalized)
            const userHexMatches =
              userIdentifiers.hexPubkey?.toLowerCase().trim() ===
              hardcodedTeam.captainHex?.toLowerCase().trim();
            const userNpubMatches =
              userIdentifiers.npub?.toLowerCase().trim() ===
              hardcodedTeam.captain?.toLowerCase().trim();

            if (userHexMatches || userNpubMatches) {
              hardcodedCaptainMatches++;
              console.log(
                `[getAllUserTeams] ✅ CAPTAIN MATCH FOUND: ${hardcodedTeam.name}`
              );
              console.log(
                `[getAllUserTeams]    - Matched via: ${
                  userHexMatches ? 'HEX' : 'NPUB'
                }`
              );

              // Get team from discovered teams for full data
              const team = discoveredTeams.get(hardcodedTeam.id);
              if (team) {
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
              } else {
                // Fallback: use hardcoded team data if not in discovered teams yet
                console.log(
                  `[getAllUserTeams] ⚠️  Team not in discovered teams yet, using hardcoded data`
                );
                userTeams.push({
                  id: hardcodedTeam.id,
                  name: hardcodedTeam.name,
                  description: hardcodedTeam.description || '',
                  prizePool: 0,
                  memberCount: 0,
                  isActive: true,
                  role: 'captain',
                  bannerImage: hardcodedTeam.rawEvent?.tags?.find(
                    (t) => t[0] === 'banner'
                  )?.[1],
                  captainId: hardcodedTeam.captainHex,
                  charityId: hardcodedTeam.rawEvent?.tags?.find(
                    (t) => t[0] === 'charity'
                  )?.[1],
                });
              }
            }
          }

          console.log(
            `[getAllUserTeams] 📊 Hardcoded captain check complete: ${hardcodedCaptainMatches} matches found`
          );

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

      console.log(
        `✅ getAllUserTeams: Returning ${
          teams?.length || 0
        } teams (with background refresh)`
      );
      setIsLoadingTeam(false);
      PerformanceLogger.end('NavigationDataContext: getAllUserTeams()');
      NostrFetchLogger.end('NavData.getAllUserTeams', teams?.length || 0, 'success');
      return teams || [];
    } catch (error) {
      console.error('Error getting all user teams:', error);
      setIsLoadingTeam(false);
      PerformanceLogger.end('NavigationDataContext: getAllUserTeams()');
      NostrFetchLogger.error('NavData.getAllUserTeams', error as Error);
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

  const loadTeams = useCallback(async (): Promise<void> => {
    NostrFetchLogger.start('NavData.loadTeams');
    // ✅ PERFORMANCE: Quick cache check first (runstr-github pattern)
    const now = Date.now();
    const timeSinceLastLoad = now - teamsLastLoaded;
    const MIN_RELOAD_INTERVAL = 60 * 1000; // 1 minute

    // ✅ OPTIMIZATION 1: Instant return if recently loaded
    if (teamsLoaded && timeSinceLastLoad < MIN_RELOAD_INTERVAL) {
      console.log(
        '⚡ Teams recently loaded, using cached data (instant return)'
      );
      NostrFetchLogger.cacheHit('NavData.loadTeams', 'recently loaded');
      NostrFetchLogger.end('NavData.loadTeams', availableTeams.length, 'cached');
      return;
    }

    // ✅ OPTIMIZATION 2: Synchronous cache check for instant display
    const cachedTeams = unifiedCache.getCached<any[]>(
      CacheKeys.DISCOVERED_TEAMS
    );
    if (cachedTeams && cachedTeams.length > 0) {
      NostrFetchLogger.cacheHit('NavData.loadTeams', 'memory cache');
      console.log(
        `⚡ Using ${cachedTeams.length} cached teams (instant display)`
      );
      setAvailableTeams(cachedTeams);
      setTeamsLoaded(true);
      setTeamsLastLoaded(now);
      NostrFetchLogger.end('NavData.loadTeams', cachedTeams.length, 'from cache');

      // ✅ OPTIMIZATION 3: Background refresh if cache > 2 minutes old
      if (timeSinceLastLoad > 2 * 60 * 1000) {
        console.log('🔄 Triggering background team refresh');
        // Don't await - let it run in background
        unifiedCache
          .get<any[]>(
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
          )
          .then((updatedTeams) => {
            if (updatedTeams && updatedTeams.length > 0) {
              console.log(
                `✅ Background refresh complete: ${updatedTeams.length} teams`
              );
              setAvailableTeams(updatedTeams);
            }
          })
          .catch((err) => {
            console.warn('Background team refresh failed:', err);
          });
      }

      return; // Return immediately with cached data
    }

    // ✅ OPTIMIZATION 4: Full load only if no cache
    NostrFetchLogger.cacheMiss('NavData.loadTeams');
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
      NostrFetchLogger.end('NavData.loadTeams', teams?.length || 0, 'from Nostr');
    } catch (error) {
      console.error('Error loading teams:', error);
      setError('Failed to load teams');
      NostrFetchLogger.error('NavData.loadTeams', error as Error);
    }
  }, [teamsLoaded, teamsLastLoaded, availableTeams.length]);

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
        console.log(
          '✅ Leagues already cached in UnifiedNostrCache, skipping prefetch'
        );
        setLeaguesPrefetched(true);
        return;
      }

      // Note: Competitions are already prefetched by NostrPrefetchService in SplashInit
      // This is just a fallback check. The actual prefetching happens in:
      // src/services/nostr/NostrPrefetchService.ts -> prefetchCompetitions()

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
    setTeamsLoaded(false);
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
    }),
    [
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
  console.log(
    '✅ useNavigationData: Context found, isLoading:',
    context.isLoading,
    'profileData:',
    !!context.profileData
  );
  return context;
};
