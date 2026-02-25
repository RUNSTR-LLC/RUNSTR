/**
 * LeaderboardBaselineService - Fetches pre-computed leaderboards from Nostr
 *
 * CONSOLIDATED BASELINE NOTE ARCHITECTURE:
 * - Server-side script publishes kind 30078 note with ALL leaderboards 2x/day
 * - Single note contains: Season 2
 * - App fetches 1 note (instant) + subscribes to ONLY logged-in user
 * - User's workouts update in real-time when they post
 *
 * This eliminates the iOS WebSocket blocking issue (40-65s freeze)
 * by reducing 150+ events to just 1-6 events total.
 *
 * Daily leaderboards (5K/10K/Half/Marathon/Steps) are NOT included -
 * they query only today's data which is small enough to run directly.
 */

import { GlobalNDKService } from '../nostr/GlobalNDKService';
import type { NDKFilter, NDKEvent } from '@nostr-dev-kit/ndk';
import type {
  Season2ActivityType,
  Season2Leaderboard,
  Season2Participant,
  CharityRanking,
} from '../../types/season2';
import { SEASON_2_PARTICIPANTS } from '../../constants/season2';
import { getCharityById } from '../../constants/charities';
import { nip19 } from 'nostr-tools';

// RUNSTR admin pubkey (publishes baseline notes)
const RUNSTR_ADMIN_PUBKEY =
  '611021eaaa2692741b1236bbcea54c6aa9f20ba30cace316c3a93d45089a7d0f';

// D-tag for the consolidated baseline note (NIP-33 replaceable event)
const BASELINE_D_TAG = 'runstr-consolidated-leaderboard-v1';

// Kind 30078 for application-specific data (NIP-78)
const BASELINE_KIND = 30078;

// Timeout for fetching baseline note
const FETCH_TIMEOUT_MS = 5000;

// No default charity - users without a charity selection show no charity

// ============================================================================
// Baseline Note Content Structure
// ============================================================================

interface BaselineParticipant {
  pubkey: string;
  distance: number; // km
  count: number;
  charityId?: string;
}

interface BaselineCharityRanking {
  rank: number;
  charityId: string;
  totalDistance: number;
  participantCount: number;
}

interface BaselineContent {
  season2: {
    running: {
      participants: BaselineParticipant[];
      charityRankings: BaselineCharityRanking[];
    };
    walking: {
      participants: BaselineParticipant[];
      charityRankings: BaselineCharityRanking[];
    };
    cycling: {
      participants: BaselineParticipant[];
      charityRankings: BaselineCharityRanking[];
    };
  };
}

// ============================================================================
// Parsed Baseline Types
// ============================================================================

export interface ConsolidatedBaseline {
  updatedAt: number; // When baseline was published
  cutoffTimestamp: number; // Last 1301 event included
  season2: {
    running: Season2Leaderboard;
    walking: Season2Leaderboard;
    cycling: Season2Leaderboard;
  };
}

// ============================================================================
// Service Implementation
// ============================================================================

class LeaderboardBaselineServiceClass {
  private static instance: LeaderboardBaselineServiceClass;
  private cachedBaseline: ConsolidatedBaseline | null = null;
  private lastFetchAttempt: number = 0;
  private readonly MIN_FETCH_INTERVAL_MS = 30000; // Don't re-fetch within 30s

  static getInstance(): LeaderboardBaselineServiceClass {
    if (!this.instance) {
      this.instance = new LeaderboardBaselineServiceClass();
    }
    return this.instance;
  }

  /**
   * Get cached baseline (instant, no network)
   */
  getCachedBaseline(): ConsolidatedBaseline | null {
    return this.cachedBaseline;
  }

  /**
   * Get cutoff timestamp from cached baseline
   */
  getCutoffTimestamp(): number {
    return this.cachedBaseline?.cutoffTimestamp || 0;
  }

  /**
   * Check if baseline was recently fetched
   */
  hasRecentBaseline(): boolean {
    if (!this.cachedBaseline) return false;
    const age = Date.now() - this.cachedBaseline.updatedAt * 1000;
    return age < 24 * 60 * 60 * 1000; // Less than 24 hours old
  }

