// Run: npx tsx --require ./scripts/mocks/react-native-stubs.js scripts/verify/verify-workout-interactions-schema.ts
// Confirms migration 185 tables exist + are readable. FAILS until the migration is applied.
import 'dotenv/config';
import { supabase } from '../../src/utils/supabase';

const tables = ['workout_likes', 'workout_comments', 'workout_zaps'];

(async () => {
  let failed = 0;
  for (const t of tables) {
    // Use a real GET (.select().limit) — a HEAD/count request does NOT surface
    // a "table not found in schema cache" error, which gives a false PASS.
    const { error } = await supabase!.from(t).select('event_id').limit(1);
    if (error) {
      console.error(`FAIL ${t}: ${error.message}`);
      failed++;
    } else {
      console.log(`OK ${t} exists + readable`);
    }
  }
  console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED (apply migration 185 in the Supabase SQL editor)`);
  process.exit(failed === 0 ? 0 : 1);
})();
