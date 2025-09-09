/**
 * Simple Team Joining Service
 * MVP-focused team joining/leaving operations for RUNSTR
 * Handles basic team membership without complex switching logic
 */

import { supabase } from '../supabase';
import type { DiscoveryTeam, ApiResponse } from '../../types';

export interface TeamJoinResult {
  success: boolean;
  error?: string;
  teamId?: string;
  memberCount?: number;
}

export interface TeamLeaveResult {
  success: boolean;
  error?: string;
  formerTeamId?: string;
}

export class SimpleTeamJoiningService {
  /**
   * Join a team (for users with no current team)
   */
  static async joinTeam(
    userId: string,
    teamId: string
  ): Promise<TeamJoinResult> {
    try {
      console.log(
        `SimpleTeamJoining: User ${userId} attempting to join team ${teamId}`
      );

      // Verify user exists and has no current team
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, role, current_team_id')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('SimpleTeamJoining: User lookup error:', userError);
        return { success: false, error: 'User not found' };
      }

      if (user.current_team_id) {
        return {
          success: false,
          error: 'User already has a team. Use team switching instead.',
        };
      }

      // Verify team exists and is active
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name, is_active, member_count, captain_id')
        .eq('id', teamId)
        .eq('is_active', true)
        .single();

      if (teamError || !team) {
        console.error('SimpleTeamJoining: Team lookup error:', teamError);
        return { success: false, error: 'Team not found or inactive' };
      }

      // Start database transaction simulation (multiple operations)
      // 1. Insert team membership
      const { error: membershipError } = await supabase
        .from('team_members')
        .insert({
          user_id: userId,
          team_id: teamId,
          role: 'member',
          joined_at: new Date().toISOString(),
          is_active: true,
          total_workouts: 0,
          total_distance_meters: 0,
        });

      if (membershipError) {
        console.error(
          'SimpleTeamJoining: Membership insert error:',
          membershipError
        );
        return { success: false, error: 'Failed to create team membership' };
      }

      // 2. Update user's current team
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ current_team_id: teamId })
        .eq('id', userId);

      if (userUpdateError) {
        console.error('SimpleTeamJoining: User update error:', userUpdateError);
        // Rollback: Remove membership if user update failed
        await supabase
          .from('team_members')
          .delete()
          .eq('user_id', userId)
          .eq('team_id', teamId);
        return {
          success: false,
          error: 'Failed to update user team assignment',
        };
      }

      // 3. Update team member count
      const newMemberCount = (team.member_count || 0) + 1;
      const { error: teamUpdateError } = await supabase
        .from('teams')
        .update({ member_count: newMemberCount })
        .eq('id', teamId);

      if (teamUpdateError) {
        console.error(
          'SimpleTeamJoining: Team count update error:',
          teamUpdateError
        );
        // Continue anyway - member count sync issues are not critical
      }

      console.log(
        `SimpleTeamJoining: Successfully joined user ${userId} to team ${teamId}`
      );

      return {
        success: true,
        teamId,
        memberCount: newMemberCount,
      };
    } catch (error) {
      console.error('SimpleTeamJoining: Unexpected error joining team:', error);
      return {
        success: false,
        error: 'Unexpected error occurred while joining team',
      };
    }
  }

  /**
   * Leave current team
   */
  static async leaveTeam(userId: string): Promise<TeamLeaveResult> {
    try {
      console.log(`SimpleTeamJoining: User ${userId} attempting to leave team`);

      // Get user's current team
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, current_team_id')
        .eq('id', userId)
        .single();

      if (userError || !user?.current_team_id) {
        return { success: false, error: 'User has no team to leave' };
      }

      const currentTeamId = user.current_team_id;

      // Get team info for member count update
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('member_count')
        .eq('id', currentTeamId)
        .single();

      // 1. Deactivate team membership
      const { error: membershipError } = await supabase
        .from('team_members')
        .update({
          is_active: false,
          left_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('team_id', currentTeamId)
        .eq('is_active', true);

      if (membershipError) {
        console.error(
          'SimpleTeamJoining: Membership deactivation error:',
          membershipError
        );
        return { success: false, error: 'Failed to leave team' };
      }

      // 2. Clear user's current team
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ current_team_id: null })
        .eq('id', userId);

      if (userUpdateError) {
        console.error('SimpleTeamJoining: User update error:', userUpdateError);
        // Rollback: Reactivate membership
        await supabase
          .from('team_members')
          .update({
            is_active: true,
            left_at: null,
          })
          .eq('user_id', userId)
          .eq('team_id', currentTeamId);
        return { success: false, error: 'Failed to update user team status' };
      }

      // 3. Update team member count
      if (team && team.member_count > 0) {
        const newMemberCount = team.member_count - 1;
        const { error: teamUpdateError } = await supabase
          .from('teams')
          .update({ member_count: newMemberCount })
          .eq('id', currentTeamId);

        if (teamUpdateError) {
          console.error(
            'SimpleTeamJoining: Team count update error:',
            teamUpdateError
          );
          // Continue anyway - member count sync issues are not critical
        }
      }

      console.log(
        `SimpleTeamJoining: Successfully removed user ${userId} from team ${currentTeamId}`
      );

      return {
        success: true,
        formerTeamId: currentTeamId,
      };
    } catch (error) {
      console.error('SimpleTeamJoining: Unexpected error leaving team:', error);
      return {
        success: false,
        error: 'Unexpected error occurred while leaving team',
      };
    }
  }

  /**
   * Get user's current team membership status
   */
  static async getCurrentTeamMembership(userId: string): Promise<{
    hasTeam: boolean;
    teamId?: string;
    teamName?: string;
    joinedAt?: string;
    membershipId?: string;
  }> {
    try {
      const { data: membership, error } = await supabase
        .from('team_members')
        .select(
          `
          id,
          team_id,
          joined_at,
          teams!inner(name)
        `
        )
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !membership) {
        return { hasTeam: false };
      }

      return {
        hasTeam: true,
        teamId: membership.team_id,
        teamName: (membership.teams as any)?.name || 'Unknown Team',
        joinedAt: membership.joined_at,
        membershipId: membership.id,
      };
    } catch (error) {
      console.error('SimpleTeamJoining: Error getting team membership:', error);
      return { hasTeam: false };
    }
  }

  /**
   * Check if user can join a specific team
   */
  static async canJoinTeam(
    userId: string,
    teamId: string
  ): Promise<{
    canJoin: boolean;
    reason?: string;
  }> {
    try {
      // Check if user already has a team
      const membership = await this.getCurrentTeamMembership(userId);
      if (membership.hasTeam) {
        return {
          canJoin: false,
          reason: 'User already belongs to a team',
        };
      }

      // Check if team exists and is active
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, is_active, member_count')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return {
          canJoin: false,
          reason: 'Team does not exist',
        };
      }

      if (!team.is_active) {
        return {
          canJoin: false,
          reason: 'Team is not currently active',
        };
      }

      // TODO: Add team capacity limits if needed
      // if (team.member_count >= MAX_TEAM_SIZE) {
      //   return { canJoin: false, reason: 'Team is full' };
      // }

      return { canJoin: true };
    } catch (error) {
      console.error(
        'SimpleTeamJoining: Error checking join eligibility:',
        error
      );
      return {
        canJoin: false,
        reason: 'Unable to verify team join eligibility',
      };
    }
  }

  /**
   * Get teams user can join (excludes user's current team if any)
   */
  static async getJoinableTeams(userId: string): Promise<DiscoveryTeam[]> {
    try {
      // Get user's current team to exclude it
      const membership = await this.getCurrentTeamMembership(userId);

      let query = supabase.from('teams').select('*').eq('is_active', true);

      // Exclude current team if user has one
      if (membership.hasTeam && membership.teamId) {
        query = query.neq('id', membership.teamId);
      }

      const { data: teams, error } = await query.order('member_count', {
        ascending: false,
      });

      if (error) {
        console.error(
          'SimpleTeamJoining: Error fetching joinable teams:',
          error
        );
        return [];
      }

      // Convert to DiscoveryTeam format
      return (teams || []).map((team) => ({
        id: team.id,
        name: team.name,
        description:
          team.description ||
          'Join this team to compete and earn Bitcoin rewards',
        about:
          team.about ||
          team.description ||
          'A competitive team focused on fitness and rewards',
        captainId: team.captain_id,
        prizePool: team.prize_pool || 0,
        memberCount: team.member_count || 0,
        joinReward: 0, // MVP has no join rewards
        exitFee: 0, // MVP has no exit fees for simple joining
        avatar: team.avatar_url,
        createdAt: team.created_at,
        isActive: team.is_active,
        difficulty: team.difficulty_level || 'beginner',
        stats: {
          memberCount: team.member_count || 0,
          avgPace: team.avg_pace || 'N/A',
          activeEvents: 0, // TODO: Calculate from actual data
          activeChallenges: 0, // TODO: Calculate from actual data
        },
        recentActivities: [], // TODO: Implement activity feed
        recentPayout: undefined, // TODO: Implement payout history
        isFeatured: team.is_featured || false,
      }));
    } catch (error) {
      console.error('SimpleTeamJoining: Error getting joinable teams:', error);
      return [];
    }
  }

  /**
   * Validate team joining operation before execution
   */
  static async validateTeamJoin(
    userId: string,
    teamId: string
  ): Promise<ApiResponse> {
    try {
      const canJoin = await this.canJoinTeam(userId, teamId);

      if (!canJoin.canJoin) {
        return {
          success: false,
          error: canJoin.reason || 'Cannot join team',
        };
      }

      return {
        success: true,
        message: 'Team join validation passed',
      };
    } catch (error) {
      console.error('SimpleTeamJoining: Validation error:', error);
      return {
        success: false,
        error: 'Unable to validate team join request',
      };
    }
  }
}
