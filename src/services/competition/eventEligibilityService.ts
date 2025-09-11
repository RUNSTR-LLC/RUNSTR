/**
 * Event Eligibility Service - Auto-detect eligible events for completed workouts
 * Matches workout criteria to event parameters for seamless competition entry
 * Provides smart notifications and one-click event submission system
 */

import { NostrCompetitionService } from '../nostr/NostrCompetitionService';
import { NostrTeamService } from '../nostr/NostrTeamService';
import type { NostrWorkout } from '../../types/nostrWorkout';
import type { WorkoutType } from '../../types/workout';
import type {
  NostrEvent,
  NostrEventCompetitionType,
  NostrActivityType,
} from '../../types/nostrCompetition';

export interface EligibleEvent {
  eventId: string;
  teamId: string;
  eventName: string;
  activityType: NostrActivityType;
  competitionType: NostrEventCompetitionType;
  startDate: string;
  endDate: string;
  entryDeadline: string;
  eligibilityScore: number; // 0-100, how well workout matches event
  requiresApproval: boolean;
  entryFeeSats?: number;
  matchReason: string; // Why this workout is eligible
  competitionParameters: Record<string, any>;
}

export interface WorkoutEligibilityResult {
  workout: NostrWorkout;
  eligibleEvents: EligibleEvent[];
  totalEligibleEvents: number;
  bestMatch?: EligibleEvent;
  eligibilityCheckedAt: string;
}

export interface EventAutoEntryResult {
  success: boolean;
  eventId: string;
  entryId?: string;
  message: string;
  requiresApproval?: boolean;
}

