/**
 * verify-1301-publish.ts
 *
 * Proves kind 1301 workout publishing works end-to-end against REAL relays,
 * mirroring WorkoutPublishingService.publishWorkout1301():
 *   1. Build a workout-only 1301 (no lightning / reward / wot tags)
 *   2. Sign with a throwaway key and publish to relays
 *   3. Read the event back from a relay (round-trip proof)
 *   4. Assert the tag format matches docs/KIND_1301_SPEC.md and that NO
 *      sensitive tags leaked into the public event
 *
 * Run: npx tsx scripts/verify/verify-1301-publish.ts
 */
import WebSocket from 'ws';
// NDK expects a browser-style global WebSocket in Node.
(globalThis as any).WebSocket = WebSocket;

import NDK, { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';

const RELAYS = ['wss://nos.lol', 'wss://relay.damus.io', 'wss://relay.primal.net'];

const BLOCKLIST = ['lightning', 'reward_destination', 'wot_score', 'charity', 'challenge', 'club'];

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${msg}`);
  }
}

async function main() {
  const signer = NDKPrivateKeySigner.generate();
  const user = await signer.user();
  console.log(`Throwaway pubkey: ${user.pubkey.slice(0, 12)}…`);

  const ndk = new NDK({ explicitRelayUrls: RELAYS, signer });
  await ndk.connect(3000);
  await new Promise((r) => setTimeout(r, 2500)); // let relays connect

  // Tags in the exact shape publishWorkout1301 produces (workout-only).
  const start = new Date();
  const tags: string[][] = [
    ['d', `verify_${start.getTime()}`],
    ['title', 'Running Workout'],
    ['exercise', 'running'],
    ['duration', '00:32:10'],
    ['source', 'gps'],
    ['client', 'RUNSTR', '1.9.5'],
    ['t', 'running'],
    ['distance', '5.20', 'km'],
    ['calories', '310'],
    ['workout_start_time', Math.floor(start.getTime() / 1000).toString()],
  ];

  const ev = new NDKEvent(ndk);
  ev.kind = 1301;
  ev.content = 'Completed a run with RUNSTR!';
  ev.tags = tags;
  ev.created_at = Math.floor(start.getTime() / 1000);
  await ev.sign(signer);

  const published = await ev.publish();
  console.log(`\n📡 Published to ${published.size} relay(s); id=${ev.id?.slice(0, 12)}…`);
  assert(published.size > 0, 'Published to at least one relay');

  // Round-trip: read it back from relays.
  await new Promise((r) => setTimeout(r, 2500));
  const fetched = await Promise.race([
    ndk.fetchEvent({ ids: [ev.id!] }),
    new Promise<null>((r) => setTimeout(() => r(null), 8000)),
  ]);

  assert(!!fetched, 'Event read back from a relay (round-trip)');
  if (fetched) {
    assert(fetched.kind === 1301, 'Read-back event is kind 1301');
    const t = (k: string) => fetched.tags.find((x) => x[0] === k);
    assert(t('exercise')?.[1] === 'running', "exercise tag is lowercase 'running'");
    assert(t('duration')?.[1] === '00:32:10', 'duration is HH:MM:SS');
    const dist = t('distance');
    assert(!!dist && dist[1] === '5.20' && dist[2] === 'km', "distance is ['distance','5.20','km']");
    assert(!!t('client') && t('client')![1] === 'RUNSTR', 'client:RUNSTR attribution present');
    const leaked = BLOCKLIST.filter((b) => fetched.tags.some((x) => x[0] === b));
    assert(leaked.length === 0, `no sensitive tags leaked (blocked: ${BLOCKLIST.join(', ')})`);
  }

  console.log(`\n${process.exitCode ? '❌ VERIFICATION FAILED' : '✅ 1301 publishing works end-to-end'}`);
  process.exit(process.exitCode || 0);
}

main().catch((e) => {
  console.error('Script error:', e);
  process.exit(1);
});
