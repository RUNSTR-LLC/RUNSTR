/**
 * EnergySelector
 *
 * Text-only energy level picker (1-5 scale).
 * Used in journal entry editor to select energy state.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { ENERGY_OPTIONS, EnergyLevel } from '../../types/journal';

interface EnergySelectorProps {
  value?: EnergyLevel;
  onChange: (energy: EnergyLevel | undefined) => void;
}

export const EnergySelector: React.FC<EnergySelectorProps> = React.memo(
  ({ value, onChange }) => {
    const handlePress = (energy: EnergyLevel) => {
      if (value === energy) {
        onChange(undefined);
      } else {
        onChange(energy);
      }
    };

    return (
      <View style={styles.container}>
        <Text style={styles.label}>Energy</Text>
        <View style={styles.row}>
          {ENERGY_OPTIONS.map((option) => {
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
        </View>
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
    flexWrap: 'wrap',
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
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  pillTextSelected: {
    color: theme.colors.text,
  },
});

export default EnergySelector;
