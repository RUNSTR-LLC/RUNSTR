/**
 * RUNSTR Team Service
 * Handles all team-related API operations for discovery and management
 */

// import { supabase } from './supabase'; // REMOVED: Project now uses pure Nostr
import coinosService from './coinosService';
import type {
  DiscoveryTeam,
  TeamActivity,
  TeamPayout,
  TeamStats,
  DifficultyLevel,
} from '../types';

export interface TeamCreationData {
  name: string;
  about: string;
  captainId: string;
  captainNpub: string; // Real Nostr public key from authenticated user
  captainName: string; // Real name from authenticated user
  lightningAddress?: string;
  prizePool?: number;
}

export interface TeamCreationResult {
  success: boolean;
  teamId?: string;
  error?: string;
}

export class TeamService {
  /**
   * Create a new team (for captains) - ULTRA SIMPLE VERSION
   */
  static async createTeam(data: TeamCreationData): Promise<TeamCreationResult> {
    try {
      console.log(
        `TeamService: Creating team "${data.name}" for captain ${data.captainId} (SIMPLE MODE)`
      );

      // STEP 1: Ensure user exists with upsert (using REAL Nostr identity)
      await supabase.from('users').upsert(
        {
          id: data.captainId,
          name: data.captainName,
          npub: data.captainNpub, // Use REAL npub from Nostr authentication
          role: 'captain',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );

      console.log(
        `TeamService: Using REAL Nostr identity - npub: ${data.captainNpub}`
      );

      // STEP 2: Create team directly (let FK work naturally)
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: data.name,
          about: data.about,
          captain_id: data.captainId,
          prize_pool: data.prizePool || 0,
          is_active: true,
          is_featured: false,
          member_count: 1,
        })
        .select('id')
        .single();

      if (teamError) {
        console.error('TeamService: Team creation failed:', teamError);
        return {
          success: false,
          error: `Team creation failed: ${teamError.message}`,
        };
      }

      const teamId = team.id;
      console.log(`TeamService: Team created successfully:`, teamId);

      // STEP 3: Create membership (CRITICAL for user team association)
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          user_id: data.captainId,
          team_id: teamId,
          role: 'captain',
          joined_at: new Date().toISOString(),
          is_active: true,
          total_workouts: 0,
          total_distance_meters: 0,
        });

      if (memberError) {
        console.error(
          'TeamService: CRITICAL - Team membership creation failed:',
          memberError
        );
        // Don't fail completely, but log the error prominently
      } else {
        console.log('TeamService: Team membership created successfully');
      }

      // STEP 4: Update user's current team (CRITICAL for navigation)
      const { error: updateError } = await supabase
        .from('users')
        .update({ current_team_id: teamId })
        .eq('id', data.captainId);

      if (updateError) {
        console.error(
          'TeamService: CRITICAL - User current_team_id update failed:',
          updateError
        );
        // Don't fail completely, but log the error prominently
      } else {
        console.log('TeamService: User current_team_id updated successfully');
      }

      return { success: true, teamId };
    } catch (error) {
      console.error('TeamService: Unexpected error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: `Unexpected error: ${errorMessage}` };
    }
  }

  /**
   * Fallback team creation method with robust user handling
   */
  static async createTeamFallback(
    data: TeamCreationData
  ): Promise<TeamCreationResult> {
    try {
      console.log('TeamService: Using fallback team creation method');

      // Step 1: SAFE user existence check and update (avoid npub conflicts)
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, name, npub')
        .eq('id', data.captainId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(
          'TeamService: Failed to check existing user:',
          checkError
        );
        return { success: false, error: 'Failed to verify user exists' };
      }

      let upsertedUser;
      if (existingUser) {
        // User exists, just ensure role is captain
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            role: 'captain',
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.captainId)
          .select('id, name')
          .single();

        if (updateError) {
          console.error(
            'TeamService: Failed to update existing user:',
            updateError
          );
          return { success: false, error: 'Failed to update user role' };
        }
        upsertedUser = updatedUser;
      } else {
        // User doesn't exist, create with REAL Nostr identity
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: data.captainId,
            name: data.captainName,
            npub: data.captainNpub, // Use REAL npub from Nostr authentication
            role: 'captain',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id, name')
          .single();

        if (createError) {
          console.error('TeamService: Failed to create new user:', createError);
          return { success: false, error: 'Failed to create user' };
        }
        upsertedUser = newUser;
      }

      console.log('TeamService: Captain user handled safely:', upsertedUser);

      // Step 2: Create team immediately after user upsert (without difficulty_level)
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: data.name,
          about: data.about,
          captain_id: data.captainId,
          prize_pool: data.prizePool || 0,
          is_active: true,
          is_featured: false,
          member_count: 1,
        })
        .select('id')
        .single();

      if (teamError) {
        console.error(
          'TeamService: Team creation still failed after upsert:',
          teamError
        );
        return {
          success: false,
          error: 'Failed to create team record after ensuring user exists',
        };
      }

      const teamId = team.id;
      console.log(
        `TeamService: Team created successfully via fallback:`,
        teamId
      );

      // Step 3: Add captain as team member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          user_id: data.captainId,
          team_id: teamId,
          role: 'captain',
          joined_at: new Date().toISOString(),
          is_active: true,
          total_workouts: 0,
          total_distance_meters: 0,
        });

      if (memberError) {
        console.error(
          'TeamService: Team membership creation failed:',
          memberError
        );
        // Don't fail the entire process - team exists
        console.log('TeamService: Continuing despite membership error');
      }

      // Step 4: Update user's current team
      const { error: userError } = await supabase
        .from('users')
        .update({ current_team_id: teamId })
        .eq('id', data.captainId);

      if (userError) {
        console.error('TeamService: User team assignment failed:', userError);
        // Don't fail - team exists
      }

      return { success: true, teamId };
    } catch (error) {
      console.error('TeamService: Fallback team creation failed:', error);
      return { success: false, error: 'All team creation methods failed' };
    }
  }

  /**
   * Fetch all teams for discovery with stats and activities
   */
  static async getTeamsForDiscovery(): Promise<DiscoveryTeam[]> {
    try {
      // Fetch teams with basic info only (simplified for MVP)
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('member_count', { ascending: false });

      if (teamsError) throw teamsError;

      // Transform to DiscoveryTeam format (simplified for MVP)
      const discoveryTeams: DiscoveryTeam[] =
        teams?.map((team: any) => {
          const stats: TeamStats = {
            memberCount: team.member_count || 0,
            avgPace: team.avg_pace_seconds
              ? this.formatPace(team.avg_pace_seconds)
              : '7:30/mi',
            activeEvents: 0, // TODO: Calculate from activities table when available
            activeChallenges: 0, // TODO: Calculate from activities table when available
          };

          return {
            id: team.id,
            name: team.name,
            description: team.description || '',
            about:
              team.about ||
              team.description ||
              'Join this team to compete and earn rewards',
            captainId: team.captain_id || '',
            prizePool: team.prize_pool || 0,
            memberCount: team.member_count || 0,
            joinReward: team.join_reward || 0,
            exitFee: team.exit_fee || 0,
            sponsoredBy: team.sponsored_by,
            avatar: team.avatar,
            createdAt: team.created_at,
            isActive: team.is_active,
            difficulty:
              (team.difficulty_level as DifficultyLevel) || 'intermediate',
            stats,
            recentActivities: [], // TODO: Populate from activities table when available
            recentPayout: undefined, // TODO: Populate from payments table when available
            isFeatured: team.is_featured || false,
          };
        }) || [];

      return discoveryTeams;
    } catch (error) {
      console.error('Error fetching teams for discovery:', error);
      throw error;
    }
  }

  /**
   * Get featured teams for discovery page
   */
  static async getFeaturedTeams(): Promise<DiscoveryTeam[]> {
    const allTeams = await this.getTeamsForDiscovery();
    return allTeams.filter((team) => team.isFeatured);
  }

  /**
   * Search teams by name or difficulty
   */
  static async searchTeams(
    query: string,
    difficulty?: DifficultyLevel
  ): Promise<DiscoveryTeam[]> {
    const allTeams = await this.getTeamsForDiscovery();

    return allTeams.filter((team) => {
      const matchesQuery =
        query === '' ||
        team.name.toLowerCase().includes(query.toLowerCase()) ||
        team.about.toLowerCase().includes(query.toLowerCase());

      const matchesDifficulty = !difficulty || team.difficulty === difficulty;

      return matchesQuery && matchesDifficulty;
    });
  }

  /**
   * Get team details by ID
   */
  static async getTeamById(teamId: string): Promise<DiscoveryTeam | null> {
    const allTeams = await this.getTeamsForDiscovery();
    return allTeams.find((team) => team.id === teamId) || null;
  }

  /**
   * Join a team
   */
  static async joinTeam(
    teamId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user is already a member of any team
      const { data: existingMembership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (existingMembership) {
        return { success: false, error: 'You are already a member of a team' };
      }

      // Join the team
      const { error: joinError } = await supabase.from('team_members').insert({
        team_id: teamId,
        user_id: userId,
        role: 'member',
        is_active: true,
      });

      if (joinError) throw joinError;

      return { success: true };
    } catch (error) {
      console.error('Error joining team:', error);
      return { success: false, error: 'Failed to join team' };
    }
  }

  /**
   * Leave a team
   */
  static async leaveTeam(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error leaving team:', error);
      return { success: false, error: 'Failed to leave team' };
    }
  }

  /**
   * Get user's current team
   */
  static async getUserTeam(userId: string): Promise<DiscoveryTeam | null> {
    try {
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!membership) return null;

      return await this.getTeamById(membership.team_id);
    } catch (error) {
      console.error('Error getting user team:', error);
      return null;
    }
  }

  /**
   * Get detailed team screen data including leaderboard, events, and challenges
   */
  static async getTeamScreenData(teamId: string): Promise<any> {
    try {
      // Get team details
      const team = await this.getTeamById(teamId);
      if (!team) return null;

      // Get team members for leaderboard
      const { data: members } = await supabase
        .from('team_members')
        .select(
          `
          user_id,
          total_workouts,
          total_distance_meters,
          total_duration_seconds,
          avg_pace_seconds,
          last_workout_at,
          users(name, avatar)
        `
        )
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('total_workouts', { ascending: false });

      // Get team activities (events and challenges)
      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Transform to TeamScreenData format
      const leaderboard =
        members?.map((member: any, index: number) => ({
          position: index + 1,
          user: {
            id: member.user_id,
            name: member.users?.name || 'User',
            avatar: member.users?.avatar || '',
          },
          stats: {
            workouts: member.total_workouts || 0,
            distance: Math.round((member.total_distance_meters || 0) / 1000), // km
            duration: member.total_duration_seconds || 0,
            avgPace: member.avg_pace_seconds || 0,
            lastWorkout: member.last_workout_at,
          },
        })) || [];

      // Separate events and challenges
      const events =
        activities
          ?.filter((a) => a.activity_type === 'event')
          .map((activity) => ({
            id: activity.id,
            type: 'event' as const,
            title: activity.title,
            description: activity.description || '',
            prizeAmount: activity.prize_amount,
            participantCount: activity.participant_count,
            status: activity.status,
            startDate: activity.start_date,
            endDate: activity.end_date,
            isHighlighted: activity.is_highlighted,
          })) || [];

      const challenges =
        activities
          ?.filter((a) => a.activity_type === 'challenge')
          .map((activity) => ({
            id: activity.id,
            type: 'challenge' as const,
            title: activity.title,
            description: activity.description || '',
            prizeAmount: activity.prize_amount,
            participantCount: activity.participant_count,
            status: activity.status,
            startDate: activity.start_date,
            endDate: activity.end_date,
            isHighlighted: activity.is_highlighted,
          })) || [];

      // Fetch real-time wallet balance for prize pool
      let realTimeBalance = 0;
      try {
        const walletBalance = await coinosService.getTeamWalletBalance(teamId);
        if (walletBalance) {
          realTimeBalance = walletBalance.total;
          console.log(
            `TeamService: Fetched real-time balance for team ${teamId}: ${realTimeBalance} sats`
          );
        } else {
          console.log(
            `TeamService: No wallet found for team ${teamId}, using database prizePool: ${team.prizePool} sats`
          );
          realTimeBalance = team.prizePool; // Fallback to database value
        }
      } catch (error) {
        console.warn(
          `TeamService: Failed to fetch wallet balance for team ${teamId}:`,
          error
        );
        realTimeBalance = team.prizePool; // Fallback to database value
      }

      return {
        team: {
          id: team.id,
          name: team.name,
          description: team.description,
          captainId: team.captainId,
          prizePool: realTimeBalance, // Use real-time wallet balance
          memberCount: team.memberCount,
          joinReward: team.joinReward,
          exitFee: team.exitFee,
          avatar: team.avatar,
          createdAt: team.createdAt,
          isActive: team.isActive,
        },
        leaderboard,
        events,
        challenges,
      };
    } catch (error) {
      console.error('Error fetching team screen data:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time team updates
   */
  static subscribeToTeamUpdates(callback: (teams: DiscoveryTeam[]) => void) {
    const subscription = supabase
      .channel('team-discovery')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        async () => {
          // Refresh team data when teams table changes
          try {
            const updatedTeams = await this.getTeamsForDiscovery();
            callback(updatedTeams);
          } catch (error) {
            console.error('Error refreshing teams:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
        },
        async () => {
          // Refresh when activities change
          try {
            const updatedTeams = await this.getTeamsForDiscovery();
            callback(updatedTeams);
          } catch (error) {
            console.error('Error refreshing teams:', error);
          }
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Utility: Format pace in seconds to readable format
   */
  private static formatPace(paceSeconds: number): string {
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = paceSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}/mi`;
  }

  /**
   * Utility: Calculate time ago string
   */
  static timeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    return `${Math.floor(diffDays / 7)} weeks ago`;
  }

  /**
   * Format satoshi amounts for display
   */
  static formatSats(sats: number): string {
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(1)}M`;
    } else if (sats >= 1000) {
      return `${(sats / 1000).toFixed(0)}K`;
    }
    return sats.toString();
  }
}

export default TeamService;
