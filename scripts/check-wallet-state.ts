/**
 * Check Wallet State - Quick diagnostic for wallet initialization
 * Run with: npx tsx scripts/check-wallet-state.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

async function checkWalletState() {
  console.log('🔍 WALLET STATE DIAGNOSTIC');
  console.log('=' .repeat(60));

  try {
    // Check stored keys
    const nsec = await AsyncStorage.getItem('@runstr:user_nsec');
    const npub = await AsyncStorage.getItem('@runstr:npub');
    const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');

    console.log('\n📱 STORED CREDENTIALS:');
    console.log('- nsec:', nsec ? `${nsec.slice(0, 10)}...` : '❌ NOT FOUND');
    console.log('- npub:', npub ? `${npub.slice(0, 16)}...` : '❌ NOT FOUND');
    console.log('- hex_pubkey:', hexPubkey ? `${hexPubkey.slice(0, 16)}...` : '❌ NOT FOUND');

    // Check wallet proofs
    const proofsKey = hexPubkey ? `@runstr:wallet_proofs:${hexPubkey}` : '@runstr:wallet_proofs';
    const proofs = await AsyncStorage.getItem(proofsKey);

    console.log('\n💰 WALLET DATA:');
    console.log('- Storage key:', proofsKey);
    console.log('- Proofs found:', proofs ? 'YES' : '❌ NO');

    if (proofs) {
      const parsed = JSON.parse(proofs);
      const balance = Array.isArray(parsed)
        ? parsed.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        : 0;
      console.log('- Proofs count:', Array.isArray(parsed) ? parsed.length : 0);
      console.log('- Balance:', balance, 'sats');
    }

    // Check mint
    const mintKey = hexPubkey ? `@runstr:wallet_mint:${hexPubkey}` : '@runstr:wallet_mint';
    const mint = await AsyncStorage.getItem(mintKey);
    console.log('- Mint:', mint || '❌ NOT SET');

    console.log('\n✅ DIAGNOSTIC COMPLETE');
    console.log('=' .repeat(60));

    // Recommendations
    if (!nsec && !hexPubkey) {
      console.log('\n⚠️  ISSUE: No authentication found');
      console.log('   Fix: Login with nsec or Amber');
    } else if (!proofs) {
      console.log('\n⚠️  ISSUE: No wallet proofs found');
      console.log('   Fix: Create wallet via Settings → Create Wallet button');
    } else {
      console.log('\n✅ Wallet appears to be set up correctly!');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  }
}

// Check if running in Node.js environment
if (typeof window === 'undefined') {
  // We're in Node.js - need to mock AsyncStorage
  console.log('⚠️  This script requires React Native AsyncStorage');
  console.log('Run inside the app or use: npm run diagnose:wallet-state');
} else {
  checkWalletState();
}
