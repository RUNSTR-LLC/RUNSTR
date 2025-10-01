/**
 * Challenge Type Definitions
 * Types for 1v1 fitness challenges using Nostr kind 30000 lists
 */

export interface ChallengeMetadata {
  id: string;
  name: string;
  description?: string;
  activity: 'running' | 'walking' | 'cycling' | 'hiking' | 'swimming' | 'rowing' | 'workout';
  metric: 'distance' | 'duration' | 'count' | 'calories' | 'pace';
  target?: string; // Target value (e.g., "5000" for 5K meters)
  wager: number; // Amount in satoshis
  status: ChallengeStatus;
  createdAt: number; // Unix timestamp
  startsAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
  challengerPubkey: string;
  challengedPubkey: string;
  winnerId?: string; // Pubkey of winner when completed
}

export enum ChallengeStatus {
  PENDING = 'pending',     // Waiting for acceptance
  ACTIVE = 'active',       // Challenge accepted and ongoing
  COMPLETED = 'completed', // Challenge finished
  DECLINED = 'declined',   // Challenge rejected
  EXPIRED = 'expired',     // Challenge expired without response
  CANCELLED = 'cancelled'  // Challenge cancelled by creator
}

export interface ChallengeRequest {
  challengeId: string;
  challengerName: string;
  challengerPubkey: string;
  challengeDetails: ChallengeMetadata;
  requestedAt: number;
  expiresAt: number;
}

export interface ChallengeParticipant {
  pubkey: string;
  name: string;
  avatar?: string;
  currentProgress: number; // Current value for the metric
  lastWorkoutAt?: number; // Unix timestamp of last workout
  workoutCount: number;   // Number of workouts contributed
}

export interface ChallengeLeaderboard {
  challengeId: string;
  participants: ChallengeParticipant[];
  metric: string;
  target?: number;
  wager: number;
  status: ChallengeStatus;
  startsAt: number;
  expiresAt: number;
  leader?: string; // Pubkey of current leader
  tied: boolean;   // Whether participants are tied
}

export interface UserCompetition {
  id: string;
  name: string;
  type: 'team' | 'league' | 'event' | 'challenge';
  status: 'upcoming' | 'active' | 'completed';
  participantCount: number;
  yourRole: 'captain' | 'member' | 'challenger' | 'challenged';
  startsAt?: number;
  endsAt?: number;
  wager?: number; // For challenges
  prizePool?: number; // For leagues/events
}

// Global User Discovery Types
export interface GlobalUserSearch {
  query: string;
  results: DiscoveredNostrUser[];
  isSearching: boolean;
  searchTime?: number;
}

export interface DiscoveredNostrUser {
  pubkey: string;
  npub: string;
  name?: string;
  displayName?: string;
  nip05?: string;
  picture?: string;
  about?: string;
  lastActivity?: Date;
  activityStatus: UserActivityStatus;
}

export enum UserActivityStatus {
  ACTIVE = 'active',     // Active within 30 days
  INACTIVE = 'inactive', // No activity in 30+ days
  NEW = 'new'           // No recorded activity
}

// Activity Configuration Types
export interface ActivityConfiguration {
  activityType: ActivityType;
  metric: MetricType;
  duration: DurationOption;
  wagerAmount: number;
}

export type ActivityType = 'running' | 'walking' | 'cycling' | 'hiking' | 'swimming' | 'rowing' | 'workout';

export type MetricType = 'distance' | 'duration' | 'count' | 'calories' | 'pace';

export type DurationOption = 3 | 7 | 14 | 30; // Days

export interface MetricOption {
  value: MetricType;
  label: string;
  unit: string;
}

// Metric options per activity type
export const ACTIVITY_METRICS: Record<ActivityType, MetricOption[]> = {
  running: [
    { value: 'distance', label: 'Distance', unit: 'km' },
    { value: 'duration', label: 'Duration', unit: 'min' },
    { value: 'pace', label: 'Pace', unit: 'min/km' },
    { value: 'calories', label: 'Calories', unit: 'kcal' },
  ],
  walking: [
    { value: 'distance', label: 'Distance', unit: 'km' },
    { value: 'duration', label: 'Duration', unit: 'min' },
    { value: 'count', label: 'Steps', unit: 'steps' },
  ],
  cycling: [
    { value: 'distance', label: 'Distance', unit: 'km' },
    { value: 'duration', label: 'Duration', unit: 'min' },
    { value: 'pace', label: 'Speed', unit: 'km/h' },
  ],
  hiking: [
    { value: 'distance', label: 'Distance', unit: 'km' },
    { value: 'duration', label: 'Duration', unit: 'min' },
  ],
  swimming: [
    { value: 'distance', label: 'Distance', unit: 'm' },
    { value: 'duration', label: 'Duration', unit: 'min' },
  ],
  rowing: [
    { value: 'distance', label: 'Distance', unit: 'm' },
    { value: 'duration', label: 'Duration', unit: 'min' },
  ],
  workout: [
    { value: 'duration', label: 'Duration', unit: 'min' },
    { value: 'count', label: 'Reps', unit: 'reps' },
    { value: 'calories', label: 'Calories', unit: 'kcal' },
  ],
};

// Nostr event kinds for challenges
export const CHALLENGE_REQUEST_KIND = 1105;
export const CHALLENGE_ACCEPT_KIND = 1106;
export const CHALLENGE_DECLINE_KIND = 1107;
export const CHALLENGE_COMPLETE_KIND = 1108;