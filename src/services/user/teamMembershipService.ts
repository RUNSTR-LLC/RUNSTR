/**
 * Team Membership Service
 * Handles team switching, cooldowns, and membership operations
 */

import { supabase } from '../supabase';
import {
  TeamMatchingAlgorithm,
  type UserPreferences,
  type UserFitnessProfile,
} from '../../utils/teamMatching';
import type { DiscoveryTeam, TeamMatch, ApiResponse } from '../../types';

export interface TeamSwitchResult {
  success: boolean;
  error?: string;
  cooldownUntil?: string;
}

export class TeamMembershipService {
  /**
   * Get recommended teams based on user preferences and fitness profile
   */
  static async getRecommendedTeams(
    userId: string,
    limit: number = 10
  ): Promise<TeamMatch[]> {
    try {
      // Get user preferences and fitness profile
      const { data: user } = await supabase
        .from('users')
        .select(
          `
          *,
          user_preferences(*)
        `
        )
        .eq('id', userId)
        .single();

      if (!user) return [];

      // Get available teams
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .eq('is_active', true);

      if (!teams) return [];

      // Calculate user fitness profile
      const userFitnessProfile = await this.calculateUserFitnessProfile(userId);

      const userPreferences: UserPreferences = user.user_preferences?.[0]
        ? {
            primaryGoal: user.user_preferences[0].primary_goal,
            competitiveLevel: user.user_preferences[0].competitive_level,
            timeCommitment: user.user_preferences[0].time_commitment,
            preferredRewardSize: user.user_preferences[0].preferred_reward_size,
            experienceLevel: user.user_preferences[0].experience_level,
            // receiveNotifications: user.user_preferences[0].receive_notifications ?? true, // Not in UserPreferences interface
          }
        : this.getDefaultPreferences();

      // Use matching algorithm to find best teams
      const matches = TeamMatchingAlgorithm.findMatches(
        teams,
        userPreferences,
        userFitnessProfile || {
          weeklyDistance: 0,
          consistency: 0.5,
          improvement: 0,
        },
        5
      );

      // Convert to expected format
      return matches
        .map((match) => ({
          team: match.team,
          score: match.score,
          reasons: match.reasons,
          warnings: match.warnings,
          expectedEarnings: match.expectedEarnings,
          competitiveViability: match.competitiveViability,
          difficulty: match.team.difficulty,
          prizePool: match.team.prizePool,
          recentActivity: true, // TODO: Calculate from actual activity
        }))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recommended teams:', error);
      return [];
    }
  }

  /**
   * Check if user can switch teams (cooldown and other restrictions)
   */
  static async canUserSwitchTeams(userId: string): Promise<{
    canSwitch: boolean;
    reason?: string;
    cooldownUntil?: string;
  }> {
    try {
      // Check if user has an active team membership
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id, joined_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!membership) {
        return { canSwitch: true }; // No current team, can join any team
      }

      // Check cooldown from recent switches
      const { data: recentSwitch } = await supabase
        .from('user_team_switches')
        .select('cooldown_until')
        .eq('user_id', userId)
        .order('cooldown_until', { ascending: false })
        .limit(1)
        .single();

      if (recentSwitch?.cooldown_until) {
        const cooldownDate = new Date(recentSwitch.cooldown_until);
        const now = new Date();

        if (cooldownDate > now) {
          return {
            canSwitch: false,
            reason: 'Team switch cooldown active',
            cooldownUntil: recentSwitch.cooldown_until,
          };
        }
      }

      // Check if user has been in current team for minimum duration (24 hours)
      const joinedDate = new Date(membership.joined_at);
      const minStayUntil = new Date(joinedDate.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();

      if (minStayUntil > now) {
        return {
          canSwitch: false,
          reason: 'Must stay in team for at least 24 hours',
          cooldownUntil: minStayUntil.toISOString(),
        };
      }

      return { canSwitch: true };
    } catch (error) {
      console.error('Error checking team switch eligibility:', error);
      return {
        canSwitch: false,
        reason: 'Unable to verify switch eligibility',
      };
    }
  }

