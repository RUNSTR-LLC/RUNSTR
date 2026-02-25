/**
 * SatlantisEventService - Discover and parse NIP-52 calendar events
 *
 * Queries Nostr relays for kind 31923 calendar events with sports-related tags,
 * parses event metadata, and caches results for performance.
 *
 * Usage:
 * ```typescript
 * const events = await SatlantisEventService.discoverSportsEvents();
 * const event = await SatlantisEventService.getEventById(eventId, pubkey);
 * ```
 */

import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { UnifiedCacheService } from '../cache/UnifiedCacheService';
import type { NDKFilter, NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import type {
  SatlantisEvent,
  SatlantisEventFilter,
  SatlantisSportType,
} from '../../types/satlantis';
import type {
  RunstrScoringType,
  RunstrPayoutScheme,
  RunstrJoinMethod,
  RunstrDuration,
  RunstrActivityType,
} from '../../types/runstrEvent';
import { NostrFetchLogger } from '../../utils/NostrFetchLogger';

// NIP-52 Calendar Event kind (not in NDK's standard kinds)
const KIND_CALENDAR_EVENT = 31923 as NDKKind;

// Sport-related tags to query for event discovery
// Includes 'runstr' for RUNSTR-hosted events
const SPORTS_TAGS = [
  'runstr', // RUNSTR-hosted events (priority)
  'sports',
  '5k',
  '10k',
  'half',
  'marathon',
  'half-marathon',
  'running',
  'cycling',
  'triathlon',
  'race',
  'fitness',
  'walk',
  'hike',
  'virtual',
  'charity',
];

// Cache TTLs in seconds (7 days - refresh via pull-to-refresh)
const CACHE_TTL = {
  EVENTS_LIST: 604800, // 7 days for discovery feed
  SINGLE_EVENT: 604800, // 7 days for single event detail
};

class SatlantisEventServiceClass {
  private static instance: SatlantisEventServiceClass;

  static getInstance(): SatlantisEventServiceClass {
    if (!this.instance) {
      this.instance = new SatlantisEventServiceClass();
    }
    return this.instance;
  }

  /**
   * Discover sports events - RETURNS EMPTY (events are hardcoded in UI)
   *
   * NOTE: Satlantis events are NOT fetched from Nostr.
   * The app uses hardcoded event cards (EinundzwanzigEventCard, Season2EventCard, etc.)
   * displayed directly in EventsContent.tsx.
   *
   * This method returns an empty array to avoid unnecessary Nostr queries.
   * The only Nostr fetches allowed are: Kind 0 (profiles) and Kind 1301 (workouts).
   */
  async discoverSportsEvents(
    _filter?: SatlantisEventFilter,
    _forceRefresh: boolean = false,
    _isRetry: boolean = false
  ): Promise<SatlantisEvent[]> {
    // NO NOSTR FETCH - Events are hardcoded in the UI
    console.log('[Satlantis] Using hardcoded events (no Nostr fetch)');
    return [];
  }

  /**
   * Batch fetch creator profiles for multiple pubkeys (efficiency)
   */
  private async batchFetchCreatorProfiles(
    pubkeys: string[]
  ): Promise<Map<string, { name: string; picture?: string }>> {
    const profileMap = new Map<string, { name: string; picture?: string }>();

    if (pubkeys.length === 0) return profileMap;

    try {
      const ndk = await GlobalNDKService.getInstance();
      const profiles = await Promise.race([
        ndk.fetchEvents({ kinds: [0 as NDKKind], authors: pubkeys }),
        new Promise<Set<NDKEvent>>((resolve) =>
          setTimeout(() => resolve(new Set()), 5000)
        ),
      ]);

      for (const profile of profiles) {
        try {
          const content = JSON.parse(profile.content);
          profileMap.set(profile.pubkey, {
            name: content.display_name || content.name || 'Anonymous',
            picture: content.picture,
          });
        } catch (e) {
          // Skip malformed profiles
        }
      }

      console.log(`[Satlantis] Fetched ${profileMap.size}/${pubkeys.length} creator profiles`);
    } catch (e) {
      console.warn('[Satlantis] Batch profile fetch failed:', e);
    }

    return profileMap;
  }

  /**
   * Get single event by ID
   * @param eventId - Event d-tag identifier
   * @param pubkey - Event organizer's pubkey
   * @param forceRefresh - If true, bypasses cache and queries Nostr directly
   */
  async getEventById(
    eventId: string,
    pubkey: string,
    forceRefresh: boolean = false
  ): Promise<SatlantisEvent | null> {
    const cacheKey = `satlantis_event_${pubkey}_${eventId}`;

    // Check cache first (unless forceRefresh)
    if (!forceRefresh) {
      try {
        const cached = await UnifiedCacheService.get<SatlantisEvent>(cacheKey);
        if (cached) {
          console.log(`[Satlantis] Cache hit for event ${eventId}`);
          return cached;
        }
      } catch (error) {
        console.warn('[Satlantis] Cache read error:', error);
      }
    } else {
      console.log(`[Satlantis] Force refresh - bypassing cache for event ${eventId}`);
    }

    const ndk = await GlobalNDKService.getInstance();

    const filter: NDKFilter = {
      kinds: [KIND_CALENDAR_EVENT],
      authors: [pubkey],
      '#d': [eventId],
      limit: 1,
    };

    try {
      const events = await Promise.race([
        ndk.fetchEvents(filter),
        new Promise<Set<NDKEvent>>((resolve) =>
          setTimeout(() => resolve(new Set()), 8000)
        ),
      ]);

      for (const event of events) {
        const parsed = this.parseCalendarEvent(event);
        if (parsed) {
          // Fetch and attach creator profile
          parsed.creatorProfile = await this.fetchCreatorProfile(pubkey);

          // Cache result (with creator profile included)
          await UnifiedCacheService.setWithCustomTTL(
            cacheKey,
            parsed,
            CACHE_TTL.SINGLE_EVENT
          );
          return parsed;
        }
      }
    } catch (error) {
      console.error('[Satlantis] Error fetching event:', error);
    }

    return null;
  }

  /**
   * Fetch creator's profile (kind 0) for caching with event
   */
  private async fetchCreatorProfile(
    pubkey: string
  ): Promise<{ name: string; picture?: string } | undefined> {
    try {
      const ndk = await GlobalNDKService.getInstance();
      const profileEvent = await Promise.race([
        ndk.fetchEvent({ kinds: [0 as NDKKind], authors: [pubkey] }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      if (profileEvent) {
        const content = JSON.parse(profileEvent.content);
        return {
          name: content.display_name || content.name || 'Anonymous',
          picture: content.picture,
        };
      }
    } catch (e) {
      console.warn('[Satlantis] Failed to fetch creator profile:', e);
    }
    return undefined;
  }

  /**
   * Parse NIP-52 calendar event (kind 31923)
   * Includes parsing for RUNSTR-specific tags (scoring, payout, join_method, etc.)
   */
  private parseCalendarEvent(event: NDKEvent): SatlantisEvent | null {
    try {
      const getTag = (name: string) =>
        event.tags.find((t) => t[0] === name)?.[1];
      const getTags = (name: string) =>
        event.tags.filter((t) => t[0] === name).map((t) => t[1]);

      const dTag = getTag('d');
      const title = getTag('title') || getTag('name');
      const start = getTag('start');
      const end = getTag('end');

      // Required fields
      if (!dTag || !title || !start) {
        return null;
      }

      // Parse sport type from tags
      const tags = getTags('t');
      const sportType = this.inferSportType(tags, title, event.content || '');

      // Parse distance - CHECK STRUCTURED TAG FIRST (most reliable)
      let distance: { value: number; unit: 'km' | 'miles' } | undefined;

      // Priority 1: Check for RUNSTR distance tag ['distance', 'value', 'unit']
      const distanceTag = event.tags.find((t) => t[0] === 'distance');
      if (distanceTag && distanceTag[1]) {
        const distValue = parseFloat(distanceTag[1]);
        const distUnit = (distanceTag[2] as 'km' | 'miles') || 'km';
        if (!isNaN(distValue) && distValue > 0) {
          distance = { value: distValue, unit: distUnit };
          console.log(`[SatlantisEvent] 📏 Distance from tag: ${distValue} ${distUnit}`);
        }
      }

      // Priority 2: Fallback to heuristic parsing from title/tags if no structured tag
      if (!distance) {
        distance = this.parseDistance(tags, title, event.content || '');
        if (distance) {
          console.log(`[SatlantisEvent] 📏 Distance from heuristic: ${distance.value} ${distance.unit}`);
        }
      }

      const startTime = parseInt(start, 10);
      const endTime = end ? parseInt(end, 10) : startTime + 86400; // Default: 24 hours

      // Check if this is a RUNSTR-hosted event
      const isRunstrEvent = tags.includes('runstr');

      // Parse RUNSTR-specific tags
      const runstrConfig = isRunstrEvent
        ? this.parseRunstrTags(event)
        : undefined;

      return {
        id: dTag,
        pubkey: event.pubkey,
        title,
        description: event.content || '',
        image: getTag('image'),
        location: getTag('location'),
        startTime,
        endTime,
        sportType,
        distance: distance?.value,
        distanceUnit: distance?.unit,
        tags,
        rawEvent: event,
        // RUNSTR fields
        isRunstrEvent,
        ...runstrConfig,
      };
    } catch (error) {
      console.error('[Satlantis] Failed to parse event:', error);
      return null;
    }
  }

  /**
   * Parse RUNSTR-specific tags from a calendar event
   */
  private parseRunstrTags(event: NDKEvent): Partial<SatlantisEvent> {
    const getTag = (name: string) =>
      event.tags.find((t) => t[0] === name)?.[1];

    // Parse scoring type
    const scoringRaw = getTag('scoring');
    const scoringType = this.isValidScoringType(scoringRaw)
      ? scoringRaw
      : undefined;

    // Parse payout scheme
    const payoutRaw = getTag('payout');
    const payoutScheme = this.isValidPayoutScheme(payoutRaw)
      ? payoutRaw
      : undefined;

    // Parse join method
    const joinRaw = getTag('join_method');
    const joinMethod = this.isValidJoinMethod(joinRaw) ? joinRaw : undefined;

    // Parse duration type
    const durationRaw = getTag('duration_type');
    const durationType = this.isValidDuration(durationRaw)
      ? durationRaw
      : undefined;

    // Parse activity type
    const activityRaw = getTag('activity_type');
    const activityType = this.isValidActivityType(activityRaw)
      ? activityRaw
      : undefined;

    // Parse numeric values
    const entryFeeRaw = getTag('entry_fee');
    const entryFeeSats = entryFeeRaw ? parseInt(entryFeeRaw, 10) : undefined;

    const prizePoolRaw = getTag('prize_pool');
    const prizePoolSats = prizePoolRaw ? parseInt(prizePoolRaw, 10) : undefined;

    const fixedPayoutRaw = getTag('fixed_payout');
    const fixedPayoutSats = fixedPayoutRaw
      ? parseInt(fixedPayoutRaw, 10)
      : undefined;

    // Parse creator NWC status
    const creatorNWCRaw = getTag('creator_nwc');
    const creatorHasNWC = creatorNWCRaw === 'true';

    // Parse pledge/commitment system tags
    const pledgeCostRaw = getTag('pledge_cost');
    const pledgeCost = pledgeCostRaw ? parseInt(pledgeCostRaw, 10) : undefined;

    const pledgeDestinationRaw = getTag('pledge_destination');
    const pledgeDestination = this.isValidPledgeDestination(pledgeDestinationRaw)
      ? pledgeDestinationRaw
      : undefined;

    const captainLightningAddress = getTag('captain_lightning_address');
    const pledgeCharityAddress = getTag('pledge_charity_address');
    const pledgeCharityName = getTag('pledge_charity_name');

    // Parse Impact Level gating tags (new donation-based system)
    const minimumImpactLevelRaw = getTag('minimum_impact_level');
    const minimumImpactLevel = minimumImpactLevelRaw ? parseInt(minimumImpactLevelRaw, 10) : undefined;
    const minimumImpactTier = getTag('minimum_impact_tier');

    // Parse rank gating tags (legacy - for backward compatibility)
    const minimumRankRaw = getTag('minimum_rank');
    const minimumRank = minimumRankRaw ? parseFloat(minimumRankRaw) : undefined;
    const minimumRankTier = getTag('minimum_rank_tier');

    // Parse team competition tag
    const isTeamCompetition = getTag('team_competition') === 'true';

    return {
      scoringType,
      payoutScheme,
      joinMethod,
      durationType,
      activityType,
      entryFeeSats: isNaN(entryFeeSats!) ? undefined : entryFeeSats,
      prizePoolSats: isNaN(prizePoolSats!) ? undefined : prizePoolSats,
      fixedPayoutSats: isNaN(fixedPayoutSats!) ? undefined : fixedPayoutSats,
      creatorHasNWC,
      // Pledge/commitment system fields
      pledgeCost: isNaN(pledgeCost!) ? undefined : pledgeCost,
      pledgeDestination,
      captainLightningAddress,
      pledgeCharityAddress,
      pledgeCharityName,
      // Impact Level gating fields (new donation-based system)
      minimumImpactLevel: isNaN(minimumImpactLevel!) ? undefined : minimumImpactLevel,
      minimumImpactTier,
      // Rank gating fields (legacy - for backward compatibility)
      minimumRank: isNaN(minimumRank!) ? undefined : minimumRank,
      minimumRankTier,
      // Team competition
      isTeamCompetition,
    };
  }

  private isValidPledgeDestination(value?: string): value is 'captain' | 'charity' {
    return ['captain', 'charity'].includes(value || '');
  }

  // Type guards for RUNSTR enum values
  private isValidScoringType(value?: string): value is RunstrScoringType {
    return ['fastest_time', 'most_distance', 'participation'].includes(
      value || ''
    );
  }

  private isValidPayoutScheme(value?: string): value is RunstrPayoutScheme {
    return [
      'winner_takes_all',
      'top_3_split',
      'random_lottery',
      'fixed_amount',
    ].includes(value || '');
  }

  private isValidJoinMethod(value?: string): value is RunstrJoinMethod {
    return ['open', 'paid', 'donation'].includes(value || '');
  }

  private isValidDuration(value?: string): value is RunstrDuration {
    return ['1d', '1w', '1m'].includes(value || '');
  }

  private isValidActivityType(value?: string): value is RunstrActivityType {
    return ['running', 'cycling', 'walking'].includes(value || '');
  }

  /**
   * Infer sport type from event metadata
   */
  private inferSportType(
    tags: string[],
    title: string,
    content: string
  ): SatlantisSportType {
    const combined = [...tags, title, content].join(' ').toLowerCase();

    if (
      combined.includes('run') ||
      combined.includes('5k') ||
      combined.includes('10k') ||
      combined.includes('marathon')
    ) {
      return 'running';
    }
    if (combined.includes('cycl') || combined.includes('bike')) {
      return 'cycling';
    }
    if (combined.includes('swim')) {
      return 'swimming';
    }
    if (combined.includes('triathlon')) {
      return 'triathlon';
    }
    if (combined.includes('walk')) {
      return 'walking';
    }
    if (combined.includes('hike')) {
      return 'hiking';
    }

    // Default to running for unknown types (never 'other')
    return 'running';
  }

  /**
   * Prefetch events - NO-OP (events are hardcoded)
   * Kept for backward compatibility with callers
   */
  async prefetchEventsForOfflineAccess(): Promise<void> {
    // NO-OP: Events are hardcoded, no prefetch needed
    console.log('[Satlantis] Skipping prefetch (events are hardcoded)');
  }

  /**
   * Parse distance from event metadata
   */
  private parseDistance(
    tags: string[],
    title: string,
    content: string
  ): { value: number; unit: 'km' | 'miles' } | undefined {
    const combined = [...tags, title].join(' ').toLowerCase();

    // Common race distances
    if (combined.includes('5k')) return { value: 5, unit: 'km' };
    if (combined.includes('10k')) return { value: 10, unit: 'km' };
    if (
      combined.includes('half marathon') ||
      combined.includes('half-marathon')
    ) {
      return { value: 21.1, unit: 'km' };
    }
    if (combined.includes('marathon') && !combined.includes('half')) {
      return { value: 42.2, unit: 'km' };
    }

    // Try to parse numeric distance (e.g., "15k run")
    const match = combined.match(/(\d+(?:\.\d+)?)\s*k(?:m)?/);
    if (match) {
      return { value: parseFloat(match[1]), unit: 'km' };
    }

    // Check for miles
    const milesMatch = combined.match(/(\d+(?:\.\d+)?)\s*mi(?:les?)?/);
    if (milesMatch) {
      return { value: parseFloat(milesMatch[1]), unit: 'miles' };
    }

    return undefined;
  }
}

// Export singleton instance
export const SatlantisEventService = SatlantisEventServiceClass.getInstance();
export default SatlantisEventService;
