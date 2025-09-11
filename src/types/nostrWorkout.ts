/**
 * Nostr Workout Types - Kind 1301 Event Processing
 * Extends existing workout types for Nostr-specific functionality
 * Integrates with existing Workout interface and fitness service architecture
 */

import type { Workout, WorkoutType } from './workout';

// Core Nostr Event Structure (Kind 1301)
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  content: string;
  tags: string[][];
  sig: string;
}

// Parsed Kind 1301 Workout Content
export interface NostrWorkoutContent {
  type: string; // Activity type
  duration: number; // Duration in seconds
  distance?: number; // Distance in meters
  pace?: number; // Pace in seconds per kilometer/mile
  calories?: number; // Energy burned
  elevationGain?: number; // Elevation gain in meters
  averageHeartRate?: number; // Average heart rate
  maxHeartRate?: number; // Maximum heart rate
  route?: NostrRoutePoint[]; // GPS route data
  startTime?: string; // Start time ISO string (from 'start' tag)
  endTime?: string; // End time ISO string (from 'end' tag)
  title?: string; // Workout title (from 'title' tag)
}

export interface NostrRoutePoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: number; // Unix timestamp
}

// Enhanced Nostr-specific workout event
export interface NostrWorkoutEvent extends NostrEvent {
  kind: 1301;
  parsedContent: NostrWorkoutContent;
  workoutId?: string; // From 'd' tag
  activityType?: WorkoutType; // Mapped activity type
  unitSystem?: 'metric' | 'imperial'; // From 'unit' tag
  location?: string; // From 'location' tag
  sourceApp?: string; // From 'app' tag
}

// Extended workout interface for Nostr data
export interface NostrWorkout extends Workout {
  source: 'nostr';
  nostrEventId: string;
  nostrPubkey: string;
  nostrCreatedAt: number;
  elevationGain?: number;
  route?: NostrRoutePoint[];
  unitSystem: 'metric' | 'imperial';
  sourceApp?: string;
  location?: string;
  rawNostrEvent?: NostrWorkoutEvent;
}

// Competition-focused Nostr workout interface
export interface NostrWorkoutCompetition {
  id: string;
  pubkey: string;
  type: string;
  startTime: string;
  endTime: string;
  duration?: number;
  distance?: number;
  unit?: string;
  calories?: number;
  metrics?: NostrWorkoutMetrics;
  rawEvent?: string;
}

export interface NostrWorkoutMetrics {
  heartRate?: {
    avg: number;
    max: number;
  };
  pace?: number;
  elevation?: number;
}

// Sync Status and Progress Types
export type NostrSyncStatus =
  | 'idle'
  | 'connecting'
  | 'syncing'
  | 'completed'
  | 'error'
  | 'partial_error';

export interface NostrWorkoutSyncResult {
  status: NostrSyncStatus;
  totalEvents: number;
  parsedWorkouts: number;
  failedEvents: number;
  syncedAt: string;
  workouts?: NostrWorkoutCompetition[]; // ✨ NEW for competition integration
  errors: NostrWorkoutError[];
  relayResults: RelayQueryResult[];
}

export interface RelayQueryResult {
  relayUrl: string;
  status: 'success' | 'error' | 'timeout';
  eventCount: number;
  errorMessage?: string;
  responseTime?: number;
}

// Error Types
export type NostrWorkoutErrorType =
  | 'relay_connection'
  | 'event_parsing'
  | 'invalid_content'
  | 'missing_data'
  | 'duplicate_event'
  | 'storage_error'
  | 'network_timeout'
  | 'delegation_error';

export interface NostrWorkoutError {
  type: NostrWorkoutErrorType;
  message: string;
  eventId?: string;
  relayUrl?: string;
  timestamp: string;
  details?: Record<string, any>;
}

// Filter Configuration
export interface NostrWorkoutFilter {
  authors?: string[]; // Array of pubkeys
  since?: number; // Unix timestamp
  until?: number; // Unix timestamp
  limit?: number; // Max events to fetch
  kinds: [1301]; // Always kind 1301 for workouts
}

// Sync Configuration
export interface NostrWorkoutSyncConfig {
  relayUrls: string[];
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  enableRealTimeSync: boolean;
  autoSyncInterval: number; // Minutes
  preserveRawEvents: boolean;
  validateHeartRate: boolean;
  duplicateDetection: boolean;
  enableCompetitionIntegration: boolean; // ✨ NEW
  competitionUpdateBatchSize: number; // ✨ NEW
  competitionSyncDelay: number; // ✨ NEW
}

// Statistics and Analytics
export interface NostrWorkoutStats {
  totalImported: number;
  successRate: number; // Percentage of successfully parsed events
  avgParseTime: number; // Average parsing time in ms
  relayPerformance: {
    [relayUrl: string]: {
      eventCount: number;
      avgResponseTime: number;
      errorRate: number;
    };
  };
  activityBreakdown: {
    [key in WorkoutType]: number;
  };
  dateRange: {
    earliest: string;
    latest: string;
  };
  dataQuality: {
    withHeartRate: number;
    withGPS: number;
    withCalories: number;
    withDistance: number;
  };
}

// Real-time Subscription Types
export interface NostrWorkoutSubscription {
  id: string;
  pubkey: string;
  relayUrls: string[];
  isActive: boolean;
  createdAt: string;
  lastEventAt?: string;
  eventCount: number;
}

export interface NostrWorkoutRealtimeEvent {
  subscription: string;
  event: NostrWorkoutEvent;
  relayUrl: string;
  receivedAt: string;
}

// Storage and Caching
export interface NostrWorkoutCache {
  userId: string;
  lastSyncAt: string;
  workoutCount: number;
  oldestEvent: string; // ISO date
  newestEvent: string; // ISO date
  relayStatus: {
    [relayUrl: string]: {
      lastConnected: string;
      status: 'connected' | 'disconnected' | 'error';
    };
  };
  syncHistory: NostrWorkoutSyncResult[];
}

// Export consolidated types for external use
export type { Workout, WorkoutType } from './workout';