  /**
   * Switch user to a new team with exit fee payment
   */
  static async switchTeams(
    userId: string,
    newTeamId: string,
    exitFeeAmount: number = 2000
  ): Promise<TeamSwitchResult> {
    try {
      // Start transaction
      const { data: user } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if switch is allowed
      const switchCheck = await this.canUserSwitchTeams(userId);
      if (!switchCheck.canSwitch) {
        return {
          success: false,
          error: switchCheck.reason,
          cooldownUntil: switchCheck.cooldownUntil,
        };
      }

      // Get current team membership
      const { data: currentMembership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      // Deactivate current team membership
      if (currentMembership) {
        const { error: deactivateError } = await supabase
          .from('team_members')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('team_id', currentMembership.team_id);

        if (deactivateError) throw deactivateError;

        // Record team switch with cooldown
        const cooldownUntil = new Date();
        cooldownUntil.setDate(cooldownUntil.getDate() + 7); // 7-day cooldown

        const { error: switchRecordError } = await supabase
          .from('user_team_switches')
          .insert({
            user_id: userId,
            from_team_id: currentMembership.team_id,
            to_team_id: newTeamId,
            exit_fee_paid: exitFeeAmount,
            cooldown_until: cooldownUntil.toISOString(),
          });

        if (switchRecordError) throw switchRecordError;

        // TODO: Process exit fee payment of 2000 sats to platform
        // This would integrate with the bitcoin payment system
      }

      // Create new team membership
      const { error: joinError } = await supabase.from('team_members').insert({
        user_id: userId,
        team_id: newTeamId,
        role: 'member',
        is_active: true,
      });

      if (joinError) throw joinError;

      return {
        success: true,
        cooldownUntil: currentMembership
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      };
    } catch (error) {
      console.error('Error switching teams:', error);
      return {
        success: false,
        error: 'Failed to switch teams',
      };
    }
  }

  /**
   * Get team participation statistics for user
   */
  static async getTeamParticipationStats(userId: string): Promise<{
    totalTeamsJoined: number;
    currentStreak: number;
    longestStreak: number;
    avgTimePerTeam: number; // days
    totalEarnings: number; // satoshis
    totalSwitchFees: number; // satoshis paid in exit fees
  }> {
    try {
      // Get all team memberships
      const { data: memberships } = await supabase
        .from('team_members')
        .select('team_id, joined_at, is_active')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true });

      // Get switch history
      const { data: switches } = await supabase
        .from('user_team_switches')
        .select('exit_fee_paid, created_at')
        .eq('user_id', userId);

      // Get earnings from workouts and challenges
      const { data: earnings } = await supabase
        .from('user_earnings')
        .select('amount_sats')
        .eq('user_id', userId);

      // Calculate statistics
      const totalTeamsJoined = memberships?.length || 0;
      const totalSwitchFees =
        switches?.reduce((sum, s) => sum + s.exit_fee_paid, 0) || 0;
      const totalEarnings =
        earnings?.reduce((sum, e) => sum + e.amount_sats, 0) || 0;

      // Calculate streaks and average time
      let currentStreak = 0;
      let longestStreak = 0;
      let totalDaysInTeams = 0;

      if (memberships && memberships.length > 0) {
        // Current streak calculation (simplified)
        currentStreak = memberships[memberships.length - 1].is_active ? 1 : 0;
        longestStreak = Math.max(1, totalTeamsJoined); // Simplified calculation

        // Average time calculation
        for (let i = 0; i < memberships.length; i++) {
          const joinDate = new Date(memberships[i].joined_at);
          const endDate = memberships[i].is_active
            ? new Date()
            : switches?.find((s) => new Date(s.created_at) > joinDate)
            ? new Date(
                switches.find(
                  (s) => new Date(s.created_at) > joinDate
                )!.created_at
              )
            : new Date();

          const daysInTeam = Math.max(
            1,
            Math.floor(
              (endDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)
            )
          );
          totalDaysInTeams += daysInTeam;
        }
      }

      const avgTimePerTeam =
        totalTeamsJoined > 0
          ? Math.floor(totalDaysInTeams / totalTeamsJoined)
          : 0;

      return {
        totalTeamsJoined,
        currentStreak,
        longestStreak,
        avgTimePerTeam,
        totalEarnings,
        totalSwitchFees,
      };
    } catch (error) {
      console.error('Error getting team participation stats:', error);
      return {
        totalTeamsJoined: 0,
        currentStreak: 0,
        longestStreak: 0,
        avgTimePerTeam: 0,
        totalEarnings: 0,
        totalSwitchFees: 0,
      };
    }
  }

  /**
   * Initialize user for team discovery with preferences and fitness profile
   */
  static async initializeUserForTeamDiscovery(
    userId: string,
    preferences?: Partial<UserPreferences>
  ): Promise<ApiResponse<{ teams: DiscoveryTeam[] }>> {
    try {
      // Update user preferences if provided
      if (preferences) {
        await this.updateUserPreferences(userId, preferences);
      }

      // Get recommended teams
      const recommendedTeams = await this.getRecommendedTeams(userId, 20);

      // Convert to DiscoveryTeam format (simplified)
      const discoveryTeams: DiscoveryTeam[] = recommendedTeams.map((match) => ({
        id: match.team.id,
        name: match.team.name,
        description: `Team focused on ${match.team.difficulty} level competition`,
        about: `A great fit for your ${
          preferences?.primaryGoal || 'fitness'
        } goals`,
        captainId: '', // TODO: Get actual captain
        prizePool: match.team.prizePool,
        memberCount: match.team.memberCount,
        joinReward: 0,
        exitFee: 2000,
        sponsoredBy: undefined,
        avatar: undefined,
        createdAt: new Date().toISOString(),
        isActive: true,
        difficulty: match.team.difficulty,
        stats: {
          memberCount: match.team.memberCount,
          avgPace: match.team.stats?.avgPace ?? '0:00/mi',
          activeEvents: 0, // TODO: Get actual data
          activeChallenges: 0, // TODO: Get actual data
        },
        recentActivities: [], // TODO: Get actual activities
        recentPayout: undefined,
        isFeatured: false,
      }));

      return {
        success: true,
        data: { teams: discoveryTeams },
        message: 'Team discovery initialized successfully',
      };
    } catch (error) {
      console.error('Error initializing team discovery:', error);
      return {
        success: false,
        error: 'Failed to initialize team discovery',
      };
    }
  }

  /**
   * Get current team switch cooldown status
   */
  static async getTeamSwitchCooldown(userId: string): Promise<{
    isActive: boolean;
    cooldownUntil?: string;
    remainingHours?: number;
  }> {
    try {
      const { data: recentSwitch } = await supabase
        .from('user_team_switches')
        .select('cooldown_until')
        .eq('user_id', userId)
        .order('cooldown_until', { ascending: false })
        .limit(1)
        .single();

      if (!recentSwitch?.cooldown_until) {
        return { isActive: false };
      }

      const cooldownDate = new Date(recentSwitch.cooldown_until);
      const now = new Date();

      if (cooldownDate <= now) {
        return { isActive: false };
      }

      const remainingMs = cooldownDate.getTime() - now.getTime();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

      return {
        isActive: true,
        cooldownUntil: recentSwitch.cooldown_until,
        remainingHours,
      };
    } catch (error) {
      console.error('Error getting team switch cooldown:', error);
      return { isActive: false };
    }
  }

  // Helper Methods

  private static async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    const { error } = await supabase.from('user_preferences').upsert(
      {
        user_id: userId,
        primary_goal: preferences.primaryGoal,
        competitive_level: preferences.competitiveLevel,
        time_commitment: preferences.timeCommitment,
        preferred_reward_size: preferences.preferredRewardSize,
        experience_level: preferences.experienceLevel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) throw error;
  }

  private static async calculateUserFitnessProfile(
    userId: string
  ): Promise<UserFitnessProfile | undefined> {
    // This would implement fitness profile calculation
    // For now, return undefined to avoid complexity
    return undefined;
  }

  private static getDefaultPreferences(): UserPreferences {
    return {
      primaryGoal: 'fitness',
      competitiveLevel: 'moderate',
      timeCommitment: 'medium',
      preferredRewardSize: 'medium_regular',
      experienceLevel: 'intermediate',
      // receiveNotifications: true, // Not in UserPreferences interface
    };
  }

  private static formatPace(paceSeconds: number): string {
    if (paceSeconds <= 0) return '0:00/mi';
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/mi`;
  }
}
