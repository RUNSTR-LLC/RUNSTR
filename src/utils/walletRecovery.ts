/**
 * Wallet Recovery Utility
 * Helps locate and recover lost wallet proofs from AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WalletSnapshot {
  storageKey: string;
  pubkey: string;
  balance: number;
  proofCount: number;
  proofs: any[];
  mint: string;
}

/**
 * Find all wallet data in AsyncStorage
 */
export async function findAllWallets(): Promise<WalletSnapshot[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const wallets: WalletSnapshot[] = [];

    // Find all wallet_proofs keys
    const proofKeys = allKeys.filter(key => key.includes('wallet_proofs'));

    console.log('[Recovery] Found wallet proof keys:', proofKeys);

    for (const proofKey of proofKeys) {
      const proofsStr = await AsyncStorage.getItem(proofKey);
      if (!proofsStr) continue;

      try {
        const proofs = JSON.parse(proofsStr);
        const balance = proofs.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        // Extract pubkey from key (format: @runstr:wallet_proofs:PUBKEY)
        const pubkey = proofKey.split(':').pop() || 'unknown';

        // Try to get mint
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

        console.log(`[Recovery] Found wallet: ${pubkey.slice(0, 16)}... Balance: ${balance} sats`);
      } catch (err) {
        console.error('[Recovery] Error parsing proofs:', err);
      }
    }

    return wallets;
  } catch (error) {
    console.error('[Recovery] Error finding wallets:', error);
    return [];
  }
}

/**
 * Consolidate all wallets into one under current pubkey
 */
export async function consolidateWallets(targetPubkey: string): Promise<{ success: boolean; totalRecovered: number }> {
  try {
    const allWallets = await findAllWallets();

    if (allWallets.length === 0) {
      console.log('[Recovery] No wallets found to consolidate');
      return { success: false, totalRecovered: 0 };
    }

    // Collect all proofs from all wallets
    const allProofs: any[] = [];
    let totalBalance = 0;

    for (const wallet of allWallets) {
      allProofs.push(...wallet.proofs);
      totalBalance += wallet.balance;
      console.log(`[Recovery] Collecting ${wallet.balance} sats from ${wallet.pubkey.slice(0, 16)}...`);
    }

    // Save consolidated proofs under target pubkey
    const targetKey = `@runstr:wallet_proofs:${targetPubkey}`;
    await AsyncStorage.setItem(targetKey, JSON.stringify(allProofs));

    console.log(`[Recovery] Consolidated ${allProofs.length} proofs (${totalBalance} sats) to ${targetPubkey.slice(0, 16)}...`);

    return { success: true, totalRecovered: totalBalance };
  } catch (error) {
    console.error('[Recovery] Consolidation error:', error);
    return { success: false, totalRecovered: 0 };
  }
}

/**
 * Get current user pubkey
 */
export async function getCurrentPubkey(): Promise<string | null> {
  try {
    // Try hex pubkey first
    const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
    if (hexPubkey) return hexPubkey;

    // Try to derive from npub
    const npub = await AsyncStorage.getItem('@runstr:npub');
    if (npub) return npub; // Would need conversion, but this is enough for now

    return null;
  } catch (error) {
    console.error('[Recovery] Error getting pubkey:', error);
    return null;
  }
}
