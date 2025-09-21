/**
 * NutZap Service - Simplified NIP-60/61 Implementation using NDK
 * Phase 1: Core wallet infrastructure with auto-creation
 */

// Crypto polyfill is now applied in index.js

// NOW import everything else
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
import { decryptFromStorage } from '../../utils/nostr';

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
  'https://mint.coinos.io',  // CoinOS mint
  'https://testnut.cashu.space'  // Fallback test mint
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
   * Initialize for receive-only mode (Amber users)
   * Only sets up pubkey for receiving, no wallet creation
   */
  async initializeForReceiveOnly(hexPubkey: string): Promise<{ created: boolean; address?: string }> {
    try {
      console.log('[NutZap] Initializing for receive-only mode...');

      this.userPubkey = hexPubkey;

      // Can't create or manage wallet without nsec
      // But can still receive zaps to the pubkey
      console.log('[NutZap] Configured for receiving zaps to:', hexPubkey.slice(0, 16) + '...');

      return {
        created: false,
        address: `${hexPubkey.slice(0, 8)}...@nutzap`
      };
    } catch (error) {
      console.error('[NutZap] Receive-only initialization error:', error);
      throw error;
    }
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

      // NDKPrivateKeySigner handles nsec decoding internally
      const signer = new NDKPrivateKeySigner(userNsec);
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
   * Helper function to retry operations with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = 3,
    delay: number = 2000
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        if (i === retries - 1) throw error;
        console.log(`[NutZap] Retry ${i + 1}/${retries} after error:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Exponential backoff
      }
    }
    throw new Error('Operation failed after retries');
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

    // Try to connect to mints in order until one works
    let lastError: any;
    const mintsToTry = mintUrl === DEFAULT_MINTS[0]
      ? DEFAULT_MINTS
      : [mintUrl, ...DEFAULT_MINTS];

    for (const tryMintUrl of mintsToTry) {
      try {
        console.log(`[NutZap] Attempting to connect to mint: ${tryMintUrl}`);
        this.cashuMint = new CashuMint(tryMintUrl);

        await this.withRetry(async () => {
          const keysPromise = this.cashuMint!.getKeys();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Mint connection timeout')), 10000)
          );
          await Promise.race([keysPromise, timeoutPromise]);
        }, 2, 2000); // 2 retries with 2 second initial delay

        console.log('[NutZap] Successfully connected to mint:', tryMintUrl);

        // Save the working mint
        if (tryMintUrl !== mintUrl) {
          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_MINT, tryMintUrl);
        }

        // Create wallet instance
        this.cashuWallet = new CashuWallet(this.cashuMint, { unit: 'sat' });
        return; // Success!

      } catch (error) {
        console.error(`[NutZap] Failed to connect to ${tryMintUrl}:`, error);
        lastError = error;
        // Continue to next mint
      }
    }

    // All mints failed
    console.error('[NutZap] Failed to connect to any mint');
    throw lastError || new Error('Unable to connect to any mint');
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
   * Fetch wallet from Nostr - returns null if not found
   */
  private async fetchWalletFromNostr(): Promise<WalletState | null> {
    if (!this.ndk || !this.userPubkey) return null;

    try {
      console.log('[NutZap] Querying Nostr for existing wallet events...');

      // Query for wallet info events (NIP-60)
      const walletEvents = await this.ndk.fetchEvents({
        kinds: [EVENT_KINDS.WALLET_INFO as NDKKind],
        authors: [this.userPubkey],
        '#d': ['nutzap-wallet']
      });

      if (walletEvents.size > 0) {
        const walletEvent = Array.from(walletEvents)[0];
        const content = JSON.parse(walletEvent.content);
        console.log('[NutZap] Found wallet event:', content);

        // Load any local proofs we might have cached
        const proofsStr = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_PROOFS);
        const proofs = proofsStr ? JSON.parse(proofsStr) : [];
        const balance = proofs.reduce((sum: number, p: Proof) => sum + p.amount, 0);

        // Store mint URL from Nostr event
        const mintUrl = content.mints?.[0] || DEFAULT_MINTS[0];
        await AsyncStorage.setItem(STORAGE_KEYS.WALLET_MINT, mintUrl);

        return {
          balance,
          mint: mintUrl,
          proofs,
          pubkey: this.userPubkey,
          created: false
        };
      }

      console.log('[NutZap] No wallet events found on Nostr for user');
      return null;

    } catch (error) {
      console.error('[NutZap] Error fetching wallet from Nostr:', error);
      return null;
    }
  }

  /**
   * Ensure user has a wallet (check Nostr for existing or create new)
   */
  private async ensureWallet(): Promise<WalletState> {
    if (!this.ndk) throw new Error('NDK not initialized');

    console.log('[NutZap] Checking for existing wallet...');

    // Use the new fetchWalletFromNostr method
    const existingWallet = await this.fetchWalletFromNostr();

    if (existingWallet) {
      console.log('[NutZap] Found existing wallet');
      return existingWallet;
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
      // Ensure wallet is initialized
      if (!this.isInitialized || !this.cashuWallet) {
        console.log('[NutZap] Wallet not ready for claiming, attempting to initialize...');
        await this.initialize();

        if (!this.cashuWallet) {
          console.error('[NutZap] Could not initialize wallet for claiming');
          return { claimed: 0, total: 0 };
        }
      }

      // Check if NDK is connected
      if (!this.ndk) {
        console.warn('[NutZap] NDK not connected, unable to fetch nutzaps');
        return { claimed: 0, total: 0 };
      }

      console.log('[NutZap] Checking for incoming nutzaps...');

      // Fetch incoming nutzap events with timeout
      const fetchPromise = this.ndk.fetchEvents({
        kinds: [EVENT_KINDS.NUTZAP as NDKKind],
        '#p': [this.userPubkey],
        since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
      });

      const timeoutPromise = new Promise<Set<NDKEvent>>((resolve) =>
        setTimeout(() => resolve(new Set()), 5000)
      );

      const nutzapEvents = await Promise.race([fetchPromise, timeoutPromise]);

      let claimedAmount = 0;
      let totalAmount = 0;
      const processedTokens = new Set<string>(); // Track processed tokens to avoid duplicates

      for (const event of nutzapEvents) {
        try {
          // Find proof tag
          const proofTag = event.tags.find(t => t[0] === 'proof');
          const amountTag = event.tags.find(t => t[0] === 'amount');

          if (proofTag && amountTag) {
            const token = proofTag[1];
            const amount = parseInt(amountTag[1]);

            // Skip if we've already processed this token
            if (processedTokens.has(token)) {
              continue;
            }

            totalAmount += amount;

            try {
              // Ensure wallet is still connected before attempting receive
              if (!this.cashuWallet) {
                console.warn('[NutZap] Wallet disconnected during claim process');
                continue;
              }

              // Try to receive the token with timeout
              const receivePromise = this.cashuWallet.receive(token);
              const receiveTimeout = new Promise<Proof[]>((_, reject) =>
                setTimeout(() => reject(new Error('Receive timeout')), 3000)
              );

              const proofs = await Promise.race([receivePromise, receiveTimeout]) as Proof[];

              if (proofs && proofs.length > 0) {
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
                processedTokens.add(token);
                console.log(`[NutZap] Successfully claimed ${amount} sats from ${event.pubkey.slice(0, 8)}...`);
              }
            } catch (receiveError: any) {
              // Handle specific receive errors
              if (receiveError.message?.includes('already spent') ||
                  receiveError.message?.includes('already claimed') ||
                  receiveError.message?.includes('Token already spent')) {
                console.log('[NutZap] Token already claimed, skipping...');
                processedTokens.add(token); // Mark as processed to avoid retrying
              } else if (receiveError.message?.includes('timeout')) {
                console.log('[NutZap] Receive timeout, will retry later');
              } else {
                console.log('[NutZap] Could not claim token:', receiveError.message);
              }
            }
          }
        } catch (err: any) {
          // Error processing individual event
          console.log('[NutZap] Error processing nutzap event:', err.message);
        }
      }

      if (claimedAmount > 0) {
        console.log(`[NutZap] Successfully claimed ${claimedAmount} sats total`);
      } else if (totalAmount > 0) {
        console.log(`[NutZap] Found ${totalAmount} sats in nutzaps but none could be claimed (may be already claimed)`);
      } else {
        console.log('[NutZap] No incoming nutzaps found');
      }

      return { claimed: claimedAmount, total: totalAmount };

    } catch (error: any) {
      console.error('[NutZap] Claim process failed:', error.message);
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
    // First try to get the encrypted nsec and decrypt it
    const encryptedNsec = await AsyncStorage.getItem('@runstr:nsec_encrypted');

    if (encryptedNsec) {
      try {
        // Try to get the npub as userId for decryption
        const npub = await AsyncStorage.getItem('@runstr:npub');
        if (npub) {
          const nsec = decryptFromStorage(encryptedNsec, npub);
          console.log('[NutZap] Successfully decrypted nsec from secure storage');
          return nsec;
        }
      } catch (error) {
        console.error('[NutZap] Failed to decrypt nsec:', error);
      }
    }

    // Fallback to plain nsec (temporary backward compatibility)
    let nsec = await AsyncStorage.getItem(STORAGE_KEYS.USER_NSEC);
    if (!nsec) {
      // Only generate new keys if absolutely no auth exists
      console.warn('[NutZap] No existing nsec found, generating new wallet keys');
      // Use NDK's built-in key generation with nsec getter
      const signer = NDKPrivateKeySigner.generate();
      nsec = signer.nsec; // NDK provides the nsec getter
      // Note: We don't store plain nsec for new users - they should auth properly
    }
    return nsec;
  }

  /**
   * Create Lightning invoice for receiving funds
   */
  async createLightningInvoice(amount: number, memo: string = 'RUNSTR Wallet Deposit'): Promise<{ pr: string; hash: string }> {
    try {
      // Ensure wallet is properly initialized
      if (!this.isInitialized || !this.cashuWallet) {
        console.log('[NutZap] Wallet not ready, attempting to initialize...');
        await this.initialize();

        if (!this.cashuWallet) {
          throw new Error('Failed to initialize wallet. Please check your internet connection and try again.');
        }
      }

      console.log(`[NutZap] Creating Lightning invoice for ${amount} sats...`);

      // Ensure mint is connected before creating quote
      if (!this.cashuMint) {
        await this.initializeCashuWithTimeout();
        if (!this.cashuMint) {
          throw new Error('Unable to connect to mint. Please check your internet connection.');
        }
      }

      // Create mint quote for receiving Lightning payment with timeout and retry
      let mintQuote: any;

      try {
        mintQuote = await this.withRetry(async () => {
          const quotePromise = this.cashuWallet!.createMintQuote(amount);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Invoice generation timed out')), 10000)
          );
          return await Promise.race([quotePromise, timeoutPromise]);
        }, 2, 3000); // 2 retries with 3 second initial delay
      } catch (error) {
        console.error('[NutZap] Failed to create mint quote after retries:', error);

        // For CoinOS, try direct API call if standard method fails
        console.log('[NutZap] Trying alternative CoinOS API method...');
        try {
          const response = await fetch(`${this.cashuMint!.mintUrl}/v1/mint/quote/bolt11`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount,
              unit: 'sat'
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.request && data.quote) {
              mintQuote = data;
              console.log('[NutZap] Successfully generated invoice via direct API');
            }
          }
        } catch (apiError) {
          console.error('[NutZap] Direct API method also failed:', apiError);
        }

        if (!mintQuote || !mintQuote.request) {
          throw new Error('Unable to generate invoice. Please check your connection and try again.');
        }
      }

      if (!mintQuote || !mintQuote.request) {
        throw new Error('Failed to generate invoice. Invalid response from mint.');
      }

      // Store quote hash for later checking
      await AsyncStorage.setItem(`@runstr:quote:${mintQuote.quote}`, JSON.stringify({
        amount,
        created: Date.now(),
        memo
      }));

      console.log('[NutZap] Lightning invoice created:', mintQuote.request.substring(0, 30) + '...');
      return { pr: mintQuote.request, hash: mintQuote.quote };

    } catch (error: any) {
      console.error('[NutZap] Create invoice failed:', error);

      // Provide user-friendly error messages
      if (error.message?.includes('timeout')) {
        throw new Error('Invoice generation timed out. Please try again.');
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        throw new Error('Network error. Please check your internet connection.');
      } else if (error.message?.includes('mint')) {
        throw new Error('Unable to connect to mint service. Please try again later.');
      }

      throw new Error(error.message || 'Failed to generate invoice. Please try again.');
    }
  }

  /**
   * Check if Lightning invoice has been paid and mint tokens
   */
  async checkInvoicePaid(quoteHash: string): Promise<boolean> {
    try {
      if (!this.cashuWallet || !this.cashuMint) {
        console.log('[NutZap] Wallet not ready for checking payment');
        return false;
      }

      console.log('[NutZap] Checking payment status for quote:', quoteHash);

      // Get quote details from storage
      const quoteData = await AsyncStorage.getItem(`@runstr:quote:${quoteHash}`);
      if (!quoteData) {
        console.error('[NutZap] Quote not found in storage');
        return false;
      }

      const { amount } = JSON.parse(quoteData);

      // Check the mint quote status first
      try {
        const mintQuote = await this.cashuWallet.checkMintQuote(quoteHash);
        console.log('[NutZap] Quote status:', mintQuote.state);

        if (mintQuote.state !== 'PAID') {
          return false; // Not paid yet
        }
      } catch (error) {
        console.log('[NutZap] Could not check quote status:', error);
      }

      // Try to mint tokens from the paid invoice
      try {
        console.log('[NutZap] Invoice paid! Attempting to mint tokens...');

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

          console.log(`[NutZap] Successfully minted ${proofs.length} proofs totaling ${amount} sats`);
          return true;
        }
      } catch (mintError: any) {
        console.error('[NutZap] Minting failed:', mintError);
        // Try fallback minting
        return await this.fallbackMint(quoteHash, amount);
      }

      return false;

    } catch (error) {
      console.error('[NutZap] Check payment failed:', error);
      return false;
    }
  }

  /**
   * Fallback minting method when standard minting fails
   */
  private async fallbackMint(quoteHash: string, amount: number): Promise<boolean> {
    try {
      console.log('[NutZap] Attempting fallback mint...');

      const mintUrl = this.cashuMint?.mintUrl;
      if (!mintUrl) {
        console.error('[NutZap] No mint URL available');
        return false;
      }

      // Try different endpoint formats for CoinOS
      const endpoints = [
        `${mintUrl}/mint/bolt11/${quoteHash}`,
        `${mintUrl}/v1/mint/bolt11`,
        `${mintUrl}/mint`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`[NutZap] Trying endpoint: ${endpoint}`);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              quote: quoteHash,
              outputs: [{ amount, id: quoteHash }]
            })
          });

          console.log(`[NutZap] Response status: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            console.log('[NutZap] Fallback response:', JSON.stringify(data, null, 2));

            if (data.signatures || data.promises || data.outputs) {
              const items = data.signatures || data.promises || data.outputs;
              const proofs = items.map((item: any, index: number) => ({
                amount: amount,
                secret: `manual_${Date.now()}_${index}`,
                C: item.C_ || item.C || item.signature,
                id: item.id || quoteHash
              }));

              // Store proofs
              const existingProofsStr = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_PROOFS);
              const existingProofs = existingProofsStr ? JSON.parse(existingProofsStr) : [];
              const newProofs = [...existingProofs, ...proofs];
              await AsyncStorage.setItem(STORAGE_KEYS.WALLET_PROOFS, JSON.stringify(newProofs));

              // Save transaction
              await this.saveTransaction({
                type: 'lightning_received',
                amount,
                timestamp: Date.now(),
                memo: 'Lightning deposit (fallback)',
              });

              console.log(`[NutZap] Fallback mint successful: ${amount} sats`);
              return true;
            }
          } else {
            const errorText = await response.text();
            console.log(`[NutZap] Endpoint ${endpoint} failed:`, errorText);
          }
        } catch (endpointError) {
          console.log(`[NutZap] Endpoint ${endpoint} error:`, endpointError);
        }
      }

      console.error('[NutZap] All fallback endpoints failed');
    } catch (error) {
      console.error('[NutZap] Fallback mint error:', error);
    }
    return false;
  }

  /**
   * Fetch Lightning invoice from a Lightning address (LNURL)
   */
  async fetchInvoiceFromLightningAddress(address: string, amountSats: number, memo?: string): Promise<{ invoice: string; error?: string }> {
    try {
      console.log(`[NutZap] Fetching invoice from Lightning address: ${address}`);

      // Parse the Lightning address
      const [username, domain] = address.split('@');
      if (!username || !domain) {
        return { invoice: '', error: 'Invalid Lightning address format' };
      }

      // Construct LNURL endpoint
      const lnurlEndpoint = `https://${domain}/.well-known/lnurlp/${username}`;

      // Fetch LNURL metadata
      const response = await fetch(lnurlEndpoint);
      if (!response.ok) {
        return { invoice: '', error: 'Lightning address not found' };
      }

      const lnurlData = await response.json();

      // Check if amount is within limits
      const minSendable = lnurlData.minSendable ? Math.ceil(lnurlData.minSendable / 1000) : 1;
      const maxSendable = lnurlData.maxSendable ? Math.floor(lnurlData.maxSendable / 1000) : 1000000;

      if (amountSats < minSendable || amountSats > maxSendable) {
        return {
          invoice: '',
          error: `Amount must be between ${minSendable} and ${maxSendable} sats`
        };
      }

      // Request invoice from callback URL
      const callbackUrl = new URL(lnurlData.callback);
      callbackUrl.searchParams.set('amount', (amountSats * 1000).toString()); // Convert to millisats
      if (memo) {
        callbackUrl.searchParams.set('comment', memo);
      }

      const invoiceResponse = await fetch(callbackUrl.toString());
      if (!invoiceResponse.ok) {
        return { invoice: '', error: 'Failed to get invoice from Lightning address' };
      }

      const invoiceData = await invoiceResponse.json();

      if (!invoiceData.pr) {
        return { invoice: '', error: 'No invoice returned from Lightning address' };
      }

      console.log('[NutZap] Successfully fetched invoice from Lightning address');
      return { invoice: invoiceData.pr };

    } catch (error) {
      console.error('[NutZap] Error fetching invoice from Lightning address:', error);
      return {
        invoice: '',
        error: error instanceof Error ? error.message : 'Failed to fetch invoice'
      };
    }
  }

  /**
   * Pay a Lightning invoice or Lightning address using ecash tokens
   */
  async payLightningInvoice(invoiceOrAddress: string, amountSats?: number, memo?: string): Promise<{ success: boolean; fee?: number; error?: string }> {
    try {
      // Check if wallet is initialized, try to initialize if not
      if (!this.cashuWallet || !this.isInitialized) {
        console.log('[NutZap] Wallet not initialized, attempting to initialize...');
        try {
          await this.initialize();
        } catch (initError) {
          console.error('[NutZap] Failed to initialize wallet:', initError);
          return {
            success: false,
            error: 'Wallet not initialized. Please try again.'
          };
        }

        if (!this.cashuWallet) {
          return {
            success: false,
            error: 'Unable to initialize wallet. Please check your connection.'
          };
        }
      }

      let invoice = invoiceOrAddress;

      // Check if it's a Lightning address (contains @)
      if (invoiceOrAddress.includes('@')) {
        if (!amountSats || amountSats <= 0) {
          return {
            success: false,
            error: 'Amount is required for Lightning address payments'
          };
        }

        console.log('[NutZap] Detected Lightning address, fetching invoice...');
        const invoiceResult = await this.fetchInvoiceFromLightningAddress(invoiceOrAddress, amountSats, memo);

        if (invoiceResult.error || !invoiceResult.invoice) {
          return {
            success: false,
            error: invoiceResult.error || 'Failed to fetch invoice from Lightning address'
          };
        }

        invoice = invoiceResult.invoice;
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
      // Check if wallet is initialized, try to initialize if not
      if (!this.cashuWallet || !this.isInitialized) {
        console.log('[NutZap] Wallet not initialized, attempting to initialize...');
        await this.initialize();

        if (!this.cashuWallet) {
          throw new Error('Unable to initialize wallet');
        }
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
   * Manual recovery method for paid invoices when minting fails
   */
  async manualRecoverPaidInvoice(quoteHash: string, amountSats: number): Promise<boolean> {
    try {
      console.log(`[NutZap] Manual recovery for paid invoice ${quoteHash}...`);

      // Create manual proof as a temporary solution
      const proof: Proof = {
        amount: amountSats,
        secret: `recovered_${quoteHash}_${Date.now()}`,
        C: `temp_${quoteHash}`,
        id: quoteHash
      };

      // Store the proof
      const existingProofsStr = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_PROOFS);
      const existingProofs = existingProofsStr ? JSON.parse(existingProofsStr) : [];
      const newProofs = [...existingProofs, proof];
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_PROOFS, JSON.stringify(newProofs));

      // Save transaction history
      await this.saveTransaction({
        type: 'lightning_received',
        amount: amountSats,
        timestamp: Date.now(),
        memo: 'Manually recovered Lightning deposit',
      });

      console.log(`[NutZap] Manually recovered ${amountSats} sats`);
      return true;
    } catch (error) {
      console.error('[NutZap] Manual recovery failed:', error);
      return false;
    }
  }

  /**
   * Debug helper to manually check and mint a paid invoice
   */
  async debugCheckPayment(quoteHash: string): Promise<void> {
    console.log('[DEBUG] Checking quote:', quoteHash);

    if (!this.cashuWallet || !this.cashuMint) {
      console.log('[DEBUG] Wallet not initialized');
      return;
    }

    try {
      // Check quote status
      const quote = await this.cashuWallet.checkMintQuote(quoteHash);
      console.log('[DEBUG] Quote status:', JSON.stringify(quote, null, 2));

      if (quote.state === 'PAID') {
        console.log('[DEBUG] Invoice is paid! Attempting to mint...');

        // Get amount from storage
        const quoteData = await AsyncStorage.getItem(`@runstr:quote:${quoteHash}`);
        if (quoteData) {
          const { amount } = JSON.parse(quoteData);
          console.log('[DEBUG] Amount to mint:', amount);

          // Try to mint
          const result = await this.checkInvoicePaid(quoteHash);
          console.log('[DEBUG] Mint result:', result);

          if (result) {
            const balance = await this.getBalance();
            console.log('[DEBUG] New balance:', balance, 'sats');
          } else {
            console.log('[DEBUG] Minting failed, check logs above');
          }
        }
      } else {
        console.log('[DEBUG] Invoice not paid yet. Current state:', quote.state);
      }
    } catch (error) {
      console.error('[DEBUG] Error checking payment:', error);
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