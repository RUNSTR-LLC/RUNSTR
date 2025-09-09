/**
 * Navigation Data Hook
 * Centralized data fetching for all navigation screens
 * Replaces mock data with real Supabase integration
 */

import { useState, useEffect } from 'react';
import { AuthService } from '../services/auth/authService';
import { TeamService } from '../services/teamService';
import { getNostrTeamService } from '../services/nostr/NostrTeamService';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';
import coinosService from '../services/coinosService';
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
}

export const useNavigationData = (): NavigationData => {
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

  const fetchUserData = async (): Promise<UserWithWallet | null> => {
    try {
      console.log('🔍 useNavigationData: Starting progressive user data loading...');
      
      // Step 1: Try to get fallback profile immediately (instant display)
      const fallbackUser = await DirectNostrProfileService.getFallbackProfile();
      if (fallbackUser) {
        console.log('🏃‍♂️ useNavigationData: Got fallback profile for immediate display');
        setUser(fallbackUser);
        setIsLoading(true); // Show "updating" indicator
      }
      
      // Step 2: Try direct Nostr profile with caching (may be instant if cached)
      try {
        const directNostrUser = await DirectNostrProfileService.getCurrentUserProfile();
        if (directNostrUser) {
          console.log('✅ useNavigationData: Got user from DirectNostrProfileService');
          setUser(directNostrUser);
          return directNostrUser;
        }
      } catch (directError) {
        console.warn('⚠️ useNavigationData: DirectNostrProfileService failed:', directError);
      }
      
      // Step 3: Fallback to Supabase-based approach for Apple/Google users
      try {
        console.log('🔄 useNavigationData: Trying Supabase fallback...');
        const userData = await AuthService.getCurrentUserWithWallet();
        if (userData) {
          console.log('✅ useNavigationData: Got user from AuthService (Supabase)');
          setUser(userData);
          return userData;
        }
      } catch (supabaseError) {
        console.warn('⚠️ useNavigationData: AuthService failed:', supabaseError);
      }
      
      // If we have fallback user, return it rather than null
      if (fallbackUser) {
        console.log('🔧 useNavigationData: Using fallback profile as final result');
        return fallbackUser;
      }
      
      console.log('❌ useNavigationData: No user found from any service');
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data');
      return null;
    }
  };

  const fetchTeamData = async (
    userId: string,
    teamId?: string
  ): Promise<void> => {
    if (!teamId) return;

    try {
      console.log('Fetching team data for team:', teamId);
      const teamScreenData = await TeamService.getTeamScreenData(teamId);

      if (teamScreenData) {
        setTeamData(teamScreenData);
        console.log('Successfully loaded team data:', teamScreenData.team.name);
      } else {
        console.warn('No team data found for team:', teamId);
        setTeamData(null);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      setError('Failed to load team data');
    }
  };

  const fetchProfileData = async (user: UserWithWallet): Promise<void> => {
    try {
      // Handle wallet balance based on user type
      let realWalletBalance = 0;

      // Regular members: use cached balance (0) since they receive payments directly to Lightning address
      if (user.role === 'member') {
        realWalletBalance = user.walletBalance || 0;
        console.log(
          `useNavigationData: Using cached balance for member: ${realWalletBalance} sats`
        );
      } else {
        // Captains: fetch real-time CoinOS wallet balance if they have credentials
        if (user.hasWalletCredentials) {
          try {
            const walletBalance = await coinosService.getWalletBalance();
            realWalletBalance = walletBalance.total;
            console.log(
              `useNavigationData: Fetched real-time wallet balance for captain: ${realWalletBalance} sats`
            );
          } catch (error) {
            console.warn(
              'useNavigationData: Failed to fetch captain wallet balance, using cached value:',
              error
            );
            realWalletBalance = user.walletBalance || 0;
          }
        } else {
          realWalletBalance = user.walletBalance || 0;
          console.log(
            `useNavigationData: Captain has no wallet credentials, using cached balance: ${realWalletBalance} sats`
          );
        }
      }

      // Fetch user's current team if they have one
      let currentTeam = null;
      if (user.teamId) {
        try {
          currentTeam = await TeamService.getUserTeam(user.id);
          console.log(
            'useNavigationData: Fetched user team:',
            currentTeam?.name || 'Team data incomplete'
          );
        } catch (error) {
          console.warn('useNavigationData: Failed to fetch user team:', error);
        }
      }

      console.log('🔍 useNavigationData: User data received:', {
        displayName: user.displayName,
        name: user.name,
        picture: user.picture ? user.picture.substring(0, 50) + '...' : 'none',
        banner: user.banner ? 'yes' : 'no', 
        bio: user.bio ? user.bio.substring(0, 50) + '...' : 'none',
        lud16: user.lud16 || 'none',
        website: user.website || 'none',
        npub: user.npub?.slice(0, 20) + '...'
      });

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
          
          // Include Nostr profile fields from ProfileService
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
          balance: realWalletBalance, // Use real-time wallet balance
          address: user.lightningAddress || '',
          transactions: [], // TODO: Implement transaction history
        },
        syncSources: [
          {
            provider: 'healthkit',
            isConnected: false,
            permissions: [],
          },
          {
            provider: 'googlefit',
            isConnected: false,
            permissions: [],
          },
        ],
        recentWorkouts: [], // Workout data will be loaded separately via WorkoutsTab
        currentTeam: currentTeam || undefined, // Use fetched team data
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
      
      console.log('📋 useNavigationData: ProfileScreen will receive:', {
        userId: profileData.user.id,
        displayName: profileData.user.displayName,
        picture: profileData.user.picture,
        banner: profileData.user.banner,
        bio: profileData.user.bio,
        lud16: profileData.user.lud16,
        website: profileData.user.website
      });
      
      setProfileData(profileData);
    } catch (error) {
      console.error('Error creating profile data:', error);
      setError('Failed to load profile data');
    }
  };

  const fetchWalletData = async (user: UserWithWallet): Promise<void> => {
    try {
      const walletData: WalletData = {
        balance: {
          sats: user.walletBalance || 0,
          usd: (user.walletBalance || 0) / 2500, // Rough BTC conversion
          connected: !!user.lightningAddress,
        },
        autoWithdraw: {
          enabled: false,
          threshold: 50000,
          lightningAddress: user.lightningAddress || '',
        },
        earnings: {
          thisWeek: {
            sats: 0,
            change: 0,
            changeType: 'positive',
          },
          thisMonth: {
            sats: user.walletBalance || 0,
            change: 0,
            changeType: 'positive',
          },
        },
        recentActivity: [], // TODO: Implement transaction history
      };
      setWalletData(walletData);
    } catch (error) {
      console.error('Error creating wallet data:', error);
      setError('Failed to load wallet data');
    }
  };

  const fetchCaptainDashboardData = async (
    user: UserWithWallet
  ): Promise<void> => {
    if (user.role !== 'captain' || !user.teamId) return;

    try {
      // TODO: Implement captain dashboard data fetching
      const captainData: CaptainDashboardData = {
        team: {
          id: user.teamId,
          name: 'Your Team',
          memberCount: 1,
          activeEvents: 0,
          activeChallenges: 0,
          prizePool: 0,
        },
        members: [],
        recentActivity: [],
      };
      setCaptainDashboardData(captainData);
    } catch (error) {
      console.error('Error fetching captain dashboard data:', error);
      setError('Failed to load captain dashboard data');
    }
  };

  const fetchAvailableTeams = async (): Promise<void> => {
    try {
      console.log('useNavigationData: Fetching teams with caching...');
      
      // First try to get cached teams (instant if available)
      const { NostrCacheService } = await import('../services/cache/NostrCacheService');
      const cachedTeams = await NostrCacheService.getCachedTeams() as DiscoveryTeam[];
      
      if (cachedTeams.length > 0) {
        console.log(`⚡ useNavigationData: Found ${cachedTeams.length} cached teams`);
        setAvailableTeams(cachedTeams);
        return; // Use cached data, background refresh will happen via preload service
      }
      
      // No cache available, fetch fresh data
      console.log('useNavigationData: No cached teams, fetching fresh...');
      const nostrTeamService = getNostrTeamService();
      const nostrTeams = await nostrTeamService.discoverFitnessTeams({
        limit: 20,
        since: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60, // Last 7 days
      });

      // Convert NostrTeam to DiscoveryTeam format
      const discoveryTeams: DiscoveryTeam[] = nostrTeams.map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        about: team.description,
        captainId: team.captainId,
        prizePool: 0, // Nostr teams don't have prize pool in the discovery phase
        memberCount: team.memberCount,
        joinReward: 0, // Will be configured later
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

      console.log(
        `useNavigationData: Found ${discoveryTeams.length} fresh teams`
      );
      
      // Cache the fresh data for future use
      await NostrCacheService.setCachedTeams(discoveryTeams);
      setAvailableTeams(discoveryTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to load teams');
    }
  };

  const refresh = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const userData = await fetchUserData();
      if (userData) {
        await Promise.all([
          fetchTeamData(userData.id, userData.teamId),
          fetchProfileData(userData),
          fetchWalletData(userData),
          fetchCaptainDashboardData(userData),
          fetchAvailableTeams(),
        ]);
      }
    } catch (error) {
      console.error('Error refreshing navigation data:', error);
      setError('Failed to load app data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    refresh();
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
  };
};
