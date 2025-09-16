/**
 * NutZap Service - Simplified NIP-60/61 Implementation using NDK
 * Phase 1: Core wallet infrastructure with auto-creation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NDK, {
  NDKEvent,
  NDKPrivateKeySigner,
  NDKUser,
  NDKKind
} from '@nostr-dev-kit/ndk';
import {
  CashuMint,
  CashuWallet,
  Proof,
  getEncodedToken,
  getDecodedToken
} from '@cashu/cashu-ts';
import { generateSecretKey, nip19 } from 'nostr-tools';

// Storage keys
const STORAGE_KEYS = {
  USER_NSEC: '@runstr:user_nsec',
  WALLET_PROOFS: '@runstr:wallet_proofs',
  WALLET_MINT: '@runstr:wallet_mint',
  LAST_SYNC: '@runstr:last_sync',
  TX_HISTORY: '@runstr:tx_history'
} as const;

// Default mints to use
const DEFAULT_MINTS = [
  'https://mint.minibits.cash/Bitcoin',
  'https://testnut.cashu.space'
];

// Event kinds for NIP-60
const EVENT_KINDS = {
  WALLET_INFO: 37375,
  NUTZAP: 9321
} as const;

interface WalletState {
  balance: number;
  mint: string;
  proofs: Proof[];
  pubkey: string;
  created: boolean;
}

interface Transaction {
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

class NutzapService {
  private static instance: NutzapService;

  private ndk: NDK | null = null;
  private cashuWallet: CashuWallet | null = null;
  private cashuMint: CashuMint | null = null;
  private userPubkey: string = '';
  private isInitialized = false;

  private constructor() {}

  static getInstance(): NutzapService {
    if (!NutzapService.instance) {
      NutzapService.instance = new NutzapService();
    }
    return NutzapService.instance;
  }

  /**
   * Initialize the service with user's nsec
   * Auto-creates wallet if none exists
   */
  async initialize(nsec?: string): Promise<WalletState> {
    try {
      console.log('[NutZap] Initializing service...');

      // Get or generate nsec
      let userNsec = nsec;
      if (!userNsec) {
        userNsec = await this.getOrCreateNsec();
      }

      // Decode nsec to get private key
      const decoded = nip19.decode(userNsec);
      if (decoded.type !== 'nsec') {
        throw new Error('Invalid nsec provided');
      }

      // Convert Uint8Array to hex string for NDK
      const privateKeyHex = Buffer.from(decoded.data as Uint8Array).toString('hex');

      // Initialize NDK with signer
      const signer = new NDKPrivateKeySigner(privateKeyHex);
      this.userPubkey = await signer.user().then(u => u.pubkey);

      this.ndk = new NDK({
        explicitRelayUrls: [
          'wss://relay.damus.io',
          'wss://relay.primal.net',
          'wss://nos.lol'
        ],
        signer
      });

      console.log('[NutZap] Connecting to relays...');

      // Add timeout for relay connection
      const connectPromise = this.ndk.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Relay connection timeout')), 5000)
      );

      try {
        await Promise.race([connectPromise, timeoutPromise]);
      } catch (err) {
        console.warn('[NutZap] Relay connection failed, continuing anyway:', err);
        // Continue even if relay connection fails - we can work offline
      }

      // Initialize Cashu components with timeout
      try {
        await this.initializeCashuWithTimeout();
      } catch (err) {
        console.warn('[NutZap] Cashu initialization failed, using offline mode:', err);
        // Continue in offline mode - wallet can work without mint connection
      }

      // Load wallet state from local storage (offline-first)
      const wallet = await this.loadOfflineWallet();

      this.isInitialized = true;
      console.log('[NutZap] Service initialized successfully');

      return wallet;
    } catch (error) {
      console.error('[NutZap] Initialization failed:', error);
      // Return a basic wallet state even on error
      return {
        balance: 0,
        mint: DEFAULT_MINTS[0],
        proofs: [],
        pubkey: this.userPubkey || 'unknown',
        created: false
      };
    }
  }

  /**
   * Initialize Cashu mint and wallet with timeout
   */
  private async initializeCashuWithTimeout(): Promise<void> {
    // Get mint URL from storage or use default
    let mintUrl = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_MINT);
    if (!mintUrl) {
      mintUrl = DEFAULT_MINTS[0];
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_MINT, mintUrl);
    }

    // Connect to mint with timeout
    this.cashuMint = new CashuMint(mintUrl);

    const keysPromise = this.cashuMint.getKeys();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Mint connection timeout')), 3000)
    );

    await Promise.race([keysPromise, timeoutPromise]);
    console.log('[NutZap] Connected to mint:', mintUrl);

    // Create wallet instance
    this.cashuWallet = new CashuWallet(this.cashuMint, { unit: 'sat' });
  }

  /**
   * Load wallet state from local storage (offline-first)
   */
  private async loadOfflineWallet(): Promise<WalletState> {
    // Load proofs from local storage
    const proofsStr = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_PROOFS);
    const proofs = proofsStr ? JSON.parse(proofsStr) : [];

    // Get mint URL from storage
    const mintUrl = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_MINT) || DEFAULT_MINTS[0];

    // Calculate balance from proofs
    const balance = proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);

    // Try to sync with Nostr later (non-blocking)
    if (this.ndk) {
      this.syncWithNostr().catch(err =>
        console.warn('[NutZap] Background Nostr sync failed:', err)
      );
    }

    return {
      balance,
      mint: mintUrl,
      proofs,
      pubkey: this.userPubkey,
      created: proofs.length === 0 // If no proofs, wallet was just created
    };
  }

  /**
   * Background sync with Nostr (non-blocking)
   */
  private async syncWithNostr(): Promise<void> {
    if (!this.ndk) return;

    try {
      // Query for wallet events in background
      const walletEvents = await this.ndk.fetchEvents({
        kinds: [EVENT_KINDS.WALLET_INFO as NDKKind],
        authors: [this.userPubkey],
        '#d': ['nutzap-wallet']
      });

      if (walletEvents.size === 0) {
        // Create wallet event on Nostr if it doesn't exist
        const walletEvent = new NDKEvent(this.ndk);
        walletEvent.kind = EVENT_KINDS.WALLET_INFO as NDKKind;
        walletEvent.content = JSON.stringify({
          mints: [this.cashuMint?.mintUrl || DEFAULT_MINTS[0]],
          name: 'RUNSTR Wallet',
          unit: 'sat',
          balance: 0
        });
        walletEvent.tags = [
          ['d', 'nutzap-wallet'],
          ['mint', this.cashuMint?.mintUrl || DEFAULT_MINTS[0]],
          ['name', 'RUNSTR Wallet'],
          ['unit', 'sat']
        ];

        await walletEvent.publish();
        console.log('[NutZap] Published wallet event to Nostr');
      }
    } catch (err) {
      console.warn('[NutZap] Nostr sync failed:', err);
    }
  }

  /**
   * Initialize Cashu mint and wallet (old method for compatibility)
   */
  private async initializeCashu(): Promise<void> {
    await this.initializeCashuWithTimeout();
  }

  /**
   * Ensure user has a wallet (check Nostr for existing or create new)
   */
  private async ensureWallet(): Promise<WalletState> {
    if (!this.ndk) throw new Error('NDK not initialized');

    console.log('[NutZap] Checking for existing wallet...');

    // Query for existing wallet info events
    const walletEvents = await this.ndk.fetchEvents({
      kinds: [EVENT_KINDS.WALLET_INFO as NDKKind],
      authors: [this.userPubkey],
      '#d': ['nutzap-wallet']
    });

    if (walletEvents.size > 0) {
      console.log('[NutZap] Found existing wallet event');
      // Load existing wallet
      return await this.loadWallet(Array.from(walletEvents)[0]);
    } else {
      console.log('[NutZap] No wallet found, creating new one...');
      // Create new wallet
      return await this.createWallet();
    }
  }

  /**
   * Create a new wallet for the user
   */
  private async createWallet(): Promise<WalletState> {
    if (!this.ndk || !this.cashuMint) throw new Error('Service not initialized');

    // Create wallet info event (NIP-60)
    const walletEvent = new NDKEvent(this.ndk);
    walletEvent.kind = EVENT_KINDS.WALLET_INFO as NDKKind;
    walletEvent.content = JSON.stringify({
      mints: [this.cashuMint.mintUrl],
      name: 'RUNSTR Wallet',
      unit: 'sat',
      balance: 0
    });
    walletEvent.tags = [
      ['d', 'nutzap-wallet'],
      ['mint', this.cashuMint.mintUrl],
      ['name', 'RUNSTR Wallet'],
      ['unit', 'sat']
    ];

    // Publish wallet event to Nostr
    await walletEvent.publish();
    console.log('[NutZap] Published wallet event to Nostr');

    // Initialize empty proofs array
    await AsyncStorage.setItem(STORAGE_KEYS.WALLET_PROOFS, JSON.stringify([]));

    return {
      balance: 0,
      mint: this.cashuMint.mintUrl,
      proofs: [],
      pubkey: this.userPubkey,
      created: true
    };
  }

  /**
   * Load existing wallet from Nostr event
   */
  private async loadWallet(event: NDKEvent): Promise<WalletState> {
    const content = JSON.parse(event.content);
    const mintUrl = content.mints?.[0] || DEFAULT_MINTS[0];

    // Load proofs from local storage
    const proofsStr = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_PROOFS);
    const proofs = proofsStr ? JSON.parse(proofsStr) : [];

    // Calculate balance from proofs
    const balance = proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);

    return {
      balance,
      mint: mintUrl,
      proofs,
      pubkey: this.userPubkey,
      created: false
    };
  }

  /**
   * Send a nutzap to another user
   */
  async sendNutzap(
    recipientPubkey: string,
    amount: number,
    memo: string = ''
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized || !this.cashuWallet || !this.ndk) {
        throw new Error('Service not initialized');
      }

      // Load current proofs
      const proofsStr = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_PROOFS);
      const proofs = proofsStr ? JSON.parse(proofsStr) : [];

      // Check balance
      const balance = proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);
      if (balance < amount) {
        return { success: false, error: `Insufficient balance. You have ${balance} sats` };
      }

      // Select proofs for amount
      const sendResponse = await this.cashuWallet.send(amount, proofs);
      const send = sendResponse.send;
      const keep = sendResponse.returnChange || [];

      // Create token for recipient
      const token = getEncodedToken({
        token: [{
          mint: this.cashuMint!.mintUrl,
          proofs: send
        }],
        memo
      });

      // Create nutzap event (NIP-61)
      const nutzapEvent = new NDKEvent(this.ndk);
      nutzapEvent.kind = EVENT_KINDS.NUTZAP as NDKKind;
      nutzapEvent.content = memo;
      nutzapEvent.tags = [
        ['p', recipientPubkey],
        ['amount', amount.toString()],
        ['unit', 'sat'],
        ['proof', token]
      ];

      // Publish nutzap
      await nutzapEvent.publish();

      // Update local proofs (keep change)
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_PROOFS, JSON.stringify(keep));

      // Save transaction
      await this.saveTransaction({
        type: 'nutzap_sent',
        amount,
        timestamp: Date.now(),
        memo,
        recipient: recipientPubkey,
      });

      console.log(`[NutZap] Sent ${amount} sats to ${recipientPubkey.slice(0, 8)}...`);
      return { success: true };

    } catch (error) {
      console.error('[NutZap] Send failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send nutzap'
      };
    }
  }

  /**
   * Claim incoming nutzaps
   */
  async claimNutzaps(): Promise<{ claimed: number; total: number }> {
    try {
      if (!this.isInitialized || !this.cashuWallet || !this.ndk) {
        throw new Error('Service not initialized');
      }

      // Fetch incoming nutzap events
      const nutzapEvents = await this.ndk.fetchEvents({
        kinds: [EVENT_KINDS.NUTZAP as NDKKind],
        '#p': [this.userPubkey],
        since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
      });

      let claimedAmount = 0;
      let totalAmount = 0;

      for (const event of nutzapEvents) {
        try {
          // Find proof tag
          const proofTag = event.tags.find(t => t[0] === 'proof');
          const amountTag = event.tags.find(t => t[0] === 'amount');

          if (proofTag && amountTag) {
            const token = proofTag[1];
            const amount = parseInt(amountTag[1]);
            totalAmount += amount;

            // Try to receive the token
            const proofs = await this.cashuWallet.receive(token);

            // Add to our proofs
            const existingProofsStr = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_PROOFS);
            const existingProofs = existingProofsStr ? JSON.parse(existingProofsStr) : [];
            const newProofs = [...existingProofs, ...proofs];
            await AsyncStorage.setItem(STORAGE_KEYS.WALLET_PROOFS, JSON.stringify(newProofs));

            // Save transaction
            await this.saveTransaction({
              type: 'nutzap_received',
              amount,
              timestamp: Date.now(),
              sender: event.pubkey,
              memo: event.content,
            });

            claimedAmount += amount;
            console.log(`[NutZap] Claimed ${amount} sats from ${event.pubkey.slice(0, 8)}...`);
          }
        } catch (err) {
          // Token might already be claimed or invalid
          console.log('[NutZap] Could not claim token:', err);
        }
      }

      return { claimed: claimedAmount, total: totalAmount };

    } catch (error) {
      console.error('[NutZap] Claim failed:', error);
      return { claimed: 0, total: 0 };
    }
  }

  /**
   * Get current balance
   */
  async getBalance(): Promise<number> {
    const proofsStr = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_PROOFS);
    const proofs = proofsStr ? JSON.parse(proofsStr) : [];
    return proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);
  }

  /**
   * Save transaction to history
   */
  private async saveTransaction(transaction: Omit<Transaction, 'id'>): Promise<void> {
    try {
      const historyStr = await AsyncStorage.getItem(STORAGE_KEYS.TX_HISTORY);
      const history: Transaction[] = historyStr ? JSON.parse(historyStr) : [];

      const newTransaction: Transaction = {
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        ...transaction
      };

      history.unshift(newTransaction);

      // Keep only last 100 transactions
      const trimmedHistory = history.slice(0, 100);

      await AsyncStorage.setItem(STORAGE_KEYS.TX_HISTORY, JSON.stringify(trimmedHistory));
      console.log(`[NutZap] Transaction saved: ${transaction.type} - ${transaction.amount} sats`);
    } catch (error) {
      console.error('[NutZap] Error saving transaction:', error);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit: number = 50): Promise<Transaction[]> {
    try {
      const historyStr = await AsyncStorage.getItem(STORAGE_KEYS.TX_HISTORY);
      const history: Transaction[] = historyStr ? JSON.parse(historyStr) : [];
      return history.slice(0, limit);
    } catch (error) {
      console.error('[NutZap] Error loading transaction history:', error);
      return [];
    }
  }

  /**
   * Get or create user nsec
   */
  private async getOrCreateNsec(): Promise<string> {
    let nsec = await AsyncStorage.getItem(STORAGE_KEYS.USER_NSEC);
    if (!nsec) {
      const privateKey = generateSecretKey();
      nsec = nip19.nsecEncode(privateKey);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_NSEC, nsec);
    }
    return nsec;
  }

  /**
   * Create Lightning invoice for receiving funds
   */
  async createLightningInvoice(amount: number, memo: string = 'RUNSTR Wallet Deposit'): Promise<{ pr: string; hash: string }> {
    try {
      if (!this.cashuWallet) {
        throw new Error('Wallet not initialized');
      }

      console.log(`[NutZap] Creating Lightning invoice for ${amount} sats...`);

      // Create mint quote for receiving Lightning payment
      const mintQuote = await this.cashuWallet.createMintQuote(amount);

      if (!mintQuote || !mintQuote.request) {
        throw new Error('Failed to create mint quote');
      }

      // Store quote hash for later checking
      await AsyncStorage.setItem(`@runstr:quote:${mintQuote.quote}`, JSON.stringify({
        amount,
        created: Date.now(),
        memo
      }));

      console.log('[NutZap] Lightning invoice created:', mintQuote.request.substring(0, 30) + '...');
      return { pr: mintQuote.request, hash: mintQuote.quote };

    } catch (error) {
      console.error('[NutZap] Create invoice failed:', error);
      throw error;
    }
  }

  /**
   * Check if Lightning invoice has been paid and mint tokens
   */
  async checkInvoicePaid(quoteHash: string): Promise<boolean> {
    try {
      if (!this.cashuWallet) {
        throw new Error('Wallet not initialized');
      }

      console.log('[NutZap] Checking payment status for quote:', quoteHash);

      // Get quote details from storage
      const quoteData = await AsyncStorage.getItem(`@runstr:quote:${quoteHash}`);
      if (!quoteData) {
        throw new Error('Quote not found');
      }

      const { amount } = JSON.parse(quoteData);

      // Try to mint tokens from the paid invoice
      try {
        const { proofs } = await this.cashuWallet.mintTokens(amount, quoteHash);

        if (proofs && proofs.length > 0) {
          // Add new proofs to existing ones
          const existingProofsStr = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_PROOFS);
          const existingProofs = existingProofsStr ? JSON.parse(existingProofsStr) : [];
          const updatedProofs = [...existingProofs, ...proofs];

          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_PROOFS, JSON.stringify(updatedProofs));

          // Clean up quote from storage
          await AsyncStorage.removeItem(`@runstr:quote:${quoteHash}`);

          // Save transaction
          await this.saveTransaction({
            type: 'lightning_received',
            amount,
            timestamp: Date.now(),
            memo: 'Lightning deposit',
          });

          console.log(`[NutZap] Successfully minted ${amount} sats from Lightning payment`);
          return true;
        }
      } catch (mintError: any) {
        // Payment not yet confirmed or other mint error
        if (mintError.message?.includes('not paid') || mintError.message?.includes('pending')) {
          console.log('[NutZap] Invoice not yet paid');
          return false;
        }
        throw mintError;
      }

      return false;

    } catch (error) {
      console.error('[NutZap] Check payment failed:', error);
      return false;
    }
  }

  /**
   * Pay a Lightning invoice using ecash tokens
   */
  async payLightningInvoice(invoice: string): Promise<{ success: boolean; fee?: number; error?: string }> {
    try {
      if (!this.cashuWallet) {
        throw new Error('Wallet not initialized');
      }

      console.log('[NutZap] Preparing to pay Lightning invoice...');

      // Get current proofs
      const proofsStr = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_PROOFS);
      const proofs = proofsStr ? JSON.parse(proofsStr) : [];

      // Check if we have sufficient balance
      const balance = proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);

      // Get melt quote to determine amount and fees
      const meltQuote = await this.cashuWallet.createMeltQuote(invoice);

      if (!meltQuote) {
        throw new Error('Failed to create melt quote');
      }

      const totalNeeded = meltQuote.amount + meltQuote.fee_reserve;

      if (balance < totalNeeded) {
        return {
          success: false,
          error: `Insufficient balance. Need ${totalNeeded} sats, have ${balance} sats`
        };
      }

      // Perform the melt (pay invoice)
      const { change } = await this.cashuWallet.meltTokens(meltQuote, proofs);

      // Update proofs with change
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_PROOFS, JSON.stringify(change || []));

      // Save transaction
      await this.saveTransaction({
        type: 'lightning_sent',
        amount: meltQuote.amount,
        timestamp: Date.now(),
        invoice,
        fee: meltQuote.fee_reserve,
      });

      console.log(`[NutZap] Successfully paid Lightning invoice. Fee: ${meltQuote.fee_reserve} sats`);
      return { success: true, fee: meltQuote.fee_reserve };

    } catch (error) {
      console.error('[NutZap] Lightning payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  }

  /**
   * Generate a Cashu token for direct transfer
   */
  async generateCashuToken(amount: number, memo: string = ''): Promise<string> {
    try {
      if (!this.cashuWallet) {
        throw new Error('Wallet not initialized');
      }

      // Load current proofs
      const proofsStr = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_PROOFS);
      const proofs = proofsStr ? JSON.parse(proofsStr) : [];

      // Check balance
      const balance = proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);
      if (balance < amount) {
        throw new Error(`Insufficient balance. Have ${balance} sats, need ${amount} sats`);
      }

      // Create token for the amount
      const { send, returnChange } = await this.cashuWallet.send(amount, proofs);

      // Update stored proofs with change
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_PROOFS, JSON.stringify(returnChange || []));

      // Encode the token
      const token = getEncodedToken({
        token: [{
          mint: this.cashuMint!.mintUrl,
          proofs: send
        }],
        memo
      });

      // Save transaction
      await this.saveTransaction({
        type: 'cashu_sent',
        amount,
        timestamp: Date.now(),
        memo,
        token: token.substring(0, 50) + '...', // Store truncated token
      });

      console.log(`[NutZap] Generated Cashu token for ${amount} sats`);
      return token;

    } catch (error) {
      console.error('[NutZap] Token generation failed:', error);
      throw error;
    }
  }

  /**
   * Receive a Cashu token string
   */
  async receiveCashuToken(token: string): Promise<{ amount: number; error?: string }> {
    try {
      if (!this.cashuWallet) {
        throw new Error('Wallet not initialized');
      }

      console.log('[NutZap] Attempting to receive Cashu token...');

      // Decode token to check mint
      const decoded = getDecodedToken(token);

      if (!decoded || !decoded.token || decoded.token.length === 0) {
        return { amount: 0, error: 'Invalid token format' };
      }

      // Check if token is from our mint
      const tokenMint = decoded.token[0].mint;
      if (tokenMint !== this.cashuMint!.mintUrl) {
        console.warn(`[NutZap] Token from different mint: ${tokenMint}`);
        // In future, could support multiple mints
        return { amount: 0, error: 'Token from unsupported mint' };
      }

      try {
        // Try to receive the token
        const proofs = await this.cashuWallet.receive(token);

        if (proofs && proofs.length > 0) {
          // Add to our proofs
          const existingProofsStr = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_PROOFS);
          const existingProofs = existingProofsStr ? JSON.parse(existingProofsStr) : [];
          const newProofs = [...existingProofs, ...proofs];
          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_PROOFS, JSON.stringify(newProofs));

          // Calculate amount received
          const amount = proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);

          // Save transaction
          await this.saveTransaction({
            type: 'cashu_received',
            amount,
            timestamp: Date.now(),
            memo: decoded.memo,
          });

          console.log(`[NutZap] Successfully received ${amount} sats from Cashu token`);
          return { amount };
        }

        return { amount: 0, error: 'No valid proofs in token' };

      } catch (receiveError: any) {
        // Handle specific error cases
        if (receiveError.message?.includes('already spent') ||
            receiveError.message?.includes('already claimed')) {
          return { amount: 0, error: 'Token has already been claimed' };
        }

        console.error('[NutZap] Token receive error:', receiveError);
        return { amount: 0, error: receiveError.message || 'Failed to receive token' };
      }

    } catch (error) {
      console.error('[NutZap] Receive token failed:', error);
      return {
        amount: 0,
        error: error instanceof Error ? error.message : 'Failed to receive token'
      };
    }
  }

  /**
   * Clear all wallet data (for testing)
   */
  async clearWallet(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    this.isInitialized = false;
    this.ndk = null;
    this.cashuWallet = null;
    this.cashuMint = null;
    console.log('[NutZap] Wallet cleared');
  }
}

// Export singleton
export default NutzapService.getInstance();