/**
 * useTeamWallet Hook - DEPRECATED
 * Team wallets are no longer used - replaced with P2P NIP-60/61 payments
 * This stub remains for compatibility but returns empty values
 */

import { useState, useCallback } from 'react';

// Stub types for compatibility
interface StubWallet {
  id: string;
  teamId: string;
  balance: number;
}

interface StubResult {
  wallet: StubWallet | null;
  balance: any;
  transactions: any[];
  distributions: any[];
  isLoading: boolean;
  error: string | null;
  createWallet: () => Promise<any>;
  refreshBalance: () => Promise<void>;
  fundWallet: () => Promise<any>;
  distributeRewards: () => Promise<void>;
  hasPermission: () => boolean;
  verifyAccess: () => Promise<boolean>;
}

export function useTeamWallet(
  teamId: string,
  userId: string
): StubResult {
  // Return stub values - team wallets are deprecated
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // Stub functions that do nothing
  const createWallet = useCallback(async () => {
    console.warn('Team wallets are deprecated - use P2P NIP-60/61 payments');
    return { success: false, error: 'Team wallets deprecated' };
  }, []);

  const refreshBalance = useCallback(async () => {
    console.warn('Team wallets are deprecated - use P2P NIP-60/61 payments');
  }, []);

  const fundWallet = useCallback(async () => {
    console.warn('Team wallets are deprecated - use P2P NIP-60/61 payments');
    return { success: false, error: 'Team wallets deprecated' };
  }, []);

  const distributeRewards = useCallback(async () => {
    console.warn('Team wallets are deprecated - use P2P NIP-60/61 payments');
  }, []);

  const hasPermission = useCallback(() => false, []);
  const verifyAccess = useCallback(async () => false, []);

  return {
    wallet: null,
    balance: null,
    transactions: [],
    distributions: [],
    isLoading,
    error,
    createWallet,
    refreshBalance,
    fundWallet,
    distributeRewards,
    hasPermission,
    verifyAccess,
  };
}