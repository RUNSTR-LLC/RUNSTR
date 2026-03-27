import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) { console.log(`  PASS: ${name}`); passed++; }
  else { console.log(`  FAIL: ${name}`); failed++; }
}

function readFile(p: string) { return fs.readFileSync(path.join(ROOT, p), 'utf-8'); }
function fileExists(p: string) { return fs.existsSync(path.join(ROOT, p)); }

console.log('\n--- Files ---');
check('Migration 162', fileExists('supabase/migrations/162_simplified_events.sql'));
check('Migration 163', fileExists('supabase/migrations/163_event_cron.sql'));
check('Finalize Edge Function', fileExists('supabase/functions/finalize-and-recur-events/index.ts'));

console.log('\n--- Schema ---');
const migration = readFile('supabase/migrations/162_simplified_events.sql');
check('recurring_interval column', migration.includes('recurring_interval'));
check('recurring_parent_id column', migration.includes('recurring_parent_id'));
check('is_finalized column', migration.includes('is_finalized'));
check('competition_xp_awards table', migration.includes('competition_xp_awards'));
check('Backfill existing', migration.includes('UPDATE competitions SET is_finalized'));

console.log('\n--- Edge Function ---');
const edgeFn = readFile('supabase/functions/manage-competition/index.ts');
check('recurring_interval in manage-competition', edgeFn.includes('recurring_interval'));

console.log('\n--- Finalize cron ---');
const cron = readFile('supabase/functions/finalize-and-recur-events/index.ts');
check('XP_TIERS defined', cron.includes('XP_TIERS'));
check('FINISHER_XP defined', cron.includes('FINISHER_XP'));
check('Recurring creation', cron.includes('recurring_parent_id'));

console.log('\n--- XP Service ---');
const levelService = readFile('src/services/fitness/WorkoutLevelService.ts');
check('competitionXP parameter', levelService.includes('competitionXP'));

console.log('\n--- Modal simplified ---');
const modal = readFile('src/components/subscription/SimpleEventCreationModal.tsx');
const lineCount = modal.split('\n').length;
check(`Modal under 500 lines (${lineCount})`, lineCount < 500);
check('Has duration picker', modal.toLowerCase().includes('duration'));
check('Has recurring picker', modal.toLowerCase().includes('recurring'));
check('No ticketPledgeDays', !modal.includes('ticketPledgeDays'));
check('No imagePicker', !modal.includes('ImagePicker') && !modal.includes('pickImage'));

console.log(`\n=== ${passed}/${passed + failed} checks passed ===`);
process.exit(failed > 0 ? 1 : 0);
