/**
 * MoodSelector
 *
 * Horizontal text-only mood picker.
 * Used in journal entry editor to select mood state.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { theme } from '../../styles/theme';
import { MOOD_OPTIONS, JournalMood } from '../../types/journal';

interface MoodSelectorProps {
  value?: JournalMood;
  onChange: (mood: JournalMood | undefined) => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = React.memo(
  ({ value, onChange }) => {
    const handlePress = (mood: JournalMood) => {
      if (value === mood) {
        onChange(undefined);
      } else {
        onChange(mood);
      }
    };

    return (
      <View style={styles.container}>
        <Text style={styles.label}>Mood</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {MOOD_OPTIONS.map((option) => {
            const isSelected = value === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => handlePress(option.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xxl,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    marginBottom: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  pill: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
  },
  pillSelected: {
    borderColor: theme.colors.text,
    backgroundColor: '#1a1a1a',
  },
  pillText: {
    color: theme.colors.textDark,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  pillTextSelected: {
    color: theme.colors.text,
  },
});

export default MoodSelector;
