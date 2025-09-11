/**
 * RUNSTR Team Discovery Store
 * Zustand store for team discovery state management
 */

import { create } from 'zustand';
// Disabled Supabase import to prevent bundle failure
// import { RealtimeChannel } from '@supabase/supabase-js';
// Disabled TeamService import to prevent bundle failure
// import { TeamService } from '../services/teamService';
import type {
  TeamDiscoveryState,
  DiscoveryTeam,
  TeamSearchFilters,
  TeamJoinResult,
} from '../types';

interface TeamStoreState extends TeamDiscoveryState {
  // Real-time subscription (disabled to prevent bundle failure)
  subscription: any | null;
  setSubscription: (subscription: any | null) => void;

  // Internal helpers
  _setLoading: (loading: boolean) => void;
  _setJoining: (joining: boolean) => void;
  _setError: (error: string | null) => void;
  _setTeams: (teams: DiscoveryTeam[]) => void;
  _setUserTeam: (team: DiscoveryTeam | null) => void;
}

export const useTeamStore = create<TeamStoreState>((set: any, get: any) => ({
  // Initial State
  teams: [],
  featuredTeams: [],
  userTeam: null,
  isLoading: false,
  isJoining: false,
  error: null,
  selectedTeam: null,
  searchFilters: {},
  subscription: null,

  // Actions
  loadTeams: async () => {
    set({ isLoading: true, error: null });

    try {
      // TODO: Replace with Nostr team discovery
      console.warn('TeamStore: getTeamsForDiscovery disabled - needs Nostr implementation');
      const teams: DiscoveryTeam[] = [];
      const featuredTeams = teams.filter((team) => team.isFeatured);

      set({
        teams,
        featuredTeams,
        isLoading: false,
      });

      // Set up real-time subscription if not already active
      const currentSubscription = get().subscription;
      if (!currentSubscription) {
        // TODO: Replace with Nostr team subscription
        console.warn('TeamStore: subscribeToTeamUpdates disabled');
        const subscription = null; // TODO: TeamService.subscribeToTeamUpdates(callback)
        set({ subscription });
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      set({
        error: 'Failed to load teams. Please try again.',
        isLoading: false,
      });
    }
  },

  searchTeams: async (filters: TeamSearchFilters) => {
    set({ isLoading: true, error: null, searchFilters: filters });

    try {
      // TODO: Replace with Nostr team search
      console.warn('TeamStore: searchTeams disabled');
      const teams: DiscoveryTeam[] = []; // TODO: await TeamService.searchTeams(filters.query || '', filters.difficulty)

      // Apply additional filters
      let filteredTeams = teams;

      if (filters.minPrizePool) {
        filteredTeams = filteredTeams.filter(
          (team) => team.prizePool >= filters.minPrizePool!
        );
      }

      if (filters.maxMembers) {
        filteredTeams = filteredTeams.filter(
          (team) => team.memberCount <= filters.maxMembers!
        );
      }

      set({
        teams: filteredTeams,
        featuredTeams: filteredTeams.filter((team) => team.isFeatured),
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to search teams:', error);
      set({
        error: 'Failed to search teams. Please try again.',
        isLoading: false,
      });
    }
  },

  joinTeam: async (teamId: string, userId: string): Promise<TeamJoinResult> => {
    set({ isJoining: true, error: null });

    try {
      // TODO: Replace with Nostr team joining
      console.warn('TeamStore: joinTeam disabled');
      const result = { success: false, error: 'Not implemented' }; // await TeamService.joinTeam(teamId, userId);

      if (result.success) {
        // Update user's team in store
        const team = get().teams.find((t: DiscoveryTeam) => t.id === teamId);
        if (team) {
          set({ userTeam: team });
        }

        // Refresh teams to update member count
        await get().loadTeams();
      } else {
        set({ error: result.error || 'Failed to join team' });
      }

      set({ isJoining: false });
      return result;
    } catch (error) {
      console.error('Failed to join team:', error);
      const errorResult = { success: false, error: 'Failed to join team' };
      set({
        error: errorResult.error,
        isJoining: false,
      });
      return errorResult;
    }
  },

  leaveTeam: async (userId: string): Promise<TeamJoinResult> => {
    set({ isJoining: true, error: null });

    try {
      // TODO: Replace with Nostr team leaving
      console.warn('TeamStore: leaveTeam disabled');
      const result = { success: false, error: 'Not implemented' }; // await TeamService.leaveTeam(userId);

      if (result.success) {
        set({ userTeam: null });
        // Refresh teams to update member count
        await get().loadTeams();
      } else {
        set({ error: result.error || 'Failed to leave team' });
      }

      set({ isJoining: false });
      return result;
    } catch (error) {
      console.error('Failed to leave team:', error);
      const errorResult = { success: false, error: 'Failed to leave team' };
      set({
        error: errorResult.error,
        isJoining: false,
      });
      return errorResult;
    }
  },

  selectTeam: (team: DiscoveryTeam | null) => {
    set({ selectedTeam: team });
  },

  setSearchFilters: (filters: TeamSearchFilters) => {
    set({ searchFilters: filters });
  },

  clearError: () => {
    set({ error: null });
  },

  // Internal helpers
  setSubscription: (subscription: RealtimeChannel | null) => {
    // Clean up existing subscription
    const currentSubscription = get().subscription;
    if (currentSubscription) {
      currentSubscription.unsubscribe();
    }
    set({ subscription });
  },

  _setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  _setJoining: (joining: boolean) => {
    set({ isJoining: joining });
  },

  _setError: (error: string | null) => {
    set({ error });
  },

  _setTeams: (teams: DiscoveryTeam[]) => {
    const featuredTeams = teams.filter((team) => team.isFeatured);
    set({ teams, featuredTeams });
  },

  _setUserTeam: (team: DiscoveryTeam | null) => {
    set({ userTeam: team });
  },
}));

// Utility hook for team discovery specific functionality
export const useTeamDiscovery = () => {
  const store = useTeamStore();

  return {
    // Data
    teams: store.teams,
    featuredTeams: store.featuredTeams,
    userTeam: store.userTeam,
    selectedTeam: store.selectedTeam,

    // UI State
    isLoading: store.isLoading,
    isJoining: store.isJoining,
    error: store.error,
    searchFilters: store.searchFilters,

    // Actions
    loadTeams: store.loadTeams,
    searchTeams: store.searchTeams,
    joinTeam: store.joinTeam,
    leaveTeam: store.leaveTeam,
    selectTeam: store.selectTeam,
    setSearchFilters: store.setSearchFilters,
    clearError: store.clearError,
  };
};

// Hook for team joining functionality specifically
export const useTeamJoin = () => {
  const { joinTeam, leaveTeam, isJoining, error, userTeam } = useTeamStore();

  return {
    joinTeam,
    leaveTeam,
    isJoining,
    error,
    hasTeam: !!userTeam,
    currentTeam: userTeam,
  };
};

// Cleanup function for component unmounting
export const cleanupTeamStore = () => {
  const store = useTeamStore.getState();
  if (store.subscription) {
    store.subscription.unsubscribe();
    store.setSubscription(null);
  }
};

export default useTeamStore;
