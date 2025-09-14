/**
 * SimpleNostrService - React Native Optimized Nostr Team Discovery
 * 
 * PROBLEM SOLVED: React Native WebSocket drops 85% of events vs Node.js
 * SOLUTION: SimplePool + timeout-based queries + multi-time-range strategy
 * 
 * Key React Native Fixes:
 * - Use SimplePool instead of individual Relay connections
 * - NEVER close on EOSE (events arrive AFTER EOSE in React Native)
 * - Multiple time ranges handle weird team timestamps (future dates!)
 * - Sequential processing prevents buffer overflow
 * - Delays between operations give React Native breathing room
 */

import { SimplePool, type Event, type Filter } from 'nostr-tools';
import type { NostrTeam, NostrTeamEvent, TeamDiscoveryFilters } from './NostrTeamService';

export interface SimpleQueryResult {
  success: boolean;
  events: Event[];
  totalEventsFound: number;
  relaysResponded: number;
  method: string;
  queryTime: number;
}

export class SimpleNostrService {
  private static instance: SimpleNostrService;
  private pool: SimplePool;
  
  // EXACT RELAY LIST: Match working Node.js test script exactly
  private relayUrls = [
    'wss://relay.damus.io',
    'wss://nos.lol', 
    'wss://relay.primal.net',
    'wss://nostr.wine'
  ];

  private constructor() {
    this.pool = new SimplePool();
    console.log('🚀 SimpleNostrService: Initialized with React Native WebSocket optimizations');
  }

  static getInstance(): SimpleNostrService {
    if (!SimpleNostrService.instance) {
      SimpleNostrService.instance = new SimpleNostrService();
    }
    return SimpleNostrService.instance;
  }

  /**
   * MAIN DISCOVERY METHOD: React Native Multi-Time-Range Strategy
   * This replicates the successful Phase 2 approach that found RUNSTR and Pleb Walkstr
   */
  async discoverFitnessTeams(filters?: TeamDiscoveryFilters): Promise<NostrTeam[]> {
    const timestamp = new Date().toISOString();
    console.log(`🟢🟢🟢 SIMPLE ENHANCED SERVICE ACTIVE ${timestamp} 🟢🟢🟢`);
    console.log('🎯🎯🎯 SIMPLEPOOL STRATEGY RUNNING - PROVEN PHASE 2 APPROACH 🎯🎯🎯');
    console.log('📊 React Native Multi-Time-Range Team Discovery Starting...');

    const startTime = Date.now();
    const allEvents: Event[] = [];
    const processedEventIds = new Set<string>();
    const teams: NostrTeam[] = [];

    try {
      // COMPREHENSIVE FILTER STRATEGY (senior developer fix)
      console.log('🚀 COMPREHENSIVE STRATEGY: Multi-time-range + Nuclear + Filter variations');
      
      // Strategy 1: Multi-time-range (previous approach)
      const timeRangeResult = await this.executeMultiTimeRangeStrategy(allEvents, processedEventIds);
      console.log(`📊 Time-range strategy: ${timeRangeResult.totalEventsFound} events`);
      
      // Strategy 2: Nuclear strategy (no time filters)
      const nuclearResult = await this.executeNuclearStrategy(allEvents, processedEventIds);
      console.log(`🚀 Nuclear strategy found ${nuclearResult.totalEventsFound} additional events`);
      
      // Strategy 3: Filter variations (senior developer suggestion)
      const variationResult = await this.executeFilterVariations(allEvents, processedEventIds);
      console.log(`🔄 Filter variations found ${variationResult.totalEventsFound} additional events`);

      // Process all collected events into teams
      console.log(`📊 Processing ${allEvents.length} total events into teams...`);
      
      for (const event of allEvents) {
        if (processedEventIds.has(event.id)) continue;
        processedEventIds.add(event.id);

        try {
          const team = this.parseTeamEvent(event as NostrTeamEvent);
          if (!team) continue;

          // Apply Phase 2's permissive validation (don't over-filter)
          if (!this.isTeamPublic(event as NostrTeamEvent)) continue;
          
          const validationResult = this.validateTeam(team, event as NostrTeamEvent);
          if (!validationResult.isValid) {
            console.log(`⚠️  Team filtered (${validationResult.reason}): ${team.name}`);
            continue;
          }

          teams.push(team);
          console.log(`✅ TEAM ADDED: ${team.name} (${team.memberCount} members)`);
          
        } catch (error) {
          console.warn(`⚠️ Error processing event ${event.id}:`, error);
        }
      }

      const queryTime = Date.now() - startTime;
      console.log(`🚀🚀🚀 SIMPLE ENHANCED RESULT: Found ${teams.length} fitness teams in ${queryTime}ms`);
      console.log(`📊 SIMPLE PERFORMANCE METRICS:`);
      console.log(`   Total Events Collected: ${allEvents.length}`);
      console.log(`   Unique Events Processed: ${processedEventIds.size}`);
      console.log(`   Teams After Validation: ${teams.length}`);

      if (teams.length > 0) {
        console.log('📋 Teams discovered:');
        teams.forEach((team, index) => {
          console.log(`  ${index + 1}. ${team.name} (${team.memberCount} members)`);
        });
      }

      return teams.sort((a, b) => b.createdAt - a.createdAt);

    } catch (error) {
      console.error('❌ SimpleNostrService: Error discovering teams:', error);
      return [];
    }
  }

