/**
 * ClubAffiliationsSection Component - Club list
 * Shows clubs the user belongs to, with captain labels and member counts.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { ClubAffiliation } from '../../services/backend/ProfileDataService';

interface ClubAffiliationsSectionProps {
  clubs: ClubAffiliation[];
  onClubPress?: (clubId: string) => void;
}

export const ClubAffiliationsSection: React.FC<
  ClubAffiliationsSectionProps
> = ({ clubs, onClubPress }) => {
  if (!clubs || clubs.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>CLUBS</Text>
      <View style={styles.card}>
        {clubs.map((club, index) => {
          const isLast = index === clubs.length - 1;
          const isCaptain = club.role === 'captain';

          return (
            <TouchableOpacity
              key={club.id}
              style={[styles.row, !isLast && styles.rowBorder]}
              onPress={() => onClubPress?.(club.id)}
              activeOpacity={onClubPress ? 0.6 : 1}
              disabled={!onClubPress}
            >
              <View style={styles.rowInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.clubName} numberOfLines={1}>
                    {club.name}
                  </Text>
                  {isCaptain && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainText}>Captain</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberCount}>
                  {club.memberCount.toLocaleString()} member
                  {club.memberCount !== 1 ? 's' : ''}
                </Text>
              </View>
              {onClubPress && (
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

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },

  clubName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flexShrink: 1,
  },

  captainBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },

  captainText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },

  memberCount: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});
