/**
 * JanuaryWalkingService - January Walking Contest Service
 *
 * A walking-only challenge for January 2026.
 * Top 3 participants with the longest walking distance win 1k sats each.
 *
 * Features:
 * - Open to everyone (all joined users eligible for prizes)
 * - Queries Supabase for verified workouts (anti-cheat validated)
 * - Uses Running Bitcoin pattern: local join + Supabase registration
 * - Profile resolution: Season II → Supabase → "Anonymous Athlete"
 * - Walking activity type only
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { nip19 } from 'nostr-tools';
import {
  getJanuaryWalkingStatus,
  getJanuaryWalkingStartTimestamp,
  getJanuaryWalkingEndTimestamp,
} from '../../constants/januaryWalking';
import { SEASON_2_PARTICIPANTS } from '../../constants/season2';
import { getBaselineTotals } from '../../constants/season2Baseline';
import type { CachedWorkout } from '../cache/UnifiedWorkoutCache';
import { ProfileCache } from '../../cache/ProfileCache';
import { SupabaseCompetitionService } from '../backend/SupabaseCompetitionService';
import { PendingSubmissionService, PendingSubmission } from '../competition/PendingSubmissionService';

// Key for storing ALL joined users (not just current user)
const JOINED_USERS_KEY = '@runstr:january_walking_joined_users';

export interface JanuaryWalkingParticipant {
  pubkey: string;
  npub?: string;
  name: string;
  picture?: string;
  totalSteps: number;
  workoutCount: number;
  isJoined: boolean; // User has joined the contest
  rank: number;
}

export interface JanuaryWalkingLeaderboard {
  participants: JanuaryWalkingParticipant[]; // Top 25 (all joined users)
  currentUserEntry?: JanuaryWalkingParticipant; // If user joined but not in top 25
  currentUserRank?: number;
  totalParticipants: number;
  totalSteps: number;
  lastUpdated: number;
}


class JanuaryWalkingServiceClass {
  private static instance: JanuaryWalkingServiceClass;

  static getInstance(): JanuaryWalkingServiceClass {
    if (!this.instance) {
      this.instance = new JanuaryWalkingServiceClass();
    }
    return this.instance;
  }

  /**
   * Get the January Walking Contest leaderboard
   * @param currentUserPubkey - The logged-in user's pubkey (to include them privately if joined)
   * @param forceRefresh - If true, bypasses cache and fetches fresh data
   */
  async getLeaderboard(currentUserPubkey?: string, forceRefresh: boolean = false): Promise<JanuaryWalkingLeaderboard> {
    const startTime = Date.now();
    console.log(`[JanuaryWalking] ========== getLeaderboard(forceRefresh=${forceRefresh}) ==========`);

    // If event hasn't started yet, return empty leaderboard
    const status = getJanuaryWalkingStatus();
    if (status === 'upcoming') {
      console.log('[JanuaryWalking] Event is upcoming - returning empty leaderboard');
      return this.emptyLeaderboard();
    }

    try {
      // Get January date range timestamps
      const startTs = getJanuaryWalkingStartTimestamp();
      const endTs = getJanuaryWalkingEndTimestamp();
      console.log(`[JanuaryWalking] Date range: ${new Date(startTs * 1000).toLocaleDateString()} - ${new Date(endTs * 1000).toLocaleDateString()}`);

      // Query Supabase for walking workouts in date range
      const walkingWorkouts = await this.fetchWorkoutsFromSupabase(startTs, endTs);

      console.log(`[JanuaryWalking] Fetched from Supabase: ${walkingWorkouts.length} walking workouts`);

      // Get ALL joined participants from Supabase (source of truth)
      const joinedParticipants = await this.getAllJoinedParticipantsFromSupabase();
      const eligiblePubkeys = new Set(joinedParticipants.keys());

      // Also include local joins (for instant UI feedback before Supabase sync)
      const locallyJoined = await this.getJoinedUsers();
      for (const pubkey of locallyJoined) {
        eligiblePubkeys.add(pubkey);
      }

      console.log(`[JanuaryWalking] Eligible participants: ${eligiblePubkeys.size} (Supabase: ${joinedParticipants.size}, local: ${locallyJoined.length})`);

      // Aggregate steps per participant (ALL eligible users)
      const stats = new Map<string, { steps: number; workoutCount: number }>();

      for (const w of walkingWorkouts) {
        // Convert npub to pubkey for eligibility check
        let pubkey = w.pubkey;
        if (w.npub && !pubkey) {
          try {
            const decoded = nip19.decode(w.npub);
            pubkey = decoded.data as string;
          } catch {
            continue; // Skip invalid npub
          }
        }
        if (!pubkey || !eligiblePubkeys.has(pubkey)) continue;

        const existing = stats.get(pubkey) || { steps: 0, workoutCount: 0 };
        existing.steps += w.steps;
        existing.workoutCount += 1;
        stats.set(pubkey, existing);
      }

      // LOCAL-FIRST: Merge pending submissions for instant user appearance
      // Get pending submissions in the January Walking date range
      const pendingSubmissions = await this.getPendingForDateRange(startTs, endTs);
      const walkingPending = pendingSubmissions.filter(
        p => p.submissionData.type?.toLowerCase() === 'walking'
      );

      if (walkingPending.length > 0) {
        console.log(`[JanuaryWalking] Merging ${walkingPending.length} pending walking workouts`);

        for (const pending of walkingPending) {
          // Convert npub to pubkey
          let pubkey = '';
          try {
            const decoded = nip19.decode(pending.submissionData.npub);
            pubkey = decoded.data as string;
          } catch {
            continue; // Skip invalid npub
          }

          // Only include if user is eligible (joined)
          if (!eligiblePubkeys.has(pubkey)) continue;

          // Extract steps from tags
          const stepsTag = pending.submissionData.tags?.find(t => t[0] === 'steps');
          const steps = stepsTag ? parseInt(stepsTag[1]) || 0 : 0;

          if (steps > 0) {
            const existing = stats.get(pubkey) || { steps: 0, workoutCount: 0 };
            existing.steps += steps;
            existing.workoutCount += 1;
            stats.set(pubkey, existing);
          }
        }
      }

      // Build participant entries with profile data from Supabase
      const participantEntries: JanuaryWalkingParticipant[] = [];
      for (const [pubkey, data] of stats) {
        // Get profile from Supabase joined participants (or Season II as fallback)
        const supabaseProfile = joinedParticipants.get(pubkey);
        const season2Profile = SEASON_2_PARTICIPANTS.find(p => p.pubkey === pubkey);

        let name = supabaseProfile?.name || season2Profile?.name;
        let picture = supabaseProfile?.picture || season2Profile?.picture;
        let npub = supabaseProfile?.npub || season2Profile?.npub;

        if (!npub) {
          try {
            npub = nip19.npubEncode(pubkey);
          } catch {
            // Ignore encoding errors
          }
        }

        participantEntries.push({
          pubkey,
          npub,
          name: name || 'Anonymous Athlete',
          picture,
          totalSteps: data.steps,
          workoutCount: data.workoutCount,
          isJoined: true,
          rank: 0,
        });
      }

      // Add joined users who have 0 workouts (so they appear on leaderboard after joining)
      const participantPubkeys = new Set(participantEntries.map(p => p.pubkey));

      // Add from Supabase joined participants with 0 workouts
      for (const [pubkey, profile] of joinedParticipants) {
        if (!participantPubkeys.has(pubkey)) {
          participantEntries.push({
            pubkey,
            npub: profile.npub,
            name: profile.name || 'Anonymous Athlete',
            picture: profile.picture,
            totalSteps: 0,
            workoutCount: 0,
            isJoined: true,
            rank: 0,
          });
        }
      }

      // Add local joins with 0 workouts (for instant UI before Supabase sync)
      const participantPubkeysAfterSupabase = new Set(participantEntries.map(p => p.pubkey));
      for (const joinedPubkey of locallyJoined) {
        if (!participantPubkeysAfterSupabase.has(joinedPubkey)) {
          let npub: string | undefined;
          try {
            npub = nip19.npubEncode(joinedPubkey);
          } catch {
            // Ignore encoding errors
          }

          participantEntries.push({
            pubkey: joinedPubkey,
            npub,
            name: 'Anonymous Athlete',
            picture: undefined,
            totalSteps: 0,
            workoutCount: 0,
            isJoined: true,
            rank: 0,
          });
        }
      }

      // Sort by steps (descending) and assign ranks
      participantEntries.sort((a, b) => b.totalSteps - a.totalSteps);
      participantEntries.forEach((p, index) => {
        p.rank = index + 1;
      });

      // Check if current user should be included
      let currentUserEntry: JanuaryWalkingParticipant | undefined;
      let currentUserRank: number | undefined;

      if (currentUserPubkey) {
        // Check if user has joined (either in Supabase or locally)
        const hasJoined = eligiblePubkeys.has(currentUserPubkey);

        if (hasJoined) {
          // Check if user is already in the participant list
          const existingEntry = participantEntries.find(p => p.pubkey === currentUserPubkey);

          if (existingEntry) {
            currentUserRank = existingEntry.rank;
          } else {
            // User joined but not in list (shouldn't happen after above logic, but handle it)
            const profile = joinedParticipants.get(currentUserPubkey) || SEASON_2_PARTICIPANTS.find(p => p.pubkey === currentUserPubkey);
            currentUserRank = participantEntries.length + 1;
            currentUserEntry = {
              pubkey: currentUserPubkey,
              npub: profile?.npub,
              name: profile?.name || `User ${currentUserPubkey.slice(0, 8)}`,
              picture: profile?.picture,
              totalSteps: 0,
              workoutCount: 0,
              isJoined: true,
              rank: currentUserRank,
            };
          }
        }
      }

      // Calculate totals
      const totalSteps = participantEntries.reduce((sum, p) => sum + p.totalSteps, 0);

      console.log(`[JanuaryWalking] Leaderboard built in ${Date.now() - startTime}ms`);
      console.log(`[JanuaryWalking]   - Season II participants with data: ${participantEntries.length}`);
      console.log(`[JanuaryWalking]   - Total steps: ${totalSteps.toLocaleString()}`);

      return {
        participants: participantEntries.slice(0, 25), // Top 25
        currentUserEntry,
        currentUserRank,
        totalParticipants: participantEntries.length,
        totalSteps,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error('[JanuaryWalking] Error getting leaderboard:', error);
      return this.emptyLeaderboard();
    }
  }

  /**
   * Get all locally joined users
   */
  async getJoinedUsers(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(JOINED_USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[JanuaryWalking] Error getting joined users:', error);
      return [];
    }
  }

  /**
   * Register user in Supabase with profile data
   * Fire-and-forget - doesn't block join flow
   */
  async registerInSupabase(npub: string): Promise<boolean> {
    try {
      let pubkey: string;
      try {
        const decoded = nip19.decode(npub);
        pubkey = decoded.data as string;
      } catch {
        pubkey = npub;
      }

      // Fetch user's Nostr profile
      const profiles = await ProfileCache.fetchProfiles([pubkey]);
      const profile = profiles.get(pubkey);
      const profileData = profile
        ? { name: profile.name, picture: profile.picture }
        : undefined;

      const result = await SupabaseCompetitionService.joinCompetition(
        'january-walking',
        profileData
      );

      if (result.success) {
        console.log(`[JanuaryWalking] ✅ Registered ${npub.slice(0, 12)}... in Supabase`);
      }
      return result.success;
    } catch (error) {
      console.warn('[JanuaryWalking] Failed to register in Supabase:', error);
      return false;
    }
  }

  /**
   * Get ALL joined participants from Supabase (npub, pubkey, name, picture)
   * This is the source of truth for who is in the competition
   */
  async getAllJoinedParticipantsFromSupabase(): Promise<Map<string, { npub: string; pubkey: string; name?: string; picture?: string }>> {
    const participants = new Map<string, { npub: string; pubkey: string; name?: string; picture?: string }>();

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return participants;
      }

      const competitionId = await SupabaseCompetitionService.getCompetitionId('january-walking');
      if (!competitionId) {
        return participants;
      }

      const url = `${supabaseUrl}/rest/v1/competition_participants?competition_id=eq.${competitionId}&select=npub,name,picture`;
      const response = await fetch(url, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      if (!response.ok) return participants;

      const data = await response.json();
      for (const row of data) {
        if (row.npub) {
          // Convert npub to pubkey
          let pubkey = '';
          try {
            const decoded = nip19.decode(row.npub);
            // npub decode returns { type: 'npub', data: string (hex pubkey) }
            pubkey = typeof decoded.data === 'string' ? decoded.data : '';
            if (!pubkey) continue;
          } catch {
            continue; // Skip invalid npub
          }

          participants.set(pubkey, {
            npub: row.npub,
            pubkey,
            name: row.name,
            picture: row.picture,
          });
        }
      }

      console.log(`[JanuaryWalking] Loaded ${participants.size} joined participants from Supabase`);
    } catch (error) {
      console.warn('[JanuaryWalking] Error fetching Supabase participants:', error);
    }

    return participants;
  }

  /**
   * Get pending submissions for a date range
   * Used for hybrid leaderboards to merge local pending workouts
   */
  private async getPendingForDateRange(startTs: number, endTs: number): Promise<PendingSubmission[]> {
    try {
      const allPending = await PendingSubmissionService.getPending();

      // Filter to submissions within the date range (using startTime)
      return allPending.filter(p => {
        const submissionTime = new Date(p.submissionData.startTime).getTime() / 1000;
        return submissionTime >= startTs && submissionTime <= endTs;
      });
    } catch (error) {
      console.warn('[JanuaryWalking] Failed to get pending submissions:', error);
      return [];
    }
  }

  /**
   * Create empty leaderboard structure
   */
  private emptyLeaderboard(): JanuaryWalkingLeaderboard {
    return {
      participants: [],
      totalParticipants: 0,
      totalSteps: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Fetch walking workouts from Supabase for January date range
   * Queries workouts that have been validated by anti-cheat
   */
  private async fetchWorkoutsFromSupabase(
    startTs: number,
    endTs: number
  ): Promise<Array<{ npub: string; pubkey: string; steps: number; createdAt: number }>> {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[JanuaryWalking] Supabase not configured');
      return [];
    }

    try {
      const startDate = new Date(startTs * 1000).toISOString();
      const endDate = new Date(endTs * 1000).toISOString();

      // Query walking workouts in date range - fetch step_count for step-based competition
      const url = `${supabaseUrl}/rest/v1/workout_submissions?` +
        `activity_type=eq.walking&` +
        `created_at=gte.${startDate}&` +
        `created_at=lte.${endDate}&` +
        `select=npub,step_count,created_at&` +
        `limit=10000`;

      const response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });

      if (!response.ok) {
        console.error('[JanuaryWalking] Failed to fetch workouts:', response.status);
        return [];
      }

      const data = await response.json();
      console.log(`[JanuaryWalking] Fetched ${data.length} walking workouts from Supabase`);

      // Transform to internal format
      return data.map((row: {
        npub: string;
        step_count: number | null;
        created_at: string;
      }) => {
        // Convert npub to pubkey
        let pubkey = '';
        try {
          const decoded = nip19.decode(row.npub);
          pubkey = decoded.data as string;
        } catch {
          // Keep empty if decode fails
        }

        return {
          npub: row.npub,
          pubkey,
          steps: row.step_count || 0,
          createdAt: new Date(row.created_at).getTime() / 1000,
        };
      });
    } catch (error) {
      console.error('[JanuaryWalking] Error fetching workouts from Supabase:', error);
      return [];
    }
  }

  /**
   * Join the January Walking Contest
   * Uses local-first pattern with fire-and-forget Supabase registration
   */
  async join(pubkey: string): Promise<boolean> {
    try {
      // Get existing joined users
      const joinedUsers = await this.getJoinedUsers();

      // Add user if not already joined
      if (!joinedUsers.includes(pubkey)) {
        joinedUsers.push(pubkey);
        await AsyncStorage.setItem(JOINED_USERS_KEY, JSON.stringify(joinedUsers));
        console.log(`[JanuaryWalking] User ${pubkey.slice(0, 8)} joined the contest`);
      }

      // Fire-and-forget: Register in Supabase with profile data
      const npub = nip19.npubEncode(pubkey);
      this.registerInSupabase(npub).catch((err) => {
        console.warn('[JanuaryWalking] Supabase registration failed (non-blocking):', err);
      });

      return true;
    } catch (error) {
      console.error('[JanuaryWalking] Error joining contest:', error);
      return false;
    }
  }

  /**
   * Check if user has joined the contest
   */
  async hasJoined(pubkey: string): Promise<boolean> {
    try {
      const joinedUsers = await this.getJoinedUsers();
      return joinedUsers.includes(pubkey);
    } catch (error) {
      console.error('[JanuaryWalking] Error checking join status:', error);
      return false;
    }
  }

  /**
   * Check if user is a Season II participant (eligible for prize)
   */
  isSeasonParticipant(pubkey: string): boolean {
    return SEASON_2_PARTICIPANTS.some(p => p.pubkey === pubkey);
  }

  /**
   * Leave the contest (remove local join)
   */
  async leave(pubkey: string): Promise<boolean> {
    try {
      const joinedUsers = await this.getJoinedUsers();
      const filtered = joinedUsers.filter((p) => p !== pubkey);
      await AsyncStorage.setItem(JOINED_USERS_KEY, JSON.stringify(filtered));
      console.log(`[JanuaryWalking] User ${pubkey.slice(0, 8)} left the contest`);
      return true;
    } catch (error) {
      console.error('[JanuaryWalking] Error leaving contest:', error);
      return false;
    }
  }

  /**
   * Get all participant pubkeys (Season II participants)
   */
  getParticipantPubkeys(): string[] {
    return SEASON_2_PARTICIPANTS.map(p => p.pubkey);
  }

  /**
   * Build leaderboard from baseline data only (instant load)
   * Uses walking totals from Season II baseline
   * Note: Baseline data has distance, so we estimate steps (~1,300 steps/km)
   */
  buildLeaderboardFromBaseline(currentUserPubkey?: string): JanuaryWalkingLeaderboard {
    console.log('[JanuaryWalking] Building leaderboard from baseline data');

    const STEPS_PER_KM = 1300; // Approximate steps per km for walking
    const participants: JanuaryWalkingParticipant[] = [];

    for (const participant of SEASON_2_PARTICIPANTS) {
      const baseline = getBaselineTotals(participant.pubkey);
      const walkingDistance = baseline.walking.distance;
      const walkingCount = baseline.walking.count;

      // Only include participants with walking data
      if (walkingCount > 0) {
        participants.push({
          pubkey: participant.pubkey,
          npub: participant.npub,
          name: participant.name,
          picture: participant.picture,
          totalSteps: Math.round(walkingDistance * STEPS_PER_KM),
          workoutCount: walkingCount,
          isJoined: true,
          rank: 0,
        });
      }
    }

    // Sort by steps and assign ranks
    participants.sort((a, b) => b.totalSteps - a.totalSteps);
    participants.forEach((p, index) => {
      p.rank = index + 1;
    });

    // Find current user entry if outside visible range
    let currentUserEntry: JanuaryWalkingParticipant | undefined;
    let currentUserRank: number | undefined;

    if (currentUserPubkey) {
      const userIndex = participants.findIndex(p => p.pubkey === currentUserPubkey);
      if (userIndex >= 0) {
        currentUserRank = userIndex + 1;
      }
    }

    const totalSteps = participants.reduce((sum, p) => sum + p.totalSteps, 0);

    console.log(`[JanuaryWalking] Baseline: ${participants.length} participants, ${totalSteps.toLocaleString()} steps total`);

    return {
      participants,
      currentUserEntry,
      currentUserRank,
      totalParticipants: participants.length,
      totalSteps,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Build leaderboard from baseline + fresh workouts
   * Fresh workouts are added on top of baseline totals
   * Note: Baseline data has distance, so we estimate steps (~1,300 steps/km)
   */
  buildLeaderboardFromFresh(
    freshWorkouts: CachedWorkout[],
    currentUserPubkey?: string
  ): JanuaryWalkingLeaderboard {
    console.log(`[JanuaryWalking] Building leaderboard from baseline + ${freshWorkouts.length} fresh workouts`);

    const STEPS_PER_KM = 1300; // Approximate steps per km for walking

    // Start with baseline data (converted to estimated steps)
    const stats = new Map<string, { steps: number; workoutCount: number }>();

    for (const participant of SEASON_2_PARTICIPANTS) {
      const baseline = getBaselineTotals(participant.pubkey);
      stats.set(participant.pubkey, {
        steps: Math.round(baseline.walking.distance * STEPS_PER_KM),
        workoutCount: baseline.walking.count,
      });
    }

    // Add fresh walking workouts on top (convert distance to estimated steps)
    for (const workout of freshWorkouts) {
      const activityLower = workout.activityType?.toLowerCase() || '';
      if (!activityLower.includes('walk')) continue;

      const existing = stats.get(workout.pubkey);
      if (existing) {
        existing.steps += Math.round(workout.distance * STEPS_PER_KM);
        existing.workoutCount += 1;
      }
    }

    // Build participant entries
    const participants: JanuaryWalkingParticipant[] = [];

    for (const participant of SEASON_2_PARTICIPANTS) {
      const data = stats.get(participant.pubkey);
      if (!data || data.workoutCount === 0) continue;

      participants.push({
        pubkey: participant.pubkey,
        npub: participant.npub,
        name: participant.name,
        picture: participant.picture,
        totalSteps: data.steps,
        workoutCount: data.workoutCount,
        isJoined: true,
        rank: 0,
      });
    }

    // Sort by steps and assign ranks
    participants.sort((a, b) => b.totalSteps - a.totalSteps);
    participants.forEach((p, index) => {
      p.rank = index + 1;
    });

    // Find current user entry
    let currentUserEntry: JanuaryWalkingParticipant | undefined;
    let currentUserRank: number | undefined;

    if (currentUserPubkey) {
      const userIndex = participants.findIndex(p => p.pubkey === currentUserPubkey);
      if (userIndex >= 0) {
        currentUserRank = userIndex + 1;
      }
    }

    const totalSteps = participants.reduce((sum, p) => sum + p.totalSteps, 0);

    console.log(`[JanuaryWalking] Fresh: ${participants.length} participants, ${totalSteps.toLocaleString()} steps total`);

    return {
      participants,
      currentUserEntry,
      currentUserRank,
      totalParticipants: participants.length,
      totalSteps,
      lastUpdated: Date.now(),
    };
  }
}

// Export singleton instance
export const JanuaryWalkingService = JanuaryWalkingServiceClass.getInstance();
