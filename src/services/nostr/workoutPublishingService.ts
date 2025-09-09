/**
 * WorkoutPublishingService - Nostr Event Creation for HealthKit Workouts
 * Creates both kind 1301 (structured workout data) and kind 1 (social posts) events
 * Integrates with existing NostrProtocolHandler and NostrRelayManager
 */

import { NostrProtocolHandler } from './NostrProtocolHandler';
import { nostrRelayManager } from './NostrRelayManager';
import {
  WorkoutCardGenerator,
  type WorkoutCardOptions,
} from './workoutCardGenerator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Event, EventTemplate } from 'nostr-tools';
import type { UnifiedWorkout } from '../fitness/workoutMergeService';
import type { WorkoutType } from '../../types/workout';
import { WorkoutMergeService } from '../fitness/workoutMergeService';

export interface WorkoutPublishResult {
  success: boolean;
  eventId?: string;
  error?: string;
  publishedToRelays?: number;
  failedRelays?: string[];
}

export interface SocialPostOptions {
  customMessage?: string;
  includeStats?: boolean;
  includeMotivation?: boolean;
  cardTemplate?: 'achievement' | 'progress' | 'minimal' | 'stats';
  cardOptions?: WorkoutCardOptions;
  includeCard?: boolean;
}

interface WorkoutEventData {
  type: string;
  duration: number;
  distance?: number;
  calories?: number;
  pace?: number;
  elevationGain?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  startTime: string;
  endTime: string;
}

export class WorkoutPublishingService {
  private static instance: WorkoutPublishingService;
  private protocolHandler: NostrProtocolHandler;
  private workoutMergeService: WorkoutMergeService;
  private cardGenerator: WorkoutCardGenerator;

  private constructor() {
    this.protocolHandler = new NostrProtocolHandler();
    this.workoutMergeService = WorkoutMergeService.getInstance();
    this.cardGenerator = WorkoutCardGenerator.getInstance();
  }

  static getInstance(): WorkoutPublishingService {
    if (!WorkoutPublishingService.instance) {
      WorkoutPublishingService.instance = new WorkoutPublishingService();
    }
    return WorkoutPublishingService.instance;
  }

