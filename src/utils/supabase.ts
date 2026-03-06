/**
 * Supabase Client Configuration
 *
 * Provides a configured Supabase client for competition management,
 * workout submission, and leaderboard fetching.
 *
 * Note: We're NOT using Supabase Auth - users authenticate via Nostr (nsec).
 * Supabase is used purely for data storage/retrieval.
 */

import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables (set in .env file)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Missing environment variables. Competition features will be disabled.',
    '\nEXPO_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL,
    '\nEXPO_PUBLIC_SUPABASE_ANON_KEY:', !!SUPABASE_ANON_KEY
  );
}

// Create Supabase client without auth (we use Nostr for auth)
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          // Disable all auth features - we use Nostr nsec for authentication
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

/**
 * Get the Supabase client, throwing if not configured
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
    );
  }
  return supabase;
}

// Template-specific configuration stored in competitions.config JSONB column
export interface CompetitionConfig {
  activity_types?: string[];       // ['running', 'walking'] - overrides activity_type
  score_unit?: string;             // 'km', 'mi', 'steps', 'minutes', 'count'
  rules?: string;                  // Plain text rules/description
  winner_count?: number;           // Top N winners (0 = no ranked winners)
  goal_distance_km?: number;       // For goal_challenge template
  goal_workout_count?: number;     // For goal_challenge template
  featured_charities?: string[];   // For fundraiser template
  target_distance_km?: number;     // For fastest_time: target distance (e.g. 5.0 for 5K)
  distance_tolerance_km?: number;  // For fastest_time: tolerance (e.g. 0.5 = ±500m)
  prizes?: Array<{
    place: number | 'finisher';
    amount_sats: number;
    label: string;
  }>;
  requires_subscription?: 'supporter' | 'pro'; // Minimum tier required to join
  ticket_pledge_days?: number;                 // Days of rewards pledged to enter event
  captain_lightning_address?: string;           // Captain's lightning address for pledge rewards
  winner_selection?: 'top_ranked' | 'random';  // How winner is selected
  qualifying_distance_km?: number;             // Minimum km to qualify
}

// Database types for type safety
export interface Competition {
  id: string;
  external_id: string;
  name: string;
  description?: string | null;
  activity_type: string;
  scoring_method: 'total_distance' | 'total_duration' | 'workout_count' | 'fastest_time' | 'total_steps';
  start_date: string;
  end_date: string;
  prize_pool_sats?: number;
  created_at: string;
  metadata: Record<string, unknown>;
  template: string;
  config: CompetitionConfig;
  image_url?: string;
  is_open: boolean;
  created_by_npub?: string;
  club_id?: string;
}

export interface CompetitionParticipant {
  id: string;
  competition_id: string;
  npub: string;
  joined_at: string;
}

export interface WorkoutSubmission {
  id: string;
  npub: string;
  event_id: string;
  activity_type: string;
  distance_meters: number | null;
  duration_seconds: number | null;
  calories: number | null;
  step_count: number | null;
  created_at: string;
  submitted_at: string;
  raw_event: Record<string, unknown>;
}

export interface LeaderboardEntry {
  npub: string;
  score: number;
  rank: number;
  workout_count?: number;
  // Charity from user's most recent workout
  charityId?: string;
  charityName?: string;
}

export interface CharityRanking {
  rank: number;
  charityId: string;
  charityName: string;
  lightningAddress?: string;
  totalDistance: number; // Total meters from all participants supporting this charity
  participantCount: number; // How many participants support this charity
}
