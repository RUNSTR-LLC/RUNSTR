/**
 * Test: Auth / Identity Generation Flow
 * Run: npx tsx scripts/core-tests/test-auth-flow.ts
 *
 * Tests the signup flow by:
 * 1. Generating a new Nostr identity using the same crypto path as the app
 * 2. Verifying nsec/npub/hex key derivations are consistent
 * 3. Verifying key round-tripping (encode -> decode -> re-encode)
 * 4. Checking source files for correct patterns (NDK, not nostr-tools for signing)
 *
 * Uses nostr-tools directly (same as src/utils/nostr.ts generateNostrKeyPair)
 * since this runs in Node where crypto.getRandomValues is available natively.
 */

import { nip19, getPublicKey } from 'nostr-tools';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' -- ' + detail : ''}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Key generation (mirrors src/utils/nostr.ts generateNostrKeyPair)
// ---------------------------------------------------------------------------

interface NostrKeyPair {
  nsec: string;
  npub: string;
  privateKeyHex: string;
  publicKeyHex: string;
}

function generateNostrKeyPair(): NostrKeyPair {
  const privateKeyBytes = crypto.getRandomValues(new Uint8Array(32));
  const privateKeyHex = Array.from(privateKeyBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const publicKeyHex = getPublicKey(privateKeyBytes);
  const nsec = nip19.nsecEncode(privateKeyBytes);
  const npub = nip19.npubEncode(publicKeyHex);

  return { nsec, npub, privateKeyHex, publicKeyHex };
}

// ---------------------------------------------------------------------------
// Test 1: Key generation produces valid keys
// ---------------------------------------------------------------------------

function testKeyGeneration() {
  console.log('\n=== Key generation ===\n');

  const keys = generateNostrKeyPair();

  assert('nsec starts with nsec1', keys.nsec.startsWith('nsec1'));
  assert('npub starts with npub1', keys.npub.startsWith('npub1'));
  assert('privateKeyHex is 64 chars', keys.privateKeyHex.length === 64);
  assert('publicKeyHex is 64 chars', keys.publicKeyHex.length === 64);
  assert('privateKeyHex is valid hex', /^[0-9a-f]{64}$/.test(keys.privateKeyHex));
  assert('publicKeyHex is valid hex', /^[0-9a-f]{64}$/.test(keys.publicKeyHex));
  assert('nsec is not empty', keys.nsec.length > 10);
  assert('npub is not empty', keys.npub.length > 10);
  assert('private != public', keys.privateKeyHex !== keys.publicKeyHex);
}

// ---------------------------------------------------------------------------
// Test 2: Key round-tripping (encode -> decode -> verify)
// ---------------------------------------------------------------------------

function testKeyRoundTrip() {
  console.log('\n=== Key round-trip encoding ===\n');

  const keys = generateNostrKeyPair();

  // Decode nsec back to bytes
  const decodedNsec = nip19.decode(keys.nsec);
  assert('nsec decodes as type "nsec"', decodedNsec.type === 'nsec');
  assert(
    'nsec decoded data is Uint8Array(32)',
    decodedNsec.data instanceof Uint8Array && decodedNsec.data.length === 32
  );

  // Re-derive public key from decoded private key
  const reDerivedPubkey = getPublicKey(decodedNsec.data as Uint8Array);
  assert('Re-derived pubkey matches original', reDerivedPubkey === keys.publicKeyHex);

  // Decode npub back
  const decodedNpub = nip19.decode(keys.npub);
  assert('npub decodes as type "npub"', decodedNpub.type === 'npub');
  assert('npub decoded data matches publicKeyHex', decodedNpub.data === keys.publicKeyHex);

  // Re-encode and verify
  const reEncodedNsec = nip19.nsecEncode(decodedNsec.data as Uint8Array);
  assert('Re-encoded nsec matches original', reEncodedNsec === keys.nsec);

  const reEncodedNpub = nip19.npubEncode(decodedNpub.data as string);
  assert('Re-encoded npub matches original', reEncodedNpub === keys.npub);
}

// ---------------------------------------------------------------------------
// Test 3: Multiple key generations produce unique keys
// ---------------------------------------------------------------------------

function testKeyUniqueness() {
  console.log('\n=== Key uniqueness ===\n');

  const keys1 = generateNostrKeyPair();
  const keys2 = generateNostrKeyPair();
  const keys3 = generateNostrKeyPair();

  assert('Key pair 1 != Key pair 2 (private)', keys1.privateKeyHex !== keys2.privateKeyHex);
  assert('Key pair 2 != Key pair 3 (private)', keys2.privateKeyHex !== keys3.privateKeyHex);
  assert('Key pair 1 != Key pair 3 (private)', keys1.privateKeyHex !== keys3.privateKeyHex);

  assert('Key pair 1 != Key pair 2 (public)', keys1.publicKeyHex !== keys2.publicKeyHex);
  assert('Key pair 2 != Key pair 3 (public)', keys2.publicKeyHex !== keys3.publicKeyHex);
}

// ---------------------------------------------------------------------------
// Test 4: nsec validation (mirrors src/utils/nostr.ts validateNsec)
// ---------------------------------------------------------------------------

function testNsecValidation() {
  console.log('\n=== nsec validation ===\n');

  function validateNsec(nsec: string): boolean {
    try {
      if (!nsec.startsWith('nsec1')) return false;
      const decoded = nip19.decode(nsec);
      return (
        decoded.type === 'nsec' &&
        decoded.data instanceof Uint8Array &&
        decoded.data.length === 32
      );
    } catch {
      return false;
    }
  }

  const validKeys = generateNostrKeyPair();

  assert('Valid nsec passes validation', validateNsec(validKeys.nsec));
  assert('Random string fails validation', !validateNsec('randomstring'));
  assert('npub fails nsec validation', !validateNsec(validKeys.npub));
  assert('Empty string fails validation', !validateNsec(''));
  assert('nsec1 prefix only fails', !validateNsec('nsec1'));
  assert('Truncated nsec fails', !validateNsec(validKeys.nsec.slice(0, 20)));
}

// ---------------------------------------------------------------------------
// Test 5: Source code checks
// ---------------------------------------------------------------------------

function testSourceCodePatterns() {
  console.log('\n=== Source code pattern checks ===\n');

  const srcRoot = path.join(__dirname, '../../src');

  // Check nostrAuthProvider uses NDKPrivateKeySigner.generate()
  const authProvider = fs.readFileSync(
    path.join(srcRoot, 'services/auth/providers/nostrAuthProvider.ts'),
    'utf8'
  );

  assert(
    'nostrAuthProvider uses NDKPrivateKeySigner.generate()',
    authProvider.includes('NDKPrivateKeySigner.generate()')
  );

  assert(
    'nostrAuthProvider does NOT use nostr-tools generateSecretKey',
    !authProvider.includes('generateSecretKey')
  );

  // Check storage keys are consistent
  const nostrUtils = fs.readFileSync(path.join(srcRoot, 'utils/nostr.ts'), 'utf8');

  assert(
    'nostr.ts defines NPUB key as @runstr:npub',
    nostrUtils.includes("NPUB: '@runstr:npub'")
  );

  assert(
    'nostr.ts defines HEX_PUBKEY as @runstr:hex_pubkey',
    nostrUtils.includes("HEX_PUBKEY: '@runstr:hex_pubkey'")
  );

  assert(
    'nostr.ts defines NSEC_ENCRYPTED key',
    nostrUtils.includes("NSEC_ENCRYPTED: '@runstr:nsec_encrypted'")
  );

  // Check that generateNostrKeyPair uses secure RNG
  assert(
    'generateNostrKeyPair uses getRandomValues',
    nostrUtils.includes('getRandomValues')
  );

  assert(
    'generateNostrKeyPair does NOT use Math.random',
    !nostrUtils.includes('Math.random')
  );

  // Check auth flow stores correct keys
  assert(
    'Auth provider stores hex_pubkey',
    authProvider.includes('@runstr:hex_pubkey')
  );

  assert(
    'Auth provider stores npub',
    authProvider.includes('@runstr:npub')
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('\n=== Auth / Identity Flow Tests ===');

  testKeyGeneration();
  testKeyRoundTrip();
  testKeyUniqueness();
  testNsecValidation();
  testSourceCodePatterns();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
