/**
 * ImpactHeroCard Component
 * Hero card for users WITHOUT lightning address showing donation impact
 *
 * Displays:
 * - Total sats donated (big hero number)
 * - Ranked list of charities supported
 * - Workout count source
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/theme';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Skeleton } from '../ui/LoadingStates';
import { SupabaseRewardService, RewardBreakdown } from '../../services/rewards/SupabaseRewardService';
import { getCharityById } from '../../constants/charities';

interface ImpactHeroCardProps {
  pubkey: string;
}

export const ImpactHeroCard: React.FC<ImpactHeroCardProps> = ({ pubkey }) => {
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
      console.error('[ImpactHeroCard] Failed to load breakdown:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Total donated = sent to charity + pending to charity
  const totalDonated = breakdown
    ? breakdown.sentToCharity + breakdown.pendingToCharity
    : 0;

  // Sort charity breakdown by amount descending
  const sortedCharities = breakdown?.charityBreakdown
    ? [...breakdown.charityBreakdown].sort((a, b) => b.amount - a.amount)
    : [];

  const charitiesCount = sortedCharities.length;

  if (isLoading && !breakdown) {
    return (
      <View style={styles.container}>
        <Skeleton width={120} height={12} style={{ marginBottom: 16 }} />
        <View style={styles.heroSection}>
          <Skeleton width={180} height={42} borderRadius={6} style={{ marginBottom: 8 }} />
          <Skeleton width={90} height={14} />
        </View>
        <View style={styles.charitiesSection}>
          <Skeleton width={140} height={12} style={{ marginBottom: 12 }} />
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.charityRow, { justifyContent: 'space-between' }]}>
              <Skeleton width={160} height={14} />
              <Skeleton width={80} height={14} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (hasError && !breakdown) {
    return (
      <View style={styles.container}>
        <Text style={styles.headerTitle}>
          {t('impactHero.title', 'YOUR IMPACT')}
        </Text>
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={40} color="#444" />
          <Text style={styles.emptyText}>
            {t('impactHero.errorLoading', 'Could not load impact data.')}
          </Text>
          <TouchableOpacity onPress={loadBreakdown} style={styles.retryButton}>
            <Ionicons name="refresh" size={16} color={theme.colors.text} />
            <Text style={styles.retryText}>
              {t('impactHero.retry', 'Retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Empty state — compact single row
  if (!breakdown || totalDonated === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={18} color="#444" />
        <Text style={styles.emptyInlineText}>
          {t('impactHero.noImpactYet', 'Complete workouts to earn rewards!')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>
        {t('impactHero.title', 'YOUR IMPACT')}
      </Text>

      {/* Hero Number */}
      <View style={styles.heroSection}>
        <View style={styles.heroRow}>
          <Ionicons name="gift" size={28} color={theme.colors.orangeBright} />
          <AnimatedNumber
            value={totalDonated}
            style={styles.heroNumber}
            animateOnMount
          />
          <Text style={styles.heroUnit}>sats</Text>
        </View>
        <Text style={styles.heroLabel}>
          {t('impactHero.donated', 'donated')}
        </Text>
      </View>

      {/* Charities Supported */}
      {charitiesCount > 0 && (
        <View style={styles.charitiesSection}>
          <Text style={styles.sectionTitle}>
            {t('impactHero.supporting', 'Supporting {{count}} {{charity}}', {
              count: charitiesCount,
              charity: charitiesCount === 1 ? 'charity' : 'charities',
            })}:
          </Text>

          <View style={styles.charityList}>
            {sortedCharities.slice(0, 5).map((item, index) => {
              const charity = getCharityById(item.charityId);
              const charityName = charity?.name || item.charityId;

              return (
                <View key={item.charityId} style={styles.charityRow}>
                  <View style={styles.charityLeft}>
                    <Text style={styles.charityRank}>#{index + 1}</Text>
                    <Text style={styles.charityName} numberOfLines={1}>
                      {charityName}
                    </Text>
                  </View>
                  <View style={styles.charityRight}>
                    <Text style={item.status === 'pending' ? styles.amountPending : styles.amount}>
                      {item.amount.toLocaleString()} sats
                    </Text>
                    {item.status === 'pending' && (
                      <Ionicons name="time" size={12} color="#FF9D42" />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footerSection}>
        <Text style={styles.workoutCount}>
          {t('impactHero.fromWorkouts', 'From {{count}} workouts', {
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

  charitiesSection: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 14,
  },

  sectionTitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },

  charityList: {
    gap: 8,
  },

  charityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },

  charityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },

  charityRank: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
    width: 24,
  },

  charityName: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },

  charityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  amount: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FFB366',
  },

  amountPending: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FF9D42',
  },

  footerSection: {
    alignItems: 'center',
    marginTop: 16,
  },

  workoutCount: {
    fontSize: 12,
    color: '#666',
  },

  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 14,
    marginBottom: 12,
  },

  emptyInlineText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
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

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },

  retryText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
});
