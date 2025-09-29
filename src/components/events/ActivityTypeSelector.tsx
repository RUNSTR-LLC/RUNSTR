/**
 * ActivityTypeSelector - Activity type selection buttons for Season 1
 * Three minimalistic buttons for Running, Walking, Cycling
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import type { SeasonActivityType } from '../../types/season';

interface ActivityTypeSelectorProps {
  selectedType: SeasonActivityType;
  onTypeSelect: (type: SeasonActivityType) => void;
}

export const ActivityTypeSelector: React.FC<ActivityTypeSelectorProps> = ({
  selectedType,
  onTypeSelect,
}) => {
  const activities: { type: SeasonActivityType; label: string }[] = [
    { type: 'running', label: 'Running' },
    { type: 'walking', label: 'Walking' },
    { type: 'cycling', label: 'Cycling' },
  ];

  return (
    <View style={styles.container}>
      {activities.map(({ type, label }) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.button,
            selectedType === type && styles.buttonSelected,
          ]}
          onPress={() => onTypeSelect(type)}
        >
          <Text
            style={[
              styles.buttonText,
              selectedType === type && styles.buttonTextSelected,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },

  button: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    alignItems: 'center',
  },

  buttonSelected: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },

  buttonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  buttonTextSelected: {
    color: theme.colors.background,
  },
});