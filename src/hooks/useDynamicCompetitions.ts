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
      const enriched: DynamicCompetition[] = raw.map((c) => ({
        ...c,
        status: deriveStatus(c),
      }));

      // Sort: LIVE first, then UPCOMING (soonest first), then ENDED (most recent first)
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
