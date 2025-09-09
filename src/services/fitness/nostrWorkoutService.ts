/**
 * Nostr Workout Service - Core Workout Data Fetching
 * Handles fetching kind 1301 workout events from Nostr relays
 * Integrates with existing NostrRelayManager and fitness service architecture
 */

import { nostrRelayManager } from '../nostr/NostrRelayManager';
import { NostrWorkoutParser } from '../../utils/nostrWorkoutParser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Event } from 'nostr-tools';
import type {
  NostrEvent,
  NostrWorkout,
  NostrWorkoutEvent,
  NostrWorkoutFilter,
  NostrWorkoutStats,
  NostrWorkoutError,
  RelayQueryResult,
  NostrWorkoutSyncResult,
} from '../../types/nostrWorkout';
import type { WorkoutType } from '../../types/workout';

const STORAGE_KEYS = {
  WORKOUTS: 'nostr_workouts',
  STATS: 'nostr_workout_stats',
  LAST_SYNC: 'nostr_last_sync',
};

export class NostrWorkoutService {
  private static instance: NostrWorkoutService;
  private isInitialized = false;

  private constructor() {
    // Use singleton relay manager instance
  }

  static getInstance(): NostrWorkoutService {
    if (!NostrWorkoutService.instance) {
      NostrWorkoutService.instance = new NostrWorkoutService();
    }
    return NostrWorkoutService.instance;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing NostrWorkoutService...');
      // Relay manager initializes automatically
      this.isInitialized = true;
      console.log('✅ NostrWorkoutService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize NostrWorkoutService:', error);
      throw error;
    }
  }

  /**
   * Fetch user workouts from Nostr relays
   */
  async fetchUserWorkouts(
    pubkey: string,
    options: {
      since?: Date;
      until?: Date;
      limit?: number;
      userId: string;
      preserveRawEvents?: boolean;
    }
  ): Promise<NostrWorkoutSyncResult> {
    await this.initialize();

    const filter: NostrWorkoutFilter = {
      authors: [pubkey],
      kinds: [1301],
      limit: options.limit || 100,
    };

    if (options.since) {
      filter.since = Math.floor(options.since.getTime() / 1000);
    }

    if (options.until) {
      filter.until = Math.floor(options.until.getTime() / 1000);
    }

    const startTime = Date.now();
    const relayResults: RelayQueryResult[] = [];
    const errors: NostrWorkoutError[] = [];
    const parsedWorkouts: NostrWorkout[] = [];

    console.log(
      `🔍 Querying ${
        nostrRelayManager.getConnectedRelays().length
      } relays for workouts...`
    );

    // Query each relay for workout events
    const connectedRelays = nostrRelayManager.getConnectedRelays();

    for (const connection of connectedRelays) {
      const relayUrl = connection.url;
      try {
        const relayStartTime = Date.now();
        const events = await this.queryRelayForWorkouts(relayUrl, filter);
        const responseTime = Date.now() - relayStartTime;

        relayResults.push({
          relayUrl,
          status: 'success',
          eventCount: events.length,
          responseTime,
        });

        // Process events from this relay
        for (const event of events) {
          try {
            const workoutEvent = NostrWorkoutParser.parseNostrEvent(event);
            if (workoutEvent) {
              const workout = NostrWorkoutParser.convertToWorkout(
                workoutEvent,
                options.userId,
                options.preserveRawEvents
              );

              // Validate workout data
              const validationErrors =
                NostrWorkoutParser.validateWorkoutData(workout);
              if (validationErrors.length === 0) {
                parsedWorkouts.push(workout);
              } else {
                errors.push(...validationErrors);
              }
            }
          } catch (parseError) {
            errors.push(
              NostrWorkoutParser.createParseError(
                'event_parsing',
                `Failed to parse event: ${parseError}`,
                event.id,
                { relayUrl }
              )
            );
          }
        }
      } catch (relayError) {
        console.error(`❌ Failed to query relay ${relayUrl}:`, relayError);
        relayResults.push({
          relayUrl,
          status: 'error',
          eventCount: 0,
          errorMessage: String(relayError),
        });

        errors.push({
          type: 'relay_connection',
          message: `Relay query failed: ${relayError}`,
          relayUrl,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Remove duplicates based on event ID
    const uniqueWorkouts = this.deduplicateWorkouts(parsedWorkouts);

    // Store workouts locally
    await this.storeWorkouts(options.userId, uniqueWorkouts);

    const result: NostrWorkoutSyncResult = {
      status: this.determineOverallStatus(relayResults, errors),
      totalEvents: relayResults.reduce((sum, r) => sum + r.eventCount, 0),
      parsedWorkouts: uniqueWorkouts.length,
      failedEvents: errors.length,
      syncedAt: new Date().toISOString(),
      errors,
      relayResults,
    };

    console.log(
      `✅ Workout sync completed: ${uniqueWorkouts.length} workouts, ${errors.length} errors`
    );

    // Update statistics
    await this.updateWorkoutStats(
      options.userId,
      uniqueWorkouts,
      Date.now() - startTime
    );

    return result;
  }

  /**
   * Query relays for workout events using real NostrRelayManager
   */
  private async queryRelayForWorkouts(
    relayUrl: string,
    filter: NostrWorkoutFilter
  ): Promise<Event[]> {
    try {
      // Check if relay manager is connected
      if (!nostrRelayManager.hasConnectedRelays()) {
        console.warn('⚠️ No connected relays available for workout query');
        return [];
      }

      // Use the real relay manager for workout queries
      const events = await nostrRelayManager.queryWorkoutEvents(
        filter.authors?.[0] || '',
        {
          since: filter.since,
          until: filter.until,
          limit: filter.limit,
        }
      );

      console.log(
        `📥 Received ${events.length} workout events from live relays`
      );
      return events;
    } catch (error) {
      console.error(
        `❌ Failed to query workout events from live relays: ${error}`
      );
      return [];
    }
  }

  /**
   * Remove duplicate workouts based on Nostr event ID
   */
  private deduplicateWorkouts(workouts: NostrWorkout[]): NostrWorkout[] {
    const seen = new Set<string>();
    return workouts.filter((workout) => {
      if (seen.has(workout.nostrEventId)) {
        return false;
      }
      seen.add(workout.nostrEventId);
      return true;
    });
  }

  /**
   * Determine overall sync status
   */
  private determineOverallStatus(
    relayResults: RelayQueryResult[],
    errors: NostrWorkoutError[]
  ): NostrWorkoutSyncResult['status'] {
    const successfulRelays = relayResults.filter(
      (r) => r.status === 'success'
    ).length;
    const totalRelays = relayResults.length;

    if (successfulRelays === 0) {
      return 'error';
    } else if (errors.length > 0 || successfulRelays < totalRelays) {
      return 'partial_error';
    } else {
      return 'completed';
    }
  }

  /**
   * Store workouts in local storage
   */
  private async storeWorkouts(
    userId: string,
    workouts: NostrWorkout[]
  ): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.WORKOUTS}_${userId}`;

      // Get existing workouts
      const existingData = await AsyncStorage.getItem(key);
      const existingWorkouts: NostrWorkout[] = existingData
        ? JSON.parse(existingData)
        : [];

      // Merge with new workouts (removing duplicates)
      const allWorkouts = [...existingWorkouts, ...workouts];
      const uniqueWorkouts = this.deduplicateWorkouts(allWorkouts);

      // Sort by start time (newest first)
      uniqueWorkouts.sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      await AsyncStorage.setItem(key, JSON.stringify(uniqueWorkouts));

      // Update last sync timestamp
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.LAST_SYNC}_${userId}`,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('❌ Failed to store workouts:', error);
      throw new Error('Failed to store workout data locally');
    }
  }

  /**
   * Get stored workouts for user
   */
  async getStoredWorkouts(userId: string): Promise<NostrWorkout[]> {
    try {
      const key = `${STORAGE_KEYS.WORKOUTS}_${userId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Failed to get stored workouts:', error);
      return [];
    }
  }

  /**
   * Get workouts filtered by criteria
   */
  async getFilteredWorkouts(
    userId: string,
    filters: {
      activityTypes?: WorkoutType[];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<NostrWorkout[]> {
    const allWorkouts = await this.getStoredWorkouts(userId);

    let filtered = allWorkouts;

    // Filter by activity type
    if (filters.activityTypes && filters.activityTypes.length > 0) {
      filtered = filtered.filter((w) =>
        filters.activityTypes!.includes(w.type)
      );
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(
        (w) => new Date(w.startTime) >= filters.startDate!
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (w) => new Date(w.startTime) <= filters.endDate!
      );
    }

    // Apply limit
    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Update workout statistics
   */
  private async updateWorkoutStats(
    userId: string,
    workouts: NostrWorkout[],
    parseTime: number
  ): Promise<void> {
    try {
      const existing = await this.getWorkoutStats(userId);

      const activityBreakdown = workouts.reduce((acc, workout) => {
        acc[workout.type] = (acc[workout.type] || 0) + 1;
        return acc;
      }, {} as Record<WorkoutType, number>);

      const stats: NostrWorkoutStats = {
        totalImported: existing.totalImported + workouts.length,
        successRate: 100, // TODO: Calculate based on errors
        avgParseTime: parseTime / Math.max(workouts.length, 1),
        relayPerformance: existing.relayPerformance, // TODO: Update with relay metrics
        activityBreakdown: {
          ...existing.activityBreakdown,
          ...Object.fromEntries(
            Object.entries(activityBreakdown).map(([type, count]) => [
              type,
              (existing.activityBreakdown[type as WorkoutType] || 0) + count,
            ])
          ),
        },
        dateRange: {
          earliest:
            workouts.length > 0
              ? new Date(
                  Math.min(
                    ...workouts.map((w) => new Date(w.startTime).getTime()),
                    existing.dateRange.earliest
                      ? new Date(existing.dateRange.earliest).getTime()
                      : Date.now()
                  )
                ).toISOString()
              : existing.dateRange.earliest,
          latest:
            workouts.length > 0
              ? new Date(
                  Math.max(
                    ...workouts.map((w) => new Date(w.startTime).getTime()),
                    existing.dateRange.latest
                      ? new Date(existing.dateRange.latest).getTime()
                      : 0
                  )
                ).toISOString()
              : existing.dateRange.latest,
        },
        dataQuality: {
          withHeartRate:
            existing.dataQuality.withHeartRate +
            workouts.filter((w) => w.heartRate).length,
          withGPS:
            existing.dataQuality.withGPS +
            workouts.filter((w) => w.route && w.route.length > 0).length,
          withCalories:
            existing.dataQuality.withCalories +
            workouts.filter((w) => w.calories).length,
          withDistance:
            existing.dataQuality.withDistance +
            workouts.filter((w) => w.distance).length,
        },
      };

      const key = `${STORAGE_KEYS.STATS}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(stats));
    } catch (error) {
      console.error('❌ Failed to update workout stats:', error);
    }
  }

  /**
   * Get workout statistics
   */
  async getWorkoutStats(userId: string): Promise<NostrWorkoutStats> {
    try {
      const key = `${STORAGE_KEYS.STATS}_${userId}`;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        return JSON.parse(data);
      }

      // Return default stats
      return {
        totalImported: 0,
        successRate: 0,
        avgParseTime: 0,
        relayPerformance: {},
        activityBreakdown: {
          running: 0,
          cycling: 0,
          walking: 0,
          gym: 0,
          other: 0,
          hiking: 0,
          yoga: 0,
          strength_training: 0,
        },
        dateRange: {
          earliest: '',
          latest: '',
        },
        dataQuality: {
          withHeartRate: 0,
          withGPS: 0,
          withCalories: 0,
          withDistance: 0,
        },
      };
    } catch (error) {
      console.error('❌ Failed to get workout stats:', error);
      throw error;
    }
  }

  /**
   * Clear all stored data for user
   */
  async clearUserData(userId: string): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        `${STORAGE_KEYS.WORKOUTS}_${userId}`,
        `${STORAGE_KEYS.STATS}_${userId}`,
        `${STORAGE_KEYS.LAST_SYNC}_${userId}`,
      ]);
      console.log('✅ Cleared all Nostr workout data for user');
    } catch (error) {
      console.error('❌ Failed to clear user data:', error);
      throw error;
    }
  }
}

export default NostrWorkoutService.getInstance();
