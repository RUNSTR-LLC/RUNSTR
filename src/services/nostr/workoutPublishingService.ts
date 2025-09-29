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
import type { Workout } from '../../types/workout';
import type { WorkoutType } from '../../types/workout';

// Extended workout interface for publishing (simplified from UnifiedWorkout)
export interface PublishableWorkout extends Workout {
  elevationGain?: number;
  unitSystem?: 'metric' | 'imperial';
  nostrEventId?: string;
  sourceApp?: string;
  canSyncToNostr?: boolean;
  canPostToSocial?: boolean;
}

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
  private cardGenerator: WorkoutCardGenerator;

  private constructor() {
    this.protocolHandler = new NostrProtocolHandler();
    this.cardGenerator = WorkoutCardGenerator.getInstance();
  }

  static getInstance(): WorkoutPublishingService {
    if (!WorkoutPublishingService.instance) {
      WorkoutPublishingService.instance = new WorkoutPublishingService();
    }
    return WorkoutPublishingService.instance;
  }

  /**
   * Save HealthKit workout as Kind 1301 Nostr event (NIP-101e compliant)
   */
  async saveWorkoutToNostr(
    workout: PublishableWorkout,
    privateKeyHex: string,
    userId: string
  ): Promise<WorkoutPublishResult> {
    try {
      console.log(`🔄 Publishing workout ${workout.id} as kind 1301 event (runstr format)...`);

      // Get public key from private key for exercise tag
      const pubkey = await this.protocolHandler.getPubkeyFromPrivate(privateKeyHex);

      // Create and sign the kind 1301 event with NIP-101e structure
      const eventTemplate: EventTemplate = {
        kind: 1301,
        content: this.generateWorkoutDescription(workout), // Plain text description
        tags: this.createNIP101eWorkoutTags(workout, pubkey),
        created_at: Math.floor(new Date(workout.startTime).getTime() / 1000),
      };

      // Validate runstr format compliance before signing
      if (!this.validateNIP101eStructure(eventTemplate)) {
        throw new Error('Event structure does not comply with runstr format');
      }

      const signedEvent = await this.protocolHandler.signEvent(
        eventTemplate,
        privateKeyHex
      );

      // Publish to relays with retry mechanism
      const publishResult = await this.publishEventToRelaysWithRetry(signedEvent);

      if (publishResult.success) {
        console.log(`✅ Workout saved to Nostr (runstr format): ${signedEvent.id}`);
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
    workout: PublishableWorkout,
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
   * Convert Workout to Nostr event data format
   */
  private convertWorkoutToEventData(workout: PublishableWorkout): WorkoutEventData {
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
   * Create runstr-compatible tags for kind 1301 workout events
   * Matches the exact format used by runstr GitHub implementation
   */
  private createNIP101eWorkoutTags(workout: PublishableWorkout, pubkey: string): string[][] {
    // Map workout type to simple exercise verb (run, walk, cycle)
    const exerciseVerb = this.getExerciseVerb(workout.type);

    // Format duration as HH:MM:SS string
    const durationFormatted = this.formatDurationHHMMSS(workout.duration);

    // Calculate distance in km or miles
    const distanceKm = workout.distance ? (workout.distance / 1000).toFixed(2) : '0';
    const distanceUnit = workout.unitSystem === 'imperial' ? 'mi' : 'km';
    const distanceValue = workout.unitSystem === 'imperial'
      ? (parseFloat(distanceKm) * 0.621371).toFixed(2)
      : distanceKm;

    const tags: string[][] = [
      ['d', workout.id], // Unique workout ID
      ['title', workout.metadata?.title || `${exerciseVerb.charAt(0).toUpperCase() + exerciseVerb.slice(1)} Workout`],
      ['exercise', exerciseVerb], // Simple activity type: run, walk, cycle
      ['distance', distanceValue, distanceUnit], // Distance with value and unit
      ['duration', durationFormatted], // HH:MM:SS format
      ['source', 'RUNSTR'], // App identification
      ['client', 'RUNSTR', '1.0.15'], // Client info with version
      ['t', this.getActivityHashtag(workout.type)], // Primary hashtag
    ];

    // Add elevation if available
    if (workout.elevationGain && workout.elevationGain > 0) {
      const elevationUnit = workout.unitSystem === 'imperial' ? 'ft' : 'm';
      const elevationValue = workout.unitSystem === 'imperial'
        ? Math.round(workout.elevationGain * 3.28084).toString()
        : Math.round(workout.elevationGain).toString();
      tags.push(['elevation_gain', elevationValue, elevationUnit]);
    }

    // Add calories if available
    if (workout.calories && workout.calories > 0) {
      tags.push(['calories', Math.round(workout.calories).toString()]);
    }

    // TODO: Add team and challenge associations when available
    // ['team', '33404:pubkey:uuid', 'relay', 'teamName']
    // ['challenge_uuid', 'uuid']

    return tags;
  }

  /**
   * Get simple exercise verb for runstr compatibility
   */
  private getExerciseVerb(workoutType: string): string {
    const type = workoutType.toLowerCase();
    if (type.includes('run') || type === 'running') return 'running';
    if (type.includes('walk') || type === 'walking') return 'walking';
    if (type.includes('cycl') || type === 'cycling' || type.includes('bike')) return 'cycling';
    if (type.includes('hik')) return 'hiking';
    if (type.includes('swim')) return 'swimming';
    if (type.includes('row')) return 'rowing';
    // Default to running for unknown types
    return 'running';
  }

  /**
   * Format duration as HH:MM:SS string for runstr compatibility
   */
  private formatDurationHHMMSS(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get activity hashtag for runstr compatibility
   */
  private getActivityHashtag(workoutType: string): string {
    const type = workoutType.toLowerCase();
    if (type.includes('run') || type === 'running') return 'Running';
    if (type.includes('walk') || type === 'walking') return 'Walking';
    if (type.includes('cycl') || type === 'cycling' || type.includes('bike')) return 'Cycling';
    if (type.includes('hik')) return 'Hiking';
    if (type.includes('swim')) return 'Swimming';
    if (type.includes('row')) return 'Rowing';
    if (type.includes('gym') || type.includes('strength')) return 'Gym';
    return 'Fitness';
  }


  /**
   * Convert date/time to Unix timestamp in seconds (NIP-101e requirement)
   */
  private toUnixSeconds(dateInput: string | Date | number): string {
    let timestamp: number;

    if (typeof dateInput === 'string') {
      timestamp = new Date(dateInput).getTime();
    } else if (typeof dateInput === 'number') {
      // Check if already in seconds (Unix timestamp)
      timestamp = dateInput < 10000000000 ? dateInput * 1000 : dateInput;
    } else if (dateInput instanceof Date) {
      timestamp = dateInput.getTime();
    } else {
      timestamp = Date.now();
    }

    return Math.floor(timestamp / 1000).toString();
  }

  /**
   * Generate human-readable workout description for content field
   * Matches runstr GitHub format
   */
  private generateWorkoutDescription(workout: PublishableWorkout): string {
    const exerciseVerb = this.getExerciseVerb(workout.type);
    const activityEmoji = this.getActivityEmoji(exerciseVerb);

    // Simple format matching runstr: "Completed a run with RUNSTR!"
    // Use the activity type directly for consistency
    let description = `Completed a ${exerciseVerb.toLowerCase()} with RUNSTR!`;

    // Optionally add notes if available
    if (workout.metadata?.notes && workout.metadata.notes.length > 0) {
      description = workout.metadata.notes;
    }

    return description;
  }

  /**
   * Get activity emoji for runstr compatibility
   */
  private getActivityEmoji(exerciseVerb: string): string {
    switch (exerciseVerb) {
      case 'running': return '🏃‍♂️';
      case 'walking': return '🚶‍♀️';
      case 'cycling': return '🚴';
      case 'hiking': return '🥾';
      case 'swimming': return '🏊‍♂️';
      case 'rowing': return '🚣';
      default: return '💪';
    }
  }

  /**
   * Format duration for human-readable description
   */
  private formatDurationForDescription(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes} minutes`;
    }
  }

  /**
   * Validate that an event template complies with runstr format
   */
  private validateNIP101eStructure(eventTemplate: EventTemplate): boolean {
    // Check that content is plain text, not JSON
    if (typeof eventTemplate.content !== 'string') {
      console.error('Validation failed: content must be a string');
      return false;
    }

    // Check for required runstr-compatible tags
    const requiredTags = ['d', 'exercise', 'distance', 'duration', 'source'];
    const tagKeys = eventTemplate.tags.map(tag => tag[0]);

    for (const required of requiredTags) {
      if (!tagKeys.includes(required)) {
        console.error(`Validation failed: missing required tag '${required}'`);
        return false;
      }
    }

    // Validate exercise tag is simple (just activity type)
    const exerciseTag = eventTemplate.tags.find(tag => tag[0] === 'exercise');
    if (!exerciseTag || exerciseTag.length !== 2) {
      console.error('Validation failed: exercise tag must be simple ["exercise", activityType]');
      return false;
    }

    // Validate exercise type is one of the expected values
    const validExerciseTypes = ['running', 'walking', 'cycling', 'hiking', 'swimming', 'rowing'];
    if (!validExerciseTypes.includes(exerciseTag[1])) {
      console.warn(`Exercise type '${exerciseTag[1]}' may not be recognized by leaderboard`);
    }

    // Validate distance tag has value and unit
    const distanceTag = eventTemplate.tags.find(tag => tag[0] === 'distance');
    if (!distanceTag || distanceTag.length !== 3) {
      console.error('Validation failed: distance tag must have value and unit');
      return false;
    }

    // Validate duration is HH:MM:SS format
    const durationTag = eventTemplate.tags.find(tag => tag[0] === 'duration');
    if (!durationTag || !/^\d{2}:\d{2}:\d{2}$/.test(durationTag[1])) {
      console.error('Validation failed: duration must be in HH:MM:SS format');
      return false;
    }

    return true;
  }

  /**
   * Create tags for kind 1 social posts
   */
  private createSocialPostTags(workout: PublishableWorkout): string[][] {
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
    workout: PublishableWorkout,
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
  private generateMotivationalMessage(workout: PublishableWorkout): string {
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
  private formatWorkoutStats(workout: PublishableWorkout): string {
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
  private generateAchievements(workout: PublishableWorkout): string | null {
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
   * Publish event to relays with retry mechanism for failures
   */
  private async publishEventToRelaysWithRetry(
    event: Event,
    maxRetries: number = 3
  ): Promise<WorkoutPublishResult> {
    let attempt = 0;
    let lastError: Error | null = null;
    let delay = 1000; // Start with 1 second delay

    while (attempt < maxRetries) {
      try {
        const result = await this.publishEventToRelays(event);

        // If at least one relay succeeded, consider it a success
        if (result.publishedToRelays && result.publishedToRelays > 0) {
          return result;
        }

        // If all relays failed, prepare for retry
        throw new Error(`All relays failed: ${result.error || 'Unknown error'}`);
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt < maxRetries) {
          console.log(`📡 Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff: 1s, 2s, 4s
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Failed to publish after all retries'
    };
  }

  /**
   * Publish event to all connected relays (single attempt)
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
    workouts: PublishableWorkout[],
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
