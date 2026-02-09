/**
 * Verification script for CoinOS wallet integration
 * Tests: service methods, charities constants, import paths
 *
 * Run: npx tsx scripts/verify/test-coinos-integration.ts
 */

// Test 1: CoinOSAccountService imports and methods exist
async function testServiceImports() {
  try {
    // We can't actually import AsyncStorage in Node, but we can verify the file is valid TS
    const fs = await import('fs');
    const servicePath = 'src/services/wallet/CoinOSAccountService.ts';
    const content = fs.readFileSync(servicePath, 'utf-8');

    const requiredMethods = [
      'hasAccount',
      'getUsername',
      'getLightningAddress',
      'createAccount',
      'login',
      'getBalance',
      'createInvoice',
      'sendPayment',
      'setAccount',
      'clearAccount',
    ];

    const missing = requiredMethods.filter((m) => !content.includes(m));
    if (missing.length > 0) {
      console.log(`❌ FAIL: Missing methods in CoinOSAccountService: ${missing.join(', ')}`);
      return false;
    }

    // Check storage keys
    const requiredKeys = ['@runstr:coinos_username', '@runstr:coinos_password', '@runstr:coinos_jwt'];
    const missingKeys = requiredKeys.filter((k) => !content.includes(k));
    if (missingKeys.length > 0) {
      console.log(`❌ FAIL: Missing storage keys: ${missingKeys.join(', ')}`);
      return false;
    }

    // Check API base URL
    if (!content.includes('https://coinos.io/api')) {
      console.log('❌ FAIL: Missing CoinOS API base URL');
      return false;
    }

    console.log('✅ PASS: CoinOSAccountService has all required methods and constants');
    return true;
  } catch (error) {
    console.log(`❌ FAIL: Service import test: ${error}`);
    return false;
  }
}

// Test 2: Charities constants updated correctly
async function testCharitiesConstants() {
  try {
    const fs = await import('fs');
    const content = fs.readFileSync('src/constants/charities.ts', 'utf-8');

    const requiredItems = [
      'isCoinOS?: boolean',
      "COINOS_TEAM_ID = 'coinos'",
      'isCoinOSTeam',
      'getCoinOSTeam',
      "id: 'coinos'",
      "name: 'Bitcoin Wallet'",
      'isCoinOS: true',
    ];

    const missing = requiredItems.filter((item) => !content.includes(item));
    if (missing.length > 0) {
      console.log(`❌ FAIL: Missing in charities.ts: ${missing.join(', ')}`);
      return false;
    }

    console.log('✅ PASS: charities.ts has CoinOS team definition and helpers');
    return true;
  } catch (error) {
    console.log(`❌ FAIL: Charities test: ${error}`);
    return false;
  }
}

// Test 3: Setup modal exists and has required elements
async function testSetupModal() {
  try {
    const fs = await import('fs');
    const content = fs.readFileSync('src/components/wallet/CoinOSAccountSetupModal.tsx', 'utf-8');

    const requiredElements = [
      'CoinOSAccountSetupModal',
      'CoinOSAccountService',
      'RewardLightningAddressService',
      'Create Wallet',
      'I have a CoinOS account',
      'CoinOS holds your Bitcoin',
      'wallet-outline',
    ];

    const missing = requiredElements.filter((item) => !content.includes(item));
    if (missing.length > 0) {
      console.log(`❌ FAIL: Missing in setup modal: ${missing.join(', ')}`);
      return false;
    }

    console.log('✅ PASS: CoinOSAccountSetupModal has all required elements');
    return true;
  } catch (error) {
    console.log(`❌ FAIL: Setup modal test: ${error}`);
    return false;
  }
}

// Test 4: Wallet modal exists and has required elements
async function testWalletModal() {
  try {
    const fs = await import('fs');
    const content = fs.readFileSync('src/components/wallet/CoinOSWalletModal.tsx', 'utf-8');

    const requiredElements = [
      'CoinOSWalletModal',
      'Receive',
      'Send',
      'QRCode',
      'Clipboard',
      'Lightning address or invoice',
      'Amount (sats)',
    ];

    const missing = requiredElements.filter((item) => !content.includes(item));
    if (missing.length > 0) {
      console.log(`❌ FAIL: Missing in wallet modal: ${missing.join(', ')}`);
      return false;
    }

    console.log('✅ PASS: CoinOSWalletModal has all required elements');
    return true;
  } catch (error) {
    console.log(`❌ FAIL: Wallet modal test: ${error}`);
    return false;
  }
}

