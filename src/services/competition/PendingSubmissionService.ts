/**
 * Pending Submission Service - Retry Queue for Failed Workout Submissions
 *
 * Manages failed workout submissions to Supabase and provides local data
 * for hybrid leaderboards. When Supabase submission fails (network issues,
 * timeout, etc.), workouts are queued locally and retried later.
 *
 * Key Features:
 * - Queue failed submissions with exponential backoff
 * - Provide pending workouts for hybrid leaderboard merge
 * - Retry on pull-to-refresh and app foreground
 * - Convert pending submissions to leaderboard entry format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseCompetitionService } from '../backend/SupabaseCompetitionService';
import type { LeaderboardEntry } from './DailyLeaderboardService';

// Storage key for pending submissions
const STORAGE_KEY = '@runstr:pending_submissions';

// Maximum retry attempts before marking as abandoned
const MAX_RETRIES = 5;

// Exponential backoff intervals in milliseconds
// 1 min → 2 min → 4 min → 8 min → 16 min
const BACKOFF_INTERVALS = [60000, 120000, 240000, 480000, 960000];

/**
 * Pending submission data structure
 */
export interface PendingSubmission {
  id: string; // Unique ID (workout ID / event ID)
  submissionData: {
    eventId: string;
    npub: string;
    type: string; // 'running', 'walking', 'cycling'
    distance: number; // in meters
    duration: number; // in seconds
    calories?: number;
    startTime: string; // ISO timestamp
    tags: string[][];
    profileName?: string;
    profilePicture?: string;
  };
  createdAt: number; // Unix timestamp (ms)
  retryCount: number; // 0-5
  lastError: string;
  nextRetryTime: number; // Unix timestamp (ms) for exponential backoff
}

/**
 * Profile data for converting pending submission to leaderboard entry
 */
export interface ProfileData {
  name?: string;
  picture?: string;
}

/**
 * Result of retry operation
 */
export interface RetryResult {
  succeeded: number;
  failed: number;
  stillPending: number;
}

export class PendingSubmissionService {
  /**
   * Add a failed submission to the queue
   */
  static async addPending(submission: PendingSubmission): Promise<void> {
    try {
      const pending = await this.getPending();

      // Check if submission already exists (prevent duplicates)
      const existingIndex = pending.findIndex((p) => p.id === submission.id);
      if (existingIndex >= 0) {
        // Update existing entry (increment retry count, update error)
        pending[existingIndex] = submission;
        console.log(`[PendingSubmission] Updated existing pending: ${submission.id}`);
      } else {
        // Add new entry
        pending.push(submission);
        console.log(`[PendingSubmission] Added new pending: ${submission.id}`);
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
      console.log(`[PendingSubmission] Queue size: ${pending.length}`);
    } catch (error) {
      console.error('[PendingSubmission] Failed to add pending:', error);
    }
  }

  /**
   * Get all pending submissions
   */
  static async getPending(): Promise<PendingSubmission[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const pending = JSON.parse(stored) as PendingSubmission[];
      return pending;
    } catch (error) {
      console.error('[PendingSubmission] Failed to get pending:', error);
      return [];
    }
  }

  /**
   * Get pending submissions for today (for hybrid leaderboard merge)
   * Filters to submissions from the current day in local timezone
   */
  static async getPendingForToday(): Promise<PendingSubmission[]> {
    try {
      const pending = await this.getPending();

      // Get today's date string in local timezone (YYYY-MM-DD)
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Filter to submissions from today
      const todayPending = pending.filter((p) => {
        const submissionDate = new Date(p.submissionData.startTime);
        const submissionDateStr = `${submissionDate.getFullYear()}-${String(submissionDate.getMonth() + 1).padStart(2, '0')}-${String(submissionDate.getDate()).padStart(2, '0')}`;
        return submissionDateStr === todayStr;
      });

      console.log(`[PendingSubmission] Today's pending: ${todayPending.length}/${pending.length}`);
      return todayPending;
    } catch (error) {
      console.error('[PendingSubmission] Failed to get today pending:', error);
      return [];
    }
  }

  /**
   * Remove a submission after successful sync
   */
  static async removePending(id: string): Promise<void> {
    try {
      const pending = await this.getPending();
      const filtered = pending.filter((p) => p.id !== id);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log(`[PendingSubmission] Removed: ${id}, remaining: ${filtered.length}`);
    } catch (error) {
      console.error('[PendingSubmission] Failed to remove pending:', error);
    }
  }

