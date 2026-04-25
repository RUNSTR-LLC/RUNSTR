#!/usr/bin/env tsx
/**
 * One-time migration: download every existing club banner from its external
 * host (Blossom, Primal, etc.) and re-upload it to the Supabase `club-banners`
 * bucket so we stop depending on third-party media servers staying online.
 *
 * Behavior per row:
 *   - `banner_url` null or already on our Supabase host → skipped.
 *   - Fetch succeeds → upload to `<clubId>/<timestamp>.<ext>` and update the
 *     row to point at the new Supabase Storage URL.
 *   - Fetch fails / times out / returns non-200 → set `banner_url` to null so
 *     the client-side fallback renders a gradient instead of a broken image.
 *
 * Requires:
 *   - SUPABASE_SERVICE_ROLE_KEY in .env (service role is required to update
 *     user_teams rows without going through the manage-club edge function).
 *
 * Usage:
 *   # Dry run — prints what would happen, no changes:
 *   npx tsx scripts/maintenance/migrate-club-banners.ts
 *
 *   # Live run:
 *   npx tsx scripts/maintenance/migrate-club-banners.ts --apply
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env: need EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const BUCKET = 'club-banners';
const FETCH_TIMEOUT_MS = 10_000;
const APPLY = process.argv.includes('--apply');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

interface ClubRow {
  id: string;
  name: string;
  banner_url: string | null;
}

function isAlreadySupabaseHosted(url: string): boolean {
  try {
    const host = new URL(url).host;
    return host.includes('.supabase.co') || host.includes('.supabase.in');
  } catch {
    return false;
  }
}

function extFromResponse(url: string, contentType: string | null): { ext: string; type: string } {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('png')) return { ext: 'png', type: 'image/png' };
  if (ct.includes('webp')) return { ext: 'webp', type: 'image/webp' };
  if (ct.includes('jpeg') || ct.includes('jpg')) return { ext: 'jpg', type: 'image/jpeg' };
  // Fall back to URL suffix.
  const urlExt = url.split('.').pop()?.toLowerCase().split('?')[0] || 'jpg';
  if (urlExt === 'png') return { ext: 'png', type: 'image/png' };
  if (urlExt === 'webp') return { ext: 'webp', type: 'image/webp' };
  return { ext: 'jpg', type: 'image/jpeg' };
}

async function migrateOne(club: ClubRow): Promise<'skipped' | 'migrated' | 'cleared' | 'failed'> {
  const url = club.banner_url;
  if (!url) return 'skipped';
  if (isAlreadySupabaseHosted(url)) {
    console.log(`  [skip] ${club.name}: already on Supabase`);
    return 'skipped';
  }

  const host = (() => { try { return new URL(url).host; } catch { return '<invalid>'; } })();
  const start = Date.now();
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (e: any) {
    console.log(`  [clear] ${club.name}: fetch failed from ${host} (${e.name}) in ${Date.now() - start}ms`);
    if (APPLY) {
      await supabase.from('user_teams').update({ banner_url: null }).eq('id', club.id);
    }
    return 'cleared';
  }

  if (!response.ok) {
    console.log(`  [clear] ${club.name}: ${response.status} from ${host}`);
    if (APPLY) {
      await supabase.from('user_teams').update({ banner_url: null }).eq('id', club.id);
    }
    return 'cleared';
  }

  const { ext, type } = extFromResponse(url, response.headers.get('content-type'));
  const bytes = await response.arrayBuffer();
  const sizeKb = Math.round(bytes.byteLength / 1024);
  const path = `${club.id}/${Date.now()}.${ext}`;

  if (!APPLY) {
    console.log(`  [migrate] ${club.name}: ${host} (${sizeKb}KB, ${type}) → ${path}`);
    return 'migrated';
  }

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: type, upsert: true });
  if (uploadErr) {
    console.log(`  [FAIL] ${club.name}: upload error — ${uploadErr.message}`);
    return 'failed';
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const newUrl = data.publicUrl;

  const { error: updateErr } = await supabase
    .from('user_teams')
    .update({ banner_url: newUrl })
    .eq('id', club.id);
  if (updateErr) {
    console.log(`  [FAIL] ${club.name}: update error — ${updateErr.message}`);
    return 'failed';
  }

  console.log(`  [migrate] ${club.name}: ${host} (${sizeKb}KB) → Supabase`);
  return 'migrated';
}

async function run() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN (use --apply to write changes)'}`);

  const { data: clubs, error } = await supabase
    .from('user_teams')
    .select('id, name, banner_url')
    .not('banner_url', 'is', null)
    .neq('banner_url', '')
    .returns<ClubRow[]>();

  if (error) {
    console.error('Query failed:', error);
    process.exit(1);
  }
  if (!clubs || clubs.length === 0) {
    console.log('No clubs with banner_url to migrate.');
    return;
  }

  console.log(`Found ${clubs.length} clubs with banner_url\n`);

  const counts = { skipped: 0, migrated: 0, cleared: 0, failed: 0 };
  for (const club of clubs) {
    const result = await migrateOne(club);
    counts[result]++;
  }

  console.log('\n--- Summary ---');
  console.log(`Migrated: ${counts.migrated}`);
  console.log(`Cleared (broken URL):  ${counts.cleared}`);
  console.log(`Skipped (already ok):  ${counts.skipped}`);
  console.log(`Failed (write error):  ${counts.failed}`);
  if (!APPLY) {
    console.log('\nNo changes were made. Re-run with --apply to write.');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
