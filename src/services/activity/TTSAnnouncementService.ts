/**
 * TTSAnnouncementService - Text-to-Speech workout announcements with audio ducking
 * Announces workout summaries and stats with proper audio session management
 */

import * as Speech from 'expo-speech';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { Platform } from 'react-native';
import { TTSPreferencesService } from './TTSPreferencesService';
import type { Split } from './SplitTrackingService';

interface WorkoutData {
  type: 'running' | 'walking' | 'cycling';
  distance: number; // in meters
  duration: number; // in seconds
  calories: number;
  elevation?: number; // in meters
  pace?: number; // minutes per km (for running)
  speed?: number; // km/h (for cycling)
  steps?: number; // for walking
  splits?: Split[]; // kilometer splits
}

export class TTSAnnouncementService {
  private static isInitialized = false;
  private static isSpeaking = false;
  private static speechQueue: string[] = [];

  /**
   * Initialize audio session with ducking support
   * Sets up platform-specific audio configuration to lower background music
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔊 Initializing TTS service with audio ducking...');

      // Configure audio session for TTS with ducking
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,

        // iOS: Duck other audio (music, podcasts, etc.)
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,

        // Android: Duck other audio
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,

        playThroughEarpieceAndroid: false,
      });

      this.isInitialized = true;
      console.log('✅ TTS service initialized with audio ducking');
    } catch (error) {
      console.error('❌ Failed to initialize TTS service:', error);
      // Don't throw - graceful degradation
      this.isInitialized = true; // Mark as initialized anyway
    }
  }

  /**
   * Announce workout summary
   * Main entry point for workout completion announcements
   */
  static async announceSummary(workout: WorkoutData): Promise<void> {
    try {
      // Check if announcements are enabled
      const shouldAnnounce =
        await TTSPreferencesService.shouldAnnounceSummary();
      if (!shouldAnnounce) {
        console.log('🔇 Summary announcements disabled');
        return;
      }

      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if TTS is available
      const isAvailable = await Speech.isSpeakingAsync();
      console.log('🔊 TTS available:', !isAvailable);

      // Generate announcement text
      const includeSplits = await TTSPreferencesService.shouldIncludeSplits();
      const announcementText = this.formatSummaryText(workout, includeSplits);

      console.log('🔊 Announcing:', announcementText);

      // Speak the announcement
      await this.speak(announcementText);
    } catch (error) {
      console.error('❌ Failed to announce summary:', error);
      // Graceful degradation - don't crash the app
    }
  }

  /**
   * Speak text with configured settings
   * Handles speech rate and queuing
   */
  private static async speak(text: string): Promise<void> {
    if (this.isSpeaking) {
      // Queue the text if already speaking
      this.speechQueue.push(text);
      console.log('🔊 Speech queued, queue length:', this.speechQueue.length);
      return;
    }

    try {
      this.isSpeaking = true;

      // Get speech rate from preferences
      const speechRate = await TTSPreferencesService.getSpeechRate();

      // Stop any existing speech
      await Speech.stop();

      // Speak with options
      await Speech.speak(text, {
        rate: speechRate,
        pitch: 1.0,
        language: 'en-US',
        onDone: () => {
          this.onSpeechComplete();
        },
        onStopped: () => {
          this.onSpeechComplete();
        },
        onError: (error) => {
          console.error('🔊 Speech error:', error);
          this.onSpeechComplete();
        },
      });

      console.log('🔊 Speaking at rate:', speechRate);
    } catch (error) {
      console.error('❌ Speech failed:', error);
      this.isSpeaking = false;
    }
  }

  /**
   * Handle speech completion and process queue
   */
  private static onSpeechComplete(): void {
    this.isSpeaking = false;

    // Process queue if items exist
    if (this.speechQueue.length > 0) {
      const nextText = this.speechQueue.shift();
      if (nextText) {
        this.speak(nextText);
      }
    }
  }

