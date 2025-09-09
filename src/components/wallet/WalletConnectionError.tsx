/**
 * WalletConnectionError - Error state when wallet connection fails
 * Shows connection problem message with retry option and offline mode notice
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface WalletConnectionErrorProps {
  error: string;
  onRetry?: () => void;
}

export const WalletConnectionError: React.FC<WalletConnectionErrorProps> = ({
  error,
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      {/* Connection Error Message */}
      <View style={styles.errorCard}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>⚠</Text>
        </View>

        <Text style={styles.errorTitle}>Connection Problem</Text>

        <Text style={styles.errorDescription}>
          Unable to connect to your Bitcoin wallet. Check your internet
          connection and try again.
        </Text>

        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Retry Connection</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Offline Mode Notice */}
      <View style={styles.offlineNotice}>
        <Text style={styles.offlineTitle}>Offline Mode</Text>
        <Text style={styles.offlineDescription}>
          Your activity is still being tracked. Rewards will be credited once
          connection is restored.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  errorCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIcon: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.border,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorIconText: {
    fontSize: 20,
    color: '#ff6b6b',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.background,
  },
  offlineNotice: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
  },
  offlineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  offlineDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
