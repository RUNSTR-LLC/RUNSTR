/**
 * Nostr Competition Service
 * Handles creation, publishing, and management of competition events (leagues/events)
 * Publishes to Nostr relays using custom event kinds 30100 (leagues) and 30101 (events)
 */

import { EventTemplate, Event, getPublicKey } from 'nostr-tools';
import { NostrProtocolHandler } from './NostrProtocolHandler';
import { NostrRelayManager, nostrRelayManager } from './NostrRelayManager';
import { GlobalNDKService } from './GlobalNDKService';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import type { NDKSigner } from '@nostr-dev-kit/ndk';
import type {
  NostrLeagueDefinition,
  NostrEventDefinition,
  NostrCompetitionFilter,
  NostrCompetitionSyncResult,
  CompetitionPublishResult,
  CompetitionStatusUpdate,
  NOSTR_COMPETITION_KINDS,
  NostrLeagueEventTemplate,
  NostrEventEventTemplate,
  CompetitionGoalType,
} from '../../types/nostrCompetition';
import {
  LEAGUE_GOAL_MAPPING,
  EVENT_GOAL_MAPPING,
} from '../../types/nostrCompetition';

export class NostrCompetitionService {
  private protocolHandler: NostrProtocolHandler;
  private relayManager: NostrRelayManager;
  private static instance: NostrCompetitionService;

  constructor() {
    this.protocolHandler = new NostrProtocolHandler();
    this.relayManager = nostrRelayManager; // Use singleton instance
  }

  static getInstance(): NostrCompetitionService {
    if (!NostrCompetitionService.instance) {
      NostrCompetitionService.instance = new NostrCompetitionService();
    }
    return NostrCompetitionService.instance;
  }

  // ================================================================================
  // COMPETITION CREATION & PUBLISHING
  // ================================================================================

