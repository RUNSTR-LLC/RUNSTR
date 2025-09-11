/**
 * NdkWorkoutService - NDK-Based 1301 Workout Event Discovery
 * 
 * BASED ON: Successful Zap-Arena patterns that found 113 workouts
 * APPROACH: NDK subscription + timeout racing + fast relay selection
 * 
 * Key Zap-Arena Patterns Applied:
 * - NDK singleton with 30s connection timeouts
 * - Subscription-based fetching instead of just fetchEvents
 * - Smart timeout racing with Promise.race
 * - Fast relay selection based on performance metrics
 * - React Native optimizations with breathing room delays
 * - Comprehensive logging for debugging event discovery
 */

import NDK, { NDKEvent, NDKFilter, NDKSubscription, NDKRelay } from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';
import type { NostrWorkout, NostrWorkoutEvent } from '../../types/nostrWorkout';
import { NostrWorkoutParser } from '../../utils/nostrWorkoutParser';
import type { WorkoutType } from '../../types/workout';

export interface NdkWorkoutQueryResult {
  success: boolean;
  events: NDKEvent[];
  totalEventsFound: number;
  workoutsParsed: number;
  relaysResponded: number;
  method: string;
  queryTime: number;
  subscriptionStats?: {
    subscriptionsCreated: number;
    eventsReceived: number;
    timeoutsCaught: number;
  };
}

