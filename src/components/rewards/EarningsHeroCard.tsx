/**
 * EarningsHeroCard Component
 * Hero card for users WITH lightning address showing earnings breakdown
 *
 * Displays:
 * - Total sats earned (big hero number)
 * - Split between user and charity with checkmarks
 * - Pending amounts if any
 * - Workout count source
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { theme } from '../../styles/theme';
import { SupabaseRewardService, RewardBreakdown } from '../../services/rewards/SupabaseRewardService';

interface EarningsHeroCardProps {
  pubkey: string;
}

export const EarningsHeroCard: React.FC<EarningsHeroCardProps> = ({ pubkey }) => {
  const { t } = useTranslation('rewards');
  const [breakdown, setBreakdown] = useState<RewardBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
      setHasError(false);
      const data = await SupabaseRewardService.getRewardBreakdown(pubkey);
      setBreakdown(data);
    } catch (error) {
      console.error('[EarningsHeroCard] Failed to load breakdown:', error);
      setHasError(true);
      Toast.show({
        type: 'error',
        text1: 'Failed to load earnings',
        text2: 'Pull down to retry',
        position: 'bottom',
        visibilityTime: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalEarned = breakdown
    ? breakdown.sentToUser + breakdown.sentToCharity + breakdown.pendingToCharity
    : 0;

  if (isLoading && !breakdown) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  if (hasError && !breakdown) {
    return (
      <View style={styles.container}>
        <Text style={styles.headerTitle}>
          {t('earningsHero.title', 'YOUR EARNINGS')}
        </Text>
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={40} color="#444" />
          <Text style={styles.emptyText}>
            Could not load earnings. Pull down to retry.
          </Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (!breakdown || totalEarned === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.headerTitle}>
          {t('earningsHero.title', 'YOUR EARNINGS')}
        </Text>
        <View style={styles.emptyState}>
          <Ionicons
            name="flash-outline"
            size={40}
            color="#444"
          />
          <Text style={styles.emptyText}>
            {t('earningsHero.noEarningsYet', 'Complete workouts to earn sats!')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>
        {t('earningsHero.title', 'YOUR EARNINGS')}
      </Text>

      {/* Hero Number */}
      <View style={styles.heroSection}>
        <View style={styles.heroRow}>
          <Ionicons name="flash" size={28} color={theme.colors.orangeBright} />
          <Text style={styles.heroNumber}>
            {totalEarned.toLocaleString()}
          </Text>
          <Text style={styles.heroUnit}>sats</Text>
        </View>
        <Text style={styles.heroLabel}>
          {t('earningsHero.totalEarned', 'total earned')}
        </Text>
      </View>

      {/* Split Boxes */}
      <View style={styles.splitContainer}>
        {/* To You */}
        <View style={styles.splitBox}>
          <Text style={styles.splitAmount}>
            {(breakdown.sentToUser || 0).toLocaleString()}
          </Text>
          <Text style={styles.splitLabel}>
            {t('earningsHero.toYou', 'to you')}
          </Text>
          <Ionicons name="checkmark-circle" size={18} color="#FF9D42" style={styles.splitIcon} />
        </View>

        {/* Divider */}
        <View style={styles.splitDivider} />

        {/* To Charity */}
        <View style={styles.splitBox}>
          <Text style={styles.splitAmount}>
            {(breakdown.sentToCharity || 0).toLocaleString()}
          </Text>
          <Text style={styles.splitLabel}>
            {t('earningsHero.toCharity', 'to charity')}
          </Text>
          <Ionicons name="checkmark-circle" size={18} color="#FF9D42" style={styles.splitIcon} />
        </View>
      </View>

      {/* Footer info */}
      <View style={styles.footerSection}>
        {/* Pending if any */}
        {(breakdown.pendingToCharity || 0) > 0 && (
          <View style={styles.pendingRow}>
            <Ionicons name="time" size={14} color="#FF9D42" />
            <Text style={styles.pendingText}>
              {breakdown.pendingToCharity.toLocaleString()} {t('earningsHero.pendingToCharity', 'sats pending to charity')}
            </Text>
          </View>
        )}

        {/* Workout count */}
        <Text style={styles.workoutCount}>
          {t('earningsHero.fromWorkouts', 'From {{count}} workouts', {
            count: breakdown.paymentCount || 0,
          })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    marginBottom: 12,
  },

  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
    letterSpacing: 1,
    marginBottom: 16,
  },

  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },

  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },

  heroNumber: {
    fontSize: 42,
    fontWeight: theme.typography.weights.extraBold,
    color: '#FFB366',
  },

  heroUnit: {
    fontSize: 20,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FFB366',
  },

  heroLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },

  splitContainer: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },

  splitBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },

  splitDivider: {
    width: 1,
    backgroundColor: '#1a1a1a',
  },

  splitAmount: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  splitLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },

  splitIcon: {
    marginTop: 2,
  },

  footerSection: {
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },

  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  pendingText: {
    fontSize: 12,
    color: '#FF9D42',
  },

  workoutCount: {
    fontSize: 12,
    color: '#666',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },

  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
