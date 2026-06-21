/**
 * Verifies ppq_accounts is invisible to the public anon key.
 * Expected: every anon read/write fails (RLS deny-all).
 * Run: npx tsx scripts/verify/verify-ppq-accounts-rls.ts
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  const supabase = createClient(url, anon);

  const read = await supabase.from('ppq_accounts').select('npub').limit(1);
  const wrote = await supabase
    .from('ppq_accounts')
    .insert({ npub: 'npub1test', api_key: 'x', credit_id: 'y' });

  const readDenied = !!read.error || (read.data?.length ?? 0) === 0;
  const writeDenied = !!wrote.error;

  console.log('anon read denied/empty:', readDenied, read.error?.message ?? '');
  console.log('anon write denied:', writeDenied, wrote.error?.message ?? '');

  if (readDenied && writeDenied) {
    console.log('PASS: anon key has no access to ppq_accounts');
    process.exit(0);
  }
  console.error('FAIL: anon key can access ppq_accounts');
  process.exit(1);
}
main();
