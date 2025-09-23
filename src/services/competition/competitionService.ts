/**
 * Enhanced Competition Service - Nostr-based Events and Leagues with Auto-Entry Integration
 * Creates and manages 1-day events and 30-day leagues using Kind 31013
 * Integrates with team membership lists for fast participant queries
 * Phase 4: Enhanced with auto-entry system and real-time leaderboard updates
 */

import type { Event } from 'nostr-tools';
import { NostrRelayManager, nostrRelayManager } from '../nostr/NostrRelayManager';
import { NostrTeamService } from '../nostr/NostrTeamService';
import EventEligibilityService from './eventEligibilityService';
import type { NostrFilter } from '../nostr/NostrProtocolHandler';
import type { NostrTeam } from '../nostr/NostrTeamService';
import type { EligibleEvent, EventAutoEntryResult } from './eventEligibilityService';
import type { NostrWorkout } from '../../types/nostrWorkout';

export interface Competition {
  id: string;
  name: string;
  description: string;
  type: 'event' | 'league';
  teamId: string;
  captainPubkey: string;
  startTime: number;
  endTime: number;
  // Wizard-driven competition rules
  activityType: string; // Running, Walking, Cycling, etc.
  competitionType: string; // Distance Challenge, Speed Challenge, etc.
  goalType: 'distance' | 'speed' | 'duration' | 'consistency';
  goalValue?: number;
  goalUnit?: string;
  // Additional wizard settings
  entryFeesSats: number;
  maxParticipants: number;
  requireApproval: boolean;
  // League-specific settings
  scoringFrequency?: 'daily' | 'weekly' | 'total';
  allowLateJoining?: boolean;
  // Metadata
  createdAt: number;
  isActive: boolean;
  participantCount: number;
  nostrEvent: Event;
}

export interface CompetitionData {
  name: string;
  description: string;
  type: 'event' | 'league';
  // Wizard parameters
  activityType: string; // Running, Walking, Cycling, etc.
  competitionType: string; // Distance Challenge, Speed Challenge, etc.
  goalType: 'distance' | 'speed' | 'duration' | 'consistency';
  goalValue?: number;
  goalUnit?: string;
  // Timing
  startTime: number; // Required start time
  endTime?: number; // Optional end time (calculated if not provided)
  durationDays?: number; // Used to calculate end time
  // Additional settings
  entryFeesSats: number;
  maxParticipants: number;
  requireApproval: boolean;
  // League-specific settings
  scoringFrequency?: 'daily' | 'weekly' | 'total';
  allowLateJoining?: boolean;
}

export interface CompetitionParticipant {
  pubkey: string;
  name?: string;
  position?: number;
  score?: number;
  totalDistance?: number;
  totalDuration?: number;
  workoutCount?: number;
  averagePace?: number;
  lastActivity?: number;
}

export interface CompetitionLeaderboard {
  competitionId: string;
  participants: CompetitionParticipant[];
  lastUpdated: number;
  totalWorkouts: number;
}

export class CompetitionService {
  private relayManager: NostrRelayManager;
  private teamService: NostrTeamService;
  private activeCompetitions: Map<string, Competition> = new Map();
  private static instance: CompetitionService;

  constructor(relayManager?: NostrRelayManager) {
    this.relayManager = relayManager || nostrRelayManager;
    this.teamService = new NostrTeamService();
  }

  static getInstance(relayManager?: NostrRelayManager): CompetitionService {
    if (!CompetitionService.instance) {
      CompetitionService.instance = new CompetitionService(relayManager);
    }
    return CompetitionService.instance;
  }

  // ================================================================================
  // WIZARD DATA CONVERSION
  // ================================================================================

  /**
   * Convert Event wizard data to CompetitionData format
   */
  createEventCompetitionData(eventData: {
    activityType: string;
    competitionType: string;
    eventDate: Date;
    entryFeesSats: number;
    maxParticipants: number;
    requireApproval: boolean;
    eventName: string;
    description: string;
    targetValue?: number;
    targetUnit?: string;
  }): CompetitionData {
    // Convert competition type to goal type
    const goalType = this.mapCompetitionTypeToGoalType(
      eventData.competitionType
    );

    // Calculate start and end times for the day
    const startTime = Math.floor(eventData.eventDate.getTime() / 1000);
    const endTime = startTime + 24 * 60 * 60 - 1; // End of day

    return {
      name: eventData.eventName,
      description: eventData.description,
      type: 'event',
      activityType: eventData.activityType,
      competitionType: eventData.competitionType,
      goalType,
      goalValue: eventData.targetValue,
      goalUnit: eventData.targetUnit,
      startTime,
      endTime,
      durationDays: 1,
      entryFeesSats: eventData.entryFeesSats,
      maxParticipants: eventData.maxParticipants,
      requireApproval: eventData.requireApproval,
    };
  }

