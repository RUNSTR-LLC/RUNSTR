/**
 * ClubRewardsPoolCard - Displays club's rewards pool balance
 *
 * Shows the CoinOS wallet balance, Lightning address, and a button
 * to fund the pool. Visible to all members (balance is public info
 * for transparency). Uses ClubWalletService for data fetching.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { ClubWalletService } from '../../services/club/ClubWalletService';
import type { ClubWalletInfo } from '../../types/club';

interface ClubRewardsPoolCardProps {
  clubId: string;
  onFundPool?: (lightningAddress: string) => void;
  refreshKey?: number;
}

const ClubRewardsPoolCardComponent: React.FC<ClubRewardsPoolCardProps> = ({
  clubId,
  onFundPool,
  refreshKey,
}) => {
  const [walletInfo, setWalletInfo] = useState<ClubWalletInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadBalance = useCallback(async () => {
    try {
      const info = await ClubWalletService.getBalance(clubId);
      setWalletInfo(info);
    } catch (err) {
      console.error('[ClubRewardsPoolCard] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    setIsLoading(true);
    ClubWalletService.clearCache(clubId);
    loadBalance();
  }, [loadBalance, refreshKey]);

  const handleCopyAddress = async () => {
    if (!walletInfo?.lightning_address) return;
    await Clipboard.setStringAsync(walletInfo.lightning_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFundPool = () => {
    if (walletInfo?.lightning_address && onFundPool) {
      onFundPool(walletInfo.lightning_address);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accent} size="small" />
        </View>
      </View>
    );
  }

  // No wallet
  if (!walletInfo?.has_wallet) {
    return null;
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons name="trophy" size={18} color={theme.colors.accent} />
        <Text style={styles.headerTitle}>Rewards Pool</Text>
      </View>

      {/* Balance */}
      <Text style={styles.balanceNumber}>
        {walletInfo.balance_sats.toLocaleString()} sats
      </Text>
      <Text style={styles.balanceLabel}>available for prizes</Text>

      {/* Lightning address */}
      <TouchableOpacity style={styles.addressRow} onPress={handleCopyAddress}>
        <Ionicons
          name="flash"
          size={13}
          color={theme.colors.accent}
        />
        <Text style={styles.addressText} numberOfLines={1}>
          {walletInfo.lightning_address}
        </Text>
        <Ionicons
          name={copied ? 'checkmark' : 'copy-outline'}
          size={14}
          color={copied ? theme.colors.success : theme.colors.textMuted}
        />
      </TouchableOpacity>

      {/* Fund button */}
      {onFundPool && (
        <TouchableOpacity style={styles.fundButton} onPress={handleFundPool}>
          <Ionicons name="flash" size={16} color="#000" />
          <Text style={styles.fundButtonText}>Fund Pool</Text>
        </TouchableOpacity>
      )}

      {/* Low balance hint */}
      {walletInfo.balance_sats === 0 && (
        <Text style={styles.emptyHint}>
          Zap the pool to fund event prize pools
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  balanceNumber: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  balanceLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
  },
  fundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
  },
  fundButtonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.bold,
    color: '#000',
  },
  emptyHint: {
    fontSize: 12,
    color: theme.colors.textDark,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});

export const ClubRewardsPoolCard = React.memo(ClubRewardsPoolCardComponent);
export default ClubRewardsPoolCard;
