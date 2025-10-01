/**
 * ChallengeReviewStep - Final review before sending challenge
 * Third and final step in global challenge creation wizard
 * Displays complete challenge summary with edit options
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { theme } from '../../../styles/theme';
import type { DiscoveredNostrUser } from '../../../services/user/UserDiscoveryService';
import type { ActivityConfiguration } from '../../../types/challenge';
import { ACTIVITY_METRICS } from '../../../types/challenge';

interface ChallengeReviewStepProps {
  opponent: DiscoveredNostrUser;
  configuration: ActivityConfiguration;
  onEditOpponent?: () => void;
  onEditConfiguration?: () => void;
}

export const ChallengeReviewStep: React.FC<ChallengeReviewStepProps> = ({
  opponent,
  configuration,
  onEditOpponent,
  onEditConfiguration,
}) => {
  const getMetricLabel = () => {
    const metricOptions = ACTIVITY_METRICS[configuration.activityType];
    const metric = metricOptions?.find((m) => m.value === configuration.metric);
    return metric ? `${metric.label} (${metric.unit})` : configuration.metric;
  };

  const getActivityLabel = () => {
    return configuration.activityType.charAt(0).toUpperCase() + configuration.activityType.slice(1);
  };

  const opponentDisplayName =
    opponent.displayName || opponent.name || opponent.npub.slice(0, 16);
  const opponentAvatarText = opponentDisplayName.charAt(0).toUpperCase();

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + configuration.duration);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Opponent Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Opponent</Text>
          {onEditOpponent && (
            <TouchableOpacity onPress={onEditOpponent} style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.opponentCard}>
          <View style={styles.opponentAvatar}>
            {opponent.picture ? (
              <Image source={{ uri: opponent.picture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{opponentAvatarText}</Text>
            )}
          </View>

          <View style={styles.opponentInfo}>
            <Text style={styles.opponentName}>{opponentDisplayName}</Text>
            {opponent.nip05 && (
              <Text style={styles.opponentNip05}>{opponent.nip05}</Text>
            )}
            <View style={styles.activityBadge}>
              <Text style={styles.activityBadgeText}>
                {opponent.activityStatus === 'active'
                  ? 'Active'
                  : opponent.activityStatus === 'inactive'
                  ? 'Inactive'
                  : 'New'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Challenge Details Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Challenge Details</Text>
          {onEditConfiguration && (
            <TouchableOpacity onPress={onEditConfiguration} style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Activity</Text>
            <Text style={styles.detailValue}>{getActivityLabel()}</Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Metric</Text>
            <Text style={styles.detailValue}>{getMetricLabel()}</Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>
              {configuration.duration} days
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start Date</Text>
            <Text style={styles.detailValue}>
              {startDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>End Date</Text>
            <Text style={styles.detailValue}>
              {endDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Wager Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Wager</Text>

        <View style={styles.wagerCard}>
          <View style={styles.wagerRow}>
            <Text style={styles.wagerLabel}>You stake</Text>
            <Text style={styles.wagerAmount}>
              {configuration.wagerAmount.toLocaleString()} sats
            </Text>
          </View>

          <View style={styles.wagerDivider} />

          <View style={styles.wagerRow}>
            <Text style={styles.wagerLabel}>{opponentDisplayName} stakes</Text>
            <Text style={styles.wagerAmount}>
              {configuration.wagerAmount.toLocaleString()} sats
            </Text>
          </View>

          <View style={styles.wagerDivider} />

          <View style={styles.wagerRow}>
            <Text style={styles.wagerTotalLabel}>Winner takes</Text>
            <Text style={styles.wagerTotalAmount}>
              {(configuration.wagerAmount * 2).toLocaleString()} sats
            </Text>
          </View>
        </View>
      </View>

      {/* Summary Section */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryLabel}>Challenge Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            You're challenging <Text style={styles.summaryHighlight}>{opponentDisplayName}</Text> to
            a {configuration.duration}-day{' '}
            <Text style={styles.summaryHighlight}>{getActivityLabel().toLowerCase()}</Text> competition
            measuring <Text style={styles.summaryHighlight}>{getMetricLabel()}</Text>.
          </Text>
          <Text style={styles.summarySubtext}>
            The challenge starts immediately upon acceptance and runs for {configuration.duration}{' '}
            days. Winner takes all {(configuration.wagerAmount * 2).toLocaleString()} sats.
          </Text>
        </View>
      </View>

      {/* Warning */}
      <View style={styles.warningSection}>
        <Text style={styles.warningText}>
          Once sent, this challenge cannot be cancelled. Make sure all details are correct before
          proceeding.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  opponentCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  opponentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
  },
  opponentInfo: {
    flex: 1,
  },
  opponentName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  opponentNip05: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  activityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 6,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  detailsCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  wagerCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
  },
  wagerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  wagerLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  wagerAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  wagerDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  wagerTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  wagerTotalAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 20,
  },
  summaryText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  summaryHighlight: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  summarySubtext: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  warningSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    borderRadius: 12,
  },
  warningText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
});
