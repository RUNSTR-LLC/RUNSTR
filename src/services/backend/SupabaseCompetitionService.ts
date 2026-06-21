/**
 * Supabase Competition Service
 *
 * Handles all competition-related backend operations:
 * - Join/leave competitions (participant management)
 * - Submit workouts for competition tracking (workout verification)
 * - Fetch leaderboards (pre-computed from database)
 *
 * Privacy-preserving: Only stores data when users explicitly opt-in
 * by clicking "Join" on a competition or "Compete" on a workout.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  supabase,
  isSupabaseConfigured,
  Competition,
  WorkoutSubmission,
  LeaderboardEntry,
  CharityRanking,
} from '../../utils/supabase';
import { getCharityById } from '../../constants/charities';
import { getClubLightningAddress } from '../../utils/rewardTags';
import { callEdgeFunction } from '../../utils/edgeFunctions';

// Local storage key for tracking joined competitions (optimistic join)
const LOCAL_JOINED_COMPETITIONS_KEY = '@runstr:local_joined_competitions';

// Nostr event type for kind 1301 workouts
interface NostrEvent {
  id: string;
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
  pubkey: string;
  sig: string;
}

// Simplified workout data for submission (matches PublishableWorkout structure)
interface WorkoutSubmissionData {
  eventId: string; // Nostr event ID after publishing
  npub: string;
  type: string; // running, walking, cycling, etc.
  distance?: number; // in meters
  duration: number; // in seconds
  calories?: number;
  startTime: string; // ISO timestamp
  // Daily leaderboard fields (optional)
  tags?: string[][]; // Nostr event tags for split/step parsing
  profileName?: string; // User's display name for leaderboard caching
  profilePicture?: string; // User's avatar URL for leaderboard caching
}

// Cache key and TTL for dynamic competitions
const DYNAMIC_COMPETITIONS_CACHE_KEY = '@runstr:dynamic_competitions';
const DYNAMIC_COMPETITIONS_TTL = 5 * 60 * 1000; // 5 minutes

export class SupabaseCompetitionService {
  // Hardcoded events that have dedicated screens - exclude from dynamic list
  private static HARDCODED_EVENT_IDS = [
    'season-ii', 'running-bitcoin', 'january-walking',
    'einundzwanzig', 'einundzwanzig-running', 'einundzwanzig-walking',
    'season2-running', 'season2-walking', 'season2-cycling',
  ];

  /**
   * Fetch dynamic competitions (excludes hardcoded events with dedicated screens)
   * Results are cached in AsyncStorage for 5 minutes.
   */
  static async fetchDynamicCompetitions(): Promise<Competition[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    // Check cache first
    try {
      const cached = await AsyncStorage.getItem(DYNAMIC_COMPETITIONS_CACHE_KEY);
      if (cached) {
        let parsed;
        try {
          parsed = JSON.parse(cached);
        } catch {
          // Corrupted cache (e.g., device reboot mid-write), remove it
          console.warn('[SupabaseCompetitionService] Corrupted dynamic competitions cache, removing');
          await AsyncStorage.removeItem(DYNAMIC_COMPETITIONS_CACHE_KEY);
          parsed = null;
        }
        if (parsed && Date.now() - parsed.timestamp < DYNAMIC_COMPETITIONS_TTL) {
          return parsed.data as Competition[];
        }
      }
    } catch {
      // AsyncStorage read failed, continue to fetch
    }

    try {
      const { data, error } = await supabase!
        .from('competitions')
        .select('*')
        .not('external_id', 'in', `(${this.HARDCODED_EVENT_IDS.join(',')})`)
        .order('start_date', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[SupabaseCompetitionService] fetchDynamicCompetitions error:', error);
        return [];
      }

      const competitions = (data || []) as Competition[];

      // Save to cache
      try {
        await AsyncStorage.setItem(
          DYNAMIC_COMPETITIONS_CACHE_KEY,
          JSON.stringify({ data: competitions, timestamp: Date.now() })
        );
      } catch {
        // Cache write failed, non-critical
      }

      return competitions;
    } catch (err) {
      console.error('[SupabaseCompetitionService] fetchDynamicCompetitions exception:', err);
      return [];
    }
  }

  /**
   * Join a competition via Edge Function.
   * Uses optimistic pattern: save locally first for instant UI.
   */
  static async joinCompetition(
    competitionId: string,
    npub: string,
    profile?: { name?: string; picture?: string }
  ): Promise<{ success: boolean; error?: string }> {
    // OPTIMISTIC: Save locally FIRST for instant UI feedback
    await this.saveLocalJoin(competitionId, npub);

    // Resolve competition ID (could be UUID or external_id)
    const resolvedId = await this.resolveCompetitionId(competitionId);
    if (!resolvedId) {
      console.warn('[SupabaseCompetitionService] Competition not found - local join only');
      return { success: true };
    }

    const result = await callEdgeFunction('manage-competition', {
      action: 'join',
      competition_id: resolvedId,
      npub,
      ...(profile?.name ? { name: profile.name } : {}),
      ...(profile?.picture ? { picture: profile.picture } : {}),
    });

    if (!result.success) {
      console.warn('[SupabaseCompetitionService] Edge Function join error (local join succeeded):', result.error);
      return { success: true }; // Optimistic: local join worked
    }

    console.log(
      `[SupabaseCompetitionService] Joined competition: ${competitionId}${profile?.name ? ` (${profile.name})` : ''}`
    );
    return { success: true };
  }

  /**
   * Leave a competition via Edge Function.
   */
  static async leaveCompetition(
    competitionId: string,
    npub: string
  ): Promise<{ success: boolean; error?: string }> {
    const resolvedId = await this.resolveCompetitionId(competitionId);
    if (!resolvedId) {
      return { success: false, error: 'Competition not found' };
    }

    const result = await callEdgeFunction('manage-competition', {
      action: 'leave',
      competition_id: resolvedId,
      npub,
    });

    if (!result.success) {
      console.error('[SupabaseCompetitionService] Leave error:', result.error);
      return { success: false, error: result.error };
    }

    console.log(`[SupabaseCompetitionService] Left competition: ${competitionId}`);
    await this.removeLocalJoin(competitionId, npub);
    return { success: true };
  }

  /**
   * Check if a user is participating in a competition
   * Checks local storage first for instant response, then falls back to Supabase
   *
   * @param competitionId - The competition UUID or external_id
   * @param npub - User's Nostr public key
   * @returns Whether the user is a participant
   */
  static async isParticipant(
    competitionId: string,
    npub: string
  ): Promise<boolean> {
    // Check local storage first (instant, works offline)
    const isLocalJoined = await this.isLocallyJoined(competitionId, npub);
    if (isLocalJoined) {
      return true;
    }

    if (!isSupabaseConfigured()) {
      return false;
    }

    try {
      const resolvedId = await this.resolveCompetitionId(competitionId);
      if (!resolvedId) {
        return false;
      }

      const { data, error } = await supabase!
        .from('competition_participants')
        .select('id')
        .match({ competition_id: resolvedId, npub })
        .single();

      const isParticipating = !error && !!data;

      // Sync to local storage if found in Supabase but not locally
      if (isParticipating) {
        await this.saveLocalJoin(competitionId, npub);
      }

      return isParticipating;
    } catch {
      return false;
    }
  }

  /**
   * Check if a user is in ANY active competition
   * Used to determine if workouts should be submitted to Supabase
   *
   * @param npub - User's Nostr public key (npub format)
   * @returns true if user is in at least one active competition
   */
  static async isInAnyActiveCompetition(npub: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }

    try {
      const now = new Date().toISOString();

      // Query competition_participants joined with competitions
      // to find any active competition the user is participating in
      const { data, error } = await supabase!
        .from('competition_participants')
        .select(`
          id,
          competitions!inner (
            id,
            start_date,
            end_date
          )
        `)
        .eq('npub', npub)
        .lte('competitions.start_date', now)
        .gte('competitions.end_date', now)
        .limit(1);

      if (error) {
        console.warn('[SupabaseCompetitionService] isInAnyActiveCompetition error:', error);
        return false;
      }

      const isActive = data && data.length > 0;
      console.log(`[SupabaseCompetitionService] User ${npub.slice(0, 12)}... in active competition: ${isActive}`);
      return isActive;
    } catch (err) {
      console.warn('[SupabaseCompetitionService] isInAnyActiveCompetition exception:', err);
      return false;
    }
  }

  /**
   * Submit a workout for competition tracking (from PublishableWorkout + eventId)
   *
   * This is the PRIMARY method - called when user clicks "Compete" button
   * after the workout has been published to Nostr.
   *
   * Now routes through Supabase Edge Function for server-side anti-cheat validation.
   * Valid workouts → workout_submissions table
   * Invalid workouts → flagged_workouts table (for admin review)
   *
   * @param data - Workout submission data (eventId, npub, type, distance, duration, etc.)
   * @returns Success status with optional flagged indicator
   */
  static async submitWorkoutSimple(
    data: WorkoutSubmissionData
  ): Promise<{ success: boolean; error?: string; flagged?: boolean }> {
    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseCompetitionService] Supabase not configured, skipping submission');
      return { success: false, error: 'Backend not configured' };
    }

    // Private Mode: skip all Supabase submissions when enabled
    try {
      const privateMode = await AsyncStorage.getItem('@runstr:private_mode');
      if (privateMode === 'true') {
        console.log('[SupabaseCompetitionService] Private mode enabled, skipping Supabase submission');
        return { success: false, error: 'Private mode enabled' };
      }
    } catch {
      // Non-critical — proceed with submission if check fails
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[SupabaseCompetitionService] Missing Supabase environment variables');
      return { success: false, error: 'Backend not configured' };
    }

    // PPQ.AI rewards are now created server-side by the reward payer (runstr-zapper),
    // which reads the user's key from ppq_accounts and creates the topup invoice for
    // the exact reward amount. The client no longer creates invoices here — that broke
    // for background-synced workouts (no app => no invoice). See
    // docs/superpowers/specs/2026-06-21-ppq-backend-invoice-design.md
    const submissionTags = data.tags || [];

    // Resolve club data BEFORE starting the fetch timeout
    // These were previously inside JSON.stringify body where they bypassed the AbortController
    let clubId: string | null = null;
    let clubLightningAddress: string | null = null;
    try {
      clubId = await AsyncStorage.getItem('@runstr:club_id') || null;
      clubLightningAddress = await getClubLightningAddress();
    } catch (clubErr) {
      console.warn('[SupabaseCompetitionService] Club data lookup failed (non-blocking):', clubErr);
    }

    // CRASH FIX: Add timeout to prevent indefinite hang on network issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      // Call Edge Function for server-side validation
      const response = await fetch(
        `${supabaseUrl}/functions/v1/submit-workout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            event_id: data.eventId,
            npub: data.npub,
            activity_type: data.type,
            distance_meters: data.distance ?? null,
            duration_seconds: data.duration,
            calories: data.calories || null,
            created_at: data.startTime,
            // TIMEZONE FIX: Use getFullYear/getMonth/getDate (always local timezone)
            // toLocaleDateString('en-CA') can return UTC date in Hermes/React Native
            // Must match DailyLeaderboardService's date computation exactly
            leaderboard_date: (() => {
              const now = new Date();
              return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            })(),
            // Daily leaderboard: Pass profile data for caching
            profile_name: data.profileName || null,
            profile_picture: data.profilePicture || null,
            // Club association (separate from charity/team)
            club_id: clubId,
            club_lightning_address: clubLightningAddress,
            raw_event: {
              event_id: data.eventId,
              type: data.type,
              distance: data.distance,
              duration: data.duration,
              calories: data.calories,
              submitted_via: 'runstr_app',
              submitted_at: new Date().toISOString(),
              // Daily leaderboard: Pass tags for split/step parsing
              tags: submissionTags,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // CRASH FIX: Check response status before parsing JSON
      if (!response.ok) {
        console.error(`[SupabaseCompetitionService] HTTP error: ${response.status}`);
        return { success: false, error: `HTTP ${response.status}` };
      }

      // CRASH FIX: Wrap JSON parsing in try-catch for malformed responses
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('[SupabaseCompetitionService] Failed to parse response JSON:', jsonError);
        return { success: false, error: 'Invalid response from server' };
      }

      if (result.success) {
        if (result.duplicate) {
          console.log(
            `[SupabaseCompetitionService] ℹ️ Workout already submitted: ${data.eventId}`
          );
        } else {
          console.log(
            `[SupabaseCompetitionService] ✅ Submitted workout to competition backend: ${data.eventId}`
          );
          // Note: Rewards are now triggered from the workout save flow (DailyRewardService)
          // not from competition submission, to prevent duplicate triggers
        }
        return { success: true };
      } else {
        // Workout was flagged by anti-cheat
        if (result.flagged) {
          console.warn(
            `[SupabaseCompetitionService] 🚫 Workout flagged: ${data.eventId} - ${result.reason}`
          );
          return { success: false, error: result.reason, flagged: true };
        }

        // Other error (e.g., previously flagged submission)
        console.error(
          `[SupabaseCompetitionService] Submit workout error: ${result.error || result.reason || result.message}`
        );
        return { success: false, error: result.error || result.reason || result.message };
      }
    } catch (err) {
      clearTimeout(timeoutId);

      // CRASH FIX: Handle timeout/abort errors gracefully
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('[SupabaseCompetitionService] Request timed out');
        return { success: false, error: 'Request timed out' };
      }

      console.error('[SupabaseCompetitionService] Submit workout exception:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Submit a workout for competition tracking (from raw Nostr event)
   *
   * Alternative method for when you have the full signed Nostr event.
   *
   * @param npub - User's Nostr public key
   * @param event - The signed kind 1301 Nostr event
   * @returns Success status
   */
  static async submitWorkout(
    npub: string,
    event: NostrEvent
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Backend not configured' };
    }

    // Validate event
    if (event.kind !== 1301) {
      return { success: false, error: 'Invalid event kind (must be 1301)' };
    }

    try {
      // Parse workout data from event tags
      const workoutData = this.parseWorkoutEvent(event);

      const { error } = await supabase!.from('workout_submissions').upsert(
        {
          npub,
          event_id: event.id,
          activity_type: workoutData.activityType,
          distance_meters: workoutData.distanceMeters,
          duration_seconds: workoutData.durationSeconds,
          calories: workoutData.calories,
          created_at: new Date(event.created_at * 1000).toISOString(),
          raw_event: event,
        },
        { onConflict: 'event_id' }
      );

      if (error) {
        console.error('[SupabaseCompetitionService] Submit workout error:', error);
        return { success: false, error: error.message };
      }

      console.log(
        `[SupabaseCompetitionService] Submitted workout: ${event.id}`
      );
      return { success: true };
    } catch (err) {
      console.error('[SupabaseCompetitionService] Submit workout exception:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the leaderboard for a competition
   *
   * Fetches pre-computed leaderboard from database.
   * Only includes workouts from users who have joined AND submitted via app.
   *
   * @param competitionId - The competition UUID or external_id
   * @param limit - Maximum number of entries to return (default 100)
   * @param dateOverride - Optional date range override (for demo mode)
   * @returns Leaderboard entries sorted by rank, plus charity rankings
   */
  static async getLeaderboard(
    competitionId: string,
    limit: number = 100,
    dateOverride?: { startDate: string; endDate: string },
    activityTypes?: string[], // Optional: override activity types (e.g., ['running', 'walking'] for EIN)
    requireAppSource: boolean = false // Only include workouts submitted via app (prevents fake terminal submissions)
  ): Promise<{
    leaderboard: LeaderboardEntry[];
    charityRankings: CharityRanking[];
    competition?: Competition;
    error?: string;
  }> {
    if (!isSupabaseConfigured()) {
      return { leaderboard: [], charityRankings: [], error: 'Backend not configured' };
    }

    try {
      const resolvedId = await this.resolveCompetitionId(competitionId);
      if (!resolvedId) {
        return { leaderboard: [], charityRankings: [], error: 'Competition not found' };
      }

      // Fetch competition details, participants, and banned users concurrently
      // All three queries only depend on resolvedId, not on each other
      const [compResult, participantsResult, bannedResult] = await Promise.all([
        supabase!
          .from('competitions')
          .select('*')
          .eq('id', resolvedId)
          .single(),
        supabase!
          .from('competition_participants')
          .select('npub')
          .eq('competition_id', resolvedId)
          .limit(1000),
        supabase!
          .from('banned_users')
          .select('npub')
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .limit(500),
      ]);

      const { data: competition, error: compError } = compResult;
      const { data: participants } = participantsResult;
      const { data: bannedUsers } = bannedResult;

      if (compError || !competition) {
        return { leaderboard: [], charityRankings: [], error: 'Competition not found' };
      }

      const npubs = participants?.map((p) => p.npub) || [];

      if (npubs.length === 0) {
        return { leaderboard: [], charityRankings: [], competition };
      }

      // DATA QUALITY FIX: Filter out banned users from leaderboard
      // Banned users are stored in banned_users table with optional expiry

      const bannedSet = new Set((bannedUsers || []).map((b: { npub: string }) => b.npub));
      const validNpubs = npubs.filter(npub => !bannedSet.has(npub));

      if (bannedSet.size > 0) {
        console.log(`[SupabaseCompetition] Filtered ${bannedSet.size} banned users from leaderboard`);
      }

      if (validNpubs.length === 0) {
        return { leaderboard: [], charityRankings: [], competition };
      }

      // Get workouts for participants within date range
      // Use dateOverride if provided (for demo mode), otherwise use competition dates
      const startDate = dateOverride?.startDate || competition.start_date;
      // Extend end_date to end-of-day (23:59:59.999Z) so workouts from the
      // final day are included regardless of timezone. Without this, users
      // west of UTC who work out in the evening get excluded because their
      // created_at timestamp falls after midnight UTC.
      const rawEndDate = dateOverride?.endDate || competition.end_date;
      const endDateObj = new Date(rawEndDate);
      endDateObj.setUTCHours(23, 59, 59, 999);
      const endDate = endDateObj.toISOString();

      // Use activityTypes override if provided, then check config.activity_types array,
      // and fall back to the single activity_type column for backwards compatibility
      const configTypes = (competition.config as Record<string, unknown>)?.activity_types as string[] | undefined;
      const types = activityTypes || (configTypes && configTypes.length > 0 ? configTypes : [competition.activity_type]);

      // Build query with activity type filter (single or multiple types)
      // DATA QUALITY FIX: Use validNpubs (banned users filtered)
      let workoutQuery = supabase!
        .from('workout_submissions')
        .select('npub, distance_meters, step_count, activity_type, created_at, duration_seconds, raw_event, event_id, time_5k_seconds, time_10k_seconds, time_half_seconds, time_marathon_seconds')
        .in('npub', validNpubs)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Normalize activity types to lowercase before querying
      const normalizedTypes = types.map(t => t.toLowerCase());

      // Use .in() for multiple types, .eq() for single type
      if (normalizedTypes.length === 1) {
        workoutQuery = workoutQuery.eq('activity_type', normalizedTypes[0]);
      } else {
        workoutQuery = workoutQuery.in('activity_type', normalizedTypes);
      }

      // DATA QUALITY FIX: Filter to only app-submitted workouts when required
      // This prevents fake workouts submitted via terminal from appearing in prize competitions
      if (requireAppSource) {
        workoutQuery = workoutQuery.eq('source', 'app');
      }

      const { data: rawWorkoutsData } = await workoutQuery.order('created_at', { ascending: false }).limit(2000); // Most recent first, bounded for mobile safety
      const rawWorkouts = rawWorkoutsData as unknown as WorkoutSubmission[] | null;

      // CRITICAL: Deduplicate workouts by (npub, distance, date) to prevent double-counting
      // Same workout can be submitted multiple times from different sources (GPS, HealthKit, Health Connect)
      const seenWorkoutKeys = new Set<string>();
      const isDistanceCompetition = competition.scoring_method === 'total_distance';
      const workouts = rawWorkouts?.filter((w: WorkoutSubmission) => {
        // DATA QUALITY FIX: Exclude step-based workouts with zero distance from distance competitions
        // Step submissions with estimated non-GPS distance now contribute to distance totals
        if (isDistanceCompetition) {
          const rawEvent = w.raw_event as Record<string, unknown> | null;
          const tags = rawEvent?.tags as string[][] | undefined;
          if (tags) {
            const dTag = tags.find((t: string[]) => t[0] === 'd');
            if (dTag && dTag[1] && dTag[1].startsWith('steps_') && (w.distance_meters || 0) === 0) {
              console.log(`[SupabaseCompetition] Excluding zero-distance step workout from distance competition: ${w.npub.slice(0, 12)}...`);
              return false;
            }
          }
        }

        // Round distance to nearest 10 meters (or use 0 for null/undefined)
        const roundedDist = Math.round((w.distance_meters || 0) / 10) * 10;
        // Extract date portion from timestamp
        const dateStr = w.created_at ? w.created_at.split('T')[0] : 'unknown';
        // Create unique key: npub + distance + date
        const key = `${w.npub}:${roundedDist}:${dateStr}`;

        if (seenWorkoutKeys.has(key)) {
          console.log(`[SupabaseCompetition] Skipping duplicate workout: ${w.npub.slice(0, 12)}... ${roundedDist}m on ${dateStr}`);
          return false; // Skip duplicate
        }
        seenWorkoutKeys.add(key);
        return true;
      });

      const duplicatesRemoved = (rawWorkouts?.length || 0) - (workouts?.length || 0);
      if (duplicatesRemoved > 0) {
        console.log(`[SupabaseCompetition] Deduplication: removed ${duplicatesRemoved} duplicate workouts`);
      }

      // Aggregate scores and track charity per user
      const scores = new Map<string, {
        score: number;
        workoutCount: number;
        charityId?: string;
        charityName?: string;
        latestWorkoutTime?: string;
      }>();
      validNpubs.forEach((npub) => scores.set(npub, { score: 0, workoutCount: 0 }));

      // Track charity totals
      const charityTotals = new Map<string, { totalDistance: number; participants: Set<string> }>();

      // For distance competitions, use MAX(steps, GPS) per day to prevent double-counting
      // Step workouts have event_id starting with "steps_"
      if (competition.scoring_method === 'total_distance') {
        // Group workouts by (npub, date) and track step vs GPS distance separately
        const dailyData = new Map<string, {
          gpsDistanceKm: number;
          stepDistanceKm: number;
          gpsWorkoutCount: number;
          charityId?: string;
          charityName?: string;
          latestWorkoutTime?: string;
        }>();

        workouts?.forEach((w: WorkoutSubmission) => {
          const dateStr = w.created_at ? w.created_at.split('T')[0] : 'unknown';
          const dayKey = `${w.npub}:${dateStr}`;
          const distanceKm = (w.distance_meters || 0) / 1000;
          const isStepWorkout = w.event_id?.startsWith('steps_');

          const rawEvent = w.raw_event as Record<string, unknown> | null;
          const charityData = this.extractCharityFromRawEvent(rawEvent);

          const current = dailyData.get(dayKey) || {
            gpsDistanceKm: 0,
            stepDistanceKm: 0,
            gpsWorkoutCount: 0,
          };

          if (isStepWorkout) {
            // Step workout - track separately
            current.stepDistanceKm += distanceKm;
          } else {
            // GPS workout - track distance and count
            current.gpsDistanceKm += distanceKm;
            current.gpsWorkoutCount += 1;
          }

          // Track most recent charity
          const isNewerWorkout = !current.latestWorkoutTime || w.created_at > current.latestWorkoutTime;
          if (isNewerWorkout && charityData.charityId) {
            current.charityId = charityData.charityId;
            current.charityName = charityData.charityName;
            current.latestWorkoutTime = w.created_at;
          } else if (!current.latestWorkoutTime) {
            current.latestWorkoutTime = w.created_at;
          }

          dailyData.set(dayKey, current);
        });

        // Aggregate daily MAX(steps, GPS) into user totals
        for (const [dayKey, daily] of dailyData) {
          const npub = dayKey.split(':')[0];
          const current = scores.get(npub) || { score: 0, workoutCount: 0 };

          // MAX(steps, GPS) per day - simple and fair
          const dailyDistance = Math.max(daily.stepDistanceKm, daily.gpsDistanceKm);
          // Workout count: GPS workouts count, step-only days count as 1
          const dailyWorkoutCount = daily.gpsWorkoutCount > 0 ? daily.gpsWorkoutCount : (daily.stepDistanceKm > 0 ? 1 : 0);

          const isNewerWorkout = !current.latestWorkoutTime || (daily.latestWorkoutTime && daily.latestWorkoutTime > current.latestWorkoutTime);

          scores.set(npub, {
            score: current.score + dailyDistance,
            workoutCount: current.workoutCount + dailyWorkoutCount,
            charityId: isNewerWorkout && daily.charityId ? daily.charityId : current.charityId,
            charityName: isNewerWorkout && daily.charityName ? daily.charityName : current.charityName,
            latestWorkoutTime: isNewerWorkout && daily.latestWorkoutTime ? daily.latestWorkoutTime : current.latestWorkoutTime,
          });

          // Charity totals use the same MAX logic
          if (daily.charityId && dailyDistance > 0) {
            const charityStats = charityTotals.get(daily.charityId) || {
              totalDistance: 0,
              participants: new Set<string>(),
            };
            charityStats.totalDistance += dailyDistance;
            charityStats.participants.add(npub);
            charityTotals.set(daily.charityId, charityStats);
          }
        }

        console.log(`[SupabaseCompetition] Distance aggregation: ${dailyData.size} user-days processed with MAX(steps, GPS)`);
      } else if (competition.scoring_method === 'fastest_time') {
        // Fastest time competitions: find each user's fastest qualifying workout
        // Uses pre-computed time_Xk_seconds when available (more accurate for longer runs)
        const config = competition.config as Record<string, unknown> || {};
        const targetKm = (config.target_distance_km as number) || 5.0;
        // Minimum distance: must have run at least 90% of target (allows GPS undershoot)
        const minKm = targetKm * 0.9;

        // Map target distance to the pre-computed time field
        const timeFieldMap: Record<number, string> = { 5: 'time_5k_seconds', 10: 'time_10k_seconds', 21.1: 'time_half_seconds', 42.2: 'time_marathon_seconds' };
        const precomputedTimeField = timeFieldMap[targetKm];

        console.log(`[SupabaseCompetition] Fastest time: target ${targetKm}km, min ${minKm.toFixed(1)}km, timeField=${precomputedTimeField || 'duration'}`);

        workouts?.forEach((w: WorkoutSubmission) => {
          const distanceKm = (w.distance_meters || 0) / 1000;
          const durationSec = w.duration_seconds || 0;

          // Must have run at least the minimum distance and have duration
          if (distanceKm < minKm || durationSec <= 0) return;

          // Use pre-computed target time if available (handles longer runs correctly),
          // otherwise fall back to raw duration (only valid for runs near exact target distance)
          let scoreSec = durationSec;
          if (precomputedTimeField && (w as unknown as Record<string, unknown>)[precomputedTimeField]) {
            scoreSec = (w as unknown as Record<string, unknown>)[precomputedTimeField] as number;
          }

          const rawEvent = w.raw_event as Record<string, unknown> | null;
          const charityData = this.extractCharityFromRawEvent(rawEvent);
          const current = scores.get(w.npub);

          // Keep only the fastest (minimum time) qualifying workout per user
          if (!current || current.score === 0 || scoreSec < current.score) {
            scores.set(w.npub, {
              score: scoreSec,
              workoutCount: (current?.workoutCount || 0) + 1,
              charityId: charityData.charityId || current?.charityId,
              charityName: charityData.charityName || current?.charityName,
              latestWorkoutTime: w.created_at,
            });
          } else {
            // Not fastest, but still count the workout
            scores.set(w.npub, {
              ...current,
              workoutCount: current.workoutCount + 1,
            });
          }
        });

        // Remove users with no qualifying workouts (score still 0)
        for (const [npub, data] of scores) {
          if (data.score === 0) scores.delete(npub);
        }

        console.log(`[SupabaseCompetition] Fastest time: ${scores.size} users with qualifying workouts`);
      } else {
        // Non-distance competitions: use original sum logic
        workouts?.forEach((w: WorkoutSubmission) => {
          const current = scores.get(w.npub) || { score: 0, workoutCount: 0 };
          let scoreIncrement = 0;

          const rawEvent = w.raw_event as Record<string, unknown> | null;
          const rowWorkoutCount = (rawEvent?.workout_count as number) || 1;
          const charityData = this.extractCharityFromRawEvent(rawEvent);

          switch (competition.scoring_method) {
            case 'total_duration':
              scoreIncrement = w.duration_seconds || 0;
              break;
            case 'workout_count':
              scoreIncrement = rowWorkoutCount;
              break;
            case 'total_steps':
              scoreIncrement = w.step_count || 0;
              break;
          }

          const existingCharity = current.charityId;
          const isNewerWorkout = !current.latestWorkoutTime || w.created_at > current.latestWorkoutTime;

          scores.set(w.npub, {
            score: current.score + scoreIncrement,
            workoutCount: current.workoutCount + rowWorkoutCount,
            charityId: isNewerWorkout && charityData.charityId ? charityData.charityId : existingCharity,
            charityName: isNewerWorkout && charityData.charityName ? charityData.charityName : current.charityName,
            latestWorkoutTime: isNewerWorkout ? w.created_at : current.latestWorkoutTime,
          });

          if (charityData.charityId && w.distance_meters) {
            const charityStats = charityTotals.get(charityData.charityId) || {
              totalDistance: 0,
              participants: new Set<string>(),
            };
            charityStats.totalDistance += (w.distance_meters / 1000);
            charityStats.participants.add(w.npub);
            charityTotals.set(charityData.charityId, charityStats);
          }
        });
      }

      // Sort and rank leaderboard
      // For fastest_time: ascending (lower time = better rank)
      // For all others: descending (higher score = better rank)
      const isFastestTime = competition.scoring_method === 'fastest_time';
      const leaderboard: LeaderboardEntry[] = Array.from(scores.entries())
        .map(([npub, data]) => ({
          npub,
          score: data.score,
          workout_count: data.workoutCount,
          rank: 0,
          charityId: data.charityId,
          charityName: data.charityName,
        }))
        .sort((a, b) => isFastestTime ? a.score - b.score : b.score - a.score)
        .slice(0, limit);

      // Assign tied ranks: equal scores share the same rank
      leaderboard.forEach((entry, i) => {
        if (i === 0) {
          entry.rank = 1;
        } else if (entry.score === leaderboard[i - 1].score) {
          entry.rank = leaderboard[i - 1].rank;
        } else {
          entry.rank = i + 1;
        }
      });

      // Build charity rankings sorted by total distance
      const charityRankings: CharityRanking[] = Array.from(charityTotals.entries())
        .map(([charityId, stats]) => {
          const charity = getCharityById(charityId);
          return {
            rank: 0,
            charityId,
            charityName: charity?.name || charityId,
            lightningAddress: charity?.lightningAddress,
            totalDistance: stats.totalDistance,
            participantCount: stats.participants.size,
          };
        })
        .sort((a, b) => b.totalDistance - a.totalDistance)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      return { leaderboard, charityRankings, competition };
    } catch (err) {
      console.error('[SupabaseCompetitionService] Get leaderboard exception:', err);
      return {
        leaderboard: [],
        charityRankings: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract charity from raw_event tags
   * Looks for ['team', charityId] or ['charity', charityId, name, address] tags
   * ONLY returns charity data if it matches a known charity from our list
   */
  private static extractCharityFromRawEvent(rawEvent: Record<string, unknown> | null): {
    charityId?: string;
    charityName?: string;
  } {
    if (!rawEvent) return {};

    const tags = rawEvent.tags as string[][] | undefined;
    if (!tags || !Array.isArray(tags)) return {};

    // Look for 'team' tag first (primary)
    const teamTag = tags.find((t) => t[0] === 'team');
    if (teamTag && teamTag[1]) {
      const charity = getCharityById(teamTag[1]);
      // Only return if it's a known charity (not a random team UUID)
      if (charity) {
        return {
          charityId: teamTag[1],
          charityName: charity.name,
        };
      }
    }

    // Fall back to 'charity' tag
    const charityTag = tags.find((t) => t[0] === 'charity');
    if (charityTag && charityTag[1]) {
      const charity = getCharityById(charityTag[1]);
      // Only return if it's a known charity
      if (charity) {
        return {
          charityId: charityTag[1],
          charityName: charity.name,
        };
      }
      // If charity tag has a name in position 2 and it's not a UUID, use it
      if (charityTag[2] && !charityTag[2].includes('-')) {
        return {
          charityId: charityTag[1],
          charityName: charityTag[2],
        };
      }
    }

    return {};
  }

  /**
   * Get all competitions (active and upcoming)
   *
   * @returns List of competitions
   */
  static async getCompetitions(): Promise<Competition[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase!
        .from('competitions')
        .select('*')
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(100);

      if (error) {
        console.error('[SupabaseCompetitionService] Get competitions error:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabaseCompetitionService] Get competitions exception:', err);
      return [];
    }
  }

  /**
   * Update a participant's profile data via Edge Function.
   */
  static async updateParticipantProfile(
    competitionId: string,
    npub: string,
    profile: { name?: string; picture?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const resolvedId = await this.resolveCompetitionId(competitionId);
    if (!resolvedId) {
      return { success: false, error: 'Competition not found' };
    }

    const result = await callEdgeFunction('manage-competition', {
      action: 'update-profile',
      competition_id: resolvedId,
      npub,
      ...(profile.name ? { name: profile.name } : {}),
      ...(profile.picture ? { picture: profile.picture } : {}),
    });

    if (!result.success) {
      console.error('[SupabaseCompetitionService] Update profile error:', result.error);
      return { success: false, error: result.error };
    }

    console.log(
      `[SupabaseCompetitionService] Updated profile for ${npub.slice(0, 12)}: ${profile.name || 'no name'}`
    );
    return { success: true };
  }

  /**
   * Get participant count for a competition
   *
   * @param competitionId - The competition UUID or external_id
   * @returns Number of participants
   */
  static async getParticipantCount(competitionId: string): Promise<number> {
    if (!isSupabaseConfigured()) {
      return 0;
    }

    try {
      const resolvedId = await this.resolveCompetitionId(competitionId);
      if (!resolvedId) {
        return 0;
      }

      const { count, error } = await supabase!
        .from('competition_participants')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', resolvedId);

      if (error) {
        console.error('[SupabaseCompetitionService] Get count error:', error);
        return 0;
      }

      return count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get competition UUID from external_id
   * Public wrapper for resolveCompetitionId
   *
   * @param externalId - The external ID (e.g., 'january-walking', 'einundzwanzig')
   * @returns The competition UUID or null if not found
   */
  static async getCompetitionId(externalId: string): Promise<string | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    return this.resolveCompetitionId(externalId);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Resolve a competition ID (could be UUID or external_id) to UUID
   */
  private static async resolveCompetitionId(
    idOrExternalId: string
  ): Promise<string | null> {
    // If it looks like a UUID, use it directly
    if (this.isUUID(idOrExternalId)) {
      return idOrExternalId;
    }

    // Otherwise, look up by external_id
    try {
      const { data, error } = await supabase!
        .from('competitions')
        .select('id')
        .eq('external_id', idOrExternalId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.id;
    } catch {
      return null;
    }
  }

  /**
   * Check if a string is a valid UUID
   */
  private static isUUID(str: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Parse a kind 1301 workout event into structured data
   */
  private static parseWorkoutEvent(event: NostrEvent): {
    activityType: string;
    distanceMeters: number | null;
    durationSeconds: number | null;
    calories: number | null;
  } {
    const tags = event.tags || [];
    const getTag = (name: string): string | undefined =>
      tags.find((t) => t[0] === name)?.[1];

    // Activity type
    const activityType = getTag('exercise') || 'other';

    // Distance - handle unit conversion
    const distanceTag = tags.find((t) => t[0] === 'distance');
    let distanceMeters: number | null = null;
    if (distanceTag) {
      const value = parseFloat(distanceTag[1]);
      const unit = distanceTag[2]?.toLowerCase();
      if (!isNaN(value)) {
        switch (unit) {
          case 'km':
            distanceMeters = value * 1000;
            break;
          case 'mi':
            distanceMeters = value * 1609.34;
            break;
          case 'm':
          default:
            distanceMeters = value;
            break;
        }
      }
    }

    // Duration - parse HH:MM:SS format
    const durationStr = getTag('duration');
    let durationSeconds: number | null = null;
    if (durationStr) {
      const parts = durationStr.split(':').map(Number);
      if (parts.length === 3) {
        durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        durationSeconds = parts[0] * 60 + parts[1];
      }
    }

    // Calories
    const caloriesStr = getTag('calories');
    const calories = caloriesStr ? parseInt(caloriesStr, 10) || null : null;

    return {
      activityType,
      distanceMeters,
      durationSeconds,
      calories,
    };
  }

  // ============================================================================
  // Local Join Storage (Optimistic UI)
  // ============================================================================

  /**
   * Save a local join record for instant UI feedback
   * Called when user joins a competition (before Supabase confirms)
   */
  private static async saveLocalJoin(competitionId: string, npub: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_JOINED_COMPETITIONS_KEY);
      let joins: Record<string, string[]> = {};
      if (stored) {
        try {
          joins = JSON.parse(stored);
        } catch {
          console.warn('[SupabaseCompetitionService] Corrupted local joins cache, resetting');
          await AsyncStorage.removeItem(LOCAL_JOINED_COMPETITIONS_KEY);
        }
      }

      // Add npub to this competition's list (if not already there)
      if (!joins[competitionId]) {
        joins[competitionId] = [];
      }
      if (!joins[competitionId].includes(npub)) {
        joins[competitionId].push(npub);
        await AsyncStorage.setItem(LOCAL_JOINED_COMPETITIONS_KEY, JSON.stringify(joins));
        console.log(`[SupabaseCompetitionService] Saved local join: ${competitionId} -> ${npub.slice(0, 12)}...`);
      }
    } catch (error) {
      console.warn('[SupabaseCompetitionService] Failed to save local join:', error);
    }
  }

  /**
   * Remove a local join record when user leaves a competition
   */
  private static async removeLocalJoin(competitionId: string, npub: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_JOINED_COMPETITIONS_KEY);
      if (!stored) return;

      let joins: Record<string, string[]>;
      try {
        joins = JSON.parse(stored);
      } catch {
        console.warn('[SupabaseCompetitionService] Corrupted local joins cache, removing');
        await AsyncStorage.removeItem(LOCAL_JOINED_COMPETITIONS_KEY);
        return;
      }
      if (joins[competitionId]) {
        joins[competitionId] = joins[competitionId].filter((n) => n !== npub);
        if (joins[competitionId].length === 0) {
          delete joins[competitionId];
        }
        await AsyncStorage.setItem(LOCAL_JOINED_COMPETITIONS_KEY, JSON.stringify(joins));
        console.log(`[SupabaseCompetitionService] Removed local join: ${competitionId} -> ${npub.slice(0, 12)}...`);
      }
    } catch (error) {
      console.warn('[SupabaseCompetitionService] Failed to remove local join:', error);
    }
  }

  /**
   * Check if user has joined a competition locally (instant, works offline)
   */
  private static async isLocallyJoined(competitionId: string, npub: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_JOINED_COMPETITIONS_KEY);
      if (!stored) return false;

      let joins: Record<string, string[]>;
      try {
        joins = JSON.parse(stored);
      } catch {
        console.warn('[SupabaseCompetitionService] Corrupted local joins cache, removing');
        await AsyncStorage.removeItem(LOCAL_JOINED_COMPETITIONS_KEY);
        return false;
      }
      return joins[competitionId]?.includes(npub) || false;
    } catch (error) {
      console.warn('[SupabaseCompetitionService] Failed to check local join:', error);
      return false;
    }
  }

  /**
   * Fetch competitions linked to a specific club.
   * Results are cached in AsyncStorage per club for 3 minutes.
   */
  static async fetchCompetitionsByClubId(clubId: string): Promise<Competition[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const cacheKey = `@runstr:club_competitions:${clubId}`;
    const CLUB_COMP_TTL = 3 * 60 * 1000; // 3 minutes

    // Check cache first
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        let parsed;
        try {
          parsed = JSON.parse(cached);
        } catch {
          await AsyncStorage.removeItem(cacheKey);
          parsed = null;
        }
        if (parsed && Date.now() - parsed.timestamp < CLUB_COMP_TTL) {
          return parsed.data as Competition[];
        }
      }
    } catch {
      // Cache read failed, continue to fetch
    }

    try {
      const { data, error } = await supabase!
        .from('competitions')
        .select('*')
        .eq('club_id', clubId)
        .order('start_date', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[SupabaseCompetitionService] fetchCompetitionsByClubId error:', error);
        return [];
      }

      const competitions = (data || []) as Competition[];

      // Save to cache
      try {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ data: competitions, timestamp: Date.now() })
        );
      } catch {
        // Cache write failed, non-critical
      }

      return competitions;
    } catch (err) {
      console.error('[SupabaseCompetitionService] fetchCompetitionsByClubId exception:', err);
      return [];
    }
  }

  /**
   * Auto-join all club members to a competition via Edge Function.
   */
  static async autoJoinClubMembers(
    competitionId: string,
    clubId: string,
    callerNpub?: string,
  ): Promise<{ joined: number; error?: string }> {
    const result = await callEdgeFunction<{ joined?: number }>('manage-competition', {
      action: 'auto-join-members',
      competition_id: competitionId,
      club_id: clubId,
      npub: callerNpub || '',
    });

    if (!result.success) {
      console.error('[SupabaseCompetitionService] autoJoinClubMembers error:', result.error);
      return { joined: 0, error: result.error };
    }

    const joined = (result.data as any)?.joined ?? 0;
    console.log(`[SupabaseCompetitionService] Auto-joined ${joined} club members to competition ${competitionId}`);
    return { joined };
  }

  /**
   * Delete a competition via Edge Function. Server verifies creator.
   */
  static async deleteCompetition(
    competitionId: string,
    npub: string
  ): Promise<{ success: boolean; error?: string }> {
    const resolvedId = await this.resolveCompetitionId(competitionId);
    if (!resolvedId) {
      return { success: false, error: 'Competition not found' };
    }

    const result = await callEdgeFunction('manage-competition', {
      action: 'delete',
      competition_id: resolvedId,
      npub,
    });

    if (!result.success) {
      console.error('[SupabaseCompetitionService] deleteCompetition error:', result.error);
      return { success: false, error: result.error };
    }

    // Clear caches
    await this.clearDynamicCompetitionsCache();
    console.log(`[SupabaseCompetitionService] Deleted competition ${competitionId}`);
    return { success: true };
  }

  /**
   * Update a competition via Edge Function. Server verifies creator.
   */
  static async updateCompetition(
    competitionId: string,
    updates: { name?: string; description?: string | null; image_url?: string | null },
    callerNpub?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const result = await callEdgeFunction('manage-competition', {
      action: 'update',
      competition_id: competitionId,
      npub: callerNpub || '',
      updates,
    });

    if (!result.success) {
      console.error('[SupabaseCompetitionService] updateCompetition error:', result.error);
      return { success: false, error: result.error };
    }

    await this.clearDynamicCompetitionsCache();
    console.log(`[SupabaseCompetitionService] Updated competition ${competitionId}`);
    return { success: true };
  }

  /**
   * Clear club competitions cache after event creation
   */
  static async clearClubCompetitionsCache(clubId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`@runstr:club_competitions:${clubId}`);
      console.log('[SupabaseCompetitionService] Club competitions cache cleared:', clubId);
    } catch {
      // Non-critical
    }
  }

  /**
   * Clear the dynamic competitions cache so newly created events appear immediately
   */
  static async clearDynamicCompetitionsCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DYNAMIC_COMPETITIONS_CACHE_KEY);
      console.log('[SupabaseCompetitionService] Dynamic competitions cache cleared');
    } catch {
      // Non-critical
    }
  }

  /**
   * Fetch a single competition by external_id (direct Supabase query, no cache)
   * Used after event creation to avoid cache staleness
   */
  static async fetchCompetitionByExternalId(externalId: string): Promise<any | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase!
        .from('competitions')
        .select('*')
        .eq('external_id', externalId)
        .single();
      if (error) {
        console.warn('[SupabaseCompetitionService] fetchByExternalId error:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[SupabaseCompetitionService] fetchByExternalId exception:', err);
      return null;
    }
  }

  /**
   * Get all locally joined users for a competition
   * Useful for merging with Supabase participants in leaderboard
   */
  static async getLocallyJoinedUsers(competitionId: string): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_JOINED_COMPETITIONS_KEY);
      if (!stored) return [];

      let joins: Record<string, string[]>;
      try {
        joins = JSON.parse(stored);
      } catch {
        console.warn('[SupabaseCompetitionService] Corrupted local joins cache, removing');
        await AsyncStorage.removeItem(LOCAL_JOINED_COMPETITIONS_KEY);
        return [];
      }
      return joins[competitionId] || [];
    } catch (error) {
      console.warn('[SupabaseCompetitionService] Failed to get local joins:', error);
      return [];
    }
  }
}

export default SupabaseCompetitionService;
