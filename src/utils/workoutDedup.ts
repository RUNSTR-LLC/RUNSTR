/**
 * Duplicate detection for workouts merged in from Nostr.
 *
 * Two keys, either of which is sufficient:
 *   1. nostrEventId — exact, but only present on workouts that went through
 *      markAsSynced (currently just the GPS summary-modal path).
 *   2. (type, startTime within tolerance, duration within tolerance) — covers
 *      everything else, notably Health-synced workouts published outside that
 *      path, which carry no event id locally.
 *
 * Without key 2 an automatic backfill re-imports those workouts on every run.
 */

export interface DedupCandidate {
  nostrEventId?: string | null;
  type?: string | null;
  startTime: string;
  duration: number;
}

export const START_TIME_TOLERANCE_MS = 60_000;
export const DURATION_TOLERANCE_S = 5;

const normalizeType = (type?: string | null): string =>
  (type ?? '').trim().toLowerCase();

export function isDuplicateWorkout(
  existing: DedupCandidate[],
  candidate: DedupCandidate
): boolean {
  const candidateStart = Date.parse(candidate.startTime);
  const candidateType = normalizeType(candidate.type);

  return existing.some((item) => {
    if (
      candidate.nostrEventId &&
      item.nostrEventId &&
      item.nostrEventId === candidate.nostrEventId
    ) {
      return true;
    }

    if (Number.isNaN(candidateStart)) return false;
    const itemStart = Date.parse(item.startTime);
    if (Number.isNaN(itemStart)) return false;

    // A non-finite or zero duration means "unknown", not "zero seconds" — upstream
    // parsing uses 0 as its failure sentinel. Without a trustworthy duration the
    // time/type key cannot distinguish two workouts, so decline to match on it and
    // let the event-id key above be the only route to `true`. Erring toward a
    // possible duplicate is correct; erring toward discarding a real workout is not.
    if (
      !Number.isFinite(item.duration) ||
      !Number.isFinite(candidate.duration) ||
      item.duration === 0 ||
      candidate.duration === 0
    ) {
      return false;
    }

    if (normalizeType(item.type) !== candidateType) return false;
    if (Math.abs(itemStart - candidateStart) > START_TIME_TOLERANCE_MS) return false;
    if (Math.abs(item.duration - candidate.duration) > DURATION_TOLERANCE_S) return false;

    return true;
  });
}
