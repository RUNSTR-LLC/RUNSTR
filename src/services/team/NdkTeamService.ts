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

import NDK, {
  NDKEvent,
  NDKFilter,
  NDKSubscription,
  NDKRelay,
} from '@nostr-dev-kit/ndk';
import type {
  NostrTeam,
  NostrTeamEvent,
  TeamDiscoveryFilters,
} from '../nostr/NostrTeamService';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { HARDCODED_TEAMS } from '../../constants/hardcodedTeams';
import { LocalTeamStorageService } from './LocalTeamStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    'wss://relay.damus.io', // Primary: Most teams found here
    'wss://nos.lol',
    'wss://relay.primal.net',
    'wss://relay.snort.social',
    'wss://nostr-pub.wellorder.net',
  ];

  private constructor() {
    console.log(
      '🚀 NdkTeamService: Initializing with Zap-Arena proven patterns for GLOBAL team discovery'
    );
    this.initializeNDK();
  }

  static getInstance(): NdkTeamService {
    if (!NdkTeamService.instance) {
      NdkTeamService.instance = new NdkTeamService();
    }
    return NdkTeamService.instance;
  }

  /**
   * Initialize NDK using GlobalNDKService (optimized singleton)
   */
  private initializeNDK(): void {
    console.log('[NDK Singleton] Using GlobalNDKService for team discovery...');

    // ✅ OPTIMIZATION: Use GlobalNDKService instead of creating separate instance
    // This ensures only ONE NDK instance exists across the entire app
    this.readyPromise = this.connectWithGlobalService();
  }

  /**
   * Connect to NDK using GlobalNDKService
   */
  private async connectWithGlobalService(): Promise<boolean> {
    try {
      console.log(`[NDK Team] Connecting via GlobalNDKService...`);

      // ✅ Get global NDK instance (already connected by GlobalNDKService)
      this.ndk = await GlobalNDKService.getInstance();

      const connectedCount = this.ndk.pool?.stats()?.connected || 0;
      console.log(
        `[NDK Team] GlobalNDK connected. Connected relays: ${connectedCount}`
      );
      console.log(`[NDK Team] Pool stats:`, this.ndk.pool?.stats());

      if (connectedCount > 0) {
        console.log('[NDK Team] NDK is ready for global team discovery.');
        this.isReady = true;
        return true;
      } else {
        console.warn(
          '[NDK Team] No relays connected yet, but NDK instance available'
        );
        this.isReady = true; // Still mark as ready - connections may come later
        return true;
      }
    } catch (err) {
      console.error('[NDK Team] Error getting GlobalNDK:', err);
      this.isReady = false;
      return false;
    }
  }

  /**
   * Wait for NDK to be ready with timeout racing (Zap-Arena pattern)
   * OPTIMIZED: Check if already ready before waiting
   */
  private async awaitNDKReady(timeoutMs: number = 10000): Promise<boolean> {
    // 10 second timeout for GlobalNDK
    try {
      // ✅ OPTIMIZATION: If already initialized, return immediately
      if (this.isReady && this.ndk) {
        console.log('[NDK Team] Already ready, skipping wait');
        return true;
      }

      // ✅ OPTIMIZATION: Check if GlobalNDK is already connected
      const globalStatus = GlobalNDKService.getStatus();
      if (globalStatus.isInitialized && globalStatus.connectedRelays > 0) {
        console.log(
          `[NDK Team] GlobalNDK already connected (${globalStatus.connectedRelays} relays), using immediately`
        );
        this.isReady = true;
        return true;
      }

      console.log('[NDK Team] Waiting for GlobalNDK to connect...');
      const ready = await Promise.race([
        this.readyPromise,
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), timeoutMs)
        ),
      ]);

      if (!ready) {
        throw new Error(
          'NDK failed to become ready within timeout for team discovery'
        );
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
      const metricsStr =
        typeof localStorage !== 'undefined'
          ? localStorage?.getItem('relayPerformance')
          : null;
      if (!metricsStr) return this.relayUrls.slice(0, count);

      const metrics = JSON.parse(metricsStr);
      if (Object.keys(metrics).length === 0)
        return this.relayUrls.slice(0, count);

      // Calculate average response times
      const relayScores = Object.entries(metrics)
        .map(([relay, data]: [string, any]) => {
          const avgTime =
            data.count > 0 ? data.totalTime / data.count : Infinity;
          // Add recency bonus – prefer recently-used relays
          const recencyFactor =
            Date.now() - (data.lastUpdated || 0) < 24 * 60 * 60 * 1000
              ? 0.7
              : 1;
          return { relay, score: avgTime * recencyFactor }; // Lower score is better
        })
        // Only include relays that are in our active list
        .filter((item) => this.relayUrls.includes(item.relay))
        // Sort by score (fastest first)
        .sort((a, b) => a.score - b.score)
        // Take the requested number
        .slice(0, count)
        // Extract just the URLs
        .map((item) => item.relay);

      // Fall back to the first N default relays if we ended up with an empty list
      const finalRelays =
        relayScores.length > 0 ? relayScores : this.relayUrls.slice(0, count);
      console.log(
        `[NDK Team] Using fastest relays for 33404 discovery:`,
        finalRelays
      );
      return finalRelays;
    } catch (err) {
      console.warn('[NDK Team] Error getting fastest relays:', err);
      return this.relayUrls.slice(0, count);
    }
  }

  /**
   * MAIN DISCOVERY METHOD: Returns hardcoded teams (NO Nostr query)
   *
   * PERFORMANCE OPTIMIZATION: Teams are hardcoded to eliminate 4-6 seconds
   * of Nostr queries on app startup. Hardcoded teams are updated weekly.
   */
  async discoverAllTeams(filters?: TeamDiscoveryFilters): Promise<NostrTeam[]> {
    console.log('📋 Using hardcoded teams (no Nostr query)');
    const startTime = Date.now();

    try {
      // Convert hardcoded teams to NostrTeam format
      const teams: NostrTeam[] = HARDCODED_TEAMS.map((hardcodedTeam) => {
        // Extract metadata from raw event tags
        const tags = hardcodedTeam.rawEvent.tags || [];
        const charityTag = tags.find((t: any[]) => t[0] === 'charity');
        const bannerTag = tags.find(
          (t: any[]) => t[0] === 'banner' || t[0] === 'image'
        );
        const shopTag = tags.find((t: any[]) => t[0] === 'shop');
        const flashTag = tags.find((t: any[]) => t[0] === 'flash');
        const aboutTag = tags.find((t: any[]) => t[0] === 'about');

        // Extract description from content or tags
        let description = hardcodedTeam.description;
        if (!description && hardcodedTeam.rawEvent.content) {
          try {
            // Try parsing as JSON
            const parsed = JSON.parse(hardcodedTeam.rawEvent.content);
            description = parsed.about || parsed.description || '';
          } catch {
            // Use plain text content
            description = hardcodedTeam.rawEvent.content;
          }
        }
        if (!description && aboutTag) {
          description = aboutTag[1];
        }

        const nostrTeam: NostrTeam = {
          id: hardcodedTeam.id,
          name: hardcodedTeam.name,
          description: description || '',
          captain: hardcodedTeam.captainHex,
          captainId: hardcodedTeam.captainHex,
          captainNpub: hardcodedTeam.captain,
          memberCount: 1,
          isPublic: true,
          activityType: 'general',
          charityId: charityTag?.[1],
          bannerImage: bannerTag?.[1] || hardcodedTeam.image,
          shopUrl: shopTag?.[1],
          flashUrl: flashTag?.[1],
          tags: [],
          createdAt: hardcodedTeam.createdAt,
          nostrEvent: hardcodedTeam.rawEvent,
          hasListSupport: false,
          memberListId: undefined,
        };

        return nostrTeam;
      });

      // Load locally-created teams from AsyncStorage
      const currentUserNpub = await AsyncStorage.getItem('@runstr:npub');
      let localTeams: NostrTeam[] = [];

      if (currentUserNpub) {
        const localTeamData = await LocalTeamStorageService.getTeamsByCaptain(
          currentUserNpub
        );

        // Convert LocalTeam to NostrTeam format
        localTeams = localTeamData.map((localTeam) => ({
          id: localTeam.id,
          name: localTeam.name,
          description: localTeam.description,
          captain: localTeam.captainId,
          captainId: localTeam.captainId,
          captainNpub: localTeam.captainId,
          memberCount: localTeam.memberCount || 1,
          isPublic: true,
          activityType: 'general',
          charityId: localTeam.charityId,
          bannerImage: localTeam.bannerImage,
          shopUrl: localTeam.shopUrl,
          flashUrl: undefined,
          tags: [],
          createdAt: new Date(localTeam.createdAt).getTime(),
          nostrEvent: {} as any, // Local teams don't have real Nostr events yet
          hasListSupport: false,
          memberListId: undefined,
        }));

        console.log(
          `📱 Loaded ${localTeams.length} locally-created teams for captain`
        );
      }

      // Merge hardcoded and local teams (local teams first for captain visibility)
      const allTeams = [...localTeams, ...teams];

      const queryTime = Date.now() - startTime;
      console.log(
        `✅ Loaded ${teams.length} hardcoded + ${localTeams.length} local teams in ${queryTime}ms (was 4-6 seconds with Nostr query)`
      );

      // Sort by creation date (newest first)
      return allTeams.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('❌ NdkTeamService: Error loading hardcoded teams:', error);
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
    // Using global strategy for team discovery

    const startTime = Date.now();
    let totalEventsFound = 0;

    // ULTRA-SIMPLE FILTER: Just kind 33404 with large limit
    const limits = [500, 1000]; // Try multiple limits to catch all teams

    for (const limit of limits) {
      // Querying with limit: ${limit}

      const filter: NDKFilter = {
        kinds: [33404 as any], // Fitness teams (cast to any for NDK compatibility)
        limit: limit, // Large limit to get all teams
        // NO authors - want teams from everyone
        // NO time filters - want teams from all time
      };

      const globalEvents = await this.subscribeWithNdk(
        filter,
        `global-${limit}`,
        subscriptionStats
      );

      // Add unique events
      for (const event of globalEvents) {
        if (!processedEventIds.has(event.id)) {
          allEvents.push(event);
          processedEventIds.add(event.id);
          totalEventsFound++;
        }
      }

      // Events collected from global query

      // React Native breathing room between attempts
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return {
      success: totalEventsFound > 0,
      events: allEvents,
      totalEventsFound,
      teamsParsed: 0, // Will be calculated later
      relaysResponded: this.relayUrls.length,
      method: 'ndk-global',
      queryTime: Date.now() - startTime,
      subscriptionStats,
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
      // Creating subscription with filter

      // Get fastest relays for this subscription
      const fastRelays = this.getFastestRelays(4);

      // Create subscription with fast relays
      const subscription: NDKSubscription = this.ndk.subscribe(filter, {
        closeOnEose: false, // CRITICAL: Keep subscription open (Zap-Arena pattern)
        // Note: Using relaySet would be the correct NDK way, but keeping simple for now
      });

      subscriptionStats.subscriptionsCreated++;

      subscription.on('event', (event: NDKEvent) => {
        // Silently filter for team events
        if (event.kind === 33404) {
          const hasTeamTags = event.tags?.some((tag) =>
            ['name', 'captain', 'd', 'public', 'member'].includes(tag[0])
          );
          if (hasTeamTags) {
            events.push(event);
            subscriptionStats.eventsReceived++;
          }
        }
      });

      subscription.on('eose', () => {
        // Don't close immediately on EOSE (Zap-Arena pattern: events can arrive after EOSE)
        // EOSE received, continuing to wait for timeout
      });

      // Timeout with Promise.race pattern (Zap-Arena)
      setTimeout(() => {
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
      sig: ndkEvent.sig || '',
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
    console.log(
      `✅ VALIDATION: Team passed all checks: ${team.name} (isPublic: ${team.isPublic})`
    );
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
