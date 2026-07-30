/**
 * ClubChatAutoShare - Auto-share workouts to club chat
 *
 * Posts a system workout message to the user's club chat when they
 * complete a workout. Fire-and-forget — never blocks workout completion.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClubChatService } from '../backend/ClubChatService';
import type { WorkoutMessageMetadata } from '../../types/club';
import { formatDuration } from '../../utils/formatters';

interface ShareWorkoutParams {
  senderNpub: string;
  exerciseType: string;
  distanceMeters?: number;
  durationSeconds: number;
  profileName?: string;
}


/**
 * Build a readable one-line workout summary.
 * E.g. "Dakota ran 5.20 km in 28:14" or "Dakota completed a strength workout (15:30)"
 */
function buildWorkoutSummary(params: ShareWorkoutParams): string {
  const name = params.profileName || 'A member';
  const duration = formatDuration(params.durationSeconds);

  const verbMap: Record<string, string> = {
    running: 'ran',
    walking: 'walked',
    cycling: 'cycled',
    hiking: 'hiked',
    swimming: 'swam',
  };

  const verb = verbMap[params.exerciseType];

  if (verb && params.distanceMeters && params.distanceMeters > 0) {
    const km = (params.distanceMeters / 1000).toFixed(2);
    return `${name} ${verb} ${km} km in ${duration}`;
  }

  const activityMap: Record<string, string> = {
    strength: 'strength workout',
    yoga: 'yoga session',
    meditation: 'meditation session',
    diet: 'meal log',
  };
  const activity = activityMap[params.exerciseType] || 'workout';
  return `${name} completed a ${activity} (${duration})`;
}

/**
 * Share a completed workout to the user's club chat.
 * Returns early if the user is not in a club.
 */
export async function shareWorkoutToClubChat(params: ShareWorkoutParams): Promise<void> {
  const clubId = await AsyncStorage.getItem('@runstr:club_id');
  if (!clubId) return;

  const content = buildWorkoutSummary(params);

  const metadata: WorkoutMessageMetadata = {
    exercise_type: params.exerciseType,
    duration_seconds: params.durationSeconds,
    distance_meters: params.distanceMeters,
    profile_name: params.profileName,
  };

  await ClubChatService.sendMessage(clubId, params.senderNpub, content, {
    messageType: 'workout',
    metadata,
  });
}
