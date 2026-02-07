/**
 * MoodSelector
 *
 * Horizontal mood picker with emoji buttons.
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
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { MOOD_OPTIONS, JournalMood, MoodOption } from '../../types/journal';

interface MoodSelectorProps {
  value?: JournalMood;
  onChange: (mood: JournalMood | undefined) => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = React.memo(
  ({ value, onChange }) => {
    const handlePress = (mood: JournalMood) => {
      // Toggle off if same mood is selected
      if (value === mood) {
        onChange(undefined);
      } else {
        onChange(mood);
      }
    };

    return (
      <View style={styles.container}>
        <Text style={styles.label}>How are you feeling?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodRow}
        >
          {MOOD_OPTIONS.map((option) => (
            <MoodButton
              key={option.value}
              option={option}
              isSelected={value === option.value}
              onPress={() => handlePress(option.value)}
            />
          ))}
        </ScrollView>
      </View>
    );
  }
);

interface MoodButtonProps {
  option: MoodOption;
  isSelected: boolean;
  onPress: () => void;
}

const MoodButton: React.FC<MoodButtonProps> = React.memo(
  ({ option, isSelected, onPress }) => {
    const iconColor = isSelected ? theme.colors.orangeBright : theme.colors.textMuted;
    return (
      <TouchableOpacity
        style={[
          styles.moodButton,
          isSelected && { borderColor: theme.colors.orangeBright, backgroundColor: '#1a1a1a' },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons
          name={option.icon as keyof typeof Ionicons.glyphMap}
          size={24}
          color={iconColor}
          style={styles.icon}
        />
        <Text
          style={[
            styles.moodLabel,
            isSelected && { color: theme.colors.orangeBright },
          ]}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xxl,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.medium,
    marginBottom: theme.spacing.lg,
  },
  moodRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  moodButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    minWidth: 60,
  },
  icon: {
    marginBottom: theme.spacing.sm,
  },
  moodLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
  },
});

export default MoodSelector;
