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

  // Authoritative deny-all gate: under Supabase RLS with NO policy, an anon
  // SELECT returns empty data with NO error (RLS filters rows; the anon role
  // still has default table GRANTs). So an empty read does NOT prove denial.
  // An anon INSERT, however, returns an RLS-violation error when no policy
  // permits it — that is the reliable gate. The read is only a leak check:
  // if any rows are visible to anon, that is a definite failure.
  const read = await supabase.from('ppq_accounts').select('npub').limit(1);
  const wrote = await supabase
    .from('ppq_accounts')
    .insert({ npub: 'npub1test', api_key: 'x', credit_id: 'y' });

  const writeDenied = !!wrote.error;
  const readLeaked = !read.error && (read.data?.length ?? 0) > 0;

  // If the insert unexpectedly succeeded, clean up the leaked row so the
  // script stays re-runnable.
  if (!writeDenied) {
    await supabase.from('ppq_accounts').delete().eq('npub', 'npub1test');
  }

  console.log('anon write denied (authoritative):', writeDenied, wrote.error?.message ?? '');
  console.log('anon read leaked rows:', readLeaked, `(rows: ${read.data?.length ?? 0})`);

  if (writeDenied && !readLeaked) {
    console.log('PASS: anon key cannot write ppq_accounts and sees no rows');
    process.exit(0);
  }
  console.error('FAIL: anon key has access to ppq_accounts');
  process.exit(1);
}
main();