  /**
   * Create and publish a league to Nostr relays
   * Supports both direct privateKeyHex (nsec users) and NDKSigner (Amber users)
   */
  static async createLeague(
    leagueData: Omit<
      NostrLeagueDefinition,
      'id' | 'captainPubkey' | 'createdAt' | 'updatedAt' | 'status'
    >,
    captainPrivateKeyOrSigner: string | NDKSigner
  ): Promise<CompetitionPublishResult> {
    try {
      console.log('📊 Creating league:', leagueData.name);

      const isSigner = typeof captainPrivateKeyOrSigner !== 'string';

      // Generate unique competition ID
      const competitionId = NostrCompetitionService.generateCompetitionId(
        'league',
        leagueData.name
      );
      const now = Math.floor(Date.now() / 1000);

      // Get captain's public key based on auth method
      let captainPubkey: string;
      if (isSigner) {
        const user = await captainPrivateKeyOrSigner.user();
        captainPubkey = user.pubkey;
      } else {
        const privateKeyBytes = new Uint8Array(
          captainPrivateKeyOrSigner
            .match(/.{2}/g)
            ?.map((byte) => parseInt(byte, 16)) || []
        );
        captainPubkey = getPublicKey(privateKeyBytes);
      }

      // Create full league definition
      const leagueDefinition: NostrLeagueDefinition = {
        ...leagueData,
        id: competitionId,
        captainPubkey,
        createdAt: now,
        updatedAt: now,
        status: 'upcoming',
      };

      // Create event template with proper typing
      const tags: Array<[string, string]> = [
        ['d', competitionId],
        ['team', leagueData.teamId],
        ['activity_type', leagueData.activityType],
        ['competition_type', leagueData.competitionType],
        ['start_date', leagueData.startDate],
        ['end_date', leagueData.endDate],
        ['duration', leagueData.duration.toString()],
        ['entry_fee', leagueData.entryFeesSats.toString()],
        ['max_participants', leagueData.maxParticipants.toString()],
        ['require_approval', leagueData.requireApproval.toString()],
        ['allow_late_joining', leagueData.allowLateJoining.toString()],
        ['scoring_frequency', leagueData.scoringFrequency],
        ['status', 'upcoming'],
        ['name', leagueData.name],
      ];

      if (leagueData.description) {
        tags.push(['description', leagueData.description]);
      }

      // Add prize pool tag if defined
      if (
        leagueData.prizePoolSats !== undefined &&
        leagueData.prizePoolSats !== null
      ) {
        tags.push(['prize_pool', leagueData.prizePoolSats.toString()]);
      }

      const eventTemplate: EventTemplate = {
        kind: 30100,
        content: JSON.stringify(leagueDefinition),
        tags,
        created_at: now,
      };

      // ✅ FIX: Use Global NDK for publishing (same relays as rest of app)
      console.log('📤 Publishing league to Global NDK relays...');

      // Get global NDK instance
      const ndk = await GlobalNDKService.getInstance();

      // Create NDK event
      const ndkEvent = new NDKEvent(ndk, eventTemplate);

      // Sign event based on auth method
      if (isSigner) {
        await ndkEvent.sign(captainPrivateKeyOrSigner as NDKSigner);
      } else {
        // For nsec users, create a signer from the private key
        const { NDKPrivateKeySigner } = await import('@nostr-dev-kit/ndk');
        const signer = new NDKPrivateKeySigner(
          captainPrivateKeyOrSigner as string
        );
        await ndkEvent.sign(signer);
      }

      // Publish to relays with timeout
      const publishPromise = ndkEvent.publish();
      const timeoutPromise = new Promise<Set<any>>(
        (resolve) => setTimeout(() => resolve(new Set()), 10000) // 10s timeout
      );

      const relaySet = await Promise.race([publishPromise, timeoutPromise]);
      const publishedRelayCount = relaySet.size;

      if (publishedRelayCount > 0) {
        console.log(
          `✅ League published successfully to ${publishedRelayCount} relays:`,
          competitionId
        );
        return {
          eventId: ndkEvent.id,
          success: true,
          competitionId,
          message: `League created and published to ${publishedRelayCount} Nostr relays`,
        };
      } else {
        throw new Error(
          'Failed to publish league to any relays. Please check your connection and try again.'
        );
      }
    } catch (error) {
      console.error('❌ Failed to create league:', error);
      return {
        eventId: '',
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unknown error creating league',
      };
    }
  }

