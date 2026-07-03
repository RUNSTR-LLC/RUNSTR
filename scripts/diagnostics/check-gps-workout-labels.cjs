/**
 * Diagnostic: are in-app GPS workouts labeled with the right activity_type?
 * Flags rows where the stored label disagrees with the measured speed
 * (walk labeled but running-fast, or run labeled but walking-slow).
 * Read-only. Run: node scripts/diagnostics/check-gps-workout-labels.cjs
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Same thresholds as src/utils/activityInference.ts
const WALK_MAX_KMH = 6.5;   // below this = clearly walking
const RUN_MIN_KMH = 8.0;    // at/above this = clearly running

async function main() {
  // GPS in-app workouts are source='app'. Pull cardio types with real distance+duration.
  const { data, error } = await supabase
    .from('workout_submissions')
    .select('event_id, npub, activity_type, distance_meters, duration_seconds, source, created_at')
    .eq('source', 'app')
    .in('activity_type', ['running', 'walking', 'hiking', 'cycling'])
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }

  console.log(`Fetched ${data.length} source='app' cardio submissions\n`);

  // Classify by event_id prefix — source='app' mixes several origins.
  const originOf = (id = '') => {
    if (id.startsWith('local_')) return 'GPS (local_)';
    if (id.startsWith('hc_')) return 'HealthConnect';
    if (id.startsWith('hk_')) return 'HealthKit';
    if (/^[0-9a-f]{64}$/i.test(id)) return 'Nostr1301';
    return 'other';
  };

  // Focus on GPS (in-app tracker) — that's the user's question.
  const gps = data.filter((w) => (w.event_id || '').startsWith('local_'));

  const originCounts = {};
  data.forEach((w) => { const o = originOf(w.event_id); originCounts[o] = (originCounts[o] || 0) + 1; });
  console.log('source=app rows by origin:', originCounts, '\n');

  const gpsByType = {};
  const gpsMislabeled = [];
  let gpsUsable = 0;

  for (const w of gps) {
    gpsByType[w.activity_type] = (gpsByType[w.activity_type] || 0) + 1;
    const dist = w.distance_meters || 0;
    const dur = w.duration_seconds || 0;
    if (dist <= 0 || dur <= 0) continue;
    // Ignore GPS-glitch stubs (<300m or <2min) — too short to judge
    if (dist < 300 || dur < 120) continue;
    gpsUsable++;
    const speedKmh = (dist / dur) * 3.6;

    if (w.activity_type === 'walking' && speedKmh >= RUN_MIN_KMH) {
      gpsMislabeled.push({ ...w, speedKmh, verdict: 'WALK-labeled, RUN-speed' });
    } else if (w.activity_type === 'running' && speedKmh > 0 && speedKmh < WALK_MAX_KMH) {
      gpsMislabeled.push({ ...w, speedKmh, verdict: 'RUN-labeled, walk-speed' });
    }
  }

  console.log('GPS (local_) counts by activity_type:', gpsByType);
  console.log(`GPS usable rows (>=300m & >=2min): ${gpsUsable}`);
  console.log(`GPS potentially mislabeled: ${gpsMislabeled.length}\n`);

  gpsMislabeled
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .forEach((w) => {
      const km = (w.distance_meters / 1000).toFixed(2);
      const min = (w.duration_seconds / 60).toFixed(1);
      console.log(
        `${w.created_at?.slice(0, 10)}  ${w.verdict.padEnd(24)}  ${w.speedKmh.toFixed(1)} km/h  ` +
        `${km}km/${min}min  npub=${(w.npub || '').slice(0, 12)}`
      );
    });
}

main();
