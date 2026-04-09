/**
 * RUNSTR User Store
 * Zustand store for user state management
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ProfileService,
  type UserProfile,
} from '../services/user/profileService';
import { AuthService } from '../services/auth/authService';
import { TeamMatchingAlgorithm } from '../utils/teamMatching';
import type {
  Workout,
  UserPreferences,
  UserFitnessProfile,
} from '../types';

/** Storage key for persisted user store data */
const USER_STORE_KEY = '@runstr:user-store';

/** Current schema version — bump when persisted shape changes */
const USER_STORE_VERSION = 1;

/** Fields that get persisted to AsyncStorage */
type PersistedUserState = {
  user: UserProfile | null;
  fitnessProfile: UserFitnessProfile | null;
};

interface UserStoreState {
  // Hydration flag — true once persisted data has been loaded from AsyncStorage
  _hasHydrated: boolean;

  // User Data
  user: UserProfile | null;
  isLoadingUser: boolean;
  userError: string | null;

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

  // Actions
  loadUser: (userId: string) => Promise<void>;
  updateUserPreferences: (
    preferences: Partial<UserPreferences>
  ) => Promise<void>;
  loadFitnessImprovement: (days?: number) => Promise<void>;
  updateFitnessProfile: (workouts: Workout[]) => void;

  // Helpers
  clearErrors: () => void;
  reset: () => void;
  signOut: () => Promise<void>;
}

export const useUserStore = create<UserStoreState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
    // Initial State
    _hasHydrated: false,
    user: null,
    isLoadingUser: false,
    userError: null,
    fitnessProfile: null,
    fitnessImprovement: null,

    // Actions
    loadUser: async (userId: string) => {
      set({ isLoadingUser: true, userError: null });

      try {
        console.log(
          '🔍 UserStore: Loading user with pure Nostr profile service...'
        );

        // Use DirectNostrProfileService instead of legacy UserService
        const { DirectNostrProfileService } = await import(
          '../services/user/directNostrProfileService'
        );
        const directUser =
          await DirectNostrProfileService.getCurrentUserProfile();

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

          console.log(
            '✅ UserStore: Loaded pure Nostr user profile:',
            userProfile.name
          );

          set({
            user: userProfile,
            fitnessProfile: userProfile.fitnessProfile || undefined,
          });
        } else {
          set({ userError: 'Failed to load user profile from Nostr' });
        }
      } catch (error) {
        console.error(
          '❌ UserStore: Error loading user with pure Nostr:',
          error
        );
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
          set({
            user: {
              ...user,
              preferences: {
                ...user.preferences,
                ...preferences,
              } as UserPreferences,
            },
          });
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

    loadFitnessImprovement: async (days: number = 30) => {
      const user = get().user;
      if (!user) return;

      try {
        // TODO: Implement calculateFitnessImprovement in ProfileService
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

    updateFitnessProfile: (workouts: Workout[]) => {
      const newProfile = TeamMatchingAlgorithm.generateFitnessProfile(workouts);
      set({ fitnessProfile: newProfile });

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

    clearErrors: () => {
      set({
        userError: null,
      });
    },

    reset: () => {
      set({
        user: null,
        isLoadingUser: false,
        userError: null,
        fitnessProfile: null,
        fitnessImprovement: null,
      });
      // Clear persisted data so next launch starts fresh
      AsyncStorage.removeItem(USER_STORE_KEY).catch((err) =>
        console.warn('[UserStore] Failed to clear persisted data:', err)
      );
    },

    signOut: async () => {
      try {
        await AuthService.signOut();
        get().reset();
      } catch (error) {
        console.error('Error during sign out:', error);
        set({ userError: 'Failed to sign out' });
      }
    },
  }),
      // persist middleware options
      {
        name: USER_STORE_KEY,
        version: USER_STORE_VERSION,
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state): PersistedUserState => ({
          user: state.user,
          fitnessProfile: state.fitnessProfile,
        }),
        onRehydrateStorage: () => {
          console.log('[UserStore] Hydrating from AsyncStorage...');
          return (state, error) => {
            if (error) {
              console.warn('[UserStore] Hydration failed:', error);
            } else {
              console.log(
                '[UserStore] Hydrated successfully:',
                state?.user?.name ?? 'no user cached'
              );
            }
            useUserStore.setState({ _hasHydrated: true });
          };
        },
      },
    )
  )
);

// Utility hooks
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

export const useFitnessProfile = () => {
  const store = useUserStore();
  return {
    profile: store.fitnessProfile,
    improvement: store.fitnessImprovement,
    updateProfile: store.updateFitnessProfile,
    loadImprovement: store.loadFitnessImprovement,
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

/** Returns true once persisted data has been loaded from AsyncStorage */
export const useUserStoreHydrated = () =>
  useUserStore((state) => state._hasHydrated);

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
