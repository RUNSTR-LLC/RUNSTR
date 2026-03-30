/**
 * useSupabaseLeaderboard - Fetch leaderboard from Supabase backend
 *
 * This is the NEW database-backed leaderboard system that replaces Nostr queries.
 * Benefits:
 * - Instant response times (~200ms vs 3-5 seconds for Nostr)
 * - Workout verification (only app-submitted workouts count)
 * - Pre-computed rankings (no client-side calculation)
 *
 * IMPORTANT: This leaderboard only includes workouts submitted via the "Compete"
 * button in the app. Historical Nostr workouts are NOT included unless migrated.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nip19 } from 'nostr-tools';
import { SupabaseCompetitionService } from '../services/backend/SupabaseCompetitionService';
import { isSupabaseConfigured, CharityRanking } from '../utils/supabase';
import { ProfileCache } from '../cache/ProfileCache';
import { SEASON_2_PARTICIPANTS } from '../constants/season2';
import LocalWorkoutStorageService, { LocalWorkout } from '../services/fitness/LocalWorkoutStorageService';
import {
  EINUNDZWANZIG_DEMO_MODE,
  EINUNDZWANZIG_CONFIG,
  EINUNDZWANZIG_COMPETITION_ID,
} from '../constants/einundzwanzig';

// Cache keys and TTL
const LEADERBOARD_CACHE_PREFIX = '@runstr:leaderboard:';
const CHARITY_CACHE_PREFIX = '@runstr:charity_rankings:';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Load cached leaderboard data
 */
async function loadCachedLeaderboard(
  competitionId: string
): Promise<{ leaderboard: SupabaseLeaderboardEntry[]; charityRankings: CharityRanking[] } | null> {
  try {
    const [leaderboardJson, charityJson] = await Promise.all([
      AsyncStorage.getItem(`${LEADERBOARD_CACHE_PREFIX}${competitionId}`),
      AsyncStorage.getItem(`${CHARITY_CACHE_PREFIX}${competitionId}`),
    ]);

    if (!leaderboardJson) return null;

    const leaderboardCache: CachedData<SupabaseLeaderboardEntry[]> = JSON.parse(leaderboardJson);
    const charityCache: CachedData<CharityRanking[]> | null = charityJson ? JSON.parse(charityJson) : null;

    // Check if cache is still valid
    if (Date.now() - leaderboardCache.timestamp > CACHE_TTL) {
      return null;
    }

    return {
      leaderboard: leaderboardCache.data,
      charityRankings: charityCache?.data || [],
    };
  } catch (e) {
    console.warn('[useSupabaseLeaderboard] Cache load error:', e);
    return null;
  }
}

/**
 * Save leaderboard data to cache
 */
async function saveCachedLeaderboard(
  competitionId: string,
  leaderboard: SupabaseLeaderboardEntry[],
  charityRankings: CharityRanking[]
): Promise<void> {
  try {
    const timestamp = Date.now();
    await Promise.all([
      AsyncStorage.setItem(
        `${LEADERBOARD_CACHE_PREFIX}${competitionId}`,
        JSON.stringify({ data: leaderboard, timestamp })
      ),
      AsyncStorage.setItem(
        `${CHARITY_CACHE_PREFIX}${competitionId}`,
        JSON.stringify({ data: charityRankings, timestamp })
      ),
    ]);
  } catch (e) {
    console.warn('[useSupabaseLeaderboard] Cache save error:', e);
  }
}

/**
 * Convert npub to hex pubkey
 * ProfileCache requires hex format, but Supabase stores npub format
 */
function npubToHex(npubOrHex: string): string {
  if (!npubOrHex) return '';

  // Already hex format (64 chars, no 'npub' prefix)
  if (npubOrHex.length === 64 && !npubOrHex.startsWith('npub')) {
    return npubOrHex;
  }

  // Convert npub to hex
  if (npubOrHex.startsWith('npub')) {
    try {
      const decoded = nip19.decode(npubOrHex);
      if (decoded.type === 'npub') {
        return decoded.data;
      }
    } catch (e) {
      console.warn('[useSupabaseLeaderboard] Failed to decode npub:', npubOrHex);
    }
  }

  return npubOrHex;
}

