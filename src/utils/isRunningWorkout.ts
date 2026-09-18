/**
 * The single definition of "a run" for display filtering.
 *
 * Phase 1 shows running workouts only. Collection is unaffected — Apple Health
 * and Health Connect keep importing every activity type; this decides what the
 * history surfaces render.
 *
 * Matches exactly, never by substring: 'walking_treadmill' must not read as a
 * run. Consumes the already-normalized workout type — it does not re-derive it.
 */
const RUNNING_TYPES = new Set(['run', 'running']);

export function isRunningWorkout(workout: { type?: string | null }): boolean {
  const type = workout?.type;
  if (!type) return false;
  return RUNNING_TYPES.has(type.trim().toLowerCase());
}
