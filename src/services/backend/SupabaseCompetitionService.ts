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
import { getCharityById, isPPQTeam } from '../../constants/charities';
import { getNpubFromStorage } from '../../utils/nostr';
import { PPQAccountService } from '../ai/PPQAccountService';

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
  // PPQ.AI team: Bolt11 invoice for reward topup (instead of Lightning address)
  ppqBolt11?: string;
  ppqInvoiceId?: string;
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
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < DYNAMIC_COMPETITIONS_TTL) {
          return data as Competition[];
        }
      }
    } catch {
      // Cache read failed, continue to fetch
    }

    try {
      const { data, error } = await supabase!
        .from('competitions')
        .select('*')
        .not('external_id', 'in', `(${this.HARDCODED_EVENT_IDS.join(',')})`)
        .order('start_date', { ascending: false });

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
   * Join a competition - adds authenticated user's npub to participant list
   * Uses optimistic pattern: save locally first for instant UI, then sync to Supabase.
   *
   * SECURITY: Authenticated npub is always derived from local auth storage.
   *
   * @param competitionId - The competition UUID or external_id
   * @param profile - Optional profile data (name, picture) to store for leaderboard display
   * @returns Success status
   */
  static async joinCompetition(
    competitionId: string,
    profile?: { name?: string; picture?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const authenticatedNpub = await this.resolveAuthenticatedNpub();
    if (!authenticatedNpub) {
      console.warn('[SupabaseCompetitionService] joinCompetition blocked: no authenticated npub in local storage');
      return { success: false, error: 'Not authenticated' };
    }

    // OPTIMISTIC: Save locally FIRST for instant UI feedback
    // This ensures user sees "Joined" state immediately, even if Supabase is slow/fails
    await this.saveLocalJoin(competitionId, authenticatedNpub);

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseCompetitionService] Supabase not configured - local join only');
      return { success: true }; // Return success since local join worked
    }

    try {
      // Resolve competition ID (could be UUID or external_id)
      const resolvedId = await this.resolveCompetitionId(competitionId);
      if (!resolvedId) {
        console.warn('[SupabaseCompetitionService] Competition not found in Supabase - local join only');
        return { success: true }; // Still return success since local join worked
      }

      // Build participant data with optional profile fields
      const participantData: {
        competition_id: string;
        npub: string;
        name?: string;
        picture?: string;
      } = {
        competition_id: resolvedId,
        npub: authenticatedNpub,
      };

      // Only include profile fields if they have values
      if (profile?.name) {
        participantData.name = profile.name;
      }
      if (profile?.picture) {
        participantData.picture = profile.picture;
      }

      const { error } = await supabase!
        .from('competition_participants')
        .upsert(participantData, { onConflict: 'competition_id,npub' });

      if (error) {
        console.warn('[SupabaseCompetitionService] Supabase join error (local join succeeded):', error);
        // Still return success since local join worked
        return { success: true };
      }

      console.log(
        `[SupabaseCompetitionService] Joined competition: ${competitionId}${profile?.name ? ` (${profile.name})` : ''}`
      );

      return { success: true };
    } catch (err) {
      console.warn('[SupabaseCompetitionService] Join exception (local join succeeded):', err);
      // Still return success since local join worked
      return { success: true };
    }
  }

  /**
   * Leave a competition - removes authenticated user's npub from participant list
   *
   * SECURITY: Authenticated npub is always derived from local auth storage.
   *
   * @param competitionId - The competition UUID or external_id
   * @returns Success status
   */
  static async leaveCompetition(
    competitionId: string
  ): Promise<{ success: boolean; error?: string }> {
    const authenticatedNpub = await this.resolveAuthenticatedNpub();
    if (!authenticatedNpub) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Backend not configured' };
    }

    try {
      const resolvedId = await this.resolveCompetitionId(competitionId);
      if (!resolvedId) {
        return { success: false, error: 'Competition not found' };
      }

      const { error } = await supabase!
        .from('competition_participants')
        .delete()
        .match({ competition_id: resolvedId, npub: authenticatedNpub });

      if (error) {
        console.error('[SupabaseCompetitionService] Leave error:', error);
        return { success: false, error: error.message };
      }

      console.log(
        `[SupabaseCompetitionService] Left competition: ${competitionId}`
      );

      // Remove from local storage
      await this.removeLocalJoin(competitionId, authenticatedNpub);

      return { success: true };
    } catch (err) {
      console.error('[SupabaseCompetitionService] Leave exception:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
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

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[SupabaseCompetitionService] Missing Supabase environment variables');
      return { success: false, error: 'Backend not configured' };
    }

    // PPQ.AI: Auto-create bolt11 invoice if user's team is PPQ.AI and no invoice provided
    // This ensures ALL submission paths (HealthKit, background, manual) get PPQ support
    let ppqBolt11 = data.ppqBolt11;
    let ppqInvoiceId = data.ppqInvoiceId;
    if (!ppqBolt11) {
      try {
        const selectedTeamId = await AsyncStorage.getItem('@runstr:selected_team_id');
        if (selectedTeamId && isPPQTeam(selectedTeamId)) {
          const hasAccount = await PPQAccountService.hasAccount();
          if (hasAccount) {
            const WORKOUT_REWARD_SATS = 50;
            const invoiceResult = await PPQAccountService.createTopupInvoice(WORKOUT_REWARD_SATS);
            if (invoiceResult.success && invoiceResult.bolt11) {
              ppqBolt11 = invoiceResult.bolt11;
              ppqInvoiceId = invoiceResult.invoiceId;
              console.log(`[SupabaseCompetition] PPQ.AI invoice auto-created: ${ppqBolt11.slice(0, 30)}...`);
            }
          }
        }
      } catch (ppqError) {
        console.warn('[SupabaseCompetition] PPQ.AI invoice creation failed (non-blocking):', ppqError);
      }
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
            // TIMEZONE FIX: Send local date for leaderboard grouping
            // This ensures workouts appear on the correct day in the user's timezone
            // Without this, late-night workouts appear on "tomorrow's" leaderboard (UTC)
            leaderboard_date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format
            // Daily leaderboard: Pass profile data for caching
            profile_name: data.profileName || null,
            profile_picture: data.profilePicture || null,
            // PPQ.AI team: Bolt11 invoice for reward topup
            ppq_bolt11: ppqBolt11 || null,
            ppq_invoice_id: ppqInvoiceId || null,
            raw_event: {
              event_id: data.eventId,
              type: data.type,
              distance: data.distance,
              duration: data.duration,
              calories: data.calories,
              submitted_via: 'runstr_app',
              submitted_at: new Date().toISOString(),
              // Daily leaderboard: Pass tags for split/step parsing
              tags: data.tags || [],
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

      // Get competition details
      const { data: competition, error: compError } = await supabase!
        .from('competitions')
        .select('*')
        .eq('id', resolvedId)
        .single();

      if (compError || !competition) {
        return { leaderboard: [], charityRankings: [], error: 'Competition not found' };
      }

      // Get participants
      const { data: participants } = await supabase!
        .from('competition_participants')
        .select('npub')
        .eq('competition_id', resolvedId);

      const npubs = participants?.map((p) => p.npub) || [];

      if (npubs.length === 0) {
        return { leaderboard: [], charityRankings: [], competition };
      }

      // DATA QUALITY FIX: Filter out banned users from leaderboard
      // Banned users are stored in banned_users table with optional expiry
      const { data: bannedUsers } = await supabase!
        .from('banned_users')
        .select('npub')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

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
      const endDate = dateOverride?.endDate || competition.end_date;

      // Use activityTypes override if provided, otherwise use single competition type
      const types = activityTypes || [competition.activity_type];

      // Build query with activity type filter (single or multiple types)
      // DATA QUALITY FIX: Use validNpubs (banned users filtered)
      // REMOVED .eq('verified', true) - show all workouts regardless of verification status
      // Anti-cheat validation already filters out impossible workouts (they go to flagged_workouts table)
      let workoutQuery = supabase!
        .from('workout_submissions')
        .select('*')
        .in('npub', validNpubs)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Use .in() for multiple types, .eq() for single type
      if (types.length === 1) {
        workoutQuery = workoutQuery.eq('activity_type', types[0]);
      } else {
        workoutQuery = workoutQuery.in('activity_type', types);
      }

      // DATA QUALITY FIX: Filter to only app-submitted workouts when required
      // This prevents fake workouts submitted via terminal from appearing in prize competitions
      if (requireAppSource) {
        workoutQuery = workoutQuery.eq('source', 'app');
      }

      const { data: rawWorkouts } = await workoutQuery.order('created_at', { ascending: false }); // Most recent first

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
        const config = competition.config as Record<string, unknown> || {};
        const targetKm = (config.target_distance_km as number) || 5.0;
        const toleranceKm = (config.distance_tolerance_km as number) || 0.5;
        const minKm = targetKm - toleranceKm;
        const maxKm = targetKm + toleranceKm;

        console.log(`[SupabaseCompetition] Fastest time: target ${targetKm}km ± ${toleranceKm}km (${minKm}-${maxKm}km)`);

        workouts?.forEach((w: WorkoutSubmission) => {
          const distanceKm = (w.distance_meters || 0) / 1000;
          const durationSec = w.duration_seconds || 0;

          // Skip workouts outside distance tolerance or with no duration
          if (distanceKm < minKm || distanceKm > maxKm || durationSec <= 0) return;

          const rawEvent = w.raw_event as Record<string, unknown> | null;
          const charityData = this.extractCharityFromRawEvent(rawEvent);
          const current = scores.get(w.npub);

          // Keep only the fastest (minimum duration) qualifying workout per user
          if (!current || current.score === 0 || durationSec < current.score) {
            scores.set(w.npub, {
              score: durationSec,
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
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

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
        .order('start_date', { ascending: true });

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
   * Update a participant's profile data (name, picture)
   * Used to fix participants with null profile data
   *
   * @param competitionId - The competition UUID or external_id
   * @param npub - User's Nostr public key
   * @param profile - Profile data to update
   * @returns Success status
   */
  static async updateParticipantProfile(
    competitionId: string,
    npub: string,
    profile: { name?: string; picture?: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Backend not configured' };
    }

    try {
      const resolvedId = await this.resolveCompetitionId(competitionId);
      if (!resolvedId) {
        return { success: false, error: 'Competition not found' };
      }

      // Build update data (only include non-null values)
      const updateData: { name?: string; picture?: string } = {};
      if (profile.name) updateData.name = profile.name;
      if (profile.picture) updateData.picture = profile.picture;

      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'No profile data to update' };
      }

      const { error } = await supabase!
        .from('competition_participants')
        .update(updateData)
        .match({ competition_id: resolvedId, npub });

      if (error) {
        console.error('[SupabaseCompetitionService] Update profile error:', error);
        return { success: false, error: error.message };
      }

      console.log(
        `[SupabaseCompetitionService] Updated profile for ${npub.slice(0, 12)}: ${profile.name || 'no name'}`
      );
      return { success: true };
    } catch (err) {
      console.error('[SupabaseCompetitionService] Update profile exception:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
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
   * Resolve authenticated npub from local auth storage.
   * Caller-provided npub is treated as untrusted and used only for mismatch diagnostics.
   */
  private static async resolveAuthenticatedNpub(providedNpub?: string): Promise<string | null> {
    const storedNpub = await getNpubFromStorage();
    if (!storedNpub) {
      return null;
    }

    if (providedNpub && providedNpub !== storedNpub) {
      console.warn(
        '[SupabaseCompetitionService] Caller npub mismatch detected; using authenticated storage npub',
        {
          provided: `${providedNpub.slice(0, 12)}...`,
          authenticated: `${storedNpub.slice(0, 12)}...`,
        }
      );
    }

    return storedNpub;
  }

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
      const joins: Record<string, string[]> = stored ? JSON.parse(stored) : {};

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

      const joins: Record<string, string[]> = JSON.parse(stored);
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

      const joins: Record<string, string[]> = JSON.parse(stored);
      return joins[competitionId]?.includes(npub) || false;
    } catch (error) {
      console.warn('[SupabaseCompetitionService] Failed to check local join:', error);
      return false;
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

      const joins: Record<string, string[]> = JSON.parse(stored);
      return joins[competitionId] || [];
    } catch (error) {
      console.warn('[SupabaseCompetitionService] Failed to get local joins:', error);
      return [];
    }
  }
}

export default SupabaseCompetitionService;