// Test 5: TeamsScreen integration
async function testTeamsScreenIntegration() {
  try {
    const fs = await import('fs');
    const content = fs.readFileSync('src/screens/TeamsScreen.tsx', 'utf-8');

    const requiredItems = [
      'isCoinOSTeam',
      'CoinOSAccountSetupModal',
      'CoinOSWalletModal',
      'CoinOSAccountService',
      'showCoinOSSetupModal',
      'showCoinOSWalletModal',
      'pendingCoinOSSelection',
      'handleCoinOSSetupSuccess',
      'handleCoinOSWalletPress',
      'onWallet',
    ];

    const missing = requiredItems.filter((item) => !content.includes(item));
    if (missing.length > 0) {
      console.log(`❌ FAIL: Missing in TeamsScreen: ${missing.join(', ')}`);
      return false;
    }

    console.log('✅ PASS: TeamsScreen has CoinOS integration');
    return true;
  } catch (error) {
    console.log(`❌ FAIL: TeamsScreen test: ${error}`);
    return false;
  }
}

// Test 6: RewardsScreen integration
async function testRewardsScreenIntegration() {
  try {
    const fs = await import('fs');
    const content = fs.readFileSync('src/screens/RewardsScreen.tsx', 'utf-8');

    const requiredItems = [
      'isCoinOSTeam',
      'CoinOSWalletModal',
      'showCoinOSWalletModal',
      'wallet-outline',
    ];

    const missing = requiredItems.filter((item) => !content.includes(item));
    if (missing.length > 0) {
      console.log(`❌ FAIL: Missing in RewardsScreen: ${missing.join(', ')}`);
      return false;
    }

    console.log('✅ PASS: RewardsScreen has CoinOS wallet button');
    return true;
  } catch (error) {
    console.log(`❌ FAIL: RewardsScreen test: ${error}`);
    return false;
  }
}

// Test 7: WelcomePermissionModal 2-step flow
async function testOnboardingFlow() {
  try {
    const fs = await import('fs');
    const content = fs.readFileSync('src/components/onboarding/WelcomePermissionModal.tsx', 'utf-8');

    const requiredItems = [
      'step === 1',
      'Step 2: Reward Destination',
      'handleGetStarted',
      'setStep(2)',
      'WORKOUT REWARDS',
      'Support a Charity',
      'Earn AI Credits',
      'Earn to Bitcoin Wallet',
      'als-foundation',
      'ppq-ai',
      'coinos',
      'handleSkip',
      'handleContinue',
      'selectedOption',
    ];

    const missing = requiredItems.filter((item) => !content.includes(item));
    if (missing.length > 0) {
      console.log(`❌ FAIL: Missing in WelcomePermissionModal: ${missing.join(', ')}`);
      return false;
    }

    console.log('✅ PASS: WelcomePermissionModal has 2-step onboarding flow');
    return true;
  } catch (error) {
    console.log(`❌ FAIL: Onboarding test: ${error}`);
    return false;
  }
}

// Test 8: CoinOS logo asset exists
async function testLogoAsset() {
  try {
    const fs = await import('fs');
    if (fs.existsSync('assets/images/charities/coinos.png')) {
      console.log('✅ PASS: CoinOS logo asset exists');
      return true;
    } else {
      console.log('❌ FAIL: CoinOS logo asset missing');
      return false;
    }
  } catch (error) {
    console.log(`❌ FAIL: Logo asset test: ${error}`);
    return false;
  }
}

// Run all tests
async function main() {
  console.log('🔍 CoinOS Wallet Integration Verification\n');

  const results = await Promise.all([
    testServiceImports(),
    testCharitiesConstants(),
    testSetupModal(),
    testWalletModal(),
    testTeamsScreenIntegration(),
    testRewardsScreenIntegration(),
    testOnboardingFlow(),
    testLogoAsset(),
  ]);

  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All verification tests passed!');
  } else {
    console.log('⚠️ Some tests failed - review output above');
    process.exit(1);
  }
}

main();
