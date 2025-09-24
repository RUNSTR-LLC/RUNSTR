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

export type NostrScoringFrequency = 'daily' | 'weekly' | 'total';

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
  competitionType: NostrEventCompetitionType;
  
  // Timing
  eventDate: string; // ISO string
  
  // Settings
  entryFeesSats: number;
  maxParticipants: number;
  requireApproval: boolean;
  targetValue?: number;
  targetUnit?: string;
  prizePoolSats?: number; // Optional prize pool amount in sats

  // Status
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

// Competition Event Interface (generic)
export interface NostrCompetitionEvent extends Event {
  kind: 30100 | 30101 | 30102;
  parsedContent: NostrLeagueDefinition | NostrEventDefinition;
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
    | ['competition_type', NostrEventCompetitionType]
    | ['event_date', string] // ISO string
    | ['entry_fee', string] // sats as string
    | ['max_participants', string]
    | ['require_approval', string] // boolean as string
    | ['status', string]
    | ['name', string]
    | ['description', string]
    | ['target_value', string]
    | ['target_unit', string]
    | ['prize_pool', string] // Prize pool amount as string
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
export type CompetitionGoalType = 'distance' | 'speed' | 'duration' | 'consistency';

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
  'Marathon': 'speed',
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
  return typeof obj === 'object' && 
         typeof obj.duration === 'number' &&
         typeof obj.scoringFrequency === 'string';
}

export function isEventDefinition(obj: any): obj is NostrEventDefinition {
  return typeof obj === 'object' && 
         typeof obj.eventDate === 'string' &&
         !('duration' in obj);
}

export function isCompetitionEvent(event: Event): event is NostrCompetitionEvent {
  return [30100, 30101, 30102].includes(event.kind);
}