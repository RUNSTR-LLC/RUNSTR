/**
 * Navigation Data Hook - OPTIMIZED
 * Lazy-loads data per tab/screen for fast startup
 * Uses Supabase for clubs/teams (no Nostr relay queries)
 */

import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/auth/authService';
import { DirectNostrProfileService } from '../services/user/directNostrProfileService';
import { appCache } from '../utils/cache';
import { CaptainCache } from '../utils/captainCache';
import { TeamMembershipService } from '../services/team/teamMembershipService';
import { getUserNostrIdentifiers } from '../utils/nostr';
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
  error: string | null;
  refresh: () => Promise<void>;
  loadWallet: () => Promise<void>;
}

export const useNavigationData = (): NavigationData => {
  const [user, setUser] = useState<UserWithWallet | null>(null);
  const [teamData, setTeamData] = useState<TeamScreenData | null>(null);
  const [profileData, setProfileData] = useState<ProfileScreenData | null>(
    null
  );
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      }

      // Step 2: Try direct Nostr profile
      try {
        const directNostrUser =
          await DirectNostrProfileService.getCurrentUserProfile();
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
      } catch (fetchError) {
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

  /**
   * Get user's team from local cache (no Nostr relay queries)
   */
  const getUserTeamFromCache = async (user: UserWithWallet): Promise<any> => {
    try {
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers) {
        console.log('No user identifiers found for team detection');
        return null;
      }

      // 1. Check CaptainCache for captain teams
      const captainTeams = await CaptainCache.getCaptainTeams();
      if (captainTeams.length > 0) {
        return {
          id: captainTeams[0],
          name: 'Team',
          description: '',
          prizePool: 0,
          memberCount: 0,
          isActive: true,
          role: 'captain',
        };
      }

      // 2. Check TeamMembershipService for local memberships
      const membershipService = TeamMembershipService.getInstance();
      const localMemberships = await membershipService.getLocalMemberships(
        userIdentifiers.hexPubkey || userIdentifiers.npub || ''
      );

      if (localMemberships.length > 0) {
        const membership = localMemberships[0];
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
          console.log(
            `✅ Profile: Found user's team - ${currentTeam.name} (${currentTeam.role})`
          );
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

  const loadWallet = useCallback(async (): Promise<void> => {
    if (walletLoaded || !user) return;

    try {
      let realWalletBalance = user.walletBalance || 0;

      if (user.role === 'captain' && user.hasWalletCredentials) {
        try {
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

  const refresh = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
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

  // Initial load
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
    isLoading,
    error,
    refresh,
    loadWallet,
  };
};
