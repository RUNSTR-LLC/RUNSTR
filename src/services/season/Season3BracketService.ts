/**
 * Season3BracketService — Bracket advancement logic
 *
 * Pure functions for determining where winners/losers advance to
 * in a 16-team double-elimination bracket.
 */

import { BRACKET_MAP, bracketKey } from '../../constants/season3';
import type { Season3Matchup, Season3Bracket } from '../../types/season3';

export class Season3BracketService {

  static getAdvancement(matchup: Season3Matchup) {
    const key = bracketKey(matchup.bracket, matchup.round, matchup.match_number);
    return BRACKET_MAP[key] ?? null;
  }

  static determineWinner(matchup: Season3Matchup): 'a' | 'b' {
    if (matchup.club_a_steps > matchup.club_b_steps) return 'a';
    if (matchup.club_b_steps > matchup.club_a_steps) return 'b';
    if (matchup.club_a_active > matchup.club_b_active) return 'a';
    if (matchup.club_b_active > matchup.club_a_active) return 'b';
    const seedA = matchup.seed_a ?? 99;
    const seedB = matchup.seed_b ?? 99;
    return seedA <= seedB ? 'a' : 'b';
  }

  static needsGrandFinalsReset(grandFinals1: Season3Matchup): boolean {
    if (grandFinals1.bracket !== 'grand_finals' || grandFinals1.round !== 1) return false;
    if (grandFinals1.status !== 'completed') return false;
    return grandFinals1.winner_id === grandFinals1.club_b_id;
  }

  static isTournamentComplete(matchups: Season3Matchup[]): boolean {
    const gf1 = matchups.find(m => m.bracket === 'grand_finals' && m.round === 1);
    if (!gf1 || gf1.status !== 'completed') return false;
    if (gf1.winner_id === gf1.club_a_id) return true;
    const gf2 = matchups.find(m => m.bracket === 'grand_finals' && m.round === 2);
    return gf2?.status === 'completed';
  }

  static getResults(matchups: Season3Matchup[]): { champion: string; runnerUp: string } | null {
    if (!this.isTournamentComplete(matchups)) return null;
    const gf1 = matchups.find(m => m.bracket === 'grand_finals' && m.round === 1)!;
    if (gf1.winner_id === gf1.club_a_id) {
      return { champion: gf1.winner_id!, runnerUp: gf1.loser_id! };
    }
    const gf2 = matchups.find(m => m.bracket === 'grand_finals' && m.round === 2)!;
    return { champion: gf2.winner_id!, runnerUp: gf2.loser_id! };
  }

  static getRoundLabel(bracket: Season3Bracket, round: number): string {
    if (bracket === 'grand_finals') {
      return round === 1 ? 'Grand Finals' : 'Grand Finals (Reset)';
    }
    if (bracket === 'winners') {
      if (round === 4) return 'Winners Finals';
      return `Winners Round ${round}`;
    }
    if (round === 5) return 'Losers Finals';
    return `Losers Round ${round}`;
  }
}
