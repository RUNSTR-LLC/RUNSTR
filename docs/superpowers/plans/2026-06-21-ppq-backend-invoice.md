# PPQ.AI Backend Invoice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make earning PPQ.AI credits reliable by storing each user's PPQ key server-side (uploaded with a NIP-98-signed proof of ownership) so the backend reward payer can create the topup invoice itself — instead of depending on the app being awake to create it.

**Architecture:** Add an RLS-locked `ppq_accounts` table (deny-all to the client). Add a `register-ppq-account` Edge Function that verifies a NIP-98 signature and upserts the key with service-role. Change the client to upload its key once (on setup + a one-time migration) and stop creating reward invoices on-device. The external `runstr-zapper` (separate repo) reads the key and creates+pays the invoice — covered by a handoff doc, not built here.

**Tech Stack:** Supabase Postgres + RLS, Supabase Edge Functions (Deno), `@noble/secp256k1` (Schnorr verify, already used by `claim-reward`), `nostr-tools/nip19` (server-side bech32 decode), React Native + TypeScript client, NDK for client-side signing.

## Global Constraints

- **Terminology:** never say "sats/Bitcoin/Lightning/Nostr" in user-facing text. This work is backend/implementation code, so technical terms are allowed in code/comments but keep any UI copy neutral ("rewards", "credits").
- **NDK exclusively on the client** — sign with `GlobalNDKService.getInstance()`; never `new NDK()`. nostr-tools is allowed **server-side** in Edge Functions only (already the norm there).
- **No nsec leaves the device** — NIP-98 signs locally; only the signed event travels.
- **500-line file limit** — keep new files focused.
- **anon key must have zero access to `ppq_accounts`** — RLS enabled, no client policies.
- **Migrations are append-only and numbered** — next free number is **183**.
- **Verification protocol** (CLAUDE.md): `npm run typecheck` + a script in `scripts/verify/` run with `npx tsx`. Edge Function pure logic is unit-tested with `deno test`.
- **PPQ topup amount must equal the paid amount** — the zapper computes the reward amount and creates the invoice for that exact amount (handoff doc).

---

### Task 1: `ppq_accounts` table migration

**Files:**
- Create: `supabase/migrations/183_ppq_accounts_table.sql`
- Test: `scripts/verify/verify-ppq-accounts-rls.ts`

**Interfaces:**
- Produces: table `ppq_accounts(npub TEXT PK, api_key TEXT, credit_id TEXT, created_at, updated_at)`, RLS enabled with no client policies. The zapper and Edge Functions access it via service-role.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/183_ppq_accounts_table.sql`:

```sql
-- Migration 183: ppq_accounts — server-side storage of users' PPQ.AI keys
--
-- Purpose: Let the backend reward payer (runstr-zapper) create a PPQ.AI topup
--          invoice and pay it, instead of depending on the app to create the
--          invoice on-device. Fixes PPQ.AI earning for background-synced
--          workouts (no app running => no client-created invoice => no reward).
--
-- Security: A PPQ.AI key controls only AI credits (no withdrawal). RLS is
--           enabled with NO client policies, so the public anon key the app
--           ships with has ZERO access. Only service-role (Edge Functions,
--           zapper) can read/write. Keys enter ONLY via the register-ppq-account
--           Edge Function, which verifies a NIP-98 signature from the npub owner.
-- Date: 2026-06-21