  /**
   * Create and publish an event to Nostr relays
   * Supports both direct privateKeyHex (nsec users) and NDKSigner (Amber users)
   * ✅ FIX: Accepts optional id to prevent wizard/service ID mismatch
   */
  static async createEvent(
    eventData: Omit<
      NostrEventDefinition,
      'id' | 'captainPubkey' | 'createdAt' | 'updatedAt' | 'status'
    > & { id?: string }, // ✅ FIX: Allow optional id from wizard
    captainPrivateKeyOrSigner: string | NDKSigner
  ): Promise<CompetitionPublishResult> {
    try {
      console.log('🎯 Creating event:', eventData.name);

      // ✅ FIX: Validate required fields before publishing
      if (!eventData.teamId || eventData.teamId.trim() === '') {
        console.error(
          '❌ Event creation failed: teamId is required but was empty'
        );
        return {
          eventId: '',
          competitionId: '',
          success: false,
          message:
            'Team ID is required to create an event. Please ensure you are creating the event from a team page.',
        };
      }

      if (!eventData.name || eventData.name.trim() === '') {
        console.error(
          '❌ Event creation failed: name is required but was empty'
        );
        return {
          eventId: '',
          competitionId: '',
          success: false,
          message: 'Event name is required.',
        };
      }

      if (!eventData.activityType) {
        console.error(
          '❌ Event creation failed: activityType is required but was missing'
        );
        return {
          eventId: '',
          competitionId: '',
          success: false,
          message: 'Activity type is required. Please select an event preset.',
        };
      }

      console.log('✅ Event validation passed:', {
        teamId: eventData.teamId,
        name: eventData.name,
        activityType: eventData.activityType,
      });

      const isSigner = typeof captainPrivateKeyOrSigner !== 'string';

      // ✅ FIX: Use provided ID if available (from wizard), otherwise generate new one
      const competitionId =
        eventData.id ||
        NostrCompetitionService.generateCompetitionId('event', eventData.name);
      const now = Math.floor(Date.now() / 1000);

      console.log(
        `📋 Using event ID: ${competitionId}${
          eventData.id ? ' (from wizard)' : ' (generated)'
        }`
      );

      // Get captain's public key based on auth method
      let captainPubkey: string;
      if (isSigner) {
        const user = await captainPrivateKeyOrSigner.user();
        captainPubkey = user.pubkey;
      } else {
        const privateKeyBytes = new Uint8Array(
          captainPrivateKeyOrSigner
            .match(/.{2}/g)
            ?.map((byte) => parseInt(byte, 16)) || []
        );
        captainPubkey = getPublicKey(privateKeyBytes);
      }

      // Create full event definition
      const eventDefinition: NostrEventDefinition = {
        ...eventData,
        id: competitionId,
        captainPubkey,
        createdAt: now,
        updatedAt: now,
        status: 'upcoming',
      };

      // Create event template with proper typing
      const tags: Array<[string, string]> = [
        ['d', competitionId],
        ['team', eventData.teamId],
        ['captain', captainPubkey], // ✅ FIX: Explicit captain tag for redundancy
        ['activity_type', eventData.activityType],
        ['competition_type', eventData.competitionType], // Deprecated: backward compat
        ['event_date', eventData.eventDate],
        ['entry_fee', eventData.entryFeesSats.toString()],
        ['max_participants', eventData.maxParticipants.toString()],
        ['require_approval', eventData.requireApproval.toString()],
        ['status', 'upcoming'],
        ['name', eventData.name],
      ];

      // ✅ NEW: Add simplified scoring_type tag if provided
      if (eventData.scoringType) {
        tags.push(['scoring_type', eventData.scoringType]);
      }

      // ✅ NEW: Add duration_minutes tag if provided (for short events)
      if (eventData.durationMinutes) {
        tags.push(['duration_minutes', eventData.durationMinutes.toString()]);
      }

      // ✅ NEW: Add scoring_mode tag if provided
      if (eventData.scoringMode) {
        tags.push(['scoring_mode', eventData.scoringMode]);
      }

      // ✅ NEW: Add team_goal tag if provided
      if (eventData.teamGoal) {
        tags.push(['team_goal', eventData.teamGoal.toString()]);
      }

      // ✅ NEW: Add recurrence tags if provided
      if (eventData.recurrence && eventData.recurrence !== 'none') {
        tags.push(['recurrence', eventData.recurrence]);
        if (eventData.recurrenceDay) {
          tags.push(['recurrence_day', eventData.recurrenceDay]);
        }
        if (eventData.recurrenceStartDate) {
          tags.push(['recurrence_start_date', eventData.recurrenceStartDate]);
        }
      }

      if (eventData.description) {
        tags.push(['description', eventData.description]);
      }
      if (eventData.targetValue) {
        tags.push(['target_value', eventData.targetValue.toString()]);
      }
      if (eventData.targetUnit) {
        tags.push(['target_unit', eventData.targetUnit]);
      }

      // Add prize pool tag if defined
      if (
        eventData.prizePoolSats !== undefined &&
        eventData.prizePoolSats !== null
      ) {
        tags.push(['prize_pool', eventData.prizePoolSats.toString()]);
      }

      // Add Lightning address tag if defined
      if (eventData.lightningAddress) {
        tags.push(['lightning_address', eventData.lightningAddress]);
      }

      // Add payment destination tags
      if (eventData.paymentDestination) {
        tags.push(['payment_destination', eventData.paymentDestination]);
      }
      if (eventData.paymentRecipientName) {
        tags.push(['payment_recipient_name', eventData.paymentRecipientName]);
      }

      // ✅ NEW: Add location tag if provided
      if (eventData.location) {
        tags.push(['location', eventData.location]);
      }

      const eventTemplate: EventTemplate = {
        kind: 30101,
        content: JSON.stringify(eventDefinition),
        tags,
        created_at: now,
      };

      // ✅ FIX: Use Global NDK for publishing (same relays as rest of app)
      console.log('📤 Publishing event to Global NDK relays...');

      // Get global NDK instance
      const ndk = await GlobalNDKService.getInstance();

      // Create NDK event
      const ndkEvent = new NDKEvent(ndk, eventTemplate);

      // Sign event based on auth method
      if (isSigner) {
        await ndkEvent.sign(captainPrivateKeyOrSigner as NDKSigner);
      } else {
        // For nsec users, create a signer from the private key
        const { NDKPrivateKeySigner } = await import('@nostr-dev-kit/ndk');
        const signer = new NDKPrivateKeySigner(
          captainPrivateKeyOrSigner as string
        );
        await ndkEvent.sign(signer);
      }

      // ✅ FIX: Debug logging - verify event structure before publishing
      console.log('✍️ Signed event ready to publish:', {
        id: ndkEvent.id,
        pubkey: ndkEvent.pubkey,
        kind: ndkEvent.kind,
        created_at: ndkEvent.created_at,
        tags: ndkEvent.tags,
        content_preview: ndkEvent.content.substring(0, 200) + '...',
      });
      console.log(
        '🔍 Event definition in content:',
        JSON.parse(ndkEvent.content)
      );

      // Publish to relays with timeout
      const publishPromise = ndkEvent.publish();
      const timeoutPromise = new Promise<Set<any>>(
        (resolve) => setTimeout(() => resolve(new Set()), 10000) // 10s timeout
      );

      const relaySet = await Promise.race([publishPromise, timeoutPromise]);
      const publishedRelayCount = relaySet.size;

      if (publishedRelayCount > 0) {
        console.log(
          `✅ Event published successfully to ${publishedRelayCount} relays:`,
          competitionId
        );

        // ✅ DEBUG: Verify tags persisted after publish
        console.log('🔍 Verifying published event has team tag:', {
          eventId: ndkEvent.id,
          teamTag: ndkEvent.tags.find((t) => t[0] === 'team'),
          captainTag: ndkEvent.tags.find((t) => t[0] === 'captain'),
          nameTag: ndkEvent.tags.find((t) => t[0] === 'name'),
          allTags: ndkEvent.tags.slice(0, 15).map((t) => `[${t[0]}, ${t[1]}]`),
        });

        // ✅ NEW: Save event locally for captain dashboard re-announcement
        try {
          const { CaptainEventStore } = await import(
            '../event/CaptainEventStore'
          );
          const competitionEvent = {
            id: competitionId,
            teamId: eventData.teamId,
            captainPubkey,
            name: eventData.name,
            description: eventData.description,
            activityType: eventData.activityType,
            scoringType: eventData.scoringType,
            metric: eventData.competitionType,
            eventDate: eventData.eventDate,
            durationMinutes: eventData.durationMinutes,
            targetDistance: eventData.targetValue,
            targetUnit: eventData.targetUnit,
            entryFeesSats: eventData.entryFeesSats,
            lightningAddress: eventData.lightningAddress,
            paymentDestination: eventData.paymentDestination,
            paymentRecipientName: eventData.paymentRecipientName,
            scoringMode: eventData.scoringMode,
            teamGoal: eventData.teamGoal,
          };
          await CaptainEventStore.saveCreatedEvent(
            competitionId,
            competitionEvent
          );
        } catch (error) {
          console.warn(
            '⚠️ Failed to save event locally (non-critical):',
            error
          );
          // Don't fail the whole operation if local save fails
        }

        return {
          eventId: ndkEvent.id,
          success: true,
          competitionId,
          message: `Event created and published to ${publishedRelayCount} Nostr relays`,
        };
      } else {
        throw new Error(
          'Failed to publish event to any relays. Please check your connection and try again.'
        );
      }
    } catch (error) {
      console.error('❌ Failed to create event:', error);
      return {
        eventId: '',
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unknown error creating event',
      };
    }
  }