  /**
   * Retry all pending submissions
   * Called on pull-to-refresh and app foreground
   *
   * Respects exponential backoff - only retries submissions where
   * nextRetryTime has passed.
   */
  static async retryAll(): Promise<RetryResult> {
    const result: RetryResult = {
      succeeded: 0,
      failed: 0,
      stillPending: 0,
    };

    try {
      const pending = await this.getPending();

      if (pending.length === 0) {
        console.log('[PendingSubmission] No pending submissions to retry');
        return result;
      }

      console.log(`[PendingSubmission] Retrying ${pending.length} pending submissions...`);

      const now = Date.now();
      const updatedPending: PendingSubmission[] = [];

      for (const submission of pending) {
        // Check if it's time to retry (respect backoff)
        if (submission.nextRetryTime > now) {
          console.log(
            `[PendingSubmission] Skipping ${submission.id} - backoff until ${new Date(submission.nextRetryTime).toISOString()}`
          );
          updatedPending.push(submission);
          result.stillPending++;
          continue;
        }

        // Check if max retries exceeded
        if (submission.retryCount >= MAX_RETRIES) {
          console.warn(
            `[PendingSubmission] Max retries reached for ${submission.id} - keeping as abandoned`
          );
          updatedPending.push(submission);
          result.stillPending++;
          continue;
        }

        // Attempt to submit
        try {
          console.log(`[PendingSubmission] Retrying ${submission.id} (attempt ${submission.retryCount + 1}/${MAX_RETRIES})...`);

          const submitResult = await SupabaseCompetitionService.submitWorkoutSimple({
            eventId: submission.submissionData.eventId,
            npub: submission.submissionData.npub,
            type: submission.submissionData.type,
            distance: submission.submissionData.distance,
            duration: submission.submissionData.duration,
            calories: submission.submissionData.calories,
            startTime: submission.submissionData.startTime,
            tags: submission.submissionData.tags,
            profileName: submission.submissionData.profileName,
            profilePicture: submission.submissionData.profilePicture,
          });

          if (submitResult.success) {
            console.log(`[PendingSubmission] ✅ Successfully synced: ${submission.id}`);
            result.succeeded++;
            // Don't add to updatedPending - it's removed from queue
          } else if (submitResult.error?.includes('duplicate')) {
            // Already submitted (somehow) - remove from queue
            console.log(`[PendingSubmission] ✅ Already synced (duplicate): ${submission.id}`);
            result.succeeded++;
          } else {
            // Submission failed - update retry count and backoff
            const newRetryCount = submission.retryCount + 1;
            const backoffMs = BACKOFF_INTERVALS[Math.min(newRetryCount - 1, BACKOFF_INTERVALS.length - 1)];

            updatedPending.push({
              ...submission,
              retryCount: newRetryCount,
              lastError: submitResult.error || 'Unknown error',
              nextRetryTime: now + backoffMs,
            });

            console.warn(
              `[PendingSubmission] ❌ Retry failed: ${submission.id} - ${submitResult.error}`
            );
            result.failed++;
          }
        } catch (error) {
          // Network error or exception - update retry count
          const newRetryCount = submission.retryCount + 1;
          const backoffMs = BACKOFF_INTERVALS[Math.min(newRetryCount - 1, BACKOFF_INTERVALS.length - 1)];

          updatedPending.push({
            ...submission,
            retryCount: newRetryCount,
            lastError: error instanceof Error ? error.message : 'Unknown error',
            nextRetryTime: now + backoffMs,
          });

          console.warn(
            `[PendingSubmission] ❌ Retry exception: ${submission.id} - ${error}`
          );
          result.failed++;
        }
      }

      // Save updated queue
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPending));

      console.log(
        `[PendingSubmission] Retry complete: ${result.succeeded} synced, ${result.failed} failed, ${result.stillPending} pending`
      );

      return result;
    } catch (error) {
      console.error('[PendingSubmission] retryAll failed:', error);
      return result;
    }
  }

  /**
   * Get count of pending submissions for badge display
   */
  static async getPendingCount(): Promise<number> {
    try {
      const pending = await this.getPending();
      return pending.length;
    } catch (error) {
      console.error('[PendingSubmission] Failed to get count:', error);
      return 0;
    }
  }

  /**
   * Convert a pending submission to leaderboard entry format
   * Used for hybrid leaderboard display (local data + Supabase data)
   */
  static toLeaderboardEntry(
    pending: PendingSubmission,
    userProfile?: ProfileData
  ): LeaderboardEntry & { isPending: boolean } {
    const { submissionData } = pending;

    // For time-based leaderboards (5K, 10K, etc.), score is time in seconds
    // Lower is better
    let score = submissionData.duration;
    let formattedScore = formatTime(submissionData.duration);

    // For steps leaderboard, look for steps tag
    const stepsTag = submissionData.tags.find((t) => t[0] === 'steps');
    if (stepsTag && submissionData.type === 'walking') {
      const steps = parseInt(stepsTag[1]) || 0;
      score = steps;
      formattedScore = `${steps.toLocaleString()} steps`;
    }

    return {
      rank: 0, // Will be recalculated after merge
      npub: submissionData.npub,
      name: userProfile?.name || submissionData.profileName || 'Anonymous',
      score,
      formattedScore,
      workoutCount: 1,
      isPending: true, // Mark as pending for UI display
    };
  }

  /**
   * Clear all pending submissions (for testing/debugging)
   */
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('[PendingSubmission] Cleared all pending submissions');
    } catch (error) {
      console.error('[PendingSubmission] Failed to clear:', error);
    }
  }
}

/**
 * Format time in seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  if (seconds < 3600) {
    // Less than 1 hour: MM:SS
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  } else {
    // 1 hour or more: HH:MM:SS
    const hours = Math.floor(seconds / 3600);
    const min = Math.floor((seconds % 3600) / 60);
    const sec = Math.round(seconds % 60);
    return `${hours}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
}

export default PendingSubmissionService;
