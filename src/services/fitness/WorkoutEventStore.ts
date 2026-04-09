/**
 * WorkoutEventStore - Centralized store for kind 1301 workout events
 *
 * Single source of truth for all workout data in the app.
 * Components read from this store, never directly from Nostr.
 * Pull-to-refresh anywhere triggers store.refresh() to update all views.
 *
 * Benefits:
 * - No more infinite spinners (timeout protection)
 * - Instant navigation (all screens read from cache)
 * - Single refresh point (pull-to-refresh anywhere updates everything)
 * - Reduced relay load (one query instead of 15+ duplicate queries)
 * - Offline support (AsyncStorage cache provides fallback)
 * - Consistent data (all views see the same workout data)
 */

import { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Types
// ============================================================================

export interface StoredWorkout {
  id: string;
  pubkey: string;
  teamId?: string;
  activityType: string;
  distance?: number; // meters
  duration?: number; // seconds
  calories?: number;
  pace?: number; // seconds per km
  elevation?: number; // meters
  createdAt: number; // unix timestamp (seconds)
  profileName?: string;
  profilePicture?: string;
  splits?: Map<number, number>; // km -> elapsed time in seconds (e.g., km 5 -> 1800s)
  eventIds?: string[]; // Event IDs this workout belongs to (from #e tags)
}

interface WorkoutEventStoreState {
  workouts: Map<string, StoredWorkout>;
  lastFetchTime: number;
  isLoading: boolean;
  error: string | null;
}

type WorkoutSubscriber = (workouts: StoredWorkout[]) => void;

// ============================================================================
// Constants
// ============================================================================

const CACHE_KEY = '@runstr:workout_event_store_v1';
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // Fetch window for events (reduced from 7 days for faster loading)
const QUERY_TIMEOUT_MS = 3000; // Reduced for faster perceived loading
const RELAY_CONNECT_TIMEOUT_MS = 2000; // Reduced for faster perceived loading

// ============================================================================
// WorkoutEventStore
// ============================================================================

export class WorkoutEventStore {
  private static instance: WorkoutEventStore;
  private state: WorkoutEventStoreState;
  private subscribers: Set<WorkoutSubscriber>;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.state = {
      workouts: new Map(),
      lastFetchTime: 0,
      isLoading: false,
      error: null,
    };
    this.subscribers = new Set();
  }

  // ============================================================================
  // Singleton
  // ============================================================================

  static getInstance(): WorkoutEventStore {
    if (!WorkoutEventStore.instance) {
      WorkoutEventStore.instance = new WorkoutEventStore();
    }
    return WorkoutEventStore.instance;
  }

  // ============================================================================
  // Public Properties
  // ============================================================================

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get error(): string | null {
    return this.state.error;
  }

  get lastFetchTime(): number {
    return this.state.lastFetchTime;
  }

  // ============================================================================
  // Core Methods
  // ============================================================================

  /**
   * Initialize the store - load from cache, then fetch fresh data
   * Called on app startup (non-blocking)
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    const t0 = Date.now();
    console.log(`[WorkoutEventStore] Initializing at ${t0}...`);

    try {
      // Step 1: Load from cache immediately (instant)
      await this.loadFromCache();
      console.log(
        `[WorkoutEventStore] Loaded ${this.state.workouts.size} workouts from cache (${Date.now() - t0}ms)`
      );

      // Step 2: Fetch fresh data in background
      await this.fetchFromRelays();
      console.log(
        `[WorkoutEventStore] ✅ Initialize COMPLETE at ${Date.now()} (${Date.now() - t0}ms total, ${this.state.workouts.size} workouts)`
      );
    } catch (error) {
      console.error(`[WorkoutEventStore] Initialization failed at ${Date.now()}:`, error);
      this.state.error =
        error instanceof Error ? error.message : 'Initialization failed';
    }
  }

  /**
   * Refresh the store - fetch fresh data from relays
   * Called on pull-to-refresh
   */
  async refresh(): Promise<void> {
    console.log('[WorkoutEventStore] 🔄 refresh() called - starting fetch');
    console.log(`[WorkoutEventStore] Current store size: ${this.state.workouts.size} workouts`);
    this.state.isLoading = true;
    this.state.error = null;
    this.notifySubscribers();

    try {
      await this.fetchFromRelays();
      console.log(
        `[WorkoutEventStore] Refreshed with ${this.state.workouts.size} workouts`
      );
    } catch (error) {
      console.error('[WorkoutEventStore] Refresh failed:', error);
      this.state.error =
        error instanceof Error ? error.message : 'Refresh failed';
    } finally {
      this.state.isLoading = false;
      this.notifySubscribers();
    }
  }

  // ============================================================================
  // Query Methods (all read from local store, never from Nostr)
  // ============================================================================

  /**
   * Get all workouts in the store
   */
  getAllWorkouts(): StoredWorkout[] {
    return Array.from(this.state.workouts.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  /**
   * Get workouts filtered by team ID
   */
  getWorkoutsByTeam(teamId: string): StoredWorkout[] {
    return this.getAllWorkouts().filter((w) => w.teamId === teamId);
  }

  /**
   * Get workouts filtered by user pubkey
   */
  getWorkoutsByUser(pubkey: string): StoredWorkout[] {
    return this.getAllWorkouts().filter((w) => w.pubkey === pubkey);
  }

  /**
   * Get today's workouts
   */
  getTodaysWorkouts(): StoredWorkout[] {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayTimestamp = Math.floor(todayMidnight.getTime() / 1000);

    return this.getAllWorkouts().filter((w) => w.createdAt >= todayTimestamp);
  }

  /**
   * Get recent workouts (last 2 days - matches fetch window)
   */
  getRecentWorkouts(): StoredWorkout[] {
    const twoDaysAgo = Math.floor((Date.now() - TWO_DAYS_MS) / 1000);
    return this.getAllWorkouts().filter((w) => w.createdAt >= twoDaysAgo);
  }

  /**
   * Get workouts within a date range
   */
  getWorkoutsInDateRange(
    sinceTimestamp: number,
    untilTimestamp: number
  ): StoredWorkout[] {
    return this.getAllWorkouts().filter(
      (w) => w.createdAt >= sinceTimestamp && w.createdAt <= untilTimestamp
    );
  }

  /**
   * Get today's workouts for a specific team (for leaderboards)
   */
  getTodaysTeamWorkouts(teamId: string): StoredWorkout[] {
    return this.getTodaysWorkouts().filter((w) => w.teamId === teamId);
  }

  /**
   * Get workouts for an event (filtered by date range and participants)
   * Used by events to read from unified cache instead of direct Nostr queries
   */
  getEventWorkouts(
    startTimestamp: number,
    endTimestamp: number,
    participantPubkeys: string[]
  ): StoredWorkout[] {
    const workouts = this.getAllWorkouts();
    return workouts.filter((w) => {
      const isInDateRange =
        w.createdAt >= startTimestamp && w.createdAt <= endTimestamp;
      const isParticipant = participantPubkeys.includes(w.pubkey);
      return isInDateRange && isParticipant;
    });
  }

  /**
   * Get workouts tagged with a specific event ID
   * Used by RUNSTR events - workouts self-identify via #e tag
   * No RSVP/participant queries needed - just filter by event tag
   */
  getWorkoutsByEventId(eventId: string): StoredWorkout[] {
    return this.getAllWorkouts().filter(
      (w) => w.eventIds && w.eventIds.includes(eventId)
    );
  }

  /**
   * Get workouts tagged with a specific event ID within a date range
   * Combines event tag filtering with date range for accurate leaderboards
   */
  getWorkoutsByEventIdInRange(
    eventId: string,
    startTimestamp: number,
    endTimestamp: number
  ): StoredWorkout[] {
    return this.getAllWorkouts().filter((w) => {
      const hasEventTag = w.eventIds && w.eventIds.includes(eventId);
      const isInDateRange =
        w.createdAt >= startTimestamp && w.createdAt <= endTimestamp;
      return hasEventTag && isInDateRange;
    });
  }

  // ============================================================================
  // Subscription
  // ============================================================================

  /**
   * Subscribe to store updates
   * Returns unsubscribe function
   */
  subscribe(callback: WorkoutSubscriber): () => void {
    this.subscribers.add(callback);

    // Immediately call with current data
    callback(this.getAllWorkouts());

    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    const workouts = this.getAllWorkouts();
    for (const callback of this.subscribers) {
      try {
        callback(workouts);
      } catch (error) {
        console.error('[WorkoutEventStore] Subscriber error:', error);
      }
    }
  }

  // ============================================================================
  // Cache Operations
  // ============================================================================

  private async loadFromCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.workouts && Array.isArray(data.workouts)) {
          for (const workout of data.workouts) {
            // FIX: Reconstruct splits Map from serialized plain object
            // Maps don't survive JSON.stringify/parse - they become plain objects
            if (workout.splits && typeof workout.splits === 'object' && !(workout.splits instanceof Map)) {
              workout.splits = new Map(
                Object.entries(workout.splits).map(([k, v]) => [Number(k), v as number])
              );
            }
            this.state.workouts.set(workout.id, workout);
          }
          this.state.lastFetchTime = data.lastFetchTime || 0;
        }
      }
    } catch (error) {
      console.warn('[WorkoutEventStore] Failed to load cache:', error);
    }
  }

  private async saveToCache(): Promise<void> {
    try {
      // FIX: Convert Map to plain object before JSON serialization
      // Maps don't survive JSON.stringify - they serialize as empty objects
      const workoutsToSave = Array.from(this.state.workouts.values()).map(w => ({
        ...w,
        splits: w.splits instanceof Map ? Object.fromEntries(w.splits) : w.splits,
      }));
      const data = {
        workouts: workoutsToSave,
        lastFetchTime: this.state.lastFetchTime,
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('[WorkoutEventStore] Failed to save cache:', error);
    }
  }

  // ============================================================================
  // Nostr Query (Internal)
  // ============================================================================

  private async fetchFromRelays(): Promise<void> {
    const t0 = Date.now();
    console.log(`[WorkoutEventStore] fetchFromRelays START at ${t0}`);
    this.state.isLoading = true;

    try {
      const ndk = await GlobalNDKService.getInstance();
      console.log(`[WorkoutEventStore] NDK getInstance: ${Date.now() - t0}ms`);

      // Wait for relay connection first
      const connected = await GlobalNDKService.waitForMinimumConnection(
        2,
        RELAY_CONNECT_TIMEOUT_MS
      );
      if (!connected) {
        console.warn(
          '[WorkoutEventStore] Proceeding with limited relay connectivity'
        );
      }

      const relayStatus = GlobalNDKService.getStatus();
      console.log(
        `[WorkoutEventStore] Relay Status: ${relayStatus.connectedRelays}/${relayStatus.relayCount} connected`
      );

      // Query last 2 days of workouts (reduced from 7 for faster loading)
      // Events older than 2 days fall back to direct Nostr query
      const twoDaysAgo = Math.floor((Date.now() - TWO_DAYS_MS) / 1000);
      const filter: NDKFilter = {
        kinds: [1301 as any],
        since: twoDaysAgo,
        limit: 500, // Reduced limit since we're only fetching 2 days
      };

      console.log('[WorkoutEventStore] Querying with filter:', {
        since: new Date(twoDaysAgo * 1000).toISOString(),
        limit: 500,
      });

      // Query with hard timeout (prevents infinite hang)
      const events = await Promise.race([
        this.queryWorkouts(ndk, filter),
        new Promise<Set<NDKEvent>>((_, reject) =>
          setTimeout(
            () => reject(new Error('Query timeout')),
            QUERY_TIMEOUT_MS
          )
        ),
      ]).catch((err) => {
        console.error('[WorkoutEventStore] Query failed:', err);
        return new Set<NDKEvent>();
      });

      console.log(`[WorkoutEventStore] Received ${events.size} events`);

      // Parse and store
      let parsed = 0;
      for (const event of events) {
        const workout = this.parseWorkoutEvent(event);
        if (workout) {
          this.state.workouts.set(workout.id, workout);
          parsed++;
        }
      }

      console.log(`[WorkoutEventStore] Parsed ${parsed} workouts`);

      this.state.lastFetchTime = Date.now();
      this.state.error = null;

      // Save to cache
      await this.saveToCache();
      console.log(`[WorkoutEventStore] Fetched ${this.state.workouts.size} workouts in ${Date.now() - t0}ms`);
    } finally {
      this.state.isLoading = false;
    }
  }

  private async queryWorkouts(
    ndk: any,
    filter: NDKFilter
  ): Promise<Set<NDKEvent>> {
    return new Promise((resolve) => {
      const collectedEvents = new Set<NDKEvent>();
      let eoseReceived = false;

      // IMPORTANT: Use explicit relay pool to disable Outbox Model
      // This prevents NDK from connecting to author's preferred relays
      const subscription = ndk.subscribe(filter, {
        closeOnEose: false,
        pool: ndk.pool,  // Force use of explicit relays only
        groupable: false, // Don't group with other subscriptions
      });

      // Track if we've already resolved to prevent double-resolution
      let resolved = false;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        // Remove listeners BEFORE stopping to prevent accumulation
        subscription.removeAllListeners('event');
        subscription.removeAllListeners('eose');
        subscription.stop();
        resolve(collectedEvents);
      };

      // EVENT-DRIVEN: Resolve immediately on EOSE (no polling!)
      subscription.on('eose', () => {
        console.log(
          `[WorkoutEventStore] EOSE received - ${collectedEvents.size} events collected`
        );
        cleanup();
      });

      // Event handler with EARLY TERMINATION: If we have 100+ events, resolve immediately
      // This prevents waiting for slow relays when we have enough data
      subscription.on('event', (event: NDKEvent) => {
        collectedEvents.add(event);
        // Early termination threshold
        if (collectedEvents.size >= 100 && !resolved) {
          console.log(
            `[WorkoutEventStore] Early termination - 100+ events collected`
          );
          cleanup();
        }
      });

      // Safety timeout after 5s (increased from 3s for reliability)
      setTimeout(() => {
        if (!resolved) {
          console.log(
            `[WorkoutEventStore] Timeout - ${collectedEvents.size} events`
          );
        }
        cleanup();
      }, 5000);
    });
  }

  // ============================================================================
  // Event Parsing
  // ============================================================================

  private parseWorkoutEvent(event: NDKEvent): StoredWorkout | null {
    try {
      const tags = new Map<string, string[]>();
      for (const tag of event.tags) {
        if (tag.length >= 2) {
          tags.set(tag[0], tag.slice(1));
        }
      }

      // DEBUG: Log raw event details for first few events
      if (this.state.workouts.size < 10) {
        console.log(`[WorkoutEventStore] DEBUG - Parsing event ${event.id.slice(0, 8)}:`);
        console.log(`  pubkey: ${event.pubkey.slice(0, 8)}`);
        console.log(`  created_at: ${event.created_at} (${new Date((event.created_at || 0) * 1000).toISOString()})`);
        console.log(`  tags:`, event.tags.map(t => `[${t.join(', ')}]`).join(' '));
      }

      // Extract activity type
      const exerciseTag = tags.get('exercise');
      const typeTag = tags.get('type');
      let activityType = exerciseTag?.[0] || typeTag?.[0] || 'other';
      activityType = activityType.toLowerCase();

      // Validate it's a workout event
      if (!exerciseTag && !typeTag) {
        // Try to parse from content
        if (event.content) {
          const contentLower = event.content.toLowerCase();
          if (contentLower.includes('running') || contentLower.includes('run')) {
            activityType = 'running';
          } else if (
            contentLower.includes('cycling') ||
            contentLower.includes('bike')
          ) {
            activityType = 'cycling';
          } else if (contentLower.includes('walking')) {
            activityType = 'walking';
          } else if (contentLower.includes('hiking')) {
            activityType = 'hiking';
          } else {
            // Skip events without clear activity type
            return null;
          }
        } else {
          return null;
        }
      }

      // Extract distance (convert to meters)
      let distance: number | undefined;
      const distanceTag = tags.get('distance');
      if (distanceTag) {
        const value = parseFloat(distanceTag[0]);
        const unit = distanceTag[1]?.toLowerCase() || 'km';
        if (!isNaN(value)) {
          if (unit === 'mi' || unit === 'miles') {
            distance = value * 1609.34;
          } else if (unit === 'km' || unit === 'kilometers') {
            distance = value * 1000;
          } else if (unit === 'm' || unit === 'meters') {
            distance = value;
          } else {
            // Assume km if no unit
            distance = value * 1000;
          }
        }
      }

      // Extract duration (convert to seconds)
      let duration: number | undefined;
      const durationTag = tags.get('duration');
      if (durationTag) {
        const value = durationTag[0];
        // Try HH:MM:SS format
        if (value.includes(':')) {
          const parts = value.split(':').map(Number);
          if (parts.length === 3) {
            duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
          } else if (parts.length === 2) {
            duration = parts[0] * 60 + parts[1];
          }
        } else {
          // Assume seconds
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            duration = numValue;
          }
        }
      }

      // Extract calories
      let calories: number | undefined;
      const caloriesTag = tags.get('calories');
      if (caloriesTag) {
        const value = parseFloat(caloriesTag[0]);
        if (!isNaN(value)) {
          calories = value;
        }
      }

      // Extract team ID
      const teamTag = tags.get('team');
      const teamId = teamTag?.[0];

      // Calculate pace (seconds per km)
      let pace: number | undefined;
      if (distance && duration && distance > 0) {
        pace = (duration / distance) * 1000; // seconds per km
      }

      // Extract elevation
      let elevation: number | undefined;
      const elevationTag = tags.get('elevation_gain') || tags.get('elevation');
      if (elevationTag) {
        const value = parseFloat(elevationTag[0]);
        const unit = elevationTag[1]?.toLowerCase() || 'm';
        if (!isNaN(value)) {
          if (unit === 'ft' || unit === 'feet') {
            elevation = value * 0.3048;
          } else {
            elevation = value;
          }
        }
      }

      // Parse split data from ["split", "1", "00:05:12"] tags
      // Splits record elapsed time at each km marker
      const splits = new Map<number, number>();
      const splitTags = event.tags.filter((t: string[]) => t[0] === 'split');
      for (const splitTag of splitTags) {
        if (splitTag.length >= 3) {
          const km = parseInt(splitTag[1]);
          const timeStr = splitTag[2];
          // Parse HH:MM:SS or MM:SS format
          const parts = timeStr.split(':').map(Number);
          let elapsedTime = 0;
          if (parts.length === 3) {
            elapsedTime = parts[0] * 3600 + parts[1] * 60 + parts[2];
          } else if (parts.length === 2) {
            elapsedTime = parts[0] * 60 + parts[1];
          }
          if (!isNaN(km) && elapsedTime > 0) {
            splits.set(km, elapsedTime);
          }
        }
      }

      // Parse event IDs from #e tags (workout tagged with event)
      const eventIds: string[] = [];
      const eTags = event.tags.filter((t: string[]) => t[0] === 'e');
      for (const eTag of eTags) {
        if (eTag.length >= 2 && eTag[1]) {
          eventIds.push(eTag[1]);
        }
      }

      return {
        id: event.id,
        pubkey: event.pubkey,
        teamId,
        activityType,
        distance,
        duration,
        calories,
        pace,
        elevation,
        createdAt: event.created_at || Math.floor(Date.now() / 1000),
        splits: splits.size > 0 ? splits : undefined,
        eventIds: eventIds.length > 0 ? eventIds : undefined,
      };
    } catch (error) {
      console.warn('[WorkoutEventStore] Failed to parse event:', error);
      return null;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Clear all stored workouts
   */
  async clear(): Promise<void> {
    this.state.workouts.clear();
    this.state.lastFetchTime = 0;
    await AsyncStorage.removeItem(CACHE_KEY);
    this.notifySubscribers();
  }

  /**
   * Get store statistics
   */
  getStats(): {
    totalWorkouts: number;
    todaysWorkouts: number;
    teamsWithWorkouts: number;
    lastFetchTime: number;
    isLoading: boolean;
  } {
    const uniqueTeams = new Set<string>();
    for (const workout of this.state.workouts.values()) {
      if (workout.teamId) {
        uniqueTeams.add(workout.teamId);
      }
    }

    return {
      totalWorkouts: this.state.workouts.size,
      todaysWorkouts: this.getTodaysWorkouts().length,
      teamsWithWorkouts: uniqueTeams.size,
      lastFetchTime: this.state.lastFetchTime,
      isLoading: this.state.isLoading,
    };
  }
}

export default WorkoutEventStore;
