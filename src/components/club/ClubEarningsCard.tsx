/**
 * ClubEarningsCard - Captain-only card showing club revenue
 *
 * Displays earnings from 10-sat per workout rewards routed to the club's
 * Lightning address. Shows weekly/all-time totals, active members, and
 * the destination Lightning address. Only rendered when current user is
 * the club captain.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { ClubService, ClubEarnings } from '../../services/backend/ClubService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClubEarningsCardProps {
  clubId: string;
  lightningAddress: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ClubEarningsCardComponent: React.FC<ClubEarningsCardProps> = ({
  clubId,
  lightningAddress,
}) => {
  const [earnings, setEarnings] = useState<ClubEarnings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadEarnings = useCallback(async () => {
    try {
      const data = await ClubService.getClubEarnings(clubId);
      setEarnings(data);
    } catch (err) {
      console.error('[ClubEarningsCard] Error loading earnings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accent} size="small" />
        </View>
      </View>
    );
  }

  if (!earnings) {
    return null;
  }

  const hasWeeklyActivity = earnings.weeklyWorkouts > 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons name="flash" size={18} color={theme.colors.accent} />
        <Text style={styles.headerTitle}>Club Earnings</Text>
      </View>

      {/* Big weekly number */}
      <Text style={styles.bigNumber}>
        {earnings.weeklyEarnings.toLocaleString()} sats
      </Text>
      <Text style={styles.bigLabel}>this week</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{earnings.todayActiveMembers}</Text>
          <Text style={styles.statLabel}>active today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{earnings.weeklyActiveMembers}</Text>
          <Text style={styles.statLabel}>active this week</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{earnings.weeklyWorkouts}</Text>
          <Text style={styles.statLabel}>workouts</Text>
        </View>
      </View>

      {/* All-time */}
      <View style={styles.allTimeRow}>
        <Ionicons
          name="trending-up"
          size={14}
          color={theme.colors.textMuted}
        />
        <Text style={styles.allTimeText}>
          All-time: {earnings.allTimeEarnings.toLocaleString()} sats ({earnings.allTimeWorkouts} workouts)
        </Text>
      </View>

      {/* Lightning address */}
      {lightningAddress ? (
        <View style={styles.addressRow}>
          <Ionicons
            name="wallet-outline"
            size={13}
            color={theme.colors.textDark}
          />
          <Text style={styles.addressText} numberOfLines={1}>
            Earnings sent to: {lightningAddress}
          </Text>
        </View>
      ) : (
        <View style={styles.addressRow}>
          <Ionicons
            name="warning-outline"
            size={13}
            color={theme.colors.warning}
          />
          <Text style={[styles.addressText, styles.warningText]}>
            No Lightning address set -- add one in club settings
          </Text>
        </View>
      )}

      {/* Empty state hint */}
      {!hasWeeklyActivity && (
        <Text style={styles.emptyHint}>
          Members earn 10 sats for the club with each workout
        </Text>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  bigNumber: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  bigLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.border,
  },
  allTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  allTimeText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    fontSize: 12,
    color: theme.colors.textDark,
    flex: 1,
  },
  warningText: {
    color: theme.colors.warning,
  },
  emptyHint: {
    fontSize: 12,
    color: theme.colors.textDark,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 12,
  },
});

export const ClubEarningsCard = React.memo(ClubEarningsCardComponent);
export default ClubEarningsCard;
