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
  LAST_SYNC: '@runstr:last_sync'
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
      await this.ndk.connect();

      // Initialize Cashu components
      await this.initializeCashu();

      // Check for existing wallet or create new one
      const wallet = await this.ensureWallet();

      this.isInitialized = true;
      console.log('[NutZap] Service initialized successfully');

      return wallet;
    } catch (error) {
      console.error('[NutZap] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Cashu mint and wallet
   */
  private async initializeCashu(): Promise<void> {
    // Get mint URL from storage or use default
    let mintUrl = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_MINT);
    if (!mintUrl) {
      mintUrl = DEFAULT_MINTS[0];
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_MINT, mintUrl);
    }

    // Connect to mint
    this.cashuMint = new CashuMint(mintUrl);
    const keys = await this.cashuMint.getKeys();
    console.log('[NutZap] Connected to mint:', mintUrl);

    // Create wallet instance
    this.cashuWallet = new CashuWallet(this.cashuMint, { unit: 'sat' });
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