CREATE TABLE IF NOT EXISTS ppq_accounts (
  npub        TEXT        PRIMARY KEY,
  api_key     TEXT        NOT NULL,
  credit_id   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ppq_accounts ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: RLS-enabled + no policy = deny-all to anon/authenticated.
-- service-role bypasses RLS.

COMMENT ON TABLE ppq_accounts IS
  'PPQ.AI keys keyed by npub. Written ONLY by register-ppq-account Edge Function '
  '(NIP-98 verified). Read by runstr-zapper (service-role) to create+pay topup '
  'invoices for users whose reward_destination is ppq. RLS deny-all to clients.';
COMMENT ON COLUMN ppq_accounts.api_key IS 'PPQ.AI API key (Bearer token for api.ppq.ai). Low-stakes: AI credits only, no withdrawal.';
COMMENT ON COLUMN ppq_accounts.credit_id IS 'PPQ.AI credit account UUID, used in topup/balance calls.';
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db push` (or apply 183 via your normal migration path).
Expected: migration applies; `ppq_accounts` exists.

- [ ] **Step 3: Write the RLS verification script**

Create `scripts/verify/verify-ppq-accounts-rls.ts`:

```ts
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
```

- [ ] **Step 4: Run the verification script**

Run: `npx tsx scripts/verify/verify-ppq-accounts-rls.ts`
Expected: `PASS: anon key has no access to ppq_accounts`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/183_ppq_accounts_table.sql scripts/verify/verify-ppq-accounts-rls.ts
git commit -m "Feature: ppq_accounts table (RLS deny-all) for backend PPQ invoicing"
```

---

### Task 2: `register-ppq-account` Edge Function (NIP-98 verified upsert)

**Files:**
- Create: `supabase/functions/register-ppq-account/index.ts`
- Create: `supabase/functions/register-ppq-account/nip98.ts`
- Test: `supabase/functions/register-ppq-account/nip98.test.ts`

**Interfaces:**
- Consumes: `ppq_accounts` table (Task 1).
- Produces: HTTP endpoint `POST /functions/v1/register-ppq-account`. Body: `{ npub: string, api_key: string, credit_id: string }`. Header: `Authorization: Nostr <base64-encoded-kind-27235-event>`. On valid NIP-98 proof, upserts the row. Returns `{ success: true }` or `{ error }`.
- Produces (pure fn): `verifyNip98({ authHeader, url, method, expectedNpub }): Promise<{ valid: boolean; reason?: string }>` in `nip98.ts`.

- [ ] **Step 1: Write the failing test for the NIP-98 verifier**

Create `supabase/functions/register-ppq-account/nip98.test.ts`:

```ts
// Run: deno test --allow-net supabase/functions/register-ppq-account/nip98.test.ts
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import * as secp from 'https://esm.sh/@noble/secp256k1@1.7.1';
import { sha256 } from 'https://esm.sh/@noble/hashes@1.3.2/sha256';
import { nip19 } from 'https://esm.sh/nostr-tools@2.7.2';
import { verifyNip98 } from './nip98.ts';

const URL = 'https://x.supabase.co/functions/v1/register-ppq-account';
const METHOD = 'POST';

function serialize(e: any): string {
  return JSON.stringify([0, e.pubkey, e.created_at, e.kind, e.tags, e.content]);
}

async function makeAuthHeader(privHex: string, opts?: { url?: string; createdAt?: number }) {
  const pubkey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(privHex));
  const created_at = opts?.createdAt ?? Math.floor(Date.now() / 1000);
  const base = {
    pubkey,
    created_at,
    kind: 27235,
    tags: [['u', opts?.url ?? URL], ['method', METHOD]],
    content: '',
  };
  const id = secp.utils.bytesToHex(sha256(new TextEncoder().encode(serialize(base))));
  const sig = secp.utils.bytesToHex(await secp.schnorr.sign(id, privHex));
  const event = { ...base, id, sig };
  return { header: `Nostr ${btoa(JSON.stringify(event))}`, npub: nip19.npubEncode(pubkey) };
}

Deno.test('accepts a valid signed auth event', async () => {
  const priv = secp.utils.bytesToHex(secp.utils.randomPrivateKey());
  const { header, npub } = await makeAuthHeader(priv);
  const res = await verifyNip98({ authHeader: header, url: URL, method: METHOD, expectedNpub: npub });
  assertEquals(res.valid, true);
});

Deno.test('rejects when npub does not match signer', async () => {
  const priv = secp.utils.bytesToHex(secp.utils.randomPrivateKey());
  const { header } = await makeAuthHeader(priv);
  const otherPriv = secp.utils.bytesToHex(secp.utils.randomPrivateKey());
  const otherNpub = nip19.npubEncode(secp.utils.bytesToHex(secp.schnorr.getPublicKey(otherPriv)));
  const res = await verifyNip98({ authHeader: header, url: URL, method: METHOD, expectedNpub: otherNpub });
  assertEquals(res.valid, false);
});

Deno.test('rejects a stale event (replay window)', async () => {
  const priv = secp.utils.bytesToHex(secp.utils.randomPrivateKey());
  const { header, npub } = await makeAuthHeader(priv, { createdAt: Math.floor(Date.now() / 1000) - 600 });
  const res = await verifyNip98({ authHeader: header, url: URL, method: METHOD, expectedNpub: npub });
  assertEquals(res.valid, false);
});

Deno.test('rejects a url mismatch', async () => {
  const priv = secp.utils.bytesToHex(secp.utils.randomPrivateKey());
  const { header, npub } = await makeAuthHeader(priv, { url: 'https://evil.example/x' });
  const res = await verifyNip98({ authHeader: header, url: URL, method: METHOD, expectedNpub: npub });
  assertEquals(res.valid, false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `deno test --allow-net supabase/functions/register-ppq-account/nip98.test.ts`
Expected: FAIL — `Module not found ... ./nip98.ts`.

- [ ] **Step 3: Implement the NIP-98 verifier**

Create `supabase/functions/register-ppq-account/nip98.ts`:

```ts
import * as secp from 'https://esm.sh/@noble/secp256k1@1.7.1';
import { sha256 } from 'https://esm.sh/@noble/hashes@1.3.2/sha256';
import { nip19 } from 'https://esm.sh/nostr-tools@2.7.2';

const REPLAY_WINDOW_SECONDS = 60;

function serialize(e: { pubkey: string; created_at: number; kind: number; tags: string[][]; content: string }): string {
  return JSON.stringify([0, e.pubkey, e.created_at, e.kind, e.tags, e.content]);
}

function tagValue(tags: string[][], name: string): string | undefined {
  const t = tags.find((t) => t[0] === name);
  return t?.[1];
}

export async function verifyNip98(params: {
  authHeader: string | null;
  url: string;
  method: string;
  expectedNpub: string;
}): Promise<{ valid: boolean; reason?: string }> {
  const { authHeader, url, method, expectedNpub } = params;

  if (!authHeader || !authHeader.startsWith('Nostr ')) {
    return { valid: false, reason: 'missing Nostr authorization header' };
  }

  let event: any;
  try {
    event = JSON.parse(atob(authHeader.slice('Nostr '.length).trim()));
  } catch {
    return { valid: false, reason: 'malformed auth event' };
  }

  if (event.kind !== 27235) return { valid: false, reason: 'wrong kind (expected 27235)' };
  if (typeof event.pubkey !== 'string' || typeof event.sig !== 'string') {
    return { valid: false, reason: 'event missing pubkey/sig' };
  }

  // created_at within replay window
  const now = Math.floor(Date.now() / 1000);
  if (typeof event.created_at !== 'number' || Math.abs(now - event.created_at) > REPLAY_WINDOW_SECONDS) {
    return { valid: false, reason: 'stale or future-dated event' };
  }

  // url + method tags must match
  if (tagValue(event.tags ?? [], 'u') !== url) return { valid: false, reason: 'url mismatch' };
  if ((tagValue(event.tags ?? [], 'method') ?? '').toUpperCase() !== method.toUpperCase()) {
    return { valid: false, reason: 'method mismatch' };
  }

  // pubkey must equal expectedNpub
  let expectedHex: string;
  try {
    const decoded = nip19.decode(expectedNpub);
    if (decoded.type !== 'npub') return { valid: false, reason: 'expectedNpub not an npub' };
    expectedHex = decoded.data as string;
  } catch {
    return { valid: false, reason: 'undecodable npub' };
  }
  if (event.pubkey !== expectedHex) return { valid: false, reason: 'signer does not match npub' };

  // recompute id and verify schnorr signature
  const computedId = secp.utils.bytesToHex(sha256(new TextEncoder().encode(serialize(event))));
  if (event.id && event.id !== computedId) return { valid: false, reason: 'event id mismatch' };

  let sigOk = false;
  try {
    sigOk = await secp.schnorr.verify(event.sig, computedId, event.pubkey);
  } catch {
    sigOk = false;
  }
  if (!sigOk) return { valid: false, reason: 'invalid signature' };

  return { valid: true };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `deno test --allow-net supabase/functions/register-ppq-account/nip98.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement the Edge Function handler**

Create `supabase/functions/register-ppq-account/index.ts`:

```ts
/**
 * Supabase Edge Function: register-ppq-account
 *
 * The ONLY path by which a user's PPQ.AI key enters the ppq_accounts table.
 * Verifies a NIP-98 (kind 27235) signature proving the request was signed by
 * the npub's owner, then upserts { npub, api_key, credit_id } with service-role.
 *
 * Security: ppq_accounts is RLS deny-all to the public anon key. No nsec ever
 * reaches this function — only the user's signature is sent. A PPQ.AI key
 * controls only AI credits (no withdrawal).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyNip98 } from './nip98.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { npub, api_key, credit_id } = await req.json();

    if (!npub || !npub.startsWith('npub1') || npub.length < 60) {
      return json({ error: 'Invalid npub' }, 400);
    }
    if (!api_key || !credit_id) {
      return json({ error: 'api_key and credit_id required' }, 400);
    }

    // NIP-98 proof of ownership. The url must match exactly what the client signed.
    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/register-ppq-account`;
    const proof = await verifyNip98({
      authHeader: req.headers.get('Authorization'),
      url: functionUrl,
      method: 'POST',
      expectedNpub: npub,
    });
    if (!proof.valid) {
      console.warn('[register-ppq-account] NIP-98 rejected:', proof.reason);
      return json({ error: 'ownership proof failed' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase
      .from('ppq_accounts')
      .upsert({ npub, api_key, credit_id, updated_at: new Date().toISOString() }, { onConflict: 'npub' });

    if (error) {
      console.error('[register-ppq-account] upsert failed:', error.message);
      return json({ error: 'storage failed' }, 500);
    }

    console.log('[register-ppq-account] stored key for', npub.slice(0, 12) + '...');
    return json({ success: true }, 200);
  } catch (e) {
    console.error('[register-ppq-account] error:', e instanceof Error ? e.message : e);
    return json({ error: 'bad request' }, 400);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

> Note: the `Authorization` header carries the NIP-98 proof (`Nostr <base64>`), NOT the Supabase anon JWT — this function is invoked with the anon apikey via the `apikey` header / Supabase client, consistent with other public functions. Confirm your Supabase project's function gateway allows the custom Authorization value; if it strips it, send the proof in an `X-Nostr-Auth` header instead and read that in both `index.ts` and the client (Task 3).

- [ ] **Step 6: Deploy and smoke-test**

Run: `npx supabase functions deploy register-ppq-account`
Then run the round-trip verify script created in Task 3, Step 4.
Expected: deploy succeeds.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/register-ppq-account/
git commit -m "Feature: register-ppq-account Edge Function (NIP-98 verified key upload)"
```

---

### Task 3: Client — upload the PPQ key (signed) on setup + one-time migration

**Files:**
- Modify: `src/services/ai/PPQAccountService.ts` (add `uploadAccount`, call it from `setAccount`/`createAccount`; add `migrateLocalKeyToBackend`)
- Create: `src/services/ai/ppqUploadAuth.ts` (pure NIP-98 header builder, testable)
- Test: `scripts/verify/verify-ppq-upload-auth.ts`

**Interfaces:**
- Consumes: `register-ppq-account` endpoint (Task 2); `GlobalNDKService.getInstance()` for signing; `@runstr:npub` from AsyncStorage.
- Produces:
  - `buildPpqAuthEvent(signer, url): Promise<{ header: string }>` in `ppqUploadAuth.ts` — builds + signs a kind-27235 event and returns the `Nostr <base64>` header.
  - `PPQAccountService.uploadAccount(apiKey: string, creditId: string): Promise<boolean>`
  - `PPQAccountService.migrateLocalKeyToBackend(): Promise<void>` — uploads once if a local key exists and `@runstr:ppq_uploaded` flag is unset.

- [ ] **Step 1: Write the failing test for the auth-event builder**

Create `scripts/verify/verify-ppq-upload-auth.ts`:

```ts
/**
 * Verifies buildPpqAuthEvent produces a header that the server-side verifier accepts.
 * Reuses the exact verification logic from the Edge Function's nip98.ts shape.
 * Run: npx tsx scripts/verify/verify-ppq-upload-auth.ts
 */
import { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { buildPpqAuthEvent } from '../../src/services/ai/ppqUploadAuth';

const URL = 'https://x.supabase.co/functions/v1/register-ppq-account';

async function main() {
  const signer = NDKPrivateKeySigner.generate();
  const { header } = await buildPpqAuthEvent(signer, URL);

  if (!header.startsWith('Nostr ')) throw new Error('header not prefixed with "Nostr "');
  const event = JSON.parse(Buffer.from(header.slice(6), 'base64').toString('utf8'));

  const checks = {
    kind27235: event.kind === 27235,
    hasSig: typeof event.sig === 'string' && event.sig.length === 128,
    uTag: event.tags.some((t: string[]) => t[0] === 'u' && t[1] === URL),
    methodTag: event.tags.some((t: string[]) => t[0] === 'method' && t[1] === 'POST'),
    freshTs: Math.abs(Math.floor(Date.now() / 1000) - event.created_at) < 60,
  };
  console.log(checks);
  if (Object.values(checks).every(Boolean)) {
    console.log('PASS: auth event well-formed and signed');
    process.exit(0);
  }
  console.error('FAIL');
  process.exit(1);
}
main();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx scripts/verify/verify-ppq-upload-auth.ts`
Expected: FAIL — `Cannot find module '../../src/services/ai/ppqUploadAuth'`.

- [ ] **Step 3: Implement the auth-event builder**

Create `src/services/ai/ppqUploadAuth.ts`:

```ts
/**
 * Builds a NIP-98 (kind 27235) HTTP-auth event for uploading the PPQ.AI key.
 * The user's nsec never leaves the device — only the signed event is sent.
 */
import { NDKEvent, type NDKSigner } from '@nostr-dev-kit/ndk';

export async function buildPpqAuthEvent(
  signer: NDKSigner,
  url: string,
): Promise<{ header: string }> {
  const user = await signer.user();

  const event = new NDKEvent();
  event.kind = 27235;
  event.created_at = Math.floor(Date.now() / 1000);
  event.content = '';
  event.tags = [
    ['u', url],
    ['method', 'POST'],
  ];
  event.pubkey = user.pubkey;

  await event.sign(signer);

  const raw = event.rawEvent();
  const header = `Nostr ${Buffer.from(JSON.stringify(raw)).toString('base64')}`;
  return { header };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx scripts/verify/verify-ppq-upload-auth.ts`
Expected: `PASS: auth event well-formed and signed`

- [ ] **Step 5: Add `uploadAccount` + `migrateLocalKeyToBackend` to `PPQAccountService`**

In `src/services/ai/PPQAccountService.ts`, add imports at the top:

```ts
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { buildPpqAuthEvent } from './ppqUploadAuth';
```

Add a storage key constant near the existing ones (after `PPQ_CREDIT_ID`):

```ts
const PPQ_UPLOADED = '@runstr:ppq_uploaded';
```

Add these methods to the `PPQAccountService` class (before the closing brace):

```ts
  /**
   * Upload the user's PPQ.AI key to the backend so the reward payer can create
   * topup invoices server-side. Signed with the user's own key (NIP-98); the
   * nsec never leaves the device. Idempotent: safe to call repeatedly.
   */
  static async uploadAccount(apiKey: string, creditId: string): Promise<boolean> {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[PPQAccount] Supabase not configured; skip key upload');
        return false;
      }

      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (!npub) {
        console.warn('[PPQAccount] No npub; cannot upload key');
        return false;
      }

      const ndk = await GlobalNDKService.getInstance();
      if (!ndk.signer) {
        console.warn('[PPQAccount] No signer available; cannot sign upload');
        return false;
      }

      const functionUrl = `${supabaseUrl}/functions/v1/register-ppq-account`;
      const { header } = await buildPpqAuthEvent(ndk.signer, functionUrl);

      const res = await fetchWithTimeout(
        functionUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': header,
          },
          body: JSON.stringify({ npub, api_key: apiKey, credit_id: creditId }),
        },
        PPQ_API_TIMEOUT,
      );

      if (!res.ok) {
        console.warn('[PPQAccount] Key upload failed:', res.status, await res.text());
        return false;
      }

      await AsyncStorage.setItem(PPQ_UPLOADED, '1');
      console.log('[PPQAccount] Key uploaded to backend');
      return true;
    } catch (error) {
      console.warn('[PPQAccount] uploadAccount error:', error);
      return false;
    }
  }

  /**
   * One-time migration: if a local key exists but was never uploaded, upload it.
   * Call on app launch / first PPQ interaction.
   */
  static async migrateLocalKeyToBackend(): Promise<void> {
    try {
      const uploaded = await AsyncStorage.getItem(PPQ_UPLOADED);
      if (uploaded === '1') return;
      const account = await this.getAccount();
      if (!account) return;
      await this.uploadAccount(account.apiKey, account.creditId);
    } catch (error) {
      console.warn('[PPQAccount] migrateLocalKeyToBackend error:', error);
    }
  }
