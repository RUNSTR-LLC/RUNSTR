/**
 * Team Discovery Service
 * Handles fetching and managing discoverable teams from Supabase
 */

import { supabase } from '../supabase';
import { DiscoveryTeam } from '../../types';

export class TeamDiscoveryService {
  /**
   * Fetch all discoverable teams
   */
  static async getDiscoverableTeams(): Promise<{
    success: boolean;
    teams?: DiscoveryTeam[];
    error?: string;
  }> {
    try {
      console.log('TeamDiscoveryService: Fetching discoverable teams...');

      const { data: teamsData, error } = await supabase
        .from('teams')
        .select(
          `
          *,
          team_members(
            id,
            user_id,
            role,
            is_active
          )
        `
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('TeamDiscoveryService: Database error:', error);
        return {
          success: false,
          error: 'Failed to fetch teams from database',
        };
      }

      if (!teamsData || teamsData.length === 0) {
        console.log('TeamDiscoveryService: No discoverable teams found');
        return {
          success: true,
          teams: [],
        };
      }

      // Transform database data to DiscoveryTeam format
      const teams: DiscoveryTeam[] = teamsData.map((team) => {
        // Calculate member count from actual team_members
        const memberCount =
          team.team_members?.filter((member: any) => member.is_active).length ||
          0;

        return {
          id: team.id,
          name: team.name,
          about: team.description || team.about || 'No description available',
          description: team.description || 'No description available',
          captainId: team.captain_id,
          prizePool: team.prize_pool || 0,
          memberCount: memberCount,
          joinReward: team.join_reward || 0,
          exitFee: team.exit_fee || 0,
          avatar: team.avatar || '',
          createdAt: team.created_at,
          isActive: team.is_active,
          difficulty: team.difficulty || 'intermediate',
          stats: {
            memberCount: memberCount,
            avgPace: team.avg_pace || '7:30/mi', // Use team-level avg_pace if available
            activeEvents: 0, // TODO: Calculate from activities table
            activeChallenges: 0, // TODO: Calculate from activities table
          },
          recentActivities: [], // TODO: Fetch from activities table
          recentPayout: team.recent_payout_amount
            ? {
                amount: team.recent_payout_amount,
                timestamp: team.recent_payout_date || new Date().toISOString(),
                description: team.recent_payout_description || 'Team payout',
              }
            : undefined,
          isFeatured: team.is_featured || false,
        };
      });

      console.log(
        `TeamDiscoveryService: Found ${teams.length} discoverable teams`
      );

      return {
        success: true,
        teams,
      };
    } catch (error) {
      console.error('TeamDiscoveryService: Error fetching teams:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch teams',
      };
    }
  }

  /**
   * Get featured teams (shown at top of discovery)
   */
  static async getFeaturedTeams(): Promise<{
    success: boolean;
    teams?: DiscoveryTeam[];
    error?: string;
  }> {
    try {
      console.log('TeamDiscoveryService: Fetching featured teams...');

      const result = await this.getDiscoverableTeams();

      if (!result.success || !result.teams) {
        return result;
      }

      // Filter for featured teams
      const featuredTeams = result.teams.filter((team) => team.isFeatured);

      return {
        success: true,
        teams: featuredTeams,
      };
    } catch (error) {
      console.error(
        'TeamDiscoveryService: Error fetching featured teams:',
        error
      );
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch featured teams',
      };
    }
  }

  /**
   * Get recommended teams for a user based on their profile
   */
  static async getRecommendedTeams(userId: string): Promise<{
    success: boolean;
    teams?: DiscoveryTeam[];
    error?: string;
  }> {
    try {
      console.log(
        'TeamDiscoveryService: Fetching recommended teams for user:',
        userId
      );

      // TODO: Implement recommendation algorithm based on:
      // - User fitness level
      // - Previous activity patterns
      // - Similar users' team choices
      // - Geographic proximity if available

      // For now, return all discoverable teams sorted by member count
      const result = await this.getDiscoverableTeams();

      if (!result.success || !result.teams) {
        return result;
      }

      // Simple recommendation: sort by member count (more active teams first)
      const recommendedTeams = result.teams
        .sort((a, b) => b.memberCount - a.memberCount)
        .slice(0, 10); // Limit to top 10

      return {
        success: true,
        teams: recommendedTeams,
      };
    } catch (error) {
      console.error(
        'TeamDiscoveryService: Error fetching recommended teams:',
        error
      );
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch recommendations',
      };
    }
  }

  /**
   * Search teams by name or description
   */
  static async searchTeams(query: string): Promise<{
    success: boolean;
    teams?: DiscoveryTeam[];
    error?: string;
  }> {
    try {
      console.log('TeamDiscoveryService: Searching teams for query:', query);

      if (!query.trim()) {
        return await this.getDiscoverableTeams();
      }

      const { data: teamsData, error } = await supabase
        .from('teams')
        .select(
          `
          *,
          team_members(
            id,
            user_id,
            role,
            is_active
          )
        `
        )
        .eq('is_active', true)
        .or(
          `name.ilike.%${query}%,description.ilike.%${query}%,about.ilike.%${query}%`
        )
        .order('created_at', { ascending: false });

      if (error) {
        console.error('TeamDiscoveryService: Search error:', error);
        return {
          success: false,
          error: 'Failed to search teams',
        };
      }

      // Transform to DiscoveryTeam format (reuse logic from getDiscoverableTeams)
      const teams: DiscoveryTeam[] = (teamsData || []).map((team) => {
        // Calculate member count from actual team_members
        const memberCount =
          team.team_members?.filter((member: any) => member.is_active).length ||
          0;

        return {
          id: team.id,
          name: team.name,
          about: team.description || team.about || 'No description available',
          description: team.description || 'No description available',
          captainId: team.captain_id,
          prizePool: team.prize_pool || 0,
          memberCount: memberCount,
          joinReward: team.join_reward || 0,
          exitFee: team.exit_fee || 0,
          avatar: team.avatar || '',
          createdAt: team.created_at,
          isActive: team.is_active,
          difficulty: team.difficulty || 'intermediate',
          stats: {
            memberCount: memberCount,
            avgPace: team.avg_pace || '7:30/mi', // Use team-level avg_pace if available
            activeEvents: 0, // TODO: Calculate from activities table
            activeChallenges: 0, // TODO: Calculate from activities table
          },
          recentActivities: [], // TODO: Fetch from activities table
          recentPayout: team.recent_payout_amount
            ? {
                amount: team.recent_payout_amount,
                timestamp: team.recent_payout_date || new Date().toISOString(),
                description: team.recent_payout_description || 'Team payout',
              }
            : undefined,
          isFeatured: team.is_featured || false,
        };
      });

      console.log(
        `TeamDiscoveryService: Found ${teams.length} teams matching "${query}"`
      );

      return {
        success: true,
        teams,
      };
    } catch (error) {
      console.error('TeamDiscoveryService: Search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  }
}

export default TeamDiscoveryService;