  // ================================================================================
  // COMPETITION QUERYING
  // ================================================================================

  /**
   * Query competitions from Nostr relays
   */
  async queryCompetitions(
    filter: NostrCompetitionFilter
  ): Promise<NostrCompetitionSyncResult> {
    try {
      console.log('🔍 Querying competitions from Nostr relays');

      const leagues: NostrLeagueDefinition[] = [];
      const events: NostrEventDefinition[] = [];
      const errors: string[] = [];

      // Create Nostr filter
      const nostrFilter = {
        kinds: filter.kinds,
        authors: filter.authors,
        since: filter.since,
        until: filter.until,
        limit: filter.limit,
        ...(filter['#team'] && { '#team': filter['#team'] }),
        ...(filter['#activity_type'] && {
          '#activity_type': filter['#activity_type'],
        }),
        ...(filter['#status'] && { '#status': filter['#status'] }),
      };

      // Subscribe to events
      const subscriptionId = await this.relayManager.subscribeToEvents(
        [nostrFilter],
        (event: Event, relayUrl: string) => {
          try {
            // ✅ RUNSTR event validation: Check for required tags BEFORE parsing
            const hasRequiredTags =
              event.tags.some((t) => t[0] === 'team') &&
              event.tags.some((t) => t[0] === 'activity_type') &&
              event.tags.some((t) => t[0] === 'name');

            if (!hasRequiredTags) {
              // Skip non-RUNSTR events silently (no error logging)
              return;
            }

            if (event.kind === 30100) {
              // Parse league
              const leagueData = JSON.parse(
                event.content
              ) as NostrLeagueDefinition;
              leagues.push(leagueData);
            } else if (event.kind === 30101) {
              // Parse event
              const eventData = JSON.parse(
                event.content
              ) as NostrEventDefinition;
              events.push(eventData);
            }
          } catch (error) {
            // Silently skip malformed events (non-RUNSTR format)
            errors.push(`Skipped incompatible event ${event.id}`);
          }
        }
      );

      // Wait for results
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Clean up subscription
      this.relayManager.unsubscribe(subscriptionId);

      const skippedCount = errors.length;
      console.log(
        `✅ Found ${leagues.length} leagues and ${events.length} RUNSTR events (skipped ${skippedCount} non-RUNSTR events)`
      );

      return {
        leagues,
        events,
        totalCount: leagues.length + events.length,
        syncedAt: new Date().toISOString(),
        errors,
      };
    } catch (error) {
      console.error('❌ Failed to query competitions:', error);
      return {
        leagues: [],
        events: [],
        totalCount: 0,
        syncedAt: new Date().toISOString(),
        errors: [
          error instanceof Error ? error.message : 'Unknown query error',
        ],
      };
    }
  }

