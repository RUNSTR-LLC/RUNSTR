/**
 * useTeamWallet Hook
 * Custom React hook for managing team Bitcoin wallet operations
 * Integrates with existing CoinOS service for team wallet management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import coinosService from '../services/coinosService';
import {
  TeamWallet,
  TeamWalletBalance,
  TeamTransaction,
  RewardDistribution,
  TeamWalletCreationData,
  TeamWalletCreationResult,
  TeamWalletPermission,
  UseTeamWalletResult,
  TeamWalletError,
  TEAM_WALLET_STORAGE_KEYS,
  TeamWalletStatus,
} from '../types/teamWallet';
import { PaymentResult, WalletBalance } from '../services/coinosService';

export function useTeamWallet(
  teamId: string,
  userId: string
): UseTeamWalletResult {
  // State
  const [wallet, setWallet] = useState<TeamWallet | null>(null);
  const [balance, setBalance] = useState<TeamWalletBalance | null>(null);
  const [transactions, setTransactions] = useState<TeamTransaction[]>([]);
  const [distributions, setDistributions] = useState<RewardDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const mounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // Safe state update helper
  const safeSetState = useCallback(
    <T>(setState: (value: T) => void, value: T) => {
      if (mounted.current) {
        setState(value);
      }
    },
    []
  );

  // Load cached wallet data on mount
  useEffect(() => {
    if (teamId) {
      loadCachedWalletData();
    }
  }, [teamId]);

  // Load cached wallet data from local storage
  const loadCachedWalletData = useCallback(async () => {
    try {
      const [cachedBalance, cachedTransactions, cachedDistributions] =
        await Promise.all([
          AsyncStorage.getItem(TEAM_WALLET_STORAGE_KEYS.BALANCE(teamId)),
          AsyncStorage.getItem(TEAM_WALLET_STORAGE_KEYS.TRANSACTIONS(teamId)),
          AsyncStorage.getItem(TEAM_WALLET_STORAGE_KEYS.DISTRIBUTIONS(teamId)),
        ]);

      if (cachedBalance) {
        const balanceData = JSON.parse(cachedBalance);
        safeSetState(setBalance, balanceData);
      }

      if (cachedTransactions) {
        const transactionData = JSON.parse(cachedTransactions);
        safeSetState(setTransactions, transactionData);
      }

      if (cachedDistributions) {
        const distributionData = JSON.parse(cachedDistributions);
        safeSetState(setDistributions, distributionData);
      }
    } catch (error) {
      console.error('useTeamWallet: Failed to load cached data:', error);
    }
  }, [teamId, safeSetState]);

  // Create team wallet
  const createWallet = useCallback(
    async (data: TeamWalletCreationData): Promise<TeamWalletCreationResult> => {
      safeSetState(setIsLoading, true);
      safeSetState(setError, null);

      try {
        console.log(`useTeamWallet: Creating wallet for team ${data.teamId}`);

        // Call existing CoinOS service
        const result = await coinosService.createTeamWallet(data.teamId);

        if (!result.success || !result.wallet) {
          throw new Error(result.error || 'Failed to create team wallet');
        }

        // Convert CoinOS wallet to team wallet
        const teamWallet: TeamWallet = {
          id: result.wallet.id,
          teamId: data.teamId,
          captainId: data.captainId,
          walletId: result.wallet.id,
          provider: 'coinos',
          balance: result.wallet.balance,
          lightningAddress: result.wallet.lightningAddress,
          createdAt: result.wallet.createdAt,
          status: 'active' as TeamWalletStatus,
        };

        safeSetState(setWallet, teamWallet);

        // Initialize balance
        const initialBalance: TeamWalletBalance = {
          lightning: result.wallet.balance,
          onchain: 0,
          liquid: 0,
          total: result.wallet.balance,
          teamId: data.teamId,
          lastUpdated: new Date(),
          pendingDistributions: 0,
          reservedBalance: 0,
        };

        safeSetState(setBalance, initialBalance);

        // Cache the balance
        await AsyncStorage.setItem(
          TEAM_WALLET_STORAGE_KEYS.BALANCE(teamId),
          JSON.stringify(initialBalance)
        );

        console.log(
          `useTeamWallet: Team wallet created successfully: ${teamWallet.lightningAddress}`
        );

        return {
          success: true,
          wallet: teamWallet,
          credentials: {
            username: result.wallet.lightningAddress.split('@')[0],
            password: '', // Not returned for security
            token: '', // Not returned for security
            lightningAddress: result.wallet.lightningAddress,
          },
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create team wallet';
        console.error('useTeamWallet: Wallet creation failed:', errorMessage);
        safeSetState(setError, errorMessage);

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        safeSetState(setIsLoading, false);
      }
    },
    [teamId, safeSetState]
  );

  // Refresh wallet balance
  const refreshBalance = useCallback(async (): Promise<void> => {
    if (!wallet) return;

    try {
      safeSetState(setIsLoading, true);
      safeSetState(setError, null);

      // Get current balance from CoinOS service
      const currentBalance = await coinosService.getWalletBalance();

      const updatedBalance: TeamWalletBalance = {
        lightning: currentBalance.lightning,
        onchain: currentBalance.onchain,
        liquid: currentBalance.liquid,
        total: currentBalance.total,
        teamId,
        lastUpdated: new Date(),
        pendingDistributions: distributions.filter(
          (d) => d.status === 'pending'
        ).length,
        reservedBalance: calculateReservedBalance(),
      };

      safeSetState(setBalance, updatedBalance);

      // Cache the updated balance
      await AsyncStorage.setItem(
        TEAM_WALLET_STORAGE_KEYS.BALANCE(teamId),
        JSON.stringify(updatedBalance)
      );

      console.log(
        `useTeamWallet: Balance refreshed for team ${teamId}: ${updatedBalance.total} sats`
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to refresh balance';
      console.error('useTeamWallet: Balance refresh failed:', errorMessage);
      safeSetState(setError, errorMessage);
    } finally {
      safeSetState(setIsLoading, false);
    }
  }, [wallet, teamId, distributions, safeSetState]);

  // Fund wallet (receive payment)
  const fundWallet = useCallback(
    async (amount: number, paymentRequest: string): Promise<PaymentResult> => {
      safeSetState(setIsLoading, true);
      safeSetState(setError, null);

      try {
        console.log(`useTeamWallet: Funding wallet with ${amount} sats`);

        // Use existing CoinOS service to pay invoice
        const result = await coinosService.payInvoice(paymentRequest);

        if (result.success) {
          // Refresh balance after successful payment
          await refreshBalance();
          console.log(
            `useTeamWallet: Wallet funded successfully: ${result.paymentHash}`
          );
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fund wallet';
        console.error('useTeamWallet: Wallet funding failed:', errorMessage);
        safeSetState(setError, errorMessage);

        return {
          success: false,
          paymentHash: '',
          transactionId: undefined,
          preimage: undefined,
          feePaid: 0,
          timestamp: new Date(),
          error: errorMessage,
        };
      } finally {
        safeSetState(setIsLoading, false);
      }
    },
    [refreshBalance, safeSetState]
  );

  // Distribute rewards to team members
  const distributeRewards = useCallback(
    async (
      distributionData: Omit<RewardDistribution, 'id' | 'createdAt' | 'status'>
    ): Promise<void> => {
      safeSetState(setIsLoading, true);
      safeSetState(setError, null);

      try {
        console.log(
          `useTeamWallet: Distributing ${distributionData.totalAmount} sats to ${distributionData.recipients.length} recipients`
        );

        const distribution: RewardDistribution = {
          ...distributionData,
          id: `dist_${Date.now()}`,
          status: 'processing',
          createdAt: new Date(),
          transactionIds: [],
        };

        // Add to distributions list
        const updatedDistributions = [...distributions, distribution];
        safeSetState(setDistributions, updatedDistributions);

        // Send payments to each recipient using existing CoinOS service
        const paymentPromises = distribution.recipients.map(
          async (recipient) => {
            try {
              const result = await coinosService.sendPayment(
                recipient.lightningAddress,
                recipient.amount,
                `Team ${teamId} reward - Rank ${recipient.rank || 'N/A'}`
              );

              if (result.success) {
                recipient.status = 'sent';
                recipient.transactionId = result.transactionId;
                distribution.transactionIds.push(result.transactionId || '');
              } else {
                recipient.status = 'failed';
                recipient.error = result.error || 'Payment failed';
              }

              return result;
            } catch (error) {
              recipient.status = 'failed';
              recipient.error =
                error instanceof Error ? error.message : 'Payment failed';
              throw error;
            }
          }
        );

        // Wait for all payments to complete
        await Promise.allSettled(paymentPromises);

        // Update distribution status
        const allSent = distribution.recipients.every(
          (r) => r.status === 'sent'
        );
        distribution.status = allSent ? 'completed' : 'failed';
        distribution.completedAt = new Date();

        // Update state
        const finalDistributions = updatedDistributions.map((d) =>
          d.id === distribution.id ? distribution : d
        );
        safeSetState(setDistributions, finalDistributions);

        // Cache distributions
        await AsyncStorage.setItem(
          TEAM_WALLET_STORAGE_KEYS.DISTRIBUTIONS(teamId),
          JSON.stringify(finalDistributions)
        );

        // Refresh balance after distribution
        await refreshBalance();

        console.log(
          `useTeamWallet: Reward distribution ${distribution.status}: ${distribution.id}`
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to distribute rewards';
        console.error(
          'useTeamWallet: Reward distribution failed:',
          errorMessage
        );
        safeSetState(setError, errorMessage);
      } finally {
        safeSetState(setIsLoading, false);
      }
    },
    [distributions, teamId, refreshBalance, safeSetState]
  );

  // Check if user has specific permission
  const hasPermission = useCallback(
    (permission: TeamWalletPermission): boolean => {
      if (!wallet) return false;

      // Only captain has full permissions for now
      // In the future, this could be extended to support team roles
      return wallet.captainId === userId;
    },
    [wallet, userId]
  );

  // Verify user access to team wallet
  const verifyAccess = useCallback(
    async (requestUserId: string): Promise<boolean> => {
      if (!wallet) return false;

      // Captain always has access
      if (wallet.captainId === requestUserId) return true;

      // For now, only captains have access
      // In the future, this could check team membership for view permissions
      return false;
    },
    [wallet]
  );

  // Helper: Calculate reserved balance for upcoming events
  const calculateReservedBalance = useCallback((): number => {
    return distributions
      .filter((d) => d.status === 'pending')
      .reduce((sum, d) => sum + d.totalAmount, 0);
  }, [distributions]);

  return {
    // State
    wallet,
    balance,
    transactions,
    distributions,
    isLoading,
    error,

    // Actions
    createWallet,
    refreshBalance,
    fundWallet,
    distributeRewards,

    // Permissions
    hasPermission,
    verifyAccess,
  };
}
