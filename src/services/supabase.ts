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
  process.env.NODE_ENV === 'development' &&
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

// Database types for hybrid Nostr/Supabase architecture
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          npub: string;
          device_token: string | null;
          healthkit_enabled: boolean;
          last_sync: string | null;
          ghost_mode: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          npub: string;
          device_token?: string | null;
          healthkit_enabled?: boolean;
          last_sync?: string | null;
          ghost_mode?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          npub?: string;
          device_token?: string | null;
          healthkit_enabled?: boolean;
          last_sync?: string | null;
          ghost_mode?: boolean;
          updated_at?: string;
        };
      };
      workouts: {
        Row: {
          id: string;
          npub: string;
          workout_id: string | null;
          type: string;
          duration: number | null;
          distance: number | null;
          calories: number | null;
          start_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          npub: string;
          workout_id?: string | null;
          type: string;
          duration?: number | null;
          distance?: number | null;
          calories?: number | null;
          start_time: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          npub?: string;
          workout_id?: string | null;
          type?: string;
          duration?: number | null;
          distance?: number | null;
          calories?: number | null;
          start_time?: string;
          created_at?: string;
        };
      };
      competition_entries: {
        Row: {
          id: string;
          npub: string;
          competition_id: string;
          workout_id: string | null;
          score: number | null;
          auto_entered: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          npub: string;
          competition_id: string;
          workout_id?: string | null;
          score?: number | null;
          auto_entered?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          npub?: string;
          competition_id?: string;
          workout_id?: string | null;
          score?: number | null;
          auto_entered?: boolean;
          created_at?: string;
        };
      };
      device_tokens: {
        Row: {
          id: string;
          token: string;
          npub: string;
          device_id: string;
          platform: 'ios' | 'android';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          npub: string;
          device_id: string;
          platform: 'ios' | 'android';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          npub?: string;
          device_id?: string;
          platform?: 'ios' | 'android';
          is_active?: boolean;
          updated_at?: string;
        };
      };
    };
  };
};
