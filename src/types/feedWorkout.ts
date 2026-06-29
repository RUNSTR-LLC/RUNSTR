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
  // Free-text note body (network rows only) — e.g. a strength session's full
  // exercise breakdown. Shown via tap-to-expand on the card. null for RUNSTR.
  content?: string | null;
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

/** Pull the kind-1301 `content` body out of a stored raw_event (object or JSON string). */
const eventContent = (rawEvent: unknown): string | undefined => {
  if (!rawEvent) return undefined;
  if (typeof rawEvent === 'string') {
    try { return JSON.parse(rawEvent)?.content; } catch { return undefined; }
  }
  return (rawEvent as { content?: string }).content;
};

/**
 * Some clients (e.g. Mi Fitness via Amethyst) put the set/rep summary only in
 * the free-text body, not in structured tags — so the sets/reps columns come
 * through null. Recover them from the body's summary line ("29 Sets", "221 Reps").
 * Heuristic and intentionally conservative: only the first match, used solely as
 * a fallback when the structured columns are empty.
 */
export const parseStrengthFromContent = (
  content: string | undefined
): { sets: number | null; reps: number | null } => {
  if (!content) return { sets: null, reps: null };
  const setsM = content.match(/(\d+)\s*sets\b/i);
  const repsM = content.match(/(\d+)\s*reps\b/i);
  return { sets: setsM ? toNum(setsM[1]) : null, reps: repsM ? toNum(repsM[1]) : null };
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
  const content = eventContent(row.raw_event);

  // Prefer the structured columns; fall back to parsing the note body when a
  // strength note carried its sets/reps only as free text.
  let sets = toNum(row.sets);
  let reps = toNum(row.reps);
  if (sets === null && reps === null) {
    const parsed = parseStrengthFromContent(content);
    sets = parsed.sets;
    reps = parsed.reps;
  }

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
    sets,
    reps,
    weightKg: toNum(row.weight_kg),
    avgHeartRate: toNum(row.avg_heart_rate),
    content: content ?? null,
  };
}