export interface WorkoutDiscoveryFilters {
  pubkey: string; // hex pubkey for author filter
  activityTypes?: WorkoutType[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

// Global NDK instance following Zap-Arena singleton pattern
const g = globalThis as any;

export class NdkWorkoutService {
  private static instance: NdkWorkoutService;
  private ndk: NDK;
  private isReady: boolean = false;
  private readyPromise: Promise<boolean>;
  
  // Relay list optimized for 1301 events based on Zap-Arena patterns
  private relayUrls = [
    'wss://relay.damus.io',
    'wss://nos.lol', 
    'wss://relay.primal.net',
    'wss://nostr.wine',
    'wss://relay.nostr.band',
    'wss://relay.snort.social',
    'wss://nostr-pub.wellorder.net'
  ];

  private constructor() {
    console.log('🚀 NdkWorkoutService: Initializing with Zap-Arena proven patterns');
    this.initializeNDK();
  }

  static getInstance(): NdkWorkoutService {
    if (!NdkWorkoutService.instance) {
      NdkWorkoutService.instance = new NdkWorkoutService();
    }
    return NdkWorkoutService.instance;
  }

  /**
   * Initialize NDK singleton following Zap-Arena global instance pattern
   */
  private initializeNDK(): void {
    if (!g.__RUNSTR_NDK_INSTANCE__) {
      console.log('[NDK Singleton] Creating new NDK instance for workout discovery...');
      
      this.ndk = new NDK({
        explicitRelayUrls: this.relayUrls,
        // Remove debug flag - not available in React Native/Hermes runtime
      });
      
      g.__RUNSTR_NDK_INSTANCE__ = this.ndk;
      
      // Initialize connection promise following Zap-Arena pattern
      this.readyPromise = this.connectWithTimeout();
      g.__RUNSTR_NDK_READY_PROMISE__ = this.readyPromise;
    } else {
      console.log('[NDK Singleton] Reusing existing NDK instance for workouts.');
      this.ndk = g.__RUNSTR_NDK_INSTANCE__;
      this.readyPromise = g.__RUNSTR_NDK_READY_PROMISE__ || this.connectWithTimeout();
    }
  }

  /**
   * Connect to NDK with timeout (Zap-Arena pattern: 30s timeout)
   */
  private async connectWithTimeout(): Promise<boolean> {
    try {
      const connectTimeoutMs = 30000; // Zap-Arena proven timeout
      console.log(`[NDK Workout] Attempting NDK.connect() with timeout: ${connectTimeoutMs}ms`);
      console.log(`[NDK Workout] Using relays:`, this.relayUrls);
      
      await this.ndk.connect(connectTimeoutMs);
      
      const connectedCount = this.ndk.pool?.stats()?.connected || 0;
      console.log(`[NDK Workout] NDK.connect() completed. Connected relays: ${connectedCount}`);
      console.log(`[NDK Workout] Pool stats:`, this.ndk.pool?.stats());

      if (connectedCount > 0) {
        console.log('[NDK Workout] NDK is ready for workout discovery.');
        this.isReady = true;
        return true;
      } else {
        console.error('[NDK Workout] No relays connected after NDK.connect()');
        throw new Error('Failed to connect to any relays for workout discovery.');
      }
    } catch (err) {
      console.error('[NDK Workout] Error during NDK connection:', err);
      this.isReady = false;
      return false;
    }
  }

  /**
   * Wait for NDK to be ready with timeout racing (Zap-Arena pattern)
   */
  private async awaitNDKReady(timeoutMs: number = 10000): Promise<boolean> {
    try {
      const ready = await Promise.race([
        this.readyPromise,
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
      ]);
      
      if (!ready) {
        throw new Error('NDK failed to become ready within timeout for workout discovery');
      }
      return true;
    } catch (err) {
      console.error('[NDK Workout] awaitNDKReady error:', err);
      return false;
    }
  }

  /**
   * Get fastest relays based on performance metrics (Zap-Arena pattern)
   */
  private getFastestRelays(count: number = 4): string[] {
    try {
      // Try to get performance metrics (will be undefined in React Native initially)
      const metricsStr = typeof localStorage !== 'undefined' ? localStorage?.getItem('relayPerformance') : null;
      if (!metricsStr) return this.relayUrls.slice(0, count);
      
      const metrics = JSON.parse(metricsStr);
      if (Object.keys(metrics).length === 0) return this.relayUrls.slice(0, count);
      
      // Calculate average response times
      const relayScores = Object.entries(metrics)
        .map(([relay, data]: [string, any]) => {
          const avgTime = data.count > 0 ? data.totalTime / data.count : Infinity;
          // Add recency bonus – prefer recently-used relays
          const recencyFactor = Date.now() - (data.lastUpdated || 0) < 24 * 60 * 60 * 1000 ? 0.7 : 1;
          return { relay, score: avgTime * recencyFactor }; // Lower score is better
        })
        // Only include relays that are in our active list
        .filter(item => this.relayUrls.includes(item.relay))
        // Sort by score (fastest first)
        .sort((a, b) => a.score - b.score)
        // Take the requested number
        .slice(0, count)
        // Extract just the URLs
        .map(item => item.relay);

      // Fall back to the first N default relays if we ended up with an empty list
      const finalRelays = relayScores.length > 0 ? relayScores : this.relayUrls.slice(0, count);
      console.log(`[NDK Workout] Using fastest relays for 1301 discovery:`, finalRelays);
      return finalRelays;
    } catch (err) {
      console.warn('[NDK Workout] Error getting fastest relays:', err);
      return this.relayUrls.slice(0, count);
    }
  }

  /**
   * MAIN DISCOVERY METHOD: NDK subscription-based 1301 event discovery
   * Based on successful Zap-Arena patterns that found 113 workouts
   */
  async discoverUserWorkouts(filters: WorkoutDiscoveryFilters): Promise<NostrWorkout[]> {
    const timestamp = new Date().toISOString();
    console.log(`🟢🟢🟢 NDK WORKOUT SERVICE ACTIVE ${timestamp} 🟢🟢🟢`);
    console.log('🎯🎯🎯 NDK SUBSCRIPTION STRATEGY - ZAP-ARENA PROVEN PATTERNS 🎯🎯🎯');
    console.log(`📊 NDK 1301 Event Discovery Starting for pubkey: ${filters.pubkey.slice(0, 16)}...`);

    // Wait for NDK to be ready
    const isReady = await this.awaitNDKReady(15000);
    if (!isReady) {
      console.error('❌ NDK not ready for workout discovery');
      return [];
    }

    const startTime = Date.now();
    const allEvents: NDKEvent[] = [];
    const processedEventIds = new Set<string>();
    const workouts: NostrWorkout[] = [];
    let subscriptionStats = {
      subscriptionsCreated: 0,
      eventsReceived: 0,
      timeoutsCaught: 0
    };

    try {
      // STRATEGY 1: Multi-time-range subscriptions (Zap-Arena pattern)
      const primaryResult = await this.executeNdkMultiTimeRangeStrategy(
        filters, 
        allEvents, 
        processedEventIds, 
        subscriptionStats
      );
      
      // STRATEGY 2: Nuclear subscription option (no time filters)
      if (primaryResult.totalEventsFound < 100) {
        console.log('🚀 NDK NUCLEAR OPTION: Executing no-time-filter subscription...');
        const nuclearResult = await this.executeNdkNuclearStrategy(
          filters, 
          allEvents, 
          processedEventIds, 
          subscriptionStats
        );
        console.log(`🚀 NDK Nuclear strategy found ${nuclearResult.totalEventsFound} additional events`);
      }

      // Process all collected events into workouts
      console.log(`📊 Processing ${allEvents.length} total NDK 1301 events into NostrWorkout objects...`);
      
      for (const ndkEvent of allEvents) {
        if (processedEventIds.has(ndkEvent.id)) continue;
        processedEventIds.add(ndkEvent.id);

        try {
          // Convert NDK event to standard Nostr event format
          const standardEvent = this.convertNdkEventToStandard(ndkEvent);
          
          // Parse and validate 1301 event as workout
          const workoutEvent = NostrWorkoutParser.parseNostrEvent(standardEvent);
          if (!workoutEvent) continue;

          // Apply filters if specified
          if (!this.passesWorkoutFilters(workoutEvent, filters)) continue;

          const workout = NostrWorkoutParser.convertToWorkout(
            workoutEvent,
            'ndk_workout_service_user', // userId for parsing context
            true // preserveRawEvents for debugging
          );

          // Validate workout data
          const validationErrors = NostrWorkoutParser.validateWorkoutData(workout);
          if (validationErrors.length === 0) {
            workouts.push(workout);
            console.log(`✅ NDK WORKOUT ADDED: ${workout.type} - ${workout.duration}min, ${workout.distance}m - ${new Date(workout.startTime).toDateString()}`);
          } else {
            console.log(`⚠️ NDK Workout filtered (validation errors): ${validationErrors.length} issues`);
          }
          
        } catch (error) {
          console.warn(`⚠️ Error processing NDK 1301 event ${ndkEvent.id}:`, error);
        }
      }

      const queryTime = Date.now() - startTime;
      console.log(`🚀🚀🚀 NDK WORKOUT RESULT: Found ${workouts.length} workouts in ${queryTime}ms`);
      console.log(`📊 NDK WORKOUT PERFORMANCE METRICS:`);
      console.log(`   Total NDK Events Collected: ${allEvents.length}`);
      console.log(`   Unique Events Processed: ${processedEventIds.size}`);
      console.log(`   Valid Workouts After Processing: ${workouts.length}`);
      console.log(`   Subscriptions Created: ${subscriptionStats.subscriptionsCreated}`);
      console.log(`   Events Received via Subscriptions: ${subscriptionStats.eventsReceived}`);
      console.log(`   Timeouts Caught: ${subscriptionStats.timeoutsCaught}`);

      if (workouts.length > 0) {
        console.log('📋 NDK Workout summary:');
        const typeCounts = workouts.reduce((acc, workout) => {
          acc[workout.type] = (acc[workout.type] || 0) + 1;
          return acc;
        }, {} as Record<WorkoutType, number>);
        
        Object.entries(typeCounts).forEach(([type, count]) => {
          console.log(`  ${type}: ${count} workouts`);
        });

        // Show date range
        const dates = workouts.map(w => new Date(w.startTime).getTime()).sort();
        const oldest = new Date(dates[0]);
        const newest = new Date(dates[dates.length - 1]);
        console.log(`📅 NDK Date range: ${oldest.toDateString()} → ${newest.toDateString()}`);
      }

      return workouts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    } catch (error) {
      console.error('❌ NdkWorkoutService: Error discovering workouts:', error);
      return [];
    }
  }

  /**
   * Multi-Time-Range NDK Subscription Strategy (Zap-Arena Pattern)
   */
  private async executeNdkMultiTimeRangeStrategy(
    filters: WorkoutDiscoveryFilters,
    allEvents: NDKEvent[], 
    processedEventIds: Set<string>,
    subscriptionStats: any
  ): Promise<NdkWorkoutQueryResult> {
    console.log('🎯 NDK SUBSCRIPTION STRATEGY: Multi-time-range 1301 event subscriptions');
    
    const now = Math.floor(Date.now() / 1000);
    const day = 24 * 60 * 60;
    
    // Time ranges based on successful patterns
    const timeRanges = [
      { name: 'Recent (0-7 days)', since: now - (7 * day), until: now, limit: 50 },
      { name: 'Week old (7-14 days)', since: now - (14 * day), until: now - (7 * day), limit: 50 },
      { name: 'Month old (14-30 days)', since: now - (30 * day), until: now - (14 * day), limit: 50 },
      { name: 'Older (30-90 days)', since: now - (90 * day), until: now - (30 * day), limit: 75 },
      { name: 'Historical (90-365 days)', since: now - (365 * day), until: now - (90 * day), limit: 100 },
      { name: 'Deep Historical (1+ years)', since: 0, until: now - (365 * day), limit: 50 }
    ];

    let totalEventsFound = 0;
    const startTime = Date.now();

    for (const timeRange of timeRanges) {
      console.log(`🕒 NDK Subscribing to ${timeRange.name}...`);
      
      const filter: NDKFilter = {
        kinds: [1301],
        authors: [filters.pubkey],
        limit: timeRange.limit,
        since: timeRange.since,
        until: timeRange.until
      };

      const rangeEvents = await this.subscribeWithNdk(filter, timeRange.name, subscriptionStats);
      
      // Add unique events
      for (const event of rangeEvents) {
        if (!processedEventIds.has(event.id)) {
          allEvents.push(event);
          processedEventIds.add(event.id);
          totalEventsFound++;
        }
      }

      console.log(`   NDK ${timeRange.name}: ${rangeEvents.length} events (${totalEventsFound} total unique)`);
      
      // React Native breathing room
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      success: totalEventsFound > 0,
      events: allEvents,
      totalEventsFound,
      workoutsParsed: 0, // Will be calculated later
      relaysResponded: this.relayUrls.length,
      method: 'ndk-multi-time-range',
      queryTime: Date.now() - startTime,
      subscriptionStats
    };
  }

  /**
   * Nuclear NDK Subscription Strategy (No time filters)
   */
  private async executeNdkNuclearStrategy(
    filters: WorkoutDiscoveryFilters,
    allEvents: NDKEvent[], 
    processedEventIds: Set<string>,
    subscriptionStats: any
  ): Promise<NdkWorkoutQueryResult> {
    console.log('🚀 NDK NUCLEAR STRATEGY: No time filters with author restrictions');
    
    const startTime = Date.now();
    let totalEventsFound = 0;

    // Multiple limit attempts
    const limits = [100, 200, 500];
    
    for (const limit of limits) {
      console.log(`🚀 NDK Nuclear subscription with limit: ${limit}`);
      
      const filter: NDKFilter = {
        kinds: [1301],
        authors: [filters.pubkey],
        limit: limit
        // NO time filters - nuclear approach
      };

      const nuclearEvents = await this.subscribeWithNdk(filter, `nuclear-${limit}`, subscriptionStats);
      
      // Add unique events
      for (const event of nuclearEvents) {
        if (!processedEventIds.has(event.id)) {
          allEvents.push(event);
          processedEventIds.add(event.id);
          totalEventsFound++;
        }
      }

      console.log(`   NDK Nuclear ${limit}: ${nuclearEvents.length} events (${totalEventsFound} total unique)`);
      
      // React Native breathing room between nuclear attempts
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return {
      success: totalEventsFound > 0,
      events: allEvents,
      totalEventsFound,
      workoutsParsed: 0, // Will be calculated later
      relaysResponded: this.relayUrls.length,
      method: 'ndk-nuclear',
      queryTime: Date.now() - startTime,
      subscriptionStats
    };
  }

  /**
   * Core NDK Subscription with timeout racing (Zap-Arena Pattern)
   */
  private async subscribeWithNdk(
    filter: NDKFilter, 
    strategy: string, 
    subscriptionStats: any
  ): Promise<NDKEvent[]> {
    const events: NDKEvent[] = [];
    const timeout = 8000; // 8 second timeout (Zap-Arena pattern: 6-8s)
    
    return new Promise((resolve) => {
      console.log(`📡 NDK subscription: ${strategy}`);
      
      // Enhanced logging for debug
      console.log(`🔍 NDK FILTER DEBUG:`, {
        kinds: filter.kinds,
        authors: filter.authors,
        authorsLength: filter.authors?.length,
        authorsFirstItem: filter.authors?.[0],
        since: filter.since,
        until: filter.until,
        limit: filter.limit
      });
      
      // Get fastest relays for this subscription
      const fastRelays = this.getFastestRelays(4);
      
      // Create subscription with fast relays
      const subscription: NDKSubscription = this.ndk.subscribe(
        filter,
        { 
          closeOnEose: false, // CRITICAL: Keep subscription open (Zap-Arena pattern)
          relays: fastRelays
        }
      );
      
      subscriptionStats.subscriptionsCreated++;
      
      subscription.on('event', (event: NDKEvent) => {
        // COMPREHENSIVE EVENT LOGGING
        console.log(`📥 NDK RAW 1301 EVENT RECEIVED:`, {
          id: event.id.substring(0, 8),
          kind: event.kind,
          tags: event.tags?.slice(0, 5),
          content: event.content?.substring(0, 50),
          pubkey: event.pubkey?.substring(0, 8),
          created_at: new Date((event.created_at || 0) * 1000).toISOString()
        });
        
        // Additional client-side filtering for workout events
        if (event.kind === 1301) {
          const hasWorkoutTags = event.tags?.some(tag => 
            ['distance', 'duration', 'exercise', 'title', 'calories'].includes(tag[0])
          );
          if (hasWorkoutTags) {
            events.push(event);
            subscriptionStats.eventsReceived++;
            console.log(`✅ NDK Valid Workout Event ${events.length}: ${event.id?.slice(0, 8)} via ${strategy}`);
          } else {
            console.log(`⚠️ NDK 1301 event missing workout tags: ${event.id?.slice(0, 8)}`);
          }
        } else {
          console.log(`⚠️ NDK Unexpected event kind ${event.kind}: ${event.id?.slice(0, 8)}`);
        }
      });
      
      subscription.on('eose', () => {
        // Don't close immediately on EOSE (Zap-Arena pattern: events can arrive after EOSE)
        console.log(`📨 NDK EOSE received for ${strategy} - continuing to wait for timeout...`);
      });

      // Timeout with Promise.race pattern (Zap-Arena)
      setTimeout(() => {
        console.log(`⏰ NDK ${strategy} timeout complete: ${events.length} workout events collected`);
        subscription.stop();
        subscriptionStats.timeoutsCaught++;
        resolve(events);
      }, timeout);
    });
  }

  /**
   * Convert NDK event to standard Nostr event format
   */
  private convertNdkEventToStandard(ndkEvent: NDKEvent): any {
    return {
      id: ndkEvent.id,
      kind: ndkEvent.kind,
      pubkey: ndkEvent.pubkey,
      created_at: ndkEvent.created_at || 0,
      content: ndkEvent.content || '',
      tags: ndkEvent.tags || [],
      sig: ndkEvent.sig || ''
    };
  }

  /**
   * Apply additional filters to workout events
   */
  private passesWorkoutFilters(workoutEvent: NostrWorkoutEvent, filters: WorkoutDiscoveryFilters): boolean {
    // Activity type filter
    if (filters.activityTypes && filters.activityTypes.length > 0) {
      const exerciseTag = workoutEvent.tags.find(tag => tag[0] === 'exercise');
      const activityType = exerciseTag?.[1] as WorkoutType;
      if (!activityType || !filters.activityTypes.includes(activityType)) {
        return false;
      }
    }

    // Date range filters
    const eventDate = new Date(workoutEvent.created_at * 1000);
    
    if (filters.startDate && eventDate < filters.startDate) {
      return false;
    }
    
    if (filters.endDate && eventDate > filters.endDate) {
      return false;
    }

    return true;
  }

  /**
   * Convert npub to hex pubkey for author filter (enhanced with NDK context)
   */
  static convertNpubToHex(npub: string): string {
    console.log('🔧 NDK PUBKEY CONVERSION DEBUG - Starting conversion...');
    console.log(`📥 Input npub: "${npub}"`);
    
    try {
      const TEST_NPUB = 'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum';
      const EXPECTED_HEX = '30ceb64e73197a05958c8bd92ab079c815bb44fbfbb3eb5d9766c5207f08bdf5';
      
      if (npub === TEST_NPUB) {
        console.log('🎯 NDK CRITICAL TEST: Converting the target npub that should produce 113 workouts!');
      }
      
      const decoded = nip19.decode(npub);
      
      if (decoded.type !== 'npub') {
        throw new Error('Invalid npub format');
      }
      
      const hexPubkey = decoded.data;
      
      if (hexPubkey.length !== 64) {
        throw new Error(`Invalid hex pubkey length: ${hexPubkey.length}, expected 64`);
      }
      
      if (npub === TEST_NPUB) {
        if (hexPubkey === EXPECTED_HEX) {
          console.log('🚀 NDK SUCCESS: Target npub converted to expected hex!');
          console.log('🎯 NDK should now find 113 workout events instead of 0');
        } else {
          console.error('❌ NDK CRITICAL MISMATCH: Target npub conversion failed!');
        }
      }
      
      console.log('✅ NDK PUBKEY CONVERSION SUCCESS');
      return hexPubkey;
      
    } catch (error) {
      console.error('❌ NDK PUBKEY CONVERSION FAILED:', error);
      throw new Error(`Failed to convert npub to hex pubkey for NDK: ${error.message}`);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.ndk) {
      // Close all relay connections
      for (const relay of this.ndk.pool?.relays?.values() || []) {
        (relay as NDKRelay).disconnect();
      }
      console.log('🧹 NdkWorkoutService: Cleanup completed');
    }
  }
}

// Export singleton instance
export default NdkWorkoutService;