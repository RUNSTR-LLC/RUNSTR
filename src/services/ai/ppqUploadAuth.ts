/**
 * Builds a NIP-98 (kind 27235) HTTP-auth event for uploading the PPQ.AI key.
 * The user's nsec never leaves the device — only the signed event is sent.
 *
 * Base64 encoding: uses a React Native-safe btoa polyfill (no Buffer dependency)
 * because Buffer is not reliably available in the RN runtime. The polyfill
 * produces standard base64 (same alphabet as Buffer.toString('base64')), which
 * is what the server decodes with atob(). The tsx verify script runs in Node
 * where Buffer IS available, so it uses Buffer to decode — both produce the
 * same standard base64 output.
 */
import { NDKEvent, type NDKSigner } from '@nostr-dev-kit/ndk';

// React Native-safe standard base64 encoder (no Buffer required).
// Produces the same output as Buffer.from(str).toString('base64').
// Uses index-based triplet loop to avoid the off-by-one padding bug present
// in some while-loop variants.
function toBase64(str: string): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = (i + 1) < str.length ? str.charCodeAt(i + 1) : 0;
    const c = (i + 2) < str.length ? str.charCodeAt(i + 2) : 0;
    const triplet = (a << 16) | (b << 8) | c;
    result += chars[(triplet >> 18) & 63];
    result += chars[(triplet >> 12) & 63];
    result += (i + 1) < str.length ? chars[(triplet >> 6) & 63] : '=';
    result += (i + 2) < str.length ? chars[triplet & 63] : '=';
  }
  return result;
}

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
  const header = `Nostr ${toBase64(JSON.stringify(raw))}`;
  return { header };
}
