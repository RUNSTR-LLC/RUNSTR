#!/usr/bin/env ts-node
/**
 * Wallet Discovery Diagnostic Script
 * Finds all existing NIP-60 wallets in AsyncStorage and Nostr
 * Prevents duplicate wallet creation by showing what already exists
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NDK, { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';

interface WalletSnapshot {
  storageKey: string;
  pubkey: string;
  balance: number;
  proofCount: number;
  proofs: any[];
  mint: string;
}

interface CurrentUser {
  nsec?: string;
  npub?: string;
  hexPubkey?: string;
}

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

/**
 * Get current user identity from AsyncStorage
 */
async function getCurrentUserIdentity(): Promise<CurrentUser> {
  log('\n📋 Current User Identity', 'cyan');
  log('='.repeat(50), 'cyan');

  const nsec = await AsyncStorage.getItem('@runstr:user_nsec');
  const npub = await AsyncStorage.getItem('@runstr:npub');
  const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');

  if (nsec) {
    log(`  nsec: ${nsec.slice(0, 10)}...${nsec.slice(-8)}`, 'green');
  } else {
    log('  nsec: NOT FOUND', 'red');
  }

  if (npub) {
    log(`  npub: ${npub.slice(0, 10)}...${npub.slice(-8)}`, 'green');
  } else {
    log('  npub: NOT FOUND', 'yellow');
  }

  if (hexPubkey) {
    log(`  hex:  ${hexPubkey.slice(0, 16)}...${hexPubkey.slice(-8)}`, 'green');
  } else {
    log('  hex:  NOT FOUND', 'yellow');
  }

  // Try to derive from nsec if missing
  if (nsec && !hexPubkey) {
    try {
      const signer = new NDKPrivateKeySigner(nsec);
      const user = await signer.user();
      log(`  hex (derived): ${user.pubkey.slice(0, 16)}...${user.pubkey.slice(-8)}`, 'blue');
      return { nsec, npub: npub || undefined, hexPubkey: user.pubkey };
    } catch (error) {
      log('  ⚠️  Failed to derive hex pubkey from nsec', 'yellow');
    }
  }

  return { nsec: nsec || undefined, npub: npub || undefined, hexPubkey: hexPubkey || undefined };
}

/**
 * Scan AsyncStorage for all wallet-related keys
 */
async function scanAsyncStorage(): Promise<WalletSnapshot[]> {
  log('\n🔍 AsyncStorage Wallet Scan', 'cyan');
  log('='.repeat(50), 'cyan');

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const walletKeys = allKeys.filter(key =>
      key.includes('wallet_proofs') ||
      key.includes('wallet_mint') ||
      key.includes('wallet_pubkey')
    );

    log(`  Found ${walletKeys.length} wallet-related keys in storage`, 'blue');

    // Find all proof keys
    const proofKeys = walletKeys.filter(key => key.includes('wallet_proofs'));

    if (proofKeys.length === 0) {
      log('  ⚠️  No wallet proof keys found', 'yellow');
      return [];
    }

    const wallets: WalletSnapshot[] = [];

    for (const proofKey of proofKeys) {
      const proofsStr = await AsyncStorage.getItem(proofKey);
      if (!proofsStr) continue;

      try {
        const proofs = JSON.parse(proofsStr);
        const balance = proofs.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        // Extract pubkey from key
        const pubkeyMatch = proofKey.match(/@runstr:wallet_proofs:(.+)/);
        const pubkey = pubkeyMatch ? pubkeyMatch[1] : 'no-pubkey';

        // Get mint
        const mintKey = proofKey.replace('wallet_proofs', 'wallet_mint');
        const mint = await AsyncStorage.getItem(mintKey) || 'unknown';

        wallets.push({
          storageKey: proofKey,
          pubkey,
          balance,
          proofCount: proofs.length,
          proofs,
          mint
        });

        log(`\n  ✅ Wallet #${wallets.length}:`, 'green');
        log(`     Key: ${proofKey}`);
        log(`     Pubkey: ${pubkey.slice(0, 16)}...${pubkey.slice(-8)}`);
        log(`     Balance: ${balance.toLocaleString()} sats`, balance > 0 ? 'green' : 'yellow');
        log(`     Proofs: ${proofs.length}`);
        log(`     Mint: ${mint}`);

      } catch (err) {
        log(`  ❌ Error parsing wallet at ${proofKey}: ${err}`, 'red');
      }
    }

    return wallets;

  } catch (error) {
    log(`  ❌ Error scanning AsyncStorage: ${error}`, 'red');
    return [];
  }
}

/**
 * Query Nostr for wallet events
 */
