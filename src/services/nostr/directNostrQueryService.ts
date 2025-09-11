/**
 * DirectNostrQueryService - Fresh Pool Strategy for Real iOS Device Compatibility
 * 
 * PROBLEM: Persistent NostrRelayManager connections fail on real iOS devices
 * SOLUTION: Create fresh SimplePool instances per query (same as working HTML test)
 * 
 * This service bypasses the existing relay manager entirely and uses the exact
 * same pattern as the successful test-progressive-workout-loading.html
 */

import { Platform } from 'react-native';
import type { Event } from 'nostr-tools';
import type { NostrWorkout } from '../../types/nostrWorkout';
import { NostrWorkoutParser } from '../../utils/nostrWorkoutParser';

// iOS-optimized network configuration
const NETWORK_CONFIG = Platform.select({
  ios: {
    timeout: 10000, // Longer timeout for real devices
    maxRetries: 2,
    retryDelay: 1500,
  },
  default: {
    timeout: 5000,
    maxRetries: 1, 
    retryDelay: 1000,
  }
});

// Primary relay URLs (same as HTML test)
const PRIMARY_RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net', 
  'wss://nos.lol',
  'wss://nostr.wine'
];

// Backup relays for fallback
const BACKUP_RELAY_URLS = [
  'wss://relay.nostr.info',
  'wss://nostr-pub.wellorder.net',
  'wss://relay.current.fyi'
];

export interface DirectQueryResult {
  success: boolean;
  workouts: NostrWorkout[];
  eventsFound: number;
  relaysResponded: number;
  totalQueryTime: number;
  errors: string[];
}

export interface DirectQueryOptions {
  limit?: number;
  since?: number;
  until?: number;
  useBackupRelays?: boolean;
  userId: string;
}

export class DirectNostrQueryService {
  private static instance: DirectNostrQueryService;

  private constructor() {}

  static getInstance(): DirectNostrQueryService {
    if (!DirectNostrQueryService.instance) {
      DirectNostrQueryService.instance = new DirectNostrQueryService();
    }
    return DirectNostrQueryService.instance;
  }

