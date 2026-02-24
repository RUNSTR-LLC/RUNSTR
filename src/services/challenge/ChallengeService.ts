/**
 * ChallengeService - Client-side service for 1v1 challenges.
 * Wraps manage-competition edge function calls for challenge lifecycle.
 * Caches challenge status (30s TTL) to avoid re-fetching on every render.
 */
import { callEdgeFunction } from '../../utils/edgeFunctions';
import { supabase } from '../../utils/supabase';

export interface ChallengeStatus {
  challenge_status: 'pending' | 'declined' | 'active' | 'completed';
  challenger_npub: string;
  challenged_npub: string;
  challenge_type: string;
  duration_days: number;
  winner_npub?: string | null;
  start_date?: string;
  end_date?: string;
  activity_type?: string;
  scoring_method?: string;
}

interface CachedStatus {
  status: ChallengeStatus;
  fetchedAt: number;
}

const CACHE_TTL = 30_000; // 30 seconds
const statusCache = new Map<string, CachedStatus>();

export interface ChallengeScoreEntry {
  npub: string;
  profileName?: string;
  value: number | null;
}

export interface ChallengeScores {
  challengeType: string;
  entries: ChallengeScoreEntry[];
}

const scoresCache = new Map<string, { scores: ChallengeScores; fetchedAt: number }>();

export class ChallengeService {
  /**
   * Create a challenge competition. Returns the competition ID.
   */
  static async createChallenge(params: {
    challengerNpub: string;
    challengedNpub: string;
    challengeType: string;
    durationDays: 1 | 3 | 7;
    clubId?: string;
    name?: string;
    picture?: string;
  }): Promise<{ competitionId: string } | null> {
    const result = await callEdgeFunction<{ id: string; external_id: string }>('manage-competition', {
      action: 'create-challenge',
      npub: params.challengerNpub,
      challenged_npub: params.challengedNpub,
      challenge_type: params.challengeType,
      duration_days: params.durationDays,
      club_id: params.clubId,
      name: params.name,
      picture: params.picture,
    });

    if (!result.success || !result.data) {
      console.error('[ChallengeService] createChallenge error:', result.error);
      return null;
    }

    const data = result.data as any;
    const id = data.id || data.data?.id;
    console.log(`[ChallengeService] Challenge created: ${id}`);
    return { competitionId: id };
  }

  /**
   * Accept a challenge. Sets start/end dates and joins the challenged user.
   */
  static async acceptChallenge(
    competitionId: string,
    npub: string,
    profile?: { name?: string; picture?: string }
  ): Promise<boolean> {
    const result = await callEdgeFunction('manage-competition', {
      action: 'accept-challenge',
      competition_id: competitionId,
      npub,
      name: profile?.name,
      picture: profile?.picture,
    });

    if (!result.success) {
      console.error('[ChallengeService] acceptChallenge error:', result.error);
      return false;
    }

    statusCache.delete(competitionId);
    console.log(`[ChallengeService] Challenge accepted: ${competitionId}`);
    return true;
  }

  /**
   * Decline a challenge.
   */
  static async declineChallenge(competitionId: string, npub: string): Promise<boolean> {
    const result = await callEdgeFunction('manage-competition', {
      action: 'decline-challenge',
      competition_id: competitionId,
      npub,
    });

    if (!result.success) {
      console.error('[ChallengeService] declineChallenge error:', result.error);
      return false;
    }

    statusCache.delete(competitionId);
    console.log(`[ChallengeService] Challenge declined: ${competitionId}`);
    return true;
  }

