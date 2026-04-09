/**
 * TTSAnnouncementService - Text-to-Speech workout announcements with audio ducking
 * Announces workout summaries and stats with proper audio session management
 */

import * as Speech from 'expo-speech';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TTSPreferencesService } from './TTSPreferencesService';
import { AppStateManager } from '../core/AppStateManager';
import type { Split } from './SplitTrackingService';

type UnitSystem = 'metric' | 'imperial';
const UNIT_PREFERENCE_KEY = '@runstr:unit_preference';

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
  private static appStateUnsubscribe: (() => void) | null = null;

  /**
   * Get the user's unit system preference
   */
  private static async getUnitSystem(): Promise<UnitSystem> {
    try {
      const stored = await AsyncStorage.getItem(UNIT_PREFERENCE_KEY);
      return (stored as UnitSystem) || 'metric';
    } catch {
      return 'metric';
    }
  }

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

      // Set up AppState listener for audio cleanup
      const appStateManager = AppStateManager;
      this.appStateUnsubscribe = appStateManager.onStateChange(
        async (isActive) => {
          if (!isActive) {
            // App going to background - release audio session
            console.log('🔊 App backgrounding, releasing audio session...');
            await this.releaseAudioSession();
          } else {
            // App returned to foreground - reinitialize if needed
            if (this.isSpeaking) {
              console.log('🔊 App foregrounded, restoring audio session...');
              await this.setupAudioSession();
            }
          }
        }
      );

      // Configure audio session for TTS with ducking
      await this.setupAudioSession();

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
      const unitSystem = await this.getUnitSystem();
      const announcementText = this.formatSummaryText(workout, includeSplits, unitSystem);

      console.log('🔊 Announcing:', announcementText);

      // Speak the announcement
      await this.speak(announcementText);
    } catch (error) {
      console.error('❌ Failed to announce summary:', error);
      // Graceful degradation - don't crash the app
    }
  }

  /**
   * Announce a split as it happens during the run
   * Announces kilometer number and pace for that split
   */
  static async announceSplit(split: Split): Promise<void> {
    try {
      // Check if live split announcements are enabled
      const shouldAnnounce =
        await TTSPreferencesService.shouldAnnounceLiveSplits();
      if (!shouldAnnounce) {
        return;
      }

      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Format the split announcement
      const unitSystem = await this.getUnitSystem();
      const splitText = this.formatSplitText(split, unitSystem);

      console.log('🔊 Announcing split:', splitText);

      // Speak the split announcement
      await this.speak(splitText);
    } catch (error) {
      console.error('❌ Failed to announce split:', error);
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
    includeSplits: boolean,
    unitSystem: UnitSystem
  ): string {
    const parts: string[] = [];
    const isMetric = unitSystem === 'metric';

    // Activity type and distance
    const activityType =
      workout.type.charAt(0).toUpperCase() + workout.type.slice(1);
    const distance = this.formatDistance(workout.distance, unitSystem);

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
      const pace = this.formatPaceVoice(workout.pace, unitSystem);
      parts.push(`at an average pace of ${pace} per ${isMetric ? 'kilometer' : 'mile'}`);
    } else if (workout.type === 'cycling' && workout.speed) {
      // Convert speed to miles per hour if imperial
      const speed = isMetric
        ? workout.speed.toFixed(1)
        : (workout.speed * 0.621371).toFixed(1);
      parts.push(`at an average speed of ${speed} ${isMetric ? 'kilometers' : 'miles'} per hour`);
    }

    // Calories
    if (workout.calories > 0) {
      parts.push(`You burned ${workout.calories.toFixed(0)} calories`);
    }

    // Elevation (if significant)
    if (workout.elevation && workout.elevation > 10) {
      if (isMetric) {
        parts.push(`and climbed ${workout.elevation.toFixed(0)} meters`);
      } else {
        const feet = Math.round(workout.elevation * 3.28084);
        parts.push(`and climbed ${feet} feet`);
      }
    }

    // Steps (for walking)
    if (workout.type === 'walking' && workout.steps) {
      parts.push(`with ${workout.steps.toLocaleString()} steps`);
    }

    // Splits (optional)
    if (includeSplits && workout.splits && workout.splits.length > 0) {
      const splitsText = this.formatSplitsVoice(workout.splits, unitSystem);
      parts.push(splitsText);
    }

    // Motivational ending
    parts.push('Great work!');

    return parts.join('. ') + '.';
  }

  /**
   * Format distance for voice (e.g., "5.2 kilometers" or "3.2 miles")
   */
  private static formatDistance(meters: number, unitSystem: UnitSystem): string {
    if (unitSystem === 'imperial') {
      const miles = meters * 0.000621371;
      const feet = meters * 3.28084;

      if (miles < 0.1) {
        return `${feet.toFixed(0)} feet`;
      } else if (miles < 10) {
        return `${miles.toFixed(1)} miles`;
      } else {
        return `${miles.toFixed(0)} miles`;
      }
    } else {
      const km = meters / 1000;

      if (km < 1) {
        return `${meters.toFixed(0)} meters`;
      } else if (km < 10) {
        return `${km.toFixed(1)} kilometers`;
      } else {
        return `${km.toFixed(0)} kilometers`;
      }
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
   * If imperial, converts pace from seconds/km to seconds/mile
   */
  private static formatPaceVoice(paceSecondsPerKm: number, unitSystem: UnitSystem = 'metric'): string {
    // Convert to seconds per mile if imperial
    const paceSeconds = unitSystem === 'imperial'
      ? paceSecondsPerKm * 1.60934
      : paceSecondsPerKm;

    // Convert seconds to minutes
    const totalMinutes = paceSeconds / 60;
    const minutes = Math.floor(totalMinutes);
    const seconds = Math.round((totalMinutes - minutes) * 60);

    if (seconds === 0) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else {
      return `${minutes} ${
        minutes === 1 ? 'minute' : 'minutes'
      } and ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
    }
  }

  /**
   * Format a single split for voice announcement
   * Brief format for real-time announcements during run
   */
  private static formatSplitText(split: Split, unitSystem: UnitSystem): string {
    const isMetric = unitSystem === 'metric';
    // Convert pace from seconds per km to voice format
    const pace = this.formatPaceVoice(split.pace, unitSystem);
    const unitName = isMetric ? 'Kilometer' : 'Mile';
    const unitNameLower = isMetric ? 'kilometer' : 'mile';

    // Simple announcement: "Kilometer 1, 5 minutes 30 seconds per kilometer"
    return `${unitName} ${split.number}, ${pace} per ${unitNameLower}`;
  }

  /**
   * Format splits for voice (brief summary)
   */
  private static formatSplitsVoice(splits: Split[], unitSystem: UnitSystem): string {
    if (splits.length === 0) {
      return '';
    }

    const isMetric = unitSystem === 'metric';
    const unitName = isMetric ? 'kilometer' : 'mile';

    // Keep it brief - just mention number of splits and fastest
    const fastestSplit = splits.reduce((prev, current) =>
      current.pace < prev.pace ? current : prev
    );

    const fastestPace = this.formatPaceVoice(fastestSplit.pace / 60, unitSystem); // Convert seconds to minutes

    return `Your fastest ${unitName} was number ${fastestSplit.number} at ${fastestPace}`;
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
  /**
   * Set up audio session with ducking configuration
   */
  private static async setupAudioSession(): Promise<void> {
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
  }

  /**
   * Release audio session when app backgrounds
   */
  private static async releaseAudioSession(): Promise<void> {
    try {
      // Stop any ongoing speech
      if (this.isSpeaking) {
        await Speech.stop();
        this.isSpeaking = false;
      }

      // Reset audio mode to release audio focus
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });

      console.log('✅ Audio session released');
    } catch (error) {
      console.error('❌ Failed to release audio session:', error);
    }
  }

  static async cleanup(): Promise<void> {
    try {
      await this.stopSpeaking();

      // Clean up AppState listener
      if (this.appStateUnsubscribe) {
        this.appStateUnsubscribe();
        this.appStateUnsubscribe = null;
      }

      // Release audio session
      await this.releaseAudioSession();

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
