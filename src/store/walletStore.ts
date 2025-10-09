/**
 * Global Wallet Store - Centralized NutZap wallet state management
 * Provides single source of truth for wallet initialization and balance
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import nutzapService from '../services/nutzap/nutzapService';

interface Transaction {
  id: string;
  type: 'nutzap_sent' | 'nutzap_received' | 'lightning_received' | 'lightning_sent';
  amount: number;
  timestamp: number;
  memo?: string;
  recipient?: string;
  sender?: string;
}

interface WalletState {
  // State
  isInitialized: boolean;
  isInitializing: boolean;
  walletExists: boolean;
  balance: number;
  userPubkey: string;
  error: string | null;
  transactions: Transaction[];
  lastSync: number;

  // Actions
  initialize: (nsec?: string, quickResume?: boolean) => Promise<void>;
  createWallet: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  addTransaction: (transaction: Transaction) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  // Initial state
  isInitialized: false,
  isInitializing: false,
  walletExists: false,
  balance: 0,
  userPubkey: '',
  error: null,
  transactions: [],
  lastSync: 0,

  // Initialize wallet (called once at app startup)
  // PERFORMANCE: Uses quick resume for instant load when returning to app
  initialize: async (nsec?: string, quickResume: boolean = false) => {
    const state = get();

    // Prevent multiple initializations
    if (state.isInitialized || state.isInitializing) {
      console.log('[WalletStore] Already initialized or initializing, skipping...');
      return;
    }

    set({ isInitializing: true, error: null });

    try {
      console.log(`[WalletStore] Initializing global wallet... (quick resume: ${quickResume})`);

      // Get user's nsec from storage if not provided
      let userNsec = nsec;
      if (!userNsec) {
        const storedNsec = await AsyncStorage.getItem('@runstr:user_nsec');
        userNsec = storedNsec || undefined;
      }

      // Initialize service with quick resume flag
      // Quick resume skips Nostr queries if cache is fresh (<2 minutes)
      const walletState = await nutzapService.initialize(userNsec || undefined, quickResume);

      // Check if wallet exists (has balance or was just created)
      const hasWallet = walletState.balance > 0 || walletState.created;

      set({
        isInitialized: true,
        isInitializing: false,
        walletExists: hasWallet,
        balance: walletState.balance,
        userPubkey: walletState.pubkey,
        error: null,
        lastSync: Date.now(),
      });

      if (walletState.created) {
        console.log('[WalletStore] New wallet created for user');
      } else if (hasWallet) {
        console.log('[WalletStore] Existing wallet loaded successfully');
      } else {
        console.log('[WalletStore] No wallet found - user needs to create one');
      }

      // Note: Auto-claim is now handled by WalletSync background service

    } catch (error) {
      console.error('[WalletStore] Initialization error:', error);
      set({
        isInitializing: false,
        error: error instanceof Error ? error.message : 'Failed to initialize wallet',
      });
    }
  },

  // Create wallet (user-initiated)
  createWallet: async () => {
    try {
      console.log('[WalletStore] Creating RUNSTR wallet...');
      const WalletCore = (await import('../services/nutzap/WalletCore')).default;

      const result = await WalletCore.createRunstrWallet();

      if (result.success) {
        console.log('[WalletStore] Wallet created successfully');
        // Refresh state from service
        const balance = await nutzapService.getBalance();
        set({
          walletExists: true,
          balance,
          lastSync: Date.now(),
          error: null
        });
      } else {
        console.error('[WalletStore] Wallet creation failed:', result.error);
        set({ error: result.error || 'Failed to create wallet' });
      }
    } catch (error) {
      console.error('[WalletStore] Error creating wallet:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to create wallet' });
    }
  },

  // Refresh balance from service
  refreshBalance: async () => {
    try {
      const balance = await nutzapService.getBalance();
      set({ balance, lastSync: Date.now() });
      console.log(`[WalletStore] Balance refreshed: ${balance} sats`);
    } catch (error) {
      console.error('[WalletStore] Failed to refresh balance:', error);
    }
  },

  // Update balance (called after successful transactions)
  updateBalance: (newBalance: number) => {
    set({ balance: newBalance, lastSync: Date.now() });
  },

  // Add transaction to history
  addTransaction: (transaction: Transaction) => {
    set(state => ({
      transactions: [transaction, ...state.transactions].slice(0, 100), // Keep last 100
    }));
  },

  // Set error message
  setError: (error: string | null) => {
    set({ error });
  },

  // Reset wallet state (for logout)
  reset: () => {
    set({
      isInitialized: false,
      isInitializing: false,
      walletExists: false,
      balance: 0,
      userPubkey: '',
      error: null,
      transactions: [],
      lastSync: 0,
    });
  },
}));