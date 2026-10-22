/**
 * publishRun - Publish one run to Nostr as a kind 1301 note and record it
 * Shared by the post-run summary and History so both mark a run the same way:
 * WorkoutStatusTracker (never auto-publish twice) and, for runs stored on this
 * device, the LocalWorkout's syncedToNostr/nostrEventId fields.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import workoutPublishingService from './workoutPublishingService';
import type { PublishableWorkout } from './workoutPublishingService';
import { UnifiedSigningService } from '../auth/UnifiedSigningService';
import WorkoutStatusTracker from '../fitness/WorkoutStatusTracker';
import LocalWorkoutStorageService from '../fitness/LocalWorkoutStorageService';

export type PublishRunResult =
  | { status: 'published'; eventId?: string }
  | { status: 'failed' }
  | { status: 'noSigner' };

/** Never throws: a failed publish leaves the run saved on this device. */
export async function publishRun(workout: PublishableWorkout): Promise<PublishRunResult> {
  try {
    const signer = await UnifiedSigningService.getInstance().getSigner();
    if (!signer) return { status: 'noSigner' };
    const npub = await AsyncStorage.getItem('@runstr:npub');
    const result = await workoutPublishingService.postWorkout(workout, signer, npub || 'unknown');
    if (!result.success) return { status: 'failed' };

    await WorkoutStatusTracker.markAsPosted(workout.id, result.eventId);
    if (result.eventId) {
      // Health-app workouts aren't stored locally; markAsSynced just warns and returns
      await LocalWorkoutStorageService.markAsSynced(workout.id, result.eventId).catch(() => {});
    }
    return { status: 'published', eventId: result.eventId };
  } catch (error) {
    console.warn('[publishRun] Publish failed:', error);
    return { status: 'failed' };
  }
}
