/**
 * Global Wallet Store - Centralized NutZap wallet state management
 * Provides single source of truth for wallet initialization and balance
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Transaction {
  id: string;
  type:
    | 'nutzap_sent'
    | 'nutzap_received'
    | 'lightning_received'
    | 'lightning_sent';
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
  // NOTE: Wallet functionality disabled - NutZap service removed in v0.6.2
  initialize: async (_nsec?: string, _quickResume: boolean = false) => {
    const state = get();

    // Prevent multiple initializations
    if (state.isInitialized || state.isInitializing) {
      console.log(
        '[WalletStore] Already initialized or initializing, skipping...'
      );
      return;
    }

    console.warn(
      '[WalletStore] Wallet initialization disabled - NutZap service removed in v0.6.2. Use NWC wallet instead.'
    );

    // Set as "initialized" but with wallet disabled state
    set({
      isInitialized: true,
      isInitializing: false,
      walletExists: false,
      balance: 0,
      userPubkey: '',
      error: 'Wallet functionality disabled - use NWC wallet',
      lastSync: Date.now(),
    });
  },

  // Create wallet (user-initiated)
  // NOTE: Wallet functionality disabled - NutZap service removed in v0.6.2
  createWallet: async () => {
    console.warn(
      '[WalletStore] Wallet creation disabled - NutZap service removed in v0.6.2. Use NWC wallet instead.'
    );
    set({
      error: 'Wallet functionality disabled - use NWC wallet',
    });
  },

  // Refresh balance from service
  // NOTE: Wallet functionality disabled - NutZap service removed in v0.6.2
  refreshBalance: async () => {
    console.warn(
      '[WalletStore] Balance refresh disabled - NutZap service removed in v0.6.2. Use NWC wallet instead.'
    );
    set({ balance: 0, lastSync: Date.now() });
  },

  // Update balance (called after successful transactions)
  updateBalance: (newBalance: number) => {
    set({ balance: newBalance, lastSync: Date.now() });
  },

  // Add transaction to history
  addTransaction: (transaction: Transaction) => {
    set((state) => ({
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
