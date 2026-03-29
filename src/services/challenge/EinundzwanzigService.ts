/**
 * EinundzwanzigService - Einundzwanzig Fitness Challenge Service
 *
 * A team-based charity fundraiser for the Einundzwanzig community.
 * Participants select a charity and their running/walking distance
 * contributes to that charity's total.
 *
 * Features:
 * - Team-based leaderboard (charities ranked by total distance)
 * - Charity selection on join
 * - Uses UnifiedWorkoutCache for workout data
 * - Local storage for participant tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { nip19 } from 'nostr-tools';
import { UnifiedWorkoutCache } from '../cache/UnifiedWorkoutCache';
import {
  getEinundzwanzigStatus,
  getEinundzwanzigStartTimestamp,
  getEinundzwanzigEndTimestamp,
  calculateSatsFromDistance,
  EINUNDZWANZIG_COMPETITION_ID,
} from '../../constants/einundzwanzig';
import { CHARITIES, getCharityById } from '../../constants/charities';
import { SEASON_2_PARTICIPANTS } from '../../constants/season2';
import { ProfileCache } from '../../cache/ProfileCache';
import { SupabaseCompetitionService } from '../backend/SupabaseCompetitionService';
import { fetchWithTimeout } from '../../utils/networkUtils';

const JOINED_USERS_KEY = '@runstr:einundzwanzig_joined';
const SUPABASE_PROFILES_CACHE_KEY = '@runstr:einundzwanzig_supabase_profiles';
const SUPABASE_FETCH_TIMEOUT = 10000; // 10 seconds

export interface EinundzwanzigJoinRecord {
  pubkey: string;
  charityId: string;
  joinedAt: number;
}

export interface EinundzwanzigParticipant {
  pubkey: string;
  npub?: string;
  name: string;
  picture?: string;
  charityId: string;
  totalDistanceKm: number;
  workoutCount: number;
}

export interface CharityTeam {
  charityId: string;
  charityName: string;
  charityImage?: number;
  lightningAddress?: string;
  totalDistanceKm: number;
  estimatedSats: number;
  participants: EinundzwanzigParticipant[];
  participantCount: number;
}

export interface EinundzwanzigLeaderboard {
  charityTeams: CharityTeam[];
  totalDistanceKm: number;
  totalEstimatedSats: number;
  totalParticipants: number;
  lastUpdated: number;
}

class EinundzwanzigServiceClass {
  private static instance: EinundzwanzigServiceClass;

  static getInstance(): EinundzwanzigServiceClass {
    if (!this.instance) {
      this.instance = new EinundzwanzigServiceClass();
    }
    return this.instance;
  }

  /**
   * Get the Einundzwanzig Challenge leaderboard
   * Returns charity teams ranked by total distance
   */
  async getLeaderboard(): Promise<EinundzwanzigLeaderboard> {
    const startTime = Date.now();
    console.log(`[Einundzwanzig] ========== getLeaderboard() ==========`);

    // If event hasn't started yet, return empty leaderboard
    const status = getEinundzwanzigStatus();
    if (status === 'upcoming') {
      console.log('[Einundzwanzig] Event is upcoming - returning empty leaderboard');
      return this.emptyLeaderboard();
    }

    try {
      // Get date range timestamps
      const startTs = getEinundzwanzigStartTimestamp();
      const endTs = getEinundzwanzigEndTimestamp();
      console.log(
        `[Einundzwanzig] Date range: ${new Date(startTs * 1000).toLocaleDateString()} - ${new Date(endTs * 1000).toLocaleDateString()}`
      );

      // Get workouts from cache, filtered by date range
      const cache = UnifiedWorkoutCache;
      await cache.ensureLoaded();

      const runningWorkouts = cache
        .getWorkoutsByActivity('running')
        .filter((w) => w.createdAt >= startTs && w.createdAt <= endTs);
      const walkingWorkouts = cache
        .getWorkoutsByActivity('walking')
        .filter((w) => w.createdAt >= startTs && w.createdAt <= endTs);

      console.log(
        `[Einundzwanzig] Filtered workouts - Running: ${runningWorkouts.length}, Walking: ${walkingWorkouts.length}`
      );

      // Get all joined users
      const joinedUsers = await this.getJoinedUsers();
      const joinedPubkeys = new Set(joinedUsers.map((u) => u.pubkey));

      // Build map of pubkey -> charityId
      const userCharityMap = new Map<string, string>();
      for (const record of joinedUsers) {
        userCharityMap.set(record.pubkey, record.charityId);
      }

      // Aggregate distance per user using MAX(steps, GPS) per day
      // This is simple, fair, and prevents double-counting
      const userStats = new Map<
        string,
        { distance: number; workoutCount: number }
      >();

      // Track GPS distance per user-day: "pubkey:YYYY-MM-DD" -> distance
      const gpsDistanceByDay = new Map<string, number>();

      // First pass: Process GPS workouts
      for (const w of [...runningWorkouts, ...walkingWorkouts]) {
        if (!joinedPubkeys.has(w.pubkey)) continue;
        if (w.id?.startsWith('steps_')) continue;

        const dateStr = new Date(w.createdAt * 1000).toISOString().split('T')[0];
        const dayKey = `${w.pubkey}:${dateStr}`;
        gpsDistanceByDay.set(dayKey, (gpsDistanceByDay.get(dayKey) || 0) + w.distance);

        const existing = userStats.get(w.pubkey) || { distance: 0, workoutCount: 0 };
        existing.distance += w.distance;
        existing.workoutCount += 1;
        userStats.set(w.pubkey, existing);
      }

      // Second pass: For step workouts, add only if steps > GPS that day
      for (const w of [...runningWorkouts, ...walkingWorkouts]) {
        if (!joinedPubkeys.has(w.pubkey)) continue;
        if (!w.id?.startsWith('steps_')) continue;

        const dateStr = w.id.split('_')[1];
        const dayKey = `${w.pubkey}:${dateStr}`;
        const gpsThisDay = gpsDistanceByDay.get(dayKey) || 0;

        // Use steps only if they exceed GPS for this day
        if (w.distance > gpsThisDay) {
          const extra = w.distance - gpsThisDay;
          const existing = userStats.get(w.pubkey) || { distance: 0, workoutCount: 0 };
          existing.distance += extra;
          if (gpsThisDay === 0) existing.workoutCount += 1;
          userStats.set(w.pubkey, existing);
        }
      }

      // Fetch profiles from Supabase for non-Season II users
      const supabaseProfiles = await this.getParticipantProfilesFromSupabase();

      // Group participants by charity
      const charityParticipants = new Map<string, EinundzwanzigParticipant[]>();

      for (const record of joinedUsers) {
        const stats = userStats.get(record.pubkey) || {
          distance: 0,
          workoutCount: 0,
        };

        // Profile resolution chain: Season II → Supabase → fallback
        const season2Profile = SEASON_2_PARTICIPANTS.find(
          (p) => p.pubkey === record.pubkey
        );

        let name = season2Profile?.name;
        let picture = season2Profile?.picture;
        let npub = season2Profile?.npub;

        // If not Season II, try Supabase profiles
        if (!season2Profile) {
          try {
            npub = nip19.npubEncode(record.pubkey);
            const supabaseProfile = supabaseProfiles.get(npub);
            if (supabaseProfile) {
              name = supabaseProfile.name;
              picture = supabaseProfile.picture;
            }
          } catch {
            // Ignore encoding errors
          }
        }

        const participant: EinundzwanzigParticipant = {
          pubkey: record.pubkey,
          npub,
          name: name || 'Anonymous Athlete',
          picture,
          charityId: record.charityId,
          totalDistanceKm: stats.distance,
          workoutCount: stats.workoutCount,
        };

        const existing = charityParticipants.get(record.charityId) || [];
        existing.push(participant);
        charityParticipants.set(record.charityId, existing);
      }

      // Build charity teams
      const charityTeams: CharityTeam[] = [];

      for (const [charityId, participants] of charityParticipants) {
        const charity = getCharityById(charityId);
        const totalDistance = participants.reduce(
          (sum, p) => sum + p.totalDistanceKm,
          0
        );

        // Sort participants by distance within team
        participants.sort((a, b) => b.totalDistanceKm - a.totalDistanceKm);

        charityTeams.push({
          charityId,
          charityName: charity?.name || charityId,
          charityImage: charity?.image,
          lightningAddress: charity?.lightningAddress,
          totalDistanceKm: totalDistance,
          estimatedSats: calculateSatsFromDistance(totalDistance),
          participants,
          participantCount: participants.length,
        });
      }

      // Sort charity teams by total distance (descending)
      charityTeams.sort((a, b) => b.totalDistanceKm - a.totalDistanceKm);

      // Calculate totals
      const totalDistanceKm = charityTeams.reduce(
        (sum, t) => sum + t.totalDistanceKm,
        0
      );
      const totalParticipants = joinedUsers.length;

      console.log(`[Einundzwanzig] Leaderboard built in ${Date.now() - startTime}ms`);
      console.log(`[Einundzwanzig]   - Charity teams: ${charityTeams.length}`);
      console.log(`[Einundzwanzig]   - Total participants: ${totalParticipants}`);
      console.log(`[Einundzwanzig]   - Total distance: ${totalDistanceKm.toFixed(2)} km`);

      return {
        charityTeams,
        totalDistanceKm,
        totalEstimatedSats: calculateSatsFromDistance(totalDistanceKm),
        totalParticipants,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error('[Einundzwanzig] Error getting leaderboard:', error);
      return this.emptyLeaderboard();
    }
  }

  /**
   * Join the Einundzwanzig Challenge
   * Team attribution comes from team tag on kind 1301 workout events
   * Uses local-first pattern with fire-and-forget Supabase registration
   */
  async joinChallenge(pubkey: string): Promise<boolean> {
    try {
      const joinedUsers = await this.getJoinedUsers();

      // Check if already joined
      const existingIndex = joinedUsers.findIndex((u) => u.pubkey === pubkey);
      if (existingIndex >= 0) {
        console.log(`[Einundzwanzig] User ${pubkey.slice(0, 8)} already joined`);
        return true;
      }

      // New join - team attribution comes from workout events, not join time
      joinedUsers.push({
        pubkey,
        charityId: '', // Team attribution from kind 1301 events
        joinedAt: Date.now(),
      });
      console.log(`[Einundzwanzig] User ${pubkey.slice(0, 8)} joined challenge`);

      // Save to local storage (instant UX)
      await AsyncStorage.setItem(JOINED_USERS_KEY, JSON.stringify(joinedUsers));

      // Fire-and-forget: Register in Supabase
      const npub = nip19.npubEncode(pubkey);
      this.registerInSupabase(npub).catch((err) => {
        console.warn('[Einundzwanzig] Supabase registration failed (non-blocking):', err);
      });

      return true;
    } catch (error) {
      console.error('[Einundzwanzig] Error joining challenge:', error);
      return false;
    }
  }

  /**
   * Check if user has joined the challenge
   */
  async hasJoined(pubkey: string): Promise<boolean> {
    try {
      const joinedUsers = await this.getJoinedUsers();
      return joinedUsers.some((u) => u.pubkey === pubkey);
    } catch (error) {
      console.error('[Einundzwanzig] Error checking join status:', error);
      return false;
    }
  }

  /**
   * Get user's selected charity
   */
  async getUserCharity(pubkey: string): Promise<string | null> {
    try {
      const joinedUsers = await this.getJoinedUsers();
      const record = joinedUsers.find((u) => u.pubkey === pubkey);
      return record?.charityId || null;
    } catch (error) {
      console.error('[Einundzwanzig] Error getting user charity:', error);
      return null;
    }
  }

  /**
   * Leave the challenge
   */
  async leaveChallenge(pubkey: string): Promise<boolean> {
    try {
      const joinedUsers = await this.getJoinedUsers();
      const filtered = joinedUsers.filter((u) => u.pubkey !== pubkey);
      await AsyncStorage.setItem(JOINED_USERS_KEY, JSON.stringify(filtered));
      console.log(`[Einundzwanzig] User ${pubkey.slice(0, 8)} left the challenge`);
      return true;
    } catch (error) {
      console.error('[Einundzwanzig] Error leaving challenge:', error);
      return false;
    }
  }

  /**
   * Get all joined users
   */
  async getJoinedUsers(): Promise<EinundzwanzigJoinRecord[]> {
    try {
      const stored = await AsyncStorage.getItem(JOINED_USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[Einundzwanzig] Error getting joined users:', error);
      return [];
    }
  }

  /**
   * Get available charities for selection
   */
  getAvailableCharities() {
    return CHARITIES.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      image: c.image,
    }));
  }

  /**
   * Register user in Supabase for the einundzwanzig competition
   * Fire-and-forget - doesn't block join flow
   */
  async registerInSupabase(npub: string): Promise<boolean> {
    try {
      // Decode npub to get hex pubkey for profile fetch
      let pubkey: string;
      try {
        const decoded = nip19.decode(npub);
        pubkey = decoded.data as string;
      } catch {
        pubkey = npub; // Assume it's already hex
      }

      // Fetch user's Nostr profile (kind 0)
      const profiles = await ProfileCache.fetchProfiles([pubkey]);
      const profile = profiles.get(pubkey);
      const profileData = profile
        ? { name: profile.name, picture: profile.picture }
        : undefined;

      // Register for the combined einundzwanzig competition
      const result = await SupabaseCompetitionService.joinCompetition(
        EINUNDZWANZIG_COMPETITION_ID,
        profileData
      );

      if (result.success) {
        console.log(`[Einundzwanzig] ✅ Registered ${npub.slice(0, 12)}... for Einundzwanzig Challenge`);
      }

      return result.success;
    } catch (error) {
      console.warn('[Einundzwanzig] Failed to register in Supabase:', error);
      return false;
    }
  }

  /**
   * Get participant profiles from Supabase for leaderboard display
   * Returns map of npub → { name, picture }
   *
   * NETWORK RESILIENCE:
   * - Uses timeout to prevent app freeze on slow networks
   * - Returns cached data on network failure
   * - Caches successful responses for fallback
   */
  async getParticipantProfilesFromSupabase(): Promise<Map<string, { name?: string; picture?: string }>> {
    const profiles = new Map<string, { name?: string; picture?: string }>();

    // Helper to load cached profiles
    const loadCachedProfiles = async (): Promise<Map<string, { name?: string; picture?: string }>> => {
      try {
        const cached = await AsyncStorage.getItem(SUPABASE_PROFILES_CACHE_KEY);
        if (cached) {
          const entries = JSON.parse(cached) as [string, { name?: string; picture?: string }][];
          return new Map(entries);
        }
      } catch {
        // Ignore cache read errors
      }
      return new Map();
    };

    // Helper to save profiles to cache
    const saveProfilesToCache = async (profilesMap: Map<string, { name?: string; picture?: string }>): Promise<void> => {
      try {
        const entries = Array.from(profilesMap.entries());
        await AsyncStorage.setItem(SUPABASE_PROFILES_CACHE_KEY, JSON.stringify(entries));
      } catch {
        // Ignore cache write errors
      }
    };

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn('[Einundzwanzig] Supabase not configured, returning cached');
        return await loadCachedProfiles();
      }

      // Get competition ID for einundzwanzig
      const competitionId = await SupabaseCompetitionService.getCompetitionId('einundzwanzig');
      if (!competitionId) {
        console.warn('[Einundzwanzig] Competition not found, returning cached');
        return await loadCachedProfiles();
      }

      // Query participants with profile data (with timeout)
      const url = `${supabaseUrl}/rest/v1/competition_participants?competition_id=eq.${competitionId}&select=npub,name,picture`;
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
        SUPABASE_FETCH_TIMEOUT
      );

      if (!response.ok) {
        console.warn('[Einundzwanzig] Supabase fetch failed, returning cached');
        return await loadCachedProfiles();
      }

      const data = await response.json();
      for (const row of data) {
        if (row.npub && (row.name || row.picture)) {
          profiles.set(row.npub, { name: row.name, picture: row.picture });
        }
      }

      // Cache successful response for future fallback
      await saveProfilesToCache(profiles);

      console.log(`[Einundzwanzig] Loaded ${profiles.size} profiles from Supabase`);
    } catch (error) {
      // Network timeout or other failure - return cached data
      console.warn('[Einundzwanzig] Error fetching Supabase profiles, using cache:', error);
      return await loadCachedProfiles();
    }

    return profiles;
  }

  /**
   * Create empty leaderboard structure
   */
  private emptyLeaderboard(): EinundzwanzigLeaderboard {
    return {
      charityTeams: [],
      totalDistanceKm: 0,
      totalEstimatedSats: 0,
      totalParticipants: 0,
      lastUpdated: Date.now(),
    };
  }
}

// Export singleton instance
export const EinundzwanzigService = EinundzwanzigServiceClass.getInstance();