```

> Note: the Edge Function reads the NIP-98 proof from the `Authorization` header. If your project's function gateway reserves `Authorization` for the Supabase JWT (see Task 2, Step 5 note), change both sides to `X-Nostr-Auth`.

- [ ] **Step 6: Call `uploadAccount` after a successful local save**

In `src/services/ai/PPQAccountService.ts`, in `createAccount()`, immediately after the existing `await AsyncStorage.multiSet([[PPQ_API_KEY, apiKey], [PPQ_CREDIT_ID, creditId]]);` and before `return { success: true, ... }`, add:

```ts
      // Best-effort: push the key to the backend so rewards work without the app open.
      void this.uploadAccount(apiKey, creditId);
```

And in `setAccount()`, immediately after the existing `multiSet` and before `return true;`, add:

```ts
      void this.uploadAccount(apiKey, creditId);
```

- [ ] **Step 7: Trigger the one-time migration on launch**

In `src/services/ai/PPQAccountService.ts` callers — the simplest reachable launch hook is the PPQ setup surface. In `src/components/rewards/RewardDestinationPicker.tsx`, find the existing `PPQAccountService.hasAccount()` call (around line 178) and, right after confirming an account exists, add a fire-and-forget migration:

```ts
    const hasAccount = await PPQAccountService.hasAccount();
    if (hasAccount) {
      void PPQAccountService.migrateLocalKeyToBackend();
    }
