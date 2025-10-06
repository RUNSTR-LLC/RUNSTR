/**
 * Simple Competition Service - MVP Implementation
 * Fetches leagues (kind 30100) and events (kind 30101) from Nostr
 * No caching, no complexity - just simple queries using global NDK
 */

import { GlobalNDKService } from '../nostr/GlobalNDKService';
import type { NDKFilter, NDKEvent } from '@nostr-dev-kit/ndk';

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
  name: string;
  description?: string;
  activityType: string;
  metric: string;
  eventDate: string; // ISO date
  targetDistance?: number;
  targetUnit?: string;
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
   * Get all leagues for a team
   */
  async getTeamLeagues(teamId: string): Promise<League[]> {
    console.log(`📋 Fetching leagues for team: ${teamId}`);

    try {
      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [30100],
        '#team': [teamId],
        limit: 100,
      };

      const events = await ndk.fetchEvents(filter);
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

      console.log(`✅ Found ${leagues.length} leagues for team ${teamId}`);
      return leagues;

    } catch (error) {
      console.error('Failed to fetch leagues:', error);
      return [];
    }
  }

  /**
   * Get all events for a team
   */
  async getTeamEvents(teamId: string): Promise<CompetitionEvent[]> {
    console.log(`📋 Fetching events for team: ${teamId}`);

    try {
      const ndk = await GlobalNDKService.getInstance();

      // Log connection status
      const status = GlobalNDKService.getStatus();
      console.log(`📊 GlobalNDK status: ${status.connectedRelays}/${status.relayCount} relays connected`);

      const filter: NDKFilter = {
        kinds: [30101],
        '#team': [teamId],
        limit: 100,
      };

      const events = await ndk.fetchEvents(filter);
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

      console.log(`✅ Found ${competitionEvents.length} events for team ${teamId}`);
      return competitionEvents;

    } catch (error) {
      console.error('Failed to fetch events:', error);
      return [];
    }
  }

  /**
   * Get a specific league by ID
   */
  async getLeagueById(leagueId: string): Promise<League | null> {
    console.log(`🔍 Fetching league: ${leagueId}`);

    try {
      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [30100],
        '#d': [leagueId],
        limit: 1,
      };

      const events = await ndk.fetchEvents(filter);

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
      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [30101],
        '#d': [eventId],
        limit: 1,
      };

      const events = await ndk.fetchEvents(filter);

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
   * Parse a kind 30100 Nostr event into a League
   */
  private parseLeagueEvent(event: NDKEvent): League | null {
    try {
      const getTag = (name: string) => event.tags.find(t => t[0] === name)?.[1];

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
        name: event.content || 'Unnamed League',
        description: getTag('description'),
        activityType: getTag('activity') || 'Any',
        metric: getTag('metric') || 'total_distance',
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
      const getTag = (name: string) => event.tags.find(t => t[0] === name)?.[1];

      const id = getTag('d');
      const teamId = getTag('team');

      if (!id || !teamId) {
        console.warn('Event missing required tags:', { id, teamId });
        return null;
      }

      const targetDistance = getTag('target_distance');

      return {
        id,
        teamId,
        captainPubkey: event.pubkey,
        name: event.content || 'Unnamed Event',
        description: getTag('description'),
        activityType: getTag('activity') || 'running',
        metric: getTag('metric') || 'fastest_time',
        eventDate: getTag('event_date') || new Date().toISOString(),
        targetDistance: targetDistance ? parseFloat(targetDistance) : undefined,
        targetUnit: getTag('target_unit'),
      };
    } catch (error) {
      console.error('Failed to parse event:', error);
      return null;
    }
  }
}

export default SimpleCompetitionService.getInstance();
