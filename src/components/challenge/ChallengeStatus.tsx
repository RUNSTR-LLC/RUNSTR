/**
 * ChallengeStatus Component - Challenge current status and progress section
 * Matches HTML mockup: status-section, current-leader, progress-container
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { ChallengeCompetitor } from '../../types';

export interface CompetitorProgress {
  id: string;
  name: string;
  value: string; // "5.2 km", "23:45", etc.
  progressPercentage: number; // 0-100
}

export interface ChallengeStatusProps {
  winner?: ChallengeCompetitor;
  scoreUnit?: string; // "km completed", "minutes", etc.
  competitors?: [ChallengeCompetitor, ChallengeCompetitor];
  progress?: any; // Additional props from screen
  isCompleted?: boolean;
}

export const ChallengeStatus: React.FC<ChallengeStatusProps> = ({
  winner,
  scoreUnit,
  competitors,
}) => {
  return (
    <View style={styles.container}>
      {/* Status Title */}
      <Text style={styles.statusTitle}>Current Status</Text>

      {/* Current Leader */}
      {winner && (
        <View style={styles.currentLeader}>
          <Text style={styles.leaderText}>Winner</Text>
          <Text style={styles.leaderName}>{winner.name}</Text>
          <Text style={styles.leaderScore}>{winner.progress.value}</Text>
          <Text style={styles.scoreUnit}>{winner.progress.unit}</Text>
        </View>
      )}

      {/* Progress Container */}
      <View style={styles.progressContainer}>
        {competitors &&
          competitors.map((competitor, index) => (
            <View key={competitor.id} style={styles.competitorProgress}>
              <Text style={styles.progressValue}>
                {competitor.progress.value} {competitor.progress.unit}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${competitor.progress.percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.competitorNameSmall}>{competitor.name}</Text>
            </View>
          ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Container - exact CSS: background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; padding: 16px; margin-bottom: 20px;
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: 16,
    marginBottom: 20,
  },
  // Status title - exact CSS: font-size: 16px; font-weight: 600; margin-bottom: 12px; text-align: center;
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  // Current leader - exact CSS: text-align: center; margin-bottom: 12px;
  currentLeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  // Leader text - exact CSS: font-size: 12px; color: #666; margin-bottom: 4px;
  leaderText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  // Leader name - exact CSS: font-size: 18px; font-weight: 700;
  leaderName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  // Leader score - exact CSS: font-size: 24px; font-weight: 800; margin-bottom: 2px;
  leaderScore: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 2,
  },
  // Score unit - exact CSS: font-size: 12px; color: #666;
  scoreUnit: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  // Progress container - exact CSS: display: flex; gap: 12px; align-items: center;
  progressContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  // Competitor progress - exact CSS: flex: 1; display: flex; flex-direction: column; align-items: center;
  competitorProgress: {
    flex: 1,
    alignItems: 'center',
  },
  // Progress value - exact CSS: font-size: 14px; font-weight: 600; margin-bottom: 4px;
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  // Progress bar - exact CSS: width: 100%; height: 6px; background: #1a1a1a; border-radius: 3px; overflow: hidden; margin-bottom: 4px;
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  // Progress fill - exact CSS: height: 100%; background: #fff; transition: width 0.3s ease;
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.text,
  },
  // Competitor name small - exact CSS: font-size: 11px; color: #666; text-align: center;
  competitorNameSmall: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
