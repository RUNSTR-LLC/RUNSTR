/**
 * Nostr Workout Parser - Kind 1301 Event Processing
 * Converts Nostr kind 1301 events to standardized Workout objects
 * Handles validation, unit conversion, and error recovery
 */

import type {
  NostrEvent,
  NostrWorkout,
  NostrWorkoutEvent,
  NostrWorkoutContent,
  NostrWorkoutError,
  NostrRoutePoint,
} from '../types/nostrWorkout';
import type { WorkoutType } from '../types/workout';

// Activity type mapping from Nostr to standardized types
const ACTIVITY_TYPE_MAP: Record<string, WorkoutType> = {
  running: 'running',
  jogging: 'running',
  cycling: 'cycling',
  biking: 'cycling',
  walking: 'walking',
  hiking: 'hiking',
  gym: 'gym',
  strength: 'strength_training',
  weightlifting: 'strength_training',
  yoga: 'yoga',
  other: 'other',
};

// Unit conversion utilities
const METERS_PER_MILE = 1609.34;
const METERS_PER_KM = 1000;

export class NostrWorkoutParser {
  /**
   * Parse a raw Nostr event into a NostrWorkoutEvent
   */
  static parseNostrEvent(event: NostrEvent): NostrWorkoutEvent | null {
    try {
      // Validate event structure according to nostr-tools specification
      if (!this.validateEventStructure(event)) {
        console.error('❌ Invalid event structure:', event);
        return null;
      }

      if (event.kind !== 1301) {
        console.warn(`⚠️ Skipping non-workout event kind: ${event.kind}`);
        return null;
      }

      console.log('🔍 Processing workout event:', {
        id: event.id.substring(0, 16) + '...',
        kind: event.kind,
        contentLength: event.content?.length,
        tagCount: event.tags?.length,
        created_at: event.created_at
      });

      // Parse workout content (JSON + tags)
      const parsedContent = this.parseWorkoutContent(event);
      if (!parsedContent) {
        console.log('⏭️ Skipping event (not NIP-1301 format):', event.id);
        return null;
      }

      // Extract metadata from tags
      const metadata = this.extractTagMetadata(event.tags);

      const workoutEvent: NostrWorkoutEvent = {
        ...event,
        kind: 1301,
        parsedContent,
        workoutId: metadata.workoutId,
        activityType: metadata.activityType,
        unitSystem: metadata.unitSystem,
        location: metadata.location,
        sourceApp: metadata.sourceApp,
      };

      console.log('✅ Successfully parsed workout event:', {
        id: workoutEvent.id.substring(0, 16) + '...',
        type: workoutEvent.parsedContent.type,
        duration: workoutEvent.parsedContent.duration
      });

      return workoutEvent;
    } catch (error) {
      console.error('❌ Failed to parse Nostr event:', error);
      console.error('❌ Event causing error:', {
        id: event?.id,
        kind: event?.kind,
        content: event?.content?.substring(0, 100)
      });
      return null;
    }
  }

