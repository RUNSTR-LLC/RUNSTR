/**
 * RewardHistoryScreen — Reward transaction ledger.
 *
 * Replaces the History bottom-tab content as part of the rewards-first
 * navigation simplification (see
 * docs/superpowers/specs/2026-05-05-rewards-first-navigation-design.md).
 *
 * Shows a per-payment list of successful reward payouts, grouped by
 * date, with a monthly-total headline at the top. Tap a row to expand
 * inline showing payment metadata (timestamp, paid-to, payment hash).
 *
 * Reads from reward_payments via SupabaseRewardService.getPaymentHistory.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { SupabaseRewardService } from '../services/rewards/SupabaseRewardService';
import type { PaymentRecord } from '../services/rewards/SupabaseRewardService';
import { rewardLabel } from './rewardLabel';

interface RewardSection {
  title: string;
  data: PaymentRecord[];
}

const formatDateHeader = (date: Date, today: Date): string => {
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'TODAY';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, yesterday)) return 'YESTERDAY';

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
};

const startOfCurrentMonth = (): number => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const groupByDate = (payments: PaymentRecord[]): RewardSection[] => {
  const today = new Date();
  const sections = new Map<string, PaymentRecord[]>();
  for (const p of payments) {
    const d = p.paid_at ? new Date(p.paid_at) : new Date();
    const key = formatDateHeader(d, today);
    const arr = sections.get(key) ?? [];
    arr.push(p);
    sections.set(key, arr);
  }
  return Array.from(sections.entries()).map(([title, data]) => ({ title, data }));
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const truncateMiddle = (s: string, head = 8, tail = 6): string => {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
};

interface RewardRowProps {
  payment: PaymentRecord;
  expanded: boolean;
  onToggle: () => void;
}

const RewardRow: React.FC<RewardRowProps> = ({ payment, expanded, onToggle }) => {
  const { label, icon } = rewardLabel(payment.reward_type, payment.metadata);
  const time = formatTime(payment.paid_at);

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${payment.amount_sats} sats, tap for details`}
    >
      <View style={styles.rowMain}>
        <Ionicons
          name={icon}
          size={20}
          color={theme.colors.text}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.rowAmount}>+{payment.amount_sats} sats</Text>
      </View>
      {expanded && (
        <View style={styles.rowDetails}>
          <Text style={styles.detailText}>Earned at {time}</Text>
          {payment.lightning_address ? (
            <Text style={styles.detailText} numberOfLines={1}>
              Paid to {payment.lightning_address}
            </Text>
          ) : null}
          {payment.payment_hash ? (
            <Text style={styles.detailText} numberOfLines={1}>
              Hash {truncateMiddle(payment.payment_hash)}
            </Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const RewardHistoryScreen: React.FC = () => {
  const [pubkey, setPubkey] = useState<string>('');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  // Load pubkey once on mount
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem('@runstr:hex_pubkey')
      .then((value) => {
        if (!cancelled && value) setPubkey(value);
        else if (!cancelled) setIsLoading(false);
      })
      .catch(() => { if (!cancelled) setIsLoading(false); });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPayments = useCallback(
    async (currentPubkey: string) => {
      if (!currentPubkey) {
        setPayments([]);
        setIsLoading(false);
        return;
      }
      try {
        const all = await SupabaseRewardService.getPaymentHistory(currentPubkey);
        const successOnly = all.filter((p: PaymentRecord) => p.status === 'success');
        setPayments(successOnly);
      } catch (err) {
        console.warn('[RewardHistoryScreen] getPaymentHistory failed:', err);
        setPayments([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (!pubkey) return;
      if (!hasLoadedOnceRef.current) setIsLoading(true);
      loadPayments(pubkey).finally(() => {
        hasLoadedOnceRef.current = true;
      });
    }, [pubkey, loadPayments]),
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPayments(pubkey);
  }, [pubkey, loadPayments]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const monthlyTotal = useMemo(() => {
    const start = startOfCurrentMonth();
    return payments
      .filter((p) => new Date(p.paid_at).getTime() >= start)
      .reduce((sum, p) => sum + p.amount_sats, 0);
  }, [payments]);

  const sections = useMemo(() => groupByDate(payments), [payments]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TexturedBackground edges={[]}>
        <View style={styles.header}>
          <Text style={styles.headerNumber}>{monthlyTotal.toLocaleString()}</Text>
          <Text style={styles.headerSubtitle}>sats this month</Text>
        </View>

        {isLoading && payments.length === 0 ? (
          <View style={styles.centerArea}>
            <ActivityIndicator size="large" color={theme.colors.text} />
          </View>
        ) : payments.length === 0 ? (
          <View style={styles.centerArea}>
            <Text style={styles.emptyText}>
              Complete a cardio workout to earn your first reward.
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RewardRow
                payment={item}
                expanded={expandedId === item.id}
                onToggle={() => handleToggle(item.id)}
              />
            )}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            )}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.text}
              />
            }
          />
        )}
      </TexturedBackground>
    </SafeAreaView>
  );
};

export default RewardHistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  headerNumber: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
  },
  headerSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: theme.typography.weights.regular,
    marginTop: 2,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.regular,
  },
  rowAmount: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
  rowDetails: {
    paddingLeft: 32,
    paddingTop: 8,
  },
  detailText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.regular,
    marginTop: 2,
  },
});
