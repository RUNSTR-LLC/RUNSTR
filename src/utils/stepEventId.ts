/**
 * Canonical event ID for the daily step submission.
 *
 * Three writers submit today's steps as a synthetic walking workout
 * (StepCompetitionService in the foreground, HealthKitBackgroundService on
 * iOS, AndroidBackgroundSyncTask on Android). The submit-workout edge
 * function dedupes by event_id, so all three MUST produce the identical ID
 * for the same user + day — historically they used two different formats,
 * which let one user create two leaderboard rows per day.
 *
 * Uses the LOCAL calendar date (en-CA -> YYYY-MM-DD): "today's steps" means
 * the user's day, and a UTC-derived date is yesterday for users east of UTC
 * in the evening.
 */
export function dailyStepsEventId(npub: string, date: Date = new Date()): string {
  const localDate = date.toLocaleDateString('en-CA'); // YYYY-MM-DD, local tz
  return `steps_${localDate}_${npub.slice(0, 12)}`;
}