  /**
   * Multi-Time-Range Strategy (Phase 2 Breakthrough Approach)
   * This found RUNSTR and Pleb Walkstr by querying multiple time ranges
   */
  private async executeMultiTimeRangeStrategy(
    allEvents: Event[], 
    processedEventIds: Set<string>
  ): Promise<SimpleQueryResult> {
    console.log('🎯 PHASE 2 STRATEGY: Multi-time-range queries (proven to find missing teams)');
    
    const now = Math.floor(Date.now() / 1000);
    const day = 24 * 60 * 60;
    
    // Proven time ranges from Phase 2 that found RUNSTR and Pleb Walkstr
    const timeRanges = [
      { name: 'Recent (0-7 days)', since: now - (7 * day), until: now, limit: 50 },
      { name: 'Week old (7-14 days)', since: now - (14 * day), until: now - (7 * day), limit: 50 },
      { name: 'Month old (14-30 days)', since: now - (30 * day), until: now - (14 * day), limit: 50 },
      { name: 'Older (30-90 days)', since: now - (90 * day), until: now - (30 * day), limit: 50 },
      { name: 'Future Events (2025)', since: now, until: now + (6 * 30 * day), limit: 50 }, // KEY: Teams with future dates!
      { name: 'Deep Historical', since: 0, until: now - (90 * day), limit: 50 }
    ];

    let totalEventsFound = 0;
    const startTime = Date.now();

    for (const timeRange of timeRanges) {
      console.log(`🕒 Querying ${timeRange.name}...`);
      
      const filter: Filter = {
        kinds: [33404], // CORRECTED: Using 33404 for actual team events (not 33402 workout templates)
        limit: timeRange.limit,
        since: timeRange.since,
        until: timeRange.until
      };

      const rangeEvents = await this.queryWithSimplePool(filter, timeRange.name);
      
      // Add unique events
      for (const event of rangeEvents) {
        if (!processedEventIds.has(event.id)) {
          allEvents.push(event);
          processedEventIds.add(event.id);
          totalEventsFound++;
        }
      }

      console.log(`   ${timeRange.name}: ${rangeEvents.length} events (${totalEventsFound} total unique)`);
      
      // React Native breathing room
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      success: totalEventsFound > 0,
      events: allEvents,
      totalEventsFound,
      relaysResponded: this.relayUrls.length,
      method: 'multi-time-range',
      queryTime: Date.now() - startTime
    };
  }

