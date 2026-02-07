/**
 * GlobalBreakdownCard - Shows user vs charity payment split
 *
 * Displays:
 * - Visual bar showing percentage split
 * - Sats sent to users vs charities
 * - Failed payment count (summary only)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { RewardsSummary } from '../../types/transparencyDashboard';

interface GlobalBreakdownCardProps {
  summary: RewardsSummary | null;
  userPercent: number;
  charityPercent: number;
}

export const GlobalBreakdownCard: React.FC<GlobalBreakdownCardProps> = ({
  summary,
  userPercent,
  charityPercent,
}) => {
  const hasData = summary && summary.totalPaidSats > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="pie-chart-outline" size={18} color={theme.colors.orangeBright} />
        <Text style={styles.title}>Payment Distribution</Text>
      </View>

      {hasData ? (
        <>
          {/* Visual progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressUser, { flex: userPercent || 1 }]}
              />
              <View
                style={[styles.progressCharity, { flex: charityPercent || 1 }]}
              />
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotUser]} />
              <Text style={styles.legendLabel}>Athletes</Text>
              <Text style={styles.legendValue}>
                {summary!.directToUsersSats.toLocaleString()} sats ({userPercent}%)
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotCharity]} />
              <Text style={styles.legendLabel}>Charities</Text>
              <Text style={styles.legendValue}>
                {summary!.donatedToCharitySats.toLocaleString()} sats ({charityPercent}%)
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{summary!.totalRecipients.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Recipients</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.stat}>
              <Text style={styles.statValue}>{summary!.totalPaidSats.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Sats</Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="hourglass-outline" size={32} color="#444" />
          <Text style={styles.emptyText}>No data yet</Text>
          <Text style={styles.emptySubtext}>Payment data will appear here once available</Text>
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
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  // Progress bar
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressUser: {
    backgroundColor: '#FF9D42', // Orange for users
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  progressCharity: {
    backgroundColor: '#CC7A33', // Muted orange for charities
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },

  // Legend
  legend: {
    gap: 10,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDotUser: {
    backgroundColor: '#FF9D42',
  },
  legendDotCharity: {
    backgroundColor: '#CC7A33', // Muted orange for charities
  },
  legendLabel: {
    fontSize: 13,
    color: '#888',
    flex: 1,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#1a1a1a',
  },
  statValue: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
    marginBottom: 2,
  },
  statValueMuted: {
    color: '#666',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
});

export default GlobalBreakdownCard;
