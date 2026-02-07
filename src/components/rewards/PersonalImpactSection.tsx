/**
 * PersonalImpactSection Component
 * Displays user's charity impact from workout rewards
 *
 * Features:
 * - Total sats donated to charities via workout rewards
 * - Number of charities supported
 * - Breakdown by charity (name + amount)
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/theme';
import { DonationTrackingService } from '../../services/donation/DonationTrackingService';
import { SupabaseRewardService, CharityPaymentSummary } from '../../services/rewards/SupabaseRewardService';

interface CharityBreakdownItem {
  charityId: string;
  charityName: string;
  total: number;
  count: number;
  status?: 'success' | 'pending' | 'partial';
  isGeyser?: boolean;
}

interface PersonalImpactSectionProps {
  pubkey: string;
  defaultExpanded?: boolean;
}

export const PersonalImpactSection: React.FC<PersonalImpactSectionProps> = ({
  pubkey,
  defaultExpanded = true,
}) => {
  const { t } = useTranslation('rewards');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [charityBreakdown, setCharityBreakdown] = useState<CharityBreakdownItem[]>([]);
  const [totalDonated, setTotalDonated] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [pubkey]);

  // Reload data when screen regains focus (e.g., after completing workout)
  useFocusEffect(
    useCallback(() => {
      if (pubkey) {
        loadData();
      }
    }, [pubkey])
  );

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Get all charity donations from local storage
      const allDonations = await DonationTrackingService.getAllCharityDonations();

      // Filter to this user's donations
      const userDonations = allDonations.filter(d => d.donorPubkey === pubkey);

      // Get verified payment status from Supabase
      const rewardBreakdown = await SupabaseRewardService.getRewardBreakdown(pubkey);
      const charityPaymentStatus = new Map<string, CharityPaymentSummary>();
      for (const item of rewardBreakdown.charityBreakdown) {
        charityPaymentStatus.set(item.charityId, item);
      }

      // Aggregate by charity
      const charityMap = new Map<string, CharityBreakdownItem>();
      for (const donation of userDonations) {
        const existing = charityMap.get(donation.charityId);
        const paymentInfo = charityPaymentStatus.get(donation.charityId);

        if (existing) {
          existing.total += donation.amount;
          existing.count += 1;
        } else {
          charityMap.set(donation.charityId, {
            charityId: donation.charityId,
            charityName: donation.charityName,
            total: donation.amount,
            count: 1,
            status: paymentInfo?.status || 'success',
            isGeyser: paymentInfo?.isGeyser || SupabaseRewardService.isGeyserCharity(donation.charityId),
          });
        }
      }

      // Sort by amount descending
      const breakdown = Array.from(charityMap.values())
        .sort((a, b) => b.total - a.total);

      setCharityBreakdown(breakdown);
      setTotalDonated(userDonations.reduce((sum, d) => sum + d.amount, 0));
    } catch (error) {
      console.error('[PersonalImpactSection] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const charitiesSupported = charityBreakdown.length;

  return (
    <View style={styles.container}>
      {/* Header - tap to expand/collapse */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.headerTitle}>{t('yourImpact')}</Text>
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
          ) : totalDonated > 0 ? (
            <>
              {/* Summary Stats */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {totalDonated.toLocaleString()}
                  </Text>
                  <Text style={styles.summaryLabel}>{t('satsDonated')}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{charitiesSupported}</Text>
                  <Text style={styles.summaryLabel}>{charitiesSupported === 1 ? t('charity') : t('charities')}</Text>
                </View>
              </View>

              {/* Charity Breakdown */}
              <View style={styles.breakdownSection}>
                <Text style={styles.breakdownTitle}>{t('charitiesSupported')}</Text>
                {charityBreakdown.map((item, index) => (
                  <View key={item.charityId} style={styles.charityRow}>
                    <View style={styles.charityInfo}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      </View>
                      <View style={styles.charityDetails}>
                        <View style={styles.charityNameRow}>
                          <Text style={styles.charityName} numberOfLines={1}>
                            {item.charityName}
                          </Text>
                          {item.status === 'pending' && item.isGeyser && (
                            <View style={styles.pendingBadge}>
                              <Ionicons name="time" size={10} color="#FF9D42" />
                              <Text style={styles.pendingText}>
                                {t('pending', 'Pending')}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.donationCount}>
                          {item.count} {item.count === 1 ? t('donation') : t('donations')}
                        </Text>
                      </View>
                    </View>
                    <Text style={item.status === 'pending' ? styles.charityAmountPending : styles.charityAmount}>
                      {item.total.toLocaleString()} sats
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={24} color="#444" />
              <Text style={styles.emptyText}>
                {t('noCharityImpactYet')}
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

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  headerTitle: {
    fontSize: 13,
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

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryValue: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: '#FFB366',
    marginBottom: 4,
  },

  summaryLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: theme.typography.weights.medium,
  },

  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#1a1a1a',
  },

  breakdownSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },

  breakdownTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: '#666',
    marginBottom: 12,
  },

  charityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },

  charityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a1510',
    borderWidth: 1,
    borderColor: '#2a2010',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  rankText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
  },

  charityDetails: {
    flex: 1,
  },

  charityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },

  charityName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 157, 66, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },

  pendingText: {
    fontSize: 9,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FF9D42',
  },

  donationCount: {
    fontSize: 11,
    color: '#666',
  },

  charityAmount: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FFB366',
  },

  charityAmountPending: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FF9D42',
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
