/**
 * TransparencyDashboardModal - Full-screen modal showing rewards transparency
 *
 * Displays:
 * - Pool balance card
 * - Period selector (Day/Week/Month/All)
 * - Global breakdown (user vs charity split)
 * - Charity payout leaderboard
 * - Pending batch payouts (Geyser progress)
 *
 * Pull-to-refresh support for reloading data
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { RewardsTransparencyService } from '../../services/rewards/RewardsTransparencyService';
import type { PeriodType, DashboardData } from '../../types/transparencyDashboard';
import { PeriodSelector } from './PeriodSelector';
import { GlobalBreakdownCard } from './GlobalBreakdownCard';
import { CharityPayoutLeaderboard } from './CharityPayoutLeaderboard';
import { PendingPayoutsCard } from './PendingPayoutsCard';

interface TransparencyDashboardModalProps {
  visible: boolean;
  onClose: () => void;
  initialPoolBalance?: number | null;
}

export const TransparencyDashboardModal: React.FC<TransparencyDashboardModalProps> = ({
  visible,
  onClose,
  initialPoolBalance,
}) => {
  const [period, setPeriod] = useState<PeriodType>('all_time');
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load data on mount and period change
  const loadData = useCallback(async () => {
    try {
      const dashboardData = await RewardsTransparencyService.getDashboardData(period);
      setData(dashboardData);
    } catch (error) {
      console.error('[TransparencyDashboard] Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      loadData();
    }
  }, [visible, loadData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  const handlePeriodChange = useCallback((newPeriod: PeriodType) => {
    setPeriod(newPeriod);
  }, []);

  // Calculate user/charity percentages
  const { userPercent, charityPercent } = data?.summary
    ? RewardsTransparencyService.calculateSplit(data.summary)
    : { userPercent: 0, charityPercent: 0 };

  // Get pool balance (prefer fresh data, fall back to initial)
  const poolBalance = data?.pool?.balance ?? initialPoolBalance ?? null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rewards Transparency</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.orangeBright} />
            <Text style={styles.loadingText}>Loading transparency data...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.orangeBright}
              />
            }
          >
            {/* Pool Balance Card */}
            <View style={styles.poolCard}>
              <View style={styles.poolHeader}>
                <Ionicons name="wallet-outline" size={18} color={theme.colors.orangeBright} />
                <Text style={styles.poolLabel}>Rewards Pool Balance</Text>
              </View>
              <Text style={styles.poolBalance}>
                {poolBalance !== null
                  ? `${poolBalance.toLocaleString()} sats`
                  : '-- sats'}
              </Text>
              {data?.pool?.lastUpdatedAt && (
                <Text style={styles.poolUpdated}>
                  Last updated: {new Date(data.pool.lastUpdatedAt).toLocaleString()}
                </Text>
              )}
            </View>

            {/* Period Selector */}
            <PeriodSelector selected={period} onChange={handlePeriodChange} />

            {/* Global Breakdown */}
            <GlobalBreakdownCard
              summary={data?.summary ?? null}
              userPercent={userPercent}
              charityPercent={charityPercent}
            />

            {/* Charity Leaderboard */}
            <CharityPayoutLeaderboard rankings={data?.charityLeaderboard ?? []} />

            {/* Pending Payouts */}
            <PendingPayoutsCard payouts={data?.pendingPayouts ?? []} />

            {/* Footer note */}
            <View style={styles.footer}>
              <Ionicons name="information-circle-outline" size={14} color="#555" />
              <Text style={styles.footerText}>
                Data is updated periodically by the RUNSTR rewards system
              </Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Pool card
  poolCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  poolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  poolLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  poolBalance: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
  },
  poolUpdated: {
    marginTop: 8,
    fontSize: 11,
    color: '#555',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 16,
  },
  footerText: {
    fontSize: 11,
    color: '#555',
  },
});

export default TransparencyDashboardModal;
