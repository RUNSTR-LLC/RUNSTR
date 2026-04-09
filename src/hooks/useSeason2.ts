/**
 * useSeason2 - React hooks for RUNSTR Season 2 competition
 *
 * BASELINE NOTE ARCHITECTURE (Optimized):
 * - Fetches 1 baseline note (kind 30078) on mount - instant display
 * - Subscribes to ONLY logged-in user's 1301 events (not all 43 participants)
 * - Merges user's fresh workouts with baseline in real-time
 * - Eliminates iOS WebSocket blocking (40-65s freeze)
 *
 * Provides hooks for:
 * - Leaderboard data with loading states
 * - Registration status and join functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Season2Service } from '../services/season/Season2Service';
import { LeaderboardBaselineService } from '../services/season/LeaderboardBaselineService';
import { GlobalNDKService } from '../services/nostr/GlobalNDKService';
import {
  getSeason2Status,
  getSeason2DateRange,
  SEASON_2_CONFIG,
} from '../constants/season2';
import type {
  Season2ActivityType,
  Season2Leaderboard,
  Season2Status,
} from '../types/season2';
import type { NDKFilter, NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';

// ============================================================================
// Configuration
// ============================================================================

// Maximum participants to show (expandable)
const TOP_DISPLAY_COUNT = 21;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build placeholder leaderboard with anonymous athletes
 */
function buildPlaceholderLeaderboard(
  activityType: Season2ActivityType
): Season2Leaderboard {
  const placeholders = Array.from({ length: TOP_DISPLAY_COUNT }, (_, i) => ({
    pubkey: `placeholder-${i}`,
    npub: '',
    name: 'Anonymous Athlete',
    picture: undefined,
    totalDistance: 0,
    workoutCount: 0,
    charityId: undefined,
    isLocalJoin: false,
  }));

  return {
    activityType,
    participants: placeholders,
    charityRankings: [],
    lastUpdated: Date.now(),
    totalParticipants: TOP_DISPLAY_COUNT,
  };
}

/**
 * Parse kind 1301 workout event
 */
function parseWorkoutEvent(event: NDKEvent): {
  activityType: Season2ActivityType;
  distance: number;
  charityId?: string;
} | null {
  try {
    const getTag = (name: string) => event.tags.find((t) => t[0] === name)?.[1];

    const exerciseType = getTag('exercise')?.toLowerCase();
    const distanceStr = getTag('distance');

    if (!exerciseType || !distanceStr) return null;

    const distance = parseFloat(distanceStr);
    if (isNaN(distance) || distance <= 0) return null;

    // Detect activity type
    let activityType: Season2ActivityType | null = null;
    if (exerciseType.includes('run') || exerciseType.includes('jog') || exerciseType === 'running') {
      activityType = 'running';
    } else if (exerciseType.includes('walk') || exerciseType.includes('hike') || exerciseType === 'walking') {
      activityType = 'walking';
    } else if (exerciseType.includes('cycl') || exerciseType.includes('bike') || exerciseType === 'cycling') {
      activityType = 'cycling';
    } else if (exerciseType === 'other' && distance > 0) {
      activityType = 'running'; // Default "other" with distance to running
    }

    if (!activityType) return null;

    const charityTag = event.tags.find((t) => t[0] === 'charity');
    const charityId = charityTag?.[1];

    return { activityType, distance, charityId };
  } catch {
    return null;
  }
}

// ============================================================================
// useSeason2Leaderboard - Single activity leaderboard hook
// ============================================================================

interface UseSeason2LeaderboardReturn {
  leaderboard: Season2Leaderboard | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for Season 2 leaderboard data (single activity)
 */
export function useSeason2Leaderboard(
  activityType: Season2ActivityType
): UseSeason2LeaderboardReturn {
  const [leaderboard, setLeaderboard] = useState<Season2Leaderboard | null>(
    () => buildPlaceholderLeaderboard(activityType)
  );
  const [isLoading] = useState(false); // Loading handled by placeholder display
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const loadLeaderboard = async () => {
      try {
        // Try baseline note first
        const baseline = await LeaderboardBaselineService.fetchBaseline();
        if (baseline && isMounted.current) {
          setLeaderboard(baseline.season2[activityType]);
          return;
        }

        // Fallback to memory-based approach
        const data = await Season2Service.getLeaderboardFromMemory(activityType);
        if (data && isMounted.current) {
          setLeaderboard(data);
        }
      } catch (err) {
        console.warn('[useSeason2Leaderboard] Load failed:', err);
      }
    };

    loadLeaderboard();

    return () => {
      isMounted.current = false;
    };
  }, [activityType]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const baseline = await LeaderboardBaselineService.fetchBaseline(true);
      if (baseline && isMounted.current) {
        setLeaderboard(baseline.season2[activityType]);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to refresh');
      }
    }
  }, [activityType]);

  return { leaderboard, isLoading, error, refresh };
}

