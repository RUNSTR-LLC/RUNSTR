/**
 * Verify getCharityByLightningAddress logic works correctly
 * (Standalone - avoids require() for images in Node)
 */

interface Charity {
  id: string;
  name: string;
  lightningAddress?: string;
}

// Subset of CHARITIES for testing (matches src/constants/charities.ts)
const CHARITIES: Charity[] = [
  { id: 'ppq-ai', name: 'PPQ.AI' },
  { id: 'als-foundation', name: 'ALS Network', lightningAddress: 'RunningBTC@primal.net' },
  { id: 'ashigaru', name: 'Ashigaru', lightningAddress: 'ashigarufund@geyser.fund' },
  { id: 'bitcoin-bay', name: 'Bitcoin Bay', lightningAddress: 'sats@donate.bitcoinbay.foundation' },
  { id: 'bitcoin-ekasi', name: 'Bitcoin Ekasi', lightningAddress: 'bitcoinekasi@primal.net' },
  { id: 'human-rights-foundation', name: 'Human Rights Foundation', lightningAddress: 'nostr@btcpay.hrf.org' },
  { id: 'runstr', name: 'RUNSTR', lightningAddress: 'thewildhustle@strike.me' },
];

// Same implementation as in charities.ts
const getCharityByLightningAddress = (address?: string): Charity | undefined => {
  if (!address) return undefined;
  return CHARITIES.find(
    (c) => c.lightningAddress && c.lightningAddress.toLowerCase() === address.toLowerCase()
  );
};

function assert(condition: boolean, msg: string) {
  console.log(condition ? `PASS: ${msg}` : `FAIL: ${msg}`);
  if (!condition) process.exitCode = 1;
}

// Test 1: Known charity - ALS Foundation
const als = getCharityByLightningAddress('RunningBTC@primal.net');
assert(als?.id === 'als-foundation', 'RunningBTC@primal.net -> ALS Foundation');
assert(als?.name === 'ALS Network', 'ALS Foundation name correct');

// Test 2: Known charity - Ashigaru
const ashigaru = getCharityByLightningAddress('ashigarufund@geyser.fund');
assert(ashigaru?.id === 'ashigaru', 'ashigarufund@geyser.fund -> Ashigaru');

// Test 3: Unknown address returns undefined
const unknown = getCharityByLightningAddress('random@wallet.com');
assert(unknown === undefined, 'random@wallet.com -> undefined');

// Test 4: Case-insensitive match
const alsLower = getCharityByLightningAddress('runningbtc@primal.net');
assert(alsLower?.id === 'als-foundation', 'case-insensitive: runningbtc@primal.net -> ALS Foundation');

// Test 5: Undefined/empty input
assert(getCharityByLightningAddress(undefined) === undefined, 'undefined -> undefined');
assert(getCharityByLightningAddress('') === undefined, 'empty string -> undefined');

// Test 6: PPQ.AI has no lightning address - should not match anything
const ppq = getCharityByLightningAddress('ppq-ai');
assert(ppq === undefined, 'ppq-ai (no lightning address) -> undefined');

// Test 7: All charities with lightning addresses are findable
const testAddresses = [
  { address: 'RunningBTC@primal.net', expectedId: 'als-foundation' },
  { address: 'ashigarufund@geyser.fund', expectedId: 'ashigaru' },
  { address: 'sats@donate.bitcoinbay.foundation', expectedId: 'bitcoin-bay' },
  { address: 'bitcoinekasi@primal.net', expectedId: 'bitcoin-ekasi' },
  { address: 'nostr@btcpay.hrf.org', expectedId: 'human-rights-foundation' },
  { address: 'thewildhustle@strike.me', expectedId: 'runstr' },
];

for (const { address, expectedId } of testAddresses) {
  const result = getCharityByLightningAddress(address);
  assert(result?.id === expectedId, `${address} -> ${expectedId}`);
}

console.log('\nDone.');
