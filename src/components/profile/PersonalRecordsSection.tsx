/**
 * PersonalRecordsSection Component - Grid of PR cards
 * Displays personal best times for standard race distances.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import type { PersonalRecord } from '../../services/backend/ProfileDataService';

interface PersonalRecordsSectionProps {
  records: PersonalRecord[];
}

// Map category keys to human-readable labels
const CATEGORY_LABELS: Record<PersonalRecord['category'], string> = {
  '5k': '5K',
  '10k': '10K',
  half: 'Half Marathon',
  marathon: 'Marathon',
};

/**
 * Format seconds into H:MM:SS or MM:SS depending on duration.
 */
function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export const PersonalRecordsSection: React.FC<PersonalRecordsSectionProps> = ({
  records,
}) => {
  if (!records || records.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>PERSONAL RECORDS</Text>
      <View style={styles.grid}>
        {records.map((record, index) => (
          <View key={`${record.category}-${index}`} style={styles.card}>
            <Text style={styles.cardLabel}>
              {CATEGORY_LABELS[record.category] || record.category}
            </Text>
            <Text style={styles.cardValue}>
              {formatTime(record.bestTimeSeconds)}
            </Text>
          </View>
        ))}
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

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  card: {
    width: '48%',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },

  cardLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  cardValue: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
});
