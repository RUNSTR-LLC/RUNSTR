/**
 * Resolve a workout's actual start time from a 1301 note, in unix seconds.
 *
 * `event.created_at` is when the Nostr note was PUBLISHED, not when the
 * workout started — a run at 06:00 published at 06:35 would otherwise get a
 * `startTime` ~35 minutes off. The dedup helper used by automatic backfill
 * (`isDuplicateWorkout` in `workoutDedup.ts`) matches on start time within
 * +/-60s, so that drift would make it re-import the same workout on every
 * launch. Prefer the `workout_start_time` tag (unix seconds, emitted by
 * workoutPublishingService.ts) when present and sane; fall back to
 * `created_at` — the previous behavior — otherwise.
 *
 * The tag value comes from an untrusted relay: reject non-numeric,
 * non-finite, and absurd values (before the Nostr genesis, more than a day
 * in the future, or plausibly a millisecond timestamp) and fall back to
 * `created_at` in those cases.
 *
 * Kept as a standalone module (no imports) — pulled in directly by
 * scripts/verify/verify-1301-backfill.ts under tsx, which cannot resolve
 * Nuclear1301Service.ts because that file (via GlobalNDKService) drags in
 * NDK/React Native.
 */

// Nostr genesis (2009-01-01T00:00:00Z) — anything before this in a
// `workout_start_time` tag is bogus, not a real workout.
export const NOSTR_GENESIS_SECONDS = 1230768000;
export const ONE_DAY_SECONDS = 24 * 60 * 60;

export function resolveWorkoutStartSeconds(
  tags: any[],
  createdAt: number
): number {
  const startTag = Array.isArray(tags)
    ? tags.find(
        (t: any[]) =>
          Array.isArray(t) && t[0] === 'workout_start_time' && t[1] !== undefined
      )
    : undefined;

  if (startTag) {
    const parsed = Number(startTag[1]);
    const maxAllowed = Math.floor(Date.now() / 1000) + ONE_DAY_SECONDS;
    if (
      Number.isFinite(parsed) &&
      parsed >= NOSTR_GENESIS_SECONDS &&
      parsed <= maxAllowed
    ) {
      return parsed;
    }
  }

  return createdAt;
}
