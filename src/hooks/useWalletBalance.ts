/**
 * useWalletBalance Hook
 * Lightweight hook for fetching team wallet balance data
 * Used throughout the app for displaying real-time prize pool amounts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import coinosService from '../services/coinosService';
import {
  TeamWalletBalance,
  TEAM_WALLET_STORAGE_KEYS,
  TeamWalletError,
} from '../types/teamWallet';

interface UseWalletBalanceResult {
  balance: number; // Current balance in sats
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshBalance: () => Promise<void>;
  hasWallet: boolean;
}

interface UseWalletBalanceOptions {
  autoRefresh?: boolean; // Auto-refresh every 30 seconds
  refreshInterval?: number; // Refresh interval in milliseconds
}

const DEFAULT_OPTIONS: UseWalletBalanceOptions = {
  autoRefresh: false,
  refreshInterval: 30000, // 30 seconds
};

export function useWalletBalance(
  teamId: string | null,
  options: UseWalletBalanceOptions = DEFAULT_OPTIONS
): UseWalletBalanceResult {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasWallet, setHasWallet] = useState(false);

  const mounted = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const opts = { ...DEFAULT_OPTIONS, ...options };

  useEffect(() => {
    return () => {
      mounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Load cached balance on mount
  useEffect(() => {
    if (teamId) {
      loadCachedBalance();
    } else {
      // Reset state when no teamId
      setBalance(0);
      setHasWallet(false);
      setLastUpdated(null);
      setError(null);
    }
  }, [teamId]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (opts.autoRefresh && teamId && hasWallet) {
      intervalRef.current = setInterval(() => {
        refreshBalance();
      }, opts.refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [opts.autoRefresh, opts.refreshInterval, teamId, hasWallet]);

  const safeSetState = useCallback(
    <T>(setState: (value: T) => void, value: T) => {
      if (mounted.current) {
        setState(value);
      }
    },
    []
  );

  const loadCachedBalance = useCallback(async () => {
    if (!teamId) return;

    try {
      const cachedData = await AsyncStorage.getItem(
        TEAM_WALLET_STORAGE_KEYS.BALANCE(teamId)
      );

      if (cachedData) {
        const balanceData: TeamWalletBalance = JSON.parse(cachedData);
        safeSetState(setBalance, balanceData.total || 0);
        safeSetState(setLastUpdated, new Date(balanceData.lastUpdated));
        safeSetState(setHasWallet, true);
      }
    } catch (error) {
      console.warn('useWalletBalance: Failed to load cached balance:', error);
    }
  }, [teamId, safeSetState]);

  const refreshBalance = useCallback(async (): Promise<void> => {
    if (!teamId) {
      console.warn('useWalletBalance: No teamId provided for balance refresh');
      return;
    }

    safeSetState(setIsLoading, true);
    safeSetState(setError, null);

    try {
      // Check if team wallet exists in storage first
      const credentials = await AsyncStorage.getItem(
        TEAM_WALLET_STORAGE_KEYS.CREDENTIALS(teamId)
      );

      if (!credentials) {
        // No wallet exists for this team
        safeSetState(setHasWallet, false);
        safeSetState(setBalance, 0);
        safeSetState(setIsLoading, false);
        return;
      }

      const credentialData = JSON.parse(credentials);

      // Temporarily set auth token to fetch team wallet balance
      const originalToken = coinosService['getCurrentAuthToken']?.();

      // Use team wallet token for this request
      if (coinosService['setAuthToken']) {
        coinosService['setAuthToken'](credentialData.token);
      }

      // Fetch current balance
      const walletBalance = await coinosService.getWalletBalance();

      // Restore original token
      if (originalToken && coinosService['setAuthToken']) {
        coinosService['setAuthToken'](originalToken);
      }

      // Update state with fresh balance
      const currentBalance = walletBalance.total || 0;
      const now = new Date();

      safeSetState(setBalance, currentBalance);
      safeSetState(setLastUpdated, now);
      safeSetState(setHasWallet, true);

      // Cache the updated balance
      const balanceData: TeamWalletBalance = {
        teamId,
        lightning: walletBalance.lightning || 0,
        onchain: walletBalance.onchain || 0,
        liquid: walletBalance.liquid || 0,
        total: currentBalance,
        lastUpdated: now,
        pendingDistributions: 0, // Would be fetched separately
        reservedBalance: 0, // Would be calculated from pending events
      };

      await AsyncStorage.setItem(
        TEAM_WALLET_STORAGE_KEYS.BALANCE(teamId),
        JSON.stringify(balanceData)
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to refresh wallet balance';

      console.error('useWalletBalance: Balance refresh failed:', error);
      safeSetState(setError, errorMessage);

      // Don't update hasWallet on error - keep previous state
    } finally {
      safeSetState(setIsLoading, false);
    }
  }, [teamId, safeSetState]);

  // Initial balance fetch when teamId changes
  useEffect(() => {
    if (teamId && !isLoading) {
      refreshBalance();
    }
  }, [teamId]); // Only depend on teamId to avoid infinite loops

  return {
    balance,
    isLoading,
    error,
    lastUpdated,
    refreshBalance,
    hasWallet,
  };
}

/**
 * Hook variant for personal wallets
 */
export function usePersonalWalletBalance(): UseWalletBalanceResult {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasWallet, setHasWallet] = useState(false);

  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const safeSetState = useCallback(
    <T>(setState: (value: T) => void, value: T) => {
      if (mounted.current) {
        setState(value);
      }
    },
    []
  );

  const refreshBalance = useCallback(async (): Promise<void> => {
    safeSetState(setIsLoading, true);
    safeSetState(setError, null);

    try {
      // Check if user has wallet credentials
      const hasCredentials = await coinosService.hasWalletCredentials();

      if (!hasCredentials) {
        safeSetState(setHasWallet, false);
        safeSetState(setBalance, 0);
        safeSetState(setIsLoading, false);
        return;
      }

      // Fetch current balance using user's credentials
      const walletBalance = await coinosService.getWalletBalance();
      const currentBalance = walletBalance.total || 0;

      safeSetState(setBalance, currentBalance);
      safeSetState(setLastUpdated, new Date());
      safeSetState(setHasWallet, true);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to refresh personal wallet balance';

      console.error('usePersonalWalletBalance: Balance refresh failed:', error);
      safeSetState(setError, errorMessage);
    } finally {
      safeSetState(setIsLoading, false);
    }
  }, [safeSetState]);

  // Initial balance fetch on mount
  useEffect(() => {
    refreshBalance();
  }, []);

  return {
    balance,
    isLoading,
    error,
    lastUpdated,
    refreshBalance,
    hasWallet,
  };
}
