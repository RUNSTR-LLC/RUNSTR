/**
 * ProfileDataService - Supabase queries for unified profile page
 *
 * Provides stats, personal records, competitions, recent workouts, and club data
 * for any user (self or others). All methods accept npub format.
 * Results are cached in-memory with 5-minute TTL.
 */

import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import localWorkoutStorage, { LocalWorkout } from '../fitness/LocalWorkoutStorageService';

const TAG = '[ProfileDataService]';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Exported Types
// ---------------------------------------------------------------------------

export interface ProfileStats {
  totalWorkouts: number;
  totalDistanceKm: number;
  longestStreakDays: number;
  currentStreakDays: number;
}

export interface PersonalRecord {
  category: '5k' | '10k' | 'half' | 'marathon';
  bestTimeSeconds: number;
  date: string; // ISO timestamp
}

export interface ActiveCompetition {
  id: string;
  name: string;
  rank: number;
  totalParticipants: number;
}

export interface RecentWorkout {
  id: string;
  activityType: string;
  distanceKm?: number;
  durationSeconds?: number;
  reps?: number;
  createdAt: string; // ISO timestamp
}

export interface ClubAffiliation {
  id: string;
  name: string;
  role: 'member' | 'captain';
  memberCount: number;
  imageUrl?: string;
}

export interface ActivityBreakdownData {
  cardio: number;
  strength: number;
  wellness: number;
  total: number;
  cardioPercent: number;
  strengthPercent: number;
  wellnessPercent: number;
}

export interface ProfileLevelData {
  level: number;
  title: string;
  currentXP: number;
  xpForNextLevel: number;
  progress: number; // 0-1
  totalXP: number;
  currentStreak: number;
  bestStreak: number;
}

// ---------------------------------------------------------------------------
// In-memory Cache
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const DEFAULT_STATS: ProfileStats = {
  totalWorkouts: 0,
  totalDistanceKm: 0,
  longestStreakDays: 0,
  currentStreakDays: 0,
};

// Activity category mapping
const ACTIVITY_CATEGORY_MAP: Record<string, 'cardio' | 'strength' | 'wellness'> = {
  running: 'cardio', run: 'cardio', walking: 'cardio', walk: 'cardio',
  cycling: 'cardio', cycle: 'cardio', hiking: 'cardio', hike: 'cardio',
  pushups: 'strength', pullups: 'strength', situps: 'strength',
  squats: 'strength', curls: 'strength', bench: 'strength',
  gym: 'strength', strength: 'strength', strength_training: 'strength',
  guided: 'wellness', unguided: 'wellness', breathwork: 'wellness',
  body_scan: 'wellness', gratitude: 'wellness', meditation: 'wellness',
  journal: 'wellness', habits: 'wellness', diet: 'wellness', fasting: 'wellness',
};

// PR distance targets in meters with a tolerance band
const PR_TARGETS: Array<{
  category: PersonalRecord['category'];
  minMeters: number;
  maxMeters: number;
}> = [
  { category: '5k', minMeters: 4500, maxMeters: 5500 },
  { category: '10k', minMeters: 9500, maxMeters: 10500 },
  { category: 'half', minMeters: 20597, maxMeters: 21597 },
  { category: 'marathon', minMeters: 41695, maxMeters: 42695 },
];

export class ProfileDataService {
  // -----------------------------------------------------------------------
  // getUserStats
  // -----------------------------------------------------------------------

