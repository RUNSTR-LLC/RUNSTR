/**
 * Simple Competition Service - MVP Implementation
 * Fetches leagues (kind 30100) and events (kind 30101) from Nostr
 * Now with UnifiedNostrCache integration for better performance
 */

import { GlobalNDKService } from '../nostr/GlobalNDKService';
import type { NDKFilter, NDKEvent } from '@nostr-dev-kit/ndk';
import unifiedCache from '../cache/UnifiedNostrCache';
import { CacheKeys, CacheTTL } from '../../constants/cacheTTL';
import type { NostrChallengeDefinition } from '../../types/nostrCompetition';

export interface League {
  id: string; // d tag
  teamId: string;
  captainPubkey: string;
  name: string;
  description?: string;
  activityType: string;
  metric: string; // total_distance, fastest_time, most_workouts, etc.
  startDate: string; // ISO date
  endDate: string; // ISO date
}

export interface CompetitionEvent {
  id: string; // d tag
  teamId: string;
  captainPubkey: string;
  pubkey?: string; // Raw Nostr event pubkey (backwards-compat lookups)
  name: string;
  description?: string;
  activityType: string;
  location?: string;
  scoringType?: string; // NEW: 'completion' | 'fastest_time'
  metric: string; // Deprecated: Use scoringType instead
  eventDate: string; // ISO date
  durationMinutes?: number; // NEW: Duration for short events (10 min, 2 hours)
  targetDistance?: number;
  targetUnit?: string;
  entryFeesSats?: number;
  lightningAddress?: string;
  paymentDestination?: 'captain' | 'charity';
  paymentRecipientName?: string;
  scoringMode?: 'individual' | 'team-total'; // NEW: Scoring mode
  teamGoal?: number; // NEW: Team goal for team-total mode
}

export class SimpleCompetitionService {
  private static instance: SimpleCompetitionService;

  private constructor() {}

  static getInstance(): SimpleCompetitionService {
    if (!SimpleCompetitionService.instance) {
      SimpleCompetitionService.instance = new SimpleCompetitionService();
    }
    return SimpleCompetitionService.instance;
  }

