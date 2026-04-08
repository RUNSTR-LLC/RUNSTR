/**
 * Season III: Club Battles — Type definitions
 */

export type Season3Status = 'registration' | 'bracket_set' | 'active' | 'completed';
export type Season3Bracket = 'winners' | 'losers' | 'grand_finals';
export type MatchupStatus = 'pending' | 'scheduled' | 'live' | 'completed';

export interface Season3Matchup {
  id: string;
  round: number;
  bracket: Season3Bracket;
  match_number: number;
  match_date: string | null;
  seed_a: number | null;
  seed_b: number | null;
  club_a_id: string | null;
  club_b_id: string | null;
  club_a_steps: number;
  club_b_steps: number;
  club_a_active: number;
  club_b_active: number;
  winner_id: string | null;
  loser_id: string | null;
  status: MatchupStatus;
  created_at: string;
}

export interface Season3Config {
  registration_deadline: string;
  start_date: string;
  status: Season3Status;
  min_members: number;
  max_clubs: number;
  prize_pool_first: string;
  prize_pool_second: string;
}

export interface QualifiedClub {
  id: string;
  name: string;
  member_count: number;
  captain_npub: string;
  banner_url: string | null;
}

export interface MatchupWithClubs extends Season3Matchup {
  club_a_name: string | null;
  club_b_name: string | null;
  club_a_banner: string | null;
  club_b_banner: string | null;
}

export interface LiveScore {
  club_a_steps: number;
  club_b_steps: number;
  club_a_active: number;
  club_b_active: number;
  last_updated: number;
}

/** Bracket map entry: defines where a matchup's winner and loser advance to */
export interface BracketAdvancement {
  winner_to: { bracket: Season3Bracket; round: number; match_number: number; slot: 'a' | 'b' } | null;
  loser_to: { bracket: Season3Bracket; round: number; match_number: number; slot: 'a' | 'b' } | null;
}

/** Key format: "bracket:round:match_number" e.g. "winners:1:1" */
export type BracketMapKey = string;
export type BracketMap = Record<BracketMapKey, BracketAdvancement>;
