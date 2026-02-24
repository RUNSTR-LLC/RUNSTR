/**
 * Nostr Competition Types - Custom Event Kinds for Competitions
 * Defines Nostr event structures for leagues, events, and challenges
 * Uses parameterized replaceable events for updatable competition definitions
 */

import type { Event, EventTemplate } from 'nostr-tools';

// Nostr Event Kinds for Competitions
export const NOSTR_COMPETITION_KINDS = {
  LEAGUE_DEFINITION: 30100,
  EVENT_DEFINITION: 30101,
  CHALLENGE_DEFINITION: 30102,
} as const;

// Activity and Competition Types (from wizards)
export type NostrActivityType =
  | 'Running'
  | 'Walking'
  | 'Cycling'
  | 'Strength Training'
  | 'Meditation'
  | 'Yoga'
  | 'Diet';

export type NostrLeagueCompetitionType =
  | 'Total Distance'
  | 'Average Pace'
  | 'Longest Run'
  | 'Most Consistent'
  | 'Weekly Streaks'
  | 'Total Steps'
  | 'Daily Average'
  | 'Longest Ride'
  | 'Total Elevation'
  | 'Average Speed'
  | 'Total Workouts'
  | 'Total Duration'
  | 'Personal Records'
  | 'Session Count'
  | 'Pose Diversity'
  | 'Longest Session'
  | 'Nutrition Score'
  | 'Calorie Consistency'
  | 'Macro Balance'
  | 'Meal Logging';

export type NostrEventCompetitionType =
  | '5K Race'
  | '10K Race'
  | 'Half Marathon'
  | 'Marathon'
  | 'Distance Challenge'
  | 'Speed Challenge'
  | 'Duration Challenge'
  | 'Consistency Streak'
  | 'Step Count'
  | 'Elevation Gain'
  | 'Workout Count'
  | 'Personal Records'
  | 'Mindfulness Points'
  | 'Pose Mastery'
  | 'Calorie Tracking'
  | 'Macro Goals'
  | 'Nutrition Score'
  | 'Session Count'
  | 'Meal Logging';

// Simplified Event Scoring System (NEW)
export type EventScoringType = 'completion' | 'fastest_time';

// Scoring mode for leaderboards
export type ScoringMode = 'individual' | 'team-total';

export type NostrScoringFrequency = 'daily' | 'weekly' | 'total';

// Recurrence Types (for recurring events)
export type RecurrenceFrequency =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly';

export type RecurrenceDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

// League Definition (Kind 30100)
export interface NostrLeagueDefinition {
  // Core identification
  id: string; // d tag - unique identifier
  teamId: string; // team tag - associated team
  captainPubkey: string; // captain's pubkey (event author)

  // Basic info
  name: string;
  description?: string;
  activityType: NostrActivityType;
  competitionType: NostrLeagueCompetitionType;

  // Timing
  startDate: string; // ISO string
  endDate: string; // ISO string
  duration: number; // days

  // Settings
  entryFeesSats: number;
  maxParticipants: number;
  requireApproval: boolean;
  allowLateJoining: boolean;
  scoringFrequency: NostrScoringFrequency;
  prizePoolSats?: number; // Optional prize pool amount in sats

  // Status
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

// Event Definition (Kind 30101)
export interface NostrEventDefinition {
  // Core identification
  id: string; // d tag - unique identifier
  teamId: string; // team tag - associated team
  captainPubkey: string; // captain's pubkey (event author)

  // Basic info
  name: string;
  description?: string;
  activityType: NostrActivityType;
  scoringType?: EventScoringType; // NEW: Simplified scoring (completion | fastest_time)
  competitionType: NostrEventCompetitionType; // Deprecated: Keep for backward compatibility

  // Timing
  eventDate: string; // ISO string
  durationMinutes?: number; // Optional: Duration in minutes for short events (10, 120, etc.)

  // Recurrence (NEW)
  recurrence?: RecurrenceFrequency; // 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
  recurrenceDay?: RecurrenceDay; // For weekly/biweekly: which day to reset
  recurrenceStartDate?: string; // ISO string - first occurrence date

  // Settings
  entryFeesSats: number;
  maxParticipants: number;
  requireApproval: boolean;
  targetValue?: number;
  targetUnit?: string;
  prizePoolSats?: number; // Optional prize pool amount in sats
  lightningAddress?: string; // Captain's Lightning address for receiving entry fees (e.g., "captain@getalby.com")

