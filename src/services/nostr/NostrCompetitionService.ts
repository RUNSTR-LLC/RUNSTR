/**
 * Nostr Competition Service
 * Handles creation, publishing, and management of competition events (leagues/events)
 * Publishes to Nostr relays using custom event kinds 30100 (leagues) and 30101 (events)
 */

import { EventTemplate, Event, getPublicKey } from 'nostr-tools';
import { NostrProtocolHandler } from './NostrProtocolHandler';
import { NostrRelayManager, nostrRelayManager } from './NostrRelayManager';
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
   */
  static async createLeague(
    leagueData: Omit<NostrLeagueDefinition, 'id' | 'captainPubkey' | 'createdAt' | 'updatedAt' | 'status'>,
    captainPrivateKey: string
  ): Promise<CompetitionPublishResult> {
    try {
      console.log('📊 Creating league:', leagueData.name);

      // Generate unique competition ID
      const competitionId = NostrCompetitionService.generateCompetitionId('league', leagueData.name);
      const now = Math.floor(Date.now() / 1000);

      // Get captain's public key from private key
      const privateKeyBytes = new Uint8Array(
        captainPrivateKey.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []
      );
      const captainPubkey = getPublicKey(privateKeyBytes);

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

      const eventTemplate: EventTemplate = {
        kind: 30100,
        content: JSON.stringify(leagueDefinition),
        tags,
        created_at: now,
      };

      // Sign and publish event
      const service = NostrCompetitionService.getInstance();
      const signedEvent = await service.protocolHandler.signEvent(eventTemplate, captainPrivateKey);
      const publishResult = await service.relayManager.publishEvent(signedEvent);

      // Check if any relays were successful
      const hasSuccess = publishResult.successful && publishResult.successful.length > 0;

      if (hasSuccess) {
        console.log('✅ League published successfully:', competitionId);
        return {
          eventId: signedEvent.id,
          success: true,
          competitionId,
          message: 'League created and published to Nostr relays',
        };
      } else {
        const failedRelays = publishResult.failed || [];
        throw new Error(`Failed to publish league to relays: ${failedRelays.length} failed`);
      }
    } catch (error) {
      console.error('❌ Failed to create league:', error);
      return {
        eventId: '',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error creating league',
      };
    }
  }

  /**
   * Create and publish an event to Nostr relays
   */
  static async createEvent(
    eventData: Omit<NostrEventDefinition, 'id' | 'captainPubkey' | 'createdAt' | 'updatedAt' | 'status'>,
    captainPrivateKey: string
  ): Promise<CompetitionPublishResult> {
    try {
      console.log('🎯 Creating event:', eventData.name);

      // Generate unique competition ID
      const competitionId = NostrCompetitionService.generateCompetitionId('event', eventData.name);
      const now = Math.floor(Date.now() / 1000);

      // Get captain's public key from private key
      const privateKeyBytes = new Uint8Array(
        captainPrivateKey.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []
      );
      const captainPubkey = getPublicKey(privateKeyBytes);

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
        ['activity_type', eventData.activityType],
        ['competition_type', eventData.competitionType],
        ['event_date', eventData.eventDate],
        ['entry_fee', eventData.entryFeesSats.toString()],
        ['max_participants', eventData.maxParticipants.toString()],
        ['require_approval', eventData.requireApproval.toString()],
        ['status', 'upcoming'],
        ['name', eventData.name],
      ];

      if (eventData.description) {
        tags.push(['description', eventData.description]);
      }
      if (eventData.targetValue) {
        tags.push(['target_value', eventData.targetValue.toString()]);
      }
      if (eventData.targetUnit) {
        tags.push(['target_unit', eventData.targetUnit]);
      }

      const eventTemplate: EventTemplate = {
        kind: 30101,
        content: JSON.stringify(eventDefinition),
        tags,
        created_at: now,
      };

      // Sign and publish event
      const service = NostrCompetitionService.getInstance();
      const signedEvent = await service.protocolHandler.signEvent(eventTemplate, captainPrivateKey);
      const publishResult = await service.relayManager.publishEvent(signedEvent);

      // Check if any relays were successful
      const hasSuccess = publishResult.successful && publishResult.successful.length > 0;

      if (hasSuccess) {
        console.log('✅ Event published successfully:', competitionId);
        return {
          eventId: signedEvent.id,
          success: true,
          competitionId,
          message: 'Event created and published to Nostr relays',
        };
      } else {
        const failedRelays = publishResult.failed || [];
        throw new Error(`Failed to publish event to relays: ${failedRelays.length} failed`);
      }
    } catch (error) {
      console.error('❌ Failed to create event:', error);
      return {
        eventId: '',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error creating event',
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
        ...(filter['#activity_type'] && { '#activity_type': filter['#activity_type'] }),
        ...(filter['#status'] && { '#status': filter['#status'] }),
      };

      // Subscribe to events
      const subscriptionId = await this.relayManager.subscribeToEvents(
        [nostrFilter],
        (event: Event, relayUrl: string) => {
          try {
            if (event.kind === 30100) {
              // Parse league
              const leagueData = JSON.parse(event.content) as NostrLeagueDefinition;
              leagues.push(leagueData);
            } else if (event.kind === 30101) {
              // Parse event
              const eventData = JSON.parse(event.content) as NostrEventDefinition;
              events.push(eventData);
            }
          } catch (error) {
            console.error(`Failed to parse competition event ${event.id}:`, error);
            errors.push(`Failed to parse competition event: ${error}`);
          }
        }
      );

      // Wait for results
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clean up subscription
      this.relayManager.unsubscribe(subscriptionId);

      console.log(`✅ Found ${leagues.length} leagues and ${events.length} events`);

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
        errors: [error instanceof Error ? error.message : 'Unknown query error'],
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
      since: now - (30 * 24 * 60 * 60), // Last 30 days
      limit: 100,
    });

    // Filter by date for active competitions
    const nowDate = new Date();
    const activeLeagues = result.leagues.filter(league => {
      const startDate = new Date(league.startDate);
      const endDate = new Date(league.endDate);
      return startDate <= nowDate && nowDate <= endDate;
    });

    const activeEvents = result.events.filter(event => {
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
      console.log(`🔄 Updating competition ${competitionId} status to ${newStatus}`);

      // First, get the existing competition
      const existingCompetitions = await this.queryCompetitions({
        kinds: [30100, 30101],
        limit: 1000, // Get all to find the right one
      });

      const league = existingCompetitions.leagues.find(l => l.id === competitionId);
      const event = existingCompetitions.events.find(e => e.id === competitionId);

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
        return await this.createLeague(updatedCompetition as any, captainPrivateKey);
      } else {
        return await this.createEvent(updatedCompetition as any, captainPrivateKey);
      }
    } catch (error) {
      console.error('❌ Failed to update competition status:', error);
      return {
        eventId: '',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown update error',
      };
    }
  }

  /**
   * Get goal type for competition scoring
   */
  getCompetitionGoalType(competition: NostrLeagueDefinition | NostrEventDefinition): CompetitionGoalType {
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
        since: now - (90 * 24 * 60 * 60), // Last 90 days
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

      console.log(`📊 Team ${teamId} has ${activeLeagues} active leagues, ${activeEvents} active events`);

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
  private static generateCompetitionId(type: 'league' | 'event', name: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
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
      result.leagues.forEach(league => {
        const startDate = new Date(league.startDate);
        const endDate = new Date(league.endDate);
        
        if (startDate <= now && now <= endDate) {
          activeCompetitions++;
        } else if (startDate > now) {
          upcomingCompetitions++;
        }
      });

      // Count active events
      result.events.forEach(event => {
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