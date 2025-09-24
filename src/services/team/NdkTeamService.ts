/**
 * NdkTeamService - Ultra-Fast Global Team Discovery
 * 
 * BASED ON: Proven Zap-Arena NDK patterns (113 workouts in 479ms)
 * APPROACH: Global team discovery - ALL 33404 events, ALL time, ANY author
 * 
 * Key Differences from Workout Discovery:
 * - NO author filters (want teams from everyone)
 * - NO time filters (want teams from all time)
 * - Global discovery vs user-specific data
 * 
 * Proven NDK Patterns Applied:
 * - NDK singleton with 30s connection timeouts
 * - Subscription-based fetching with timeout racing
 * - Fast relay selection based on performance metrics
 * - React Native optimizations with breathing room delays
 * - Comprehensive logging for debugging team discovery
 */

import NDK, { NDKEvent, NDKFilter, NDKSubscription, NDKRelay } from '@nostr-dev-kit/ndk';
import type { NostrTeam, NostrTeamEvent, TeamDiscoveryFilters } from '../nostr/NostrTeamService';

export interface NdkTeamQueryResult {
  success: boolean;
  events: NDKEvent[];
  totalEventsFound: number;
  teamsParsed: number;
  relaysResponded: number;
  method: string;
  queryTime: number;
  subscriptionStats?: {
    subscriptionsCreated: number;
    eventsReceived: number;
    timeoutsCaught: number;
  };
}

// Global NDK instance following Zap-Arena singleton pattern
const g = globalThis as any;

export class NdkTeamService {
  private static instance: NdkTeamService;
  private ndk!: NDK;
  private isReady: boolean = false;
  private readyPromise!: Promise<boolean>;
  
  // Relay list optimized for team events based on proven patterns
  private relayUrls = [
    'wss://relay.damus.io',     // Primary: Most teams found here
    'wss://nos.lol', 
    'wss://relay.primal.net',
    'wss://nostr.wine',
    'wss://relay.nostr.band',
    'wss://relay.snort.social',
    'wss://nostr-pub.wellorder.net'
  ];

  private constructor() {
    console.log('🚀 NdkTeamService: Initializing with Zap-Arena proven patterns for GLOBAL team discovery');
    this.initializeNDK();
  }

  static getInstance(): NdkTeamService {
    if (!NdkTeamService.instance) {
      NdkTeamService.instance = new NdkTeamService();
    }
    return NdkTeamService.instance;
  }

  /**
   * Initialize NDK singleton following Zap-Arena global instance pattern
   */
  private initializeNDK(): void {
    if (!g.__RUNSTR_NDK_INSTANCE__) {
      console.log('[NDK Singleton] Creating new NDK instance for global team discovery...');
      
      this.ndk = new NDK({
        explicitRelayUrls: this.relayUrls,
        // Remove debug flag - not available in React Native/Hermes runtime
      });
      
      g.__RUNSTR_NDK_INSTANCE__ = this.ndk;
      
      // Initialize connection promise following Zap-Arena pattern
      this.readyPromise = this.connectWithTimeout();
      g.__RUNSTR_NDK_READY_PROMISE__ = this.readyPromise;
    } else {
      console.log('[NDK Singleton] Reusing existing NDK instance for teams.');
      this.ndk = g.__RUNSTR_NDK_INSTANCE__;
      this.readyPromise = g.__RUNSTR_NDK_READY_PROMISE__ || this.connectWithTimeout();
    }
  }

  /**
   * Connect to NDK with timeout (Zap-Arena pattern: 30s timeout)
   */
  private async connectWithTimeout(): Promise<boolean> {
    try {
      const connectTimeoutMs = 2000; // 2 second timeout for faster initial load
      console.log(`[NDK Team] Attempting NDK.connect() with timeout: ${connectTimeoutMs}ms`);
      console.log(`[NDK Team] Using relays:`, this.relayUrls);
      
      await this.ndk.connect(connectTimeoutMs);
      
      const connectedCount = this.ndk.pool?.stats()?.connected || 0;
      console.log(`[NDK Team] NDK.connect() completed. Connected relays: ${connectedCount}`);
      console.log(`[NDK Team] Pool stats:`, this.ndk.pool?.stats());

      if (connectedCount > 0) {
        console.log('[NDK Team] NDK is ready for global team discovery.');
        this.isReady = true;
        return true;
      } else {
        console.error('[NDK Team] No relays connected after NDK.connect()');
        throw new Error('Failed to connect to any relays for team discovery.');
      }
    } catch (err) {
      console.error('[NDK Team] Error during NDK connection:', err);
      this.isReady = false;
      return false;
    }
  }

