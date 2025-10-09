#!/usr/bin/env ts-node
/**
 * Simple Nostr Wallet Finder
 * Queries Nostr relays for NIP-60 wallet events
 * Run with: npm run find:wallet
 */

import { nip19, SimplePool, Filter } from 'nostr-tools';

// Hardcoded npub for testing
const TEST_NPUB = 'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum';

// Nostr relays
const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

// NIP-60/61 event kinds
const WALLET_INFO_KIND = 37375;
const TOKEN_EVENT_KIND = 7375;
const NUTZAP_KIND = 9321;

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color?: keyof typeof COLORS) {
  const colorCode = color ? COLORS[color] : '';
  console.log(`${colorCode}${message}${COLORS.reset}`);
}

async function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('🔍 Nostr NIP-60 Wallet Finder', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  // Convert npub to hex
  let hexPubkey: string;
  try {
    const decoded = nip19.decode(TEST_NPUB);
    if (decoded.type !== 'npub') {
      throw new Error('Invalid npub');
    }
    hexPubkey = decoded.data;

    log(`Input npub: ${TEST_NPUB}`, 'cyan');
    log(`Hex pubkey: ${hexPubkey}`, 'cyan');
    log(`Short: ${hexPubkey.slice(0, 16)}...${hexPubkey.slice(-8)}\n`, 'cyan');
  } catch (error) {
    log(`❌ Failed to decode npub: ${error}`, 'red');
    process.exit(1);
  }

  // Create simple pool
  const pool = new SimplePool();

  log('🌐 Connecting to Nostr relays...', 'blue');
  RELAYS.forEach(relay => log(`   ${relay}`, 'blue'));
  log('');

  try {
    // Query for wallet info events (kind 37375)
    log('📋 Querying kind 37375 (Wallet Info Events)...', 'yellow');
    const walletFilter: Filter = {
      kinds: [WALLET_INFO_KIND],
      authors: [hexPubkey],
      limit: 50,
    };

    const walletEvents = await pool.querySync(RELAYS, walletFilter);

    if (walletEvents.length === 0) {
      log('   ❌ No wallet info events found', 'red');
    } else {
      log(`   ✅ Found ${walletEvents.length} wallet info event(s)\n`, 'green');

      walletEvents.forEach((event, idx) => {
        try {
          const content = JSON.parse(event.content);
          log(`   Wallet Event #${idx + 1}:`, 'bright');
          log(`     ID: ${event.id.slice(0, 16)}...`);
          log(`     Balance: ${content.balance || 0} sats`, content.balance > 0 ? 'green' : 'yellow');
          log(`     Mint: ${content.mints?.[0] || 'unknown'}`);
          log(`     Name: ${content.name || 'N/A'}`);
          log(`     Unit: ${content.unit || 'sat'}`);
          log(`     Created: ${new Date(event.created_at * 1000).toLocaleString()}`);

          const dTag = event.tags.find(t => t[0] === 'd');
          if (dTag) {
            log(`     d-tag: ${dTag[1]}`);
          }
          log('');
        } catch (err) {
          log(`     ⚠️  Could not parse event content`, 'yellow');
        }
      });
    }

    // Query for token events (kind 7375)
    log('🔐 Querying kind 7375 (Token Events / Encrypted Proofs)...', 'yellow');
    const tokenFilter: Filter = {
      kinds: [TOKEN_EVENT_KIND],
      authors: [hexPubkey],
      limit: 50,
    };

    const tokenEvents = await pool.querySync(RELAYS, tokenFilter);

    if (tokenEvents.length === 0) {
      log('   ❌ No token events found', 'red');
    } else {
      log(`   ✅ Found ${tokenEvents.length} token event(s)\n`, 'green');

      let totalBalance = 0;
      tokenEvents.forEach((event, idx) => {
        const balanceTag = event.tags.find(t => t[0] === 'balance');
        const mintTag = event.tags.find(t => t[0] === 'mint');
        const proofCountTag = event.tags.find(t => t[0] === 'proof_count');
        const dTag = event.tags.find(t => t[0] === 'd');

        const balance = balanceTag ? parseInt(balanceTag[1]) : 0;
        totalBalance += balance;

        log(`   Token Event #${idx + 1}:`, 'bright');
        log(`     ID: ${event.id.slice(0, 16)}...`);
        log(`     Balance: ${balance.toLocaleString()} sats`, balance > 0 ? 'green' : 'yellow');
        log(`     Proofs: ${proofCountTag?.[1] || 'unknown'}`);
        log(`     Mint: ${mintTag?.[1] || 'unknown'}`);
        log(`     d-tag: ${dTag?.[1] || 'N/A'}`);
        log(`     Created: ${new Date(event.created_at * 1000).toLocaleString()}`);
        log(`     Content: [encrypted - ${event.content.length} chars]`, 'blue');
        log('');
      });

      if (totalBalance > 0) {
        log(`   💰 Total balance in token events: ${totalBalance.toLocaleString()} sats\n`, 'bright');
      }
    }

    // Query for nutzap events (kind 9321)
    log('⚡ Querying kind 9321 (Nutzap Events)...', 'yellow');
    const nutzapFilter: Filter = {
      kinds: [NUTZAP_KIND],
      '#p': [hexPubkey],
      limit: 20,
    };

    const nutzapEvents = await pool.querySync(RELAYS, nutzapFilter);

    if (nutzapEvents.length === 0) {
      log('   ❌ No nutzap events found', 'red');
    } else {
      log(`   ✅ Found ${nutzapEvents.length} nutzap event(s)\n`, 'green');

      nutzapEvents.slice(0, 5).forEach((event, idx) => {
        const amountTag = event.tags.find(t => t[0] === 'amount');
        const proofTag = event.tags.find(t => t[0] === 'proof');

        log(`   Nutzap #${idx + 1}:`, 'bright');
        log(`     From: ${event.pubkey.slice(0, 16)}...`);
        log(`     Amount: ${amountTag?.[1] || '?'} sats`);
        log(`     Memo: ${event.content || '(none)'}`);
        log(`     Has proof: ${proofTag ? 'Yes' : 'No'}`);
        log(`     Created: ${new Date(event.created_at * 1000).toLocaleString()}`);
        log('');
      });

      if (nutzapEvents.length > 5) {
        log(`   ... and ${nutzapEvents.length - 5} more nutzaps\n`, 'blue');
      }
    }

    // Final analysis
    log('='.repeat(60), 'bright');
    log('📊 Analysis', 'bright');
    log('='.repeat(60) + '\n', 'bright');

    const hasWalletInfo = walletEvents.length > 0;
    const hasTokenEvents = tokenEvents.length > 0;
    const hasNutzaps = nutzapEvents.length > 0;

    if (hasWalletInfo || hasTokenEvents) {
      log('⚠️  WALLET EXISTS ON NOSTR!', 'red');
      log('⚠️  DO NOT CREATE NEW WALLET!', 'red');
      log('');
      log('✅ Recommendation: Restore this wallet during initialization', 'green');

      if (hasTokenEvents) {
        log('✅ Token events contain encrypted proofs that can be restored', 'green');
      }

      if (hasNutzaps) {
        log(`✅ Found ${nutzapEvents.length} unclaimed nutzaps`, 'green');
      }
    } else {
      log('ℹ️  No wallet events found on Nostr', 'yellow');
      log('ℹ️  Safe to create new wallet', 'yellow');
    }

    log('\n' + '='.repeat(60) + '\n', 'bright');

  } catch (error) {
    log(`\n❌ Query failed: ${error}`, 'red');
    process.exit(1);
  } finally {
    pool.close(RELAYS);
  }
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
