/**
 * useDynamicCompetitions - Fetch dynamic (non-hardcoded) competitions from Supabase
 *
 * Returns competitions sorted: LIVE first, then UPCOMING, then ENDED.
 * Caching is handled by the service layer (5-min TTL).
 */

import { useState, useEffect, useCallback } from 'react';
import { SupabaseCompetitionService } from '../services/backend/SupabaseCompetitionService';
import type { Competition } from '../utils/supabase';

export type CompetitionStatus = 'active' | 'upcoming' | 'ended';

export interface DynamicCompetition extends Competition {
  status: CompetitionStatus;
}

const ENDED_GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours

function deriveStatus(comp: Competition): CompetitionStatus {
  const now = Date.now();
  const start = new Date(comp.start_date).getTime();
  const endDate = new Date(comp.end_date);
  endDate.setUTCHours(23, 59, 59, 999);
  const end = endDate.getTime();
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

/** Ended events stay visible for 24h so users can view final leaderboards */
function isWithinGracePeriod(comp: Competition): boolean {
  const endDate = new Date(comp.end_date);
  endDate.setUTCHours(23, 59, 59, 999);
  return Date.now() - endDate.getTime() <= ENDED_GRACE_MS;
}

const STATUS_ORDER: Record<CompetitionStatus, number> = {
  active: 0,
  upcoming: 1,
  ended: 2,
};

export function useDynamicCompetitions() {
  const [competitions, setCompetitions] = useState<DynamicCompetition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompetitions = useCallback(async () => {
    try {
      const raw = await SupabaseCompetitionService.fetchDynamicCompetitions();
      const enriched: DynamicCompetition[] = raw
        .map((c) => ({ ...c, status: deriveStatus(c) }))
        .filter((c) => c.status !== 'ended' || isWithinGracePeriod(c));

      // Sort: LIVE first, then UPCOMING (soonest first), then recently ENDED
      enriched.sort((a, b) => {
        const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (orderDiff !== 0) return orderDiff;
        // Within same status, sort by start_date
        if (a.status === 'upcoming') {
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        }
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      });

      setCompetitions(enriched);
    } catch (err) {
      console.error('[useDynamicCompetitions] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  return {
    competitions,
    isLoading,
    refresh: fetchCompetitions,
  };
}
