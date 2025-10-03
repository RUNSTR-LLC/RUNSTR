/**
 * Wallet Recovery Script
 * Run this in Metro console to find and recover lost sats
 *
 * Usage in Metro console:
 * > require('./recover-wallet.js')
 */

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function recoverWallet() {
  console.log('🔍 Searching for wallet data...\n');

  try {
    // Get all storage keys
    const allKeys = await AsyncStorage.getAllKeys();
    const walletKeys = allKeys.filter(key =>
      key.includes('wallet_proofs') ||
      key.includes('wallet_pubkey') ||
      key.includes('wallet_mint') ||
      key.includes('hex_pubkey') ||
      key.includes('npub')
    );

    console.log('Found wallet-related keys:', walletKeys.length);
    console.log(walletKeys.join('\n'), '\n');

    // Find all wallet_proofs
    const proofKeys = allKeys.filter(key => key.includes('wallet_proofs'));
    console.log(`\n💰 Found ${proofKeys.length} wallet(s):\n`);

    let totalBalance = 0;
    for (const key of proofKeys) {
      const proofsStr = await AsyncStorage.getItem(key);
      if (proofsStr) {
        try {
          const proofs = JSON.parse(proofsStr);
          const balance = proofs.reduce((sum, p) => sum + (p.amount || 0), 0);
          totalBalance += balance;

          const pubkey = key.split(':').pop() || 'base';
          console.log(`  📍 ${key}`);
          console.log(`     Pubkey: ${pubkey.slice(0, 32)}...`);
          console.log(`     Balance: ${balance} sats`);
          console.log(`     Proofs: ${proofs.length}\n`);
        } catch (err) {
          console.error(`     ❌ Error parsing: ${err.message}`);
        }
      }
    }

    console.log(`\n💎 TOTAL BALANCE FOUND: ${totalBalance} sats\n`);

    // Show current pubkey
    const currentHexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
    const currentNpub = await AsyncStorage.getItem('@runstr:npub');

    console.log('📌 Current Identity:');
    console.log(`   Hex Pubkey: ${currentHexPubkey?.slice(0, 32)}...`);
    console.log(`   Npub: ${currentNpub?.slice(0, 20)}...`);

    return { totalBalance, walletCount: proofKeys.length };
  } catch (error) {
    console.error('❌ Recovery error:', error);
    return { totalBalance: 0, walletCount: 0 };
  }
}

// Auto-run
recoverWallet().then(result => {
  if (result.totalBalance > 0) {
    console.log('\n✅ Recovery scan complete!');
    console.log(`   Found ${result.walletCount} wallet(s) with ${result.totalBalance} total sats`);
  } else {
    console.log('\n⚠️  No wallet data found');
  }
});

module.exports = recoverWallet;