  /**
   * Wait for NDK to be ready with timeout racing (Zap-Arena pattern)
   */
  private async awaitNDKReady(timeoutMs: number = 2000): Promise<boolean> {  // 2 second timeout for faster response
    try {
      const ready = await Promise.race([
        this.readyPromise,
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
      ]);
      
      if (!ready) {
        throw new Error('NDK failed to become ready within timeout for team discovery');
      }
      return true;
    } catch (err) {
      console.error('[NDK Team] awaitNDKReady error:', err);
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
      console.log(`[NDK Team] Using fastest relays for 33404 discovery:`, finalRelays);
      return finalRelays;
    } catch (err) {
      console.warn('[NDK Team] Error getting fastest relays:', err);
      return this.relayUrls.slice(0, count);
    }
  }

  /**
   * MAIN DISCOVERY METHOD: Global NDK team discovery
   * ULTRA-SIMPLE: Find ALL 33404 events from ALL time from ANY author
   */
  async discoverAllTeams(filters?: TeamDiscoveryFilters): Promise<NostrTeam[]> {
    const timestamp = new Date().toISOString();
    console.log(`🟢🟢🟢 NDK TEAM SERVICE ACTIVE ${timestamp} 🟢🟢🟢`);
    console.log('🌍🌍🌍 GLOBAL TEAM DISCOVERY - ALL 33404 EVENTS, ALL TIME 🌍🌍🌍');
    console.log('📊 NDK Global Team Discovery Starting...');

    // Wait for NDK to be ready
    const isReady = await this.awaitNDKReady(5000);
    if (!isReady) {
      console.error('❌ NDK not ready for team discovery');
      return [];
    }

    const startTime = Date.now();
    const allEvents: NDKEvent[] = [];
    const collectionEventIds = new Set<string>(); // For deduplicating during collection
    const processedEventIds = new Set<string>(); // For tracking processing (starts empty)
    const teams: NostrTeam[] = [];
    let subscriptionStats = {
      subscriptionsCreated: 0,
      eventsReceived: 0,
      timeoutsCaught: 0
    };

    try {
      // ULTRA-SIMPLE STRATEGY: Global team discovery
      const globalResult = await this.executeGlobalTeamDiscovery(
        allEvents, 
        collectionEventIds, // Use separate set for collection
        subscriptionStats
      );
      
      console.log(`📊 Global discovery found ${globalResult.totalEventsFound} raw 33404 events`);

      // SIMPLIFIED: Convert collected events to basic teams with minimal filtering
      console.log(`📊 SIMPLIFIED PROCESSING: Converting all ${allEvents.length} events to teams, filtering "Deleted" and duplicates`);
      
      const seenTeamNames = new Set<string>(); // Track team names to prevent duplicates
      
      for (const ndkEvent of allEvents) {
        try {
          // Extract basic info directly from NDK event
          const nameTag = ndkEvent.tags?.find((tag: any) => tag[0] === 'name');
          const teamName = nameTag?.[1] || 'Unnamed Team';
          
          // Filter 1: Skip "Deleted" teams
          if (teamName.toLowerCase() === 'deleted') {
            console.log(`🗑️ SKIPPING DELETED TEAM: ${teamName} (ID: ${ndkEvent.id?.slice(0, 8)})`);
            continue;
          }
          
          // Filter 2: Skip duplicate team names (keep first occurrence)
          const teamNameLower = teamName.toLowerCase();
          if (seenTeamNames.has(teamNameLower)) {
            console.log(`🔄 SKIPPING DUPLICATE TEAM: "${teamName}" (ID: ${ndkEvent.id?.slice(0, 8)})`);
            continue;
          }
          seenTeamNames.add(teamNameLower);
          
          const captainTag = ndkEvent.tags?.find((tag: any) => tag[0] === 'captain');
          const captainId = captainTag?.[1] || ndkEvent.pubkey || 'unknown';
          
          const dTag = ndkEvent.tags?.find((tag: any) => tag[0] === 'd');
          const teamId = dTag?.[1] || ndkEvent.id || 'unknown';

          // Extract charity ID from tags
          const charityTag = ndkEvent.tags?.find((tag: any) => tag[0] === 'charity');
          const charityId = charityTag?.[1] || undefined;

          // Create minimal team object
          const simpleTeam: NostrTeam = {
            id: teamId,
            name: teamName,
            description: ndkEvent.content || '',
            captain: captainId, // Add captain field
            captainId: captainId,
            captainNpub: captainId, // For compatibility
            memberCount: 1, // Default
            isPublic: true, // Default - show everything else
            activityType: 'general',
            charityId: charityId, // Include charity ID if present
            tags: [],
            createdAt: ndkEvent.created_at || Math.floor(Date.now() / 1000),
            nostrEvent: this.convertNdkEventToStandard(ndkEvent), // Add nostrEvent using correct method name
            hasListSupport: false, // Default
            memberListId: undefined, // Default
          };

          teams.push(simpleTeam);
          console.log(`✅ SIMPLE TEAM ADDED: "${teamName}" (ID: ${teamId.slice(0, 8)}) - ${ndkEvent.content?.slice(0, 50) || 'No description'}`);
          
        } catch (error) {
          console.warn(`⚠️ Error creating simple team from event ${ndkEvent.id}:`, error);
        }
      }

      const queryTime = Date.now() - startTime;
      console.log(`🚀🚀🚀 NDK TEAM RESULT: Found ${teams.length} teams in ${queryTime}ms`);
      console.log(`📊 NDK TEAM PERFORMANCE METRICS:`);
      console.log(`   Total NDK Events Collected: ${allEvents.length}`);
      console.log(`   Unique Events Processed: ${processedEventIds.size}`);
      console.log(`   Valid Teams After Processing: ${teams.length}`);
      console.log(`   Subscriptions Created: ${subscriptionStats.subscriptionsCreated}`);
      console.log(`   Events Received via Subscriptions: ${subscriptionStats.eventsReceived}`);
      console.log(`   Timeouts Caught: ${subscriptionStats.timeoutsCaught}`);

      if (teams.length > 0) {
        console.log('📋 NDK Team summary:');
        teams.forEach((team, index) => {
          console.log(`  ${index + 1}. ${team.name} (${team.memberCount} members) - ${team.activityType}`);
        });

        // Show date range
        const dates = teams.map(t => t.createdAt * 1000).sort();
        const oldest = new Date(dates[0]);
        const newest = new Date(dates[dates.length - 1]);
        console.log(`📅 NDK Date range: ${oldest.toDateString()} → ${newest.toDateString()}`);
      }

      return teams.sort((a, b) => b.createdAt - a.createdAt);

    } catch (error) {
      console.error('❌ NdkTeamService: Error discovering teams:', error);
      return [];
    }
  }