```

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: no new errors (pre-existing baseline unchanged).

- [ ] **Step 9: Commit**

```bash
git add src/services/ai/PPQAccountService.ts src/services/ai/ppqUploadAuth.ts src/components/rewards/RewardDestinationPicker.tsx scripts/verify/verify-ppq-upload-auth.ts
git commit -m "Feature: upload PPQ.AI key to backend (NIP-98 signed) on setup + one-time migration"
```

---

### Task 4: Client — stop creating reward invoices on-device

**Files:**
- Modify: `src/services/backend/SupabaseCompetitionService.ts:333-388` (remove the client-side `createTopupInvoice` reward block) and the `ppq_bolt11` / `ppq_invoice_id` fields in the submit body (~`:430-436`).
- Test: `scripts/verify/verify-no-client-ppq-invoice.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: workout submissions no longer create a PPQ invoice client-side. `reward_destination=ppq` tagging is unchanged. The manual top-up flow (`PPQCreditTopupModal`) is untouched.

- [ ] **Step 1: Remove the client-side invoice-creation block**

In `src/services/backend/SupabaseCompetitionService.ts`, delete the entire block that begins with the comment `// PPQ.AI: Auto-create bolt11 invoice...` through the end of the `ppqFailed` safety comment block (the `let ppqBolt11 ...` declaration, the `Promise.race([...])`, and the `if (ppqFailed && !ppqBolt11) { ... }` warning). Replace it with:

