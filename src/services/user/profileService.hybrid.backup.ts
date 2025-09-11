/**
 * Hybrid Profile Service - Simplified for Nostr/Supabase Architecture
 * 
 * Hybrid Approach:
 * - Profile data (name, bio, picture): From Nostr kind 0 events
 * - Team membership: From Nostr team lists  
 * - Workout metrics: From Supabase workouts table (minimal data only)
 * - User settings: From AsyncStorage (NotificationPreferencesService)
 * - Device tokens: From Supabase device_tokens table
 */

import { supabase } from '../supabase';
import type { ApiResponse } from '../../types';
import { nostrProfileService } from '../nostr/NostrProfileService';

// Minimal user record in Supabase (privacy-first)
export interface SupabaseUserRecord {
  npub: string;
  device_token?: string | null;
  healthkit_enabled: boolean;
  last_sync?: string | null;
  ghost_mode: boolean;
  created_at: string;
  updated_at: string;
}

// Full hybrid profile combining Nostr + minimal Supabase data
export interface HybridUserProfile {
  // Core identity (from Supabase)
  npub: string;
  healthkit_enabled: boolean;
  last_sync?: string | null;
  ghost_mode: boolean;
  
  // Profile data (from Nostr kind 0 events)
  name?: string;
  display_name?: string;
  bio?: string;
  picture?: string;
  banner?: string;
  website?: string;
  lud16?: string;
  
  // Workout metrics (calculated from Supabase workouts)
  workoutStats?: {
    totalWorkouts: number;
    totalDistance: number; // meters
    totalDuration: number; // seconds
    avgPace?: number; // seconds per mile
    weeklyDistance: number;
    consistency: number; // 0-1
  };
}

export class HybridProfileService {
  /**
   * Get or create minimal user record in Supabase
   */
  static async ensureUserRecord(npub: string): Promise<SupabaseUserRecord> {
    console.log('🔍 Ensuring user record exists for npub:', npub.slice(0, 20) + '...');
    
    try {
      // Try to get existing user record
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('npub', npub)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 = not found, which is expected for new users
        throw selectError;
      }

      if (existingUser) {
        console.log('✅ Found existing user record');
        return existingUser;
      }

      // Create new minimal user record
      console.log('📝 Creating new user record in Supabase');
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          npub,
          healthkit_enabled: false,
          ghost_mode: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newUser) throw new Error('Failed to create user record');