  /**
   * Convert League wizard data to CompetitionData format
   */
  createLeagueCompetitionData(leagueData: {
    activityType: string;
    competitionType: string;
    startDate: Date;
    endDate: Date;
    duration: number;
    entryFeesSats: number;
    maxParticipants: number;
    requireApproval: boolean;
    leagueName: string;
    description: string;
    scoringFrequency: 'daily' | 'weekly' | 'total';
    allowLateJoining: boolean;
  }): CompetitionData {
    // Convert competition type to goal type
    const goalType = this.mapCompetitionTypeToGoalType(
      leagueData.competitionType
    );

    const startTime = Math.floor(leagueData.startDate.getTime() / 1000);
    const endTime =
      Math.floor(leagueData.endDate.getTime() / 1000) + 24 * 60 * 60 - 1; // End of final day

    return {
      name: leagueData.leagueName,
      description: leagueData.description,
      type: 'league',
      activityType: leagueData.activityType,
      competitionType: leagueData.competitionType,
      goalType,
      startTime,
      endTime,
      durationDays: leagueData.duration,
      entryFeesSats: leagueData.entryFeesSats,
      maxParticipants: leagueData.maxParticipants,
      requireApproval: leagueData.requireApproval,
      scoringFrequency: leagueData.scoringFrequency,
      allowLateJoining: leagueData.allowLateJoining,
    };
  }

  /**
   * Map competition type strings to goal type enums
   */
  private mapCompetitionTypeToGoalType(
    competitionType: string
  ): 'distance' | 'speed' | 'duration' | 'consistency' {
    const lowerType = competitionType.toLowerCase();

    if (lowerType.includes('distance') || lowerType.includes('step')) {
      return 'distance';
    } else if (lowerType.includes('speed') || lowerType.includes('pace')) {
      return 'speed';
    } else if (
      lowerType.includes('duration') ||
      lowerType.includes('time') ||
      lowerType.includes('session')
    ) {
      return 'duration';
    } else if (
      lowerType.includes('streak') ||
      lowerType.includes('consistency') ||
      lowerType.includes('count')
    ) {
      return 'consistency';
    }

    // Default fallback
    return 'distance';
  }

  // ================================================================================
  // COMPETITION CREATION
  // ================================================================================

  /**
   * Prepare competition creation (Kind 31013) - requires external signing
   */
  prepareCompetitionCreation(
    team: NostrTeam,
    competitionData: CompetitionData,
    captainPubkey: string
  ) {
    console.log(
      `🏆 Preparing ${competitionData.type} creation: ${competitionData.name}`
    );

    const competitionId = this.generateCompetitionId();
    const now = Math.floor(Date.now() / 1000);

    // Use provided start/end times or calculate from duration
    const startTime = competitionData.startTime;
    const endTime =
      competitionData.endTime ||
      startTime + (competitionData.durationDays || 1) * 24 * 60 * 60;

    // Create team 'a' tag reference (team event)
    const teamATag = `33404:${team.captainId}:${team.id}`;

    const tags: string[][] = [
      ['d', competitionId], // Unique identifier for replaceable event
      ['name', competitionData.name],
      ['description', competitionData.description],
      ['type', competitionData.type],
      ['a', teamATag], // Link to team event
      ['team_id', team.id], // Direct team reference
      ['goal_type', competitionData.goalType],
      ['start_time', startTime.toString()],
      ['end_time', endTime.toString()],
      // Wizard parameters
      ['activity_type', competitionData.activityType],
      ['competition_type', competitionData.competitionType],
      ['entry_fees_sats', competitionData.entryFeesSats.toString()],
      ['max_participants', competitionData.maxParticipants.toString()],
      ['require_approval', competitionData.requireApproval.toString()],
      // Tags for discovery
      ['t', 'competition'],
      ['t', `competition-${competitionData.type}`],
      ['t', `activity-${competitionData.activityType.toLowerCase()}`],
      ['t', 'fitness'],
    ];

    // Add goal value and unit if provided
    if (competitionData.goalValue) {
      tags.push(['goal_value', competitionData.goalValue.toString()]);
    }
    if (competitionData.goalUnit) {
      tags.push(['goal_unit', competitionData.goalUnit]);
    }

    // Add league-specific parameters
    if (competitionData.type === 'league') {
      if (competitionData.scoringFrequency) {
        tags.push(['scoring_frequency', competitionData.scoringFrequency]);
      }
      if (competitionData.allowLateJoining !== undefined) {
        tags.push([
          'allow_late_joining',
          competitionData.allowLateJoining.toString(),
        ]);
      }
    }

    // Add member list reference for fast queries
    if (team.memberListId) {
      tags.push(['member_list', team.memberListId]);
      tags.push(['list_query', 'true']); // Indicates this competition uses list queries
    }

    const eventTemplate = {
      kind: 31013,
      created_at: now,
      tags,
      content: competitionData.description,
      pubkey: captainPubkey,
    };

    console.log(
      `✅ Prepared ${competitionData.type} template: ${competitionData.name}`
    );

    return {
      competitionId,
      eventTemplate,
      startTime,
      endTime,
    };
  }

