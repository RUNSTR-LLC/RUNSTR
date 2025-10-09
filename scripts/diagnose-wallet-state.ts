/**
 * Wallet State Diagnostic Script
 *
 * Checks:
 * 1. All kind 37375 wallet events on Nostr for user
 * 2. Local AsyncStorage wallet data
 * 3. WalletDetectionService functionality
 * 4. Full initialization flow
 *
 * Usage: npx ts-node scripts/diagnose-wallet-state.ts <npub_or_hex>
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { nip19 } from 'nostr-tools';
import { NDKKind } from '@nostr-dev-kit/ndk';

// Dynamic imports to avoid module resolution issues
const GlobalNDKService = (await import('../src/services/nostr/GlobalNDKService.js')).GlobalNDKService;
const WalletDetectionService = (await import('../src/services/nutzap/WalletDetectionService.js')).default;
const WalletCore = (await import('../src/services/nutzap/WalletCore.js')).default;
const nutzapService = (await import('../src/services/nutzap/nutzapService.js')).default;

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
    log('Usage: npx ts-node scripts/diagnose-wallet-state.ts <npub_or_hex>', 'yellow');
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
    // 1. CHECK NOSTR FOR WALLET EVENTS
    // ============================================================
    section('1. NOSTR WALLET EVENTS (kind 37375)');

    log('Connecting to Nostr relays...', 'yellow');
    const ndk = await GlobalNDKService.getInstance();
    const status = GlobalNDKService.getStatus();
    log(`✅ Connected to ${status.connectedRelays}/${status.relayCount} relays`, 'green');

    log('\nQuerying for ALL kind 37375 wallet events...', 'yellow');
    const allWalletEvents = await ndk.fetchEvents({
      kinds: [37375 as NDKKind],
      authors: [hexPubkey],
      limit: 50,
    });

    if (allWalletEvents.size === 0) {
      log('❌ NO WALLET EVENTS FOUND ON NOSTR', 'red');
      log('This means either:', 'yellow');
      log('  • No wallets have been created yet', 'yellow');
      log('  • Wallet creation failed to publish to Nostr', 'yellow');
      log('  • Relays did not receive/store the events', 'yellow');
    } else {
      log(`✅ Found ${allWalletEvents.size} wallet event(s)`, 'green');
      console.log('');

      const events = Array.from(allWalletEvents);
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
        }
      });
    }

    // ============================================================
    // 2. TEST WALLET DETECTION SERVICE
    // ============================================================
    section('2. WALLET DETECTION SERVICE');

    log('Testing WalletDetectionService.findRunstrWallet()...', 'yellow');
    const detection = await WalletDetectionService.findRunstrWallet(hexPubkey);

    if (detection.found && detection.walletInfo) {
      log('✅ RUNSTR WALLET DETECTED!', 'green');
      subsection('Wallet Info');
      log(`Event ID: ${detection.walletInfo.eventId}`, 'cyan');
      log(`Name: ${detection.walletInfo.name}`, 'cyan');
      log(`Balance: ${detection.walletInfo.balance} sats`, 'cyan');
      log(`Mint: ${detection.walletInfo.mint}`, 'cyan');
      log(`d-tag: ${detection.walletInfo.dTag}`, 'cyan');
      log(`Created: ${new Date(detection.walletInfo.createdAt * 1000).toLocaleString()}`, 'cyan');
    } else {
      log('❌ WALLET DETECTION FAILED', 'red');
      if (detection.error) {
        log(`Error: ${detection.error}`, 'red');
      } else {
        log('No RUNSTR wallet found with d-tag "runstr-primary-wallet"', 'yellow');
      }
    }

    // ============================================================
    // 3. CHECK LOCAL STORAGE
    // ============================================================
    section('3. LOCAL STORAGE (AsyncStorage)');

    subsection('Wallet-Related Keys');
    const walletKeys = [
      '@runstr:wallet_proofs',
      '@runstr:wallet_mint',
      '@runstr:wallet_pubkey',
      '@runstr:hex_pubkey',
      '@runstr:tx_history',
      '@runstr:last_sync',
    ];

    for (const key of walletKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        log(`✅ ${key}`, 'green');
        if (key === '@runstr:wallet_proofs') {
          try {
            const proofs = JSON.parse(value);
            const balance = proofs.reduce((sum: number, p: any) => sum + p.amount, 0);
            log(`   Proofs: ${proofs.length}, Balance: ${balance} sats`, 'cyan');
          } catch {
            log(`   Value: ${value.slice(0, 100)}...`, 'cyan');
          }
        } else if (key === '@runstr:tx_history') {
          try {
            const txs = JSON.parse(value);
            log(`   Transactions: ${txs.length}`, 'cyan');
          } catch {
            log(`   Value: ${value.slice(0, 100)}...`, 'cyan');
          }
        } else {
          log(`   Value: ${value}`, 'cyan');
        }
      } else {
        log(`❌ ${key} (empty)`, 'yellow');
      }
    }

    // Check for user-specific keys (with pubkey suffix)
    subsection('User-Specific Storage Keys');
    const userSpecificKeys = [
      `@runstr:wallet_proofs:${hexPubkey}`,
      `@runstr:wallet_mint:${hexPubkey}`,
      `@runstr:wallet_pubkey:${hexPubkey}`,
      `@runstr:tx_history:${hexPubkey}`,
    ];

    for (const key of userSpecificKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        log(`✅ ${key}`, 'green');
        if (key.includes('wallet_proofs')) {
          try {
            const proofs = JSON.parse(value);
            const balance = proofs.reduce((sum: number, p: any) => sum + p.amount, 0);
            log(`   Proofs: ${proofs.length}, Balance: ${balance} sats`, 'cyan');
          } catch {
            log(`   Value: ${value.slice(0, 100)}...`, 'cyan');
          }
        }
      } else {
        log(`❌ ${key} (empty)`, 'yellow');
      }
    }

    // ============================================================
    // 4. TEST WALLETCORE INITIALIZATION
    // ============================================================
    section('4. WALLETCORE INITIALIZATION TEST');

    log('Testing WalletCore.initialize()...', 'yellow');
    const walletState = await WalletCore.initialize(hexPubkey);

    subsection('WalletCore State');
    log(`Balance: ${walletState.balance} sats`, 'cyan');
    log(`Proofs: ${walletState.proofs.length}`, 'cyan');
    log(`Mint: ${walletState.mint}`, 'cyan');
    log(`Pubkey: ${walletState.pubkey}`, 'cyan');
    log(`Online: ${walletState.isOnline}`, 'cyan');

    if (walletState.balance > 0 || walletState.proofs.length > 0) {
      log('✅ WalletCore successfully initialized with wallet', 'green');
    } else {
      log('⚠️  WalletCore initialized but no wallet found', 'yellow');
    }

    // ============================================================
    // 5. TEST NUTZAP SERVICE STATE
    // ============================================================
    section('5. NUTZAP SERVICE STATE');

    log('Current nutzapService state:', 'yellow');
    // Access private field via type assertion (for diagnostic purposes)
    const serviceState = nutzapService as any;
    log(`isInitialized: ${serviceState.isInitialized || false}`, serviceState.isInitialized ? 'green' : 'red');
    log(`userPubkey: ${serviceState.userPubkey || '(not set)'}`, 'cyan');

    // Try to get balance
    try {
      const balance = await nutzapService.getBalance();
      log(`Balance (from service): ${balance} sats`, 'cyan');
    } catch (error) {
      log(`❌ Error getting balance: ${error}`, 'red');
    }

    // ============================================================
    // 6. SUMMARY & RECOMMENDATIONS
    // ============================================================
    section('6. DIAGNOSIS SUMMARY');

    const hasNostrWallet = allWalletEvents.size > 0;
    const hasRunstrWallet = detection.found;
    const hasLocalProofs = walletState.proofs.length > 0 || walletState.balance > 0;
    const serviceInitialized = serviceState.isInitialized || false;

    console.log('');
    log('Current State:', 'bright');
    log(`  Wallet events on Nostr: ${hasNostrWallet ? '✅' : '❌'}`, hasNostrWallet ? 'green' : 'red');
    log(`  RUNSTR wallet detected: ${hasRunstrWallet ? '✅' : '❌'}`, hasRunstrWallet ? 'green' : 'red');
    log(`  Local wallet data: ${hasLocalProofs ? '✅' : '❌'}`, hasLocalProofs ? 'green' : 'yellow');
    log(`  NutzapService initialized: ${serviceInitialized ? '✅' : '❌'}`, serviceInitialized ? 'green' : 'red');

    console.log('');
    log('Diagnosis:', 'bright');

    if (!hasNostrWallet) {
      log('❌ ROOT CAUSE: No wallet events found on Nostr', 'red');
      log('   Solution: Wallet creation is failing to publish to Nostr', 'yellow');
      log('   Check: WalletSync.publishWalletInfo() error handling', 'yellow');
    } else if (!hasRunstrWallet) {
      log('❌ ROOT CAUSE: Wallet exists but wrong d-tag', 'red');
      log('   Solution: Existing wallets do not have "runstr-primary-wallet" d-tag', 'yellow');
      log('   Fix: User needs to create wallet via Settings button (which uses correct d-tag)', 'yellow');
    } else if (!serviceInitialized) {
      log('❌ ROOT CAUSE: NutzapService never initialized', 'red');
      log('   Solution: App needs to call nutzapService.initialize() on login', 'yellow');
      log('   Fix: Add wallet initialization to AuthService or App.tsx', 'yellow');
    } else {
      log('✅ Wallet appears to be correctly set up!', 'green');
      log('   If errors persist, check for state sync issues between services', 'yellow');
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
