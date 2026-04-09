/**
 * ActiveCompetitionsSection Component - List of competition rows
 * Shows competitions the user is currently participating in.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { ActiveCompetition } from '../../services/backend/ProfileDataService';

interface ActiveCompetitionsSectionProps {
  competitions: ActiveCompetition[];
  onCompetitionPress?: (competitionId: string) => void;
}

export const ActiveCompetitionsSection: React.FC<
  ActiveCompetitionsSectionProps
> = ({ competitions, onCompetitionPress }) => {
  if (!competitions || competitions.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ACTIVE COMPETITIONS</Text>
      <View style={styles.card}>
        {competitions.map((comp, index) => {
          const isLast = index === competitions.length - 1;

          return (
            <TouchableOpacity
              key={comp.id}
              style={[styles.row, !isLast && styles.rowBorder]}
              onPress={() => onCompetitionPress?.(comp.id)}
              activeOpacity={onCompetitionPress ? 0.6 : 1}
              disabled={!onCompetitionPress}
            >
              <View style={styles.rowInfo}>
                <Text style={styles.compName} numberOfLines={1}>
                  {comp.name}
                </Text>
                <Text style={styles.compMeta}>
                  {comp.totalParticipants.toLocaleString()} participants
                </Text>
              </View>
              {onCompetitionPress && (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={theme.colors.textMuted}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  rowInfo: {
    flex: 1,
  },

  compName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  compMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});