async function queryNostrWallets(hexPubkey?: string): Promise<void> {
  log('\n🌐 Nostr Wallet Query', 'cyan');
  log('='.repeat(50), 'cyan');

  if (!hexPubkey) {
    log('  ⚠️  No hex pubkey available - skipping Nostr query', 'yellow');
    return;
  }

  try {
    log('  Connecting to Nostr relays...', 'blue');

    const ndk = new NDK({
      explicitRelayUrls: [
        'wss://relay.damus.io',
        'wss://relay.primal.net',
        'wss://nos.lol',
        'wss://relay.nostr.band'
      ]
    });

    await ndk.connect(3000); // 3 second timeout

    // Query wallet info events (kind 37375)
    log('  Querying kind 37375 (wallet info)...', 'blue');
    const walletEvents = await ndk.fetchEvents({
      kinds: [37375],
      authors: [hexPubkey],
      limit: 50
    });

    log(`  ✅ Found ${walletEvents.size} wallet info event(s)`, 'green');

    for (const event of walletEvents) {
      try {
        const content = JSON.parse(event.content);
        log(`\n  Wallet Event ${event.id.slice(0, 8)}...:`);
        log(`    Balance: ${content.balance || 0} sats`);
        log(`    Mint: ${content.mints?.[0] || 'unknown'}`);
        log(`    Updated: ${new Date((event.created_at || 0) * 1000).toLocaleString()}`);
      } catch (err) {
        log(`    ⚠️  Could not parse content`, 'yellow');
      }
    }

    // Query token events (kind 7375)
    log('\n  Querying kind 7375 (token events)...', 'blue');
    const tokenEvents = await ndk.fetchEvents({
      kinds: [7375],
      authors: [hexPubkey],
      limit: 50
    });

    log(`  ✅ Found ${tokenEvents.size} token event(s)`, 'green');

    let totalNostrBalance = 0;
    for (const event of tokenEvents) {
      const balanceTag = event.tags.find(t => t[0] === 'balance');
      const mintTag = event.tags.find(t => t[0] === 'mint');
      const proofCountTag = event.tags.find(t => t[0] === 'proof_count');

      if (balanceTag) {
        const balance = parseInt(balanceTag[1]);
        totalNostrBalance += balance;

        log(`\n  Token Event ${event.id.slice(0, 8)}...:`);
        log(`    Balance: ${balance.toLocaleString()} sats`);
        log(`    Proofs: ${proofCountTag?.[1] || 'unknown'}`);
        log(`    Mint: ${mintTag?.[1] || 'unknown'}`);
        log(`    Created: ${new Date((event.created_at || 0) * 1000).toLocaleString()}`);
      }
    }

    if (totalNostrBalance > 0) {
      log(`\n  💰 Total balance in Nostr backups: ${totalNostrBalance.toLocaleString()} sats`, 'green');
    }

  } catch (error) {
    log(`  ⚠️  Nostr query failed: ${error}`, 'yellow');
  }
}

/**
 * Analyze findings and provide recommendations
 */
function analyzeFindings(currentUser: CurrentUser, wallets: WalletSnapshot[]): void {
  log('\n💡 Analysis & Recommendations', 'cyan');
  log('='.repeat(50), 'cyan');

  if (wallets.length === 0) {
    log('  ✅ No existing wallets found', 'green');
    log('  ✅ Safe to create new wallet', 'green');
    return;
  }

  // Find wallet matching current user
  const currentWallet = wallets.find(w => w.pubkey === currentUser.hexPubkey);
  const otherWallets = wallets.filter(w => w.pubkey !== currentUser.hexPubkey);

  if (currentWallet && currentWallet.balance > 0) {
    log(`  ⚠️  WALLET EXISTS for current user!`, 'red');
    log(`  ⚠️  Balance: ${currentWallet.balance.toLocaleString()} sats`, 'red');
    log(`  ⚠️  Proofs: ${currentWallet.proofCount}`, 'red');
    log(`  ⚠️  DO NOT CREATE NEW WALLET!`, 'red');
  } else if (currentWallet) {
    log(`  ℹ️  Wallet exists but empty (${currentWallet.balance} sats)`, 'yellow');
  } else {
    log(`  ℹ️  No wallet found for current pubkey`, 'yellow');
  }

  if (otherWallets.length > 0) {
    log(`\n  📦 Found ${otherWallets.length} wallet(s) from other pubkeys:`, 'yellow');

    let totalOtherBalance = 0;
    otherWallets.forEach((wallet, idx) => {
      totalOtherBalance += wallet.balance;
      log(`\n    Wallet #${idx + 1}:`);
      log(`      Pubkey: ${wallet.pubkey.slice(0, 16)}...`);
      log(`      Balance: ${wallet.balance.toLocaleString()} sats`);
      log(`      Proofs: ${wallet.proofCount}`);
    });

    if (totalOtherBalance > 0) {
      log(`\n  💡 Recommendation: Consolidate ${totalOtherBalance.toLocaleString()} sats from other wallets`, 'blue');
      log(`     Use: import { consolidateWallets } from './src/utils/walletRecovery'`, 'blue');
    }
  }

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  log(`\n  💰 Total balance across all wallets: ${totalBalance.toLocaleString()} sats`, 'bright');
}

/**
 * Main diagnostic function
 */
async function main() {
  log('\n' + '='.repeat(50), 'bright');
  log('🔍 RUNSTR Wallet Discovery Diagnostic', 'bright');
  log('='.repeat(50), 'bright');
  log('Purpose: Find all existing NIP-60 wallets to prevent duplicates\n', 'blue');

  try {
    // Step 1: Get current user
    const currentUser = await getCurrentUserIdentity();

    // Step 2: Scan AsyncStorage
    const wallets = await scanAsyncStorage();

    // Step 3: Query Nostr
    await queryNostrWallets(currentUser.hexPubkey);

    // Step 4: Analyze and recommend
    analyzeFindings(currentUser, wallets);

    log('\n' + '='.repeat(50), 'bright');
    log('✅ Diagnostic Complete', 'green');
    log('='.repeat(50) + '\n', 'bright');

  } catch (error) {
    log(`\n❌ Diagnostic failed: ${error}`, 'red');
    process.exit(1);
  }
}

// Run diagnostic
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
