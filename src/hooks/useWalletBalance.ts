/**
 * useWalletBalance Hook - DEPRECATED
 * Team wallets are no longer used - replaced with P2P NIP-60/61 payments
 * This stub remains for compatibility but returns empty values
 */

import { useState, useCallback } from 'react';

interface UseWalletBalanceResult {
  balance: number; // Current balance in sats
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshBalance: () => Promise<void>;
  hasWallet: boolean;
}

interface UseWalletBalanceOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useWalletBalance(
  teamId: string | null,
  options: UseWalletBalanceOptions = {}
): UseWalletBalanceResult {
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    console.warn('Team wallets are deprecated - use P2P NIP-60/61 payments');
  }, []);

  return {
    balance: 0,
    isLoading,
    error,
    lastUpdated: null,
    refreshBalance,
    hasWallet: false,
  };
}