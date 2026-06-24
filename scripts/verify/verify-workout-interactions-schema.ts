// Run: npx tsx --require ./scripts/mocks/react-native-stubs.js scripts/verify/verify-workout-interactions-schema.ts
// Confirms migration 185 tables exist + are readable. FAILS until the migration is applied.
import 'dotenv/config';
import { supabase } from '../../src/utils/supabase';

const tables = ['workout_likes', 'workout_comments', 'workout_zaps'];

(async () => {
  let failed = 0;
  for (const t of tables) {
    const { error } = await supabase!.from(t).select('event_id', { count: 'exact', head: true });
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
