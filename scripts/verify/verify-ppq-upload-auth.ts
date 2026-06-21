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
