/**
 * EarningsHeroCard Component
 * Hero card for users WITH lightning address showing earnings breakdown
 *
 * Displays:
 * - Total rewards earned (big hero number)
 * - Split between user and charity with checkmarks
 * - Pending amounts if any
 * - Workout count source
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { theme } from '../../styles/theme';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Skeleton } from '../ui/LoadingStates';
import { SupabaseRewardService, DestinationEarning } from '../../services/rewards/SupabaseRewardService';

interface EarningsHeroCardProps {
  pubkey: string;
  isPPQ?: boolean;
}

export const EarningsHeroCard: React.FC<EarningsHeroCardProps> = ({ pubkey }) => {
  const { t } = useTranslation('rewards');
  const [destinations, setDestinations] = useState<DestinationEarning[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadDestinations();
  }, [pubkey]);

  // Reload data when screen regains focus
  useFocusEffect(
    useCallback(() => {
      if (pubkey) {
        loadDestinations();
      }
    }, [pubkey])
  );

  const loadDestinations = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await SupabaseRewardService.getEarningsByDestination(pubkey);
      setDestinations(data);
      setTotalEarned(data.reduce((sum, d) => sum + d.totalSats, 0));
    } catch (error) {
      console.error('[EarningsHeroCard] Failed to load destinations:', error);
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

  if (isLoading && destinations.length === 0) {
    return (
      <View style={styles.container}>
        <Skeleton width={120} height={12} style={{ marginBottom: 16 }} />
        <View style={styles.heroSection}>
          <Skeleton width={180} height={42} borderRadius={6} style={{ marginBottom: 8 }} />
          <Skeleton width={90} height={14} />
        </View>
        <View style={styles.destinationList}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.destinationRow}>
              <Skeleton width={32} height={32} borderRadius={16} />
              <Skeleton width={120} height={14} style={{ flex: 1 }} />
              <Skeleton width={70} height={14} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (hasError && destinations.length === 0) {
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
  if (totalEarned === 0) {
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
            {t('earningsHero.noEarningsYet', 'Complete workouts to earn rewards!')}
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
          <AnimatedNumber
            value={totalEarned}
            style={styles.heroNumber}
            animateOnMount
          />
          <Text style={styles.heroUnit}>rewards</Text>
        </View>
        <Text style={styles.heroLabel}>
          {t('earningsHero.totalEarned', 'total earned')}
        </Text>
      </View>

      {/* Destination Breakdown */}
      <View style={styles.destinationList}>
        {destinations.map((dest) => (
          <View key={dest.id} style={styles.destinationRow}>
            {dest.imageSource ? (
              <Image source={dest.imageSource} style={styles.destAvatar} />
            ) : dest.avatarUrl ? (
              <Image source={{ uri: dest.avatarUrl }} style={styles.destAvatar} />
            ) : (
              <View style={[styles.destAvatar, styles.destAvatarPlaceholder]} />
            )}
            <Text style={styles.destName} numberOfLines={1}>{dest.name}</Text>
            <Text style={styles.destAmount}>{dest.totalSats.toLocaleString()} rewards</Text>
          </View>
        ))}
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

  destinationList: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 12,
  },

  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },

  destAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  destAvatarPlaceholder: {
    backgroundColor: '#333',
  },

  destName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },

  destAmount: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
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