  // Scoring
  scoringMode?: ScoringMode; // 'individual' | 'team-total' (default: individual)
  teamGoal?: number; // Optional: Team goal for team-total mode (e.g., 210 km)

  // Payment Configuration
  paymentDestination?: 'captain' | 'charity';
  paymentRecipientName?: string;

  // Location (NEW)
  location?: string; // Optional: Event location (e.g., "Central Park, NYC")

  // Pledge System (costs X daily workouts to join)
  pledgeCost?: number; // Number of daily workouts required (e.g., 5 = 500 sats worth)
  pledgeDestination?: 'captain' | 'charity'; // Where pledged rewards go
  pledgeCharityId?: string; // If destination is charity, the charity ID
  pledgeCharityName?: string; // Charity name for display
  pledgeCharityAddress?: string; // Charity Lightning address

  // Rank Gating (require minimum RUNSTR rank to join)
  minimumRank?: number; // Minimum RUNSTR rank score (e.g., 0.0001 for 'Known')
  minimumRankTier?: string; // Human-readable tier ('Emerging' | 'New' | 'Known' | 'Trusted' | 'Elite')

  // Status
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

// Challenge Definition (Kind 30102)
// SIMPLIFIED: 1-day running challenges only (5K/10K/Half/Full Marathon)
export interface NostrChallengeDefinition {
  // Core identification
  id: string; // d tag - unique identifier
  creatorPubkey: string; // challenge creator (event author)

  // Basic info
  name: string;
  description?: string;

  // Challenge config (Running only, fastest time only)
  activityType: 'running';
  distance: number; // 5, 10, 21.1, or 42.2 km (5K/10K/Half/Full Marathon)
  metric: 'fastest_time'; // Always fastest time for running challenges

  // Timing (SIMPLIFIED: Always 24 hours / 1 day)
  startDate: string; // ISO timestamp
  endDate: string; // ISO timestamp
  duration: 24; // Always 24 hours (1 day)
  challengeTime?: string; // Optional: Specific time for the run (e.g., "08:00")

  // Participants (stored directly in challenge tags, no kind 30000 list)
  participants: string[]; // All participating pubkeys (creator + opponents)
  maxParticipants: 2; // Always 2 for 1v1

  // Bitcoin (social agreement only, not enforced)
  wager: number; // sats per participant (text field only, no payment enforcement)

  // Status
  status: 'open' | 'active' | 'completed' | 'cancelled';

