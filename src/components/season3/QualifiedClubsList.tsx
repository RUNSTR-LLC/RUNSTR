/**
 * QualifiedClubsList — Shows clubs that qualify for Season III
 *
 * Displayed during registration phase. Shows qualified (4+ members)
 * and not-yet-qualified clubs to motivate recruitment.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { QualifiedClub } from '../../types/season3';

interface QualifiedClubsListProps {
  qualified: QualifiedClub[];
  notQualified: QualifiedClub[];
  maxClubs: number;
}

export const QualifiedClubsList: React.FC<QualifiedClubsListProps> = ({
  qualified,
  notQualified,
  maxClubs,
}) => {
  return (
    <View style={styles.container}>
      {/* Qualified section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>QUALIFIED ({qualified.length}/{maxClubs})</Text>
      </View>

      {qualified.length === 0 && (
        <Text style={styles.emptyText}>No clubs have qualified yet</Text>
      )}

      {qualified.map((club) => (
        <View key={club.id} style={styles.clubRow}>
          <View style={styles.clubInfo}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
          </View>
          <Text style={styles.memberCount}>{club.member_count} members</Text>
        </View>
      ))}

      {/* Not qualified section */}
      {notQualified.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>NOT YET QUALIFIED</Text>
            <Text style={styles.sectionSubtitle}>Need 4+ members</Text>
          </View>

          {notQualified.map((club) => (
            <View key={club.id} style={[styles.clubRow, styles.dimRow]}>
              <View style={styles.clubInfo}>
                <Ionicons name="ellipse-outline" size={16} color={theme.colors.textMuted} />
                <Text style={[styles.clubName, styles.dimText]} numberOfLines={1}>{club.name}</Text>
              </View>
              <Text style={[styles.memberCount, styles.dimText]}>{club.member_count}/4 members</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  clubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  clubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  clubName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 1,
  },
  memberCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  dimRow: {
    opacity: 0.6,
  },
  dimText: {
    color: theme.colors.textMuted,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
