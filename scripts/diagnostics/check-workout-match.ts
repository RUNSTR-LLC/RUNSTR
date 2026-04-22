#!/usr/bin/env tsx
/**
 * Check whether the newest #RUNSTR social posts have matching rows in
 * workout_submissions — if the match lookup returns nothing, the feed
 * will render the full-bleed PNG instead of the native card.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

async function run() {
  // Recent workout-like posts
  const postsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/social_feed?select=id,event_id,npub,content,hashtags,author_name,created_at&hashtags=cs.{runstr}&order=created_at.desc&limit=10`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  );
  const posts = await postsRes.json();

  console.log(`Found ${posts.length} posts tagged 'runstr'\n`);

  for (const p of posts) {
    const t = new Date(p.created_at).getTime();
    const from = new Date(t - 3_600_000).toISOString(); // ±60 min
    const to = new Date(t + 3_600_000).toISOString();
    const wRes = await fetch(
      `${SUPABASE_URL}/rest/v1/workout_submissions?select=activity_type,distance_meters,duration_seconds,calories,step_count,created_at&npub=eq.${encodeURIComponent(p.npub)}&created_at=gte.${from}&created_at=lte.${to}&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    const w = await wRes.json();

    const label = `${p.author_name || '(no name)'} @ ${p.created_at}`;
    if (!w || w.length === 0) {
      console.log(`  [NO MATCH]  ${label}`);
      console.log(`              npub: ${p.npub.slice(0, 16)}...`);
      console.log(`              hashtags: ${JSON.stringify(p.hashtags)}`);
    } else {
      console.log(`  [MATCH]     ${label}`);
      console.log(`              ${w[0].activity_type} ${w[0].distance_meters}m ${w[0].duration_seconds}s ${w[0].calories}cal`);
    }
  }
}

run().catch(console.error);