// ============================================================================
// useAllSeason2Leaderboards - Unified hook for all activity leaderboards
// ============================================================================

interface AllSeason2Leaderboards {
  running: Season2Leaderboard;
  walking: Season2Leaderboard;
  cycling: Season2Leaderboard;
}

interface UseAllSeason2LeaderboardsReturn {
  leaderboards: AllSeason2Leaderboards;
  isLoading: boolean;
  error: string | null;
  refreshAll: () => Promise<void>;
  currentUserPubkey?: string;
  isBaselineOnly: boolean;
  baselineDate: string;
}

/**
 * Hook for ALL Season 2 leaderboards at once
 *
 * BASELINE NOTE ARCHITECTURE:
 * 1. Fetch baseline note on mount (1 event, instant)
 * 2. Subscribe to ONLY current user's 1301 events
 * 3. Merge user's fresh workouts with baseline in real-time
 * 4. Falls back to memory-based approach if no baseline note
 */
export function useAllSeason2Leaderboards(): UseAllSeason2LeaderboardsReturn {
  const [leaderboards, setLeaderboards] = useState<AllSeason2Leaderboards>(() => ({
    running: buildPlaceholderLeaderboard('running'),
    walking: buildPlaceholderLeaderboard('walking'),
    cycling: buildPlaceholderLeaderboard('cycling'),
  }));
  const [isLoading] = useState(false); // Loading handled by placeholder display
  const [error, setError] = useState<string | null>(null);
  const [currentUserPubkey, setCurrentUserPubkey] = useState<string | undefined>();
  const [isBaselineOnly, setIsBaselineOnly] = useState(true);
  const [baselineDate, setBaselineDate] = useState('');
  const isMounted = useRef(true);
  const subscriptionRef = useRef<NDKSubscription | null>(null);
  const userWorkoutsRef = useRef<Map<Season2ActivityType, Array<{ distance: number; charityId?: string }>>>(
    new Map([
      ['running', []],
      ['walking', []],
      ['cycling', []],
    ])
  );
  const baselineRef = useRef<AllSeason2Leaderboards | null>(null);

  // Get current user pubkey on mount
  useEffect(() => {
    const fetchUserPubkey = async () => {
      const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (pubkey && isMounted.current) {
        setCurrentUserPubkey(pubkey);
      }
    };
    fetchUserPubkey();
  }, []);

  // Main effect: Fetch baseline + subscribe to user's workouts
  useEffect(() => {
    isMounted.current = true;

    const setup = async () => {
      const t0 = Date.now();
      console.log(`[useSeason2] ========== BASELINE ARCHITECTURE INIT ==========`);

      try {
        // Step 1: Try to fetch baseline note (1 event, instant)
        console.log(`[useSeason2] T+${Date.now() - t0}ms: Fetching baseline note...`);
        const baseline = await LeaderboardBaselineService.fetchBaseline();

        if (baseline && isMounted.current) {
          // Baseline exists - use it!
          console.log(`[useSeason2] T+${Date.now() - t0}ms: Baseline found!`);

          const cutoffDate = new Date(baseline.cutoffTimestamp * 1000);
          setBaselineDate(
            `${(cutoffDate.getMonth() + 1).toString().padStart(2, '0')}/${cutoffDate.getDate().toString().padStart(2, '0')}/${cutoffDate.getFullYear()}`
          );

          // Store baseline for merging
          baselineRef.current = baseline.season2;
          setLeaderboards(baseline.season2);
          setIsBaselineOnly(true);

          // Step 2: Subscribe to ONLY current user's 1301 events (if logged in)
          if (currentUserPubkey) {
            console.log(`[useSeason2] T+${Date.now() - t0}ms: Subscribing to user ${currentUserPubkey.slice(0, 12)}...`);
            await subscribeToUserWorkouts(currentUserPubkey, baseline.cutoffTimestamp);
          }

          console.log(`[useSeason2] T+${Date.now() - t0}ms: Setup complete (baseline mode)`);
        } else {
          // No baseline - fall back to memory-based approach
          console.log(`[useSeason2] T+${Date.now() - t0}ms: No baseline, using fallback...`);
          await loadFromMemory();
        }
      } catch (err) {
        console.error(`[useSeason2] Setup error:`, err);
        // Fallback to memory-based approach
        await loadFromMemory();
      }

      console.log(`[useSeason2] ========== BASELINE ARCHITECTURE READY ==========`);
    };

    const loadFromMemory = async () => {
      try {
        const data = await Season2Service.getAllLeaderboardsFromMemory(currentUserPubkey);
        if (isMounted.current) {
          baselineRef.current = data;
          setLeaderboards(data);
          setBaselineDate('Memory');
        }
      } catch (err) {
        console.warn('[useSeason2] Memory fallback failed:', err);
      }
    };

    const subscribeToUserWorkouts = async (userPubkey: string, cutoffTimestamp: number) => {
      try {
        const ndk = await GlobalNDKService.getInstance();

        // Subscribe to ONLY this user's 1301 events since cutoff
        const filter: NDKFilter = {
          kinds: [1301 as any],
          authors: [userPubkey],
          since: cutoffTimestamp,
        };

        console.log(`[useSeason2] User subscription filter:`, {
          authors: [userPubkey.slice(0, 12) + '...'],
          since: new Date(cutoffTimestamp * 1000).toISOString(),
        });

        // Clean up existing subscription
        if (subscriptionRef.current) {
          subscriptionRef.current.stop();
        }

        const sub = ndk.subscribe(filter, {
          closeOnEose: false, // Keep open for real-time updates
          pool: ndk.pool,
        });

        sub.on('event', (event: NDKEvent) => {
          if (!isMounted.current) return;

          console.log(`[useSeason2] User workout received:`, event.id?.slice(0, 12));

          const workout = parseWorkoutEvent(event);
          if (!workout) return;

          // Add to user's fresh workouts
          const activityWorkouts = userWorkoutsRef.current.get(workout.activityType) || [];
          activityWorkouts.push({ distance: workout.distance, charityId: workout.charityId });
          userWorkoutsRef.current.set(workout.activityType, activityWorkouts);

          // Merge and update UI
          if (baselineRef.current) {
            const updatedLeaderboards = {
              running: LeaderboardBaselineService.mergeSeason2UserWorkouts(
                baselineRef.current.running,
                userWorkoutsRef.current.get('running') || [],
                userPubkey
              ),
              walking: LeaderboardBaselineService.mergeSeason2UserWorkouts(
                baselineRef.current.walking,
                userWorkoutsRef.current.get('walking') || [],
                userPubkey
              ),
              cycling: LeaderboardBaselineService.mergeSeason2UserWorkouts(
                baselineRef.current.cycling,
                userWorkoutsRef.current.get('cycling') || [],
                userPubkey
              ),
            };

            setLeaderboards(updatedLeaderboards);
            setIsBaselineOnly(false); // Now has fresh user data
            console.log(`[useSeason2] Merged user workout - ${workout.activityType}: +${workout.distance}km`);
          }
        });

        sub.on('eose', () => {
          console.log(`[useSeason2] User subscription EOSE - ${userWorkoutsRef.current.get('running')?.length || 0} running, ${userWorkoutsRef.current.get('walking')?.length || 0} walking, ${userWorkoutsRef.current.get('cycling')?.length || 0} cycling`);

          // Merge any workouts received during initial fetch
          if (baselineRef.current && isMounted.current) {
            const hasWorkouts =
              (userWorkoutsRef.current.get('running')?.length || 0) > 0 ||
              (userWorkoutsRef.current.get('walking')?.length || 0) > 0 ||
              (userWorkoutsRef.current.get('cycling')?.length || 0) > 0;

            if (hasWorkouts) {
              const updatedLeaderboards = {
                running: LeaderboardBaselineService.mergeSeason2UserWorkouts(
                  baselineRef.current.running,
                  userWorkoutsRef.current.get('running') || [],
                  userPubkey
                ),
                walking: LeaderboardBaselineService.mergeSeason2UserWorkouts(
                  baselineRef.current.walking,
                  userWorkoutsRef.current.get('walking') || [],
                  userPubkey
                ),
                cycling: LeaderboardBaselineService.mergeSeason2UserWorkouts(
                  baselineRef.current.cycling,
                  userWorkoutsRef.current.get('cycling') || [],
                  userPubkey
                ),
              };

              setLeaderboards(updatedLeaderboards);
              setIsBaselineOnly(false);
            }
          }
        });

        subscriptionRef.current = sub;
      } catch (err) {
        console.error(`[useSeason2] User subscription error:`, err);
      }
    };

    setup();

    return () => {
      isMounted.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.stop();
        subscriptionRef.current = null;
      }
    };
  }, [currentUserPubkey]);

  // Refresh: Re-fetch baseline + user workouts
  const refreshAll = useCallback(async () => {
    setError(null);
    const t0 = Date.now();
    console.log(`[useSeason2] ========== REFRESH START ==========`);

    try {
      // Clear user's cached workouts
      userWorkoutsRef.current = new Map([
        ['running', []],
        ['walking', []],
        ['cycling', []],
      ]);

      // Re-fetch baseline note
      console.log(`[useSeason2] T+${Date.now() - t0}ms: Re-fetching baseline...`);
      const baseline = await LeaderboardBaselineService.fetchBaseline(true);

      if (baseline && isMounted.current) {
        baselineRef.current = baseline.season2;
        setLeaderboards(baseline.season2);
        setIsBaselineOnly(true);

        const cutoffDate = new Date(baseline.cutoffTimestamp * 1000);
        setBaselineDate(
          `${(cutoffDate.getMonth() + 1).toString().padStart(2, '0')}/${cutoffDate.getDate().toString().padStart(2, '0')}/${cutoffDate.getFullYear()}`
        );

        // Re-fetch user's workouts since cutoff
        if (currentUserPubkey) {
          console.log(`[useSeason2] T+${Date.now() - t0}ms: Fetching user's recent workouts...`);
          const userWorkouts = await fetchUserWorkoutsSinceCutoff(
            currentUserPubkey,
            baseline.cutoffTimestamp
          );

          if (userWorkouts.size > 0 && isMounted.current) {
            userWorkoutsRef.current = userWorkouts;

            const updatedLeaderboards = {
              running: LeaderboardBaselineService.mergeSeason2UserWorkouts(
                baseline.season2.running,
                userWorkouts.get('running') || [],
                currentUserPubkey
              ),
              walking: LeaderboardBaselineService.mergeSeason2UserWorkouts(
                baseline.season2.walking,
                userWorkouts.get('walking') || [],
                currentUserPubkey
              ),
              cycling: LeaderboardBaselineService.mergeSeason2UserWorkouts(
                baseline.season2.cycling,
                userWorkouts.get('cycling') || [],
                currentUserPubkey
              ),
            };

            setLeaderboards(updatedLeaderboards);
            setIsBaselineOnly(false);
          }
        }

        console.log(`[useSeason2] T+${Date.now() - t0}ms: Refresh complete`);
      } else {
        // Fallback to memory-based refresh
        console.log(`[useSeason2] T+${Date.now() - t0}ms: No baseline, using fallback...`);
        const data = await Season2Service.getAllLeaderboardsFromMemory(currentUserPubkey);
        if (isMounted.current) {
          baselineRef.current = data;
          setLeaderboards(data);
        }
      }

      console.log(`[useSeason2] ========== REFRESH COMPLETE in ${Date.now() - t0}ms ==========`);
    } catch (err) {
      console.error(`[useSeason2] Refresh error:`, err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to refresh');
      }
    }
  }, [currentUserPubkey]);

  return {
    leaderboards,
    isLoading,
    error,
    refreshAll,
    currentUserPubkey,
    isBaselineOnly,
    baselineDate,
  };
}