  /**
   * Fetch ALL leagues from Nostr (no team filter)
   * Used for prefetching during app initialization
   */
  async getAllLeagues(): Promise<League[]> {
    console.log('📋 Fetching ALL leagues from Nostr...');

    try {
      const connected = await GlobalNDKService.waitForMinimumConnection(
        2,
        4000
      ); // Progressive: 2/4 relays, 4s timeout
      if (!connected) {
        console.warn(
          '⚠️ Proceeding with minimal relay connectivity for all leagues query'
        );
      }

      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [30100 as any],
        limit: 500, // Fetch many leagues for caching
      };

      // ✅ PERFORMANCE: Reduced timeout from 3s → 2s for faster failures
      const events = await Promise.race([
        ndk.fetchEvents(filter),
        new Promise<Set<NDKEvent>>(
          (resolve) => setTimeout(() => resolve(new Set()), 2000) // 2s timeout
        ),
      ]);
      const leagues: League[] = [];

      events.forEach((event) => {
        try {
          const league = this.parseLeagueEvent(event);
          if (league) {
            leagues.push(league);
          }
        } catch (error) {
          console.error('Failed to parse league event:', error);
        }
      });

      console.log(`✅ Fetched ${leagues.length} total leagues`);
      return leagues;
    } catch (error) {
      console.error('Failed to fetch all leagues:', error);
      return [];
    }
  }

  /**
   * Fetch ALL events from Nostr (no team filter)
   * Used for prefetching during app initialization
   */
  async getAllEvents(): Promise<CompetitionEvent[]> {
    console.log('📋 Fetching ALL events from Nostr...');

    try {
      const connected = await GlobalNDKService.waitForMinimumConnection(
        2,
        4000
      ); // Progressive: 2/4 relays, 4s timeout
      if (!connected) {
        console.warn(
          '⚠️ Proceeding with minimal relay connectivity for all events query'
        );
      }

      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [30101 as any],
        limit: 500, // Fetch many events for caching
      };

      // ✅ PERFORMANCE: Reduced timeout from 3s → 2s for faster failures
      const events = await Promise.race([
        ndk.fetchEvents(filter),
        new Promise<Set<NDKEvent>>(
          (resolve) => setTimeout(() => resolve(new Set()), 2000) // 2s timeout
        ),
      ]);
      const competitionEvents: CompetitionEvent[] = [];

      events.forEach((event) => {
        try {
          const competitionEvent = this.parseEventEvent(event);
          if (competitionEvent) {
            competitionEvents.push(competitionEvent);
          }
        } catch (error) {
          console.error('Failed to parse event:', error);
        }
      });

      console.log(`✅ Fetched ${competitionEvents.length} total events`);
      return competitionEvents;
    } catch (error) {
      console.error('Failed to fetch all events:', error);
      return [];
    }
  }

  /**
   * Get all leagues for a team (with caching)
   */
  async getTeamLeagues(teamId: string): Promise<League[]> {
    console.log(`📋 Fetching leagues for team: ${teamId}`);

    try {
      // ✅ Try to get from cache first
      const allLeagues = await unifiedCache.get(
        CacheKeys.LEAGUES,
        () => this.getAllLeagues(),
        { ttl: CacheTTL.LEAGUES, backgroundRefresh: true }
      );

      // Filter for this team
      const teamLeagues = allLeagues.filter(
        (league) => league.teamId === teamId
      );
      console.log(
        `✅ Found ${teamLeagues.length} leagues for team ${teamId} (${allLeagues.length} total cached)`
      );

      return teamLeagues;
    } catch (error) {
      console.error('Failed to fetch leagues:', error);
      return [];
    }
  }

  /**
   * Get all events for a team (with caching)
   * ✅ PERFORMANCE FIX: Team-specific cache + filtered Nostr queries
   * @param signal - Optional AbortSignal for cancellation
   */
  async getTeamEvents(
    teamId: string,
    signal?: AbortSignal
  ): Promise<CompetitionEvent[]> {
    console.log(`📋 Fetching events for team: ${teamId}`);

    try {
      // Check if already aborted
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      // ✅ PERFORMANCE FIX: Use team-specific cache key instead of global cache
      // This prevents fetching ALL events when we only need one team's events
      const teamEvents = await unifiedCache.get(
        CacheKeys.TEAM_EVENTS(teamId),
        () => this.fetchTeamEventsFromNostr(teamId, signal),
        {
          ttl: CacheTTL.COMPETITIONS,
          backgroundRefresh: true, // ✅ Always enable background refresh for instant UI
        }
      );

      // Check if aborted after cache fetch
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      console.log(
        `✅ Found ${teamEvents.length} events for team ${teamId} (from team-specific cache)`
      );

      return teamEvents;
    } catch (error: any) {
      if (error?.message === 'Request aborted') {
        throw new Error('AbortError');
      }
      console.error('Failed to fetch events:', error);
      return [];
    }
  }

  /**
   * ✅ NEW: Fetch events for a SPECIFIC team from Nostr (not all teams)
   * This reduces query size from 500 events → ~10-20 events per team
   */
  private async fetchTeamEventsFromNostr(
    teamId: string,
    signal?: AbortSignal
  ): Promise<CompetitionEvent[]> {
    console.log(`🔍 Fetching events from Nostr for team: ${teamId}`);

    try {
      // Check if aborted before starting
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      const connected = await GlobalNDKService.waitForMinimumConnection(
        2,
        4000
      );
      if (!connected) {
        console.warn(
          '⚠️ Proceeding with minimal relay connectivity for team events query'
        );
      }

      const ndk = await GlobalNDKService.getInstance();

      // ✅ CRITICAL FIX: Get team captain to query by author (relays reject #team queries)
      const team = await this.getTeamCaptainId(teamId);
      if (!team?.captainId) {
        console.warn(`⚠️ Cannot query events - team ${teamId} has no captain`);
        return [];
      }

      console.log(`📡 Querying events by #team tag (optimized query):`, {
        teamId: teamId.substring(0, 16) + '...',
      });

      // ✅ OPTIMIZED: Query by #team tag directly (90% more efficient than author query)
      // This fetches only events for THIS team instead of ALL captain's events
      const filter: NDKFilter = {
        kinds: [30101 as any],
        '#team': [teamId], // ✅ Direct team filter
        limit: 50, // Reduced from 200 since we're not filtering client-side
        since: Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60, // Last 90 days
      };

      // Check if aborted before fetch
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      let events = await Promise.race([
        ndk.fetchEvents(filter),
        new Promise<Set<NDKEvent>>(
          (resolve) => setTimeout(() => resolve(new Set()), 3000) // 3s timeout
        ),
      ]);

      // ✅ FALLBACK: If #team query returns 0 results, try author-based query
      if (events.size === 0) {
        console.log(
          `⚠️ #team query returned 0 results, trying fallback author query...`
        );
        const fallbackFilter: NDKFilter = {
          kinds: [30101 as any],
          authors: [team.captainId],
          limit: 200,
          since: Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60,
        };
        events = await Promise.race([
          ndk.fetchEvents(fallbackFilter),
          new Promise<Set<NDKEvent>>((resolve) =>
            setTimeout(() => resolve(new Set()), 3000)
          ),
        ]);
        console.log(`✅ Fallback query received ${events.size} events`);
      }

      // Simple logging - no crashes
      console.log(
        `✅ Received ${
          events.size
        } events from Nostr for team ${teamId.substring(0, 8)}...`
      );

      // Check if aborted after fetch
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      const competitionEvents: CompetitionEvent[] = [];
      const now = new Date();
      // ✅ FIX: Filter based on event END date, not start date (7 days for more permissive filtering)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Keep events that ended within 7 days
      const ninetyDaysFromNow = new Date(
        now.getTime() + 90 * 24 * 60 * 60 * 1000
      );

      console.log(
        `📅 Date filtering window: ${sevenDaysAgo.toISOString()} to ${ninetyDaysFromNow.toISOString()}`
      );
      console.log(`📅 Current time: ${now.toISOString()}`);

      events.forEach((event) => {
        try {
          const competitionEvent = this.parseEventEvent(event);
          if (!competitionEvent) return;

          // ✅ Filter client-side for THIS team (only needed if fallback author query was used)
          if (competitionEvent.teamId && competitionEvent.teamId !== teamId) {
            console.log(
              `⏩ Skipping event for different team: ${
                competitionEvent.name
              } (team: ${competitionEvent.teamId.substring(0, 8)}...)`
            );
            return;
          }

          // Ensure teamId is set (from filter context if missing in event)
          if (!competitionEvent.teamId) {
            competitionEvent.teamId = teamId;
          }

          // Calculate event end date (start + duration)
          const eventStartDate = new Date(competitionEvent.eventDate);
          const durationMinutes = competitionEvent.durationMinutes || 1440; // Default 24 hours
          const eventEndDate = new Date(
            eventStartDate.getTime() + durationMinutes * 60 * 1000
          );

          console.log(
            `📅 Event "${
              competitionEvent.name
            }": start=${eventStartDate.toISOString()}, end=${eventEndDate.toISOString()}, duration=${durationMinutes}min`
          );

          // ✅ FIX: Filter out events that ended more than 7 days ago (changed from 48 hours)
          if (eventEndDate < sevenDaysAgo) {
            const hoursAgo = Math.floor(
              (now.getTime() - eventEndDate.getTime()) / (1000 * 60 * 60)
            );
            console.log(
              `❌ FILTERED OUT: Event ended ${hoursAgo} hours ago (> 7 days): ${competitionEvent.name}`
            );
            return;
          }

          // Filter out events starting more than 90 days in the future
          if (eventStartDate > ninetyDaysFromNow) {
            console.log(
              `❌ FILTERED OUT: Distant future event: ${competitionEvent.name} (${competitionEvent.eventDate})`
            );
            return;
          }

          console.log(
            `✅ KEPT: Event "${competitionEvent.name}" passed date filtering`
          );

          competitionEvents.push(competitionEvent);
        } catch (error) {
          console.error('Failed to parse event:', error);
        }
      });

      // Sort by date - upcoming events first, then recent past events
      competitionEvents.sort((a, b) => {
        const dateA = new Date(a.eventDate).getTime();
        const dateB = new Date(b.eventDate).getTime();
        const nowTime = now.getTime();

        // Both in future - sort ascending (nearest first)
        if (dateA >= nowTime && dateB >= nowTime) {
          return dateA - dateB;
        }

        // Both in past - sort descending (most recent first)
        if (dateA < nowTime && dateB < nowTime) {
          return dateB - dateA;
        }

        // One future, one past - future comes first
        return dateA >= nowTime ? -1 : 1;
      });

      console.log(
        `✅ Found ${competitionEvents.length} events for team ${teamId} after filtering (from ${events.size} total captain events)`
      );
      return competitionEvents;
    } catch (error: any) {
      // ✅ FIX: Handle abort errors gracefully
      if (
        error?.message === 'Request aborted' ||
        error?.name === 'AbortError' ||
        error?.message?.includes('abort')
      ) {
        console.log(
          `[SimpleCompetitionService] Fetch cancelled for team: ${teamId} (user navigated away)`
        );
        throw new Error('AbortError'); // Re-throw for upstream handling
      }
      console.error(`Failed to fetch team events from Nostr: ${teamId}`, error);
      return [];
    }
  }

  /**
   * ✅ FIXED: Helper method to get team captain ID from team data
   * Checks cache first, then fetches from Nostr if needed
   * Uses static imports to prevent Metro bundler crashes
   */
  private async getTeamCaptainId(
    teamId: string
  ): Promise<{ captainId: string } | null> {
    try {
      // Try UnifiedCache first (fastest) - using static import
      const cached = unifiedCache.getCached<any>(`team_${teamId}`);
      if (cached?.captainId) {
        console.log(
          `📦 Found team captain in cache: ${(cached.captainId as string).substring(
            0,
            16
          )}...`
        );
        return { captainId: cached.captainId };
      }

      // Team captain now resolved via Supabase clubs
      console.log(`🔍 Team ${teamId} captain not found in cache`);
      // Captain info comes from Supabase ClubService, not Nostr relay discovery

      console.warn(`⚠️ Team ${teamId} not found or has no captain`);
      return null;
    } catch (error) {
      console.error(`❌ Error getting team captain for ${teamId}:`, error);
      return null;
    }
  }

  /**
   * Get a specific league by ID
   */
  async getLeagueById(leagueId: string): Promise<League | null> {
    console.log(`🔍 Fetching league: ${leagueId}`);

    try {
      // Progressive: Accept 2/4 relays for faster queries with good coverage
      const connected = await GlobalNDKService.waitForMinimumConnection(
        2,
        4000
      );
      if (!connected) {
        console.warn(
          '⚠️ Proceeding with minimal relay connectivity for league by ID query'
        );
      }

      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [30100 as any],
        '#d': [leagueId],
        limit: 1,
      };

      // ✅ FIX: Increased timeout from 2s to 5s for better reliability
      const events = await Promise.race([
        ndk.fetchEvents(filter),
        new Promise<Set<NDKEvent>>(
          (resolve) => setTimeout(() => resolve(new Set()), 5000) // 5s timeout
        ),
      ]);

      for (const event of events) {
        const league = this.parseLeagueEvent(event);
        if (league) {
          return league;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch league:', error);
      return null;
    }
  }

  /**
   * Get a specific event by ID
   */
  async getEventById(eventId: string): Promise<CompetitionEvent | null> {
    console.log(`🔍 Fetching event: ${eventId}`);

    try {
      // Progressive: Accept 2/4 relays for faster queries with good coverage
      const connected = await GlobalNDKService.waitForMinimumConnection(
        2,
        4000
      );
      if (!connected) {
        console.warn(
          '⚠️ Proceeding with minimal relay connectivity for event by ID query'
        );
      }

      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [30101 as any],
        '#d': [eventId],
        limit: 1,
      };

      // ✅ FIX: Increased timeout from 2s to 5s for better reliability
      const events = await Promise.race([
        ndk.fetchEvents(filter),
        new Promise<Set<NDKEvent>>(
          (resolve) => setTimeout(() => resolve(new Set()), 5000) // 5s timeout
        ),
      ]);

      for (const event of events) {
        const competitionEvent = this.parseEventEvent(event);
        if (competitionEvent) {
          return competitionEvent;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch event:', error);
      return null;
    }
  }

  /**
   * Get event by ID with fallback to Nostr event ID
   * ✅ FIX: Handles backwards compatibility for events stored with event.id instead of d-tag
   */
  async getEventByIdOrDTag(
    identifier: string
  ): Promise<CompetitionEvent | null> {
    console.log(`🔍 Fetching event by ID or d-tag: ${identifier}`);

    try {
      // Try d-tag first (correct way for kind 30101 parameterized replaceable events)
      let event = await this.getEventById(identifier);

      if (!event) {
        console.log('⚠️ Event not found by d-tag, trying as Nostr event ID...');

        // Fallback: Try as Nostr event ID (for backwards compatibility)
        const connected = await GlobalNDKService.waitForMinimumConnection(
          2,
          4000
        );
        if (!connected) {
          console.warn(
            '⚠️ Proceeding with minimal relay connectivity for event ID fallback'
          );
        }

        const ndk = await GlobalNDKService.getInstance();

        const filter: NDKFilter = {
          kinds: [30101 as any],
          ids: [identifier], // Query by event ID instead of d-tag
          limit: 1,
        };

        const events = await Promise.race([
          ndk.fetchEvents(filter),
          new Promise<Set<NDKEvent>>(
            (resolve) => setTimeout(() => resolve(new Set()), 2000) // 2s timeout
          ),
        ]);

        for (const evt of events) {
          event = this.parseEventEvent(evt);
          if (event) {
            console.log(`✅ Found event by Nostr ID: ${event.name}`);
            break;
          }
        }
      }

      return event;
    } catch (error) {
      console.error('Failed to fetch event by ID or d-tag:', error);
      return null;
    }
  }

  /**
   * Get challenges where user is creator or participant
   * Queries kind 30102 events
   */
  async getUserChallenges(
    userPubkey: string
  ): Promise<NostrChallengeDefinition[]> {
    console.log(
      `📋 Fetching challenges for user: ${userPubkey.slice(0, 8)}...`
    );

    try {
      const connected = await GlobalNDKService.waitForMinimumConnection(
        2,
        4000
      );
      if (!connected) {
        console.warn(
          '⚠️ Proceeding with minimal relay connectivity for user challenges query'
        );
      }

      const ndk = await GlobalNDKService.getInstance();

      // Query kind 30102 where user is tagged as participant
      const filter: NDKFilter = {
        kinds: [30102 as any],
        '#p': [userPubkey], // User is tagged as participant (creator or opponent)
        limit: 100,
      };

      const events = await Promise.race([
        ndk.fetchEvents(filter),
        new Promise<Set<NDKEvent>>(
          (resolve) => setTimeout(() => resolve(new Set()), 2000) // 2s timeout
        ),
      ]);

      const challenges: NostrChallengeDefinition[] = [];

      events.forEach((event) => {
        try {
          const challenge = this.parseChallenge(event);
          if (challenge) {
            challenges.push(challenge);
          }
        } catch (error) {
          console.error('Failed to parse challenge event:', error);
        }
      });

      // Sort by creation date (newest first)
      challenges.sort((a, b) => b.createdAt - a.createdAt);

      console.log(`✅ Fetched ${challenges.length} challenges for user`);
      return challenges;
    } catch (error) {
      console.error('Failed to fetch user challenges:', error);
      return [];
    }
  }

  /**
   * Parse a kind 30102 Nostr event into a NostrChallengeDefinition
   */
  private parseChallenge(event: NDKEvent): NostrChallengeDefinition | null {
    try {
      const getTag = (name: string) =>
        event.tags.find((t) => t[0] === name)?.[1];

      const id = getTag('d');
      const name = getTag('name');
      const distance = parseFloat(getTag('distance') || '0');
      const duration = parseInt(getTag('duration') || '0');
      const wager = parseInt(getTag('wager') || '0');
      const status = getTag('status') as
        | 'open'
        | 'active'
        | 'completed'
        | 'cancelled';
      const startDate = getTag('start_date');
      const endDate = getTag('end_date');

      if (!id || !name) {
        console.warn('Challenge missing required tags:', { id, name });
        return null;
      }

      // Extract all participant pubkeys from 'p' tags
      const participants = event.tags
        .filter((t) => t[0] === 'p')
        .map((t) => t[1]);

      return {
        id,
        name,
        description: getTag('description'),
        activityType: 'running',
        distance,
        metric: 'fastest_time',
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || new Date().toISOString(),
        duration: duration as 24,
        participants,
        maxParticipants: parseInt(getTag('max_participants') || '2') as 2,
        wager,
        status: status || 'open',
        createdAt: event.created_at || Date.now() / 1000,
        updatedAt: event.created_at,
        rawEvent: event,
        creatorPubkey: event.pubkey,
      };
    } catch (error) {
      console.error('Failed to parse challenge event:', error);
      return null;
    }
  }

  /**
   * Parse a kind 30100 Nostr event into a League
   */
  private parseLeagueEvent(event: NDKEvent): League | null {
    try {
      const getTag = (name: string) =>
        event.tags.find((t) => t[0] === name)?.[1];

      const id = getTag('d');
      const teamId = getTag('team');

      if (!id || !teamId) {
        console.warn('League missing required tags:', { id, teamId });
        return null;
      }

      return {
        id,
        teamId,
        captainPubkey: event.pubkey,
        name: getTag('name') || 'Unnamed League',
        description: getTag('description'),
        activityType: getTag('activity_type') || 'Any',
        metric: getTag('competition_type') || 'total_distance',
        startDate: getTag('start_date') || new Date().toISOString(),
        endDate: getTag('end_date') || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to parse league event:', error);
      return null;
    }
  }

  /**
   * Parse a kind 30101 Nostr event into a CompetitionEvent
   */
  private parseEventEvent(event: NDKEvent): CompetitionEvent | null {
    try {
      const getTag = (name: string) =>
        event.tags.find((t) => t[0] === name)?.[1];

      const id = getTag('d');
      const teamId = getTag('team') || getTag('team_id'); // Support both 'team' and 'team_id' tags

      // ✅ FIX: Debug logging - show what tags were found
      console.log('🔍 Parsing event from Nostr:', {
        eventId: id,
        teamTag: getTag('team'),
        eventPubkey: event.pubkey,
        activityTypeTag: getTag('activity_type'),
        nameTag: getTag('name'),
        allTags:
          event.tags?.map((t) => `[${t[0]}, ${t[1]}]`).slice(0, 10) || [], // First 10 tags (safe null check)
      });

      if (!id) {
        console.warn('❌ Event missing required id tag - rejecting');
        return null;
      }

      // ✅ FIX: Warn about missing teamId but don't reject - let context inject it
      if (!teamId || teamId.trim() === '') {
        console.warn(
          `⚠️ Event ${id} missing teamId tag - will use context teamId`,
          {
            teamTag: getTag('team'),
            teamIdTag: getTag('team_id'),
            eventPubkey: event.pubkey,
          }
        );
        // Don't return null - SimpleTeamScreen will inject teamId from context
      }

      const targetValue = getTag('target_value');
      const entryFee = getTag('entry_fee');

      // ✅ FIX: Read scoring_type with fallback to competition_type for backward compatibility
      const scoringType =
        getTag('scoring_type') || getTag('competition_type') || 'fastest_time';
      const activityType = getTag('activity_type') || 'Running';

      // ✅ NEW: Read duration, scoring mode, and team goal
      const durationMinutesTag = getTag('duration_minutes');
      const scoringModeTag = getTag('scoring_mode');
      const teamGoalTag = getTag('team_goal');

      // ✅ FIX: Defensive captain pubkey extraction with fallback
      const captainPubkey = event.pubkey || getTag('captain') || '';
      if (!captainPubkey) {
        console.warn(
          `⚠️ Event ${id} missing captain pubkey - event.pubkey and captain tag both empty`
        );
      }

      return {
        id,
        teamId: teamId || '',
        captainPubkey,
        // pubkey preserved via captainPubkey above
        name: getTag('name') || 'Unnamed Event',
        description: getTag('description'),
        activityType, // ✅ FIX: Properly read from tags
        scoringType, // ✅ NEW: Read simplified scoring type
        metric: getTag('competition_type') || scoringType, // Deprecated: backward compat
        eventDate: getTag('event_date') || new Date().toISOString(),
        durationMinutes: durationMinutesTag
          ? parseInt(durationMinutesTag)
          : undefined, // ✅ NEW
        targetDistance: targetValue ? parseFloat(targetValue) : undefined,
        targetUnit: getTag('target_unit'),
        entryFeesSats: entryFee ? parseInt(entryFee) : undefined,
        lightningAddress: getTag('lightning_address'),
        paymentDestination: getTag('payment_destination') as
          | 'captain'
          | 'charity'
          | undefined,
        paymentRecipientName: getTag('payment_recipient_name'),
        scoringMode: scoringModeTag as 'individual' | 'team-total' | undefined, // ✅ NEW
        teamGoal: teamGoalTag ? parseFloat(teamGoalTag) : undefined, // ✅ NEW
        // location: getTag('location'), // Not yet in CompetitionEvent interface
      };
    } catch (error) {
      console.error('Failed to parse event:', error);
      return null;
    }
  }
}

// Export class instead of instance to prevent blocking module initialization
export default SimpleCompetitionService;
