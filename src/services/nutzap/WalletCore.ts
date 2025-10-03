/**
 * WalletCore - Simplified offline-first wallet core
 * Single wallet per user, no multi-wallet aggregation
 * Works without Nostr connectivity, syncs in background
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CashuMint,
  CashuWallet,
  Proof,
  getEncodedToken,
  getDecodedToken
} from '@cashu/cashu-ts';

// Storage keys
const STORAGE_KEYS = {
  WALLET_PROOFS: '@runstr:wallet_proofs',
  WALLET_MINT: '@runstr:wallet_mint',
  TX_HISTORY: '@runstr:tx_history',
  WALLET_PUBKEY: '@runstr:wallet_pubkey',
} as const;

// Default mint
const DEFAULT_MINT_URL = 'https://mint.coinos.io';

export interface Transaction {
  id: string;
  type: 'nutzap_sent' | 'nutzap_received' | 'lightning_received' | 'lightning_sent' | 'cashu_sent' | 'cashu_received';
  amount: number;
  timestamp: number;
  memo?: string;
  recipient?: string;
  sender?: string;
  invoice?: string;
  token?: string;
  fee?: number;
}

export interface WalletState {
  balance: number;
  mint: string;
  proofs: Proof[];
  pubkey: string;
  isOnline: boolean;
}

/**
 * Core wallet functionality - offline-first
 */
export class WalletCore {
  private static instance: WalletCore;

  private cashuWallet: CashuWallet | null = null;
  private cashuMint: CashuMint | null = null;
  private userPubkey: string = '';
  private isOnline: boolean = false;

  private constructor() {}

  static getInstance(): WalletCore {
    if (!WalletCore.instance) {
      WalletCore.instance = new WalletCore();
    }
    return WalletCore.instance;
  }

  /**
   * Get storage key with pubkey isolation
   */
  private getStorageKey(baseKey: string): string {
    if (!this.userPubkey) return baseKey;
    return `${baseKey}:${this.userPubkey}`;
  }

  /**
   * Initialize wallet - offline-first, no blocking
   */
  async initialize(hexPubkey: string): Promise<WalletState> {
    console.log('[WalletCore] Initializing offline-first wallet...');

    this.userPubkey = hexPubkey;

    // INSTANT: Load local wallet immediately (< 50ms)
    const localWallet = await this.loadLocalWallet();

    // BACKGROUND: Try to connect to mint (don't block)
    this.connectToMintAsync().catch(err =>
      console.warn('[WalletCore] Mint connection failed (offline mode):', err)
    );

    // BACKGROUND: Verify against Nostr backup (don't block)
    this.verifyAndMergeNostrProofs().catch(err =>
      console.warn('[WalletCore] Nostr verification failed:', err)
    );

    return localWallet; // Return immediately for instant UI
  }

