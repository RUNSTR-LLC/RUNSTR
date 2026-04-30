import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import * as fs from 'fs';

const RUNSTR_HEX = '611021eaaa2692741b1236bbcea54c6aa9f20ba30cace316c3a93d45089a7d0f';
const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

interface CliArgs {
  days: number;
  out: string;
  timeoutMs: number | null;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let days = 7;
  let out = '/tmp/vibes.json';
  let timeoutMs: number | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days') days = parseInt(args[++i], 10);
    else if (args[i] === '--out') out = args[++i];
    else if (args[i] === '--timeout') timeoutMs = parseInt(args[++i], 10);
  }
  return { days, out, timeoutMs };
}

interface Mention {
  event_id: string;
  author: string;
  created_at: number;
  content: string;
  tags: string[][];
  source: 'hashtag' | 'ptag' | 'search';
}

async function fetchWithTimeout(
  ndk: NDK,
  filter: NDKFilter,
  timeoutMs: number
): Promise<Set<NDKEvent>> {
  return Promise.race([
    ndk.fetchEvents(filter),
    new Promise<Set<NDKEvent>>((resolve) =>
      setTimeout(() => resolve(new Set()), timeoutMs)
    ),
  ]);
}

function toMention(e: NDKEvent, source: Mention['source']): Mention {
  return {
    event_id: e.id,
    author: e.pubkey,
    created_at: e.created_at ?? 0,
    content: e.content,
    tags: e.tags,
    source,
  };
}

function dedupe(all: Mention[]): Mention[] {
  const seen = new Set<string>();
  const out: Mention[] = [];
  for (const m of all) {
    if (seen.has(m.event_id)) continue;
    seen.add(m.event_id);
    out.push(m);
  }
  return out;
}

async function main() {
  const { days, out, timeoutMs } = parseArgs();
  const since = Math.floor(Date.now() / 1000) - days * 86400;

  // Per-query timeouts. When --timeout is passed, override all of them with the given value.
  const hashtagTimeout = timeoutMs ?? 15000;
  const ptagTimeout = timeoutMs ?? 15000;
  const runstrTimeout = timeoutMs ?? 10000;

  const ndk = new NDK({ explicitRelayUrls: RELAYS });
  await ndk.connect(5000);

  const [hashtagEvents, ptagEvents, runstrEvents] = await Promise.all([
    fetchWithTimeout(ndk, { kinds: [1], '#t': ['runstr', 'RUNSTR'], since, limit: 100 }, hashtagTimeout),
    fetchWithTimeout(ndk, { kinds: [1], '#p': [RUNSTR_HEX], since, limit: 100 }, ptagTimeout),
    fetchWithTimeout(ndk, { kinds: [1], authors: [RUNSTR_HEX], since, limit: 50 }, runstrTimeout),
  ]);

  const hashtag_mentions = Array.from(hashtagEvents)
    .filter((e) => e.pubkey !== RUNSTR_HEX)
    .map((e) => toMention(e, 'hashtag'));

  const ptag_mentions = Array.from(ptagEvents)
    .filter((e) => e.pubkey !== RUNSTR_HEX)
    .map((e) => toMention(e, 'ptag'));

  const runstr_posts = Array.from(runstrEvents).map((e) => toMention(e, 'hashtag'));

  const all_mentions = dedupe([...hashtag_mentions, ...ptag_mentions]);

  const result = {
    generated_at: new Date().toISOString(),
    window_days: days,
    since_timestamp: since,
    runstr_hex: RUNSTR_HEX,
    hashtag_mentions,
    ptag_mentions,
    runstr_posts,
    all_mentions_deduped: all_mentions,
    counts: {
      hashtag: hashtag_mentions.length,
      ptag: ptag_mentions.length,
      runstr_posts: runstr_posts.length,
      total_deduped: all_mentions.length,
    },
  };

  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(
    `Vibes query done. ${all_mentions.length} deduped mentions (${hashtag_mentions.length} hashtag + ${ptag_mentions.length} ptag). ${runstr_posts.length} RUNSTR posts. Output: ${out}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Vibes query failed:', err);
  process.exit(1);
});
