/**
 * UnifiedWorkoutCache - Single source of truth for competition workout data
 *
 * Fetches and caches kind 1301 workouts from:
 * - Season II participants (38 hardcoded pubkeys)
 * - Current logged-in user
 *
 * All leaderboards read from this cache:
 * - Season II (Running/Walking/Cycling tabs)
 * - Dynamic events
 * - Running Bitcoin Challenge
 *
 * Features:
 * - In-memory Map for instant reads (NO AsyncStorage - Android perf fix)
 * - Subscriber pattern for reactive updates
 * - 6-second timeout (EOSE typically arrives in <300ms)
 * - Deduplication by event ID
 * - Fresh fetch from Nostr on each app launch (~4 seconds)
 */

import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { SEASON_2_PARTICIPANTS } from '../../constants/season2';
import { BASELINE_TIMESTAMP } from '../../constants/season2Baseline';
import NDK, { type NDKFilter, type NDKEvent, NDKRelaySet } from '@nostr-dev-kit/ndk';
import { InteractionManager } from 'react-native';

// ============================================================================
// EXPERIMENT FLAGS - Toggle to test different fixes for 43-second delay bug
// ============================================================================
const EXPERIMENT_FLAGS = {
  // Experiment 8: Disconnect relays immediately after fetchEvents returns
  // ❌ DISABLED: This triggers NDK auto-reconnect which blocks timers for 65+ seconds!
  disconnectAfterFetch: false,

  // Experiment 9: Only fetch 1 author instead of 43 (use authorLimit instead)
  fetchSingleAuthor: false,

  // Experiment 11: Test if timers work BEFORE fetchEvents
  preFetchTimerTest: false,

  // NEW: Limit number of authors to fetch (0 = no limit)
  // Test matrix: 1=504ms, 10=74ms ✅, 15=8.6s ⚠️, 20=34s ❌, 43=67s ❌
  authorLimit: 0,

  // Option B: Use subscribe() instead of fetchEvents()
  // ❌ DISABLED: Still blocks timers for 64+ seconds
  useSubscribePattern: false,

  // Option A: Batched Fetching - fetch 10 authors at a time
  // ✅ ENABLED: Keeps each batch under 80 events, avoiding iOS timer block
  // Takes ~15s total but UI stays responsive with progressive updates
  useBatchedFetch: true,

  // 🆕 Option C: Single Query + Chunked Processing
  // ❌ DISABLED: Single query returns 182 events at once, triggers 44s iOS timer block
  // Chunking the processing doesn't help - block happens at native WebSocket layer
  useChunkedProcessing: false,
};

/**
 * Priority authors to fetch first (3 most active users)
 * Reduced to 3 to stay WELL under iOS's ~40 event blocking threshold
 * (5 users returned 59 events - still triggered blocking)
 */
const PRIORITY_AUTHORS = [
  '6b42a3b227b086e850ff659a151863ce070eb60d32bae8a4618928655effc3f6', // JokerHasse
  '745eb529d0e42d2fa6c904bbc2c10702deae964b4dd3079803ab8b43536dda12', // guy
  '43256bc0859462cf14fa7de594a48babdf189b91abe27f88d824abf69b2343c9', // LOPES
];

console.log('[UnifiedWorkoutCache] EXPERIMENT_FLAGS:', EXPERIMENT_FLAGS);

// ============================================================================
// Constants
// ============================================================================

const QUERY_TIMEOUT_MS = 6000; // 6 seconds (EOSE arrives in <300ms based on diagnostics)
const PROGRESS_LOG_INTERVAL = 10; // Log every N events

/**
 * Get workout fetch timestamps using baseline approach
 *
 * Instead of fetching from Season start (182+ events), we fetch from BASELINE_TIMESTAMP
 * The baseline file contains pre-computed totals from Season start → baseline date
 * We only need to fetch fresh workouts from baseline date → now
 *
 * Result: ~10-20 events instead of 182+ = <2s load time vs 52s
 */
const getWorkoutFetchTimestamps = (): { since: number; until: number } => {
  return {
    since: BASELINE_TIMESTAMP,  // Fetch only workouts AFTER baseline date
    until: Math.floor(Date.now() / 1000),  // Until now
  };
};

/**
 * Explicit relays for workout queries - BYPASSES NDK's Outbox Model (NIP-65)
 *
 * Why explicit relays?
 * - We publish 1301 events to these specific relays
 * - NDK's outbox model connects to author's personal relays (NIP-65)
 * - Personal relays may not have workout events → missing data
 * - Explicit relays ensure consistent results
 */
const WORKOUT_RELAYS = [
  'wss://relay.damus.io',
  // EXPERIMENT 13: Use only 1 relay to cut WebSocket traffic in half
  // 'wss://nos.lol',
  // NOTE: relay.nostr.band excluded - SSL failures (-9807) in iOS Simulator
  // trigger native WebSocket cleanup that blocks React's macrotask queue for 40+ seconds
  // NOTE: relay.primal.net excluded - causes 40+ second EOSE hangs
];

// ============================================================================
// Types
// ============================================================================

export interface CachedWorkout {
  id: string;
  pubkey: string;
  activityType: string;
  distance: number;          // kilometers
  duration?: number;         // seconds
  createdAt: number;         // unix timestamp (seconds)
  charityId?: string;        // For Season II donation tracking
  eventIds?: string[];       // For event tagging (#e tags)
}

type Subscriber = () => void;