  /**
   * Get active competitions for a team
   */
  async getActiveCompetitionsForTeam(teamId: string): Promise<{
    leagues: NostrLeagueDefinition[];
    events: NostrEventDefinition[];
  }> {
    const now = Math.floor(Date.now() / 1000);
    const result = await this.queryCompetitions({
      kinds: [30100, 30101],
      '#team': [teamId],
      '#status': ['upcoming', 'active'],
      since: now - 30 * 24 * 60 * 60, // Last 30 days
      limit: 100,
    });

    // Filter by date for active competitions
    const nowDate = new Date();
    const activeLeagues = result.leagues.filter((league) => {
      const startDate = new Date(league.startDate);
      const endDate = new Date(league.endDate);
      return startDate <= nowDate && nowDate <= endDate;
    });

    const activeEvents = result.events.filter((event) => {
      const eventDate = new Date(event.eventDate);
      const eventStart = new Date(eventDate);
      eventStart.setHours(0, 0, 0, 0);
      const eventEnd = new Date(eventDate);
      eventEnd.setHours(23, 59, 59, 999);
      return eventStart <= nowDate && nowDate <= eventEnd;
    });

    return {
      leagues: activeLeagues,
      events: activeEvents,
    };
  }

  // ================================================================================
  // COMPETITION MANAGEMENT
  // ================================================================================