  // Metadata
  createdAt: number; // Unix timestamp
  updatedAt?: number; // Unix timestamp
  rawEvent?: any; // Optional NDKEvent reference
}

// Competition Event Interface (generic)
export interface NostrCompetitionEvent extends Event {
  kind: 30100 | 30101 | 30102;
  parsedContent:
    | NostrLeagueDefinition
    | NostrEventDefinition
    | NostrChallengeDefinition;
}

// League Event Template
export interface NostrLeagueEventTemplate extends EventTemplate {
  kind: 30100;
  content: string; // JSON.stringify(NostrLeagueDefinition)
  tags: Array<
    | ['d', string] // unique identifier
    | ['team', string] // team ID
    | ['activity_type', NostrActivityType]
    | ['competition_type', NostrLeagueCompetitionType]
    | ['start_date', string] // ISO string
    | ['end_date', string] // ISO string
    | ['duration', string] // days as string
    | ['entry_fee', string] // sats as string
    | ['max_participants', string]
    | ['require_approval', string] // boolean as string
    | ['allow_late_joining', string] // boolean as string
    | ['scoring_frequency', NostrScoringFrequency]
    | ['status', string]
    | ['name', string]
    | ['description', string]
    | ['prize_pool', string] // Prize pool amount as string
  >;
}

// Event Event Template
export interface NostrEventEventTemplate extends EventTemplate {
  kind: 30101;
  content: string; // JSON.stringify(NostrEventDefinition)
  tags: Array<
    | ['d', string] // unique identifier
    | ['team', string] // team ID
    | ['activity_type', NostrActivityType]
    | ['scoring_type', EventScoringType] // NEW: Simplified scoring
    | ['competition_type', NostrEventCompetitionType] // Deprecated but kept for compat
    | ['event_date', string] // ISO string
    | ['duration_minutes', string] // Optional: Duration in minutes for short events
    | ['recurrence', RecurrenceFrequency] // NEW: Recurrence frequency
    | ['recurrence_day', RecurrenceDay] // NEW: Day of week for weekly recurrence
    | ['recurrence_start_date', string] // NEW: First occurrence ISO string
    | ['entry_fee', string] // sats as string
    | ['max_participants', string]
    | ['require_approval', string] // boolean as string
    | ['status', string]
    | ['name', string]
    | ['description', string]
    | ['target_value', string]
    | ['target_unit', string]
    | ['prize_pool', string] // Prize pool amount as string
    | ['scoring_mode', ScoringMode] // 'individual' | 'team-total'
    | ['team_goal', string] // Team goal value as string
  >;
}

// Competition Query Filters
export interface NostrCompetitionFilter {
  kinds: (30100 | 30101 | 30102)[];
  authors?: string[]; // Captain pubkeys
  since?: number;
  until?: number;
  limit?: number;
  '#team'?: string[]; // Filter by team ID
  '#activity_type'?: NostrActivityType[];
  '#status'?: string[];
}

// Competition Sync Result
export interface NostrCompetitionSyncResult {
  leagues: NostrLeagueDefinition[];
  events: NostrEventDefinition[];
  totalCount: number;
  syncedAt: string;
  errors: string[];
}

// Publishing Result
export interface CompetitionPublishResult {
  eventId: string;
  success: boolean;
  message?: string;
  competitionId?: string;
}

// Competition Status Updates
export interface CompetitionStatusUpdate {
  competitionId: string;
  kind: 30100 | 30101;
  newStatus: 'upcoming' | 'active' | 'completed' | 'cancelled';
  updatedAt: number;
}

// Goal Type Mapping for Scoring
export type CompetitionGoalType =
  | 'distance'
  | 'speed'
  | 'duration'
  | 'consistency';

export interface CompetitionGoalMapping {
  [key: string]: CompetitionGoalType;
}

// Goal type mappings for leaderboard scoring
export const LEAGUE_GOAL_MAPPING: CompetitionGoalMapping = {
  'Total Distance': 'distance',
  'Average Pace': 'speed',
  'Longest Run': 'distance',
  'Most Consistent': 'consistency',
  'Weekly Streaks': 'consistency',
  'Total Steps': 'distance',
  'Daily Average': 'consistency',
  'Longest Ride': 'distance',
  'Total Elevation': 'distance',
  'Average Speed': 'speed',
  'Total Workouts': 'consistency',
  'Total Duration': 'duration',
  'Personal Records': 'speed',
  'Session Count': 'consistency',
  'Pose Diversity': 'consistency',
  'Longest Session': 'duration',
  'Nutrition Score': 'consistency',
  'Calorie Consistency': 'consistency',
  'Macro Balance': 'consistency',
  'Meal Logging': 'consistency',
};

export const EVENT_GOAL_MAPPING: CompetitionGoalMapping = {
  '5K Race': 'speed',
  '10K Race': 'speed',
  'Half Marathon': 'speed',
  Marathon: 'speed',
  'Distance Challenge': 'distance',
  'Speed Challenge': 'speed',
  'Duration Challenge': 'duration',
  'Consistency Streak': 'consistency',
  'Step Count': 'distance',
  'Elevation Gain': 'distance',
  'Workout Count': 'consistency',
  'Personal Records': 'speed',
  'Mindfulness Points': 'consistency',
  'Pose Mastery': 'consistency',
  'Calorie Tracking': 'consistency',
  'Macro Goals': 'consistency',
  'Nutrition Score': 'consistency',
  'Session Count': 'consistency',
  'Meal Logging': 'consistency',
};

// Utility type guards
export function isLeagueDefinition(obj: any): obj is NostrLeagueDefinition {
  return (
    typeof obj === 'object' &&
    typeof obj.duration === 'number' &&
    typeof obj.scoringFrequency === 'string'
  );
}

export function isEventDefinition(obj: any): obj is NostrEventDefinition {
  return (
    typeof obj === 'object' &&
    typeof obj.eventDate === 'string' &&
    !('duration' in obj)
  );
}

export function isCompetitionEvent(
  event: Event
): event is NostrCompetitionEvent {
  return [30100, 30101, 30102].includes(event.kind);
}
