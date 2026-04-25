#!/usr/bin/env tsx
/**
 * Check what URLs are stored in user_teams.banner_url
 * and test whether each is reachable.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

async function run() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_teams?select=id,name,banner_url&limit=20`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    },
  );
  const clubs = await res.json() as Array<{ id: string; name: string; banner_url: string | null }>;

  console.log(`Found ${clubs.length} clubs\n`);

  for (const c of clubs) {
    const url = c.banner_url;
    if (!url) {
      console.log(`  ${c.name}: <null>`);
      continue;
    }
    const host = new URL(url).host;
    const start = Date.now();
    try {
      const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
      console.log(`  ${c.name.padEnd(24)} | ${host.padEnd(30)} | ${r.status} in ${Date.now() - start}ms`);
    } catch (e: any) {
      console.log(`  ${c.name.padEnd(24)} | ${host.padEnd(30)} | FAIL (${e.name}) in ${Date.now() - start}ms`);
    }
  }
}

run().catch(console.error);