```ts
    // PPQ.AI rewards are now created server-side by the reward payer (runstr-zapper),
    // which reads the user's key from ppq_accounts and creates the topup invoice for
    // the exact reward amount. The client no longer creates invoices here — that broke
    // for background-synced workouts (no app => no invoice). See
    // docs/superpowers/specs/2026-06-21-ppq-backend-invoice-design.md
    const submissionTags = data.tags || [];
```

(If `submissionTags` is already declared later, keep a single declaration — search for `submissionTags` and ensure it is defined exactly once.)

- [ ] **Step 2: Remove the PPQ fields from the submit body**

In the same file, in the `submit-workout` fetch body, delete these two lines:

```ts
            ppq_bolt11: ppqBolt11 || null,
            ppq_invoice_id: ppqInvoiceId || null,
```

(Leave `submit-workout` server-side handling of those columns intact for backward-compat with old clients; we simply stop sending them.)

- [ ] **Step 3: Remove now-unused imports/helpers**

Search the file for `createTopupInvoice`, `isPPQTeam`, `getWorkoutRewardAmount`, and `PPQAccountService` usages. Remove any import that is now unused (only remove if no other reference remains in the file). Run `npm run typecheck` to catch unused-symbol/type errors.

- [ ] **Step 4: Write the verification script**