  // ================================================================================
  // COMPETITION DISCOVERY
  // ================================================================================

  /**
   * Get team competitions from Nostr relays
   */
  async getTeamCompetitions(team: NostrTeam): Promise<Competition[]> {
    console.log(`🔍 Fetching competitions for team: ${team.name}`);

    try {
      const teamATag = `33404:${team.captainId}:${team.id}`;

      const filters: NostrFilter[] = [
        {
          kinds: [31013],
          '#a': [teamATag], // Competitions for this team
          since: Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60, // Last 90 days
          limit: 50,
        },
      ];

      const competitions: Competition[] = [];
      const processedIds = new Set<string>();

      const subscriptionId = await this.relayManager.subscribeToEvents(
        filters,
        (event: Event, relayUrl: string) => {
          if (processedIds.has(event.id)) return;
          processedIds.add(event.id);

          console.log(
            `📥 Competition event received from ${relayUrl}:`,
            event.id
          );

          try {
            const competition = this.parseCompetitionEvent(event, team.id);
            if (competition) {
              competitions.push(competition);
              this.activeCompetitions.set(competition.id, competition);
              console.log(`✅ Added ${competition.type}: ${competition.name}`);
            }
          } catch (error) {
            console.warn(
              `⚠️ Failed to parse competition event ${event.id}:`,
              error
            );
          }
        }
      );

      // Wait for initial results
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Clean up subscription
      this.relayManager.unsubscribe(subscriptionId);

      // Sort by start time (most recent first)
      competitions.sort((a, b) => b.startTime - a.startTime);

      console.log(
        `✅ Found ${competitions.length} competitions for team: ${team.name}`
      );
      return competitions;
    } catch (error) {
      console.error(
        `❌ Failed to fetch competitions for team ${team.name}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get active competitions (ongoing events/leagues)
   */
  async getActiveCompetitions(team: NostrTeam): Promise<Competition[]> {
    const allCompetitions = await this.getTeamCompetitions(team);
    const now = Math.floor(Date.now() / 1000);

    return allCompetitions.filter(
      (comp) => comp.startTime <= now && comp.endTime >= now
    );
  }

  /**
   * Get upcoming competitions (includes events starting today)
   */
  async getUpcomingCompetitions(team: NostrTeam): Promise<Competition[]> {
    const allCompetitions = await this.getTeamCompetitions(team);
    const now = Math.floor(Date.now() / 1000);

    // Include competitions that haven't ended yet (startTime can be today)
    return allCompetitions.filter((comp) => comp.endTime >= now);
  }

  /**
   * Subscribe to real-time competition updates
   */
  async subscribeToTeamCompetitions(
    team: NostrTeam,
    callback: (competition: Competition) => void
  ): Promise<string> {
    console.log(`🔔 Subscribing to competition updates for team: ${team.name}`);

    const teamATag = `33404:${team.captainId}:${team.id}`;

    const filters: NostrFilter[] = [
      {
        kinds: [31013],
        '#a': [teamATag],
        since: Math.floor(Date.now() / 1000), // Only new competitions from now
      },
    ];

    const subscriptionId = await this.relayManager.subscribeToEvents(
      filters,
      (event: Event, relayUrl: string) => {
        console.log(`🔔 New competition from ${relayUrl}:`, event.id);

        try {
          const competition = this.parseCompetitionEvent(event, team.id);
          if (competition) {
            this.activeCompetitions.set(competition.id, competition);
            callback(competition);
            console.log(`✅ New competition: ${competition.name}`);
          }
        } catch (error) {
          console.warn(
            `⚠️ Failed to parse competition event ${event.id}:`,
            error
          );
        }
      }
    );

    return subscriptionId;
  }

  // ================================================================================
  // COMPETITION MANAGEMENT
  // ================================================================================

  /**
   * Get competition by ID
   */
  getCompetitionById(competitionId: string): Competition | null {
    return this.activeCompetitions.get(competitionId) || null;
  }

  /**
   * Add competition to cache
   * Used to manually cache competitions created via NostrCompetitionService
   */
  addCompetitionToCache(competition: Competition): void {
    this.activeCompetitions.set(competition.id, competition);
    console.log(`✅ Cached competition: ${competition.name} (${competition.id})`);
  }

  /**
   * Check if competition is active
   */
  isCompetitionActive(competition: Competition): boolean {
    const now = Math.floor(Date.now() / 1000);
    return competition.startTime <= now && competition.endTime >= now;
  }

  /**
   * Get competition time remaining (in seconds)
   */
  getTimeRemaining(competition: Competition): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, competition.endTime - now);
  }

  /**
   * Get competition duration (in seconds)
   */
  getCompetitionDuration(competition: Competition): number {
    return competition.endTime - competition.startTime;
  }

  // ================================================================================
  // UTILITIES
  // ================================================================================

  /**
   * Parse competition event into our format
   */
  private parseCompetitionEvent(
    event: Event,
    expectedTeamId: string
  ): Competition | null {
    try {
      const tags = new Map(event.tags.map((tag) => [tag[0], tag.slice(1)]));

      const dTag = tags.get('d')?.[0];
      const name = tags.get('name')?.[0] || 'Unnamed Competition';
      const description = tags.get('description')?.[0] || '';
      const type = (tags.get('type')?.[0] as 'event' | 'league') || 'event';
      const teamId = tags.get('team_id')?.[0];
      const goalType =
        (tags.get('goal_type')?.[0] as Competition['goalType']) || 'distance';
      const startTime = parseInt(tags.get('start_time')?.[0] || '0');
      const endTime = parseInt(tags.get('end_time')?.[0] || '0');
      const goalValue = tags.get('goal_value')?.[0]
        ? parseFloat(tags.get('goal_value')![0])
        : undefined;
      const goalUnit = tags.get('goal_unit')?.[0];

      // Extract wizard parameters
      const activityType = tags.get('activity_type')?.[0] || 'Running';
      const competitionType =
        tags.get('competition_type')?.[0] || 'Distance Challenge';
      const entryFeesSats = parseInt(tags.get('entry_fees_sats')?.[0] || '0');
      const maxParticipants = parseInt(
        tags.get('max_participants')?.[0] || '50'
      );
      const requireApproval = tags.get('require_approval')?.[0] === 'true';

      // Extract league-specific parameters
      const scoringFrequency = tags.get('scoring_frequency')?.[0] as
        | 'daily'
        | 'weekly'
        | 'total'
        | undefined;
      const allowLateJoining = tags.get('allow_late_joining')?.[0] === 'true';

      // Verify this is for the expected team
      if (teamId !== expectedTeamId) {
        return null;
      }

      if (!dTag || !startTime || !endTime) {
        console.warn('Competition event missing required tags:', event.id);
        return null;
      }

      return {
        id: dTag,
        name,
        description,
        type,
        teamId: expectedTeamId,
        captainPubkey: event.pubkey,
        startTime,
        endTime,
        // Wizard parameters
        activityType,
        competitionType,
        goalType,
        goalValue,
        goalUnit,
        entryFeesSats,
        maxParticipants,
        requireApproval,
        // League-specific parameters
        scoringFrequency,
        allowLateJoining,
        // Metadata
        createdAt: event.created_at,
        isActive: this.isEventActive(startTime, endTime),
        participantCount: 0, // Will be calculated from team members
        nostrEvent: event,
      };
    } catch (error) {
      console.error('Failed to parse competition event:', error);
      return null;
    }
  }

  /**
   * Check if event time range is currently active
   */
  private isEventActive(startTime: number, endTime: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    return startTime <= now && endTime >= now;
  }

  /**
   * Generate unique competition identifier
   */
  private generateCompetitionId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear cached competitions
   */
  clearCache(): void {
    this.activeCompetitions.clear();
  }

  /**
   * Get cached competitions
   */
  getCachedCompetitions(): Competition[] {
    return Array.from(this.activeCompetitions.values());
  }
}

export default CompetitionService.getInstance();
