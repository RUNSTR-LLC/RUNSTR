/**
 * @deprecated - This service is DEPRECATED as of v3 architecture migration
 *
 * PerWorkoutVerificationService (DEPRECATED)
 *
 * Previously fetched unique verification codes from Supabase for anti-cheat.
 * Now replaced by rolling verification codes from kind 30150 leaderboard notes.
 *
 * NEW ARCHITECTURE:
 * - External aggregator publishes kind 30150 note every 2 minutes
 * - Note includes rolling vcode valid for 5 minutes
 * - App gets vcode from NostrLeaderboardService.getCurrentVcode()
 * - External reward service validates vcode from kind 1301 events
 *
 * This file is kept for reference but should not be imported.
 * See: src/services/competition/NostrLeaderboardService.ts for new vcode source
 *
 * === ORIGINAL DOCUMENTATION (for reference) ===
 * Fetched unique verification codes for each workout from Supabase.
 * Each code was tied to immutable workout data and could only be used once.
 */

import Constants from 'expo-constants';

// Supabase configuration from environment
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export interface WorkoutVerificationRequest {
  npub: string;
  workoutId: string;
  exercise: string;
  distanceMeters: number;
  durationSeconds: number;
  startTimestamp: number;
}

export interface WorkoutVerificationResponse {
  code: string | null;
  expiresIn?: number;
  error?: string;
}

class PerWorkoutVerificationServiceClass {
  private static instance: PerWorkoutVerificationServiceClass;

  private constructor() {}

  static getInstance(): PerWorkoutVerificationServiceClass {
    if (!PerWorkoutVerificationServiceClass.instance) {
      PerWorkoutVerificationServiceClass.instance = new PerWorkoutVerificationServiceClass();
    }
    return PerWorkoutVerificationServiceClass.instance;
  }

  /**
   * Get verification code for a specific workout
   * Called BEFORE publishing workout to Nostr
   *
   * @param workout - Workout data to verify
   * @returns Verification code or null if unavailable
   */
  async getWorkoutVerificationCode(
    workout: WorkoutVerificationRequest
  ): Promise<WorkoutVerificationResponse> {
    const version = this.getAppVersion();

    // Validate inputs
    if (!workout.npub || !workout.npub.startsWith('npub1')) {
      console.warn('[PerWorkoutVerification] Invalid npub format');
      return { code: null, error: 'Invalid npub format' };
    }

    if (!workout.workoutId) {
      console.warn('[PerWorkoutVerification] Missing workout ID');
      return { code: null, error: 'Missing workout ID' };
    }

    // Check Supabase configuration
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('[PerWorkoutVerification] Supabase not configured, skipping verification');
      return { code: null, error: 'Supabase not configured' };
    }

    try {
      console.log(
        `[PerWorkoutVerification] Fetching code for workout ${workout.workoutId.slice(0, 8)}...`
      );

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-workout-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            npub: workout.npub,
            workout_id: workout.workoutId,
            exercise: workout.exercise.toLowerCase(),
            distance_m: Math.round(workout.distanceMeters),
            duration_s: Math.round(workout.durationSeconds),
            start_ts: Math.round(workout.startTimestamp),
            version,
          }),
        }
      );

      if (!response.ok) {
        console.warn(
          '[PerWorkoutVerification] Server error:',
          response.status,
          response.statusText
        );
        return { code: null, error: `Server error: ${response.status}` };
      }

      const data = await response.json();

      if (data.error) {
        console.log('[PerWorkoutVerification] Server response:', data.error);
        return { code: null, error: data.error };
      }

      if (data.code) {
        console.log(
          `[PerWorkoutVerification] Code received for workout ${workout.workoutId.slice(0, 8)}...: ${data.code.slice(0, 4)}...`
        );
        return {
          code: data.code,
          expiresIn: data.expires_in || 300,
        };
      }

      // No code returned (version not supported)
      if (data.message) {
        console.log('[PerWorkoutVerification]', data.message);
      }
      return { code: null, error: data.message || 'No code returned' };
    } catch (error) {
      console.error('[PerWorkoutVerification] Failed to fetch code:', error);
      return {
        code: null,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Get current app version from Expo config
   */
  private getAppVersion(): string {
    return Constants.expoConfig?.version || 'unknown';
  }

  /**
   * Check if Supabase is configured for verification
   */
  isConfigured(): boolean {
    return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
  }
}

// Export singleton instance
const PerWorkoutVerificationService = PerWorkoutVerificationServiceClass.getInstance();
export default PerWorkoutVerificationService;

// Also export the class for testing
export { PerWorkoutVerificationServiceClass };
