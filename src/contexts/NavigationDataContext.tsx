/**
 * NavigationDataContext - Centralized navigation data management
 * Provides single source of truth for navigation data across all components
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthService } from '../services/auth/authService';
import { getNostrTeamService } from '../services/nostr/NostrTeamService';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';
import coinosService from '../services/coinosService';
import { appCache } from '../utils/cache';
import { CaptainCache } from '../utils/captainCache';
import { TeamMembershipService } from '../services/team/teamMembershipService';
import { isTeamCaptainEnhanced } from '../utils/teamUtils';
import { getUserNostrIdentifiers } from '../utils/nostr';
import { useAuth } from './AuthContext';
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
  error: string | null;
  refresh: () => Promise<void>;
  loadTeams: () => Promise<void>;
  loadWallet: () => Promise<void>;
  loadCaptainDashboard: () => Promise<void>;
}

const NavigationDataContext = createContext<NavigationData | undefined>(undefined);

interface NavigationDataProviderProps {
  children: ReactNode;
}

export const NavigationDataProvider: React.FC<NavigationDataProviderProps> = ({ children }) => {
  console.log('🚀 NavigationDataProvider: Initializing...');
  const { currentUser } = useAuth();
  const [user, setUser] = useState<UserWithWallet | null>(null);
  const [teamData, setTeamData] = useState<TeamScreenData | null>(null);
  const [profileData, setProfileData] = useState<ProfileScreenData | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [captainDashboardData, setCaptainDashboardData] = useState<CaptainDashboardData | null>(null);
  const [availableTeams, setAvailableTeams] = useState<DiscoveryTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [walletLoaded, setWalletLoaded] = useState(false);

  const fetchUserData = async (): Promise<UserWithWallet | null> => {
    try {
      const cachedUser = await appCache.get<UserWithWallet>('nav_user_data');
      if (cachedUser) {
        setUser(cachedUser);
        setIsLoading(false);
        fetchUserDataFresh();
        return cachedUser;
      }
      return await fetchUserDataFresh();
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data');
      return null;
    }
  };

  const fetchUserDataFresh = async (): Promise<UserWithWallet | null> => {
    try {
      // First check if we have a user from AuthContext
      if (currentUser) {
        console.log('✅ NavigationDataProvider: Using currentUser from AuthContext');
        setUser(currentUser);
        await appCache.set('nav_user_data', currentUser, 5 * 60 * 1000);
        return currentUser;
      }

      const fallbackUser = await DirectNostrProfileService.getFallbackProfile();
      if (fallbackUser) {
        setUser(fallbackUser);
      }

      try {
        const directNostrUser = await DirectNostrProfileService.getCurrentUserProfile();
        if (directNostrUser) {
          setUser(directNostrUser);
          await appCache.set('nav_user_data', directNostrUser, 5 * 60 * 1000);
          return directNostrUser;
        }
      } catch (directError) {}

      try {
        const userData = await AuthService.getCurrentUserWithWallet();
        if (userData) {
          setUser(userData);
          await appCache.set('nav_user_data', userData, 5 * 60 * 1000);
          return userData;
        }
      } catch (supabaseError) {}

      if (fallbackUser) {
        await appCache.set('nav_user_data', fallbackUser, 5 * 60 * 1000);
        return fallbackUser;
      }

      return null;
    } catch (error) {
      console.error('Error fetching fresh user data:', error);
      return null;
    }
  };

  const getUserTeamFromCache = async (user: UserWithWallet): Promise<any> => {
    try {
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers) {
        console.log('No user identifiers found for team detection');
        return null;
      }

      const captainTeams = await CaptainCache.getCaptainTeams();
      console.log(`Found ${captainTeams.length} captain teams in cache`);

      if (captainTeams.length > 0) {
        const teamService = getNostrTeamService();
        const discoveredTeams = teamService.getDiscoveredTeams();

        for (const teamId of captainTeams) {
          const team = discoveredTeams.get(teamId);
          if (team) {
            console.log(`✅ Found captain's team from cache: ${team.name}`);
            return {
              id: team.id,
              name: team.name,
              description: team.description || '',
              prizePool: 0,
              memberCount: team.memberCount || 0,
              isActive: true,
              role: 'captain',
            };
          }
        }
      }

      const membershipService = TeamMembershipService.getInstance();
      const localMemberships = await membershipService.getLocalMemberships(
        userIdentifiers.hexPubkey || userIdentifiers.npub || ''
      );

      if (localMemberships.length > 0) {
        const membership = localMemberships[0];
        console.log(`✅ Found local membership: ${membership.teamName}`);

        const teamService = getNostrTeamService();
        const discoveredTeams = teamService.getDiscoveredTeams();
        const team = discoveredTeams.get(membership.teamId);

        if (team) {
          const isCaptain = isTeamCaptainEnhanced(userIdentifiers, team);
          return {
            id: team.id,
            name: team.name,
            description: team.description || '',
            prizePool: 0,
            memberCount: team.memberCount || 0,
            isActive: true,
            role: isCaptain ? 'captain' : 'member',
          };
        }

        return {
          id: membership.teamId,
          name: membership.teamName,
          description: '',
          prizePool: 0,
          memberCount: 0,
          isActive: true,
          role: membership.status === 'official' ? 'member' : 'pending',
        };
      }

      const teamService = getNostrTeamService();
      const discoveredTeams = teamService.getDiscoveredTeams();

      for (const [teamId, team] of discoveredTeams) {
        const isCaptain = isTeamCaptainEnhanced(userIdentifiers, team);
        if (isCaptain) {
          console.log(`✅ Found team where user is captain: ${team.name}`);
          await CaptainCache.setCaptainStatus(teamId, true);
          return {
            id: team.id,
            name: team.name,
            description: team.description || '',
            prizePool: 0,
            memberCount: team.memberCount || 0,
            isActive: true,
            role: 'captain',
          };
        }
      }

      console.log('No team found for user in any data source');
      return null;
    } catch (error) {
      console.error('Error getting user team from cache:', error);
      return null;
    }
  };

  const fetchProfileData = async (user: UserWithWallet): Promise<void> => {
    try {
      let realWalletBalance = user.walletBalance || 0;
      let currentTeam = undefined;

      try {
        currentTeam = await getUserTeamFromCache(user);
        if (currentTeam) {
          console.log(`✅ Profile: Found user's team - ${currentTeam.name} (${currentTeam.role})`);
        } else {
          console.log('ℹ️ Profile: User has no team membership');
        }
      } catch (teamError) {
        console.log('Could not fetch user team:', teamError);
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
        currentTeam,
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
    if (teamsLoaded) return;

    try {
      const cachedTeams = await appCache.get<DiscoveryTeam[]>('available_teams');
      if (cachedTeams) {
        setAvailableTeams(cachedTeams);
        setTeamsLoaded(true);
        fetchTeamsFresh();
        return;
      }

      await fetchTeamsFresh();
    } catch (error) {
      console.error('Error loading teams:', error);
      setError('Failed to load teams');
    }
  }, [teamsLoaded]);

  const fetchTeamsFresh = async (): Promise<void> => {
    try {
      const nostrTeamService = getNostrTeamService();
      const nostrTeams = await nostrTeamService.discoverFitnessTeams({
        limit: 20,
      });

      const discoveryTeams: DiscoveryTeam[] = nostrTeams.map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        about: team.description,
        captainId: team.captainId,
        prizePool: 0,
        memberCount: team.memberCount,
        joinReward: 0,
        exitFee: 0,
        isActive: team.isPublic,
        avatar: '',
        createdAt: new Date(team.createdAt * 1000).toISOString(),
        difficulty: 'intermediate' as const,
        stats: {
          memberCount: team.memberCount,
          avgPace: 'N/A',
          activeEvents: 0,
          activeChallenges: 0,
        },
        recentActivities: [],
        recentPayout: undefined,
        isFeatured: false,
      }));

      setAvailableTeams(discoveryTeams);
      setTeamsLoaded(true);
      await appCache.set('available_teams', discoveryTeams, 5 * 60 * 1000);
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
          const walletBalance = await coinosService.getWalletBalance();
          realWalletBalance = walletBalance.total;
        } catch (error) {
          realWalletBalance = user.walletBalance || 0;
        }
      }

      const walletData: WalletData = {
        balance: {
          sats: realWalletBalance,
          usd: realWalletBalance / 2500,
          connected: !!user.lightningAddress,
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

  // React to changes in currentUser from AuthContext
  useEffect(() => {
    if (currentUser) {
      console.log('🚀 NavigationDataProvider: currentUser changed in AuthContext, refreshing data...');
      setUser(currentUser);
      fetchProfileData(currentUser);
    }
  }, [currentUser]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      console.log('🚀 NavigationDataProvider: Starting initial data load...');
      const userData = await fetchUserData();
      console.log('🚀 NavigationDataProvider: User data loaded:', !!userData);
      if (userData) {
        await Promise.all([
          fetchProfileData(userData),
          loadTeams()
        ]);
      }
      setIsLoading(false);
      console.log('🚀 NavigationDataProvider: Initial load complete, isLoading:', false);
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
    error,
    refresh,
    loadTeams,
    loadWallet,
    loadCaptainDashboard,
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
    console.error('❌ useNavigationData: Context is undefined! Make sure NavigationDataProvider is wrapping the component');
    throw new Error('useNavigationData must be used within a NavigationDataProvider');
  }
  console.log('✅ useNavigationData: Context found, isLoading:', context.isLoading, 'profileData:', !!context.profileData);
  return context;
};