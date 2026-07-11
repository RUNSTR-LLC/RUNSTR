import type { Competition } from './supabase';

export type CompetitionStatus = 'active' | 'upcoming' | 'ended';

export function deriveStatus(comp: Competition): CompetitionStatus {
  const now = Date.now();
  const start = new Date(comp.start_date).getTime();
  const endDate = new Date(comp.end_date);
  endDate.setUTCHours(23, 59, 59, 999);
  const end = endDate.getTime();
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}
