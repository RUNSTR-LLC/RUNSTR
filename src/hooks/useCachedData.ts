/**
 * Cache-aware React hooks for Nostr data
 * These hooks provide transparent caching with automatic refresh
 * Components use these instead of direct service calls
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { UnifiedCacheService } from '../services/cache/UnifiedCacheService';
import { CacheInvalidator } from '../services/cache/CacheInvalidator';
import { TeamMemberCache } from '../services/team/TeamMemberCache';
import { nostrProfileService } from '../services/nostr/NostrProfileService';
import { getNostrTeamService } from '../services/nostr/NostrTeamService';
import leagueRankingService, {
  LeagueRankingEntry,
  LeagueParameters,
} from '../services/competition/leagueRankingService';
import { Competition1301QueryService } from '../services/competition/Competition1301QueryService';
import type { NostrWorkout } from '../types/nostrWorkout';

/**
 * Hook for fetching and caching team members
 */
export function useTeamMembers(teamId: string, captainPubkey: string) {
  const [members, setMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async (bypassCache = false) => {
    if (!teamId || !captainPubkey) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cacheKey = `members:${teamId}:${captainPubkey}`;

      const data = bypassCache
        ? await UnifiedCacheService.forceFetch(
            cacheKey,
            async () => TeamMemberCache.getInstance().getTeamMembers(teamId, captainPubkey),
            'members'
          )
        : await UnifiedCacheService.fetch(
            cacheKey,
            async () => TeamMemberCache.getInstance().getTeamMembers(teamId, captainPubkey),
            'members'
          );

      setMembers(data || []);
    } catch (err) {
      console.error('useTeamMembers error:', err);
      setError(err as Error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, captainPubkey]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    refetch: () => fetchMembers(true), // Force bypass cache
  };
}

/**
 * Hook for fetching and caching league rankings
 */
export function useLeagueRankings(
  competitionId: string,
  parameters: LeagueParameters | null,
  participants?: string[]
) {
  const [rankings, setRankings] = useState<LeagueRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRankings = useCallback(async (bypassCache = false) => {
    if (!competitionId || !parameters) {
      setRankings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cacheKey = `rankings:${competitionId}:${JSON.stringify(parameters)}`;

      const data = bypassCache
        ? await UnifiedCacheService.forceFetch(
            cacheKey,
            async () => {
              // If participants provided, use them
              const memberList = participants || [];

              // Note: LeagueParameters doesn't have teamId/captainPubkey directly
              // These would need to be passed separately to the hook
              // For now, use the participants list if provided

              // Get workouts for members
              const workoutsCacheKey = `competition-workouts:${competitionId}:${memberList.sort().join(',')}`;
              const workouts = await UnifiedCacheService.fetch(
                workoutsCacheKey,
                async () => {
                  // This would query kind 1301 events
                  // Note: getCompetitionWorkouts method needs to be implemented
                  // For now return empty array as placeholder
                  return [] as any[];
                },
                'workouts'
              );

              // Compute rankings locally
              const result = await leagueRankingService.getInstance().getRankings(
                competitionId,
                memberList.map(npub => ({ npub, name: npub.slice(0, 8) + '...', isActive: true })),
                parameters
              );

              return result.rankings;
            },
            'leaderboards'
          )
        : await UnifiedCacheService.fetch(
            cacheKey,
            async () => {
              const memberList = participants || [];

              if (!participants && parameters.teamId && parameters.captainPubkey) {
                const membersCacheKey = `members:${parameters.teamId}:${parameters.captainPubkey}`;
                const cachedMembers = await UnifiedCacheService.fetch(
                  membersCacheKey,
                  async () => TeamMemberCache.getInstance().getTeamMembers(
                    parameters.teamId!,
                    parameters.captainPubkey!
                  ),
                  'members'
                );
                memberList.push(...(cachedMembers || []));
              }

              const result = await leagueRankingService.getInstance().getRankings(
                competitionId,
                memberList.map(npub => ({ npub, name: npub.slice(0, 8) + '...', isActive: true })),
                parameters
              );

              return result.rankings;
            },
            'leaderboards'
          );

      setRankings(data || []);
    } catch (err) {
      console.error('useLeagueRankings error:', err);
      setError(err as Error);
      setRankings([]);
    } finally {
      setLoading(false);
    }
  }, [competitionId, parameters, participants]);

  useEffect(() => {
    fetchRankings();

    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(() => {
      fetchRankings(false); // Use cache
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchRankings]);

  return {
    rankings,
    loading,
    error,
    refetch: () => fetchRankings(true), // Force bypass cache
  };
}

/**
 * Hook for fetching and caching Nostr profiles
 */
export function useNostrProfile(npub: string | null | undefined) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async (bypassCache = false) => {
    if (!npub) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cacheKey = `profile:${npub}`;

      const data = bypassCache
        ? await UnifiedCacheService.forceFetch(
            cacheKey,
            async () => {
              return nostrProfileService.getProfile(npub);
            },
            'profiles'
          )
        : await UnifiedCacheService.fetch(
            cacheKey,
            async () => {
              return nostrProfileService.getProfile(npub);
            },
            'profiles'
          );

      setProfile(data);
    } catch (err) {
      console.error('useNostrProfile error:', err);
      setError(err as Error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [npub]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch: () => fetchProfile(true),
  };
}

/**
 * Hook for fetching and caching teams
 */
export function useTeams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeams = useCallback(async (bypassCache = false) => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = 'teams:discovery';

      const data = bypassCache
        ? await UnifiedCacheService.forceFetch(
            cacheKey,
            async () => {
              const service = getNostrTeamService();
              return service.discoverFitnessTeams();
            },
            'teams'
          )
        : await UnifiedCacheService.fetch(
            cacheKey,
            async () => {
              const service = getNostrTeamService();
              return service.discoverFitnessTeams();
            },
            'teams'
          );

      setTeams(data || []);
    } catch (err) {
      console.error('useTeams error:', err);
      setError(err as Error);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return {
    teams,
    loading,
    error,
    refetch: () => fetchTeams(true),
  };
}

/**
 * Hook for fetching and caching workouts
 */
export function useWorkouts(npub: string | null | undefined) {
  const [workouts, setWorkouts] = useState<NostrWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkouts = useCallback(async (bypassCache = false) => {
    if (!npub) {
      setWorkouts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cacheKey = `workouts:${npub}`;

      // For workouts, we'd need to implement a service method
      // For now, return empty array
      const data = await UnifiedCacheService.fetch(
        cacheKey,
        async () => {
          // This would fetch kind 1301 events for the user
          return [] as NostrWorkout[];
        },
        'workouts'
      );

      setWorkouts(data || []);
    } catch (err) {
      console.error('useWorkouts error:', err);
      setError(err as Error);
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  }, [npub]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  return {
    workouts,
    loading,
    error,
    refetch: () => fetchWorkouts(true),
  };
}

/**
 * Hook for managing cache invalidation
 * Provides functions to trigger smart cache updates
 */
export function useCacheInvalidation() {
  const invalidateWorkout = useCallback((userNpub: string, teamId?: string) => {
    CacheInvalidator.onWorkoutPosted(userNpub, teamId);
  }, []);

  const invalidateMember = useCallback((teamId: string, memberNpub: string, action: 'add' | 'remove') => {
    if (action === 'add') {
      CacheInvalidator.onMemberAdded(teamId, memberNpub);
    } else {
      CacheInvalidator.onMemberRemoved(teamId, memberNpub);
    }
  }, []);

  const invalidateCompetition = useCallback((competitionId: string, teamId?: string) => {
    CacheInvalidator.onCompetitionUpdated(competitionId, teamId);
  }, []);

  const invalidateTeam = useCallback((teamId: string) => {
    CacheInvalidator.onTeamUpdated(teamId);
  }, []);

  const invalidateProfile = useCallback((npub: string) => {
    CacheInvalidator.onProfileUpdated(npub);
  }, []);

  const refreshUser = useCallback((userNpub: string) => {
    CacheInvalidator.onUserRefresh(userNpub);
  }, []);

  const refreshTeam = useCallback((teamId: string) => {
    CacheInvalidator.onTeamRefresh(teamId);
  }, []);

  const clearAll = useCallback(async () => {
    await CacheInvalidator.clearAll();
  }, []);

  return {
    invalidateWorkout,
    invalidateMember,
    invalidateCompetition,
    invalidateTeam,
    invalidateProfile,
    refreshUser,
    refreshTeam,
    clearAll,
  };
}

/**
 * Generic hook for cached data
 * Can be used for any data type with custom cache key and fetcher
 */
export function useCachedData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlKey: keyof typeof UnifiedCacheService['TTL'] = 'computed',
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (bypassCache = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = bypassCache
        ? await UnifiedCacheService.forceFetch(cacheKey, fetcher, ttlKey)
        : await UnifiedCacheService.fetch(cacheKey, fetcher, ttlKey);

      setData(result);
    } catch (err) {
      console.error(`useCachedData error for ${cacheKey}:`, err);
      setError(err as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, ...dependencies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
  };
}