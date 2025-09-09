/**
 * RUNSTR Challenge Service
 * Handles challenge creation, management, and peer-to-peer challenge operations
 */

import { supabase } from './supabase';
import type { Challenge, ChallengeCreationData, TeammateInfo } from '../types';

interface CreateChallengeResponse {
  success: boolean;
  challengeId?: string;
  error?: string;
}

export class ChallengeService {
  /**
   * Create a new peer-to-peer challenge
   */
  static async createChallenge(
    challengeData: ChallengeCreationData,
    currentUserId: string,
    teamId: string
  ): Promise<CreateChallengeResponse> {
    try {
      if (!challengeData.opponentInfo || !challengeData.challengeType) {
        return {
          success: false,
          error: 'Missing required challenge data',
        };
      }

      // Calculate deadline
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + challengeData.duration);

      const challengePayload = {
        activity_type: 'challenge',
        team_id: teamId,
        title: `${challengeData.challengeType.name} Challenge`,
        description: challengeData.challengeType.description,
        creator_id: currentUserId,
        challenger_id: currentUserId,
        challenged_id: challengeData.opponentId,
        prize_amount: challengeData.wagerAmount,
        status: 'pending', // Waiting for opponent to accept
        created_at: new Date().toISOString(),
        // Store challenge-specific data in requirements_json
        requirements_json: JSON.stringify({
          challenge_type: challengeData.challengeType.id,
          metric: challengeData.challengeType.metric,
          deadline: deadline.toISOString(),
        }),
      };

      const { data, error } = await supabase
        .from('activities')
        .insert([challengePayload])
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create challenge:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Create wallet transactions for escrow
      await this.createEscrowTransaction(
        currentUserId,
        data.id,
        challengeData.wagerAmount
      );

      return {
        success: true,
        challengeId: data.id,
      };
    } catch (error) {
      console.error('Challenge creation error:', error);
      return {
        success: false,
        error: 'Failed to create challenge',
      };
    }
  }

  /**
   * Get team members for challenge creation (excluding current user)
   */
  static async getTeamMembers(
    teamId: string,
    currentUserId: string
  ): Promise<TeammateInfo[]> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(
          `
          user_id,
          users!inner(
            id,
            name,
            avatar
          )
        `
        )
        .eq('team_id', teamId)
        .neq('user_id', currentUserId);

      if (error) {
        console.error('Failed to fetch team members:', error);
        return [];
      }

      // Get challenge stats for each member
      const teammatesWithStats = await Promise.all(
        data.map(async (member: any) => {
          const stats = await this.getUserChallengeStats(member.user_id);
          return {
            id: member.user_id,
            name: member.users.name,
            avatar: member.users.name.charAt(0).toUpperCase(),
            stats,
          };
        })
      );

      return teammatesWithStats;
    } catch (error) {
      console.error('Failed to fetch teammates:', error);
      return [];
    }
  }

  /**
   * Get user's challenge statistics
   */
  static async getUserChallengeStats(
    userId: string
  ): Promise<{ challengesCount: number; winsCount: number }> {
    try {
      // Get total challenges
      const { count: totalChallenges } = await supabase
        .from('activities')
        .select('id', { count: 'exact' })
        .eq('activity_type', 'challenge')
        .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
        .eq('status', 'completed');

      // Get wins - need to parse requirements_json to find winner
      const { data: completedChallenges } = await supabase
        .from('activities')
        .select('requirements_json')
        .eq('activity_type', 'challenge')
        .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
        .eq('status', 'completed');

      // Count wins by checking requirements_json for winner_id
      const wins =
        completedChallenges?.filter((challenge: any) => {
          try {
            const requirements = JSON.parse(
              challenge.requirements_json || '{}'
            );
            return requirements.winner_id === userId;
          } catch {
            return false;
          }
        }).length || 0;

      return {
        challengesCount: totalChallenges || 0,
        winsCount: wins || 0,
      };
    } catch (error) {
      console.error('Failed to get challenge stats:', error);
      return {
        challengesCount: 0,
        winsCount: 0,
      };
    }
  }

  /**
   * Accept a pending challenge
   */
  static async acceptChallenge(challengeId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('activities')
        .update({
          status: 'accepted',
          // Update requirements_json to include accepted_at timestamp
        })
        .eq('id', challengeId)
        .eq('activity_type', 'challenge');

      return !error;
    } catch (error) {
      console.error('Failed to accept challenge:', error);
      return false;
    }
  }

  /**
   * Decline a pending challenge
   */
  static async declineChallenge(challengeId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('activities')
        .update({
          status: 'declined',
          // Update requirements_json to include declined_at timestamp
        })
        .eq('id', challengeId)
        .eq('activity_type', 'challenge');

      return !error;
    } catch (error) {
      console.error('Failed to decline challenge:', error);
      return false;
    }
  }

  /**
   * Create escrow transaction for challenge wager
   */
  private static async createEscrowTransaction(
    userId: string,
    challengeId: string,
    amount: number
  ): Promise<void> {
    try {
      await supabase.from('transactions').insert([
        {
          user_id: userId,
          challenge_id: challengeId,
          type: 'escrow',
          amount: amount,
          status: 'pending',
          description: `Challenge wager escrow`,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to create escrow transaction:', error);
      // Don't throw - this is supplementary to challenge creation
    }
  }

  /**
   * Get user's pending challenges (both sent and received)
   */
  static async getUserPendingChallenges(userId: string): Promise<Challenge[]> {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('activity_type', 'challenge')
        .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
        .eq('status', 'pending');

      if (error) {
        console.error('Failed to fetch pending challenges:', error);
        return [];
      }

      // Transform activities data to match Challenge interface
      const challenges = await Promise.all(
        (data || []).map(async (activity: any) => {
          // Get challenger and challenged user info
          const { data: challengerUser } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', activity.challenger_id)
            .single();

          const { data: challengedUser } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', activity.challenged_id)
            .single();

          return {
            ...activity,
            challenger: challengerUser,
            challenged: challengedUser,
            // Parse requirements_json for challenge-specific data
            ...(activity.requirements_json
              ? JSON.parse(activity.requirements_json)
              : {}),
          };
        })
      );

      return challenges;
    } catch (error) {
      console.error('Failed to fetch pending challenges:', error);
      return [];
    }
  }
}