  /**
   * Save HealthKit workout as Kind 1301 Nostr event
   */
  async saveWorkoutToNostr(
    workout: UnifiedWorkout,
    privateKeyHex: string,
    userId: string
  ): Promise<WorkoutPublishResult> {
    try {
      console.log(`🔄 Publishing workout ${workout.id} as kind 1301 event...`);

      // Convert workout to Nostr event data
      const eventData = this.convertWorkoutToEventData(workout);

      // Create and sign the kind 1301 event
      const eventTemplate: EventTemplate = {
        kind: 1301,
        content: JSON.stringify(eventData),
        tags: this.createWorkoutEventTags(workout),
        created_at: Math.floor(new Date(workout.startTime).getTime() / 1000),
      };

      const signedEvent = await this.protocolHandler.signEvent(
        eventTemplate,
        privateKeyHex
      );

      // Publish to relays
      const publishResult = await this.publishEventToRelays(signedEvent);

      if (publishResult.success) {
        // Update workout status
        await this.workoutMergeService.updateWorkoutStatus(userId, workout.id, {
          workoutId: workout.id,
          syncedToNostr: true,
          nostrEventId: signedEvent.id,
        });

        console.log(`✅ Workout saved to Nostr: ${signedEvent.id}`);
      }

      return publishResult;
    } catch (error) {
      console.error('❌ Error saving workout to Nostr:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Post workout as Kind 1 social event with workout card
   */
  async postWorkoutToSocial(
    workout: UnifiedWorkout,
    privateKeyHex: string,
    userId: string,
    options: SocialPostOptions = {}
  ): Promise<WorkoutPublishResult> {
    try {
      console.log(`🔄 Creating social post for workout ${workout.id}...`);

      // Generate social post content
      const postContent = await this.generateSocialPostContent(
        workout,
        options
      );

      // Create and sign the kind 1 event
      const eventTemplate: EventTemplate = {
        kind: 1,
        content: postContent,
        tags: this.createSocialPostTags(workout),
        created_at: Math.floor(Date.now() / 1000),
      };

      const signedEvent = await this.protocolHandler.signEvent(
        eventTemplate,
        privateKeyHex
      );

      // Publish to relays
      const publishResult = await this.publishEventToRelays(signedEvent);

      if (publishResult.success) {
        // Update workout status
        await this.workoutMergeService.updateWorkoutStatus(userId, workout.id, {
          workoutId: workout.id,
          postedToSocial: true,
        });

        console.log(`✅ Workout posted to social: ${signedEvent.id}`);
      }

      return publishResult;
    } catch (error) {
      console.error('❌ Error posting workout to social:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert UnifiedWorkout to Nostr event data format
   */
  private convertWorkoutToEventData(workout: UnifiedWorkout): WorkoutEventData {
    return {
      type: workout.type,
      duration: workout.duration,
      distance: workout.distance,
      calories: workout.calories,
      pace: workout.pace,
      elevationGain: workout.elevationGain,
      averageHeartRate: workout.heartRate?.avg,
      maxHeartRate: workout.heartRate?.max,
      startTime: workout.startTime,
      endTime: workout.endTime,
    };
  }

  /**
   * Create tags for kind 1301 workout events
   */
  private createWorkoutEventTags(workout: UnifiedWorkout): string[][] {
    const tags: string[][] = [
      ['d', workout.id], // Unique identifier
      ['activity', workout.type],
      ['source', workout.source],
    ];

    // Add distance tag if available
    if (workout.distance) {
      tags.push(['distance', workout.distance.toString()]);
    }

    // Add duration tag
    tags.push(['duration', workout.duration.toString()]);

    // Add source app if available from metadata
    if (workout.metadata?.sourceApp || workout.sourceApp) {
      tags.push([
        'app',
        workout.metadata?.sourceApp || workout.sourceApp || 'RUNSTR',
      ]);
    } else {
      tags.push(['app', 'RUNSTR']);
    }

    // Add unit system
    tags.push(['unit', workout.unitSystem || 'metric']);

    return tags;
  }

  /**
   * Create tags for kind 1 social posts
   */
  private createSocialPostTags(workout: UnifiedWorkout): string[][] {
    const tags: string[][] = [
      ['t', 'fitness'], // General fitness hashtag
      ['t', workout.type], // Activity-specific hashtag
      ['t', 'RUNSTR'], // RUNSTR brand hashtag
    ];

    // Add specific tags based on workout type
    if (workout.type === 'running') {
      tags.push(['t', 'running']);
      if (workout.distance && workout.distance >= 5000) {
        tags.push(['t', '5K']);
      }
      if (workout.distance && workout.distance >= 10000) {
        tags.push(['t', '10K']);
      }
    } else if (workout.type === 'cycling') {
      tags.push(['t', 'cycling']);
      tags.push(['t', 'bike']);
    } else if (workout.type === 'gym' || workout.type === 'strength_training') {
      tags.push(['t', 'gym']);
      tags.push(['t', 'strength']);
    }

    // Reference the original workout event if it exists
    if (workout.nostrEventId) {
      tags.push(['e', workout.nostrEventId]);
    }

    return tags;
  }

  /**
   * Generate social post content with RUNSTR branding and optional workout card
   */
  private async generateSocialPostContent(
    workout: UnifiedWorkout,
    options: SocialPostOptions
  ): Promise<string> {
    let content = '';

    // Generate workout card if requested
    if (options.includeCard !== false) {
      try {
        const cardOptions: WorkoutCardOptions = {
          template: options.cardTemplate || 'achievement',
          ...options.cardOptions,
        };

        const cardData = await this.cardGenerator.generateWorkoutCard(
          workout,
          cardOptions
        );
        console.log(
          `✅ Generated workout card for social post: ${cardData.metadata.workoutId}`
        );

        // Add card reference to content (for now, just mention it - in a full implementation,
        // this would be uploaded to a media server and referenced)
        content += `🎨 Beautiful workout card generated!\n\n`;
      } catch (error) {
        console.warn(
          '⚠️ Failed to generate workout card, proceeding without it:',
          error
        );
      }
    }

    // Custom message takes priority
    if (options.customMessage) {
      content += options.customMessage + '\n\n';
    } else {
      // Generate motivational opening
      if (options.includeMotivation !== false) {
        content += this.generateMotivationalMessage(workout) + '\n\n';
      }
    }

    // Add workout stats
    if (options.includeStats !== false) {
      content += this.formatWorkoutStats(workout) + '\n\n';
    }

    // Add achievement callouts
    const achievements = this.generateAchievements(workout);
    if (achievements) {
      content += achievements + '\n\n';
    }

    // Add RUNSTR branding
    content += '💪 Tracked with RUNSTR\n';
    content += '#fitness #' + workout.type + ' #RUNSTR';

    return content.trim();
  }

  /**
   * Generate motivational message based on workout
   */
  private generateMotivationalMessage(workout: UnifiedWorkout): string {
    const messages = {
      running: [
        'Just crushed another run! 🏃‍♂️',
        'Miles conquered, goals achieved! 🎯',
        'Every step counts toward greatness! ⚡',
        'Running toward my best self! 🌟',
      ],
      cycling: [
        'Bike ride complete! 🚴‍♂️',
        'Pedaling toward my goals! 🎯',
        'Two wheels, infinite possibilities! ⚡',
        'Cycling into a stronger me! 💪',
      ],
      gym: [
        'Gym session: COMPLETE! 💪',
        'Another step closer to my goals! 🎯',
        'Strength builds character! ⚡',
        'Iron sharpens iron! 🔥',
      ],
      walking: [
        'Walk complete! One step at a time! 🚶‍♂️',
        'Movement is medicine! 🌟',
        'Every step matters! ⚡',
        'Walking my way to wellness! 💚',
      ],
    };

    const typeMessages =
      messages[workout.type as keyof typeof messages] || messages.gym;
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  }

  /**
   * Format workout stats for social post
   */
  private formatWorkoutStats(workout: UnifiedWorkout): string {
    const stats = [];

    // Duration
    const hours = Math.floor(workout.duration / 3600);
    const minutes = Math.floor((workout.duration % 3600) / 60);
    if (hours > 0) {
      stats.push(`⏱️ ${hours}h ${minutes}m`);
    } else {
      stats.push(`⏱️ ${minutes}m`);
    }

    // Distance
    if (workout.distance) {
      const km = (workout.distance / 1000).toFixed(2);
      stats.push(`📏 ${km} km`);
    }

    // Calories
    if (workout.calories) {
      stats.push(`🔥 ${Math.round(workout.calories)} cal`);
    }

    // Heart rate
    if (workout.heartRate?.avg) {
      stats.push(`❤️ ${Math.round(workout.heartRate.avg)} bpm avg`);
    }

    return stats.join(' • ');
  }

  /**
   * Generate achievement callouts
   */
  private generateAchievements(workout: UnifiedWorkout): string | null {
    const achievements = [];

    // Distance-based achievements
    if (workout.distance) {
      const km = workout.distance / 1000;
      if (km >= 21.1) achievements.push('🏃‍♂️ Half Marathon Distance!');
      else if (km >= 10) achievements.push('🎯 10K Achievement!');
      else if (km >= 5) achievements.push('⭐ 5K Complete!');
    }

    // Duration-based achievements
    if (workout.duration >= 3600) {
      achievements.push('⏰ 1+ Hour Workout!');
    } else if (workout.duration >= 1800) {
      achievements.push('💪 30+ Minute Session!');
    }

    // Calorie achievements
    if (workout.calories && workout.calories >= 500) {
      achievements.push('🔥 500+ Calories Burned!');
    }

    return achievements.length > 0 ? achievements.join(' ') : null;
  }

  /**
   * Publish event to all connected relays
   */
  private async publishEventToRelays(
    event: Event
  ): Promise<WorkoutPublishResult> {
    try {
      const connectedRelays = nostrRelayManager.getConnectedRelays();

      if (connectedRelays.length === 0) {
        return {
          success: false,
          error: 'No connected relays available for publishing',
        };
      }

      console.log(`📡 Publishing event to ${connectedRelays.length} relays...`);

      const publishPromises = connectedRelays.map(async (relay) => {
        try {
          await nostrRelayManager.publishEvent(event);
          return { success: true, relay: relay.url };
        } catch (error) {
          console.error(`❌ Failed to publish to ${relay.url}:`, error);
          return { success: false, relay: relay.url, error: String(error) };
        }
      });

      const results = await Promise.allSettled(publishPromises);
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length;
      const failed = results.filter(
        (r) =>
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && !r.value.success)
      );

      const failedRelays = failed.map((r) =>
        r.status === 'fulfilled' ? r.value.relay : 'unknown'
      );

      return {
        success: successful > 0,
        eventId: event.id,
        publishedToRelays: successful,
        failedRelays: failedRelays.length > 0 ? failedRelays : undefined,
      };
    } catch (error) {
      console.error('❌ Error publishing event:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown publishing error',
      };
    }
  }

  /**
   * Batch publish multiple workouts
   */
  async batchSaveWorkouts(
    workouts: UnifiedWorkout[],
    privateKeyHex: string,
    userId: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{
    successful: number;
    failed: number;
    results: WorkoutPublishResult[];
  }> {
    const results: WorkoutPublishResult[] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < workouts.length; i++) {
      const workout = workouts[i];

      try {
        const result = await this.saveWorkoutToNostr(
          workout,
          privateKeyHex,
          userId
        );
        results.push(result);

        if (result.success) {
          successful++;
        } else {
          failed++;
        }

        onProgress?.(i + 1, workouts.length);

        // Small delay between publishes to avoid overwhelming relays
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    return { successful, failed, results };
  }
}

export default WorkoutPublishingService.getInstance();