  /**
   * Verify local proofs against Nostr backup (background task)
   */
  private async verifyAndMergeNostrProofs(): Promise<void> {
    try {
      // Wait a moment for WalletSync to connect
      await new Promise(resolve => setTimeout(resolve, 1000));

      const WalletSync = require('./WalletSync').default;
      const nostrWallet = await WalletSync.restoreProofsFromNostr();

      if (!nostrWallet) {
        console.log('[WalletCore] No Nostr backup found, using local only');
        return;
      }

      // Compare balances
      const localProofsStr = await AsyncStorage.getItem(this.getStorageKey(STORAGE_KEYS.WALLET_PROOFS));
      const localProofs = localProofsStr ? JSON.parse(localProofsStr) : [];
      const localBalance = localProofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);
      const nostrBalance = nostrWallet.proofs.reduce((sum, p) => sum + p.amount, 0);

      console.log(`[WalletCore] Balance comparison: Local=${localBalance}, Nostr=${nostrBalance}`);

      // If Nostr has more funds, restore them
      if (nostrBalance > localBalance) {
        console.log(`[WalletCore] Restoring ${nostrBalance - localBalance} sats from Nostr backup`);
        await this.saveWallet(nostrWallet.proofs, nostrWallet.mintUrl);

        // Notify UI to refresh balance
        // (You can add an event emitter here if needed)
      } else if (localBalance > nostrBalance) {
        console.log('[WalletCore] Local has more funds, re-syncing to Nostr');
        const localMintUrl = await AsyncStorage.getItem(this.getStorageKey(STORAGE_KEYS.WALLET_MINT)) || DEFAULT_MINT_URL;
        await WalletSync.publishTokenEvent(localProofs, localMintUrl);
      }

    } catch (error) {
      console.error('[WalletCore] Verify/merge failed:', error);
    }
  }

  /**
   * Ensure mint is connected - waits for connection or attempts to connect
   * Returns true if connected, false if connection failed
   */
  private async ensureMintConnected(): Promise<boolean> {
    // If already connected, return immediately
    if (this.cashuWallet && this.isOnline) {
      return true;
    }

    // Try to connect
    try {
      await this.connectToMintAsync();
      return this.cashuWallet !== null;
    } catch (error) {
      console.error('[WalletCore] Failed to ensure mint connection:', error);
      return false;
    }
  }

  /**
   * Connect to Cashu mint asynchronously (non-blocking)
   */
  private async connectToMintAsync(): Promise<void> {
    try {
      console.log('[WalletCore] Connecting to mint in background...');

      const mintUrl = await AsyncStorage.getItem(this.getStorageKey(STORAGE_KEYS.WALLET_MINT)) || DEFAULT_MINT_URL;

      this.cashuMint = new CashuMint(mintUrl);

      // Test connection with timeout
      await Promise.race([
        this.cashuMint.getKeys(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Mint timeout')), 5000))
      ]);

      this.cashuWallet = new CashuWallet(this.cashuMint, { unit: 'sat' });
      this.isOnline = true;

      console.log('[WalletCore] Connected to mint:', mintUrl);
    } catch (error) {
      console.log('[WalletCore] Running in offline mode');
      this.isOnline = false;
    }
  }

  /**
   * Load wallet from local storage (instant)
   */
  private async loadLocalWallet(): Promise<WalletState> {
    try {
      const proofsStr = await AsyncStorage.getItem(this.getStorageKey(STORAGE_KEYS.WALLET_PROOFS));
      const proofs = proofsStr ? JSON.parse(proofsStr) : [];

      const mintUrl = await AsyncStorage.getItem(this.getStorageKey(STORAGE_KEYS.WALLET_MINT)) || DEFAULT_MINT_URL;

      const balance = proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);

      console.log(`[WalletCore] Loaded local wallet: ${balance} sats (${proofs.length} proofs)`);

      return {
        balance,
        mint: mintUrl,
        proofs,
        pubkey: this.userPubkey,
        isOnline: false
      };
    } catch (error) {
      console.error('[WalletCore] Error loading local wallet:', error);
      return {
        balance: 0,
        mint: DEFAULT_MINT_URL,
        proofs: [],
        pubkey: this.userPubkey,
        isOnline: false
      };
    }
  }

  /**
   * Save wallet to local storage
   */
  async saveWallet(proofs: Proof[], mintUrl: string = DEFAULT_MINT_URL): Promise<void> {
    try {
      // Save to AsyncStorage (instant)
      await AsyncStorage.setItem(this.getStorageKey(STORAGE_KEYS.WALLET_PROOFS), JSON.stringify(proofs));
      await AsyncStorage.setItem(this.getStorageKey(STORAGE_KEYS.WALLET_MINT), mintUrl);
      await AsyncStorage.setItem(this.getStorageKey(STORAGE_KEYS.WALLET_PUBKEY), this.userPubkey);
      console.log('[WalletCore] Wallet saved locally');

      // Trigger background Nostr backup (non-blocking)
      // Import is at the top of the file
      const WalletSync = require('./WalletSync').default;
      WalletSync.publishTokenEvent(proofs, mintUrl).catch((err: Error) =>
        console.warn('[WalletCore] Background backup failed:', err)
      );
    } catch (error) {
      console.error('[WalletCore] Failed to save wallet:', error);
    }
  }

  /**
   * Get current balance from local storage
   */
  async getBalance(): Promise<number> {
    const proofsStr = await AsyncStorage.getItem(this.getStorageKey(STORAGE_KEYS.WALLET_PROOFS));
    const proofs = proofsStr ? JSON.parse(proofsStr) : [];
    return proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);
  }

  /**
   * Send nutzap (requires online connection)
   */
  async sendNutzap(recipientPubkey: string, amount: number, memo: string = ''): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      // Ensure mint is connected
      const connected = await this.ensureMintConnected();
      if (!connected || !this.cashuWallet) {
        return { success: false, error: 'Unable to connect to mint. Please check your internet connection.' };
      }

      // Load current proofs
      const proofsStr = await AsyncStorage.getItem(this.getStorageKey(STORAGE_KEYS.WALLET_PROOFS));
      const proofs = proofsStr ? JSON.parse(proofsStr) : [];

      // Check balance
      const balance = proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);
      if (balance < amount) {
        return { success: false, error: `Insufficient balance: ${balance} sats` };
      }

      // Create token
      const sendResponse = await this.cashuWallet.send(amount, proofs);
      const send = sendResponse.send;
      const keep = sendResponse.returnChange || [];

      const token = getEncodedToken({
        token: [{
          mint: this.cashuMint!.mintUrl,
          proofs: send
        }],
        memo
      });

      // Update local proofs
      await this.saveWallet(keep);

      // Save transaction
      await this.saveTransaction({
        type: 'nutzap_sent',
        amount,
        timestamp: Date.now(),
        memo,
        recipient: recipientPubkey,
      });

      console.log(`[WalletCore] Sent ${amount} sats to ${recipientPubkey.slice(0, 8)}...`);
      return { success: true, token };

    } catch (error) {
      console.error('[WalletCore] Send failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Send failed'
      };
    }
  }

  /**
   * Receive Cashu token
   */
  async receiveCashuToken(token: string): Promise<{ amount: number; error?: string }> {
    try {
      if (!this.cashuWallet) {
        return { amount: 0, error: 'Wallet offline' };
      }

      const proofs = await this.cashuWallet.receive(token);

      if (proofs && proofs.length > 0) {
        // Add to existing proofs
        const existingProofsStr = await AsyncStorage.getItem(this.getStorageKey(STORAGE_KEYS.WALLET_PROOFS));
        const existingProofs = existingProofsStr ? JSON.parse(existingProofsStr) : [];
        const newProofs = [...existingProofs, ...proofs];

        await this.saveWallet(newProofs);

        const amount = proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);

        await this.saveTransaction({
          type: 'cashu_received',
          amount,
          timestamp: Date.now(),
        });

        console.log(`[WalletCore] Received ${amount} sats`);
        return { amount };
      }

      return { amount: 0, error: 'No proofs in token' };
    } catch (error: any) {
      console.error('[WalletCore] Receive failed:', error);
      return { amount: 0, error: error.message || 'Receive failed' };
    }
  }

  /**
   * Create Lightning invoice
   */
  async createLightningInvoice(amount: number, memo: string = ''): Promise<{ pr: string; hash: string; error?: string }> {
    try {
      // Ensure mint is connected (matches sendNutzap pattern)
      const connected = await this.ensureMintConnected();
      if (!connected || !this.cashuWallet) {
        return { pr: '', hash: '', error: 'Unable to connect to mint. Please check your internet connection.' };
      }

      console.log(`[WalletCore] Creating invoice for ${amount} sats...`);

      const mintQuote = await this.cashuWallet.createMintQuote(amount);

      if (!mintQuote || !mintQuote.request) {
        throw new Error('Failed to generate invoice');
      }

      // Store quote for later checking
      await AsyncStorage.setItem(`@runstr:quote:${mintQuote.quote}`, JSON.stringify({
        amount,
        created: Date.now(),
        memo
      }));

      console.log('[WalletCore] Invoice created');
      return { pr: mintQuote.request, hash: mintQuote.quote };

    } catch (error: any) {
      console.error('[WalletCore] Create invoice failed:', error);
      return { pr: '', hash: '', error: error.message || 'Failed to create invoice' };
    }
  }

  /**
   * Check and mint paid invoice
   */
  async checkInvoicePaid(quoteHash: string): Promise<boolean> {
    try {
      if (!this.cashuWallet) {
        return false;
      }

      const quoteData = await AsyncStorage.getItem(`@runstr:quote:${quoteHash}`);
      if (!quoteData) {
        return false;
      }

      const { amount } = JSON.parse(quoteData);

      // Check quote status
      const mintQuote = await this.cashuWallet.checkMintQuote(quoteHash);

      if (mintQuote.state !== 'PAID') {
        return false;
      }

      // Mint tokens
      const { proofs } = await this.cashuWallet.mintTokens(amount, quoteHash);

      if (proofs && proofs.length > 0) {
        // Add new proofs
        const existingProofsStr = await AsyncStorage.getItem(this.getStorageKey(STORAGE_KEYS.WALLET_PROOFS));
        const existingProofs = existingProofsStr ? JSON.parse(existingProofsStr) : [];
        const updatedProofs = [...existingProofs, ...proofs];

        await this.saveWallet(updatedProofs);

        // Clean up quote
        await AsyncStorage.removeItem(`@runstr:quote:${quoteHash}`);

        // Save transaction
        await this.saveTransaction({
          type: 'lightning_received',
          amount,
          timestamp: Date.now(),
          memo: 'Lightning deposit',
        });

        console.log(`[WalletCore] Minted ${amount} sats from paid invoice`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[WalletCore] Check payment failed:', error);
      return false;
    }
  }

  /**
   * Pay Lightning invoice
   */
  async payLightningInvoice(invoice: string): Promise<{ success: boolean; fee?: number; error?: string }> {
    try {
      if (!this.cashuWallet) {
        return { success: false, error: 'Wallet offline' };
      }

      // Get current proofs
      const proofsStr = await AsyncStorage.getItem(this.getStorageKey(STORAGE_KEYS.WALLET_PROOFS));
      const proofs = proofsStr ? JSON.parse(proofsStr) : [];

      const balance = proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);

      // Get melt quote
      const meltQuote = await this.cashuWallet.createMeltQuote(invoice);
      const totalNeeded = meltQuote.amount + meltQuote.fee_reserve;

      if (balance < totalNeeded) {
        return { success: false, error: `Insufficient balance: need ${totalNeeded}, have ${balance}` };
      }

      // Pay invoice
      const { change } = await this.cashuWallet.meltTokens(meltQuote, proofs);

      // Update proofs
      await this.saveWallet(change || []);

      // Save transaction
      await this.saveTransaction({
        type: 'lightning_sent',
        amount: meltQuote.amount,
        timestamp: Date.now(),
        invoice,
        fee: meltQuote.fee_reserve,
      });

      console.log(`[WalletCore] Paid invoice: ${meltQuote.amount} sats (fee: ${meltQuote.fee_reserve})`);
      return { success: true, fee: meltQuote.fee_reserve };

    } catch (error: any) {
      console.error('[WalletCore] Payment failed:', error);
      return { success: false, error: error.message || 'Payment failed' };
    }
  }

  /**
   * Save transaction to history
   */
  private async saveTransaction(transaction: Omit<Transaction, 'id'>): Promise<void> {
    try {
      const historyStr = await AsyncStorage.getItem(this.getStorageKey(STORAGE_KEYS.TX_HISTORY));
      const history: Transaction[] = historyStr ? JSON.parse(historyStr) : [];

      const newTransaction: Transaction = {
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        ...transaction
      };

      history.unshift(newTransaction);

      await AsyncStorage.setItem(this.getStorageKey(STORAGE_KEYS.TX_HISTORY), JSON.stringify(history.slice(0, 100)));
    } catch (error) {
      console.error('[WalletCore] Failed to save transaction:', error);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit: number = 50): Promise<Transaction[]> {
    try {
      const historyStr = await AsyncStorage.getItem(this.getStorageKey(STORAGE_KEYS.TX_HISTORY));
      const history: Transaction[] = historyStr ? JSON.parse(historyStr) : [];
      return history.slice(0, limit);
    } catch (error) {
      console.error('[WalletCore] Failed to load history:', error);
      return [];
    }
  }

  /**
   * Clear wallet data
   */
  async clearWallet(): Promise<void> {
    await AsyncStorage.multiRemove([
      this.getStorageKey(STORAGE_KEYS.WALLET_PROOFS),
      this.getStorageKey(STORAGE_KEYS.WALLET_MINT),
      this.getStorageKey(STORAGE_KEYS.WALLET_PUBKEY),
      this.getStorageKey(STORAGE_KEYS.TX_HISTORY),
    ]);
    this.cashuWallet = null;
    this.cashuMint = null;
    this.isOnline = false;
    console.log('[WalletCore] Wallet cleared');
  }

  /**
   * Reset instance (for logout)
   */
  reset(): void {
    this.cashuWallet = null;
    this.cashuMint = null;
    this.userPubkey = '';
    this.isOnline = false;
  }

  /**
   * Get online status
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }
}

export default WalletCore.getInstance();
