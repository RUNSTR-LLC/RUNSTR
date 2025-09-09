/**
 * RUNSTR Supabase Configuration
 * Central configuration for Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Environment variables - configured via .env file
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://your-project-ref.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'your-anonymous-key-here';

// Development helper - warn if using default values
if (
  __DEV__ &&
  (SUPABASE_URL.includes('your-project') ||
    SUPABASE_ANON_KEY.includes('your-anon'))
) {
  console.warn(
    '⚠️  SUPABASE: Using default credentials. Please update .env file with your actual Supabase project credentials.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types for better TypeScript support
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          name: string;
          avatar: string | null;
          npub: string;
          nsec: string | null; // Encrypted, for local storage reference only
          role: 'member' | 'captain' | null;
          personal_wallet_address: string | null;
          current_team_id: string | null;
          created_at: string;
          last_sync_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          name: string;
          avatar?: string | null;
          npub: string;
          nsec?: string | null;
          role?: 'member' | 'captain' | null;
          personal_wallet_address?: string | null;
          current_team_id?: string | null;
          created_at?: string;
          last_sync_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          name?: string;
          avatar?: string | null;
          npub?: string;
          nsec?: string | null;
          role?: 'member' | 'captain' | null;
          personal_wallet_address?: string | null;
          current_team_id?: string | null;
          last_sync_at?: string | null;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          about: string | null;
          captain_id: string | null;
          prize_pool: number;
          join_reward: number;
          exit_fee: number;
          sponsored_by: string | null;
          member_count: number;
          avg_pace_seconds: number | null;
          difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
          is_active: boolean;
          is_featured: boolean;
          avatar: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          about?: string | null;
          captain_id?: string | null;
          prize_pool?: number;
          join_reward?: number;
          exit_fee?: number;
          sponsored_by?: string | null;
          member_count?: number;
          avg_pace_seconds?: number | null;
          difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
          is_active?: boolean;
          is_featured?: boolean;
          avatar?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          about?: string | null;
          captain_id?: string | null;
          prize_pool?: number;
          join_reward?: number;
          exit_fee?: number;
          sponsored_by?: string | null;
          member_count?: number;
          avg_pace_seconds?: number | null;
          difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
          is_active?: boolean;
          is_featured?: boolean;
          avatar?: string | null;
        };
      };
      activities: {
        Row: {
          id: string;
          team_id: string;
          activity_type: 'event' | 'challenge' | 'announcement' | 'payout';
          title: string;
          description: string | null;
          creator_id: string | null;
          prize_amount: number;
          participant_count: number;
          status: 'upcoming' | 'active' | 'completed' | 'cancelled';
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          is_highlighted: boolean;
        };
        Insert: {
          id?: string;
          team_id: string;
          activity_type: 'event' | 'challenge' | 'announcement' | 'payout';
          title: string;
          description?: string | null;
          creator_id?: string | null;
          prize_amount?: number;
          participant_count?: number;
          status?: 'upcoming' | 'active' | 'completed' | 'cancelled';
          start_date?: string | null;
          end_date?: string | null;
          is_highlighted?: boolean;
        };
        Update: {
          id?: string;
          team_id?: string;
          activity_type?: 'event' | 'challenge' | 'announcement' | 'payout';
          title?: string;
          description?: string | null;
          creator_id?: string | null;
          prize_amount?: number;
          participant_count?: number;
          status?: 'upcoming' | 'active' | 'completed' | 'cancelled';
          start_date?: string | null;
          end_date?: string | null;
          is_highlighted?: boolean;
        };
      };
      team_payouts: {
        Row: {
          id: string;
          team_id: string;
          amount_sats: number;
          recipient_id: string | null;
          description: string | null;
          event_id: string | null;
          challenge_id: string | null;
          paid_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          amount_sats: number;
          recipient_id?: string | null;
          description?: string | null;
          event_id?: string | null;
          challenge_id?: string | null;
          paid_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          amount_sats?: number;
          recipient_id?: string | null;
          description?: string | null;
          event_id?: string | null;
          challenge_id?: string | null;
          paid_at?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: 'member' | 'captain' | 'co_captain';
          joined_at: string;
          is_active: boolean;
          total_workouts: number;
          total_distance_meters: number;
          total_duration_seconds: number;
          avg_pace_seconds: number | null;
          last_workout_at: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role?: 'member' | 'captain' | 'co_captain';
          joined_at?: string;
          is_active?: boolean;
          total_workouts?: number;
          total_distance_meters?: number;
          total_duration_seconds?: number;
          avg_pace_seconds?: number | null;
          last_workout_at?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          role?: 'member' | 'captain' | 'co_captain';
          joined_at?: string;
          is_active?: boolean;
          total_workouts?: number;
          total_distance_meters?: number;
          total_duration_seconds?: number;
          avg_pace_seconds?: number | null;
          last_workout_at?: string | null;
        };
      };
    };
  };
};