  /**
   * Aggregate workout stats for a user: total workouts, total distance,
   * longest streak, and current streak.
   */
  static async getUserStats(npub: string): Promise<ProfileStats> {
    const cacheKey = `profile_stats_${npub}`;
    const cached = getCached<ProfileStats>(cacheKey);
    if (cached) return cached;

    if (!isSupabaseConfigured()) return DEFAULT_STATS;

    try {
      const { data, error } = await supabase!
        .from('workout_submissions')
        .select('id, distance_meters, created_at')
        .eq('npub', npub)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error || !data) {
        console.warn(TAG, 'getUserStats error:', error?.message);
        return DEFAULT_STATS;
      }

      const totalWorkouts = data.length;
      const totalDistanceKm = data.reduce(
        (sum, w) => sum + ((w.distance_meters ?? 0) / 1000),
        0,
      );

      // Compute streaks from unique workout dates (UTC)
      const uniqueDates = [
        ...new Set(
          data.map((w) => w.created_at?.slice(0, 10)).filter(Boolean),
        ),
      ].sort((a, b) => (b > a ? 1 : -1)); // descending

      const { longestStreakDays, currentStreakDays } =
        computeStreaks(uniqueDates);

      const stats: ProfileStats = {
        totalWorkouts,
        totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
        longestStreakDays,
        currentStreakDays,
      };

      setCache(cacheKey, stats);
      return stats;
    } catch (err) {
      console.warn(TAG, 'getUserStats exception:', err);
      return DEFAULT_STATS;
    }
  }

  // -----------------------------------------------------------------------
  // getUserPRs
  // -----------------------------------------------------------------------

  /**
   * Personal records by distance category (5K, 10K, Half, Marathon).
   * Finds the fastest time for workouts within each distance band.
   */
  static async getUserPRs(npub: string): Promise<PersonalRecord[]> {
    const cacheKey = `profile_prs_${npub}`;
    const cached = getCached<PersonalRecord[]>(cacheKey);
    if (cached) return cached;

    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase!
        .from('workout_submissions')
        .select('distance_meters, duration_seconds, created_at')
        .eq('npub', npub)
        .not('distance_meters', 'is', null)
        .not('duration_seconds', 'is', null)
        .gt('duration_seconds', 0)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error || !data) {
        console.warn(TAG, 'getUserPRs error:', error?.message);
        return [];
      }

      const prs: PersonalRecord[] = [];

      for (const target of PR_TARGETS) {
        let best: { time: number; date: string } | null = null;

        for (const w of data) {
          const dist = w.distance_meters as number;
          const dur = w.duration_seconds as number;

          if (dist >= target.minMeters && dist <= target.maxMeters) {
            if (!best || dur < best.time) {
              best = { time: dur, date: w.created_at };
            }
          }
        }

        if (best) {
          prs.push({
            category: target.category,
            bestTimeSeconds: best.time,
            date: best.date,
          });
        }
      }

      setCache(cacheKey, prs);
      return prs;
    } catch (err) {
      console.warn(TAG, 'getUserPRs exception:', err);
      return [];
    }
  }

  // -----------------------------------------------------------------------
  // getUserActiveCompetitions
  // -----------------------------------------------------------------------

  /**
   * Competitions the user is currently entered in.
   * Returns rank=0 (unranked) — full rank requires the leaderboard
   * query in SupabaseCompetitionService which is too heavy for a profile view.
   */
  static async getUserActiveCompetitions(
    npub: string,
  ): Promise<ActiveCompetition[]> {
    const cacheKey = `profile_competitions_${npub}`;
    const cached = getCached<ActiveCompetition[]>(cacheKey);
    if (cached) return cached;

    if (!isSupabaseConfigured()) return [];

    try {
      const now = new Date().toISOString();

      const { data: participations, error } = await supabase!
        .from('competition_participants')
        .select(`
          competition_id,
          competitions!inner ( id, name, start_date, end_date )
        `)
        .eq('npub', npub)
        .lte('competitions.start_date', now)
        .gte('competitions.end_date', now);

      if (error || !participations) {
        console.warn(TAG, 'getUserActiveCompetitions error:', error?.message);
        return [];
      }

      const results: ActiveCompetition[] = [];

      for (const p of participations) {
        const comp = p.competitions as unknown as { id: string; name: string };
        if (!comp) continue;

        const { count } = await supabase!
          .from('competition_participants')
          .select('*', { count: 'exact', head: true })
          .eq('competition_id', comp.id);

        results.push({
          id: comp.id,
          name: comp.name,
          rank: 0, // Unranked — see SupabaseCompetitionService for full leaderboard
          totalParticipants: count ?? 0,
        });
      }

      setCache(cacheKey, results);
      return results;
    } catch (err) {
      console.warn(TAG, 'getUserActiveCompetitions exception:', err);
      return [];
    }
  }

  // -----------------------------------------------------------------------
  // getUserRecentWorkouts
  // -----------------------------------------------------------------------

  /**
   * Last N workouts for a user.
   */
  static async getUserRecentWorkouts(
    npub: string,
    limit: number = 10,
  ): Promise<RecentWorkout[]> {
    const cacheKey = `profile_workouts_${npub}_${limit}`;
    const cached = getCached<RecentWorkout[]>(cacheKey);
    if (cached) return cached;

    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase!
        .from('workout_submissions')
        .select('id, activity_type, distance_meters, duration_seconds, step_count, created_at')
        .eq('npub', npub)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) {
        console.warn(TAG, 'getUserRecentWorkouts error:', error?.message);
        return [];
      }

      const workouts: RecentWorkout[] = data.map((w) => ({
        id: w.id,
        activityType: w.activity_type ?? 'unknown',
        distanceKm: w.distance_meters != null
          ? Math.round((w.distance_meters / 1000) * 100) / 100
          : undefined,
        durationSeconds: w.duration_seconds ?? undefined,
        // step_count column doubles as reps storage (no dedicated reps column in schema)
        reps: w.step_count ?? undefined,
        createdAt: w.created_at,
      }));

      setCache(cacheKey, workouts);
      return workouts;
    } catch (err) {
      console.warn(TAG, 'getUserRecentWorkouts exception:', err);
      return [];
    }
  }

  // -----------------------------------------------------------------------
  // getUserClubs
  // -----------------------------------------------------------------------

  /**
   * Club memberships for a user, with role and member count.
   * Joins club_memberships with user_teams to get club details.
   */
  static async getUserClubs(npub: string): Promise<ClubAffiliation[]> {
    const cacheKey = `profile_clubs_${npub}`;
    const cached = getCached<ClubAffiliation[]>(cacheKey);
    if (cached) return cached;

    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase!
          .from('club_memberships')
          .select(`
            role,
            user_teams!inner (
              id,
              name,
              member_count,
              is_active,
              banner_url
            )
          `)
          .eq('member_npub', npub);

        if (!error && data) {
          const clubs: ClubAffiliation[] = [];

          for (const row of data) {
            const club = row.user_teams as unknown as {
              id: string;
              name: string;
              member_count: number;
              is_active: boolean;
              banner_url: string | null;
            };
            if (!club || !club.is_active) continue;

            clubs.push({
              id: club.id,
              name: club.name,
              role: row.role as 'member' | 'captain',
              memberCount: club.member_count,
              imageUrl: club.banner_url || undefined,
            });
          }

          if (clubs.length > 0) {
            setCache(cacheKey, clubs);
            return clubs;
          }
        } else {
          console.warn(TAG, 'getUserClubs Supabase error:', error?.message);
        }
      } catch (err) {
        console.warn(TAG, 'getUserClubs Supabase exception:', err);
      }
    }

    // Fallback: read local club cache from ClubMembershipService
    try {
      const [clubId, clubName, clubRole] = await Promise.all([
        AsyncStorage.getItem('@runstr:club_id'),
        AsyncStorage.getItem('@runstr:club_name'),
        AsyncStorage.getItem('@runstr:club_role'),
      ]);
      if (clubId && clubName) {
        const localClub: ClubAffiliation = {
          id: clubId,
          name: clubName,
          role: (clubRole as 'member' | 'captain') || 'member',
          memberCount: 0,
        };
        return [localClub];
      }
    } catch {
      // No local cache either
    }

    return [];
  }

  // -----------------------------------------------------------------------
  // getActivityBreakdown
  // -----------------------------------------------------------------------

  static async getActivityBreakdown(npub: string): Promise<ActivityBreakdownData> {
    const defaultData: ActivityBreakdownData = {
      cardio: 0, strength: 0, wellness: 0, total: 0,
      cardioPercent: 0, strengthPercent: 0, wellnessPercent: 0,
    };

    const cacheKey = `profile_breakdown_${npub}`;
    const cached = getCached<ActivityBreakdownData>(cacheKey);
    if (cached) return cached;

    if (!isSupabaseConfigured()) return defaultData;

    try {
      const { data, error } = await supabase!
        .from('workout_submissions')
        .select('activity_type')
        .eq('npub', npub)
        .limit(1000);

      if (error || !data) {
        console.warn(TAG, 'getActivityBreakdown error:', error?.message);
        return defaultData;
      }

      let cardio = 0, strength = 0, wellness = 0;

      for (const row of data) {
        const type = (row.activity_type || '').toLowerCase();
        const category = ACTIVITY_CATEGORY_MAP[type];
        if (category === 'cardio') cardio++;
        else if (category === 'strength') strength++;
        else if (category === 'wellness') wellness++;
        else cardio++; // Default unknown types to cardio
      }

      const total = cardio + strength + wellness;
      const result: ActivityBreakdownData = {
        cardio, strength, wellness, total,
        cardioPercent: total > 0 ? Math.round((cardio / total) * 100) : 0,
        strengthPercent: total > 0 ? Math.round((strength / total) * 100) : 0,
        wellnessPercent: total > 0 ? Math.round((wellness / total) * 100) : 0,
      };

      setCache(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(TAG, 'getActivityBreakdown exception:', err);
      return defaultData;
    }
  }

  // -----------------------------------------------------------------------
  // getLevelData
  // -----------------------------------------------------------------------

  static async getLevelData(npub: string): Promise<ProfileLevelData> {
    const defaultData: ProfileLevelData = {
      level: 0, title: 'Beginner', currentXP: 0, xpForNextLevel: 500,
      progress: 0, totalXP: 0, currentStreak: 0, bestStreak: 0,
    };

    const cacheKey = `profile_level_${npub}`;
    const cached = getCached<ProfileLevelData>(cacheKey);
    if (cached) return cached;

    try {
      // Check if this is the current user's own profile
      const currentNpub = await AsyncStorage.getItem('@runstr:npub');
      const isOwnProfile = currentNpub && currentNpub === npub;

      let workouts: Array<{ id: string; type: string; distance?: number; duration?: number; startTime: string }> = [];

      if (isOwnProfile) {
        // Own profile: use local storage (works offline, with private mode, etc.)
        const localWorkouts: LocalWorkout[] = await localWorkoutStorage.getAllWorkouts();
        workouts = localWorkouts.map(w => ({
          id: w.id,
          type: (w.type || 'unknown').toLowerCase(),
          distance: w.distance,
          duration: w.duration,
          startTime: w.startTime,
        }));
        console.log(TAG, `getLevelData: own profile, ${workouts.length} local workouts`);
      }

      // If no local workouts found (or viewing another user), try Supabase
      if (workouts.length === 0 && isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from('workout_submissions')
          .select('id, activity_type, distance_meters, duration_seconds, created_at')
          .eq('npub', npub)
          .order('created_at', { ascending: false })
          .limit(1000);

        if (error) {
          console.warn(TAG, 'getLevelData Supabase error:', error.message);
        } else if (data && data.length > 0) {
          workouts = data.map(w => ({
            id: w.id,
            type: (w.activity_type || 'unknown').toLowerCase(),
            distance: w.distance_meters ?? undefined,
            duration: w.duration_seconds ?? undefined,
            startTime: w.created_at,
          }));
        }
      }

      if (workouts.length === 0) return defaultData;

      // Calculate level from workouts
      const { WorkoutLevelService } = require('../../services/fitness/WorkoutLevelService');
      const levelService = WorkoutLevelService.getInstance();
      const stats = levelService.calculateLevelStats(workouts);

      // Compute streaks
      const uniqueDates = [
        ...new Set(workouts.map(w => w.startTime?.slice(0, 10)).filter(Boolean)),
      ].sort((a, b) => (b > a ? 1 : -1));
      const { longestStreakDays, currentStreakDays } = computeStreaks(uniqueDates);

      const result: ProfileLevelData = {
        level: stats.level.level,
        title: stats.level.title,
        currentXP: stats.level.currentXP,
        xpForNextLevel: stats.level.xpForNextLevel,
        progress: stats.level.progress,
        totalXP: stats.level.totalXP,
        currentStreak: currentStreakDays,
        bestStreak: longestStreakDays,
      };

      setCache(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(TAG, 'getLevelData exception:', err);
      return defaultData;
    }
  }

  // -----------------------------------------------------------------------
  // clearProfileCache
  // -----------------------------------------------------------------------

  /**
   * Clear cached profile data. If npub is provided, clears only that user's
   * cache entries. Otherwise clears all profile cache.
   */
  static clearProfileCache(npub?: string): void {
    if (!npub) {
      cache.clear();
      return;
    }

    const prefix = `profile_`;
    for (const key of cache.keys()) {
      if (key.startsWith(prefix) && key.includes(npub)) {
        cache.delete(key);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute longest and current streak from a descending-sorted array of
 * unique date strings (YYYY-MM-DD).
 */
function computeStreaks(
  sortedDatesDesc: string[],
): { longestStreakDays: number; currentStreakDays: number } {
  if (sortedDatesDesc.length === 0) {
    return { longestStreakDays: 0, currentStreakDays: 0 };
  }

  // Convert to ascending order for easier streak calculation
  const dates = [...sortedDatesDesc].reverse();

  let longestStreak = 1;
  let currentStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  // Current streak: count backwards from the most recent date
  // Check if the most recent workout was today or yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mostRecent = new Date(dates[dates.length - 1]);
  mostRecent.setHours(0, 0, 0, 0);
  const daysSinceLast = Math.round(
    (today.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (daysSinceLast > 1) {
    // Streak is broken (last workout was more than yesterday)
    currentStreak = 0;
  } else {
    // Count consecutive days backwards from most recent
    currentStreak = 1;
    for (let i = dates.length - 2; i >= 0; i--) {
      const curr = new Date(dates[i + 1]);
      const prev = new Date(dates[i]);
      const diffMs = curr.getTime() - prev.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { longestStreakDays: longestStreak, currentStreakDays: currentStreak };
}