  /**
   * Update competition status
   */
  async updateCompetitionStatus(
    competitionId: string,
    newStatus: 'upcoming' | 'active' | 'completed' | 'cancelled',
    captainPrivateKey: string
  ): Promise<CompetitionPublishResult> {
    try {
      console.log(
        `🔄 Updating competition ${competitionId} status to ${newStatus}`
      );

      // First, get the existing competition
      const existingCompetitions = await this.queryCompetitions({
        kinds: [30100, 30101],
        limit: 1000, // Get all to find the right one
      });

      const league = existingCompetitions.leagues.find(
        (l) => l.id === competitionId
      );
      const event = existingCompetitions.events.find(
        (e) => e.id === competitionId
      );

      if (!league && !event) {
        throw new Error(`Competition ${competitionId} not found`);
      }

      const competition = league || event;
      const kind = league ? 30100 : 30101;

      // Update the competition data
      const updatedCompetition = {
        ...competition!,
        status: newStatus,
        updatedAt: Math.floor(Date.now() / 1000),
      };

      // Create and publish updated event
      if (kind === 30100) {
        return await this.createLeague(
          updatedCompetition as any,
          captainPrivateKey
        );
      } else {
        return await this.createEvent(
          updatedCompetition as any,
          captainPrivateKey
        );
      }
    } catch (error) {
      console.error('❌ Failed to update competition status:', error);
      return {
        eventId: '',
        success: false,
        message:
          error instanceof Error ? error.message : 'Unknown update error',
      };
    }
  }

  /**
   * Get goal type for competition scoring
   */
  getCompetitionGoalType(
    competition: NostrLeagueDefinition | NostrEventDefinition
  ): CompetitionGoalType {
    if ('duration' in competition) {
      // It's a league
      return LEAGUE_GOAL_MAPPING[competition.competitionType] || 'distance';
    } else {
      // It's an event
      return EVENT_GOAL_MAPPING[competition.competitionType] || 'distance';
    }
  }

  // ================================================================================
  // VALIDATION METHODS
  // ================================================================================

  /**
   * Check if team has active competitions
   * Returns counts of active/upcoming leagues and events
   */
  static async checkActiveCompetitions(teamId: string): Promise<{
    activeLeagues: number;
    activeEvents: number;
    activeLeagueDetails?: { name: string; endDate: string };
    activeEventDetails?: { name: string; eventDate: string };
  }> {
    try {
      const service = NostrCompetitionService.getInstance();
      const now = Math.floor(Date.now() / 1000);
      const nowDate = new Date();

      // Query competitions for this team
      const result = await service.queryCompetitions({
        kinds: [30100, 30101],
        '#team': [teamId],
        since: now - 90 * 24 * 60 * 60, // Last 90 days
        limit: 100,
      });

      // Count active/upcoming leagues
      let activeLeagues = 0;
      let activeLeagueDetails = undefined;

      for (const league of result.leagues) {
        const startDate = new Date(league.startDate);
        const endDate = new Date(league.endDate);

        // Check if league is active or upcoming
        if (endDate >= nowDate && league.status !== 'completed') {
          activeLeagues++;
          if (!activeLeagueDetails) {
            activeLeagueDetails = {
              name: league.name,
              endDate: endDate.toLocaleDateString(),
            };
          }
        }
      }

      // Count active/upcoming events
      let activeEvents = 0;
      let activeEventDetails = undefined;

      for (const event of result.events) {
        const eventDate = new Date(event.eventDate);

        // Check if event is upcoming (not past)
        if (eventDate >= nowDate && event.status !== 'completed') {
          activeEvents++;
          if (!activeEventDetails) {
            activeEventDetails = {
              name: event.name,
              eventDate: eventDate.toLocaleDateString(),
            };
          }
        }
      }

      console.log(
        `📊 Team ${teamId} has ${activeLeagues} active leagues, ${activeEvents} active events`
      );

      return {
        activeLeagues,
        activeEvents,
        activeLeagueDetails,
        activeEventDetails,
      };
    } catch (error) {
      console.error('❌ Failed to check active competitions:', error);
      // Return zeros on error to not block creation
      return { activeLeagues: 0, activeEvents: 0 };
    }
  }