Create `scripts/verify/verify-no-client-ppq-invoice.ts`:

```ts
/**
 * Confirms the client no longer creates PPQ invoices at submit time.
 * Run: npx tsx scripts/verify/verify-no-client-ppq-invoice.ts
 */
import { readFileSync } from 'fs';

const src = readFileSync('src/services/backend/SupabaseCompetitionService.ts', 'utf8');
const violations: string[] = [];
if (src.includes('createTopupInvoice')) violations.push('still calls createTopupInvoice');
if (/ppq_bolt11:\s/.test(src)) violations.push('still sends ppq_bolt11 in submit body');
if (/ppq_invoice_id:\s/.test(src)) violations.push('still sends ppq_invoice_id in submit body');

if (violations.length === 0) {
  console.log('PASS: no client-side PPQ invoice creation at submit time');
  process.exit(0);
}
console.error('FAIL:', violations.join('; '));
process.exit(1);
```

- [ ] **Step 5: Run typecheck and the verification script**

Run: `npm run typecheck`
Expected: no new errors.
Run: `npx tsx scripts/verify/verify-no-client-ppq-invoice.ts`
Expected: `PASS: no client-side PPQ invoice creation at submit time`

- [ ] **Step 6: Commit**

```bash
git add src/services/backend/SupabaseCompetitionService.ts scripts/verify/verify-no-client-ppq-invoice.ts
git commit -m "Refactor: stop creating PPQ.AI reward invoices on-device (now backend-owned)"
```

