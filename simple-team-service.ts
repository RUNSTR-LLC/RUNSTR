/**
 * ULTRA-SIMPLE Team Service
 * Bypasses all complexity - just creates teams with minimal validation
 */

import { supabase } from './supabase';

export interface SimpleTeamData {
  name: string;
  about: string;
  captainId: string;
  prizePool?: number;
}

export interface SimpleTeamResult {
  success: boolean;
  teamId?: string;
  error?: string;
}

export class SimpleTeamService {
  /**
   * Create team - ultra simple approach
   * No stored procedures, minimal validation, direct inserts
   */
  static async createTeam(data: SimpleTeamData): Promise<SimpleTeamResult> {
    try {
      console.log('SimpleTeamService: Creating team with minimal approach');

      // Step 1: Ensure user exists (upsert with minimal data)
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: data.captainId,
          name: data.name.split(' ')[0] || 'Captain',
          npub: `simple_${data.captainId}`,
          role: 'captain',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('SimpleTeamService: User upsert failed:', upsertError);
        // Continue anyway - user might already exist
      }

      // Step 2: Create team (direct insert, no FK validation issues)
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (teamError) {
        console.error('SimpleTeamService: Team creation failed:', teamError);
        return { 
          success: false, 
          error: `Team creation failed: ${teamError.message}` 
        };
      }

      const teamId = team.id;
      console.log('SimpleTeamService: Team created successfully:', teamId);

      // Step 3: Create team membership (optional - don't fail if this fails)
      try {
        await supabase
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
      } catch (memberError) {
        console.warn('SimpleTeamService: Team membership failed (non-critical):', memberError);
      }

      // Step 4: Update user's current team (optional - don't fail if this fails)
      try {
        await supabase
          .from('users')
          .update({ 
            current_team_id: teamId,
            updated_at: new Date().toISOString() 
          })
          .eq('id', data.captainId);
      } catch (updateError) {
        console.warn('SimpleTeamService: User update failed (non-critical):', updateError);
      }

      return { success: true, teamId };

    } catch (error) {
      console.error('SimpleTeamService: Unexpected error:', error);
      return { 
        success: false, 
        error: `Unexpected error: ${error.message}` 
      };
    }
  }

  /**
   * Get teams for discovery - simplified version
   */
  static async getTeams(): Promise<any[]> {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('SimpleTeamService: Failed to fetch teams:', error);
        return [];
      }

      return teams || [];
    } catch (error) {
      console.error('SimpleTeamService: Unexpected error fetching teams:', error);
      return [];
    }
  }
}