  /**
   * Stop current speech
   */
  static async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
      this.isSpeaking = false;
      this.speechQueue = [];
      console.log('🔊 Speech stopped');
    } catch (error) {
      console.error('❌ Failed to stop speech:', error);
    }
  }

  /**
   * Format workout data into natural language summary
   */
  private static formatSummaryText(
    workout: WorkoutData,
    includeSplits: boolean
  ): string {
    const parts: string[] = [];

    // Activity type and distance
    const activityType =
      workout.type.charAt(0).toUpperCase() + workout.type.slice(1);
    const distance = this.formatDistance(workout.distance);

    if (workout.type === 'running') {
      parts.push(`You completed a ${distance} run`);
    } else if (workout.type === 'cycling') {
      parts.push(`You completed a ${distance} cycling ride`);
    } else if (workout.type === 'walking') {
      parts.push(`You completed a ${distance} walk`);
    }

    // Duration
    const duration = this.formatDurationVoice(workout.duration);
    parts.push(`in ${duration}`);

    // Pace or Speed
    if (workout.type === 'running' && workout.pace) {
      const pace = this.formatPaceVoice(workout.pace);
      parts.push(`at an average pace of ${pace} per kilometer`);
    } else if (workout.type === 'cycling' && workout.speed) {
      const speed = workout.speed.toFixed(1);
      parts.push(`at an average speed of ${speed} kilometers per hour`);
    }

    // Calories
    if (workout.calories > 0) {
      parts.push(`You burned ${workout.calories.toFixed(0)} calories`);
    }

    // Elevation (if significant)
    if (workout.elevation && workout.elevation > 10) {
      parts.push(`and climbed ${workout.elevation.toFixed(0)} meters`);
    }

    // Steps (for walking)
    if (workout.type === 'walking' && workout.steps) {
      parts.push(`with ${workout.steps.toLocaleString()} steps`);
    }

    // Splits (optional)
    if (includeSplits && workout.splits && workout.splits.length > 0) {
      const splitsText = this.formatSplitsVoice(workout.splits);
      parts.push(splitsText);
    }

    // Motivational ending
    parts.push('Great work!');

    return parts.join('. ') + '.';
  }

  /**
   * Format distance for voice (e.g., "5.2 kilometers")
   */
  private static formatDistance(meters: number): string {
    const km = meters / 1000;

    if (km < 1) {
      return `${meters.toFixed(0)} meters`;
    } else if (km < 10) {
      return `${km.toFixed(1)} kilometers`;
    } else {
      return `${km.toFixed(0)} kilometers`;
    }
  }

  /**
   * Format duration for voice (e.g., "30 minutes and 45 seconds")
   */
  private static formatDurationVoice(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];

    if (hours > 0) {
      parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    }
    if (secs > 0 && hours === 0) {
      // Only include seconds if < 1 hour
      parts.push(`${secs.toFixed(0)} ${secs === 1 ? 'second' : 'seconds'}`);
    }

    if (parts.length === 0) {
      return 'less than a second';
    } else if (parts.length === 1) {
      return parts[0];
    } else if (parts.length === 2) {
      return `${parts[0]} and ${parts[1]}`;
    } else {
      return `${parts[0]}, ${parts[1]}, and ${parts[2]}`;
    }
  }

  /**
   * Format pace for voice (e.g., "5 minutes 54 seconds")
   */
  private static formatPaceVoice(paceMinutesPerKm: number): string {
    const minutes = Math.floor(paceMinutesPerKm);
    const seconds = Math.round((paceMinutesPerKm - minutes) * 60);

    if (seconds === 0) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else {
      return `${minutes} ${
        minutes === 1 ? 'minute' : 'minutes'
      } and ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
    }
  }

  /**
   * Format splits for voice (brief summary)
   */
  private static formatSplitsVoice(splits: Split[]): string {
    if (splits.length === 0) {
      return '';
    }

    // Keep it brief - just mention number of splits and fastest
    const fastestSplit = splits.reduce((prev, current) =>
      current.pace < prev.pace ? current : prev
    );

    const fastestPace = this.formatPaceVoice(fastestSplit.pace / 60); // Convert seconds to minutes

    return `Your fastest kilometer was number ${fastestSplit.number} at ${fastestPace}`;
  }

  /**
   * Test speech with sample text
   * Useful for settings screen preview
   */
  static async testSpeech(): Promise<void> {
    const sampleWorkout: WorkoutData = {
      type: 'running',
      distance: 5200,
      duration: 1845, // 30:45
      calories: 312,
      pace: 5.9, // 5:54 per km
    };

    await this.announceSummary(sampleWorkout);
  }

  /**
   * Cleanup resources
   */
  static async cleanup(): Promise<void> {
    try {
      await this.stopSpeaking();
      this.isInitialized = false;
      console.log('🔊 TTS service cleanup complete');
    } catch (error) {
      console.error('❌ TTS cleanup failed:', error);
    }
  }

  /**
   * Check if speech is currently active
   */
  static isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get queue length
   */
  static getQueueLength(): number {
    return this.speechQueue.length;
  }
}

export default TTSAnnouncementService;