/**
 * Fetch user's workouts since cutoff (for refresh)
 */
async function fetchUserWorkoutsSinceCutoff(
  userPubkey: string,
  cutoffTimestamp: number
): Promise<Map<Season2ActivityType, Array<{ distance: number; charityId?: string }>>> {
  const workouts = new Map<Season2ActivityType, Array<{ distance: number; charityId?: string }>>([
    ['running', []],
    ['walking', []],
    ['cycling', []],
  ]);

  try {
    const ndk = await GlobalNDKService.getInstance();

    const filter: NDKFilter = {
      kinds: [1301 as any],
      authors: [userPubkey],
      since: cutoffTimestamp,
    };

    const events = await ndk.fetchEvents(filter);

    for (const event of events) {
      const workout = parseWorkoutEvent(event);
      if (workout) {
        const activityWorkouts = workouts.get(workout.activityType) || [];
        activityWorkouts.push({ distance: workout.distance, charityId: workout.charityId });
        workouts.set(workout.activityType, activityWorkouts);
      }
    }

    console.log(
      `[useSeason2] Fetched user workouts: running=${workouts.get('running')?.length || 0}, walking=${workouts.get('walking')?.length || 0}, cycling=${workouts.get('cycling')?.length || 0}`
    );
  } catch (err) {
    console.error(`[useSeason2] Fetch user workouts error:`, err);
  }

  return workouts;
}

