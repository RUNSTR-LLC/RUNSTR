/**
 * Wallet State Diagnostic Script - Nostr Events Only
 *
 * Checks ONLY Nostr events (no React Native dependencies)
 * Shows what wallets exist on Nostr for the user
 *
 * Usage: npx tsx scripts/diagnose-wallet-nostr-only.ts <npub_or_hex>
 */

import { nip19 } from 'nostr-tools';
import NDK, { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n');
  log('═'.repeat(80), 'cyan');
  log(`  ${title}`, 'bright');
  log('═'.repeat(80), 'cyan');
}

function subsection(title: string) {
  console.log('');
  log(`─── ${title} ${'─'.repeat(70 - title.length)}`, 'blue');
}

async function main() {
  const userInput = process.argv[2];

  if (!userInput) {
    log('❌ Error: Please provide npub or hex pubkey', 'red');
    log('Usage: npx tsx scripts/diagnose-wallet-nostr-only.ts <npub_or_hex>', 'yellow');
    process.exit(1);
  }

  // Convert to hex if npub
  let hexPubkey: string;
  try {
    if (userInput.startsWith('npub')) {
      const decoded = nip19.decode(userInput);
      hexPubkey = decoded.data as string;
    } else {
      hexPubkey = userInput;
    }
  } catch (error) {
    log('❌ Error: Invalid npub/hex format', 'red');
    process.exit(1);
  }

  log(`🔍 Diagnosing wallet state for user`, 'bright');
  log(`Pubkey (hex): ${hexPubkey}`, 'cyan');
  log(`Pubkey (npub): ${nip19.npubEncode(hexPubkey)}`, 'cyan');

  try {
    // ============================================================
    // 1. CONNECT TO NOSTR
    // ============================================================
    section('1. CONNECTING TO NOSTR RELAYS');

    const relays = [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.nostr.band',
    ];

    log('Relays:', 'yellow');
    relays.forEach(r => log(`  • ${r}`, 'cyan'));

    const ndk = new NDK({
      explicitRelayUrls: relays,
    });

    log('\nConnecting...', 'yellow');
    await ndk.connect();
    log('✅ Connected to Nostr', 'green');

    // ============================================================
    // 2. QUERY ALL WALLET EVENTS
    // ============================================================
    section('2. NOSTR WALLET EVENTS (kind 37375)');

    log('Querying for ALL kind 37375 wallet events...', 'yellow');
    const allWalletEvents = await ndk.fetchEvents({
      kinds: [37375 as NDKKind],
      authors: [hexPubkey],
      limit: 50,
    });

    if (allWalletEvents.size === 0) {
      log('❌ NO WALLET EVENTS FOUND ON NOSTR', 'red');
      log('\nThis means either:', 'yellow');
      log('  • No wallets have been created yet', 'yellow');
      log('  • Wallet creation failed to publish to Nostr', 'yellow');
      log('  • Relays did not receive/store the events', 'yellow');
      log('\nNext steps:', 'cyan');
      log('  1. Check app logs during "Create Wallet" button click', 'cyan');
      log('  2. Verify WalletSync.publishWalletInfo() is called', 'cyan');
      log('  3. Look for Nostr publishing errors in Metro logs', 'cyan');
    } else {
      log(`✅ Found ${allWalletEvents.size} wallet event(s)`, 'green');
      console.log('');

      const events = Array.from(allWalletEvents);

      // Sort by creation date (newest first)
      events.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

      events.forEach((event, index) => {
        subsection(`Wallet Event #${index + 1}`);

        const dTag = event.tags.find(t => t[0] === 'd')?.[1] || '(no d-tag)';
        const name = event.tags.find(t => t[0] === 'name')?.[1] || '(no name)';
        const mint = event.tags.find(t => t[0] === 'mint')?.[1] || '(no mint)';
        const balance = event.tags.find(t => t[0] === 'balance')?.[1] || '0';
        const unit = event.tags.find(t => t[0] === 'unit')?.[1] || 'sat';

        log(`Event ID: ${event.id}`, 'cyan');
        log(`d-tag: ${dTag}`, dTag === 'runstr-primary-wallet' ? 'green' : 'yellow');
        log(`Name: ${name}`, 'cyan');
        log(`Mint: ${mint}`, 'cyan');
        log(`Balance: ${balance} ${unit}`, 'cyan');
        log(`Created: ${new Date(event.created_at! * 1000).toLocaleString()}`, 'cyan');

        if (dTag === 'runstr-primary-wallet') {
          log('✅ THIS IS THE RUNSTR PRIMARY WALLET', 'green');
        } else {
          log('⚠️  This wallet has a different d-tag (not the primary)', 'yellow');
        }
      });
    }

    // ============================================================
    // 3. CHECK FOR TOKEN EVENTS (kind 7375)
    // ============================================================
    section('3. TOKEN EVENTS (kind 7375) - Encrypted Proofs');

    log('Querying for kind 7375 token events...', 'yellow');
    const tokenEvents = await ndk.fetchEvents({
      kinds: [7375 as NDKKind],
      authors: [hexPubkey],
      limit: 20,
    });

    if (tokenEvents.size === 0) {
      log('ℹ️  No token events found (wallet might be empty)', 'yellow');
    } else {
      log(`✅ Found ${tokenEvents.size} token event(s)`, 'green');
      const events = Array.from(tokenEvents).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

      events.slice(0, 5).forEach((event, index) => {
        const mintTag = event.tags.find(t => t[0] === 'mint')?.[1] || '(no mint)';
        log(`  ${index + 1}. ${new Date(event.created_at! * 1000).toLocaleString()} - Mint: ${mintTag}`, 'cyan');
      });

      if (events.length > 5) {
        log(`  ... and ${events.length - 5} more`, 'cyan');
      }
    }

    // ============================================================
    // 4. CHECK FOR NUTZAP EVENTS (kind 9321)
    // ============================================================
    section('4. NUTZAP EVENTS (kind 9321) - Incoming Zaps');

    log('Querying for kind 9321 nutzap events (incoming)...', 'yellow');
    const nutzapEvents = await ndk.fetchEvents({
      kinds: [9321 as NDKKind],
      '#p': [hexPubkey],
      limit: 20,
    });

    if (nutzapEvents.size === 0) {
      log('ℹ️  No incoming nutzaps found', 'yellow');
    } else {
      log(`✅ Found ${nutzapEvents.size} nutzap event(s)`, 'green');

      // Calculate total unclaimed amount
      let totalAmount = 0;
      const events = Array.from(nutzapEvents);

      events.forEach((event) => {
        const amountTag = event.tags.find(t => t[0] === 'amount')?.[1];
        if (amountTag) {
          totalAmount += parseInt(amountTag);
        }
      });

      log(`Total amount in nutzaps: ${totalAmount} sats`, 'green');

      events.slice(0, 5).forEach((event, index) => {
        const amountTag = event.tags.find(t => t[0] === 'amount')?.[1] || '0';
        const fromTag = event.tags.find(t => t[0] === 'from')?.[1] || 'unknown';
        log(`  ${index + 1}. ${amountTag} sats from ${fromTag.slice(0, 12)}...`, 'cyan');
      });

      if (events.length > 5) {
        log(`  ... and ${events.length - 5} more`, 'cyan');
      }
    }

    // ============================================================
    // 5. DIAGNOSIS SUMMARY
    // ============================================================
    section('5. DIAGNOSIS SUMMARY');

    const hasWalletEvents = allWalletEvents.size > 0;
    const hasRunstrWallet = Array.from(allWalletEvents).some(e =>
      e.tags.find(t => t[0] === 'd')?.[1] === 'runstr-primary-wallet'
    );
    const hasTokenEvents = tokenEvents.size > 0;
    const hasNutzaps = nutzapEvents.size > 0;

    console.log('');
    log('Current State on Nostr:', 'bright');
    log(`  Wallet events (kind 37375): ${hasWalletEvents ? '✅' : '❌'}`, hasWalletEvents ? 'green' : 'red');
    log(`  RUNSTR primary wallet: ${hasRunstrWallet ? '✅' : '❌'}`, hasRunstrWallet ? 'green' : 'red');
    log(`  Token events (kind 7375): ${hasTokenEvents ? '✅' : 'ℹ️ '}`, hasTokenEvents ? 'green' : 'yellow');
    log(`  Incoming nutzaps (kind 9321): ${hasNutzaps ? '✅' : 'ℹ️ '}`, hasNutzaps ? 'green' : 'yellow');

    console.log('');
    log('Diagnosis:', 'bright');

    if (!hasWalletEvents) {
      log('❌ ROOT CAUSE: No wallet events found on Nostr', 'red');
      log('', 'reset');
      log('   This means wallet creation is FAILING to publish to Nostr.', 'yellow');
      log('   The "Create Wallet" button may be creating a local wallet', 'yellow');
      log('   but NOT publishing the kind 37375 event.', 'yellow');
      log('', 'reset');
      log('   SOLUTION:', 'cyan');
      log('   1. Check Metro logs when clicking "Create Wallet"', 'cyan');
      log('   2. Look for WalletSync.publishWalletInfo() calls', 'cyan');
      log('   3. Verify no errors during Nostr event signing/publishing', 'cyan');
      log('   4. Check if UnifiedSigningService can sign events', 'cyan');
    } else if (!hasRunstrWallet) {
      log('⚠️  PARTIAL ISSUE: Wallets exist but wrong d-tag', 'yellow');
      log('', 'reset');
      log('   Your wallet events do NOT have the "runstr-primary-wallet" d-tag.', 'yellow');
      log('   This means older wallets were created before we added deterministic d-tags.', 'yellow');
      log('', 'reset');
      log('   SOLUTION:', 'cyan');
      log('   1. User needs to create a NEW wallet via Settings button', 'cyan');
      log('   2. New wallet will have correct "runstr-primary-wallet" d-tag', 'cyan');
      log('   3. App will then detect and use this wallet consistently', 'cyan');
    } else {
      log('✅ RUNSTR wallet exists on Nostr with correct d-tag!', 'green');
      log('', 'reset');
      log('   Wallet detection should work. If you still see errors:', 'cyan');
      log('   1. Check that nutzapService.initialize() is being called', 'cyan');
      log('   2. Verify wallet store is initializing on app startup', 'cyan');
      log('   3. Check Metro logs for initialization errors', 'cyan');
    }

    console.log('');
    log('═'.repeat(80), 'cyan');
    log('Diagnostic complete!', 'bright');
    log('═'.repeat(80), 'cyan');

  } catch (error) {
    console.error('\n');
    log('❌ Diagnostic error:', 'red');
    console.error(error);
  }

  process.exit(0);
}

main();
