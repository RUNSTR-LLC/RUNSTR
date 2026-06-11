/**
 * Verifies the fix for GitHub #291 (History tab crash with Apple Health).
 * HealthKit workouts carry startTime as a Date object; the old code called
 * `startTime.split('T')` which throws on a Date. This mirrors the old vs new
 * timeline-building logic and confirms both string and Date inputs are handled.
 */

// OLD logic from UnifiedWorkoutsTab (crashed on a Date)
function oldBuild(startTime: any) {
  return { date: startTime.split('T')[0], timestamp: new Date(startTime).getTime() };
}

// NEW logic from the fix
function newBuild(startTime: any) {
  const startIso =
    typeof startTime === 'string' ? startTime : new Date(startTime).toISOString();
  return { date: startIso.split('T')[0], timestamp: new Date(startIso).getTime() };
}

const cases = [
  { name: 'local workout (ISO string)', startTime: '2026-06-10T14:30:00.000Z' },
  { name: 'HealthKit workout (Date object)', startTime: new Date('2026-06-10T14:30:00.000Z') },
];

let passed = 0;
for (const c of cases) {
  let oldCrashed = false;
  try { oldBuild(c.startTime); } catch { oldCrashed = true; }

  let newCrashed = false;
  let result: any;
  try { result = newBuild(c.startTime); } catch { newCrashed = true; }

  const ok = !newCrashed && result?.date === '2026-06-10';
  console.log(
    `${ok ? 'PASS' : 'FAIL'} — ${c.name}: old crashed=${oldCrashed}, new date=${result?.date}`
  );
  if (ok) passed++;
}

// The Date case must be the one that proves the bug: old crashes, new doesn't.
const dateCaseProvesBug = (() => {
  try { oldBuild(new Date()); return false; } catch { return true; }
})();

console.log(`\n${passed}/${cases.length} cases handled; old code crashes on Date = ${dateCaseProvesBug}`);
process.exit(passed === cases.length && dateCaseProvesBug ? 0 : 1);