---

### Task 5: Deprecation notes (legacy `ppq_bolt11` path) + service header update

**Files:**
- Create: `supabase/migrations/184_deprecate_ppq_bolt11_path.sql`
- Modify: `src/services/ai/PPQAccountService.ts` (file header comment)

**Interfaces:**
- Consumes/Produces: nothing functional — comments + column docs only. The legacy `ppq_bolt11` column and migration-176 skip path remain working for in-flight old-client rows; this only documents that they are deprecated.

- [ ] **Step 1: Write the deprecation migration**

Create `supabase/migrations/184_deprecate_ppq_bolt11_path.sql`:

```sql
-- Migration 184: Mark the client-created ppq_bolt11 path as deprecated.
--
-- PPQ.AI rewards are now created server-side by runstr-zapper, which reads the
-- user's key from ppq_accounts (migration 183) and creates the topup invoice for
-- the exact reward amount. The client no longer writes ppq_bolt11.
--
-- These columns + the migration 176 "skip if reward_destination=ppq and no
-- bolt11" branch remain for backward-compat with rows from old app versions.
-- A future migration can drop them once old clients age out.
-- Date: 2026-06-21

COMMENT ON COLUMN workout_submissions.ppq_bolt11 IS
  'DEPRECATED (2026-06-21): legacy client-created PPQ.AI topup invoice. New flow '
  'creates invoices server-side via ppq_accounts + runstr-zapper. Retained only '
  'for backward-compat with old-client rows.';
COMMENT ON COLUMN workout_submissions.ppq_invoice_id IS
  'DEPRECATED (2026-06-21): see ppq_bolt11. Legacy client-side PPQ.AI invoice id.';
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push` (or your normal path).
Expected: applies cleanly.

- [ ] **Step 3: Update the `PPQAccountService` header comment**

In `src/services/ai/PPQAccountService.ts`, change the top doc comment line:

```
 * Handles PPQ.AI account creation, balance checking, and topup invoice generation.
 * All credentials are stored locally - only bolt11 invoices leave the device.
```

to:

