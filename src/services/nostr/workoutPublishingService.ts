/**
 * WorkoutPublishingService - Nostr Event Creation for HealthKit Workouts
 * Creates both kind 1301 (structured workout data) and kind 1 (social posts) events
 * Integrates with existing NostrProtocolHandler and NostrRelayManager
 */

import { NostrProtocolHandler } from './NostrProtocolHandler';
import { GlobalNDKService } from './GlobalNDKService';
import type { NDKEvent } from '@nostr-dev-kit/ndk';
import {
  WorkoutCardGenerator,
  type WorkoutCardOptions,
} from './workoutCardGenerator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Event, EventTemplate } from 'nostr-tools';
import type { Workout } from '../../types/workout';
import type { WorkoutType } from '../../types/workout';
import type { NDKSigner } from '@nostr-dev-kit/ndk';

// Extended workout interface for publishing (simplified from UnifiedWorkout)
export interface PublishableWorkout extends Workout {
  elevationGain?: number;
  unitSystem?: 'metric' | 'imperial';
  nostrEventId?: string;
  sourceApp?: string;
  canSyncToNostr?: boolean;
  canPostToSocial?: boolean;
  // Strength training fields (inherited from Workout, but explicit for clarity)
  sets?: number;
  reps?: number;
  notes?: string;
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
   * Supports both direct privateKeyHex (nsec users) and NDKSigner (Amber users)
   */
  async saveWorkoutToNostr(
    workout: PublishableWorkout,
    privateKeyHexOrSigner: string | NDKSigner,
    userId: string
  ): Promise<WorkoutPublishResult> {
    try {
      console.log(`🔄 Publishing workout ${workout.id} as kind 1301 event (runstr format)...`);

      const isSigner = typeof privateKeyHexOrSigner !== 'string';
      let pubkey: string;
      let signedEvent: Event;

      // Get public key based on auth method
      if (isSigner) {
        const user = await privateKeyHexOrSigner.user();
        pubkey = user.pubkey;
      } else {
        pubkey = await this.protocolHandler.getPubkeyFromPrivate(privateKeyHexOrSigner);
      }

      // Create the kind 1301 event with NIP-101e structure
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

      // Sign event based on auth method
      if (isSigner) {
        signedEvent = await this.protocolHandler.signEventWithSigner(
          eventTemplate,
          privateKeyHexOrSigner as NDKSigner
        );
      } else {
        signedEvent = await this.protocolHandler.signEvent(
          eventTemplate,
          privateKeyHexOrSigner as string
        );
      }

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
   * Supports both direct privateKeyHex (nsec users) and NDKSigner (Amber users)
   */
  async postWorkoutToSocial(
    workout: PublishableWorkout,
    privateKeyHexOrSigner: string | NDKSigner,
    userId: string,
    options: SocialPostOptions = {}
  ): Promise<WorkoutPublishResult> {
    try {
      console.log(`🔄 Creating social post for workout ${workout.id}...`);

      const isSigner = typeof privateKeyHexOrSigner !== 'string';

      // Generate social post content
      const postContent = await this.generateSocialPostContent(
        workout,
        options
      );

      // Create the kind 1 event
      const eventTemplate: EventTemplate = {
        kind: 1,
        content: postContent,
        tags: this.createSocialPostTags(workout),
        created_at: Math.floor(Date.now() / 1000),
      };

      // Sign event based on auth method
      let signedEvent: Event;
      if (isSigner) {
        signedEvent = await this.protocolHandler.signEventWithSigner(
          eventTemplate,
          privateKeyHexOrSigner as NDKSigner
        );
      } else {
        signedEvent = await this.protocolHandler.signEvent(
          eventTemplate,
          privateKeyHexOrSigner as string
        );
      }

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

    // Get specific exercise name for better title
    const specificExercise = this.getSpecificExerciseName(workout);
    const title = specificExercise
      ? `${specificExercise.charAt(0).toUpperCase() + specificExercise.slice(1)}`
      : `${exerciseVerb.charAt(0).toUpperCase() + exerciseVerb.slice(1)} Workout`;

    // Start with required tags (always present)
    const tags: string[][] = [
      ['d', workout.id], // Unique workout ID
      ['title', title],
      ['exercise', exerciseVerb], // Simple activity type: running, yoga, strength, etc.
      ['duration', durationFormatted], // HH:MM:SS format (always included)
      ['source', 'RUNSTR'], // App identification
      ['client', 'RUNSTR', '0.1.7'], // Client info with version
      ['t', this.getActivityHashtag(workout.type)], // Primary hashtag
    ];

    // Add distance for cardio activities (running, cycling, treadmill, etc.)
    if (workout.distance && workout.distance > 0) {
      const distanceKm = (workout.distance / 1000).toFixed(2);
      const distanceUnit = workout.unitSystem === 'imperial' ? 'mi' : 'km';
      const distanceValue = workout.unitSystem === 'imperial'
        ? (parseFloat(distanceKm) * 0.621371).toFixed(2)
        : distanceKm;
      tags.push(['distance', distanceValue, distanceUnit]);
    }

    // Add elevation if available (for running, hiking, cycling)
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

    // Add sets and reps for strength training workouts (pushups, pullups, etc.)
    if (workout.sets && workout.sets > 0) {
      tags.push(['sets', workout.sets.toString()]);
    }
    if (workout.reps && workout.reps > 0) {
      tags.push(['reps', workout.reps.toString()]);
    }

    // TODO: Add team and challenge associations when available
    // ['team', '33404:pubkey:uuid', 'relay', 'teamName']
    // ['challenge_uuid', 'uuid']

    return tags;
  }

  /**
   * Get simple exercise verb for in-app competitions
   * Supports cardio, strength, and wellness activities
   */
  private getExerciseVerb(workoutType: string): string {
    const type = workoutType.toLowerCase();
    // Cardio activities
    if (type.includes('run') || type === 'running') return 'running';
    if (type.includes('walk') || type === 'walking') return 'walking';
    if (type.includes('cycl') || type === 'cycling' || type.includes('bike')) return 'cycling';
    if (type.includes('hik')) return 'hiking';
    if (type.includes('swim')) return 'swimming';
    if (type.includes('row')) return 'rowing';
    // Strength activities
    if (type.includes('strength') || type.includes('gym') || type.includes('weight')) return 'strength';
    if (type.includes('pushup') || type.includes('pullup') || type.includes('situp')) return 'strength';
    // Wellness activities
    if (type.includes('yoga')) return 'yoga';
    if (type.includes('meditation')) return 'meditation';
    // Default to 'other' for unrecognized types
    return 'other';
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
   * Get activity hashtag for in-app competitions
   * Supports cardio, strength, and wellness activities
   */
  private getActivityHashtag(workoutType: string): string {
    const type = workoutType.toLowerCase();
    // Cardio hashtags
    if (type.includes('run') || type === 'running') return 'Running';
    if (type.includes('walk') || type === 'walking') return 'Walking';
    if (type.includes('cycl') || type === 'cycling' || type.includes('bike')) return 'Cycling';
    if (type.includes('hik')) return 'Hiking';
    if (type.includes('swim')) return 'Swimming';
    if (type.includes('row')) return 'Rowing';
    // Strength hashtags
    if (type.includes('gym') || type.includes('strength') || type.includes('weight')) return 'Strength';
    if (type.includes('pushup') || type.includes('pullup') || type.includes('situp')) return 'Strength';
    // Wellness hashtags
    if (type.includes('yoga')) return 'Yoga';
    if (type.includes('meditation')) return 'Meditation';
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
    const specificExercise = this.getSpecificExerciseName(workout);

    // Priority 1: User's custom notes (if not auto-generated from preset)
    if (workout.notes && !this.isAutoGeneratedNote(workout.notes)) {
      return workout.notes;
    }
    if (workout.metadata?.notes && workout.metadata.notes.length > 0) {
      return workout.metadata.notes;
    }

    // Priority 2: Strength workouts with sets/reps and specific exercise name
    if ((workout.sets || workout.reps) && exerciseVerb === 'strength' && specificExercise) {
      if (workout.reps && workout.sets) {
        return `Completed ${workout.reps} ${specificExercise} in ${workout.sets} sets with RUNSTR!`;
      } else if (workout.reps) {
        return `Completed ${workout.reps} ${specificExercise} with RUNSTR!`;
      }
    }

    // Priority 3: Any workout with a specific exercise name (yoga, meditation, treadmill, etc.)
    if (specificExercise) {
      return `Completed a ${specificExercise} with RUNSTR!`;
    }

    // Priority 4: Generic descriptions with proper grammar
    switch (exerciseVerb) {
      case 'running':
        return 'Completed a run with RUNSTR!';
      case 'walking':
        return 'Completed a walk with RUNSTR!';
      case 'cycling':
        return 'Completed a bike ride with RUNSTR!';
      case 'hiking':
        return 'Completed a hike with RUNSTR!';
      case 'swimming':
        return 'Completed a swim with RUNSTR!';
      case 'rowing':
        return 'Completed a rowing session with RUNSTR!';
      case 'strength':
        return 'Completed a strength training workout with RUNSTR!';
      case 'yoga':
        return 'Completed a yoga session with RUNSTR!';
      case 'meditation':
        return 'Completed a meditation session with RUNSTR!';
      default:
        return 'Completed a workout with RUNSTR!';
    }
  }

  /**
   * Check if notes field is auto-generated from preset name
   * Auto-generated notes are just the exercise name (e.g., "Pushups", "Yoga")
   */
  private isAutoGeneratedNote(notes: string): boolean {
    const autoGenerated = ['pushups', 'pullups', 'situps', 'yoga', 'meditation', 'treadmill', 'weight training', 'stretching'];
    return autoGenerated.includes(notes.toLowerCase().split(':')[0]);
  }

  /**
   * Extract specific exercise name from workout metadata or type
   * Returns exercise name like "pushups", "pullups", "yoga session", etc.
   */
  private getSpecificExerciseName(workout: PublishableWorkout): string | null {
    // Check notes first (where we store the specific exercise name from manual entry)
    if (workout.notes) {
      const notes = workout.notes.toLowerCase();
      // Strength exercises
      if (notes.includes('pushup')) return 'pushups';
      if (notes.includes('pullup')) return 'pullups';
      if (notes.includes('situp') || notes.includes('sit-up')) return 'situps';
      if (notes.includes('squat')) return 'squats';
      if (notes.includes('burpee')) return 'burpees';
      if (notes.includes('weight training') || notes.startsWith('weights')) return 'weight training';
      // Cardio exercises
      if (notes.includes('treadmill')) return 'treadmill run';
      // Wellness activities
      if (notes.startsWith('yoga')) return 'yoga session';
      if (notes.startsWith('meditation')) return 'meditation session';
      if (notes.startsWith('stretching')) return 'stretching session';
    }

    // Check metadata (from manual entry screen)
    if (workout.metadata?.title) {
      const title = workout.metadata.title.toLowerCase();
      // Strength exercises
      if (title.includes('pushup')) return 'pushups';
      if (title.includes('pullup')) return 'pullups';
      if (title.includes('situp') || title.includes('sit-up')) return 'situps';
      if (title.includes('squat')) return 'squats';
      if (title.includes('burpee')) return 'burpees';
      if (title.includes('weight training') || title.includes('weights')) return 'weight training';
      // Cardio exercises
      if (title.includes('treadmill')) return 'treadmill run';
      // Wellness activities
      if (title.includes('yoga')) return 'yoga session';
      if (title.includes('meditation')) return 'meditation session';
      if (title.includes('stretching')) return 'stretching session';
    }

    // Check workout type string
    const typeStr = workout.type.toLowerCase();
    if (typeStr.includes('pushup')) return 'pushups';
    if (typeStr.includes('pullup')) return 'pullups';
    if (typeStr.includes('situp') || typeStr.includes('sit-up')) return 'situps';
    if (typeStr.includes('squat')) return 'squats';
    if (typeStr.includes('burpee')) return 'burpees';

    // Check sourceApp for exercise type
    if (workout.sourceApp) {
      const sourceStr = workout.sourceApp.toLowerCase();
      if (sourceStr.includes('pushup')) return 'pushups';
      if (sourceStr.includes('pullup')) return 'pullups';
      if (sourceStr.includes('situp')) return 'situps';
      if (sourceStr.includes('weight')) return 'weight training';
      if (sourceStr.includes('treadmill')) return 'treadmill run';
    }

    return null;
  }

  /**
   * Get activity emoji for runstr compatibility
   */
  private getActivityEmoji(exerciseVerb: string): string {
    switch (exerciseVerb) {
      case 'running': return '🏃‍♂️💨';
      case 'walking': return '🚶‍♀️';
      case 'cycling': return '🚴';
      case 'hiking': return '🥾';
      case 'swimming': return '🏊‍♂️';
      case 'rowing': return '🚣';
      case 'yoga': return '🧘';
      case 'meditation': return '🧘‍♂️';
      case 'strength': return '💪';
      default: return '💪';
    }
  }

  /**
   * Get readable workout type for social posts
   */
  private getReadableWorkoutType(workoutType: string): string {
    const type = workoutType.toLowerCase();
    if (type.includes('run') || type === 'running') return 'run';
    if (type.includes('walk') || type === 'walking') return 'walk';
    if (type.includes('cycl') || type === 'cycling' || type.includes('bike')) return 'bike ride';
    if (type.includes('hik')) return 'hike';
    if (type.includes('swim')) return 'swim';
    if (type.includes('row')) return 'rowing session';
    if (type.includes('gym') || type.includes('strength')) return 'gym workout';
    if (type.includes('yoga')) return 'yoga';
    if (type.includes('meditation')) return 'meditation';
    if (type.includes('stretch')) return 'stretching';
    return 'workout';
  }

  /**
   * Format duration for social posts (MM:SS or HH:MM:SS)
   */
  private formatDurationForPost(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Calculate pace (min:sec per km or mi)
   */
  private calculatePace(distanceMeters: number, durationSeconds: number, unitSystem?: 'metric' | 'imperial'): string {
    if (distanceMeters <= 0 || durationSeconds <= 0) return 'N/A';

    const distanceKm = distanceMeters / 1000;
    const distanceMiles = distanceKm * 0.621371;

    const minutesPerUnit = unitSystem === 'imperial'
      ? durationSeconds / 60 / distanceMiles
      : durationSeconds / 60 / distanceKm;

    const paceMinutes = Math.floor(minutesPerUnit);
    const paceSeconds = Math.round((minutesPerUnit - paceMinutes) * 60);

    const unit = unitSystem === 'imperial' ? '/mi' : '/km';
    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} ${unit}`;
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

    // Check for required runstr-compatible tags (distance is optional now)
    const requiredTags = ['d', 'exercise', 'duration', 'source'];
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

    // Validate exercise type is one of the supported values for in-app competitions
    const validExerciseTypes = ['running', 'walking', 'cycling', 'hiking', 'swimming', 'rowing', 'strength', 'yoga', 'meditation', 'other'];
    if (!validExerciseTypes.includes(exerciseTag[1])) {
      console.warn(`Exercise type '${exerciseTag[1]}' is non-standard - competitions may not recognize it`);
    }

    // Validate distance tag if present (optional for wellness activities)
    const distanceTag = eventTemplate.tags.find(tag => tag[0] === 'distance');
    if (distanceTag && distanceTag.length !== 3) {
      console.error('Validation failed: distance tag must have value and unit when present');
      return false;
    }

    // Validate duration is HH:MM:SS format (always required)
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
   * Generate social post content with clean format
   */
  private async generateSocialPostContent(
    workout: PublishableWorkout,
    options: SocialPostOptions
  ): Promise<string> {
    let content = '';

    // Custom message takes priority
    if (options.customMessage) {
      content = options.customMessage + '\n\n';
    } else {
      // Generate clean header with specific exercise details
      const exerciseVerb = this.getExerciseVerb(workout.type);
      const activityEmoji = this.getActivityEmoji(exerciseVerb);
      const specificExercise = this.getSpecificExerciseName(workout);

      // For strength workouts with sets/reps and specific exercise, create detailed header
      if ((workout.sets || workout.reps) && exerciseVerb === 'strength' && specificExercise) {
        if (workout.reps && workout.sets) {
          content = `Completed ${workout.reps} ${specificExercise} in ${workout.sets} sets with RUNSTR! ${activityEmoji}\n\n`;
        } else if (workout.reps) {
          content = `Completed ${workout.reps} ${specificExercise} with RUNSTR! ${activityEmoji}\n\n`;
        } else {
          content = `Completed ${specificExercise} with RUNSTR! ${activityEmoji}\n\n`;
        }
      }
      // For any workout with a specific exercise name (yoga, meditation, treadmill, etc.)
      else if (specificExercise) {
        content = `Completed ${specificExercise} with RUNSTR! ${activityEmoji}\n\n`;
      }
      // Generic format with readable workout type
      else {
        const workoutType = this.getReadableWorkoutType(workout.type);
        content = `Just completed ${workoutType} with RUNSTR! ${activityEmoji}\n\n`;
      }
    }

    // Add workout stats in vertical format
    content += this.formatWorkoutStats(workout) + '\n\n';

    // Add hashtags
    const activityHashtag = this.getActivityHashtag(workout.type);
    content += `#RUNSTR #${activityHashtag}`;

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
   * Format workout stats for social post in vertical list format
   */
  private formatWorkoutStats(workout: PublishableWorkout): string {
    const stats = [];

    // Strength training stats (sets/reps) - show first for strength workouts
    if (workout.reps && workout.reps > 0) {
      stats.push(`💪 Reps: ${workout.reps}`);
    }
    if (workout.sets && workout.sets > 0) {
      stats.push(`🔢 Sets: ${workout.sets}`);
    }

    // Duration - format as HH:MM:SS or MM:SS
    const durationFormatted = this.formatDurationForPost(workout.duration);
    stats.push(`⏱️ Duration: ${durationFormatted}`);

    // Distance
    if (workout.distance && workout.distance > 0) {
      const distanceKm = (workout.distance / 1000).toFixed(2);
      const distanceDisplay = workout.unitSystem === 'imperial'
        ? `${(parseFloat(distanceKm) * 0.621371).toFixed(2)} mi`
        : `${distanceKm} km`;
      stats.push(`📏 Distance: ${distanceDisplay}`);

      // Pace - only if we have both distance and duration
      if (workout.duration > 0) {
        const paceStr = this.calculatePace(workout.distance, workout.duration, workout.unitSystem);
        stats.push(`⚡ Pace: ${paceStr}`);
      }
    }

    // Calories
    if (workout.calories && workout.calories > 0) {
      stats.push(`🔥 Calories: ${Math.round(workout.calories)} kcal`);
    }

    // Elevation gain
    if (workout.elevationGain && workout.elevationGain > 0) {
      const elevationDisplay = workout.unitSystem === 'imperial'
        ? `${Math.round(workout.elevationGain * 3.28084)} ft`
        : `${Math.round(workout.elevationGain)} m`;
      stats.push(`🏔️ Elevation Gain: ${elevationDisplay}`);
    }

    return stats.join('\n');
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
      // Get GlobalNDK instance
      const ndk = await GlobalNDKService.getInstance();

      if (!GlobalNDKService.isConnected()) {
        return {
          success: false,
          error: 'No connected relays available for publishing',
        };
      }

      const status = GlobalNDKService.getStatus();
      console.log(`📡 Publishing event to ${status.connectedRelays} relays...`);

      // Convert Event to NDKEvent
      const ndkEvent: NDKEvent = new (ndk.constructor as any).Event(ndk, event);

      // Publish to all connected relays
      try {
        await ndkEvent.publish();
        console.log(`✅ Event published successfully to ${status.connectedRelays} relays`);

        return {
          success: true,
          eventId: event.id,
          publishedToRelays: status.connectedRelays,
        };
      } catch (error) {
        console.error(`❌ Failed to publish event:`, error);
        return {
          success: false,
          error: `Publishing failed: ${String(error)}`,
        };
      }

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
   * Supports both direct privateKeyHex (nsec users) and NDKSigner (Amber users)
   */
  async batchSaveWorkouts(
    workouts: PublishableWorkout[],
    privateKeyHexOrSigner: string | NDKSigner,
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
          privateKeyHexOrSigner,
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
