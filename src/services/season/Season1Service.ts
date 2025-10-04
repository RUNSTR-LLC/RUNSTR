/**
 * Season1Service - Fetches and manages RUNSTR Season 1 competition data
 * Queries Nostr for participant list and workout events
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NDK, { NDKEvent, NDKFilter, NDKUser } from '@nostr-dev-kit/ndk';
import { NostrInitializationService } from '../nostr/NostrInitializationService';
import { SEASON_1_CONFIG } from '../../types/season';
import type {
  Season1Participant,
  Season1Leaderboard,
  SeasonActivityType
} from '../../types/season';

// Cache keys
const CACHE_KEYS = {
  PARTICIPANTS: '@season1:participants',
  ALL_WORKOUTS: '@season1:all_workouts',
  PROFILES: '@season1:profiles',
};

// Cache duration in milliseconds
const CACHE_DURATION = {
  PARTICIPANTS: 24 * 60 * 60 * 1000, // 24 hours
  WORKOUTS: 24 * 60 * 60 * 1000, // 24 hours
  PROFILES: 24 * 60 * 60 * 1000, // 24 hours
};

// Query timeout in milliseconds
const QUERY_TIMEOUT = 15000; // 15 seconds

class Season1Service {
  private participantsCache: {
    data: string[] | null;
    timestamp: number;
  } = { data: null, timestamp: 0 };

  private workoutsCache: {
    data: NDKEvent[] | null;
    timestamp: number;
  } = { data: null, timestamp: 0 };

  private profilesCache: {
    data: Map<string, any> | null;
    timestamp: number;
  } = { data: null, timestamp: 0 };

  private ndk: NDK | null = null;

  /**
   * Get or initialize NDK instance
   */
  private async getNDK(): Promise<NDK> {
    if (this.ndk) {
      return this.ndk;
    }

    // Try to get pre-initialized NDK from global
    if ((global as any).preInitializedNDK) {
      this.ndk = (global as any).preInitializedNDK;
      return this.ndk;
    }

    // Initialize NDK if not available
    const initService = NostrInitializationService.getInstance();
    this.ndk = await initService.initializeNDK();
    return this.ndk;
  }

  /**
   * Fetch events with timeout to prevent hanging on slow connections
   */
  private async fetchEventsWithTimeout(
    ndk: NDK,
    filter: NDKFilter,
    timeoutMs: number = QUERY_TIMEOUT
  ): Promise<Set<NDKEvent>> {
    return Promise.race([
      ndk.fetchEvents(filter),
      new Promise<Set<NDKEvent>>((_, reject) =>
        setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Fetch participant list from Nostr kind 30000 event
   */
  async fetchParticipantList(): Promise<string[]> {
    console.log('[Season1] Fetching participant list from Nostr...');
    console.log('[Season1] Admin pubkey:', SEASON_1_CONFIG.adminPubkey);
    console.log('[Season1] D-tag:', SEASON_1_CONFIG.participantListDTag);

    // Check memory cache first
    const now = Date.now();
    if (
      this.participantsCache.data &&
      now - this.participantsCache.timestamp < CACHE_DURATION.PARTICIPANTS
    ) {
      console.log('[Season1] Using cached participants:', this.participantsCache.data.length);
      return this.participantsCache.data;
    }

    try {
      // Get NDK instance
      const ndk = await this.getNDK();

      // Query for the NIP-51 participant list
      const filter: NDKFilter = {
        kinds: [30000],
        authors: [SEASON_1_CONFIG.adminPubkey],
        '#d': [SEASON_1_CONFIG.participantListDTag],
      };

      console.log('[Season1] Querying with filter:', JSON.stringify(filter));
      const events = await this.fetchEventsWithTimeout(ndk, filter);

      if (!events || events.size === 0) {
        console.log('[Season1] No participant list found on Nostr');
        console.log('[Season1] Attempting fallback query without d-tag...');

        // Try without d-tag to see if we get any lists
        const fallbackFilter: NDKFilter = {
          kinds: [30000],
          authors: [SEASON_1_CONFIG.adminPubkey],
        };

        const fallbackEvents = await this.fetchEventsWithTimeout(ndk, fallbackFilter);
        console.log('[Season1] Fallback query found', fallbackEvents.size, 'events');

        if (fallbackEvents.size > 0) {
          Array.from(fallbackEvents).forEach(event => {
            console.log('[Season1] Found list with d-tag:',
              event.tags?.find(tag => tag[0] === 'd')?.[1] || 'no d-tag');
          });
        }

        return [];
      }

      // Get the most recent event
      const eventArray = Array.from(events);
      const latestEvent = eventArray.sort((a, b) =>
        (b.created_at || 0) - (a.created_at || 0)
      )[0];

      console.log('[Season1] Found participant list event:', {
        id: latestEvent.id,
        created_at: new Date((latestEvent.created_at || 0) * 1000).toISOString(),
        tagCount: latestEvent.tags?.length || 0,
      });

      // Log all tags for debugging
      console.log('[Season1] Event tags:', latestEvent.tags?.map(tag =>
        `${tag[0]}: ${tag[1]?.substring(0, 16)}...`
      ).join(', '));

      // Extract participant pubkeys from 'p' tags
      const participants = latestEvent.tags
        ?.filter(tag => tag[0] === 'p' && tag[1])
        ?.map(tag => tag[1]) || [];

      console.log(`[Season1] Extracted ${participants.length} participants from 'p' tags`);

      // Log first few participants for verification
      if (participants.length > 0) {
        console.log('[Season1] First 3 participants:',
          participants.slice(0, 3).map(p => p.substring(0, 16) + '...').join(', '));
      }

      // Update cache
      this.participantsCache = {
        data: participants,
        timestamp: now,
      };

      // Store in AsyncStorage
      await AsyncStorage.setItem(
        CACHE_KEYS.PARTICIPANTS,
        JSON.stringify({
          participants,
          timestamp: now,
        })
      );

      return participants;
    } catch (error) {
      console.error('[Season1] Error fetching participants:', error);

      // Try to load from AsyncStorage
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.PARTICIPANTS);
        if (cached) {
          const { participants } = JSON.parse(cached);
          return participants || [];
        }
      } catch (cacheError) {
        console.error('[Season1] Error loading cached participants:', cacheError);
      }

      return [];
    }
  }

  /**
   * Fetch all workouts and profiles for all participants (unified cache)
   */
  private async fetchAllWorkoutsAndProfiles(participants: string[]): Promise<{
    workouts: NDKEvent[];
    profiles: Map<string, any>;
  }> {
    const now = Date.now();

    // Check workout cache
    if (
      this.workoutsCache.data &&
      this.profilesCache.data &&
      now - this.workoutsCache.timestamp < CACHE_DURATION.WORKOUTS &&
      now - this.profilesCache.timestamp < CACHE_DURATION.PROFILES
    ) {
      console.log('[Season1] Using cached workouts and profiles');
      return {
        workouts: this.workoutsCache.data,
        profiles: this.profilesCache.data,
      };
    }

    try {
      const ndk = await this.getNDK();
      const startTimestamp = Math.floor(new Date(SEASON_1_CONFIG.startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(SEASON_1_CONFIG.endDate).getTime() / 1000);

      // Fetch ALL workout events (all activity types) in parallel with profiles
      const [workoutEvents, profileEvents] = await Promise.all([
        // Fetch workouts
        (async () => {
          const filter: NDKFilter = {
            kinds: [1301],
            authors: participants,
            since: startTimestamp,
            until: endTimestamp,
          };
          console.log(`[Season1] Querying ALL workouts from ${participants.length} participants...`);
          return this.fetchEventsWithTimeout(ndk, filter);
        })(),
        // Fetch profiles
        (async () => {
          const profileFilter: NDKFilter = {
            kinds: [0],
            authors: participants,
          };
          console.log(`[Season1] Fetching profiles for ${participants.length} participants...`);
          return this.fetchEventsWithTimeout(ndk, profileFilter);
        })(),
      ]);

      console.log(`[Season1] Found ${workoutEvents.size} total workout events`);

      // Convert workout events to array
      const workouts = Array.from(workoutEvents);

      // Create profile map
      const profiles = new Map<string, any>();
      for (const event of profileEvents) {
        try {
          const metadata = JSON.parse(event.content);
          profiles.set(event.pubkey, metadata);
        } catch (error) {
          console.error('[Season1] Error parsing profile metadata:', error);
        }
      }

      console.log(`[Season1] Successfully fetched ${profiles.size} profiles`);

      // Update caches
      this.workoutsCache = { data: workouts, timestamp: now };
      this.profilesCache = { data: profiles, timestamp: now };

      // Store in AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(
          CACHE_KEYS.ALL_WORKOUTS,
          JSON.stringify({ workouts: workouts.map(e => e.rawEvent()), timestamp: now })
        ),
        AsyncStorage.setItem(
          CACHE_KEYS.PROFILES,
          JSON.stringify({ profiles: Array.from(profiles.entries()), timestamp: now })
        ),
      ]);

      return { workouts, profiles };
    } catch (error) {
      console.error('[Season1] Error fetching workouts and profiles:', error);

      // Try to load from AsyncStorage
      try {
        const [cachedWorkouts, cachedProfiles] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEYS.ALL_WORKOUTS),
          AsyncStorage.getItem(CACHE_KEYS.PROFILES),
        ]);

        const workouts = cachedWorkouts ? JSON.parse(cachedWorkouts).workouts.map((e: any) => new NDKEvent(undefined, e)) : [];
        const profiles = new Map(cachedProfiles ? JSON.parse(cachedProfiles).profiles : []);

        return { workouts, profiles };
      } catch (cacheError) {
        console.error('[Season1] Error loading cached data:', cacheError);
        return { workouts: [], profiles: new Map() };
      }
    }
  }

  /**
   * Fetch workout events for participants and calculate leaderboard
   */
  async fetchLeaderboard(activityType: SeasonActivityType): Promise<Season1Leaderboard> {
    console.log(`[Season1] Fetching ${activityType} leaderboard...`);

    try {
      // Get participants
      const participants = await this.fetchParticipantList();

      if (participants.length === 0) {
        return {
          activityType,
          participants: [],
          lastUpdated: Date.now(),
          totalParticipants: 0,
        };
      }

      // Fetch all workouts and profiles (uses unified cache)
      const { workouts, profiles } = await this.fetchAllWorkoutsAndProfiles(participants);

      // Process workout events and filter for activity type
      const participantMap = new Map<string, Season1Participant>();
      let processedCount = 0;
      let matchedCount = 0;

      for (const event of workouts) {
        try {
          processedCount++;

          // Parse workout data from tags
          const exerciseTag = event.tags?.find(tag => tag[0] === 'exercise');
          const distanceTag = event.tags?.find(tag => tag[0] === 'distance');

          if (!exerciseTag || !exerciseTag[1]) {
            continue;
          }

          // Check if workout type matches requested activity
          const workoutType = this.normalizeActivityType(exerciseTag[1]);
          if (workoutType !== activityType) {
            continue;
          }
          matchedCount++;

          const pubkey = event.pubkey;

          // Get or create participant entry
          let participant = participantMap.get(pubkey);
          if (!participant) {
            participant = {
              pubkey,
              totalDistance: 0,
              workoutCount: 0,
              name: pubkey.slice(0, 8) + '...', // Default name
            };
            participantMap.set(pubkey, participant);
          }

          // Parse distance from tag and convert to meters
          let distanceInMeters = 0;
          if (distanceTag && distanceTag[1]) {
            const distanceValue = parseFloat(distanceTag[1]);
            const distanceUnit = distanceTag[2] || 'km';

            if (!isNaN(distanceValue)) {
              // Convert to meters based on unit
              if (distanceUnit.toLowerCase() === 'km') {
                distanceInMeters = distanceValue * 1000;
              } else if (distanceUnit.toLowerCase() === 'mi' || distanceUnit.toLowerCase() === 'miles') {
                distanceInMeters = distanceValue * 1609.344;
              } else if (distanceUnit.toLowerCase() === 'm' || distanceUnit.toLowerCase() === 'meters') {
                distanceInMeters = distanceValue;
              } else {
                // Default to km if unit is unknown
                distanceInMeters = distanceValue * 1000;
              }
            }
          }

          // Add distance if available
          participant.totalDistance += distanceInMeters;
          participant.workoutCount += 1;

          // Track last activity date
          const eventDate = new Date((event.created_at || 0) * 1000).toISOString();
          if (!participant.lastActivityDate || eventDate > participant.lastActivityDate) {
            participant.lastActivityDate = eventDate;
          }
        } catch (error) {
          console.error('[Season1] Error processing workout event:', error);
        }
      }

      // Convert to array and sort by distance
      const leaderboard = Array.from(participantMap.values())
        .sort((a, b) => b.totalDistance - a.totalDistance);

      console.log(`[Season1] Processed ${processedCount} events, ${matchedCount} matched ${activityType}`);
      console.log(`[Season1] Final ${activityType} leaderboard: ${leaderboard.length} participants`);

      // Add profile data to participants
      const ndk = await this.getNDK();
      for (const participant of leaderboard) {
        const profile = profiles.get(participant.pubkey);
        if (profile) {
          participant.name = profile.displayName || profile.display_name || profile.name || participant.name;
          participant.picture = profile.picture || profile.avatar;

          // Set npub for display
          try {
            const user = new NDKUser({ pubkey: participant.pubkey });
            user.ndk = ndk;
            participant.npub = user.npub;
          } catch (error) {
            console.error('[Season1] Error converting pubkey to npub:', error);
          }
        }
      }

      const result: Season1Leaderboard = {
        activityType,
        participants: leaderboard,
        lastUpdated: Date.now(),
        totalParticipants: leaderboard.length,
      };

      console.log(`[Season1] ${activityType} leaderboard ready with ${leaderboard.length} participants`);
      return result;

    } catch (error) {
      console.error('[Season1] Error fetching leaderboard:', error);
      return {
        activityType,
        participants: [],
        lastUpdated: Date.now(),
        totalParticipants: 0,
      };
    }
  }

  /**
   * Normalize activity type from various formats
   */
  private normalizeActivityType(type: string): SeasonActivityType | null {
    if (!type) return null;

    const normalized = type.toLowerCase().trim();

    // Check for running variations
    if (normalized.includes('run') || normalized.includes('jog')) return 'running';

    // Check for walking variations
    if (normalized.includes('walk') || normalized.includes('hike')) return 'walking';

    // Check for cycling variations
    if (normalized.includes('cycl') || normalized.includes('bike') || normalized.includes('ride')) return 'cycling';

    // Additional cardio types that might map to running
    if (normalized === 'cardio' || normalized === 'treadmill') return 'running';

    // Direct matches
    if (normalized === 'running') return 'running';
    if (normalized === 'walking') return 'walking';
    if (normalized === 'cycling') return 'cycling';

    return null;
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    console.log('[Season1] Clearing all caches...');

    this.participantsCache = { data: null, timestamp: 0 };
    this.workoutsCache = { data: null, timestamp: 0 };
    this.profilesCache = { data: null, timestamp: 0 };

    await Promise.all([
      AsyncStorage.removeItem(CACHE_KEYS.PARTICIPANTS),
      AsyncStorage.removeItem(CACHE_KEYS.ALL_WORKOUTS),
      AsyncStorage.removeItem(CACHE_KEYS.PROFILES),
    ]);
  }

  /**
   * Prefetch all Season 1 data (for app initialization)
   */
  async prefetchAll(): Promise<void> {
    console.log('[Season1] Prefetching all Season 1 data...');
    try {
      const participants = await this.fetchParticipantList();
      if (participants.length > 0) {
        await this.fetchAllWorkoutsAndProfiles(participants);
        console.log('[Season1] Prefetch complete - all data cached');
      }
    } catch (error) {
      console.error('[Season1] Prefetch error:', error);
    }
  }
}

// Export singleton instance
export const season1Service = new Season1Service();