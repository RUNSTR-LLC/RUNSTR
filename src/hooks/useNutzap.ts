/**
 * useNutzap Hook - React Native hook for NutZap wallet functionality
 * Uses global wallet store for consistent state across app
 * Accepts both npub and hex pubkey formats
 */

import { useEffect, useCallback } from 'react';
import nutzapService from '../services/nutzap/nutzapService';
import { npubToHex } from '../utils/ndkConversion';
import { useWalletStore } from '../store/walletStore';

interface UseNutzapReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  balance: number;
  userPubkey: string;
  error: string | null;

  // Actions
  sendNutzap: (recipientPubkey: string, amount: number, memo?: string) => Promise<boolean>;
  claimNutzaps: () => Promise<{ claimed: number; total: number }>;
  refreshBalance: () => Promise<void>;
  clearWallet: () => Promise<void>;
}

export const useNutzap = (autoInitialize: boolean = true): UseNutzapReturn => {
  // Use global wallet store
  const {
    isInitialized,
    isInitializing,
    balance,
    userPubkey,
    error,
    initialize: initializeStore,
    refreshBalance: refreshStoreBalance,
    updateBalance,
    setError,
    addTransaction,
  } = useWalletStore();

  // Initialize wallet on mount if autoInitialize is true
  useEffect(() => {
    if (autoInitialize && !isInitialized && !isInitializing) {
      console.log('[useNutzap] Triggering global wallet initialization');
      initializeStore();
    }
  }, [autoInitialize, isInitialized, isInitializing, initializeStore]);

  /**
   * Send nutzap to another user
   * Accepts both npub and hex pubkey formats
   */
  const sendNutzap = useCallback(async (
    recipientPubkey: string,
    amount: number,
    memo?: string
  ): Promise<boolean> => {
    if (!isInitialized) {
      setError('Wallet not initialized');
      return false;
    }

    setError(null);

    try {
      // Normalize recipient pubkey to hex format
      const recipientHex = npubToHex(recipientPubkey) || recipientPubkey;

      const result = await nutzapService.sendNutzap(recipientHex, amount, memo || '');

      if (result.success) {
        // Update balance in global store
        const newBalance = await nutzapService.getBalance();
        updateBalance(newBalance);

        // Add transaction to history
        addTransaction({
          id: Date.now().toString(),
          type: 'nutzap_sent',
          amount,
          timestamp: Date.now(),
          memo,
          recipient: recipientHex,
        });

        console.log(`[useNutzap] Sent ${amount} sats, new balance: ${newBalance}`);
        return true;
      } else {
        setError(result.error || 'Failed to send nutzap');
        return false;
      }
    } catch (err) {
      console.error('[useNutzap] Send error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send nutzap');
      return false;
    }
  }, [isInitialized, updateBalance, addTransaction, setError]);

  /**
   * Claim incoming nutzaps
   */
  const claimNutzaps = useCallback(async (): Promise<{ claimed: number; total: number }> => {
    if (!isInitialized) {
      return { claimed: 0, total: 0 };
    }

    try {
      const result = await nutzapService.claimNutzaps();

      if (result.claimed > 0) {
        // Update balance in global store
        const newBalance = await nutzapService.getBalance();
        updateBalance(newBalance);
        console.log(`[useNutzap] Claimed ${result.claimed} sats`);
      }

      return result;
    } catch (err) {
      console.error('[useNutzap] Claim error:', err);
      return { claimed: 0, total: 0 };
    }
  }, [isInitialized, updateBalance]);

  /**
   * Refresh balance from storage
   */
  const refreshBalance = useCallback(async () => {
    if (!isInitialized) return;

    try {
      await refreshStoreBalance();
    } catch (err) {
      console.error('[useNutzap] Balance refresh error:', err);
    }
  }, [isInitialized, refreshStoreBalance]);

  /**
   * Clear wallet (for testing/logout)
   */
  const clearWallet = useCallback(async () => {
    try {
      await nutzapService.clearWallet();
      useWalletStore.getState().reset();
    } catch (err) {
      console.error('[useNutzap] Clear wallet error:', err);
    }
  }, []);


  return {
    // State
    isInitialized,
    isLoading: isInitializing,
    balance,
    userPubkey,
    error,

    // Actions
    sendNutzap,
    claimNutzaps,
    refreshBalance,
    clearWallet
  };
};