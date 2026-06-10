/**
 * ClubRewardsPoolCard - Displays club's rewards pool balance
 *
 * Shows the CoinOS wallet balance with a lightning zap button to fund
 * the pool. Visible to all members. Uses ClubWalletService for data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
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

  const handleFundPool = () => {
    if (walletInfo?.lightning_address && onFundPool) {
      onFundPool(walletInfo.lightning_address);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accent} size="small" />
        </View>
      </View>
    );
  }

  if (!walletInfo?.has_wallet) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* Left: trophy + balance info */}
        <View style={styles.infoSection}>
          <View style={styles.headerRow}>
            <Ionicons name="trophy" size={18} color={theme.colors.textMuted} />
            <Text style={styles.headerTitle}>Rewards Pool</Text>
          </View>
          <Text style={styles.balanceNumber}>
            {walletInfo.balance_sats.toLocaleString()} rewards
          </Text>
          <Text style={styles.balanceLabel}>available for prizes</Text>
        </View>

        {/* Right: lightning zap button */}
        {onFundPool && (
          <TouchableOpacity
            style={styles.zapButton}
            onPress={handleFundPool}
            activeOpacity={0.7}
          >
            <Ionicons name="flash" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
    color: theme.colors.text,
  },
  balanceLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  zapButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
});

export const ClubRewardsPoolCard = React.memo(ClubRewardsPoolCardComponent);
export default ClubRewardsPoolCard;