  // ================================================================================
  // UTILITY METHODS
  // ================================================================================

  /**
   * Generate unique competition ID
   */
  private static generateCompetitionId(
    type: 'league' | 'event',
    name: string
  ): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const sanitizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);
    return `${type}_${sanitizedName}_${timestamp}_${random}`;
  }

  /**
   * Validate competition data
   */
  validateLeagueData(data: Partial<NostrLeagueDefinition>): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('League name is required');
    }

    if (!data.teamId) {
      errors.push('Team ID is required');
    }

    if (!data.activityType) {
      errors.push('Activity type is required');
    }

    if (!data.competitionType) {
      errors.push('Competition type is required');
    }

    if (!data.startDate || !data.endDate) {
      errors.push('Start and end dates are required');
    }

    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (start >= end) {
        errors.push('End date must be after start date');
      }
    }

    if (data.duration && data.duration <= 0) {
      errors.push('Duration must be positive');
    }

    if (data.maxParticipants && data.maxParticipants <= 0) {
      errors.push('Max participants must be positive');
    }

    return errors;
  }

  validateEventData(data: Partial<NostrEventDefinition>): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Event name is required');
    }

    if (!data.teamId) {
      errors.push('Team ID is required');
    }

    if (!data.activityType) {
      errors.push('Activity type is required');
    }

    if (!data.competitionType) {
      errors.push('Competition type is required');
    }

    if (!data.eventDate) {
      errors.push('Event date is required');
    }

    if (data.eventDate) {
      const eventDate = new Date(data.eventDate);
      const now = new Date();
      if (eventDate <= now) {
        errors.push('Event date must be in the future');
      }
    }

    if (data.maxParticipants && data.maxParticipants <= 0) {
      errors.push('Max participants must be positive');
    }

    return errors;
  }

  /**
   * Get competition statistics
   */
  async getCompetitionStats(): Promise<{
    totalLeagues: number;
    totalEvents: number;
    activeCompetitions: number;
    upcomingCompetitions: number;
  }> {
    try {
      const result = await this.queryCompetitions({
        kinds: [30100, 30101],
        limit: 1000,
      });

      const now = new Date();
      let activeCompetitions = 0;
      let upcomingCompetitions = 0;

      // Count active leagues
      result.leagues.forEach((league) => {
        const startDate = new Date(league.startDate);
        const endDate = new Date(league.endDate);

        if (startDate <= now && now <= endDate) {
          activeCompetitions++;
        } else if (startDate > now) {
          upcomingCompetitions++;
        }
      });

      // Count active events
      result.events.forEach((event) => {
        const eventDate = new Date(event.eventDate);
        const eventStart = new Date(eventDate);
        eventStart.setHours(0, 0, 0, 0);
        const eventEnd = new Date(eventDate);
        eventEnd.setHours(23, 59, 59, 999);

        if (eventStart <= now && now <= eventEnd) {
          activeCompetitions++;
        } else if (eventStart > now) {
          upcomingCompetitions++;
        }
      });

      return {
        totalLeagues: result.leagues.length,
        totalEvents: result.events.length,
        activeCompetitions,
        upcomingCompetitions,
      };
    } catch (error) {
      console.error('❌ Failed to get competition stats:', error);
      return {
        totalLeagues: 0,
        totalEvents: 0,
        activeCompetitions: 0,
        upcomingCompetitions: 0,
      };
    }
  }
}

export default NostrCompetitionService.getInstance();
