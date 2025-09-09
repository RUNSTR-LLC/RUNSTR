import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { CompetitorProgressBar } from '../ui/ProgressBar';
import type { ChallengeCompetitor } from '../../types';

interface CompetitorSectionProps {
  competitors: [ChallengeCompetitor, ChallengeCompetitor];
  style?: ViewStyle;
}

export const CompetitorSection: React.FC<CompetitorSectionProps> = ({
  competitors,
  style,
}) => {
  const [competitor1, competitor2] = competitors;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.vsContainer}>
        <CompetitorCard competitor={competitor1} />
        <VSDivider />
        <CompetitorCard competitor={competitor2} />
      </View>
    </View>
  );
};

interface CompetitorCardProps {
  competitor: ChallengeCompetitor;
  style?: ViewStyle;
}

export const CompetitorCard: React.FC<CompetitorCardProps> = ({
  competitor,
  style,
}) => {
  const getStatusStyle = () => {
    switch (competitor.status) {
      case 'completed':
        return styles.statusCompleted;
      case 'in_progress':
        return styles.statusInProgress;
      default:
        return styles.statusPending;
    }
  };

  const getStatusText = () => {
    switch (competitor.status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Pending';
    }
  };

  return (
    <View style={[styles.competitorCard, style]}>
      <Avatar
        name={competitor.name}
        size={60}
        style={styles.competitorAvatar}
      />
      <Text style={styles.competitorName} numberOfLines={1}>
        {competitor.name}
      </Text>
      <Text style={[styles.competitorStatus, getStatusStyle()]}>
        {getStatusText()}
      </Text>
    </View>
  );
};

interface VSDividerProps {
  style?: ViewStyle;
}

export const VSDivider: React.FC<VSDividerProps> = ({ style }) => {
  return (
    <View style={[styles.vsDivider, style]}>
      <Text style={styles.vsText}>VS</Text>
      <View style={styles.vsLine} />
    </View>
  );
};

interface ChallengeProgressSectionProps {
  competitors: [ChallengeCompetitor, ChallengeCompetitor];
  currentLeader?: ChallengeCompetitor;
  style?: ViewStyle;
}

export const ChallengeProgressSection: React.FC<
  ChallengeProgressSectionProps
> = ({ competitors, currentLeader, style }) => {
  const [competitor1, competitor2] = competitors;

  return (
    <View style={[styles.progressContainer, style]}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Current Status</Text>
        {currentLeader && (
          <View style={styles.leaderInfo}>
            <Text style={styles.leaderText}>Winner</Text>
            <Text style={styles.leaderName}>{currentLeader.name}</Text>
            <Text style={styles.leaderScore}>
              {currentLeader.progress.value}
            </Text>
            <Text style={styles.scoreUnit}>
              {currentLeader.progress.unit} completed
            </Text>
          </View>
        )}
      </View>

      <View style={styles.progressBars}>
        <CompetitorProgress competitor={competitor1} />
        <CompetitorProgress competitor={competitor2} />
      </View>
    </View>
  );
};

interface CompetitorProgressProps {
  competitor: ChallengeCompetitor;
  style?: ViewStyle;
}

export const CompetitorProgress: React.FC<CompetitorProgressProps> = ({
  competitor,
  style,
}) => {
  return (
    <View style={[styles.competitorProgress, style]}>
      <Text style={styles.progressValue}>
        {competitor.progress.value} {competitor.progress.unit}
      </Text>
      <CompetitorProgressBar progress={competitor.progress.percentage} />
      <Text style={styles.competitorNameSmall}>{competitor.name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main VS container (matches HTML mockup .vs-section)
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xxxl,
    marginBottom: theme.spacing.xxxl,
  },

  // VS layout container (matches HTML mockup .vs-container)
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Individual competitor card (matches HTML mockup .competitor)
  competitorCard: {
    flex: 1,
    alignItems: 'center',
  },

  // Competitor avatar (matches HTML mockup .competitor-avatar)
  competitorAvatar: {
    width: 60,
    height: 60,
    backgroundColor: theme.colors.syncBackground,
    borderRadius: 30,
    marginBottom: theme.spacing.lg,
  },

  // Competitor name (matches HTML mockup .competitor-name)
  competitorName: {
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },

  // Base competitor status (matches HTML mockup .competitor-status)
  competitorStatus: {
    fontSize: theme.typography.eventDetails,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.spacing.sm,
  },

  // Completed status (matches HTML mockup .competitor-status.completed)
  statusCompleted: {
    color: theme.colors.text,
    backgroundColor: theme.colors.syncBackground,
  },

  // In progress status
  statusInProgress: {
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.border,
  },

  // Pending status
  statusPending: {
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.border,
  },

  // VS divider (matches HTML mockup .vs-divider)
  vsDivider: {
    alignItems: 'center',
    marginHorizontal: theme.spacing.xxxl,
  },

  // VS text (matches HTML mockup .vs-text)
  vsText: {
    fontSize: theme.typography.leaderboardTitle,
    fontWeight: theme.typography.weights.extraBold,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },

  // VS line (matches HTML mockup .vs-line)
  vsLine: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.syncBackground,
  },

  // Progress section container
  progressContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xxl,
    marginBottom: theme.spacing.xxxl,
  },

  progressHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },

  progressTitle: {
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },

  // Leader info (matches HTML mockup .current-leader)
  leaderInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },

  leaderText: {
    fontSize: theme.typography.prizeCurrency,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },

  leaderName: {
    fontSize: theme.typography.leaderboardTitle,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  leaderScore: {
    fontSize: theme.typography.prizeNumber,
    fontWeight: theme.typography.weights.extraBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  scoreUnit: {
    fontSize: theme.typography.prizeCurrency,
    color: theme.colors.textMuted,
  },

  // Progress bars container (matches HTML mockup .progress-container)
  progressBars: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    alignItems: 'center',
  },

  // Individual competitor progress (matches HTML mockup .competitor-progress)
  competitorProgress: {
    flex: 1,
    alignItems: 'center',
  },

  // Progress value text
  progressValue: {
    fontSize: theme.typography.aboutText,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  // Small competitor name under progress bar
  competitorNameSmall: {
    fontSize: theme.typography.eventDetails,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
