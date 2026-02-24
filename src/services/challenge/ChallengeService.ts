/**
 * ChallengeService - Client-side service for 1v1 challenges.
 * Wraps manage-competition edge function calls for challenge lifecycle.
 * Caches challenge status (30s TTL) to avoid re-fetching on every render.
 */
import { callEdgeFunction } from '../../utils/edgeFunctions';
import { supabase } from '../../utils/supabase';

export interface ChallengeStatus {
  challenge_status: 'pending' | 'accepted' | 'declined' | 'active' | 'completed';
  challenger_npub: string;
  challenged_npub: string;
  challenge_type: string;
  duration_days: number;
  winner_npub?: string | null;
  start_date?: string;
  end_date?: string;
}

interface CachedStatus {
  status: ChallengeStatus;
  fetchedAt: number;
}

const CACHE_TTL = 30_000; // 30 seconds
const statusCache = new Map<string, CachedStatus>();

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
      .select('config, start_date, end_date')
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

  /** Clear the status cache. */
  static clearCache(): void {
    statusCache.clear();
  }
}
