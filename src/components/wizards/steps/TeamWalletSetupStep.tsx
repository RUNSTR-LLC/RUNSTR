/**
 * TeamWalletSetupStep - Team wallet creation for team creation wizard
 * Creates a CoinOS Lightning Network wallet for the team's prize pool
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../../styles/theme';
import { TeamCreationStepProps } from '../../../types';
import { useTeamWallet } from '../../../hooks/useTeamWallet';
import { useUserStore } from '../../../store/userStore';

export const TeamWalletSetupStep: React.FC<TeamCreationStepProps> = ({
  data,
  onDataChange,
}) => {
  // State
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(data.walletCreated || false);
  const [error, setError] = useState<string | null>(null);

  // User context
  const { user } = useUserStore();

  // Debug user store state
  useEffect(() => {
    console.log('TeamWalletSetupStep: User store state:', {
      user: user,
      userId: user?.id,
      userKeys: user ? Object.keys(user) : 'null',
      hasUser: !!user,
    });
  }, [user]);

  // Generate temporary team ID for wallet creation (memoized to prevent re-creation)
  // In production, this would be the actual team ID after team record creation
  const tempTeamId = useMemo(() => `temp_${Date.now()}`, []);
  const { createWallet } = useTeamWallet(tempTeamId, user?.id || '');

  // Handle wallet creation (memoized to prevent infinite loops)
  const handleCreateWallet = useCallback(async () => {
    console.log('TeamWalletSetupStep: Attempting wallet creation with:', {
      userId: user?.id,
      userName: user?.name,
      teamName: data.teamName,
      hasUser: !!user,
      hasTeamName: !!data.teamName,
    });

    if (!user?.id || !data.teamName) {
      const missingFields = [];
      if (!user?.id) missingFields.push('user ID');
      if (!data.teamName) missingFields.push('team name');

      const errorMessage = `Missing required information: ${missingFields.join(
        ', '
      )}`;
      console.error('TeamWalletSetupStep: Validation failed:', errorMessage);
      setError(errorMessage);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      console.log('TeamWalletSetupStep: Creating team wallet...');

      const result = await createWallet({
        teamId: tempTeamId,
        captainId: user.id,
        teamName: data.teamName,
      });

      if (result.success && result.wallet) {
        // Update wizard data with wallet information
        onDataChange({
          walletCreated: true,
          walletTeamId: result.wallet.teamId,
          walletAddress: result.wallet.lightningAddress,
          walletBalance: result.wallet.balance,
        });

        setShowSuccess(true);
        console.log('TeamWalletSetupStep: Team wallet created successfully');
      } else {
        throw new Error(result.error || 'Failed to create team wallet');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create team wallet';
      console.error(
        'TeamWalletSetupStep: Wallet creation failed:',
        errorMessage
      );
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  }, [
    user?.id,
    user?.name,
    data.teamName,
    createWallet,
    tempTeamId,
    onDataChange,
  ]);

  // Auto-start wallet creation when component mounts (if not already created)
  useEffect(() => {
    if (
      !data.walletCreated &&
      !isCreating &&
      !showSuccess &&
      !error &&
      user?.id &&
      data.teamName
    ) {
      // Small delay to show the UI briefly before starting creation
      const timer = setTimeout(() => {
        handleCreateWallet();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [
    data.walletCreated,
    isCreating,
    showSuccess,
    error,
    user?.id,
    data.teamName,
    handleCreateWallet,
  ]);

  // Retry wallet creation
  const handleRetry = () => {
    setError(null);
    handleCreateWallet();
  };

  // Render success state
  if (showSuccess) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>⚡</Text>
          </View>
          <Text style={styles.successTitle}>Team Wallet Created!</Text>
          <Text style={styles.successDescription}>
            Your team's Bitcoin wallet has been successfully created and is
            ready to receive and distribute rewards.
          </Text>

          <View style={styles.walletInfo}>
            <View style={styles.walletInfoItem}>
              <Text style={styles.walletInfoLabel}>Lightning Address</Text>
              <Text style={styles.walletInfoValue}>
                {data.walletAddress || 'Loading...'}
              </Text>
            </View>
            <View style={styles.walletInfoItem}>
              <Text style={styles.walletInfoLabel}>Initial Balance</Text>
              <Text style={styles.walletInfoValue}>
                {data.walletBalance?.toLocaleString() || '0'} sats
              </Text>
            </View>
          </View>

          <View style={styles.nextSteps}>
            <Text style={styles.nextStepsTitle}>What's Next?</Text>
            <View style={styles.nextStepItem}>
              <Text style={styles.nextStepBullet}>•</Text>
              <Text style={styles.nextStepText}>
                Fund your team wallet to create prize pools for events
              </Text>
            </View>
            <View style={styles.nextStepItem}>
              <Text style={styles.nextStepBullet}>•</Text>
              <Text style={styles.nextStepText}>
                Distribute Bitcoin rewards to competition winners
              </Text>
            </View>
            <View style={styles.nextStepItem}>
              <Text style={styles.nextStepBullet}>•</Text>
              <Text style={styles.nextStepText}>
                Manage your team's finances through the captain dashboard
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Render error state
  if (error) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Wallet Creation Failed</Text>
          <Text style={styles.errorDescription}>{error}</Text>

          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Render loading state
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={styles.loadingTitle}>Creating Team Wallet</Text>
        <Text style={styles.loadingDescription}>
          Setting up your team's Bitcoin Lightning Network wallet...
        </Text>

        <View style={styles.loadingSteps}>
          <View style={styles.loadingStep}>
            <View style={[styles.stepIndicator, styles.stepActive]}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.stepText}>Generating secure credentials</Text>
          </View>
          <View style={styles.loadingStep}>
            <View
              style={[styles.stepIndicator, isCreating && styles.stepActive]}
            >
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepText}>Registering with CoinOS</Text>
          </View>
          <View style={styles.loadingStep}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={styles.stepText}>Activating Lightning Network</Text>
          </View>
        </View>

        <Text style={styles.loadingNote}>
          This usually takes 10-30 seconds...
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 20,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  loadingTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 8,
  },

  loadingDescription: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 40,
  },

  loadingSteps: {
    width: '100%',
    marginBottom: 30,
  },

  loadingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },

  stepIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  stepActive: {
    backgroundColor: theme.colors.text,
  },

  stepNumber: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },

  stepText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    flex: 1,
  },

  loadingNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Success State
  successContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },

  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: theme.colors.text,
  },

  successIconText: {
    fontSize: 32,
  },

  successTitle: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  successDescription: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },

  walletInfo: {
    width: '100%',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  walletInfoItem: {
    marginBottom: 12,
  },

  walletInfoLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },

  walletInfoValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  nextSteps: {
    width: '100%',
  },

  nextStepsTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 16,
  },

  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  nextStepBullet: {
    fontSize: 16,
    color: theme.colors.text,
    marginRight: 8,
    lineHeight: 20,
  },

  nextStepText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    flex: 1,
    lineHeight: 20,
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },

  errorIconText: {
    fontSize: 32,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  errorDescription: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },

  retryButton: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.medium,
  },

  retryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
});