  /**
   * Global Team Discovery Strategy - ULTRA SIMPLE
   * Find ALL 33404 events from ALL time from ANY author
   */
  private async executeGlobalTeamDiscovery(
    allEvents: NDKEvent[], 
    processedEventIds: Set<string>,
    subscriptionStats: any
  ): Promise<NdkTeamQueryResult> {
    console.log('🌍 NDK GLOBAL STRATEGY: All 33404 team events from all time');
    
    const startTime = Date.now();
    let totalEventsFound = 0;

    // ULTRA-SIMPLE FILTER: Just kind 33404 with large limit
    const limits = [500, 1000]; // Try multiple limits to catch all teams
    
    for (const limit of limits) {
      console.log(`🌍 NDK Global team subscription with limit: ${limit}`);
      
      const filter: NDKFilter = {
        kinds: [33404 as any],    // Fitness teams (cast to any for NDK compatibility)
        limit: limit              // Large limit to get all teams
        // NO authors - want teams from everyone
        // NO time filters - want teams from all time
      };

      const globalEvents = await this.subscribeWithNdk(filter, `global-${limit}`, subscriptionStats);
      
      // Add unique events
      for (const event of globalEvents) {
        if (!processedEventIds.has(event.id)) {
          allEvents.push(event);
          processedEventIds.add(event.id);
          totalEventsFound++;
        }
      }

      console.log(`   NDK Global ${limit}: ${globalEvents.length} events (${totalEventsFound} total unique)`);
      
      // React Native breathing room between attempts
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return {
      success: totalEventsFound > 0,
      events: allEvents,
      totalEventsFound,
      teamsParsed: 0, // Will be calculated later
      relaysResponded: this.relayUrls.length,
      method: 'ndk-global',
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
    const timeout = 2000; // 2 second timeout for faster team discovery
    
    return new Promise((resolve) => {
      console.log(`📡 NDK subscription: ${strategy}`);
      
      // Enhanced logging for debug
      console.log(`🔍 NDK FILTER DEBUG:`, {
        kinds: filter.kinds,
        limit: filter.limit,
        // NO authors or time filters for global discovery
      });
      
      // Get fastest relays for this subscription
      const fastRelays = this.getFastestRelays(4);
      
      // Create subscription with fast relays
      const subscription: NDKSubscription = this.ndk.subscribe(
        filter,
        { 
          closeOnEose: false // CRITICAL: Keep subscription open (Zap-Arena pattern)
          // Note: Using relaySet would be the correct NDK way, but keeping simple for now
        }
      );
      
      subscriptionStats.subscriptionsCreated++;
      
      subscription.on('event', (event: NDKEvent) => {
        // COMPREHENSIVE EVENT LOGGING
        console.log(`📥 NDK RAW 33404 EVENT RECEIVED:`, {
          id: event.id.substring(0, 8),
          kind: event.kind,
          tags: event.tags?.slice(0, 5),
          content: event.content?.substring(0, 50),
          pubkey: event.pubkey?.substring(0, 8),
          created_at: new Date((event.created_at || 0) * 1000).toISOString()
        });
        
        // Additional client-side filtering for team events
        if (event.kind === 33404) {
          const hasTeamTags = event.tags?.some(tag => 
            ['name', 'captain', 'd', 'public', 'member'].includes(tag[0])
          );
          if (hasTeamTags) {
            events.push(event);
            subscriptionStats.eventsReceived++;
            console.log(`✅ NDK Valid Team Event ${events.length}: ${event.id?.slice(0, 8)} via ${strategy}`);
          } else {
            console.log(`⚠️ NDK 33404 event missing team tags: ${event.id?.slice(0, 8)}`);
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
        console.log(`⏰ NDK ${strategy} timeout complete: ${events.length} team events collected`);
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
   * Parse Kind 33404 Nostr event into NostrTeam object
   * (Reuse existing parsing logic from NostrTeamService)
   */
  private parseTeamEvent(event: NostrTeamEvent): NostrTeam | null {
    try {
      const tags = new Map(event.tags.map((tag) => [tag[0], tag.slice(1)]));
      
      const name = tags.get('name')?.[0] || 'Unnamed Team';
      const captain = tags.get('captain')?.[0] || event.pubkey;
      const teamUUID = tags.get('d')?.[0];
      
      const memberTags = event.tags.filter((tag) => tag[0] === 'member');
      const memberCount = memberTags.length + 1; // +1 for captain
      
      const activityTags = event.tags.filter((tag) => tag[0] === 't');
      const activityTypes = activityTags.map((tag) => tag[1]).filter(Boolean);

      // Get charity ID from tags
      const charityId = tags.get('charity')?.[0];

      return {
        id: `${captain}:${teamUUID || event.id}`,
        name,
        description: event.content || '',
        captain: captain, // Add captain field with hex pubkey
        captainId: captain,
        captainNpub: captain,
        memberCount,
        activityType: activityTypes.join(', ') || 'fitness',
        location: tags.get('location')?.[0],
        isPublic: tags.get('public')?.[0]?.toLowerCase() === 'true',
        createdAt: event.created_at,
        tags: activityTypes,
        nostrEvent: event,
        hasListSupport: tags.get('list_support')?.[0] === 'true',
        memberListId: tags.get('member_list')?.[0] || teamUUID,
        charityId: charityId,
      };
    } catch (error) {
      console.warn('Error parsing team event:', error);
      return null;
    }
  }

  /**
   * Very permissive team validation (just filter obvious junk)
   */
  private isValidTeam(team: NostrTeam): boolean {
    // TEMPORARY: Ultra-permissive for debugging - just filter obvious deleted teams
    const name = team.name?.toLowerCase() || '';
    if (name === 'deleted') {
      console.log(`❌ VALIDATION: Team filtered as deleted: ${team.name}`);
      return false;
    }

    // Allow everything else through
    console.log(`✅ VALIDATION: Team passed all checks: ${team.name} (isPublic: ${team.isPublic})`);
    return true;
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
      console.log('🧹 NdkTeamService: Cleanup completed');
    }
  }
}

// Export singleton instance
export default NdkTeamService;