export interface SupabaseLeaderboardEntry {
  npub: string;
  score: number;
  rank: number;
  workout_count?: number;
  // Enriched fields from profile cache
  name?: string;
  picture?: string;
  displayName?: string;
  // Charity from user's most recent workout
  charityId?: string;
  charityName?: string;
}

interface UseSupabaseLeaderboardReturn {
  leaderboard: SupabaseLeaderboardEntry[];
  charityRankings: CharityRanking[];
  isLoading: boolean;
  hasRealData: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  currentUserRank?: number;
  currentUserPubkey?: string;
  isSupabaseAvailable: boolean;
}

/**
 * Hook to fetch leaderboard from Supabase
 *
 * @param competitionId - The competition ID (UUID or external_id like "season2-2025")
 * @param enrichProfiles - Whether to fetch profile data for participants (default: true)
 */
export function useSupabaseLeaderboard(
  competitionId: string,
  enrichProfiles: boolean = true
): UseSupabaseLeaderboardReturn {
  // For Season II competitions, use hardcoded participants as initial data
  // This eliminates loading placeholders - users see data immediately
  const isSeason2 = competitionId.startsWith('season2-');
  const initialLeaderboard = useMemo<SupabaseLeaderboardEntry[]>(() => {
    if (!isSeason2) return [];
    // Show hardcoded participants with 0 score initially
    return SEASON_2_PARTICIPANTS.map((p, index) => ({
      npub: p.npub,
      score: 0,
      rank: index + 1,
      workout_count: 0,
      name: p.name,
      picture: p.picture,
      displayName: p.name,
    }));
  }, [isSeason2]);

  const [leaderboard, setLeaderboard] = useState<SupabaseLeaderboardEntry[]>(initialLeaderboard);
  const [charityRankings, setCharityRankings] = useState<CharityRanking[]>([]);
  const [isLoading, setIsLoading] = useState(!isSeason2); // Don't show loading for Season II (we have initial data)
  const [hasRealData, setHasRealData] = useState(false); // Track whether real data (cache or fresh) has loaded
  const [error, setError] = useState<string | null>(null);
  const [currentUserPubkey, setCurrentUserPubkey] = useState<string | undefined>();
  const [currentUserRank, setCurrentUserRank] = useState<number | undefined>();
  const [scoringMethod, setScoringMethod] = useState<string>('total_distance');
  const isMounted = useRef(true);
  const lastFetchTime = useRef<number>(0);
  const MIN_REFETCH_INTERVAL = 30000; // 30 seconds minimum between refetches

  // Check if Supabase is available
  const isSupabaseAvailable = isSupabaseConfigured();

  // Load from cache immediately on mount, fallback to initial data
  useEffect(() => {
    const loadFromCache = async () => {
      const cached = await loadCachedLeaderboard(competitionId);
      if (cached && cached.leaderboard.length > 0 && isMounted.current) {
        console.log(`[useSupabaseLeaderboard] Loaded ${cached.leaderboard.length} entries from cache for ${competitionId}`);
        setLeaderboard(cached.leaderboard);
        setCharityRankings(cached.charityRankings);
        setHasRealData(true); // Cache is real data
      } else if (isSeason2 && isMounted.current) {
        // No cache - use initial data with 0 scores
        setLeaderboard(initialLeaderboard);
        setCharityRankings([]);
      }
    };
    loadFromCache();
  }, [competitionId, isSeason2, initialLeaderboard]);

  // Get current user pubkey
  useEffect(() => {
    const fetchUserPubkey = async () => {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (npub && isMounted.current) {
        setCurrentUserPubkey(npub);
      }
    };
    fetchUserPubkey();
  }, []);

  // LOCAL-FIRST: Track recently competed workouts for instant leaderboard appearance
  const [localCompetedWorkouts, setLocalCompetedWorkouts] = useState<LocalWorkout[]>([]);

  // LOCAL-FIRST: Track locally joined users for instant leaderboard appearance
  const [locallyJoinedUsers, setLocallyJoinedUsers] = useState<string[]>([]);

  // Helper: Get activity type from competition ID
  const getActivityType = useCallback((id: string): string => {
    // Use explicit mapping to avoid substring collision issues
    if (id.startsWith('season2-walking') || id === 'january-walking') return 'walking';
    if (id.startsWith('season2-cycling')) return 'cycling';
    return 'running'; // Default for running-bitcoin, season2-running, etc.
  }, []);

  // Load local workouts that were recently competed (last 10 minutes)
  // This allows users to see themselves on the leaderboard immediately after hitting "Compete" or auto-compete
  // Extracted to reusable callback so it can be called on focus
  const loadLocalWorkouts = useCallback(async () => {
    if (!currentUserPubkey) return;

    try {
      // Get all local workouts
      const allLocal = await LocalWorkoutStorageService.getAllWorkouts();

      // Determine activity type from competition ID
      const activityType = getActivityType(competitionId);

      // Filter: competed (syncedToNostr), matching activity type, recent (last 10 min)
      // Increased from 5 to 10 minutes to handle network delays and multiple quick workouts
      const tenMinAgo = Date.now() - 10 * 60 * 1000;
      const competed = (allLocal || []).filter(w => {
        // Must be synced to Nostr and match activity type
        if (w.syncedToNostr !== true || w.type !== activityType) return false;

        // Must have valid distance > 0 (filter out zero-distance workouts)
        if (!w.distance || w.distance <= 0) return false;

        // Validate syncedAt timestamp with error handling
        try {
          const syncTime = w.syncedAt ? new Date(w.syncedAt).getTime() : 0;
          return !isNaN(syncTime) && syncTime > tenMinAgo;
        } catch {
          // Invalid date format - skip this workout
          return false;
        }
      });

      if (competed.length > 0) {
        console.log(`[useSupabaseLeaderboard] Found ${competed.length} recent local ${activityType} workouts for instant display`);
      }

      setLocalCompetedWorkouts(competed);
    } catch (e) {
      console.warn('[useSupabaseLeaderboard] Failed to load local workouts:', e);
    }
  }, [competitionId, currentUserPubkey, getActivityType]);

  // Initial load of local workouts
  useEffect(() => {
    loadLocalWorkouts();
  }, [loadLocalWorkouts]);

  // Load locally joined users for instant join appearance (non-Season II only)
  const loadLocallyJoinedUsers = useCallback(async () => {
    // Season II uses hardcoded participants, no join check needed
    if (isSeason2) return;

    try {
      const localJoins = await SupabaseCompetitionService.getLocallyJoinedUsers(competitionId);
      if (localJoins.length > 0) {
        console.log(`[useSupabaseLeaderboard] Found ${localJoins.length} locally joined users for ${competitionId}`);
      }
      setLocallyJoinedUsers(localJoins);
    } catch (e) {
      console.warn('[useSupabaseLeaderboard] Failed to load locally joined users:', e);
    }
  }, [competitionId, isSeason2]);

  // Initial load of locally joined users
  useEffect(() => {
    loadLocallyJoinedUsers();
  }, [loadLocallyJoinedUsers]);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async (force: boolean = false) => {
    if (!isSupabaseAvailable) {
      setError('Supabase not configured');
      setIsLoading(false);
      return;
    }

    // Throttle refetches to prevent flickering (unless forced)
    const now = Date.now();
    if (!force && lastFetchTime.current > 0 && now - lastFetchTime.current < MIN_REFETCH_INTERVAL) {
      console.log('[useSupabaseLeaderboard] Skipping refetch - too soon since last fetch');
      return;
    }

    try {
      // Only show loading state for initial fetch (prevents flickering on refresh)
      if (lastFetchTime.current === 0) {
        setIsLoading(true);
      }
      setError(null);

      // EIN competition: Use demo dates if enabled, and allow both running+walking
      const isEin = competitionId === EINUNDZWANZIG_COMPETITION_ID;
      const isEinDemo = EINUNDZWANZIG_DEMO_MODE && isEin;

      const dateOverride = isEinDemo
        ? {
            startDate: EINUNDZWANZIG_CONFIG.startDate.toISOString(),
            endDate: EINUNDZWANZIG_CONFIG.endDate.toISOString(),
          }
        : undefined;

      // EIN allows both running and walking
      const activityTypes = isEin
        ? EINUNDZWANZIG_CONFIG.eligibleActivityTypes
        : undefined;

      const result = await SupabaseCompetitionService.getLeaderboard(
        competitionId,
        100,
        dateOverride,
        activityTypes,
        isEin // requireAppSource: Only app-submitted workouts for EIN (active prizes)
      );
      lastFetchTime.current = Date.now();

      if (result.error) {
        setError(result.error);
        // For Season II: Keep hardcoded participants, don't clear on error
        if (isSeason2) {
          console.log(`[useSupabaseLeaderboard] Supabase error for Season 2, keeping hardcoded participants: ${result.error}`);
          setHasRealData(true); // Show hardcoded data instead of spinner
        } else {
          setLeaderboard([]);
          setCharityRankings([]);
        }
        return;
      }

      // Track scoring method for sort direction in merged leaderboard
      if (result.competition?.scoring_method) {
        setScoringMethod(result.competition.scoring_method);
      }

      let enrichedLeaderboard: SupabaseLeaderboardEntry[] = result.leaderboard;

      // Enrich with profile data if requested
      if (enrichProfiles && result.leaderboard.length > 0) {
        // Create fallback map from hardcoded SEASON_2_PARTICIPANTS data
        const hardcodedMap = new Map(
          SEASON_2_PARTICIPANTS.map((p) => [p.npub, { name: p.name, picture: p.picture }])
        );

        // For Season II, filter to only include participants from hardcoded list
        // This removes any test/extra entries not in official participant list
        const filteredLeaderboard = isSeason2
          ? result.leaderboard.filter((entry) => hardcodedMap.has(entry.npub))
          : result.leaderboard;

        // PERFORMANCE FIX: For Season 2, skip Nostr profile fetch entirely
        // We have hardcoded profile data for all participants - no need to wait for slow relays
        if (isSeason2) {
          console.log('[useSupabaseLeaderboard] Using hardcoded profiles for Season 2 (skipping Nostr)');
          enrichedLeaderboard = filteredLeaderboard.map((entry) => {
            const hardcoded = hardcodedMap.get(entry.npub);
            // Hide OpenSats charity info (no longer supported) but keep the user
            const isOpenSats = entry.charityId?.toLowerCase() === 'opensats' ||
                               entry.charityName?.toLowerCase().includes('opensats');
            return {
              ...entry,
              name: hardcoded?.name || 'Anonymous',
              picture: hardcoded?.picture,
              displayName: hardcoded?.name || 'Anonymous',
              charityId: isOpenSats ? undefined : entry.charityId,
              charityName: isOpenSats ? undefined : entry.charityName,
            };
          });
        } else {
          // Non-Season 2: Fetch profiles from Nostr
          // This adds 2-3 second delay but ensures real names display (Supabase doesn't have profile data)
          console.log('[useSupabaseLeaderboard] Fetching Nostr profiles for non-Season2 competition');
          const hexPubkeys = result.leaderboard
            .map((e) => npubToHex(e.npub))
            .filter((hex) => hex.length === 64);

          const npubToHexMap = new Map<string, string>();
          result.leaderboard.forEach((e) => {
            const hex = npubToHex(e.npub);
            if (hex.length === 64) {
              npubToHexMap.set(e.npub, hex);
            }
          });

          const profilesMap = await ProfileCache.fetchProfiles(hexPubkeys);

          enrichedLeaderboard = filteredLeaderboard.map((entry) => {
            const hexKey = npubToHexMap.get(entry.npub);
            const profile = hexKey ? profilesMap.get(hexKey) : undefined;
            const hardcoded = hardcodedMap.get(entry.npub);
            return {
              ...entry,
              name: profile?.name || hardcoded?.name || 'Anonymous',
              picture: profile?.picture || hardcoded?.picture,
              displayName: profile?.name || hardcoded?.name || 'Anonymous',
              charityId: entry.charityId,
              charityName: entry.charityName,
            };
          });
        }
      }

      if (isMounted.current) {
        // For Season II, ensure ALL participants appear (even those with 0 in this category)
        let finalLeaderboard = enrichedLeaderboard;
        if (isSeason2) {
          const existingNpubs = new Set(enrichedLeaderboard.map(e => e.npub));
          const missingParticipants: SupabaseLeaderboardEntry[] = SEASON_2_PARTICIPANTS
            .filter(p => !existingNpubs.has(p.npub))
            .map(p => ({
              npub: p.npub,
              score: 0,
              rank: 0, // Will be assigned below
              workout_count: 0,
              name: p.name,
              picture: p.picture,
              displayName: p.name,
            }));

          // Combine and re-rank (active participants first, then 0-score alphabetically)
          finalLeaderboard = [
            ...enrichedLeaderboard,
            ...missingParticipants.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
          ].map((entry, index) => ({ ...entry, rank: index + 1 }));
        }

        setLeaderboard(finalLeaderboard);

        // Filter out OpenSats from charity rankings (no longer supported)
        const filteredCharityRankings = (result.charityRankings || []).filter(
          (charity) => charity.charityId?.toLowerCase() !== 'opensats' &&
                       !charity.charityName?.toLowerCase().includes('opensats')
        );
        setCharityRankings(filteredCharityRankings);
        setHasRealData(true); // Fresh Supabase data loaded

        // Save to cache for instant display on next visit
        saveCachedLeaderboard(competitionId, finalLeaderboard, filteredCharityRankings);

        // Find current user's rank
        if (currentUserPubkey) {
          const userEntry = enrichedLeaderboard.find(
            (e) => e.npub === currentUserPubkey
          );
          setCurrentUserRank(userEntry?.rank);
        }
      }
    } catch (err) {
      console.error('[useSupabaseLeaderboard] Error:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [competitionId, enrichProfiles, currentUserPubkey, isSupabaseAvailable, isSeason2]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    fetchLeaderboard();

    return () => {
      isMounted.current = false;
    };
  }, [fetchLeaderboard]);

  // Auto-refresh when screen gains focus (e.g., after submitting a workout via auto-compete)
  // This ensures users see their newly submitted workouts immediately
  // CRITICAL: Must re-load BOTH local workouts AND Supabase data on focus
  // - Local workouts may have been marked as synced via auto-compete while modal was open
  // - Supabase data may have been updated by the 2-minute sync cron job
  // - Locally joined users should appear immediately after joining
  useFocusEffect(
    useCallback(() => {
      // Re-load local workouts to catch auto-competed workouts
      loadLocalWorkouts();

      // Re-load locally joined users to catch recent joins
      loadLocallyJoinedUsers();

      // Only refresh Supabase data if initial fetch has been done (avoid double-fetch on mount)
      if (!isLoading) {
        fetchLeaderboard();
      }
    }, [loadLocalWorkouts, loadLocallyJoinedUsers, fetchLeaderboard, isLoading])
  );

  // Refresh function (forced - bypasses throttle)
  const refresh = useCallback(async () => {
    await fetchLeaderboard(true);
  }, [fetchLeaderboard]);

  // LOCAL-FIRST: Merge local competed workouts AND locally joined users into leaderboard
  // This allows users to see themselves immediately after hitting "Compete" or "Join"
  // without waiting for Supabase sync (up to 2 min)
  const mergedLeaderboard = useMemo(() => {
    let result = [...leaderboard];
    const existingNpubs = new Set(result.map(e => e.npub));

    // Step 1: Add locally joined users who aren't in Supabase leaderboard yet (non-Season II only)
    // These users joined but Supabase hasn't synced yet - show them with 0 score
    if (!isSeason2 && locallyJoinedUsers.length > 0) {
      for (const npub of locallyJoinedUsers) {
        if (!existingNpubs.has(npub)) {
          console.log(`[useSupabaseLeaderboard] Adding locally joined user to leaderboard: ${npub.slice(0, 12)}...`);
          result.push({
            npub,
            score: 0,
            rank: 0, // Will be calculated
            workout_count: 0,
            displayName: npub === currentUserPubkey ? 'You' : 'Anonymous',
          });
          existingNpubs.add(npub);
        }
      }
    }

    // Step 2: Merge local competed workouts for current user
    // Skip local merge for fastest_time (requires distance filtering that's complex to do locally)
    const isFastestTime = scoringMethod === 'fastest_time';
    if (!isFastestTime && localCompetedWorkouts.length > 0 && currentUserPubkey) {
      // Calculate local contribution (distance in meters → km for score)
      const localDistanceKm = localCompetedWorkouts.reduce(
        (sum, w) => sum + ((w.distance || 0) / 1000), 0
      );
      const localCount = localCompetedWorkouts.length;

      // Check if workouts are already counted in Supabase data
      const userEntry = result.find(e => e.npub === currentUserPubkey);

      // If user already on leaderboard with same or more workouts, no merge needed
      // (Supabase has caught up to local state)
      if (userEntry && (userEntry.workout_count || 0) >= localCount) {
        // No local workout merge needed
      } else if (userEntry) {
        // User exists but may be missing recent workouts - augment their score
        result = result.map(e => {
          if (e.npub === currentUserPubkey) {
            return {
              ...e,
              score: e.score + localDistanceKm,
              workout_count: Math.max(e.workout_count || 0, localCount),
            };
          }
          return e;
        });
      } else {
        // User not on leaderboard yet - add them with local data
        console.log(`[useSupabaseLeaderboard] Adding user to leaderboard with local data: ${localDistanceKm.toFixed(2)}km from ${localCount} workouts`);
        result.push({
          npub: currentUserPubkey,
          score: localDistanceKm,
          rank: 0,
          workout_count: localCount,
          displayName: 'You',
        });
      }
    }

    // Step 3: Re-sort and re-assign ranks
    // For fastest_time: ascending (lower time = better rank)
    // For all others: descending (higher score = better rank)
    if (isFastestTime) {
      result.sort((a, b) => a.score - b.score);
    } else {
      result.sort((a, b) => b.score - a.score);
    }
    return result.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [leaderboard, localCompetedWorkouts, locallyJoinedUsers, currentUserPubkey, isSeason2, scoringMethod]);

  return {
    leaderboard: mergedLeaderboard, // Return merged leaderboard for instant user appearance
    charityRankings,
    isLoading,
    hasRealData,
    error,
    refresh,
    currentUserRank,
    currentUserPubkey,
    isSupabaseAvailable,
  };
}

/**
 * Hook to check if user is participating in a competition
 */
export function useCompetitionParticipation(competitionId: string) {
  const [isParticipating, setIsParticipating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkParticipation = async () => {
      try {
        const npub = await AsyncStorage.getItem('@runstr:npub');
        if (!npub) {
          setIsParticipating(false);
          setIsLoading(false);
          return;
        }

        const participating = await SupabaseCompetitionService.isParticipant(
          competitionId,
          npub
        );
        setIsParticipating(participating);
      } catch (err) {
        console.error('[useCompetitionParticipation] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkParticipation();
  }, [competitionId]);

  const join = useCallback(async () => {
    // OPTIMISTIC: Set participating state immediately for instant UI feedback
    setIsParticipating(true);

    // Service resolves authenticated identity from secure local auth storage.
    const result = await SupabaseCompetitionService.joinCompetition(
      competitionId
    );

    // Service always returns success (optimistic pattern), but handle edge case
    if (!result.success) {
      console.warn('[useCompetitionParticipation] Join failed, but keeping optimistic state');
    }

    return result.success;
  }, [competitionId]);

  const leave = useCallback(async () => {
    // OPTIMISTIC: Set non-participating state immediately for instant UI feedback
    setIsParticipating(false);

    // Service resolves authenticated identity from secure local auth storage.
    const result = await SupabaseCompetitionService.leaveCompetition(
      competitionId
    );

    if (!result.success) {
      // Revert optimistic state on failure
      setIsParticipating(true);
      console.warn('[useCompetitionParticipation] Leave failed, reverting state');
    }

    return result.success;
  }, [competitionId]);

  return {
    isParticipating,
    isLoading,
    join,
    leave,
  };
}

export default useSupabaseLeaderboard;