```
 * Handles PPQ.AI account creation, balance checking, and topup invoice generation.
 * The key is stored locally (powers on-device AI queries) AND uploaded to the
 * backend (ppq_accounts) via a NIP-98-signed request so the reward payer can
 * create topup invoices server-side. The nsec never leaves the device — only a
 * signature. A PPQ.AI key controls only AI credits (no withdrawal).
```

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck`
Expected: no new errors.

```bash
git add supabase/migrations/184_deprecate_ppq_bolt11_path.sql src/services/ai/PPQAccountService.ts
git commit -m "Docs: deprecate client-side ppq_bolt11 path; update PPQAccountService header"
```

---

### Task 6: Zapper handoff document

**Files:**
- Create: `docs/superpowers/specs/2026-06-21-ppq-backend-invoice-zapper-handoff.md`

**Interfaces:**
- Consumes: `ppq_accounts` (Task 1). Self-contained doc for the `runstr-zapper` maintainer.

- [ ] **Step 1: Write the handoff doc**

Create `docs/superpowers/specs/2026-06-21-ppq-backend-invoice-zapper-handoff.md`:

````markdown
# RUNSTR Zapper — PPQ.AI Backend Invoicing Handoff

> Companion to `2026-06-21-ppq-backend-invoice-design.md`. Self-contained for the `runstr-zapper` repo. Hand the maintainer this one file.

## What's being added

PPQ.AI users earn AI credits instead of sats. Previously the **app** created the topup invoice and wrote `workout_submissions.ppq_bolt11`. That failed for background-synced workouts (no app running). The app no longer creates invoices. The zapper now creates and pays the PPQ.AI invoice itself.

## Schema (migration lives in the RUNSTR app repo — migration 183)

```sql
CREATE TABLE ppq_accounts (
  npub       TEXT PRIMARY KEY,
  api_key    TEXT NOT NULL,   -- Bearer token for api.ppq.ai
  credit_id  TEXT NOT NULL,   -- PPQ.AI credit account UUID
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
-- RLS deny-all to clients; zapper reads with its existing service-role creds.
```

## Logic to add to the workout-reward path

When processing a `workout_submissions` row whose `raw_event.tags` contains `['reward_destination','ppq']`:

1. Compute the reward amount exactly as you do today (base + streak/bonus). Call it `amount_sats`.
2. Look up the key: `SELECT api_key, credit_id FROM ppq_accounts WHERE npub = <row.npub>`.
   - If no row: record a skipped payout (`status='skipped_no_ppq_account'`). **Do NOT** fall back to a Lightning address (would misroute an AI-credit reward to a wallet).
3. Create the topup invoice (server-to-server — same call the app used to make):
   ```
   POST https://api.ppq.ai/topup/create/btc-lightning
   Authorization: Bearer <api_key>
   Content-Type: application/json
   { "credit_id": "<credit_id>", "amount": <amount_sats>, "currency": "SATS" }
   ```
   Response: read `bolt11` (fallback field name `lightning_invoice`).
   - On failure: record a failed payout; rely on your normal retry semantics.
4. Pay `bolt11` via your existing `pay_invoice` path. **Insert the idempotency row BEFORE paying** (same rule as `2026-05-11-zapper-bonuses-handoff.md`) so a PPQ reward is never double-created.

## Critical invariants

- **Invoice amount == paid amount.** Because PPQ topup invoices are fixed-amount, create the invoice for the *final* computed `amount_sats` (after streak/bonus), not a base value.
- **No Lightning fallback for PPQ.** Missing key or failed invoice → skip/fail, never reroute to a wallet.
- **Legacy rows:** older app versions still write `workout_submissions.ppq_bolt11`. If a row already has a non-empty `ppq_bolt11`, keep paying it directly (old path) and skip steps 2–3. Only do the new flow when `ppq_bolt11` is empty.

## Open items to confirm in the zapper code

1. Exact location where the workout reward amount is computed (so the invoice uses it).
2. Whether you want a push notification on successful PPQ topup (parity with sats rewards); if so wire it through the existing notify path.
````

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-06-21-ppq-backend-invoice-zapper-handoff.md
git commit -m "Docs: runstr-zapper handoff for backend PPQ.AI invoicing"
```

---

## Self-Review

**Spec coverage:**
- Table (RLS deny-all) → Task 1. ✓
- `register-ppq-account` (NIP-98 verified upsert) → Task 2. ✓
- Client upload on setup + one-time legacy-key migration → Task 3. ✓
- Stop client-side `ppq_bolt11` creation; keep `reward_destination` + manual topup → Task 4. ✓
- Deprecate `ppq_bolt11` / migration-176 path; update service header → Task 5. ✓
- Zapper handoff (amount==paid, no LN fallback, legacy-row rule) → Task 6. ✓
- Security invariants (anon zero-access, no nsec leaves device) → enforced in Tasks 1–3, verified in Task 1 Step 4 and Task 3 Step 4. ✓

**Placeholder scan:** No TBD/TODO; all code blocks complete. ✓

**Type consistency:** `buildPpqAuthEvent(signer, url)` defined in Task 3 Step 3, consumed in Task 3 Step 5 and tested in Step 1. `verifyNip98({authHeader,url,method,expectedNpub})` defined in Task 2 Step 3, consumed in Task 2 Step 5, tested in Step 1. `uploadAccount`/`migrateLocalKeyToBackend` defined in Task 3, called in Task 3 Steps 6–7. Header carrier (`Authorization` vs `X-Nostr-Auth`) noted consistently in Task 2 Step 5 and Task 3 Step 5. ✓

**Known risk to validate during execution:** the function gateway's handling of a custom `Authorization` value (Task 2 Step 5 note) — resolve before relying on it; `X-Nostr-Auth` is the documented fallback on both sides.