  /**
   * Validate event structure according to nostr-tools specification
   */
  private static validateEventStructure(event: any): event is NostrEvent {
    if (!event || typeof event !== 'object') {
      console.error('❌ Event is not an object');
      return false;
    }

    // Check required fields according to nostr-tools core.ts
    if (typeof event.kind !== 'number') {
      console.error('❌ Event kind is not a number:', typeof event.kind);
      return false;
    }

    if (typeof event.content !== 'string') {
      console.error('❌ Event content is not a string:', typeof event.content);
      return false;
    }

    if (typeof event.created_at !== 'number') {
      console.error('❌ Event created_at is not a number:', typeof event.created_at);
      return false;
    }

    if (typeof event.pubkey !== 'string') {
      console.error('❌ Event pubkey is not a string:', typeof event.pubkey);
      return false;
    }

    if (typeof event.id !== 'string') {
      console.error('❌ Event id is not a string:', typeof event.id);
      return false;
    }

    if (typeof event.sig !== 'string') {
      console.error('❌ Event sig is not a string:', typeof event.sig);
      return false;
    }

    if (!Array.isArray(event.tags)) {
      console.error('❌ Event tags is not an array:', typeof event.tags);
      return false;
    }

    // Validate pubkey format (64 character hex)
    if (!event.pubkey.match(/^[a-f0-9]{64}$/)) {
      console.error('❌ Event pubkey is not valid hex format:', event.pubkey);
      return false;
    }

    // Validate tag structure
    for (let i = 0; i < event.tags.length; i++) {
      const tag = event.tags[i];
      if (!Array.isArray(tag)) {
        console.error('❌ Event tag is not an array at index:', i);
        return false;
      }
      for (let j = 0; j < tag.length; j++) {
        if (typeof tag[j] !== 'string') {
          console.error('❌ Event tag element is not a string at:', i, j);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Parse workout content from workout event (NIP-1301 or RUNSTR format)
   */
  private static parseWorkoutContent(
    event: NostrEvent
  ): NostrWorkoutContent | null {
    try {
      // Check if this is a valid workout event
      if (!this.isNip1301WorkoutEvent(event)) {
        console.log('⏭️ Skipping non-workout event');
        return null;
      }

      // Extract data from tags (works for both formats)
      const tagData = this.extractNip1301TagData(event.tags);

      // Try to parse JSON content (NIP-1301 format)
      let contentData: any = {};
      try {
        contentData = JSON.parse(event.content);
        console.log('📄 JSON content parsed successfully');
      } catch {
        console.log('📄 Plain text content (RUNSTR format)');
      }

      console.log('✅ Successfully parsed workout event:', {
        contentType: contentData.type || tagData.type,
        distance: tagData.distance,
        duration: tagData.duration,
        source: tagData.distance ? 'RUNSTR' : 'NIP-1301'
      });

      return {
        type: contentData.type || tagData.type || 'other',
        duration: tagData.duration || contentData.duration || 0,
        distance: tagData.distance || contentData.distance,
        pace: contentData.pace,
        calories: contentData.calories,
        elevationGain: tagData.elevationGain || contentData.elevationGain,
        averageHeartRate: tagData.averageHeartRate || contentData.averageHeartRate,
        maxHeartRate: contentData.maxHeartRate,
        route: contentData.route ? this.parseRouteData(contentData.route) : undefined,
        startTime: tagData.start,
        endTime: tagData.end,
        title: tagData.title,
      };
    } catch (error) {
      console.log('⚠️ Failed to parse workout event:', error);
      return null;
    }
  }

  /**
   * Check if event is a valid workout event (NIP-1301 or RUNSTR format)
   */
  private static isNip1301WorkoutEvent(event: NostrEvent): boolean {
    // Must have exercise tag for any workout format
    const hasExerciseTag = event.tags.some(tag => tag[0] === 'exercise');
    if (!hasExerciseTag) return false;
    
    // Check for pure NIP-1301 format (JSON content + start/type tags)
    const hasStartTag = event.tags.some(tag => tag[0] === 'start');
    const hasTypeTag = event.tags.some(tag => tag[0] === 'type');
    
    let isJsonContent = false;
    try {
      JSON.parse(event.content);
      isJsonContent = true;
    } catch {
      isJsonContent = false;
    }
    
    // Pure NIP-1301: JSON content + required tags
    if (isJsonContent && (hasStartTag || hasTypeTag)) {
      return true;
    }
    
    // RUNSTR format: plain text content + workout tags
    const hasDistanceTag = event.tags.some(tag => tag[0] === 'distance');
    const hasDurationTag = event.tags.some(tag => tag[0] === 'duration');
    const hasWorkoutTag = event.tags.some(tag => tag[0] === 'workout');
    
    // Accept RUNSTR format if it has exercise + (distance OR duration OR workout)
    return hasExerciseTag && (hasDistanceTag || hasDurationTag || hasWorkoutTag);
  }

  /**
   * Extract workout data from tags (NIP-1301 and RUNSTR formats)
   */
  private static extractNip1301TagData(tags: string[][]) {
    const data: any = {};
    
    for (const tag of tags) {
      if (tag.length < 2) continue;
      
      switch (tag[0]) {
        case 'd':
          data.id = tag[1];
          break;
        case 'title':
          data.title = tag[1];
          break;
        case 'workout':
          // RUNSTR format: ["workout", "6/1/2025 Run"]
          data.title = tag[1];
          break;
        case 'type':
          data.type = tag[1];
          break;
        case 'exercise':
          // NIP-1301 format: ["exercise", "33401:<pubkey>:<UUID-running>", "<relay-url>", "5", "1800", "4:52", "polyline", "125"]
          if (tag.length >= 5) {
            data.exercise = tag[1];
            data.distance = parseFloat(tag[3]) || undefined;
            data.duration = parseInt(tag[4]) || data.duration;
          } else {
            // RUNSTR format: ["exercise", "run"] or ["exercise", "walk"]
            data.type = tag[1];
          }
          break;
        case 'distance':
          // RUNSTR format: ["distance", "7.78", "mi"]
          if (tag.length >= 3) {
            const distance = parseFloat(tag[1]);
            const unit = tag[2];
            // Convert to meters
            if (unit === 'mi') {
              data.distance = distance * 1609.34; // miles to meters
            } else if (unit === 'km') {
              data.distance = distance * 1000; // km to meters
            } else {
              data.distance = distance; // assume meters
            }
          }
          break;
        case 'duration':
          // RUNSTR format: ["duration", "01:15:55"]
          if (tag.length >= 2) {
            const timeStr = tag[1];
            data.duration = this.parseTimeStringToSeconds(timeStr);
          }
          break;
        case 'elevation_gain':
          // RUNSTR format: ["elevation_gain", "630", "ft"]
          if (tag.length >= 2) {
            const elevation = parseFloat(tag[1]);
            const unit = tag[2];
            // Convert to meters
            if (unit === 'ft') {
              data.elevationGain = elevation * 0.3048; // feet to meters
            } else {
              data.elevationGain = elevation; // assume meters
            }
          }
          break;
        case 'start':
          data.start = new Date(parseInt(tag[1]) * 1000).toISOString();
          break;
        case 'end':
          data.end = new Date(parseInt(tag[1]) * 1000).toISOString();
          if (!data.duration) {
            data.duration = parseInt(tag[1]) - parseInt(tags.find(t => t[0] === 'start')?.[1] || '0');
          }
          break;
        case 'heart_rate_avg':
          data.averageHeartRate = parseInt(tag[1]);
          break;
      }
    }
    
    return data;
  }

  /**
   * Parse time string like "01:15:55" to seconds
   */
  private static parseTimeStringToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(p => parseInt(p));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // H:M:S
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // M:S
    }
    return 0;
  }

  /**
   * Parse route data from content
   */
  private static parseRouteData(route: any[]): NostrRoutePoint[] | undefined {
    try {
      return route
        .map((point) => ({
          latitude: Number(point.latitude || point.lat),
          longitude: Number(point.longitude || point.lng || point.lon),
          elevation: point.elevation ? Number(point.elevation) : undefined,
          timestamp: point.timestamp ? Number(point.timestamp) : undefined,
        }))
        .filter((point) => !isNaN(point.latitude) && !isNaN(point.longitude));
    } catch (error) {
      console.error('Failed to parse route data:', error);
      return undefined;
    }
  }

  /**
   * Extract metadata from event tags
   */
  private static extractTagMetadata(tags: string[][]) {
    const metadata = {
      workoutId: undefined as string | undefined,
      activityType: undefined as WorkoutType | undefined,
      unitSystem: 'metric' as 'metric' | 'imperial',
      location: undefined as string | undefined,
      sourceApp: undefined as string | undefined,
    };

    for (const tag of tags) {
      if (tag.length < 2) continue;

      switch (tag[0]) {
        case 'd':
          metadata.workoutId = tag[1];
          break;
        case 'activity':
          const mappedType = ACTIVITY_TYPE_MAP[tag[1]?.toLowerCase()];
          if (mappedType) {
            metadata.activityType = mappedType;
          }
          break;
        case 'unit':
          if (tag[1] === 'imperial' || tag[1] === 'metric') {
            metadata.unitSystem = tag[1];
          }
          break;
        case 'location':
          metadata.location = tag[1];
          break;
        case 'app':
          metadata.sourceApp = tag[1];
          break;
      }
    }

    return metadata;
  }

  /**
   * Convert NostrWorkoutEvent to standardized NostrWorkout
   */
  static convertToWorkout(
    event: NostrWorkoutEvent,
    userId: string,
    preserveRawEvent = false
  ): NostrWorkout {
    const content = event.parsedContent;
    const startTime = new Date(event.created_at * 1000);
    const endTime = new Date(startTime.getTime() + content.duration * 1000);

    // Convert distance based on unit system
    let distanceInMeters = content.distance;
    if (distanceInMeters && event.unitSystem === 'imperial') {
      distanceInMeters = this.convertMilesToMeters(distanceInMeters);
    }

    // Convert pace based on unit system
    let pacePerMile = content.pace;
    if (pacePerMile && event.unitSystem === 'metric') {
      // Convert from pace per km to pace per mile
      pacePerMile = pacePerMile * (METERS_PER_MILE / METERS_PER_KM);
    }

    const workout: NostrWorkout = {
      id: `nostr_${event.id}`,
      userId,
      type: event.activityType || this.mapActivityType(content.type),
      source: 'nostr',
      distance: distanceInMeters,
      duration: content.duration,
      calories: content.calories,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      heartRate: this.buildHeartRateData(content),
      pace: pacePerMile,
      syncedAt: new Date().toISOString(),
      metadata: {
        originalType: content.type,
        unitSystem: event.unitSystem,
        sourceApp: event.sourceApp,
      },
      // Nostr-specific fields
      nostrEventId: event.id,
      nostrPubkey: event.pubkey,
      nostrCreatedAt: event.created_at,
      elevationGain: content.elevationGain,
      route: content.route,
      unitSystem: event.unitSystem || 'metric',
      sourceApp: event.sourceApp,
      location: event.location,
      rawNostrEvent: preserveRawEvent ? event : undefined,
    };

    return workout;
  }

  /**
   * Build heart rate data object
   */
  private static buildHeartRateData(content: NostrWorkoutContent) {
    if (content.averageHeartRate || content.maxHeartRate) {
      return {
        avg: content.averageHeartRate || 0,
        max: content.maxHeartRate || 0,
      };
    }
    return undefined;
  }

  /**
   * Map activity type string to WorkoutType
   */
  private static mapActivityType(activityString: string): WorkoutType {
    const normalized = activityString.toLowerCase().trim();
    return ACTIVITY_TYPE_MAP[normalized] || 'other';
  }

  /**
   * Convert miles to meters
   */
  private static convertMilesToMeters(miles: number): number {
    return miles * METERS_PER_MILE;
  }

  /**
   * Convert kilometers to meters
   */
  private static convertKilometersToMeters(kilometers: number): number {
    return kilometers * METERS_PER_KM;
  }

  /**
   * Validate workout data quality
   */
  static validateWorkoutData(workout: NostrWorkout): NostrWorkoutError[] {
    const errors: NostrWorkoutError[] = [];

    // Duration validation
    if (workout.duration <= 0 || workout.duration > 86400) {
      // Max 24 hours
      errors.push({
        type: 'invalid_content',
        message: 'Invalid workout duration',
        eventId: workout.nostrEventId,
        timestamp: new Date().toISOString(),
        details: { duration: workout.duration },
      });
    }

    // Distance validation (if present)
    if (workout.distance !== undefined) {
      if (workout.distance <= 0 || workout.distance > 300000) {
        // Max 300km
        errors.push({
          type: 'invalid_content',
          message: 'Invalid workout distance',
          eventId: workout.nostrEventId,
          timestamp: new Date().toISOString(),
          details: { distance: workout.distance },
        });
      }
    }

    // Heart rate validation (if present)
    if (workout.heartRate) {
      if (
        workout.heartRate.avg &&
        (workout.heartRate.avg < 30 || workout.heartRate.avg > 220)
      ) {
        errors.push({
          type: 'invalid_content',
          message: 'Invalid average heart rate',
          eventId: workout.nostrEventId,
          timestamp: new Date().toISOString(),
          details: { avgHeartRate: workout.heartRate.avg },
        });
      }

      if (
        workout.heartRate.max &&
        (workout.heartRate.max < 30 || workout.heartRate.max > 250)
      ) {
        errors.push({
          type: 'invalid_content',
          message: 'Invalid max heart rate',
          eventId: workout.nostrEventId,
          timestamp: new Date().toISOString(),
          details: { maxHeartRate: workout.heartRate.max },
        });
      }
    }

    return errors;
  }

  /**
   * Create error for parsing failures
   */
  static createParseError(
    type: 'event_parsing' | 'invalid_content',
    message: string,
    eventId?: string,
    details?: Record<string, any>
  ): NostrWorkoutError {
    return {
      type,
      message,
      eventId,
      timestamp: new Date().toISOString(),
      details,
    };
  }
}
