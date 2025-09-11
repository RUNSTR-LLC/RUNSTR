/**
 * User Profile Service
 * Handles user profiles, preferences, and fitness data management
 */

import { supabase } from '../supabase';
import {
  type UserPreferences,
  type UserFitnessProfile,
} from '../../utils/teamMatching';
import type { User, ApiResponse, NotificationSettings } from '../../types';
import { nostrProfileService } from '../nostr/NostrProfileService';

export interface UserProfile extends User {
  preferences?: UserPreferences;
  fitnessProfile?: UserFitnessProfile;
  teamJoinedAt?: string;
  teamSwitchCooldownUntil?: string;
  notificationSettings?: NotificationSettings;
}

export class ProfileService {
  /**
   * Get complete user profile with preferences and fitness data
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    console.log('🔍 ProfileService.getUserProfile called for userId:', userId);
    try {
      // Get basic user data from minimal Supabase record
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('npub', userId) // Updated: use npub as primary key
        .single();

      if (userError) {
        console.error('❌ Supabase user query error:', userError);
        throw userError;
      }
      if (!user) {
        console.warn('⚠️  No user found in database for ID:', userId);
        return null;
      }

      console.log('✅ Found user in database:', {
        npub: user.npub?.slice(0, 20) + '...',
        healthkit_enabled: user.healthkit_enabled,
        ghost_mode: user.ghost_mode
      });

      // Note: user_preferences, team_members, user_team_switches tables removed
      // These were likely unused since the service was working well - data comes from Nostr
      const preferencesData = null;
      const teamMemberData = null;
      const cooldownData = null;

      // Transform user preferences
      const preferences: UserPreferences | undefined = preferencesData
        ? {
            primaryGoal: preferencesData.primary_goal,
            competitiveLevel: preferencesData.competitive_level,
            timeCommitment: preferencesData.time_commitment,
            preferredRewardSize: preferencesData.preferred_reward_size,
            experienceLevel: preferencesData.experience_level,
          }
        : undefined;

      // Get user's fitness profile (now using npub)
      const fitnessProfile = await this.calculateFitnessProfile(userId);

      // Fetch Nostr profile data to populate profile fields
      console.log('🔍 ProfileService.getUserProfile called for user:', user.npub?.slice(0, 20) + '...');
      let nostrProfile = null;
      if (user.npub) {
        try {
          console.log('📡 Fetching Nostr profile...');
          nostrProfile = await nostrProfileService.getProfile(user.npub);
          console.log(
            `✅ Loaded Nostr profile for ${user.npub.slice(0, 20)}...`,
            nostrProfile ? `(${nostrProfile.display_name || nostrProfile.name})` : '(no profile)'
          );
          if (nostrProfile) {
            console.log('📋 Nostr profile data:', {
              displayName: nostrProfile.display_name,
              picture: nostrProfile.picture?.substring(0, 50) + '...',
              banner: nostrProfile.banner ? 'yes' : 'no',
              bio: nostrProfile.about?.substring(0, 50) + '...',
              lud16: nostrProfile.lud16
            });
          }
        } catch (error) {
          console.warn('❌ Failed to fetch Nostr profile:', error);
        }
      } else {
        console.warn('⚠️  No npub found for user');
      }

      // Create comprehensive user profile with Nostr data
      const userProfile: UserProfile = {
        id: user.npub, // Use npub as id
        npub: user.npub,
        name: nostrProfile?.name || 'Anonymous', // Required field with fallback
        role: 'member', // Default role since we removed role from minimal schema
        createdAt: user.created_at,
        lastSyncAt: user.last_sync || null,
        preferences,
        fitnessProfile,
        teamJoinedAt: teamMemberData?.joined_at,
        teamSwitchCooldownUntil: cooldownData?.cooldown_until,
        
        // Populate Nostr profile fields (primary source)
        bio: nostrProfile?.about,
        website: nostrProfile?.website,
        picture: nostrProfile?.picture,
        banner: nostrProfile?.banner,
        lud16: nostrProfile?.lud16,
        displayName: nostrProfile?.display_name || nostrProfile?.name,
      };

      return userProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<ApiResponse> {
    try {
      // Note: user_preferences table was removed in hybrid architecture
      // Preferences are handled via AsyncStorage (NotificationPreferencesService) or Nostr
      console.log('updateUserPreferences called but user_preferences table was removed - no-op');
      console.log('Consider using NotificationPreferencesService for UI preferences or Nostr for profile data');

      return { success: true, message: 'Preferences update skipped - table removed in hybrid architecture' };
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return { success: false, error: 'Failed to update preferences' };
    }
  }

  /**
   * Calculate user fitness profile from workout history
   */
  static async calculateFitnessProfile(
    userId: string
  ): Promise<UserFitnessProfile | undefined> {
    try {
      // TEMP FIX: Return undefined for fitness profile until workouts table is properly configured
      // This prevents the "start_time does not exist" error from blocking the app
      console.log(
        'ProfileService: Skipping fitness profile calculation (workouts table needs schema fix)'
      );
      return undefined;

      // TODO: Re-enable this once workouts table schema is confirmed
      // Get recent workouts (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('npub', userId) // Updated: use npub instead of user_id
        .gte('start_time', thirtyDaysAgo.toISOString())
        .order('start_time', { ascending: false });

      if (error) throw error;
      if (!workouts || workouts.length === 0) return undefined;

      // Calculate fitness metrics - workouts is guaranteed to be non-null here
      const totalWorkouts = workouts.length;
      const totalDistance = workouts.reduce(
        (sum, w) => sum + (w.distance || 0),
        0
      );
      const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);

      const avgDistance = totalDistance / totalWorkouts;
      const avgDuration = totalDuration / totalWorkouts;
      const avgPace = avgDistance > 0 ? avgDuration / (avgDistance / 1609) : 0; // seconds per mile

      const fitnessProfile: UserFitnessProfile = {
        weeklyDistance: totalDistance / 4.3, // Convert monthly to weekly average
        avgPaceSeconds: avgPace,
        consistency: Math.min(totalWorkouts / 20, 1), // 20 workouts = perfect consistency
        improvement: await this.calculateFitnessImprovement(userId),
      };

      return fitnessProfile;
    } catch (error) {
      console.error('Error calculating fitness profile:', error);
      return undefined;
    }
  }

  /**
   * Calculate fitness improvement trend
   */
  static async calculateFitnessImprovement(userId: string): Promise<number> {
    try {
      // Get workouts from last 60 days, split into two 30-day periods
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: allWorkouts, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('npub', userId) // Updated: use npub instead of user_id
        .gte('start_time', sixtyDaysAgo.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      if (!allWorkouts || allWorkouts.length < 4) return 0; // Need minimum data

      // Split into two periods
      const firstPeriod = allWorkouts.filter(
        (w) => new Date(w.start_time) < thirtyDaysAgo
      );
      const secondPeriod = allWorkouts.filter(
        (w) => new Date(w.start_time) >= thirtyDaysAgo
      );

      if (firstPeriod.length === 0 || secondPeriod.length === 0) return 0;

      // Calculate average pace for each period
      const firstAvgPace = this.calculateAveragePace(firstPeriod);
      const secondAvgPace = this.calculateAveragePace(secondPeriod);

      if (firstAvgPace === 0 || secondAvgPace === 0) return 0;

      // Calculate improvement (negative = faster pace = improvement)
      const improvementPercent = (firstAvgPace - secondAvgPace) / firstAvgPace;

      // Cap improvement at ±50% for realistic bounds
      return Math.max(-0.5, Math.min(0.5, improvementPercent));
    } catch (error) {
      console.error('Error calculating fitness improvement:', error);
      return 0;
    }
  }

  /**
   * Get most frequent workout types for user
   */
  private static getMostFrequentWorkoutTypes(workouts: any[]): string[] {
    const typeCounts = workouts.reduce((counts, workout) => {
      counts[workout.type] = (counts[workout.type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([type]) => type);
  }

  /**
   * Calculate average pace from workouts
   */
  private static calculateAveragePace(workouts: any[]): number {
    if (workouts.length === 0) return 0;

    const paces = workouts
      .filter((w) => w.distance && w.distance > 0)
      .map((w) => w.duration / (w.distance / 1609)); // seconds per mile

    if (paces.length === 0) return 0;

    return paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
  }

  /**
   * Get recommended teams based on user preferences
   */
  static async getRecommendedTeams(userId: string): Promise<any[]> {
    // TODO: Implement team recommendation logic
    return [];
  }

  /**
   * Switch user between teams
   */
  static async switchTeams(
    userId: string,
    fromTeamId: string,
    toTeamId: string
  ): Promise<any> {
    // TODO: Implement team switching logic
    return { success: false, error: 'Not implemented yet' };
  }

  /**
   * Get team switch cooldown period
   */
  static async getTeamSwitchCooldown(userId: string): Promise<any> {
    // TODO: Implement cooldown check
    return { canSwitch: true, cooldownUntil: null };
  }

  /**
   * Get team participation statistics
   */
  static async getTeamParticipationStats(userId: string): Promise<any> {
    // TODO: Implement participation stats
    return { eventsParticipated: 0, challengesWon: 0, winRate: 0 };
  }

  /**
   * Initialize user for team discovery
   */
  static async initializeUserForTeamDiscovery(
    userId: string,
    basicInfo: any
  ): Promise<any> {
    // TODO: Implement user initialization for team discovery
    return { success: true };
  }

  /**
   * Sign out user
   */
  static async signOut(userId: string): Promise<void> {
    try {
      console.log('ProfileService: Initiating sign out for user:', userId);

      // Import AuthService to avoid circular dependencies
      const { AuthService } = await import('../auth/authService');

      // Call the actual AuthService signOut method
      const result = await AuthService.signOut();

      if (result.success) {
        console.log('ProfileService: User successfully signed out');
      } else {
        console.error('ProfileService: Sign out failed:', result.error);
        throw new Error(result.error || 'Sign out failed');
      }
    } catch (error) {
      console.error('ProfileService: Error during sign out:', error);
      throw error;
    }
  }
}