  /**
   * Nuclear Strategy - No Time Filters (Exact Node.js Script Replica)
   */
  private async executeNuclearStrategy(
    allEvents: Event[], 
    processedEventIds: Set<string>
  ): Promise<SimpleQueryResult> {
    console.log('🚀 NUCLEAR STRATEGY: No time filters - exact replica of working Node.js script');
    
    const startTime = Date.now();
    let totalEventsFound = 0;

    // EXACT REPLICA: Single nuclear query with limit 100 (exactly like working Node.js test)
    console.log(`🚀 Nuclear query with limit: 100 (exact Node.js replica)`);
    
    const filter: Filter = {
      kinds: [33404], // CORRECTED: Using 33404 for actual team events (not 33402 workout templates)
      limit: 100
      // NO time filters - exactly like working Node.js script
    };

    const nuclearEvents = await this.queryWithSimplePool(filter, 'nuclear-100');
    
    // Add unique events
    for (const event of nuclearEvents) {
      if (!processedEventIds.has(event.id)) {
        allEvents.push(event);
        processedEventIds.add(event.id);
        totalEventsFound++;
      }
    }

    console.log(`   Nuclear 100: ${nuclearEvents.length} events (${totalEventsFound} total unique)`);

    return {
      success: totalEventsFound > 0,
      events: allEvents,
      totalEventsFound,
      relaysResponded: this.relayUrls.length,
      method: 'nuclear',
      queryTime: Date.now() - startTime
    };
  }

  /**
   * Core SimplePool Query with React Native Optimizations
   * KEY: Never close on EOSE - wait for full timeout!
   */
  private async queryWithSimplePool(filter: Filter, strategy: string): Promise<Event[]> {
    const events: Event[] = [];
    const timeout = 10000; // 10 second timeout
    
    return new Promise((resolve) => {
      console.log(`📡 SimplePool query: ${strategy}`);
      
      const sub = this.pool.subscribeMany(
        this.relayUrls,
        [filter],
        {
          onevent: (event: Event) => {
            // COMPREHENSIVE EVENT LOGGING (senior developer fix)
            console.log(`📥 RAW EVENT RECEIVED:`, {
              id: event.id.substring(0, 8),
              kind: event.kind,  // THIS IS KEY - see what kinds we're getting
              tags: event.tags?.slice(0, 3), // Show first 3 tags
              content: event.content?.substring(0, 50),
              pubkey: event.pubkey?.substring(0, 8),
              created_at: new Date(event.created_at * 1000).toISOString()
            });
            events.push(event);
            console.log(`📊 Event ${events.length} collected via ${strategy}`);
          },
          oneose: () => {
            // 🔑 CRITICAL: NEVER close on EOSE in React Native!
            // Events arrive AFTER EOSE - this was the Phase 2 breakthrough!
            console.log(`📨 EOSE received for ${strategy} - ${events.length} events so far - continuing to wait...`);
          }
        }
      );

      // Wait full timeout regardless of EOSE (Phase 2 proven approach)
      setTimeout(() => {
        console.log(`⏰ ${strategy} timeout complete: ${events.length} events collected`);
        sub.close();
        resolve(events);
      }, timeout);
    });
  }

  /**
   * Team parsing logic (preserved from working implementation)
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
      };
    } catch (error) {
      console.warn('Error parsing team event:', error);
      return null;
    }
  }

  /**
   * Public team check (preserved logic)
   */
  private isTeamPublic(event: NostrTeamEvent): boolean {
    const publicTag = event.tags.find((tag) => tag[0] === 'public');
    return publicTag ? publicTag[1]?.toLowerCase() === 'true' : false;
  }

  /**
   * Permissive validation (Phase 2 approach - don't over-filter!)
   */
  private validateTeam(team: NostrTeam, event: NostrTeamEvent): { isValid: boolean; reason: string | null } {
    // Must have a valid name
    if (!team.name || team.name.trim() === '') {
      return { isValid: false, reason: 'empty_name' };
    }
    
    // Filter only obvious deleted/test teams (Phase 2 permissive approach)
    const name = team.name.toLowerCase();
    if (name === 'deleted' || name === 'test' || name.startsWith('test ')) {
      return { isValid: false, reason: 'test_or_deleted' };
    }

    // Allow teams without descriptions (Phase 2 learning)
    // Allow old teams (Phase 2 learning - removed 90-day restriction)
    
    return { isValid: true, reason: null };
  }

