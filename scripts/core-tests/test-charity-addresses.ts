/**
 * Test: Charity Lightning Address Audit
 * Run: npx tsx scripts/core-tests/test-charity-addresses.ts
 *
 * Imports the charity list from src/constants/charities.ts (without React Native
 * image require()), extracts every Lightning address, and probes each one via
 * LNURL to verify it resolves. Reports working vs dead addresses.
 *
 * CRITICAL for the charity audit — ensures every destination can actually receive
 * rewards before they are routed there.
 */

// ---------------------------------------------------------------------------
// Charity data (mirrored from src/constants/charities.ts, minus require() calls)
// ---------------------------------------------------------------------------

interface Charity {
  id: string;
  name: string;
  lightningAddress?: string;
  category: 'charity' | 'project' | 'service';
}

const CHARITIES: Charity[] = [
  { id: 'ppq-ai', name: 'PPQ.AI', category: 'service' },
  { id: 'als-foundation', name: 'ALS Network', lightningAddress: 'RunningBTC@primal.net', category: 'charity' },
  { id: 'bitcoin-bay', name: 'Bitcoin Bay', lightningAddress: 'sats@donate.bitcoinbay.foundation', category: 'project' },
  { id: 'bitcoin-ekasi', name: 'Bitcoin Ekasi', lightningAddress: 'bitcoinekasi@primal.net', category: 'project' },
  { id: 'bitcoin-isla', name: 'Bitcoin Isla', lightningAddress: 'BTCIsla@primal.net', category: 'project' },
  { id: 'bitcoin-district', name: 'Bitcoin District', lightningAddress: 'bdi@strike.me', category: 'project' },
  { id: 'bitcoin-yucatan', name: 'Bitcoin Yucatan', lightningAddress: 'bitcoinyucatancommunity@geyser.fund', category: 'project' },
  { id: 'bitcoin-veterans', name: 'Bitcoin Veterans', lightningAddress: 'opbitcoin@strike.me', category: 'project' },
  { id: 'bitcoin-makueni', name: 'Bitcoin Makueni', lightningAddress: 'rosechicken19@primal.net', category: 'project' },
  { id: 'bitcoin-house-bali', name: 'Bitcoin House Bali', lightningAddress: 'btchousebali@walletofsatoshi.com', category: 'project' },
  { id: 'human-rights-foundation', name: 'Human Rights Foundation', lightningAddress: 'nostr@btcpay.hrf.org', category: 'charity' },
  { id: 'lightning-news', name: 'Lightning News', lightningAddress: 'lightningnews@puresignal.news', category: 'project' },
  { id: 'runstr', name: 'RUNSTR', lightningAddress: 'thewildhustle@strike.me', category: 'project' },
  { id: 'afribit-kibera', name: 'Afribit Kibera', lightningAddress: 'afribit@blink.sv', category: 'project' },
  { id: 'bitcoin-basin', name: 'Bitcoin Basin', lightningAddress: 'plasticbowl87@walletofsatoshi.com', category: 'project' },
  { id: 'buho-go', name: 'BuhoGO', lightningAddress: 'buho@lnbits.de', category: 'project' },
  { id: 'central-pennsylvania-bitcoiners', name: 'Central Pennsylvania Bitcoiners', lightningAddress: 'businesscat@getalby.com', category: 'project' },
];

// ---------------------------------------------------------------------------
// LNURL probe
// ---------------------------------------------------------------------------

/**
 * Resolve a Lightning address to its LNURL endpoint and check if it responds
 * with a valid LNURL-pay callback.
 *
 * Lightning address format: user@domain → GET https://domain/.well-known/lnurlp/user
 */
async function probeLightningAddress(
  address: string
): Promise<{ ok: boolean; detail: string }> {
  const parts = address.split('@');
  if (parts.length !== 2) {
    return { ok: false, detail: 'Invalid format (expected user@domain)' };
  }

  const [user, domain] = parts;
  const url = `https://${domain}/.well-known/lnurlp/${user.toLowerCase()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { ok: false, detail: `HTTP ${response.status} from ${url}` };
    }

    const body = await response.json();

    // A valid LNURL-pay response must have a "callback" field
    if (body.callback) {
      const minSendable = body.minSendable ? `minSendable=${body.minSendable}` : '';
      const maxSendable = body.maxSendable ? `maxSendable=${body.maxSendable}` : '';
      return { ok: true, detail: `Valid LNURL-pay. ${minSendable} ${maxSendable}`.trim() };
    }

    // Some services return status=ERROR
    if (body.status === 'ERROR') {
      return { ok: false, detail: `LNURL error: ${body.reason || 'unknown'}` };
    }

    return { ok: false, detail: `Response missing "callback" field: ${JSON.stringify(body).slice(0, 120)}` };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { ok: false, detail: 'Timeout after 10s' };
    }
    return { ok: false, detail: `Network error: ${err.message}` };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n=== Charity Lightning Address Audit ===\n');

  const withAddress = CHARITIES.filter((c) => c.lightningAddress);
  const withoutAddress = CHARITIES.filter((c) => !c.lightningAddress);

  console.log(`Total charities: ${CHARITIES.length}`);
  console.log(`With Lightning address: ${withAddress.length}`);
  console.log(`Without Lightning address: ${withoutAddress.length}`);

  if (withoutAddress.length > 0) {
    console.log('\nCharities WITHOUT Lightning address (expected for special types):');
    for (const c of withoutAddress) {
      console.log(`  - ${c.name} [${c.id}] (category: ${c.category})`);
    }
  }

  console.log('\n--- Probing Lightning addresses ---\n');

  let passed = 0;
  let failed = 0;

  for (const charity of withAddress) {
    const address = charity.lightningAddress!;
    const result = await probeLightningAddress(address);

    if (result.ok) {
      console.log(`  PASS: ${charity.name} (${address})`);
      console.log(`        ${result.detail}`);
      passed++;
    } else {
      console.log(`  FAIL: ${charity.name} (${address})`);
      console.log(`        ${result.detail}`);
      failed++;
    }
  }

  console.log(`\n=== Results: ${passed} working, ${failed} dead out of ${withAddress.length} addresses ===`);

  if (failed > 0) {
    console.log('\nACTION REQUIRED: Dead addresses mean rewards sent to these charities will be lost.');
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
