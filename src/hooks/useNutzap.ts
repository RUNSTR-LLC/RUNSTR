/**
 * useNutzap Hook - React Native hook for NutZap wallet functionality
 * Provides easy integration with components
 * Accepts both npub and hex pubkey formats
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import nutzapService from '../services/nutzap/nutzapService';
import { npubToHex } from '../utils/ndkConversion';

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [userPubkey, setUserPubkey] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Use ref to track if we're already initializing
  const initializingRef = useRef(false);
  const claimIntervalRef = useRef<NodeJS.Timeout>();

  /**
   * Initialize the wallet service
   */
  const initialize = useCallback(async () => {
    if (initializingRef.current || isInitialized) return;

    initializingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log('[useNutzap] Initializing wallet...');

      // Get user's nsec from storage (set during auth)
      const userNsec = await AsyncStorage.getItem('@runstr:user_nsec');

      // Initialize service (auto-creates wallet if needed)
      const walletState = await nutzapService.initialize(userNsec || undefined);

      setUserPubkey(walletState.pubkey);
      setBalance(walletState.balance);
      setIsInitialized(true);

      if (walletState.created) {
        console.log('[useNutzap] New wallet created for user');
      } else {
        console.log('[useNutzap] Existing wallet loaded');
      }

      // Start auto-claim interval (every 30 seconds)
      if (claimIntervalRef.current) {
        clearInterval(claimIntervalRef.current);
      }
      claimIntervalRef.current = setInterval(async () => {
        await claimNutzaps();
      }, 30000);

    } catch (err) {
      console.error('[useNutzap] Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize wallet');
    } finally {
      setIsLoading(false);
      initializingRef.current = false;
    }
  }, [isInitialized]);

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
        // Update balance
        const newBalance = await nutzapService.getBalance();
        setBalance(newBalance);
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
  }, [isInitialized]);

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
        // Update balance
        const newBalance = await nutzapService.getBalance();
        setBalance(newBalance);
        console.log(`[useNutzap] Claimed ${result.claimed} sats`);
      }

      return result;
    } catch (err) {
      console.error('[useNutzap] Claim error:', err);
      return { claimed: 0, total: 0 };
    }
  }, [isInitialized]);

  /**
   * Refresh balance from storage
   */
  const refreshBalance = useCallback(async () => {
    if (!isInitialized) return;

    try {
      const newBalance = await nutzapService.getBalance();
      setBalance(newBalance);
    } catch (err) {
      console.error('[useNutzap] Balance refresh error:', err);
    }
  }, [isInitialized]);

  /**
   * Clear wallet (for testing/logout)
   */
  const clearWallet = useCallback(async () => {
    try {
      await nutzapService.clearWallet();
      setIsInitialized(false);
      setBalance(0);
      setUserPubkey('');
      setError(null);

      if (claimIntervalRef.current) {
        clearInterval(claimIntervalRef.current);
      }
    } catch (err) {
      console.error('[useNutzap] Clear wallet error:', err);
    }
  }, []);

  // Auto-initialize on mount if requested
  useEffect(() => {
    if (autoInitialize && !isInitialized && !initializingRef.current) {
      initialize();
    }

    // Cleanup on unmount
    return () => {
      if (claimIntervalRef.current) {
        clearInterval(claimIntervalRef.current);
      }
    };
  }, [autoInitialize, initialize, isInitialized]);

  return {
    // State
    isInitialized,
    isLoading,
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