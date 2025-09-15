/**
 * Phase 1 Test Script
 * Run this to validate the NutZap wallet implementation
 *
 * Usage: npx ts-node src/services/nutzap/testPhase1.ts
 */

import nutzapService from './nutzapService';
import { generateSecretKey, nip19 } from 'nostr-tools';

// Test configuration
const TEST_DELAY = 2000; // 2 seconds between tests

// Helper to create test nsec
function createTestNsec(): string {
  const privateKey = generateSecretKey();
  return nip19.nsecEncode(privateKey);
}

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runPhase1Tests() {
  log('\n=== PHASE 1 TESTS: NutZap Wallet Core ===\n', 'blue');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Service Initialization
    log('TEST 1: Service Initialization', 'yellow');
    await nutzapService.clearWallet(); // Start fresh

    const testNsec = createTestNsec();
    const wallet = await nutzapService.initialize(testNsec);

    if (wallet && wallet.pubkey && wallet.created === true) {
      log('✓ Service initialized successfully', 'green');
      log(`  - Pubkey: ${wallet.pubkey.slice(0, 16)}...`, 'green');
      log(`  - Initial balance: ${wallet.balance} sats`, 'green');
      log(`  - Mint: ${wallet.mint}`, 'green');
      testsPassed++;
    } else {
      log('✗ Service initialization failed', 'red');
      testsFailed++;
    }

    await new Promise(resolve => setTimeout(resolve, TEST_DELAY));

    // Test 2: Wallet Persistence
    log('\nTEST 2: Wallet Persistence', 'yellow');

    // Clear in-memory state but keep storage
    const pubkeyBefore = wallet.pubkey;

    // Re-initialize with same nsec
    const wallet2 = await nutzapService.initialize(testNsec);

    if (wallet2.pubkey === pubkeyBefore && wallet2.created === false) {
      log('✓ Wallet persisted correctly', 'green');
      log(`  - Same pubkey: ${wallet2.pubkey.slice(0, 16)}...`, 'green');
      log(`  - Loaded existing wallet (created=false)`, 'green');
      testsPassed++;
    } else {
      log('✗ Wallet persistence failed', 'red');
      testsFailed++;
    }

    await new Promise(resolve => setTimeout(resolve, TEST_DELAY));

    // Test 3: Balance Check
    log('\nTEST 3: Balance Operations', 'yellow');

    const balance = await nutzapService.getBalance();

    if (typeof balance === 'number' && balance >= 0) {
      log('✓ Balance check successful', 'green');
      log(`  - Current balance: ${balance} sats`, 'green');
      testsPassed++;
    } else {
      log('✗ Balance check failed', 'red');
      testsFailed++;
    }

    await new Promise(resolve => setTimeout(resolve, TEST_DELAY));

    // Test 4: Nutzap Send (will fail with insufficient balance, but should handle gracefully)
    log('\nTEST 4: Nutzap Send Handling', 'yellow');

    const recipientNsec = createTestNsec();
    const decoded = nip19.decode(recipientNsec);
    const recipientPrivkey = decoded.data as Uint8Array;
    const recipientPubkey = Buffer.from(recipientPrivkey).toString('hex').slice(64); // Get pubkey from privkey

    const sendResult = await nutzapService.sendNutzap(
      recipientPubkey,
      10,
      'Test nutzap'
    );

    if (!sendResult.success && sendResult.error?.includes('Insufficient balance')) {
      log('✓ Send validation working correctly', 'green');
      log(`  - Error handled: ${sendResult.error}`, 'green');
      testsPassed++;
    } else if (sendResult.success) {
      log('✓ Send successful (had balance)', 'green');
      testsPassed++;
    } else {
      log('✗ Unexpected send error', 'red');
      log(`  - Error: ${sendResult.error}`, 'red');
      testsFailed++;
    }

    await new Promise(resolve => setTimeout(resolve, TEST_DELAY));

    // Test 5: Claim Nutzaps
    log('\nTEST 5: Claim Nutzaps', 'yellow');

    const claimResult = await nutzapService.claimNutzaps();

    if (typeof claimResult.claimed === 'number' && typeof claimResult.total === 'number') {
      log('✓ Claim function working', 'green');
      log(`  - Claimed: ${claimResult.claimed} sats`, 'green');
      log(`  - Total available: ${claimResult.total} sats`, 'green');
      testsPassed++;
    } else {
      log('✗ Claim function failed', 'red');
      testsFailed++;
    }

    await new Promise(resolve => setTimeout(resolve, TEST_DELAY));

    // Test 6: Multiple Users
    log('\nTEST 6: Multiple User Wallets', 'yellow');

    await nutzapService.clearWallet();

    const user1Nsec = createTestNsec();
    const user1Wallet = await nutzapService.initialize(user1Nsec);
    const user1Pubkey = user1Wallet.pubkey;

    await nutzapService.clearWallet();

    const user2Nsec = createTestNsec();
    const user2Wallet = await nutzapService.initialize(user2Nsec);
    const user2Pubkey = user2Wallet.pubkey;

    if (user1Pubkey !== user2Pubkey && user1Wallet.created && user2Wallet.created) {
      log('✓ Multiple users can have separate wallets', 'green');
      log(`  - User 1: ${user1Pubkey.slice(0, 16)}...`, 'green');
      log(`  - User 2: ${user2Pubkey.slice(0, 16)}...`, 'green');
      testsPassed++;
    } else {
      log('✗ Multiple user wallet creation failed', 'red');
      testsFailed++;
    }

  } catch (error) {
    log('\n✗ Test suite error:', 'red');
    console.error(error);
    testsFailed++;
  }

  // Summary
  log('\n=== TEST SUMMARY ===', 'blue');
  log(`Tests Passed: ${testsPassed}`, testsPassed > 0 ? 'green' : 'red');
  log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');

  if (testsFailed === 0) {
    log('\n✓ PHASE 1 COMPLETE! Ready for Phase 2.', 'green');
    log('Next steps:', 'yellow');
    log('1. Add Lightning deposit/withdraw functions', 'yellow');
    log('2. Implement team reward flows', 'yellow');
    log('3. Add UI components', 'yellow');
  } else {
    log('\n✗ PHASE 1 INCOMPLETE. Fix failing tests before proceeding.', 'red');
  }
}

// Run tests
runPhase1Tests().catch(console.error);