// ============================================================================
// useSeason2Registration - Registration status hook
// ============================================================================

interface UseSeason2RegistrationReturn {
  isRegistered: boolean;
  isOfficial: boolean;
  isLocalOnly: boolean;
  isLoading: boolean;
  joinLocally: () => Promise<void>;
  openPaymentPage: () => void;
  refresh: () => Promise<void>;
}

/**
 * Hook for Season 2 registration status and actions
 */
export function useSeason2Registration(): UseSeason2RegistrationReturn {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);
  const [isLocalOnly, setIsLocalOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  const checkRegistration = useCallback(async () => {
    setIsLoading(true);

    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) {
        if (isMounted.current) {
          setIsRegistered(false);
          setIsOfficial(false);
          setIsLocalOnly(false);
        }
        return;
      }

      const status = await Season2Service.isUserRegistered(userPubkey);

      if (isMounted.current) {
        setIsRegistered(status.isRegistered);
        setIsOfficial(status.isOfficial);
        setIsLocalOnly(status.isLocalOnly);
      }
    } catch (err) {
      console.error('[useSeason2Registration] Error:', err);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const joinLocally = useCallback(async () => {
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) {
        throw new Error('User not logged in');
      }

      await Season2Service.joinLocally(userPubkey);

      setIsRegistered(true);
      setIsLocalOnly(true);
    } catch (err) {
      console.error('[useSeason2Registration] Join error:', err);
      throw err;
    }
  }, []);

  const openPaymentPage = useCallback(() => {
    const { Linking } = require('react-native');

    if (SEASON_2_CONFIG.paymentUrl) {
      Linking.openURL(SEASON_2_CONFIG.paymentUrl);
    } else {
      console.warn('[Season2] Payment URL not configured');
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    checkRegistration();

    return () => {
      isMounted.current = false;
    };
  }, [checkRegistration]);

  return {
    isRegistered,
    isOfficial,
    isLocalOnly,
    isLoading,
    joinLocally,
    openPaymentPage,
    refresh: checkRegistration,
  };
}

// ============================================================================
// useSeason2Status - Season status hook
// ============================================================================

interface UseSeason2StatusReturn {
  status: Season2Status;
  dateRange: string;
  isActive: boolean;
  isUpcoming: boolean;
  isEnded: boolean;
  prizePoolBonus: number;
  prizePoolCharity: number;
}

/**
 * Hook for Season 2 status information
 */
export function useSeason2Status(): UseSeason2StatusReturn {
  const status = getSeason2Status();
  const dateRange = getSeason2DateRange();

  return {
    status,
    dateRange,
    isActive: status === 'active',
    isUpcoming: status === 'upcoming',
    isEnded: status === 'ended',
    prizePoolBonus: SEASON_2_CONFIG.prizePoolBonus,
    prizePoolCharity: SEASON_2_CONFIG.prizePoolCharity,
  };
}

// ============================================================================
// Exports
// ============================================================================

export type {
  UseSeason2LeaderboardReturn,
  UseAllSeason2LeaderboardsReturn,
  AllSeason2Leaderboards,
  UseSeason2RegistrationReturn,
  UseSeason2StatusReturn,
};