// ============================================================================
// Service Implementation
// ============================================================================

class UnifiedWorkoutCacheClass {
  private static instance: UnifiedWorkoutCacheClass;
  private workouts: Map<string, CachedWorkout> = new Map();
  private subscribers: Set<Subscriber> = new Set();
  private isLoading: boolean = false;
  private lastRefresh: number = 0;
  private userPubkey: string | null = null;
  private initialized: boolean = false;

  static getInstance(): UnifiedWorkoutCacheClass {
    if (!this.instance) {
      this.instance = new UnifiedWorkoutCacheClass();
    }
    return this.instance;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize cache - fetch fresh from Nostr (no AsyncStorage)
   *
   * ANDROID PERF FIX: Removed AsyncStorage completely.
   * JSON.stringify on 1000+ workouts blocks Android UI for minutes.
   * Fresh Nostr fetch takes ~4 seconds and is non-blocking.
   *
   * @param userPubkey - Current user's hex pubkey (optional, will be included in queries)
   */
  async initialize(userPubkey?: string): Promise<void> {
    if (this.initialized) {
      console.log('[UnifiedWorkoutCache] Already initialized');
      return;
    }

    this.userPubkey = userPubkey || null;
    console.log(`[UnifiedWorkoutCache] Initializing with ${userPubkey ? 'user + ' : ''}${SEASON_2_PARTICIPANTS.length} Season II participants`);

    // Always fetch fresh from Nostr (~4 seconds)
    // No AsyncStorage - memory-only cache for Android performance
    console.log('[UnifiedWorkoutCache] Fetching fresh workouts from Nostr...');
    this.fetchFromNostr().catch(err => {
      console.warn('[UnifiedWorkoutCache] Background fetch failed:', err);
    });

    this.initialized = true;
  }

  // ==========================================================================
  // Nostr Fetch Operations
  // ==========================================================================

  /**
   * Fetch fresh workouts from Nostr relays
   * Delegates to either fetchWithSubscribe() or fetchWithFetchEvents() based on experiment flag
   *
   * @param fullRefresh - If true, fetch ALL authors (pull-to-refresh). If false, only priority authors (initial load).
   */
  private async fetchFromNostr(fullRefresh: boolean = false): Promise<void> {
    if (this.isLoading) {
      console.log('[UnifiedWorkoutCache] Fetch already in progress');
      return;
    }

    this.isLoading = true;
    const startTime = Date.now();

    try {
      if (EXPERIMENT_FLAGS.useChunkedProcessing) {
        console.log('[UnifiedWorkoutCache] Starting Nostr fetch (CHUNKED pattern - Option C)...');
        await this.fetchWithChunkedProcessing();
      } else if (EXPERIMENT_FLAGS.useBatchedFetch) {
        console.log(`[UnifiedWorkoutCache] Starting Nostr fetch (BATCHED pattern - Option A, fullRefresh=${fullRefresh})...`);
        await this.fetchWithBatches(fullRefresh);
      } else if (EXPERIMENT_FLAGS.useSubscribePattern) {
        console.log('[UnifiedWorkoutCache] Starting Nostr fetch (SUBSCRIBE pattern - Option B)...');
        await this.fetchWithSubscribe();
      } else {
        console.log('[UnifiedWorkoutCache] Starting Nostr fetch (fetchEvents pattern)...');
        await this.fetchWithFetchEvents();
      }

      const totalElapsed = Date.now() - startTime;
      console.log(`[UnifiedWorkoutCache] Fetch complete: ${this.workouts.size} workouts in ${totalElapsed}ms`);

      // Log activity breakdown
      const breakdown = this.getActivityBreakdown();
      console.log(`[UnifiedWorkoutCache] Activity breakdown: Running=${breakdown.running}, Walking=${breakdown.walking}, Cycling=${breakdown.cycling}, Other=${breakdown.other}`);
    } catch (error) {
      console.error('[UnifiedWorkoutCache] Fetch failed:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 🆕 Option A: Batched Fetching - fetch 10 authors at a time
   *
   * Fetches priority users first for instant leaderboard display,
   * then fetches remaining users in batches of 10.
   * Uses setImmediate between batches to let React render.
   *
   * HARD STOP: Aborts after 10 seconds to prevent infinite loading.
   * Shows partial data - user can pull-to-refresh for more.
   *
   * @param fullRefresh - If true, fetch all authors (pull-to-refresh). If false, only priority (initial load).
   */
  private async fetchWithBatches(fullRefresh: boolean = false): Promise<void> {
    const startTime = Date.now();
    const ndk = await GlobalNDKService.getInstance();
    const BATCH_SIZE = 3; // Reduced from 10→5→3 to stay WELL under iOS's ~40 event threshold
    // No hard stop for fetch - we want ALL users. UI stays responsive via progressive updates.
    console.log(`[Batched] Starting full fetch (fullRefresh=${fullRefresh})`);

    // Build author list: Season II participants + current user
    const allAuthors = [...SEASON_2_PARTICIPANTS.map(p => p.pubkey)];
    if (this.userPubkey && !allAuthors.includes(this.userPubkey)) {
      allAuthors.push(this.userPubkey);
    }

    // Separate priority authors from others
    const prioritySet = new Set(PRIORITY_AUTHORS);
    const priorityAuthors = allAuthors.filter(a => prioritySet.has(a));
    const otherAuthors = allAuthors.filter(a => !prioritySet.has(a));

    console.log(`[Batched] Starting batched fetch: ${priorityAuthors.length} priority + ${otherAuthors.length} others`);

    // Get workout fetch timestamps (from baseline date, not Season start)
    const { since, until } = getWorkoutFetchTimestamps();

    // Create explicit relay set
    const relaySet = NDKRelaySet.fromRelayUrls(WORKOUT_RELAYS, ndk);
    console.log(`[Batched] Using explicit relays: ${WORKOUT_RELAYS.join(', ')}`);

    // Helper to fetch a batch of authors
    const fetchBatch = async (authors: string[], batchLabel: string): Promise<number> => {
      const batchStart = Date.now();
      const filter: NDKFilter = {
        kinds: [1301 as any],
        authors,
        since,
        until,
      };

      console.log(`[Batched] Fetching ${batchLabel} (${authors.length} authors)...`);
      const events = await ndk.fetchEvents(filter, { closeOnEose: true }, relaySet);

      let addedCount = 0;
      for (const event of events) {
        const workout = this.parseWorkoutEvent(event);
        if (workout && !this.workouts.has(workout.id)) {
          this.workouts.set(workout.id, workout);
          addedCount++;
        }
      }

      console.log(`[Batched] ${batchLabel}: ${events.size} events, ${addedCount} new workouts in ${Date.now() - batchStart}ms`);
      return events.size;
    };

    // Helper to wait for setImmediate (lets React render)
    // Now with 100ms timeout fallback in case setImmediate is blocked
    const yieldToReact = (): Promise<void> => {
      return new Promise(resolve => {
        let resolved = false;
        setImmediate(() => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        });
        // Fallback: if setImmediate is blocked, resolve after 100ms anyway
        setTimeout(() => {
          if (!resolved) {
            console.log(`[Batched] ⚠️ setImmediate blocked, forcing yield via setTimeout`);
            resolved = true;
            resolve();
          }
        }, 100);
      });
    };

    // =========================================================================
    // BATCH 1: Priority authors (instant leaderboard)
    // =========================================================================
    console.log(`[Batched] ========== BATCH 1: Priority Users ==========`);
    const batch1Events = await fetchBatch(priorityAuthors, 'Batch 1 (Priority)');

    // Test timer after first batch
    const t1 = Date.now();
    setTimeout(() => console.log(`[BLOCK-1] setTimeout(0) after Batch 1: ${Date.now() - t1}ms`), 0);
    setImmediate(() => console.log(`[BLOCK-1] setImmediate after Batch 1: ${Date.now() - t1}ms`));

    // Update cache timestamp and notify subscribers
    this.lastRefresh = Date.now();
    this.notifySubscribers();
    console.log(`[Batched] Batch 1 complete: ${this.workouts.size} total workouts, notified subscribers`);

    // Yield to let React render the first batch
    await yieldToReact();
    console.log(`[Batched] Yielded to React after Batch 1 at T+${Date.now() - startTime}ms`);

    // Initial load should return after the priority batch to keep startup snappy.
    // Full author fetch remains available via pull-to-refresh (fullRefresh=true).
    if (!fullRefresh) {
      this.pruneOldWorkouts(60);
      console.log(`[Batched] Initial load mode complete after priority batch: ${this.workouts.size} workouts in ${Date.now() - startTime}ms`);
      return;
    }

    // After priority batch, continue fetching remaining authors
    // UI already has data to show, now we progressively add more
    console.log(`[Batched] Priority batch complete (${this.workouts.size} workouts in ${Date.now() - startTime}ms), continuing with ${otherAuthors.length} remaining authors...`);

    // =========================================================================
    // BATCHES 2+: Remaining authors in groups of 3 (to stay under iOS blocking threshold)
    // =========================================================================
    const batches: string[][] = [];
    for (let i = 0; i < otherAuthors.length; i += BATCH_SIZE) {
      batches.push(otherAuthors.slice(i, i + BATCH_SIZE));
    }

    console.log(`[Batched] Remaining ${otherAuthors.length} authors split into ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      const batchNum = i + 2; // Batch 2, 3, 4, etc.
      console.log(`[Batched] ========== BATCH ${batchNum}: Authors ${i * BATCH_SIZE + 1}-${Math.min((i + 1) * BATCH_SIZE, otherAuthors.length)} ==========`);

      await fetchBatch(batches[i], `Batch ${batchNum}`);

      // Update and notify after each batch
      this.lastRefresh = Date.now();
      this.notifySubscribers();

      // Yield between batches to let React render
      if (i < batches.length - 1) {
        await yieldToReact();
        console.log(`[Batched] Yielded to React after Batch ${batchNum} at T+${Date.now() - startTime}ms`);
      }
    }

    // Final prune
    this.pruneOldWorkouts(60);

    // Final timer test
    const tFinal = Date.now();
    setTimeout(() => console.log(`[BLOCK-FINAL] setTimeout(0) after all batches: ${Date.now() - tFinal}ms`), 0);
    setImmediate(() => console.log(`[BLOCK-FINAL] setImmediate after all batches: ${Date.now() - tFinal}ms`));

    console.log(`[Batched] All batches complete: ${this.workouts.size} total workouts in ${Date.now() - startTime}ms`);
  }

  /**
   * 🆕 Option C: Single Query + Chunked Processing
   *
   * Makes ONE query for all authors, then processes events in chunks of 50
   * to avoid iOS timer blocking. This eliminates the 4 extra network round-trips
   * that batched fetching required.
   */
  private async fetchWithChunkedProcessing(): Promise<void> {
    const startTime = Date.now();
    const ndk = await GlobalNDKService.getInstance();
    const CHUNK_SIZE = 50; // Process 50 events at a time (under iOS's ~80 event threshold)

    // Build author list: all Season II participants + current user
    const authors = [...SEASON_2_PARTICIPANTS.map(p => p.pubkey)];
    if (this.userPubkey && !authors.includes(this.userPubkey)) {
      authors.push(this.userPubkey);
    }

    // Get workout fetch timestamps (from baseline date, not Season start)
    const { since, until } = getWorkoutFetchTimestamps();

    // Create explicit relay set
    const relaySet = NDKRelaySet.fromRelayUrls(WORKOUT_RELAYS, ndk);
    console.log(`[Chunked] Using explicit relays: ${WORKOUT_RELAYS.join(', ')}`);

    // SINGLE QUERY for all authors
    console.log(`[Chunked] Fetching ALL ${authors.length} authors in single query...`);
    const filter: NDKFilter = {
      kinds: [1301 as any],
      authors,
      since,
      until,
    };

    const events = await ndk.fetchEvents(filter, { closeOnEose: true }, relaySet);
    const fetchTime = Date.now() - startTime;
    console.log(`[Chunked] Received ${events.size} events in ${fetchTime}ms`);

    // Convert Set to Array for chunked processing
    const eventArray = Array.from(events);

    // Process in chunks to avoid iOS timer blocking
    const processStart = Date.now();
    for (let i = 0; i < eventArray.length; i += CHUNK_SIZE) {
      const chunk = eventArray.slice(i, i + CHUNK_SIZE);
      const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;

      // Process this chunk
      let addedCount = 0;
      for (const event of chunk) {
        const workout = this.parseWorkoutEvent(event);
        if (workout && !this.workouts.has(workout.id)) {
          this.workouts.set(workout.id, workout);
          addedCount++;
        }
      }

      // Notify subscribers after each chunk for progressive updates
      this.lastRefresh = Date.now();
      this.notifySubscribers();
      console.log(`[Chunked] Chunk ${chunkNum}: processed ${chunk.length} events, ${addedCount} new (${Math.min(i + CHUNK_SIZE, eventArray.length)}/${eventArray.length} total)`);

      // Yield to React between chunks (except last)
      if (i + CHUNK_SIZE < eventArray.length) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    // Final prune
    this.pruneOldWorkouts(60);

    console.log(`[Chunked] Complete: ${this.workouts.size} workouts (fetch: ${fetchTime}ms, process: ${Date.now() - processStart}ms, total: ${Date.now() - startTime}ms)`);

    // =========================================================================
    // ✅ iOS TIMER UNBLOCK FIX (Option 10): Remove relay listeners instead of disconnect
    // =========================================================================
    // Problem: iOS's native WebSocket bridge blocks setTimeout/requestAnimationFrame
    // for 40+ seconds after the fetch completes. React's scheduler uses these timers,
    // so the UI doesn't update until the block ends.
    //
    // Previous approach (pause/resume) was inconsistent - disconnecting relays also
    // triggers native cleanup that blocks the timer queue.
    //
    // New approach: Just remove event listeners without disconnecting the WebSocket.
    // This should stop the event processing without triggering native cleanup.
    // =========================================================================
    console.log(`[Chunked] Removing relay listeners (not disconnecting)...`);
    try {
      for (const relay of relaySet.relays) {
        relay.removeAllListeners();
      }
      console.log(`[Chunked] Relay listeners removed`);
    } catch (e) {
      console.warn(`[Chunked] Failed to remove listeners:`, e);
    }

    // Timer test - this should now complete quickly (< 1 second)
    const tFinal = Date.now();
    setTimeout(() => console.log(`[BLOCK-FINAL] setTimeout(0) after listener removal: ${Date.now() - tFinal}ms`), 0);
    setImmediate(() => console.log(`[BLOCK-FINAL] setImmediate after listener removal: ${Date.now() - tFinal}ms`));
  }

  /**
   * Option B: Subscribe Pattern - Stream events one-by-one
   *
   * Uses NDK's subscribe() instead of fetchEvents() to receive events individually
   * as they arrive from relays, rather than waiting for all events and receiving
   * them in a burst that blocks iOS's timer queue.
   */
  private async fetchWithSubscribe(): Promise<void> {
    const startTime = Date.now();
    const ndk = await GlobalNDKService.getInstance();

    // Build author list: Season II participants + current user
    let authors = SEASON_2_PARTICIPANTS.map(p => p.pubkey);
    if (this.userPubkey && !authors.includes(this.userPubkey)) {
      authors.push(this.userPubkey);
    }

    // Get workout fetch timestamps (from baseline date, not Season start)
    const { since, until } = getWorkoutFetchTimestamps();

    const filter: NDKFilter = {
      kinds: [1301 as any],
      authors,
      since,
      until,
    };

    console.log(`[Subscribe] Starting subscription for ${authors.length} authors...`);
    console.log(`[Subscribe] Date range: ${new Date(since * 1000).toLocaleDateString()} - ${new Date(until * 1000).toLocaleDateString()}`);

    // Create explicit relay set to BYPASS NDK's Outbox Model (NIP-65)
    const relaySet = NDKRelaySet.fromRelayUrls(WORKOUT_RELAYS, ndk);
    console.log(`[Subscribe] Using explicit relays: ${WORKOUT_RELAYS.join(', ')}`);

    return new Promise((resolve) => {
      let eventCount = 0;
      const newWorkouts = new Map<string, CachedWorkout>();
      let lastLogTime = startTime;

      const sub = ndk.subscribe(filter, { closeOnEose: true }, relaySet);

      sub.on('event', (event: NDKEvent) => {
        eventCount++;
        const workout = this.parseWorkoutEvent(event);
        if (workout) {
          newWorkouts.set(workout.id, workout);
        }

        // Log progress every 20 events or every 500ms
        const now = Date.now();
        if (eventCount % 20 === 0 || now - lastLogTime > 500) {
          console.log(`[Subscribe] Received ${eventCount} events at T+${now - startTime}ms`);
          lastLogTime = now;
        }
      });

      sub.on('eose', () => {
        const elapsed = Date.now() - startTime;
        console.log(`[Subscribe] 🏁 EOSE received: ${eventCount} events in ${elapsed}ms`);

        // Replace cache with new data
        this.workouts = newWorkouts;
        this.lastRefresh = Date.now();

        // Prune workouts older than 60 days
        this.pruneOldWorkouts(60);

        // [BLOCK-1] Test if timers are blocked after subscribe completes
        const t1 = Date.now();
        setTimeout(() => console.log(`[BLOCK-1] setTimeout(0) after SUBSCRIBE: ${Date.now() - t1}ms`), 0);
        setImmediate(() => console.log(`[BLOCK-1] setImmediate after SUBSCRIBE: ${Date.now() - t1}ms`));
        Promise.resolve().then(() => console.log(`[BLOCK-1] Promise.resolve after SUBSCRIBE: ${Date.now() - t1}ms`));

        // Notify subscribers via setImmediate (bypasses blocked timer queue)
        this.notifySubscribers();

        resolve();
      });

      // Timeout fallback (10 seconds)
      setTimeout(() => {
        console.log(`[Subscribe] ⏰ Timeout: ${eventCount} events received`);
        sub.stop();

        // Still update cache with partial data
        this.workouts = newWorkouts;
        this.lastRefresh = Date.now();
        this.notifySubscribers();

        resolve();
      }, 10000);
    });
  }

  /**
   * Original fetchEvents pattern (kept for comparison)
   *
   * FIX #9: The issue is that on FIRST LOAD, there's concurrent WebSocket
   * activity from app initialization that blocks the macrotask queue.
   * On subsequent refreshes, GlobalNDK is stable and there's no blocking.
   */
  private async fetchWithFetchEvents(): Promise<void> {
    const startTime = Date.now();

    try {
      const ndk = await GlobalNDKService.getInstance();

      // Build author list: Season II participants + current user
      let authors = SEASON_2_PARTICIPANTS.map(p => p.pubkey);
      if (this.userPubkey && !authors.includes(this.userPubkey)) {
        authors.push(this.userPubkey);
      }

      // EXPERIMENT 9: Only fetch 1 author to test if volume matters
      if (EXPERIMENT_FLAGS.fetchSingleAuthor) {
        const originalCount = authors.length;
        authors = authors.slice(0, 1); // Just the first author
        console.log(`[EXPERIMENT-9] Reduced authors from ${originalCount} to ${authors.length}`);
      }

      // NEW: Limit authors to find threshold where block becomes problematic
      if (EXPERIMENT_FLAGS.authorLimit > 0 && authors.length > EXPERIMENT_FLAGS.authorLimit) {
        const originalCount = authors.length;
        authors = authors.slice(0, EXPERIMENT_FLAGS.authorLimit);
        console.log(`[EXPERIMENT] Limited authors from ${originalCount} to ${authors.length}`);
      }

      // Get workout fetch timestamps (from baseline date, not Season start)
      const { since, until } = getWorkoutFetchTimestamps();

      const filter: NDKFilter = {
        kinds: [1301 as any],
        authors,
        since,
        until,
        limit: EXPERIMENT_FLAGS.fetchSingleAuthor ? 50 : 3000,
      };

      console.log(`[UnifiedWorkoutCache] Querying ${authors.length} authors, ${new Date(since * 1000).toLocaleDateString()} - ${new Date(until * 1000).toLocaleDateString()}`);

      // Create explicit relay set to BYPASS NDK's Outbox Model (NIP-65)
      const relaySet = NDKRelaySet.fromRelayUrls(WORKOUT_RELAYS, ndk);
      console.log(`[UnifiedWorkoutCache] Using explicit relays: ${WORKOUT_RELAYS.join(', ')}`);

      // EXPERIMENT 11: Test if timers work BEFORE fetchEvents
      if (EXPERIMENT_FLAGS.preFetchTimerTest) {
        const tPre = Date.now();
        setTimeout(() => console.log(`[EXPERIMENT-11] PRE-FETCH setTimeout(0): ${Date.now() - tPre}ms`), 0);
        setImmediate(() => console.log(`[EXPERIMENT-11] PRE-FETCH setImmediate: ${Date.now() - tPre}ms`));
        Promise.resolve().then(() => console.log(`[EXPERIMENT-11] PRE-FETCH Promise.resolve: ${Date.now() - tPre}ms`));
        console.log(`[EXPERIMENT-11] Pre-fetch timer test scheduled at T+${Date.now() - startTime}ms`);
      }

      // Use fetchEvents()
      console.log(`[UnifiedWorkoutCache] Calling ndk.fetchEvents()...`);
      const events = await ndk.fetchEvents(filter, { closeOnEose: true }, relaySet);
      const elapsed = Date.now() - startTime;
      console.log(`[UnifiedWorkoutCache] 🏁 fetchEvents() returned ${events.size} events in ${elapsed}ms`);

      // EXPERIMENT 8: Disconnect relays immediately to prevent WebSocket cleanup blocking
      if (EXPERIMENT_FLAGS.disconnectAfterFetch) {
        console.log(`[EXPERIMENT-8] Disconnecting relays immediately after fetch...`);
        const disconnectStart = Date.now();
        try {
          // Disconnect the specific relay set we used
          for (const relay of relaySet.relays) {
            relay.disconnect();
          }
          console.log(`[EXPERIMENT-8] Disconnected ${relaySet.relays.size} relays in ${Date.now() - disconnectStart}ms`);
        } catch (err) {
          console.warn(`[EXPERIMENT-8] Disconnect error:`, err);
        }
      }

      // TIMING: Process collected events
      let stepStart = Date.now();
      const newWorkouts = new Map<string, CachedWorkout>();

      for (const event of events) {
        const workout = this.parseWorkoutEvent(event);
        if (workout) {
          newWorkouts.set(workout.id, workout);
        }
      }
      console.log(`[UnifiedWorkoutCache] ⏱️ Parse ${events.size} events: ${Date.now() - stepStart}ms`);

      // Replace cache with new data
      stepStart = Date.now();
      this.workouts = newWorkouts;
      this.lastRefresh = Date.now();
      console.log(`[UnifiedWorkoutCache] ⏱️ Replace cache: ${Date.now() - stepStart}ms`);

      // [BLOCK-3] After cache replace - did the Map.set operation trigger something?
      const t3 = Date.now();
      setTimeout(() => console.log(`[BLOCK-3] setTimeout(0) after cache replace: ${Date.now() - t3}ms`), 0);

      // Prune workouts older than 60 days (memory management)
      stepStart = Date.now();
      this.pruneOldWorkouts(60);
      console.log(`[UnifiedWorkoutCache] ⏱️ Prune old workouts: ${Date.now() - stepStart}ms`);

      // NO AsyncStorage save - Android perf fix
      // JSON.stringify on 1000+ workouts blocks Android UI for minutes
      // Memory-only cache is sufficient - data is fetched fresh each session

      // Notify subscribers - callbacks might trigger heavy work
      stepStart = Date.now();
      this.notifySubscribers();
      console.log(`[UnifiedWorkoutCache] ⏱️ Notify subscribers (sync return): ${Date.now() - stepStart}ms`);
    } catch (error) {
      console.error('[UnifiedWorkoutCache] fetchWithFetchEvents failed:', error);
      throw error;
    }
  }

  /**
   * Parse a Nostr event into a CachedWorkout
   */
  private parseWorkoutEvent(event: NDKEvent): CachedWorkout | null {
    try {
      const getTag = (name: string) =>
        event.tags.find((t: string[]) => t[0] === name)?.[1];

      const getAllTags = (name: string) =>
        event.tags.filter((t: string[]) => t[0] === name).map((t: string[]) => t[1]);

      // Extract activity type
      const exerciseTag = getTag('exercise');
      const activityType = exerciseTag?.toLowerCase() || 'unknown';

      // Extract distance (convert to km if needed)
      const distanceTag = event.tags.find((t: string[]) => t[0] === 'distance');
      let distance = 0;
      if (distanceTag) {
        const value = parseFloat(distanceTag[1]) || 0;
        const unit = distanceTag[2]?.toLowerCase() || 'km';
        if (unit === 'm' || unit === 'meters') {
          distance = value / 1000;
        } else if (unit === 'mi' || unit === 'miles') {
          distance = value * 1.60934;
        } else {
          distance = value; // Assume km
        }
      }

      // Extract duration
      const durationTag = getTag('duration');
      let duration: number | undefined;
      if (durationTag) {
        // Parse HH:MM:SS or seconds
        if (durationTag.includes(':')) {
          const parts = durationTag.split(':').map(Number);
          if (parts.length === 3) {
            duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
          } else if (parts.length === 2) {
            duration = parts[0] * 60 + parts[1];
          }
        } else {
          duration = parseInt(durationTag, 10);
        }
      }

      // Extract charity ID (for Season II)
      const charityId = getTag('charity');

      // Extract event IDs (for event tagging)
      const eventIds = getAllTags('e');

      return {
        id: event.id,
        pubkey: event.pubkey,
        activityType,
        distance,
        duration,
        createdAt: event.created_at || 0,
        charityId,
        eventIds: eventIds.length > 0 ? eventIds : undefined,
      };
    } catch (error) {
      console.warn('[UnifiedWorkoutCache] Failed to parse event:', error);
      return null;
    }
  }

  // ==========================================================================
  // Public API - Ensure Loaded
  // ==========================================================================

  /**
   * Ensure cache has data before reading
   * With memory-only cache, this just logs status - Nostr fetch happens on init
   */
  async ensureLoaded(): Promise<void> {
    // If we already have data in memory, we're good
    if (this.workouts.size > 0) {
      console.log(`[UnifiedWorkoutCache] ensureLoaded() - Already has ${this.workouts.size} workouts in memory`);
      return;
    }

    // No AsyncStorage - data will arrive when Nostr fetch completes
    console.log('[UnifiedWorkoutCache] ensureLoaded() - Waiting for Nostr fetch to populate cache...');
  }

  // ==========================================================================
  // Public API - Refresh
  // ==========================================================================

  /**
   * Force refresh from Nostr (called by pull-to-refresh)
   * BLOCKING: Returns after fetch completes so callers know when fresh data is ready
   * This prevents double-render issues from fire-and-forget pattern
   *
   * Unlike initial load, pull-to-refresh fetches ALL authors (not just priority)
   * but still uses hard stop to prevent infinite loading.
   */
  async refresh(): Promise<void> {
    console.log('[UnifiedWorkoutCache] Manual refresh triggered (blocking, fullRefresh=true)');
    await this.fetchFromNostr(true); // fullRefresh=true for pull-to-refresh
  }

  /**
   * Fast leaderboard refresh - single query for all participants
   * Uses 2.5-second timeout to guarantee responsiveness
   *
   * Unlike regular refresh(), this:
   * - Queries ALL participants in ONE request (not batched)
   * - Returns parsed workouts directly (doesn't modify cache)
   * - Has hard 2.5s timeout to ensure <3s total refresh time
   *
   * @param participantPubkeys - All participant hex pubkeys to query
   * @returns Parsed workouts from all participants since baseline
   */
  async refreshForLeaderboard(participantPubkeys: string[]): Promise<CachedWorkout[]> {
    console.log(`[UnifiedWorkoutCache] 🔄 Fast refresh for ${participantPubkeys.length} participants`);
    const startTime = Date.now();
    const TIMEOUT_MS = 2500;

    try {
      const ndk = await GlobalNDKService.getInstance();

      // Create explicit relay set (bypass outbox model)
      const relaySet = NDKRelaySet.fromRelayUrls(WORKOUT_RELAYS, ndk);

      const { since, until } = getWorkoutFetchTimestamps();
      const filter: NDKFilter = {
        kinds: [1301 as number],
        authors: participantPubkeys,
        since,
        until,
      };

      console.log(`[UnifiedWorkoutCache] 📡 Querying ${participantPubkeys.length} authors from ${WORKOUT_RELAYS.length} relays`);
      console.log(`[UnifiedWorkoutCache] 📅 Time range: ${new Date(since * 1000).toISOString()} to ${new Date(until * 1000).toISOString()}`);

      // Use subscription pattern with setImmediate timeout (bypasses iOS timer block)
      // Promise.race with setTimeout doesn't work - macrotask queue gets blocked
      const events = new Map<string, NDKEvent>();
      let timedOut = false;
      let eoseReceived = false;

      return new Promise<CachedWorkout[]>((resolve) => {
        // Start subscription
        const sub = ndk.subscribe(filter, { closeOnEose: true }, relaySet);

        sub.on('event', (event: NDKEvent) => {
          if (!timedOut) {
            events.set(event.id, event);
          }
        });

        sub.on('eose', () => {
          if (!timedOut) {
            eoseReceived = true;
            const elapsed = Date.now() - startTime;
            console.log(`[UnifiedWorkoutCache] ✅ EOSE received: ${events.size} events in ${elapsed}ms`);
            finishWithEvents();
          }
        });

        // Timeout check using setImmediate (microtask - not blocked by iOS)
        const checkTimeout = () => {
          if (timedOut || eoseReceived) return;

          const elapsed = Date.now() - startTime;
          if (elapsed >= TIMEOUT_MS) {
            timedOut = true;
            console.log(`[UnifiedWorkoutCache] ⏱️ Timeout (${TIMEOUT_MS}ms): ${events.size} events collected`);
            try { sub.stop(); } catch (e) { /* ignore */ }
            finishWithEvents();
          } else {
            // Check again in 100ms via setImmediate
            setImmediate(checkTimeout);
          }
        };
        setImmediate(checkTimeout);

        const finishWithEvents = () => {
          const elapsed = Date.now() - startTime;
          const workouts: CachedWorkout[] = [];

          for (const event of events.values()) {
            const parsed = this.parseWorkoutEvent(event);
            if (parsed) {
              workouts.push(parsed);
            }
          }

          console.log(`[UnifiedWorkoutCache] 📊 Parsed ${workouts.length} valid workouts in ${elapsed}ms`);
          resolve(workouts);
        };
      });
    } catch (error) {
      console.error('[UnifiedWorkoutCache] refreshForLeaderboard failed:', error);
      return []; // Return empty on error - caller will use baseline only
    }
  }

  // ==========================================================================
  // Public API - Query Methods
  // ==========================================================================

  /**
   * Get all workouts
   */
  getAllWorkouts(): CachedWorkout[] {
    return Array.from(this.workouts.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get workouts by activity type (for Season II tabs)
   */
  getWorkoutsByActivity(activityType: 'running' | 'walking' | 'cycling'): CachedWorkout[] {
    const workouts = this.getAllWorkouts();

    const filtered = workouts.filter(w => {
      const type = w.activityType.toLowerCase();
      switch (activityType) {
        case 'running':
          return type.includes('run') || type.includes('jog') || type === 'running';
        case 'walking':
          return type.includes('walk') || type.includes('hike') || type === 'walking';
        case 'cycling':
          return type.includes('cycl') || type.includes('bike') || type === 'cycling';
        default:
          return false;
      }
    });

    // Debug logging to trace cache reads
    console.log(`[UnifiedWorkoutCache] getWorkoutsByActivity(${activityType}) - Map size: ${this.workouts.size}, returning ${filtered.length} workouts`);

    return filtered;
  }

  /**
   * Get workouts by pubkey
   */
  getWorkoutsByPubkey(pubkey: string): CachedWorkout[] {
    return this.getAllWorkouts().filter(w => w.pubkey === pubkey);
  }

  /**
   * Get workouts in date range (for event leaderboards)
   * @param startTs - Start timestamp (seconds)
   * @param endTs - End timestamp (seconds)
   */
  getWorkoutsInDateRange(startTs: number, endTs: number): CachedWorkout[] {
    return this.getAllWorkouts().filter(w =>
      w.createdAt >= startTs && w.createdAt <= endTs
    );
  }

  /**
   * Get workouts tagged with a specific event ID
   */
  getWorkoutsByEventId(eventId: string): CachedWorkout[] {
    return this.getAllWorkouts().filter(w =>
      w.eventIds?.includes(eventId)
    );
  }

  /**
   * Get workouts from today only (for daily leaderboard)
   * No baseline - pure cache filter based on local midnight
   * @param activityType - Optional filter by activity type
   */
  getDailyWorkouts(activityType?: 'running' | 'walking' | 'cycling'): CachedWorkout[] {
    const now = new Date();
    const todayMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0, 0, 0
    ).getTime() / 1000; // Convert to Unix timestamp (seconds)

    return this.getAllWorkouts().filter(w => {
      const isToday = w.createdAt >= todayMidnight;

      // If no activity filter, return all today's workouts
      if (!activityType) {
        return isToday;
      }

      // Filter by activity type
      const type = w.activityType.toLowerCase();
      switch (activityType) {
        case 'running':
          return isToday && (type.includes('run') || type.includes('jog') || type === 'running');
        case 'walking':
          return isToday && (type.includes('walk') || type.includes('hike') || type === 'walking');
        case 'cycling':
          return isToday && (type.includes('cycl') || type.includes('bike') || type === 'cycling');
        default:
          return isToday;
      }
    });
  }

  // ==========================================================================
  // Public API - Subscriber Pattern
  // ==========================================================================

  /**
   * Subscribe to cache updates
   * @returns Unsubscribe function
   */
  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    const t0 = Date.now();
    const subscriberCount = this.subscribers.size;
    console.log(`[TIMING-CACHE] notifySubscribers() called with ${subscriberCount} subscribers`);

    // EXPERIMENT 7: Use setImmediate instead of setTimeout
    // setTimeout is blocked for 43 seconds on iOS Simulator after WebSocket activity
    // setImmediate fires in 3ms and bypasses the blocked macrotask queue
    let index = 0;
    for (const callback of this.subscribers) {
      const subscriberIndex = index;
      setImmediate(() => {
        console.log(`[TIMING-CACHE] Subscriber #${subscriberIndex + 1}/${subscriberCount} EXECUTING via setImmediate at T+${Date.now() - t0}ms`);
        try {
          callback();
          console.log(`[TIMING-CACHE] Subscriber #${subscriberIndex + 1}/${subscriberCount} callback() RETURNED at T+${Date.now() - t0}ms`);
        } catch (error) {
          console.warn('[UnifiedWorkoutCache] Subscriber error:', error);
        }
      });
      index++;
    }
    console.log(`[TIMING-CACHE] notifySubscribers() SCHEDULED all ${subscriberCount} callbacks via setImmediate`);
  }

  // ==========================================================================
  // Public API - Stats
  // ==========================================================================

  /**
   * Get cache statistics
   */
  getStats(): { totalWorkouts: number; lastRefresh: number; isLoading: boolean } {
    return {
      totalWorkouts: this.workouts.size,
      lastRefresh: this.lastRefresh,
      isLoading: this.isLoading,
    };
  }

  /**
   * Prune workouts older than specified days
   * Called on initialize() and after fetchFromNostr() to enforce 60-day retention
   * @param maxAgeDays - Maximum age in days (default 60)
   */
  private pruneOldWorkouts(maxAgeDays: number = 60): void {
    const cutoffTimestamp = Math.floor(Date.now() / 1000) - (maxAgeDays * 24 * 60 * 60);
    let pruned = 0;

    for (const [id, workout] of this.workouts) {
      if (workout.createdAt < cutoffTimestamp) {
        this.workouts.delete(id);
        pruned++;
      }
    }

    if (pruned > 0) {
      console.log(`[UnifiedWorkoutCache] Pruned ${pruned} workouts older than ${maxAgeDays} days`);
    }
  }

  /**
   * Get activity breakdown
   */
  private getActivityBreakdown(): { running: number; walking: number; cycling: number; other: number } {
    let running = 0;
    let walking = 0;
    let cycling = 0;
    let other = 0;

    for (const workout of this.workouts.values()) {
      const type = workout.activityType.toLowerCase();
      if (type.includes('run') || type.includes('jog') || type === 'running') {
        running++;
      } else if (type.includes('walk') || type.includes('hike') || type === 'walking') {
        walking++;
      } else if (type.includes('cycl') || type.includes('bike') || type === 'cycling') {
        cycling++;
      } else {
        other++;
      }
    }

    return { running, walking, cycling, other };
  }
}

// Export singleton
export const UnifiedWorkoutCache = UnifiedWorkoutCacheClass.getInstance();
export default UnifiedWorkoutCache;
