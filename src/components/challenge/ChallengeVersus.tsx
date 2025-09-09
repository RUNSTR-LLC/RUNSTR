/**
 * ChallengeVersus Component - VS section showing two competitors
 * Matches HTML mockup: vs-section, competitor, vs-divider
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export interface Competitor {
  id: string;
  name: string;
  avatar: string; // Single letter
  status: 'completed' | 'in_progress' | 'pending';
}

export interface ChallengeVersusProps {
  competitor1?: Competitor;
  competitor2?: Competitor;
  competitors?: Competitor[];
  isCompleted?: boolean;
  winner?: Competitor;
}

export const ChallengeVersus: React.FC<ChallengeVersusProps> = ({
  competitor1,
  competitor2,
  competitors,
  isCompleted,
  winner,
}) => {
  // Support both individual competitors and competitors array
  const comp1 = competitor1 || (competitors && competitors[0]);
  const comp2 = competitor2 || (competitors && competitors[1]);

  if (!comp1 || !comp2) {
    return null; // Can't render versus without two competitors
  }
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      default:
        return 'Pending';
    }
  };

  const getStatusStyle = (status: string) => {
    return status === 'completed' ? styles.statusCompleted : styles.status;
  };

  return (
    <View style={styles.container}>
      <View style={styles.vsContainer}>
        {/* Competitor 1 */}
        <View style={styles.competitor}>
          <View style={styles.competitorAvatar}>
            <Text style={styles.avatarText}>{comp1.avatar}</Text>
          </View>
          <Text style={styles.competitorName}>{comp1.name}</Text>
          <View style={getStatusStyle(comp1.status)}>
            <Text style={styles.statusText}>{getStatusText(comp1.status)}</Text>
          </View>
        </View>

        {/* VS Divider */}
        <View style={styles.vsDivider}>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.vsLine} />
        </View>

        {/* Competitor 2 */}
        <View style={styles.competitor}>
          <View style={styles.competitorAvatar}>
            <Text style={styles.avatarText}>{comp2.avatar}</Text>
          </View>
          <Text style={styles.competitorName}>{comp2.name}</Text>
          <View style={getStatusStyle(comp2.status)}>
            <Text style={styles.statusText}>{getStatusText(comp2.status)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Container - exact CSS: background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; padding: 20px; margin-bottom: 20px;
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: 20,
    marginBottom: 20,
  },
  // VS container - exact CSS: display: flex; align-items: center; justify-content: space-between;
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Competitor - exact CSS: display: flex; flex-direction: column; align-items: center; flex: 1;
  competitor: {
    flex: 1,
    alignItems: 'center',
  },
  // Competitor avatar - exact CSS: width: 60px; height: 60px; background: #333; border-radius: 30px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 600; margin-bottom: 8px;
  competitorAvatar: {
    width: 60,
    height: 60,
    backgroundColor: theme.colors.syncBackground,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
  },
  // Competitor name - exact CSS: font-size: 16px; font-weight: 600; margin-bottom: 4px;
  competitorName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  // Competitor status - exact CSS: font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; background: #1a1a1a; padding: 2px 6px; border-radius: 4px;
  status: {
    backgroundColor: theme.colors.border,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  // Completed status - exact CSS: color: #fff; background: #333;
  statusCompleted: {
    backgroundColor: theme.colors.syncBackground,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // VS divider - exact CSS: display: flex; flex-direction: column; align-items: center; margin: 0 20px;
  vsDivider: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  // VS text - exact CSS: font-size: 18px; font-weight: 800; color: #666; margin-bottom: 4px;
  vsText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  // VS line - exact CSS: width: 1px; height: 40px; background: #333;
  vsLine: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.syncBackground,
  },
});