      console.log('✅ Created new user record');
      return newUser;
    } catch (error) {
      console.error('❌ Error ensuring user record:', error);
      throw error;
    }
  }

  /**
   * Get complete hybrid profile (Nostr + Supabase data)
   */
  static async getHybridProfile(npub: string): Promise<HybridUserProfile | null> {
    console.log('🔍 Getting hybrid profile for npub:', npub.slice(0, 20) + '...');
    
    try {
      // Get minimal Supabase user record
      const userRecord = await this.ensureUserRecord(npub);
      
      // Get Nostr profile data
      let nostrProfile = null;
      try {
        console.log('📡 Fetching Nostr profile data...');
        nostrProfile = await nostrProfileService.getProfile(npub);
        console.log('✅ Loaded Nostr profile:', nostrProfile ? 'found' : 'not found');
      } catch (error) {
        console.warn('❌ Failed to fetch Nostr profile:', error);
      }

      // Calculate workout statistics
      const workoutStats = await this.calculateWorkoutStats(npub);

      // Combine into hybrid profile
      const hybridProfile: HybridUserProfile = {
        // Core identity from Supabase
        npub: userRecord.npub,
        healthkit_enabled: userRecord.healthkit_enabled,
        last_sync: userRecord.last_sync,
        ghost_mode: userRecord.ghost_mode,
        
        // Profile data from Nostr
        name: nostrProfile?.name,
        display_name: nostrProfile?.display_name,
        bio: nostrProfile?.about,
        picture: nostrProfile?.picture,
        banner: nostrProfile?.banner,
        website: nostrProfile?.website,
        lud16: nostrProfile?.lud16,
        
        // Workout statistics from Supabase
        workoutStats,
      };

      console.log('✅ Built hybrid profile successfully');
      return hybridProfile;
    } catch (error) {
      console.error('❌ Error getting hybrid profile:', error);
      return null;
    }
  }

  /**
   * Update user settings in Supabase (minimal data only)
   */
  static async updateUserSettings(
    npub: string, 
    settings: {
      healthkit_enabled?: boolean;
      ghost_mode?: boolean;
      device_token?: string | null;
    }
  ): Promise<void> {
    console.log('📝 Updating user settings for npub:', npub.slice(0, 20) + '...');
    
    try {
      const { error } = await supabase
        .from('users')
        .update(settings)
        .eq('npub', npub);

      if (error) throw error;
      console.log('✅ User settings updated successfully');
    } catch (error) {
      console.error('❌ Error updating user settings:', error);
      throw error;
    }
  }

  /**
   * Calculate workout statistics from Supabase workouts table
   */
  private static async calculateWorkoutStats(npub: string): Promise<HybridUserProfile['workoutStats']> {
    try {
      console.log('📊 Calculating workout stats for npub:', npub.slice(0, 20) + '...');
      
      // Get workouts from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('npub', npub) // Updated: use npub instead of user_id
        .gte('start_time', thirtyDaysAgo.toISOString())
        .order('start_time', { ascending: false });

      if (error) {
        console.warn('❌ Error fetching workouts:', error);
        return undefined;
      }

      if (!workouts || workouts.length === 0) {
        console.log('📊 No workouts found');
        return {
          totalWorkouts: 0,
          totalDistance: 0,
          totalDuration: 0,
          weeklyDistance: 0,
          consistency: 0,
        };
      }

      console.log(`📊 Found ${workouts.length} workouts in last 30 days`);

      // Calculate statistics
      const totalWorkouts = workouts.length;
      const totalDistance = workouts.reduce((sum, w) => sum + (w.distance || 0), 0);
      const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);

      const avgDistance = totalWorkouts > 0 ? totalDistance / totalWorkouts : 0;
      const avgDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;
      const avgPace = avgDistance > 0 ? (avgDuration / 60) / (avgDistance / 1609.34) : undefined; // minutes per mile

      return {
        totalWorkouts,
        totalDistance,
        totalDuration,
        avgPace,
        weeklyDistance: totalDistance / 4.3, // Convert monthly to weekly average
        consistency: Math.min(totalWorkouts / 20, 1), // 20 workouts = perfect consistency
      };
    } catch (error) {
      console.error('❌ Error calculating workout stats:', error);
      return undefined;
    }
  }

  /**
   * Update last sync timestamp (for HealthKit background sync)
   */
  static async updateLastSync(npub: string): Promise<void> {
    console.log('⏰ Updating last sync for npub:', npub.slice(0, 20) + '...');
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ last_sync: new Date().toISOString() })
        .eq('npub', npub);

      if (error) throw error;
      console.log('✅ Last sync updated successfully');
    } catch (error) {
      console.error('❌ Error updating last sync:', error);
      throw error;
    }
  }

  /**
   * Delete user data (minimal - mostly just device tokens)
   */
  static async deleteUserData(npub: string): Promise<void> {
    console.log('🗑️  Deleting user data for npub:', npub.slice(0, 20) + '...');
    
    try {
      // Delete in order due to foreign key constraints
      await supabase.from('competition_entries').delete().eq('npub', npub);
      await supabase.from('workouts').delete().eq('npub', npub);  
      await supabase.from('device_tokens').delete().eq('npub', npub);
      await supabase.from('users').delete().eq('npub', npub);

      console.log('✅ User data deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting user data:', error);
      throw error;
    }
  }

  /**
   * Get user workout history (for Profile screen)
   */
  static async getWorkoutHistory(
    npub: string, 
    limit: number = 50
  ): Promise<Array<{
    id: string;
    workout_id: string | null;
    type: string;
    duration: number | null;
    distance: number | null;
    calories: number | null;
    start_time: string;
    created_at: string;
  }>> {
    console.log('📊 Getting workout history for npub:', npub.slice(0, 20) + '...');
    
    try {
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('npub', npub)
        .order('start_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      console.log(`✅ Retrieved ${workouts?.length || 0} workouts`);
      return workouts || [];
    } catch (error) {
      console.error('❌ Error getting workout history:', error);
      return [];
    }
  }
}