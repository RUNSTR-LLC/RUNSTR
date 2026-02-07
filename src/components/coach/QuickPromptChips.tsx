/**
 * QuickPromptChips
 *
 * Horizontal scrolling chips for suggested conversation starters.
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
import { QUICK_PROMPTS, ChatFocus } from '../../services/ai/ChatCoachService';

interface QuickPromptChipsProps {
  focus?: ChatFocus;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export const QuickPromptChips: React.FC<QuickPromptChipsProps> = React.memo(
  ({ focus, onSelect, disabled = false }) => {
    const prompts = QUICK_PROMPTS[focus || 'general'] || QUICK_PROMPTS.general;

    return (
      <View style={styles.container}>
        <Text style={styles.label}>Suggestions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {prompts.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.chip, disabled && styles.chipDisabled]}
              onPress={() => onSelect(prompt)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.chipText, disabled && styles.chipTextDisabled]}
              >
                {prompt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.xl,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
  },
  chipsRow: {
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  chip: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  chipTextDisabled: {
    color: theme.colors.textMuted,
  },
});

export default QuickPromptChips;
