/**
 * Navigation Data Hook - OPTIMIZED
 * Lazy-loads data per tab/screen for fast startup
 */

import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/auth/authService';
import { getNostrTeamService } from '../services/nostr/NostrTeamService';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';
import coinosService from '../services/coinosService';
import { appCache } from '../utils/cache';
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
  // New lazy-load methods
  loadTeams: () => Promise<void>;
  loadWallet: () => Promise<void>;
  loadCaptainDashboard: () => Promise<void>;
}

export const useNavigationData = (): NavigationData => {
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
      // Try cache first for instant load
      const cachedUser = await appCache.get<UserWithWallet>('nav_user_data');
      if (cachedUser) {
        setUser(cachedUser);
        setIsLoading(false);
        // Refresh in background
        fetchUserDataFresh();
        return cachedUser;
      }

      // No cache, fetch fresh
      return await fetchUserDataFresh();
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data');
      return null;
    }
  };

  const fetchUserDataFresh = async (): Promise<UserWithWallet | null> => {
    try {
      // Step 1: Try fallback profile (instant)
      const fallbackUser = await DirectNostrProfileService.getFallbackProfile();
      if (fallbackUser) {
        setUser(fallbackUser);
        // Don't set loading false yet - we're still fetching
      }

      // Step 2: Try direct Nostr profile
      try {
        const directNostrUser = await DirectNostrProfileService.getCurrentUserProfile();
        if (directNostrUser) {
          setUser(directNostrUser);
          await appCache.set('nav_user_data', directNostrUser, 5 * 60 * 1000);
          return directNostrUser;
        }
      } catch (directError) {
        // Silent fail, try next method
      }

      // Step 3: Fallback to AuthService
      try {
        const userData = await AuthService.getCurrentUserWithWallet();
        if (userData) {
          setUser(userData);
          await appCache.set('nav_user_data', userData, 5 * 60 * 1000);
          return userData;
        }
      } catch (supabaseError) {
        // Silent fail
      }

      // Return fallback if we have it
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

  const fetchProfileData = async (user: UserWithWallet): Promise<void> => {
    try {
      // For members, use cached balance (no real-time fetch needed)
      let realWalletBalance = user.walletBalance || 0;

      // Fetch user's current team membership
      let currentTeam = undefined;
      try {
        const teamService = getNostrTeamService();
        // Get user's teams from Nostr
        const userTeams = await teamService.getUserTeams(user.npub);

        if (userTeams && userTeams.length > 0) {
          // Use the first team as current team
          const team = userTeams[0];
          currentTeam = {
            id: team.id,
            name: team.name,
            description: team.description || '',
            prizePool: team.prizePool || 0,
            memberCount: team.memberCount || 0,
            isActive: true,
            role: team.captainPubkey === user.npub ? 'captain' : 'member',
          };
        }
      } catch (teamError) {
        console.log('Could not fetch user teams:', teamError);
        // Continue without team data
      }

      // Build profile data without heavy operations
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
        recentWorkouts: [], // Loaded separately by WorkoutsTab
        currentTeam, // Now populated with real team data
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
      // Check cache first
      const cachedTeams = await appCache.get<DiscoveryTeam[]>('available_teams');
      if (cachedTeams) {
        setAvailableTeams(cachedTeams);
        setTeamsLoaded(true);
        // Refresh in background
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
        limit: 20, // Reduced from 50 for faster load
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

      // Cache for 5 minutes
      await appCache.set('available_teams', discoveryTeams, 5 * 60 * 1000);
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  };

  const loadWallet = useCallback(async (): Promise<void> => {
    if (walletLoaded || !user) return;

    try {
      // Only fetch real-time balance for captains
      let realWalletBalance = user.walletBalance || 0;

      if (user.role === 'captain' && user.hasWalletCredentials) {
        try {
          const walletBalance = await coinosService.getWalletBalance();
          realWalletBalance = walletBalance.total;
        } catch (error) {
          // Use cached balance on error
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

  // Initial load - only user and profile data
  useEffect(() => {
    const init = async () => {
      const userData = await fetchUserData();
      if (userData) {
        await fetchProfileData(userData);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  return {
    user,
    teamData,
    profileData,
    walletData,
    captainDashboardData,
    availableTeams,
    isLoading,
    error,
    refresh,
    // Lazy load methods
    loadTeams,
    loadWallet,
    loadCaptainDashboard,
  };
};