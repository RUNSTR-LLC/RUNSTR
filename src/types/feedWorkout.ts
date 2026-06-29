/**
 * Unified shape the workout feed renders, normalized from either
 * `workout_submissions` (RUNSTR) or `network_workouts` (cross-Nostr ingest).
 * The UI never branches on source table — it reads FeedWorkout.
 */
export interface FeedWorkout {
  eventId: string;            // Nostr 1301 event id — interaction key (Phase 2) + dedup
  npub: string;
  source: 'runstr' | 'network';
  activityType: string;       // may be non-cardio for network rows
  distanceMeters: number | null;
  durationSeconds: number | null;
  calories: number | null;
  stepCount: number | null;
  title: string | null;       // free-text title (network rows); null for RUNSTR
  occurredAt: string;         // ISO; used for sort + display
  authorName: string | null;  // null for network rows until kind-0 resolution
  authorAvatar: string | null;
  // Strength / resistance metrics — populated only on cross-Nostr (network)
  // rows whose 1301 carried them; null/undefined for RUNSTR submissions.
  exercise?: string | null;   // 1301 `exercise` tag, e.g. 'strength'
  sets?: number | null;
  reps?: number | null;
  weightKg?: number | null;
  avgHeartRate?: number | null;
  // Phase 2: hydrated per-page by WorkoutFeedService after DB fetch
  likeCount?: number;
  commentCount?: number;
  zapTotal?: number;
  likedByMe?: boolean;
}

const toNum = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && isFinite(n) && !Number.isNaN(n) ? n : null;
};

export function normalizeSubmissionRow(row: any): FeedWorkout {
  return {
    eventId: row.event_id,
    npub: row.npub,
    source: 'runstr',
    activityType: row.activity_type ?? '',
    distanceMeters: toNum(row.distance_meters),
    durationSeconds: toNum(row.duration_seconds),
    calories: toNum(row.calories),
    stepCount: toNum(row.step_count),
    title: null,
    occurredAt: row.created_at,
    authorName: row.profile_name ?? null,
    authorAvatar: row.profile_picture ?? null,
  };
}

export function normalizeNetworkRow(row: any): FeedWorkout {
  return {
    eventId: row.event_id,
    npub: row.npub,
    source: 'network',
    activityType: row.activity_type ?? '',
    distanceMeters: toNum(row.distance_meters),
    durationSeconds: toNum(row.duration_seconds),
    calories: toNum(row.calories),
    stepCount: toNum(row.steps),          // network col is `steps`
    title: row.title ?? null,
    occurredAt: row.event_created_at,     // NOT ingested_at
    authorName: null,                     // resolved via NDK kind-0 later
    authorAvatar: null,
    exercise: row.exercise ?? null,
    sets: toNum(row.sets),
    reps: toNum(row.reps),
    weightKg: toNum(row.weight_kg),
    avgHeartRate: toNum(row.avg_heart_rate),
  };
}