  /**
   * Fetch live challenge status from the competition record.
   * Cached for 30 seconds.
   */
  static async getChallengeStatus(competitionId: string): Promise<ChallengeStatus | null> {
    if (!competitionId) return null;

    const cached = statusCache.get(competitionId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.status;
    }

    const { data, error } = await supabase
      .from('competitions')
      .select('config, start_date, end_date, activity_type, scoring_method')
      .eq('id', competitionId)
      .single();

    if (error || !data) {
      console.warn('[ChallengeService] getChallengeStatus error:', error?.message);
      return null;
    }

    const config = data.config as Record<string, unknown>;
    const status: ChallengeStatus = {
      challenge_status: (config.challenge_status as ChallengeStatus['challenge_status']) || 'pending',
      challenger_npub: (config.challenger_npub as string) || '',
      challenged_npub: (config.challenged_npub as string) || '',
      challenge_type: (config.challenge_type as string) || '',
      duration_days: (config.duration_days as number) || 1,
      winner_npub: (config.winner_npub as string) || null,
      start_date: data.start_date,
      end_date: data.end_date,
      activity_type: data.activity_type,
      scoring_method: data.scoring_method,
    };

    statusCache.set(competitionId, { status, fetchedAt: Date.now() });
    return status;
  }

  /**
   * Check if a challenge has ended and determine the winner (on-demand).
   * Only calls the edge function if the challenge is active and past end_date.
   */
  static async checkAndComplete(competitionId: string): Promise<ChallengeStatus | null> {
    const result = await callEdgeFunction('manage-competition', {
      action: 'complete-challenge',
      competition_id: competitionId,
    });

    if (!result.success) {
      console.warn('[ChallengeService] completeChallenge error:', result.error);
      return null;
    }

    statusCache.delete(competitionId);
    return this.getChallengeStatus(competitionId);
  }

  /**
   * Fetch both participants' workout scores for a challenge period.
   * Cached for 30 seconds.
   */
  static async getChallengeScores(
    competitionId: string,
    status: ChallengeStatus,
  ): Promise<ChallengeScores | null> {
    if (!status.start_date || !status.end_date || !status.activity_type || !status.scoring_method) return null;
    if (status.challenge_status !== 'active' && status.challenge_status !== 'completed') return null;

    const cached = scoresCache.get(competitionId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.scores;

    const npubs = [status.challenger_npub, status.challenged_npub];
    const { data: rows, error } = await supabase
      .from('workout_submissions')
      .select('npub, profile_name, distance_meters, duration_seconds, time_5k_seconds, time_10k_seconds, step_count')
      .in('npub', npubs)
      .eq('activity_type', status.activity_type)
      .gte('created_at', status.start_date)
      .lte('created_at', status.end_date);

    if (error || !rows) {
      console.warn('[ChallengeService] getChallengeScores error:', error?.message);
      return null;
    }

    const entries: ChallengeScoreEntry[] = npubs.map((npub) => {
      const myRows = rows.filter((r: any) => r.npub === npub);
      const profileName = myRows[0]?.profile_name || undefined;
      let value: number | null = null;

      if (status.scoring_method === 'fastest_time') {
        const col = status.challenge_type === 'fastest_5k' ? 'time_5k_seconds' : 'time_10k_seconds';
        const times = myRows.map((r: any) => r[col]).filter((t: any) => t != null && t > 0);
        value = times.length > 0 ? Math.min(...times) : null;
      } else if (status.scoring_method === 'total_distance') {
        const sum = myRows.reduce((acc: number, r: any) => acc + (r.distance_meters || 0), 0);
        value = sum > 0 ? sum : null;
      } else if (status.scoring_method === 'workout_count') {
        value = myRows.length > 0 ? myRows.length : null;
      } else if (status.scoring_method === 'total_steps') {
        const sum = myRows.reduce((acc: number, r: any) => acc + (r.step_count || 0), 0);
        value = sum > 0 ? sum : null;
      }

      return { npub, profileName, value };
    });

    const scores: ChallengeScores = { challengeType: status.challenge_type, entries };
    scoresCache.set(competitionId, { scores, fetchedAt: Date.now() });
    return scores;
  }

  /** Clear all caches. */
  static clearCache(): void {
    statusCache.clear();
    scoresCache.clear();
  }
}