  /**
   * Fetch consolidated baseline note from Nostr (1 event, instant)
   */
  async fetchBaseline(forceRefresh = false): Promise<ConsolidatedBaseline | null> {
    const t0 = Date.now();

    // Rate limit fetches
    if (!forceRefresh && this.cachedBaseline) {
      const timeSinceLastFetch = Date.now() - this.lastFetchAttempt;
      if (timeSinceLastFetch < this.MIN_FETCH_INTERVAL_MS) {
        console.log(
          `[BaselineService] Using cached baseline (${Math.round(timeSinceLastFetch / 1000)}s since last fetch)`
        );
        return this.cachedBaseline;
      }
    }

    console.log(`[BaselineService] ========== FETCH CONSOLIDATED BASELINE ==========`);
    console.log(`[BaselineService] Admin pubkey: ${RUNSTR_ADMIN_PUBKEY.slice(0, 16)}...`);
    console.log(`[BaselineService] D-tag: ${BASELINE_D_TAG}`);

    this.lastFetchAttempt = Date.now();

    try {
      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [BASELINE_KIND],
        authors: [RUNSTR_ADMIN_PUBKEY],
        '#d': [BASELINE_D_TAG],
        limit: 1,
      };

      // Fetch with timeout
      const events = await this.fetchWithTimeout(ndk, filter, FETCH_TIMEOUT_MS);

      if (events.length === 0) {
        console.log(`[BaselineService] No baseline note found`);
        console.log(`[BaselineService] Duration: ${Date.now() - t0}ms`);
        return null;
      }

      // Parse the baseline note
      const event = events[0];
      const baseline = this.parseBaselineEvent(event);

      if (baseline) {
        this.cachedBaseline = baseline;
        console.log(`[BaselineService] Baseline fetched successfully`);
        console.log(`[BaselineService]   - Updated: ${new Date(baseline.updatedAt * 1000).toISOString()}`);
        console.log(`[BaselineService]   - Cutoff: ${new Date(baseline.cutoffTimestamp * 1000).toISOString()}`);
        console.log(`[BaselineService]   - Season2 Running: ${baseline.season2.running.participants.length}`);
      }

      console.log(`[BaselineService] Duration: ${Date.now() - t0}ms`);
      return baseline;
    } catch (error) {
      console.error(`[BaselineService] Fetch error:`, error);
      return null;
    }
  }

  /**
   * Fetch events with timeout
   */
  private async fetchWithTimeout(
    ndk: any,
    filter: NDKFilter,
    timeoutMs: number
  ): Promise<NDKEvent[]> {
    return new Promise((resolve) => {
      const events: NDKEvent[] = [];
      let resolved = false;

      const finishEarly = (reason: string) => {
        if (!resolved) {
          resolved = true;
          // ✅ MEMORY LEAK FIX: Remove listeners before stopping subscription
          sub.removeAllListeners('event');
          sub.removeAllListeners('eose');
          sub.stop();
          clearTimeout(timeout);
          console.log(`[BaselineService] Fetch complete: ${reason} (${events.length} events)`);
          resolve(events);
        }
      };

      const sub = ndk.subscribe(filter, {
        closeOnEose: false,
        pool: ndk.pool,
      });

      sub.on('event', (event: NDKEvent) => {
        if (!resolved && event.id) {
          events.push(event);
          finishEarly('Got baseline event');
        }
      });

      sub.on('eose', () => {
        finishEarly('EOSE');
      });

      const timeout = setTimeout(() => finishEarly('Timeout'), timeoutMs);
    });
  }

  /**
   * Parse kind 30078 baseline event into consolidated structure
   */
  private parseBaselineEvent(event: NDKEvent): ConsolidatedBaseline | null {
    try {
      // Extract timestamps from tags
      const updatedTag = event.tags.find((t) => t[0] === 'updated');
      const cutoffTag = event.tags.find((t) => t[0] === 'cutoff');

      const updatedAt = updatedTag ? parseInt(updatedTag[1], 10) : event.created_at || 0;
      const cutoffTimestamp = cutoffTag ? parseInt(cutoffTag[1], 10) : updatedAt;

      // Parse content JSON
      const content: BaselineContent = JSON.parse(event.content);

      // Build profile lookup from hardcoded participants
      const profileLookup = new Map(
        SEASON_2_PARTICIPANTS.map((p) => [
          p.pubkey,
          { name: p.name, picture: p.picture, npub: p.npub },
        ])
      );

      // Helper to get npub
      const getNpub = (pubkey: string): string | undefined => {
        const profile = profileLookup.get(pubkey);
        if (profile?.npub) return profile.npub;
        try {
          if (pubkey.length === 64 && /^[0-9a-f]+$/i.test(pubkey)) {
            return nip19.npubEncode(pubkey);
          }
        } catch {
          // Ignore
        }
        return undefined;
      };

      // ========== SEASON 2 ==========
      const buildSeason2Leaderboard = (
        activityType: Season2ActivityType,
        data: BaselineContent['season2']['running']
      ): Season2Leaderboard => {
        const participants: Season2Participant[] = data.participants.map((p) => {
          const profile = profileLookup.get(p.pubkey);
          const charity = p.charityId ? getCharityById(p.charityId) : undefined;

          return {
            pubkey: p.pubkey,
            npub: profile?.npub || getNpub(p.pubkey),
            name: profile?.name,
            picture: profile?.picture,
            totalDistance: p.distance,
            workoutCount: p.count,
            charityId: p.charityId,
            charityName: charity?.name,
            isLocalJoin: false,
          };
        });

        participants.sort((a, b) => b.totalDistance - a.totalDistance);

        const charityRankings: CharityRanking[] = data.charityRankings.map((cr) => {
          const charity = getCharityById(cr.charityId);
          return {
            rank: cr.rank,
            charityId: cr.charityId,
            charityName: charity?.name || cr.charityId,
            lightningAddress: charity?.lightningAddress,
            totalDistance: cr.totalDistance,
            participantCount: cr.participantCount,
          };
        });

        return {
          activityType,
          participants,
          charityRankings,
          lastUpdated: updatedAt * 1000,
          totalParticipants: participants.length,
        };
      };

      return {
        updatedAt,
        cutoffTimestamp,
        season2: {
          running: buildSeason2Leaderboard('running', content.season2.running),
          walking: buildSeason2Leaderboard('walking', content.season2.walking),
          cycling: buildSeason2Leaderboard('cycling', content.season2.cycling),
        },
      };
    } catch (error) {
      console.error(`[BaselineService] Parse error:`, error);
      return null;
    }
  }

  // ============================================================================
  // MERGE FUNCTIONS - Merge user's fresh workouts with baseline
  // ============================================================================

  /**
   * Merge user's fresh workouts with Season 2 baseline
   */
  mergeSeason2UserWorkouts(
    baseline: Season2Leaderboard,
    userWorkouts: Array<{ distance: number; charityId?: string }>,
    userPubkey: string
  ): Season2Leaderboard {
    if (userWorkouts.length === 0) return baseline;

    const freshDistance = userWorkouts.reduce((sum, w) => sum + w.distance, 0);
    const freshCount = userWorkouts.length;
    const latestCharityId = userWorkouts[userWorkouts.length - 1]?.charityId;

    const updatedParticipants = [...baseline.participants];
    const userIndex = updatedParticipants.findIndex((p) => p.pubkey === userPubkey);

    if (userIndex >= 0) {
      const userEntry = { ...updatedParticipants[userIndex] };
      userEntry.totalDistance += freshDistance;
      userEntry.workoutCount += freshCount;
      if (latestCharityId) {
        userEntry.charityId = latestCharityId;
        userEntry.charityName = getCharityById(latestCharityId)?.name;
      }
      updatedParticipants[userIndex] = userEntry;
    } else {
      const profile = SEASON_2_PARTICIPANTS.find((p) => p.pubkey === userPubkey);
      const charity = latestCharityId ? getCharityById(latestCharityId) : undefined;
      updatedParticipants.push({
        pubkey: userPubkey,
        npub: profile?.npub,
        name: profile?.name,
        picture: profile?.picture,
        totalDistance: freshDistance,
        workoutCount: freshCount,
        charityId: latestCharityId,
        charityName: charity?.name,
        isLocalJoin: false,
      });
    }

    updatedParticipants.sort((a, b) => b.totalDistance - a.totalDistance);

    return {
      ...baseline,
      participants: updatedParticipants,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Clear cached baseline
   */
  clearCache(): void {
    this.cachedBaseline = null;
    this.lastFetchAttempt = 0;
    console.log(`[BaselineService] Cache cleared`);
  }
}

// Export singleton instance
export const LeaderboardBaselineService = LeaderboardBaselineServiceClass.getInstance();
export default LeaderboardBaselineService;
