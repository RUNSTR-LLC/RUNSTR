/**
 * Season3Service — Data fetching for Season III Club Battles
 *
 * Reads bracket state and live scores from Supabase.
 * Follows the singleton + cache pattern from Season2Service.
 */

import { getSupabaseClient } from '../../utils/supabase';
import { SEASON_3_CACHE_TTL } from '../../constants/season3';
import type {
  Season3Config,
  QualifiedClub,
  LiveScore,
  MatchupWithClubs,
} from '../../types/season3';

class Season3ServiceClass {
  private static instance: Season3ServiceClass;
  private configCache: { data: Season3Config; ts: number } | null = null;
  private bracketCache: { data: MatchupWithClubs[]; ts: number } | null = null;
  private qualifiedCache: { data: QualifiedClub[]; ts: number } | null = null;

  static getInstance(): Season3ServiceClass {
    if (!this.instance) this.instance = new Season3ServiceClass();
    return this.instance;
  }

  async getConfig(forceRefresh = false): Promise<Season3Config> {
    if (!forceRefresh && this.configCache && Date.now() - this.configCache.ts < SEASON_3_CACHE_TTL.CONFIG) {
      return this.configCache.data;
    }

    const { data, error } = await getSupabaseClient()
      .from('season3_config')
      .select('key, value');

    if (error) throw new Error(`Failed to fetch season3_config: ${error.message}`);

    const config = (data ?? []).reduce((acc, row) => {
      (acc as any)[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);

    const typed: Season3Config = {
      registration_deadline: config.registration_deadline ?? '',
      start_date: config.start_date ?? '',
      status: (config.status as Season3Config['status']) ?? 'registration',
      min_members: parseInt(config.min_members ?? '4', 10),
      max_clubs: parseInt(config.max_clubs ?? '16', 10),
      prize_pool_first: config.prize_pool_first ?? 'TBD',
      prize_pool_second: config.prize_pool_second ?? 'TBD',
    };

    this.configCache = { data: typed, ts: Date.now() };
    return typed;
  }

  async getBracket(forceRefresh = false): Promise<MatchupWithClubs[]> {
    if (!forceRefresh && this.bracketCache && Date.now() - this.bracketCache.ts < SEASON_3_CACHE_TTL.BRACKET) {
      return this.bracketCache.data;
    }

    const { data, error } = await getSupabaseClient()
      .from('season3_matchups')
      .select(`
        *,
        club_a:user_teams!season3_matchups_club_a_id_fkey(name, banner_url),
        club_b:user_teams!season3_matchups_club_b_id_fkey(name, banner_url)
      `)
      .order('match_date', { ascending: true, nullsFirst: false });

    if (error) throw new Error(`Failed to fetch bracket: ${error.message}`);

    const matchups: MatchupWithClubs[] = (data ?? []).map((row: any) => ({
      id: row.id,
      round: row.round,
      bracket: row.bracket,
      match_number: row.match_number,
      match_date: row.match_date,
      seed_a: row.seed_a,
      seed_b: row.seed_b,
      club_a_id: row.club_a_id,
      club_b_id: row.club_b_id,
      club_a_steps: row.club_a_steps ?? 0,
      club_b_steps: row.club_b_steps ?? 0,
      club_a_active: row.club_a_active ?? 0,
      club_b_active: row.club_b_active ?? 0,
      winner_id: row.winner_id,
      loser_id: row.loser_id,
      status: row.status,
      created_at: row.created_at,
      club_a_name: row.club_a?.name ?? null,
      club_b_name: row.club_b?.name ?? null,
      club_a_banner: row.club_a?.banner_url ?? null,
      club_b_banner: row.club_b?.banner_url ?? null,
    }));

    this.bracketCache = { data: matchups, ts: Date.now() };
    return matchups;
  }

  async getTodaysMatchup(forceRefresh = false): Promise<MatchupWithClubs | null> {
    const bracket = await this.getBracket(forceRefresh);
    return bracket.find(m => m.status === 'live') ?? null;
  }

  async getLiveSteps(clubAId: string, clubBId: string, matchDate: string): Promise<LiveScore> {
    const { data, error } = await getSupabaseClient()
      .from('workout_submissions')
      .select('club_id, step_count, npub')
      .in('club_id', [clubAId, clubBId])
      .eq('leaderboard_date', matchDate);

    if (error) throw new Error(`Failed to fetch live steps: ${error.message}`);

    const rows = data ?? [];
    let clubASteps = 0;
    let clubBSteps = 0;
    const clubAMembers = new Set<string>();
    const clubBMembers = new Set<string>();

    for (const row of rows) {
      if (row.club_id === clubAId) {
        clubASteps += row.step_count ?? 0;
        if (row.npub) clubAMembers.add(row.npub);
      } else {
        clubBSteps += row.step_count ?? 0;
        if (row.npub) clubBMembers.add(row.npub);
      }
    }

    return {
      club_a_steps: clubASteps,
      club_b_steps: clubBSteps,
      club_a_active: clubAMembers.size,
      club_b_active: clubBMembers.size,
      last_updated: Date.now(),
    };
  }

  async getQualifiedClubs(forceRefresh = false): Promise<QualifiedClub[]> {
    if (!forceRefresh && this.qualifiedCache && Date.now() - this.qualifiedCache.ts < SEASON_3_CACHE_TTL.QUALIFIED_CLUBS) {
      return this.qualifiedCache.data;
    }

    const { data: clubs, error: clubError } = await getSupabaseClient()
      .from('user_teams')
      .select('id, name, created_by_npub, banner_url, is_active')
      .eq('is_active', true);

    if (clubError) throw new Error(`Failed to fetch clubs: ${clubError.message}`);

    const { data: memberships, error: memberError } = await getSupabaseClient()
      .from('club_memberships')
      .select('club_id');

    if (memberError) throw new Error(`Failed to fetch memberships: ${memberError.message}`);

    const memberCounts: Record<string, number> = {};
    for (const m of memberships ?? []) {
      memberCounts[m.club_id] = (memberCounts[m.club_id] ?? 0) + 1;
    }

    const qualified: QualifiedClub[] = (clubs ?? [])
      .filter(c => (memberCounts[c.id] ?? 0) >= 4)
      .map(c => ({
        id: c.id,
        name: c.name,
        member_count: memberCounts[c.id] ?? 0,
        captain_npub: c.created_by_npub,
        banner_url: c.banner_url,
      }))
      .sort((a, b) => b.member_count - a.member_count);

    this.qualifiedCache = { data: qualified, ts: Date.now() };
    return qualified;
  }

  async getAllClubsWithStatus(): Promise<{ qualified: QualifiedClub[]; notQualified: QualifiedClub[] }> {
    const { data: clubs, error: clubError } = await getSupabaseClient()
      .from('user_teams')
      .select('id, name, created_by_npub, banner_url, is_active')
      .eq('is_active', true);

    if (clubError) throw new Error(`Failed to fetch clubs: ${clubError.message}`);

    const { data: memberships, error: memberError } = await getSupabaseClient()
      .from('club_memberships')
      .select('club_id');

    if (memberError) throw new Error(`Failed to fetch memberships: ${memberError.message}`);

    const memberCounts: Record<string, number> = {};
    for (const m of memberships ?? []) {
      memberCounts[m.club_id] = (memberCounts[m.club_id] ?? 0) + 1;
    }

    const all = (clubs ?? []).map(c => ({
      id: c.id,
      name: c.name,
      member_count: memberCounts[c.id] ?? 0,
      captain_npub: c.created_by_npub,
      banner_url: c.banner_url,
    }));

    return {
      qualified: all.filter(c => c.member_count >= 4).sort((a, b) => b.member_count - a.member_count),
      notQualified: all.filter(c => c.member_count < 4 && c.member_count > 0).sort((a, b) => b.member_count - a.member_count),
    };
  }

  clearCache(): void {
    this.configCache = null;
    this.bracketCache = null;
    this.qualifiedCache = null;
  }
}

export const Season3Service = Season3ServiceClass.getInstance();
