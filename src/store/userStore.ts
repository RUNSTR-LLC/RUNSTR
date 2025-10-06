/**
 * RUNSTR User Store
 * Zustand store for user state management including team membership and preferences
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ProfileService, type UserProfile } from '../services/user/profileService';
import { TeamMembershipService, type TeamSwitchResult } from '../services/team/teamMembershipService';
import { AuthService } from '../services/auth/authService';
import { TeamMatchingAlgorithm } from '../utils/teamMatching';
import type {
  DiscoveryTeam,
  TeamMatch,
  Workout,
  UserPreferences,
  UserFitnessProfile,
} from '../types';

interface UserStoreState {
  // User Data
  user: UserProfile | null;
  isLoadingUser: boolean;
  userError: string | null;

  // Team Discovery & Recommendations
  recommendedTeams: TeamMatch[];
  isLoadingRecommendations: boolean;
  recommendationsError: string | null;

  // Team Switching
  switchCooldown: {
    isActive: boolean;
    endsAt?: string;
    hoursRemaining?: number;
  };
  isSwitchingTeams: boolean;
  switchError: string | null;

  // Fitness Profile
  fitnessProfile: UserFitnessProfile | null;
  fitnessImprovement: {
    improvement: number;
    trend: 'improving' | 'stable' | 'declining';
    metrics: {
      paceImprovement?: number;
      distanceIncrease?: number;
      consistencyChange?: number;
    };
  } | null;

  // Participation Stats
  participationStats: {
    totalEvents: number;
    eventsWon: number;
    totalChallenges: number;
    challengesWon: number;
    totalEarnings: number;
    currentStreak: number;
    winRate: number;
  } | null;

  // Actions
  loadUser: (userId: string) => Promise<void>;
  updateUserPreferences: (
    preferences: Partial<UserPreferences>
  ) => Promise<void>;
  loadRecommendedTeams: (availableTeams: DiscoveryTeam[]) => Promise<void>;
  switchTeams: (
    fromTeamId: string,
    toTeamId: string
  ) => Promise<TeamSwitchResult>;
  loadSwitchCooldown: () => Promise<void>;
  loadFitnessImprovement: (days?: number) => Promise<void>;
  loadParticipationStats: () => Promise<void>;
  updateFitnessProfile: (workouts: Workout[]) => void;
  initializeForTeamDiscovery: (basicInfo: {
    experienceLevel: UserPreferences['experienceLevel'];
    primaryGoal: UserPreferences['primaryGoal'];
    timeCommitment: UserPreferences['timeCommitment'];
  }) => Promise<void>;

  // Helpers
  clearErrors: () => void;
  reset: () => void;
  signOut: () => Promise<void>;
}

export const useUserStore = create<UserStoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    user: null,
    isLoadingUser: false,
    userError: null,
    recommendedTeams: [],
    isLoadingRecommendations: false,
    recommendationsError: null,
    switchCooldown: { isActive: false },
    isSwitchingTeams: false,
    switchError: null,
    fitnessProfile: null,
    fitnessImprovement: null,
    participationStats: null,

    // Actions
    loadUser: async (userId: string) => {
      set({ isLoadingUser: true, userError: null });

      try {
        console.log('🔍 UserStore: Loading user with pure Nostr profile service...');
        
        // Use DirectNostrProfileService instead of legacy UserService
        const { DirectNostrProfileService } = await import('../services/user/directNostrProfileService');
        const directUser = await DirectNostrProfileService.getCurrentUserProfile();

        if (directUser) {
          // Convert DirectNostrUser to UserProfile format for store compatibility
          const userProfile = {
            id: directUser.id,
            name: directUser.name,
            email: directUser.email,
            npub: directUser.npub,
            role: directUser.role,
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
            // Default empty values for store compatibility
            preferences: undefined,
            fitnessProfile: undefined,
            teamJoinedAt: undefined,
            teamSwitchCooldownUntil: undefined,
          };

          console.log('✅ UserStore: Loaded pure Nostr user profile:', userProfile.name);

          set({
            user: userProfile,
            fitnessProfile: userProfile.fitnessProfile || undefined,
          });

          // Skip additional data loading for now to avoid more Supabase calls
          console.log('ℹ️  UserStore: Skipping additional data loading to avoid legacy service calls');
          
        } else {
          set({ userError: 'Failed to load user profile from Nostr' });
        }
      } catch (error) {
        console.error('❌ UserStore: Error loading user with pure Nostr:', error);
        set({ userError: 'Failed to load user data from Nostr' });
      } finally {
        set({ isLoadingUser: false });
      }
    },

    updateUserPreferences: async (preferences: Partial<UserPreferences>) => {
      const user = get().user;
      if (!user) return;

      set({ isLoadingUser: true, userError: null });

      try {
        const result = await ProfileService.updateUserPreferences(
          user.id,
          preferences
        );

        if (result.success) {
          // Update local state
          set({
            user: {
              ...user,
              preferences: {
                ...user.preferences,
                ...preferences,
              } as UserPreferences,
            },
          });

          // Reload recommendations if they exist
          if (get().recommendedTeams.length > 0) {
            // This would need access to available teams - handled by parent component
          }
        } else {
          set({ userError: result.error || 'Failed to update preferences' });
        }
      } catch (error) {
        console.error('Error updating preferences:', error);
        set({ userError: 'Failed to update preferences' });
      } finally {
        set({ isLoadingUser: false });
      }
    },

    loadRecommendedTeams: async (availableTeams: DiscoveryTeam[]) => {
      const user = get().user;
      if (!user) return;

      set({ isLoadingRecommendations: true, recommendationsError: null });

      try {
        const recommendations = await TeamMembershipService.getRecommendedTeams(user.id);

        set({ recommendedTeams: recommendations });
      } catch (error) {
        console.error('Error loading recommendations:', error);
        set({ recommendationsError: 'Failed to load team recommendations' });
      } finally {
        set({ isLoadingRecommendations: false });
      }
    },

    switchTeams: async (
      fromTeamId: string,
      toTeamId: string
    ): Promise<TeamSwitchResult> => {
      const user = get().user;
      if (!user) {
        return { success: false, error: 'User not loaded' };
      }

      set({ isSwitchingTeams: true, switchError: null });

      try {
        const result = await TeamMembershipService.switchTeams(
          user.id,
          toTeamId
        );

        if (result.success) {
          // Update user's team info
          set({
            user: {
              ...user,
              teamId: toTeamId,
              teamJoinedAt: new Date().toISOString(),
              teamSwitchCooldownUntil: result.cooldownUntil,
            },
          });

          // Update cooldown info
          await get().loadSwitchCooldown();
        } else {
          set({ switchError: result.error || 'Failed to switch teams' });
        }

        return result;
      } catch (error) {
        console.error('Error switching teams:', error);
        const errorResult = { success: false, error: 'Failed to switch teams' };
        set({ switchError: errorResult.error });
        return errorResult;
      } finally {
        set({ isSwitchingTeams: false });
      }
    },

    loadSwitchCooldown: async () => {
      const user = get().user;
      if (!user) return;

      try {
        const cooldownInfo = await TeamMembershipService.getTeamSwitchCooldown(user.id);
        set({ switchCooldown: cooldownInfo });
      } catch (error) {
        console.error('Error loading switch cooldown:', error);
      }
    },

    loadFitnessImprovement: async (days: number = 30) => {
      const user = get().user;
      if (!user) return;

      try {
        // TODO: Implement calculateFitnessImprovement in ProfileService
        // For now, use placeholder data
        const improvement = 0;
        set({
          fitnessImprovement: {
            improvement,
            trend: 'stable',
            metrics: {},
          },
        });
      } catch (error) {
        console.error('Error loading fitness improvement:', error);
      }
    },

    loadParticipationStats: async () => {
      const user = get().user;
      if (!user) return;

      try {
        const stats = await TeamMembershipService.getTeamParticipationStats(user.id);
        set({ participationStats: stats });
      } catch (error) {
        console.error('Error loading participation stats:', error);
      }
    },

    updateFitnessProfile: (workouts: Workout[]) => {
      const newProfile = TeamMatchingAlgorithm.generateFitnessProfile(workouts);
      set({ fitnessProfile: newProfile });

      // Update user profile
      const user = get().user;
      if (user) {
        set({
          user: {
            ...user,
            fitnessProfile: newProfile,
          },
        });
      }
    },

    initializeForTeamDiscovery: async (basicInfo) => {
      const user = get().user;
      if (!user) return;

      set({ isLoadingUser: true, userError: null });

      try {
        const result = await TeamMembershipService.initializeUserForTeamDiscovery(
          user.id,
          basicInfo
        );

        if (result.success) {
          // Reload user to get updated preferences
          await get().loadUser(user.id);
        } else {
          set({ userError: result.error || 'Failed to initialize user' });
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        set({ userError: 'Failed to initialize user for team discovery' });
      } finally {
        set({ isLoadingUser: false });
      }
    },

    clearErrors: () => {
      set({
        userError: null,
        recommendationsError: null,
        switchError: null,
      });
    },

    reset: () => {
      set({
        user: null,
        isLoadingUser: false,
        userError: null,
        recommendedTeams: [],
        isLoadingRecommendations: false,
        recommendationsError: null,
        switchCooldown: { isActive: false },
        isSwitchingTeams: false,
        switchError: null,
        fitnessProfile: null,
        fitnessImprovement: null,
        participationStats: null,
      });
    },

    signOut: async () => {
      try {
        await AuthService.signOut();
        // Clear all user state after successful sign out
        get().reset();
      } catch (error) {
        console.error('Error during sign out:', error);
        set({ userError: 'Failed to sign out' });
      }
    },
  }))
);

// Utility hooks for specific functionality
export const useUserProfile = () => {
  const store = useUserStore();
  return {
    user: store.user,
    isLoading: store.isLoadingUser,
    error: store.userError,
    loadUser: store.loadUser,
    updatePreferences: store.updateUserPreferences,
    clearErrors: store.clearErrors,
  };
};

export const useTeamRecommendations = () => {
  const store = useUserStore();
  return {
    recommendations: store.recommendedTeams,
    isLoading: store.isLoadingRecommendations,
    error: store.recommendationsError,
    loadRecommendations: store.loadRecommendedTeams,
  };
};

export const useTeamSwitching = () => {
  const store = useUserStore();
  return {
    cooldown: store.switchCooldown,
    isSwitching: store.isSwitchingTeams,
    error: store.switchError,
    switchTeams: store.switchTeams,
    loadCooldown: store.loadSwitchCooldown,
    canSwitch: !store.switchCooldown.isActive,
  };
};

export const useFitnessProfile = () => {
  const store = useUserStore();
  return {
    profile: store.fitnessProfile,
    improvement: store.fitnessImprovement,
    participationStats: store.participationStats,
    updateProfile: store.updateFitnessProfile,
    loadImprovement: store.loadFitnessImprovement,
    loadStats: store.loadParticipationStats,
  };
};

export const useUserInitialization = () => {
  const store = useUserStore();
  return {
    user: store.user,
    isLoading: store.isLoadingUser,
    error: store.userError,
    initializeForDiscovery: store.initializeForTeamDiscovery,
    hasPreferences: !!store.user?.preferences,
    isNewUser: !store.user?.teamId && !store.user?.preferences,
  };
};

export const useUserAuth = () => {
  const store = useUserStore();
  return {
    user: store.user,
    isLoading: store.isLoadingUser,
    error: store.userError,
    signOut: store.signOut,
    clearErrors: store.clearErrors,
  };
};

// Subscribe to user changes for analytics/logging
if (typeof window !== 'undefined') {
  useUserStore.subscribe(
    (state) => state.user,
    (user, prevUser) => {
      if (user && !prevUser) {
        console.log('User loaded:', { id: user.id, teamId: user.teamId });
      } else if (user && prevUser && user.teamId !== prevUser.teamId) {
        console.log('Team changed:', {
          from: prevUser.teamId,
          to: user.teamId,
        });
      }
    }
  );
}

export default useUserStore;
