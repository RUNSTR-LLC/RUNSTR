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
  if (typeof event.id !== 'string' || event.id !== computedId) return { valid: false, reason: 'event id mismatch' };

  let sigOk = false;
  try {
    sigOk = await secp.schnorr.verify(event.sig, computedId, event.pubkey);
  } catch {
    sigOk = false;
  }
  if (!sigOk) return { valid: false, reason: 'invalid signature' };

  return { valid: true };
}
