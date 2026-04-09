/**
 * RewardBreakdownCard Component
 * Shows breakdown of rewards: user vs charity split with pending status
 *
 * Features:
 * - Total rewards earned
 * - Split between user and charity
 * - Pending indicator for unverified payments
 * - Geyser Fund pending status
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/theme';
import { SupabaseRewardService, RewardBreakdown } from '../../services/rewards/SupabaseRewardService';

interface RewardBreakdownCardProps {
  pubkey: string;
  defaultExpanded?: boolean;
  isPPQ?: boolean;
}

export const RewardBreakdownCard: React.FC<RewardBreakdownCardProps> = ({
  pubkey,
  defaultExpanded = false,
  isPPQ,
}) => {
  const { t } = useTranslation('rewards');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [breakdown, setBreakdown] = useState<RewardBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBreakdown();
  }, [pubkey]);

  // Reload data when screen regains focus
  useFocusEffect(
    useCallback(() => {
      if (pubkey) {
        loadBreakdown();
      }
    }, [pubkey])
  );

  const loadBreakdown = async () => {
    try {
      setIsLoading(true);
      const data = await SupabaseRewardService.getRewardBreakdown(pubkey);
      setBreakdown(data);
    } catch (error) {
      console.error('[RewardBreakdownCard] Failed to load breakdown:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalEarned = breakdown
    ? breakdown.sentToUser + breakdown.sentToCharity + breakdown.pendingToCharity
    : 0;

  return (
    <View style={styles.container}>
      {/* Header - tap to expand/collapse */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.headerTitle}>{t('rewardBreakdown.title', 'REWARD HISTORY')}</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#FF9D42"
        />
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
            </View>
          ) : totalEarned > 0 ? (
            <>
              {/* Breakdown Rows */}
              <View style={styles.breakdownRows}>
                {/* Sent to You */}
                <View style={styles.breakdownRow}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="person-outline" size={16} color="#888" />
                    <Text style={styles.rowLabel}>
                      {t('rewardBreakdown.sentToYou', 'Sent to you')}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowValue}>
                      {(breakdown?.sentToUser || 0).toLocaleString()} sats
                    </Text>
                    <Ionicons name="checkmark-circle" size={14} color="#FF9D42" />
                  </View>
                </View>

                {/* Sent to Charity */}
                <View style={styles.breakdownRow}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="heart-outline" size={16} color="#888" />
                    <Text style={styles.rowLabel}>
                      {t('rewardBreakdown.sentToCharity', 'Sent to charity')}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowValue}>
                      {(breakdown?.sentToCharity || 0).toLocaleString()} sats
                    </Text>
                    <Ionicons name="checkmark-circle" size={14} color="#FF9D42" />
                  </View>
                </View>

                {/* Pending (if any) */}
                {(breakdown?.pendingToCharity || 0) > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={styles.rowLeft}>
                      <Ionicons name="time-outline" size={16} color="#888" />
                      <Text style={styles.rowLabel}>
                        {t('rewardBreakdown.pending', 'Pending')}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={styles.rowValuePending}>
                        {(breakdown?.pendingToCharity || 0).toLocaleString()} sats
                      </Text>
                      <Ionicons name="time" size={14} color="#FF9D42" />
                    </View>
                  </View>
                )}

                {/* Divider */}
                <View style={styles.divider} />

                {/* Total */}
                <View style={styles.breakdownRow}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.totalLabel}>
                      {t('rewardBreakdown.totalEarned', 'Total earned')}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.totalValue}>
                      {totalEarned.toLocaleString()} sats
                    </Text>
                  </View>
                </View>
              </View>

              {/* Workout count */}
              <Text style={styles.workoutCount}>
                {t('rewardBreakdown.fromWorkouts', 'From {{count}} workouts', {
                  count: breakdown?.paymentCount || 0,
                })}
              </Text>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="flash-outline" size={24} color="#444" />
              <Text style={styles.emptyText}>
                {isPPQ
                  ? t('rewardBreakdown.noRewardsYetPPQ', 'No verified rewards yet. Complete workouts to earn AI credits!')
                  : t('rewardBreakdown.noRewardsYet', 'No verified rewards yet. Complete workouts to earn sats!')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
    marginBottom: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },

  headerTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
    letterSpacing: 1,
  },

  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },

  loadingContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },

  breakdownRows: {
    paddingTop: 12,
  },

  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },

  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  rowLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  rowValue: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  rowValuePending: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FF9D42',
  },

  divider: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginVertical: 8,
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  totalValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: '#FFB366',
  },

  workoutCount: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },

  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
