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
  LEADERBOARD_RUNNING: '@season1:leaderboard:running',
  LEADERBOARD_WALKING: '@season1:leaderboard:walking',
  LEADERBOARD_CYCLING: '@season1:leaderboard:cycling',
};

// Cache duration in milliseconds
const CACHE_DURATION = {
  PARTICIPANTS: 5 * 60 * 1000, // 5 minutes
  LEADERBOARD: 60 * 1000, // 1 minute
};

class Season1Service {
  private participantsCache: {
    data: string[] | null;
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
      const events = await ndk.fetchEvents(filter);

      if (!events || events.size === 0) {
        console.log('[Season1] No participant list found on Nostr');
        console.log('[Season1] Attempting fallback query without d-tag...');

        // Try without d-tag to see if we get any lists
        const fallbackFilter: NDKFilter = {
          kinds: [30000],
          authors: [SEASON_1_CONFIG.adminPubkey],
        };

        const fallbackEvents = await ndk.fetchEvents(fallbackFilter);
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
   * Fetch workout events for participants and calculate leaderboard
   */
  async fetchLeaderboard(activityType: SeasonActivityType): Promise<Season1Leaderboard> {
    console.log(`[Season1] Fetching ${activityType} leaderboard...`);

    // Check cache first
    const cacheKey = `@season1:leaderboard:${activityType}`;
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION.LEADERBOARD) {
          console.log(`[Season1] Using cached ${activityType} leaderboard`);
          return data;
        }
      }
    } catch (error) {
      console.error('[Season1] Error loading cached leaderboard:', error);
    }

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

      // Query for kind 1301 workout events from participants
      const startTimestamp = Math.floor(new Date(SEASON_1_CONFIG.startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(SEASON_1_CONFIG.endDate).getTime() / 1000);

      const filter: NDKFilter = {
        kinds: [1301],
        authors: participants,
        since: startTimestamp,
        until: endTimestamp,
      };

      // Get NDK instance
      const ndk = await this.getNDK();

      console.log(`[Season1] Querying workouts from ${participants.length} participants...`);
      console.log(`[Season1] Date range: ${new Date(startTimestamp * 1000).toISOString()} to ${new Date(endTimestamp * 1000).toISOString()}`);
      console.log(`[Season1] Activity type filter: ${activityType}`);

      const workoutEvents = await ndk.fetchEvents(filter);
      console.log(`[Season1] Found ${workoutEvents.size} total workout events`);

      // Process workout events
      const participantMap = new Map<string, Season1Participant>();
      let processedCount = 0;
      let matchedCount = 0;

      for (const event of workoutEvents) {
        try {
          processedCount++;

          // Parse workout data from tags (NIP-101e format)
          // Example tags:
          // ["exercise", "running"]
          // ["distance", "5.2", "km"]
          // ["duration", "00:30:00"]

          const exerciseTag = event.tags?.find(tag => tag[0] === 'exercise');
          const distanceTag = event.tags?.find(tag => tag[0] === 'distance');

          if (!exerciseTag || !exerciseTag[1]) {
            if (processedCount <= 5) {
              console.log(`[Season1] Skipping event - no exercise tag found`);
            }
            continue;
          }

          // Check if workout type matches
          const workoutType = this.normalizeActivityType(exerciseTag[1]);
          if (workoutType !== activityType) {
            if (processedCount <= 5) {
              console.log(`[Season1] Skipping workout: type="${exerciseTag[1]}" normalized="${workoutType}" wanted="${activityType}"`);
            }
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

          if (processedCount <= 10 && matchedCount <= 3) {
            console.log(`[Season1] Processed ${exerciseTag[1]} workout:`, {
              pubkey: pubkey.slice(0, 8),
              distance: `${distanceInMeters}m`,
              date: eventDate
            });
          }
        } catch (error) {
          console.error('[Season1] Error processing workout event:', error);
        }
      }

      // Convert to array and sort by distance
      const leaderboard = Array.from(participantMap.values())
        .sort((a, b) => b.totalDistance - a.totalDistance);

      console.log(`[Season1] Processed ${processedCount} events, ${matchedCount} matched activity type`);
      console.log(`[Season1] Final leaderboard has ${leaderboard.length} participants`);

      // Fetch profiles for all participants
      console.log(`[Season1] Fetching profiles for ${leaderboard.length} participants...`);
      await this.fetchProfilesForParticipants(leaderboard);

      const result: Season1Leaderboard = {
        activityType,
        participants: leaderboard,
        lastUpdated: Date.now(),
        totalParticipants: leaderboard.length,
      };

      // Cache the result
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: result,
          timestamp: Date.now(),
        })
      );

      console.log(`[Season1] ${activityType} leaderboard: ${leaderboard.length} participants`);
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
   * Fetch profiles for participants
   */
  private async fetchProfilesForParticipants(participants: Season1Participant[]): Promise<void> {
    try {
      if (participants.length === 0) return;

      const ndk = await this.getNDK();

      // Query for kind 0 profile events
      const profileFilter: NDKFilter = {
        kinds: [0],
        authors: participants.map(p => p.pubkey),
      };

      console.log(`[Season1] Fetching profiles for ${participants.length} pubkeys...`);
      const profileEvents = await ndk.fetchEvents(profileFilter);

      // Create a map of profiles
      const profileMap = new Map<string, any>();
      for (const event of profileEvents) {
        try {
          const metadata = JSON.parse(event.content);
          profileMap.set(event.pubkey, metadata);
        } catch (error) {
          console.error('[Season1] Error parsing profile metadata:', error);
        }
      }

      // Update participants with profile data
      for (const participant of participants) {
        const profile = profileMap.get(participant.pubkey);
        if (profile) {
          participant.name = profile.displayName || profile.display_name || profile.name || participant.name;
          participant.picture = profile.picture || profile.avatar;

          // Also set npub for display
          try {
            const user = new NDKUser({ pubkey: participant.pubkey });
            user.ndk = ndk;
            participant.npub = user.npub;
          } catch (error) {
            console.error('[Season1] Error converting pubkey to npub:', error);
          }
        }
      }

      console.log(`[Season1] Successfully fetched ${profileMap.size} profiles`);
    } catch (error) {
      console.error('[Season1] Error fetching profiles:', error);
      // Continue without profiles - they'll show hex names
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

    await Promise.all([
      AsyncStorage.removeItem(CACHE_KEYS.PARTICIPANTS),
      AsyncStorage.removeItem('@season1:leaderboard:running'),
      AsyncStorage.removeItem('@season1:leaderboard:walking'),
      AsyncStorage.removeItem('@season1:leaderboard:cycling'),
    ]);
  }
}

// Export singleton instance
export const season1Service = new Season1Service();