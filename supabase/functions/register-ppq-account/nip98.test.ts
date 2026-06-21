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

Deno.test('rejects a tampered signature', async () => {
  const priv = secp.utils.bytesToHex(secp.utils.randomPrivateKey());
  const { header, npub } = await makeAuthHeader(priv);
  const ev = JSON.parse(atob(header.slice(6)));
  ev.sig = ev.sig.slice(0, -2) + (ev.sig.endsWith('00') ? '11' : '00');
  const tampered = `Nostr ${btoa(JSON.stringify(ev))}`;
  const res = await verifyNip98({ authHeader: tampered, url: URL, method: METHOD, expectedNpub: npub });
  assertEquals(res.valid, false);
});
