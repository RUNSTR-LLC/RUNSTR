/**
 * Verify no tracker screen persists the pause-unaware `elapsedTime` state in
 * its workout-summary path. The saved/summary/route duration must come from
 * the tracker session (`finalDuration = session.duration || elapsedTime` or
 * `session.duration` directly) — `elapsedTime` alone diverges after
 * pause/resume. Allowed uses of elapsedTime: state wiring, live display,
 * the finalDuration fallback expression itself, and the no-session catch
 * fallback where no session data exists.
 * Run: npx tsx scripts/verify/verify-tracker-duration-source.ts
 */
import { readFileSync } from 'fs';

const screens = [
  'src/screens/activity/RunningTrackerScreen.tsx',
  'src/screens/activity/WalkingTrackerScreen.tsx',
  'src/screens/activity/CyclingTrackerScreen.tsx',
  'src/screens/activity/HikingTrackerScreen.tsx',
];

// Persistence call sites that must never receive raw elapsedTime.
const sinks = [/saveGPSWorkout/, /addWorkoutToRoute/];

let failed = 0;
for (const file of screens) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Flag raw elapsedTime appearing within 6 lines after a persistence sink opens.
    if (sinks.some((s) => s.test(line))) {
      const window = lines.slice(i, i + 7).join('\n');
      if (/[^.\w]elapsedTime\s*[,)]/.test(window) && !/finalDuration/.test(window)) {
        console.log(`FAIL  ${file}:${i + 1} — raw elapsedTime passed to persistence sink`);
        failed++;
      }
    }
  });
  console.log(`checked ${file}`);
}

console.log(failed === 0 ? '\nPASS — all tracker persistence paths use session-derived duration' : `\n${failed} failure(s)`);
process.exit(failed === 0 ? 0 : 1);