  /**
   * MAIN QUERY METHOD: Fresh Pool Strategy
   * Creates new SimplePool for each query, bypassing persistent connections
   */
  async queryUserWorkouts(
    hexPubkey: string, 
    options: DirectQueryOptions
  ): Promise<DirectQueryResult> {
    const startTime = Date.now();
    
    console.log(`🔥 DirectNostrQueryService: Starting FRESH POOL query for pubkey ${hexPubkey.slice(0, 12)}...`);
    console.log(`📋 Query options:`, {
      limit: options.limit || 50,
      since: options.since ? new Date(options.since * 1000).toISOString() : 'none',
      until: options.until ? new Date(options.until * 1000).toISOString() : 'none',
      useBackupRelays: options.useBackupRelays || false
    });

    // Validate hex pubkey format
    if (!this.isValidHexPubkey(hexPubkey)) {
      return {
        success: false,
        workouts: [],
        eventsFound: 0,
        relaysResponded: 0,
        totalQueryTime: Date.now() - startTime,
        errors: [`Invalid hex pubkey format: ${hexPubkey.slice(0, 12)}...`]
      };
    }

    // Select relay URLs
    const relayUrls = options.useBackupRelays 
      ? [...PRIMARY_RELAY_URLS, ...BACKUP_RELAY_URLS]
      : PRIMARY_RELAY_URLS;

    console.log(`📡 Using ${relayUrls.length} relays:`, relayUrls.map(url => url.replace('wss://', '')));

    // Try primary query first, then fallback if needed
    let result = await this.executeQueryWithFreshPool(hexPubkey, relayUrls, options, startTime);
    
    // If primary query failed and we haven't tried backup relays, try them
    if (!result.success && !options.useBackupRelays && result.eventsFound === 0) {
      console.log(`⚠️ Primary query failed, trying backup relays...`);
      result = await this.executeQueryWithFreshPool(
        hexPubkey, 
        BACKUP_RELAY_URLS, 
        { ...options, useBackupRelays: true }, 
        startTime
      );
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ DirectNostrQueryService completed: ${result.workouts.length} workouts in ${totalTime}ms`);
    
    return {
      ...result,
      totalQueryTime: totalTime
    };
  }

  /**
   * CORE FRESH POOL EXECUTION - Same pattern as working HTML test
   */
  private async executeQueryWithFreshPool(
    hexPubkey: string,
    relayUrls: string[],
    options: DirectQueryOptions,
    startTime: number
  ): Promise<Omit<DirectQueryResult, 'totalQueryTime'>> {
    
    try {
      // Import nostr-tools dynamically (React Native compatible)
      const NostrTools = require('nostr-tools');
      
      // Create fresh SimplePool instance (key difference from persistent approach)
      const pool = new NostrTools.SimplePool();
      console.log(`🆕 Created fresh SimplePool instance`);

      // Build query filter (same structure as HTML test)
      const queryFilter = {
        authors: [hexPubkey],
        kinds: [1301],
        limit: options.limit || 50,
        ...(options.since && { since: options.since }),
        ...(options.until && { until: options.until }),
      };

      console.log(`🔍 Query filter:`, queryFilter);

      // Execute query with timeout (same timeout strategy as HTML test)
      const timeoutMs = NETWORK_CONFIG!.timeout;
      console.log(`⏱️ Starting query with ${timeoutMs}ms timeout...`);

      const timeoutPromise = new Promise<Event[]>((resolve) => {
        setTimeout(() => {
          console.log(`⏰ Query timeout (${timeoutMs}ms) - returning partial results`);
          resolve([]);
        }, timeoutMs);
      });

      const queryPromise = pool.querySync(relayUrls, queryFilter);
      
      // Race between query and timeout
      const events = await Promise.race([queryPromise, timeoutPromise]);

      console.log(`📥 Fresh pool received ${events.length} raw events from relays`);

      // CRITICAL: Always cleanup pool (prevents resource leaks)
      try {
        pool.close(relayUrls);
        console.log(`🧹 Fresh pool closed successfully`);
      } catch (cleanupError) {
        console.warn(`⚠️ Pool cleanup warning:`, cleanupError);
      }

      // Filter and parse events (same client-side filtering as HTML test)
      const workoutEvents = this.filterWorkoutEvents(events);
      console.log(`🏃‍♂️ Found ${workoutEvents.length} workout events after filtering`);

      // Parse events to workout objects
      const workouts = this.parseEventsToWorkouts(workoutEvents, options.userId);
      console.log(`✅ Parsed ${workouts.length} valid workouts`);

      // Determine success based on actual results
      const success = workouts.length > 0;
      const relaysResponded = success ? relayUrls.length : 0; // Simplified - could be more granular

      return {
        success,
        workouts,
        eventsFound: events.length,
        relaysResponded,
        errors: success ? [] : ['No workout events found - check if you have published kind 1301 events']
      };

    } catch (error) {
      console.error(`❌ Fresh pool query failed:`, error);
      
      return {
        success: false,
        workouts: [],
        eventsFound: 0,
        relaysResponded: 0,
        errors: [`Query execution failed: ${error}`]
      };
    }
  }

  /**
   * ULTRA THINK DEBUG: Show ALL 1301 events - NO FILTERING
   * Temporarily removing all content validation to debug event count discrepancy
   */
  private filterWorkoutEvents(events: Event[]): Event[] {
    console.log(`🔥 ULTRA THINK DEBUG: Processing ${events.length} raw events from relays`);
    
    const filtered1301Events = events.filter(event => {
      if (event.kind !== 1301) {
        return false; // Still filter by kind for safety
      }
      
      // LOG EVERY 1301 EVENT WE FIND
      console.log(`🔥 RAW 1301 EVENT FOUND:`, {
        id: event.id?.slice(0, 8),
        pubkey: event.pubkey?.slice(0, 8),
        created_at: new Date(event.created_at * 1000).toISOString(),
        tags: event.tags?.map(t => t[0]).slice(0, 5),
        contentLength: event.content?.length || 0,
        contentPreview: event.content?.slice(0, 50) || 'no content'
      });
      
      return true; // ACCEPT ALL 1301 EVENTS - NO VALIDATION
    });
    
    console.log(`🔥 ULTRA THINK RESULT: Found ${filtered1301Events.length} kind 1301 events total`);
    return filtered1301Events;
  }

  /**
   * ULTRA THINK DEBUG: Create minimal workout objects from ALL 1301 events - NO PARSING VALIDATION
   * Bypassing NostrWorkoutParser completely to show raw event conversion
   */
  private parseEventsToWorkouts(events: Event[], userId: string): NostrWorkout[] {
    console.log(`🔥 ULTRA THINK PARSING: Converting ${events.length} 1301 events to workout objects`);
    
    const workouts: NostrWorkout[] = [];
    
    for (const event of events) {
      try {
        // CREATE MINIMAL WORKOUT OBJECT FROM RAW EVENT - NO VALIDATION
        const workout: NostrWorkout = {
          id: event.id || `event-${Date.now()}-${Math.random()}`,
          userId,
          type: 'running', // Default type - doesn't matter for count debugging
          startTime: new Date(event.created_at * 1000).toISOString(),
          duration: 1800, // Default 30 min - doesn't matter for count debugging
          distance: 5000, // Default 5km - doesn't matter for count debugging
          calories: 300, // Default - doesn't matter for count debugging
          source: 'nostr',
          nostrEventId: event.id,
          tags: event.tags || [],
          content: event.content || '',
          rawEvent: event
        };
        
        workouts.push(workout);
        
        console.log(`🔥 RAW EVENT CONVERTED: ${event.id?.slice(0, 8)} → workout object`);
      } catch (error) {
        console.error(`❌ Failed to create minimal workout for event ${event.id}:`, error);
      }
    }
    
    console.log(`🔥 ULTRA THINK PARSE RESULT: Created ${workouts.length} workout objects from ${events.length} events`);
    
    // Sort by timestamp (newest first)
    workouts.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    
    return workouts;
  }

  /**
   * Validate hex pubkey format
   */
  private isValidHexPubkey(pubkey: string): boolean {
    return /^[0-9a-fA-F]{64}$/.test(pubkey);
  }

  /**
   * Convert npub to hex if needed (for convenience)
   */
  async ensureHexPubkey(pubkeyInput: string): Promise<string> {
    if (this.isValidHexPubkey(pubkeyInput)) {
      return pubkeyInput;
    }

    if (pubkeyInput.startsWith('npub1')) {
      try {
        const { nip19 } = await import('nostr-tools');
        const decoded = nip19.decode(pubkeyInput);
        const hex = decoded.data as string;
        
        console.log(`🔄 Converted npub to hex: ${pubkeyInput.slice(0, 20)}... → ${hex.slice(0, 12)}...`);
        return hex;
      } catch (error) {
        throw new Error(`Failed to convert npub to hex: ${error}`);
      }
    }

    throw new Error(`Invalid pubkey format: ${pubkeyInput}`);
  }

  /**
   * Get workouts with retry logic for unreliable networks
   */
  async queryUserWorkoutsWithRetry(
    pubkeyInput: string,
    options: DirectQueryOptions
  ): Promise<DirectQueryResult> {
    const maxRetries = NETWORK_CONFIG!.maxRetries;
    const retryDelay = NETWORK_CONFIG!.retryDelay;
    
    // Ensure hex format
    const hexPubkey = await this.ensureHexPubkey(pubkeyInput);
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Query attempt ${attempt + 1}/${maxRetries + 1}`);
      
      const result = await this.queryUserWorkouts(hexPubkey, {
        ...options,
        useBackupRelays: attempt > 0 // Use backup relays on retry
      });
      
      // Return immediately if successful
      if (result.success || result.workouts.length > 0) {
        return result;
      }
      
      // Wait before retry (except on final attempt)
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // All attempts failed
    return {
      success: false,
      workouts: [],
      eventsFound: 0,
      relaysResponded: 0,
      totalQueryTime: 0,
      errors: [`Failed after ${maxRetries + 1} attempts - network or relay issues`]
    };
  }
}

// Export singleton instance
export default DirectNostrQueryService.getInstance();