  /**
   * Filter Variations Strategy (Senior Developer Fix)
   * Tests multiple event kinds and tag combinations
   */
  private async executeFilterVariations(
    allEvents: Event[], 
    processedEventIds: Set<string>
  ): Promise<SimpleQueryResult> {
    console.log('🔄 FILTER VARIATIONS: Testing multiple event kinds and tag patterns');
    
    const startTime = Date.now();
    let totalEventsFound = 0;

    // SENIOR DEVELOPER SUGGESTED FILTER VARIATIONS - CORRECTED TO USE 33404
    const filterVariations = [
      { kinds: [33404], "#d": ["leaderboard:runblitz:2024"] },  // Teams with tag filter
      { kinds: [33404], limit: 100 },  // Teams without tag filter (most important)
      { kinds: [30003], limit: 50 },   // Old team format
      { kinds: [30003, 33404], "#d": ["leaderboard:runblitz:2024"] }, // Both old and new with tag
      { kinds: [30003, 33404], limit: 75 }, // Both old and new without tag
      { limit: 20 }  // ANY events (simplest test)
    ];

    for (const [index, filter] of filterVariations.entries()) {
      const strategyName = `variation-${index + 1}`;
      console.log(`🔄 Testing filter variation ${index + 1}:`, filter);
      
      const variationEvents = await this.queryWithSimplePool(filter, strategyName);
      
      // Add unique events
      for (const event of variationEvents) {
        if (!processedEventIds.has(event.id)) {
          allEvents.push(event);
          processedEventIds.add(event.id);
          totalEventsFound++;
        }
      }

      console.log(`   Variation ${index + 1}: ${variationEvents.length} events (${totalEventsFound} total unique)`);
      
      // React Native breathing room between variations
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return {
      success: totalEventsFound > 0,
      events: allEvents,
      totalEventsFound,
      relaysResponded: this.relayUrls.length,
      method: 'filter-variations',
      queryTime: Date.now() - startTime
    };
  }

  /**
   * Direct Relay Testing Function (Senior Developer Suggestion)
   * Test each relay individually to isolate issues
   */
  async testRelaysDirectly(): Promise<void> {
    console.log('🧪🧪🧪 DIRECT RELAY TESTING (senior developer diagnostic) 🧪🧪🧪');
    
    for (const relay of this.relayUrls) {
      console.log(`\n🔍 Testing ${relay} directly...`);
      
      try {
        // Test 1: Basic connectivity
        console.log(`1. Testing basic connectivity...`);
        const connectTest = await this.testRelayConnectivity(relay);
        console.log(`   Connectivity: ${connectTest ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        if (!connectTest) continue;
        
        // Test 2: Any events query
        console.log(`2. Testing any events query...`);
        const anyEvents = await this.pool.querySync(
          [relay],
          { limit: 5 }  // Get ANY 5 events
        );
        console.log(`   Any events: ${anyEvents.length} found`);
        
        // Test 3: Team events query (33404)
        console.log(`3. Testing team events (33404)...`);
        const teamEvents = await this.pool.querySync(
          [relay],
          { kinds: [33404], limit: 10 }
        );
        console.log(`   Team events (33404): ${teamEvents.length} found`);
        
        // Test 4: Old team events query (30003)
        console.log(`4. Testing old team events (30003)...`);
        const oldTeamEvents = await this.pool.querySync(
          [relay],
          { kinds: [30003], limit: 10 }
        );
        console.log(`   Old team events (30003): ${oldTeamEvents.length} found`);
        
        // Test 5: Workout events query (1301)
        console.log(`5. Testing workout events (1301)...`);
        const workoutEvents = await this.pool.querySync(
          [relay],
          { kinds: [1301], limit: 10 }
        );
        console.log(`   Workout events (1301): ${workoutEvents.length} found`);
        
        // Show sample events if found
        if (anyEvents.length > 0) {
          console.log(`   Sample event kinds from ${relay}:`, 
            anyEvents.map(e => e.kind).join(', '));
        }
        
      } catch (error) {
        console.error(`❌ Direct test failed for ${relay}:`, error);
      }
      
      // Breathing room between relay tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🧪 Direct relay testing complete');
  }

  /**
   * Test basic connectivity to a relay
   */
  private async testRelayConnectivity(relayUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(relayUrl);
        let resolved = false;
        
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            ws.close();
            resolve(false);
          }
        }, 3000);
        
        ws.onopen = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          }
        };
        
        ws.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
        };
        
      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.pool.close(this.relayUrls);
    console.log('🧹 SimpleNostrService: Cleanup completed');
  }
}

// Export both class and default export for React Native compatibility
export default SimpleNostrService;