export class EventEligibilityService {
  private static instance: EventEligibilityService;
  private nostrCompetitionService: NostrCompetitionService;
  private nostrTeamService: NostrTeamService;
  private eligibilityCache: Map<string, WorkoutEligibilityResult> = new Map();
  private cacheExpiryMs = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.nostrCompetitionService = new NostrCompetitionService();
    this.nostrTeamService = new NostrTeamService();
  }

  static getInstance(): EventEligibilityService {
    if (!EventEligibilityService.instance) {
      EventEligibilityService.instance = new EventEligibilityService();
    }
    return EventEligibilityService.instance;
  }

  /**
   * Check event eligibility for a completed workout
   */
  async checkWorkoutEligibility(
    workout: NostrWorkout,
    userTeams?: string[]
  ): Promise<WorkoutEligibilityResult> {
    const cacheKey = `${workout.nostrEventId}_${userTeams?.join(',') || 'no_teams'}`;
    
    // Check cache first
    const cached = this.eligibilityCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.eligibilityCheckedAt)) {
      console.log(`📋 Using cached eligibility for workout: ${workout.nostrEventId.slice(0, 16)}...`);
      return cached;
    }

    console.log(`🔍 Checking event eligibility for workout: ${workout.type}, ${workout.distance}m, ${workout.duration}min`);

    try {
      // Get active events from user's teams
      const activeEvents = await this.getActiveEventsFromTeams(userTeams || []);
      console.log(`📅 Found ${activeEvents.length} active events to check`);

      // Check eligibility for each event
      const eligibleEvents: EligibleEvent[] = [];
      
      for (const event of activeEvents) {
        const eligibility = this.calculateEventEligibility(workout, event);
        if (eligibility.eligible) {
          eligibleEvents.push(eligibility.eligibleEvent!);
        }
      }

      // Sort by eligibility score (best matches first)
      eligibleEvents.sort((a, b) => b.eligibilityScore - a.eligibilityScore);

      const result: WorkoutEligibilityResult = {
        workout,
        eligibleEvents,
        totalEligibleEvents: eligibleEvents.length,
        bestMatch: eligibleEvents[0],
        eligibilityCheckedAt: new Date().toISOString(),
      };

      // Cache result
      this.eligibilityCache.set(cacheKey, result);

      console.log(`✅ Eligibility check complete: ${eligibleEvents.length} eligible events found`);
      return result;

    } catch (error) {
      console.error('❌ Failed to check workout eligibility:', error);
      
      return {
        workout,
        eligibleEvents: [],
        totalEligibleEvents: 0,
        eligibilityCheckedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Get active events from user's teams
   */
  private async getActiveEventsFromTeams(teamIds: string[]): Promise<NostrEvent[]> {
    const allActiveEvents: NostrEvent[] = [];
    
    for (const teamId of teamIds) {
      try {
        // Get team's active events
        const teamEvents = await this.nostrCompetitionService.getTeamEvents(teamId, {
          activeOnly: true,
          includeExpired: false,
        });
        
        allActiveEvents.push(...teamEvents);
      } catch (error) {
        console.error(`❌ Failed to get events for team ${teamId}:`, error);
      }
    }

    // Remove duplicates and filter for events still accepting entries
    const uniqueEvents = this.deduplicateEvents(allActiveEvents);
    const openEvents = uniqueEvents.filter(event => this.isEventOpenForEntry(event));
    
    return openEvents;
  }

  /**
   * Calculate eligibility score for workout against event
   */
  private calculateEventEligibility(
    workout: NostrWorkout,
    event: NostrEvent
  ): { eligible: boolean; eligibleEvent?: EligibleEvent; reason?: string } {
    
    // Check basic activity type match
    const activityMatch = this.checkActivityTypeMatch(workout.type, event.activityType);
    if (!activityMatch.matches) {
      return { 
        eligible: false, 
        reason: `Activity type mismatch: workout is ${workout.type}, event requires ${event.activityType}` 
      };
    }

    // Check workout timing (must be within event period)
    const timingMatch = this.checkEventTiming(workout, event);
    if (!timingMatch.valid) {
      return {
        eligible: false,
        reason: timingMatch.reason || 'Workout timing does not match event period'
      };
    }

    // Calculate competition-specific eligibility score
    const competitionMatch = this.checkCompetitionCriteria(workout, event);
    
    if (competitionMatch.score > 0) {
      const eligibleEvent: EligibleEvent = {
        eventId: event.id,
        teamId: event.teamId,
        eventName: event.name,
        activityType: event.activityType,
        competitionType: event.competitionType,
        startDate: event.startDate,
        endDate: event.endDate,
        entryDeadline: event.entryDeadline || event.endDate,
        eligibilityScore: competitionMatch.score,
        requiresApproval: event.requireApproval || false,
        entryFeeSats: event.entryFeeSats,
        matchReason: competitionMatch.reason,
        competitionParameters: event.parameters || {},
      };

      return { eligible: true, eligibleEvent };
    }

    return {
      eligible: false,
      reason: competitionMatch.reason || 'Workout does not meet competition criteria'
    };
  }

  /**
   * Check if workout activity type matches event requirements
   */
  private checkActivityTypeMatch(
    workoutType: WorkoutType,
    eventActivityType: NostrActivityType
  ): { matches: boolean; confidence: number } {
    
    // Direct matches
    const directMatches: Record<WorkoutType, NostrActivityType[]> = {
      'running': ['Running'],
      'walking': ['Walking'],
      'cycling': ['Cycling'],
      'hiking': ['Walking', 'Running'], // Hiking can match both
      'gym': ['Strength Training'],
      'strength_training': ['Strength Training'],
      'yoga': ['Yoga'],
      'other': [], // Other requires manual matching
    };

    const possibleMatches = directMatches[workoutType] || [];
    
    if (possibleMatches.includes(eventActivityType)) {
      return { matches: true, confidence: 1.0 };
    }

    // Fuzzy matching for edge cases
    if (workoutType === 'other' && eventActivityType === 'Running') {
      return { matches: true, confidence: 0.5 }; // Requires user confirmation
    }

    return { matches: false, confidence: 0 };
  }

  /**
   * Check if workout timing is within event period
   */
  private checkEventTiming(
    workout: NostrWorkout,
    event: NostrEvent
  ): { valid: boolean; reason?: string } {
    
    const workoutDate = new Date(workout.startTime);
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    const entryDeadline = new Date(event.entryDeadline || event.endDate);

    // Check if workout is within event period
    if (workoutDate < eventStart) {
      return { 
        valid: false, 
        reason: `Workout completed before event started (${eventStart.toLocaleDateString()})` 
      };
    }

    if (workoutDate > eventEnd) {
      return { 
        valid: false, 
        reason: `Workout completed after event ended (${eventEnd.toLocaleDateString()})` 
      };
    }

    // Check if we're still within entry deadline
    const now = new Date();
    if (now > entryDeadline) {
      return { 
        valid: false, 
        reason: `Entry deadline has passed (${entryDeadline.toLocaleDateString()})` 
      };
    }

    return { valid: true };
  }

  /**
   * Check competition-specific criteria and calculate eligibility score
   */
  private checkCompetitionCriteria(
    workout: NostrWorkout,
    event: NostrEvent
  ): { score: number; reason: string } {
    
    const competitionType = event.competitionType;
    let score = 0;
    let reason = '';

    switch (competitionType) {
      case 'Fastest Time':
        if (workout.duration && workout.distance) {
          score = 90; // High match for time-based competitions
          reason = `Perfect match for fastest time (${workout.duration} min, ${workout.distance}m)`;
        } else {
          score = 30;
          reason = 'Missing time or distance data for fastest time competition';
        }
        break;

      case 'Longest Distance':
        if (workout.distance) {
          score = 95; // Highest match for distance competitions
          reason = `Perfect match for distance competition (${workout.distance}m)`;
        } else {
          score = 20;
          reason = 'Missing distance data for distance competition';
        }
        break;

      case 'Most Calories':
        if (workout.calories) {
          score = 85;
          reason = `Good match for calorie competition (${workout.calories} cal)`;
        } else {
          score = 25;
          reason = 'Missing calorie data for calorie competition';
        }
        break;

      case 'Best Average':
        if (workout.duration && workout.distance) {
          score = 80;
          reason = `Good match for average-based competition`;
        } else {
          score = 35;
          reason = 'Incomplete data for average-based competition';
        }
        break;

      default:
        // Generic competition
        if (workout.duration || workout.distance || workout.calories) {
          score = 60;
          reason = 'Basic workout data available for competition';
        } else {
          score = 10;
          reason = 'Limited workout data for competition';
        }
    }

    // Bonus points for complete workout data
    if (workout.heartRate) score += 5;
    if (workout.route && workout.route.length > 0) score += 5;
    if (workout.calories && workout.distance && workout.duration) score += 10;

    // Cap score at 100
    score = Math.min(score, 100);

    return { score, reason };
  }

  /**
   * Auto-enter workout into event
   */
  async enterWorkoutInEvent(
    workout: NostrWorkout,
    event: EligibleEvent,
    userPrivateKey: string
  ): Promise<EventAutoEntryResult> {
    
    console.log(`🎯 Auto-entering workout into event: ${event.eventName}`);

    try {
      // Create competition entry
      const entryData = {
        eventId: event.eventId,
        workoutData: {
          nostrEventId: workout.nostrEventId,
          type: workout.type,
          duration: workout.duration,
          distance: workout.distance,
          calories: workout.calories,
          startTime: workout.startTime,
          heartRate: workout.heartRate,
        },
        entryTimestamp: new Date().toISOString(),
        autoEntered: true,
      };

      // Submit to Nostr Competition Service
      const result = await this.nostrCompetitionService.submitEventEntry(
        entryData,
        userPrivateKey
      );

      if (result.success) {
        console.log(`✅ Auto-entry successful: ${event.eventName}`);
        return {
          success: true,
          eventId: event.eventId,
          entryId: result.entryId,
          message: `Successfully entered "${event.eventName}"!`,
          requiresApproval: event.requiresApproval,
        };
      } else {
        throw new Error(result.message || 'Entry submission failed');
      }

    } catch (error) {
      console.error(`❌ Auto-entry failed for event ${event.eventName}:`, error);
      return {
        success: false,
        eventId: event.eventId,
        message: `Failed to enter event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get suggested events for workout (top 3 best matches)
   */
  async getSuggestedEvents(
    workout: NostrWorkout,
    userTeams: string[]
  ): Promise<EligibleEvent[]> {
    
    const eligibilityResult = await this.checkWorkoutEligibility(workout, userTeams);
    
    // Return top 3 suggestions
    return eligibilityResult.eligibleEvents.slice(0, 3);
  }

  // ================================================================================
  // UTILITIES
  // ================================================================================

  /**
   * Remove duplicate events
   */
  private deduplicateEvents(events: NostrEvent[]): NostrEvent[] {
    const seen = new Set<string>();
    return events.filter(event => {
      if (seen.has(event.id)) {
        return false;
      }
      seen.add(event.id);
      return true;
    });
  }

  /**
   * Check if event is still open for entries
   */
  private isEventOpenForEntry(event: NostrEvent): boolean {
    const now = new Date();
    const entryDeadline = new Date(event.entryDeadline || event.endDate);
    return now <= entryDeadline;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cachedAt: string): boolean {
    const cacheTime = new Date(cachedAt).getTime();
    return Date.now() - cacheTime < this.cacheExpiryMs;
  }

  /**
   * Clear eligibility cache
   */
  clearCache(): void {
    console.log('🧹 Clearing event eligibility cache');
    this.eligibilityCache.clear();
  }
}

export default EventEligibilityService.getInstance();