/**
 * EnergySelector
 *
 * Energy level picker (1-5 scale).
 * Used in journal entry editor to select energy state.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { ENERGY_OPTIONS, EnergyLevel } from '../../types/journal';

interface EnergySelectorProps {
  value?: EnergyLevel;
  onChange: (energy: EnergyLevel | undefined) => void;
}

export const EnergySelector: React.FC<EnergySelectorProps> = React.memo(
  ({ value, onChange }) => {
    const handlePress = (energy: EnergyLevel) => {
      // Toggle off if same level is selected
      if (value === energy) {
        onChange(undefined);
      } else {
        onChange(energy);
      }
    };

    return (
      <View style={styles.container}>
        <Text style={styles.label}>Energy Level</Text>
        <View style={styles.energyRow}>
          {ENERGY_OPTIONS.map((option) => {
            const isSelected = value === option.value;
            const iconColor = isSelected
              ? theme.colors.orangeBright
              : theme.colors.textMuted;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.energyButton,
                  isSelected && styles.energyButtonSelected,
                ]}
                onPress={() => handlePress(option.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={iconColor}
                  style={styles.icon}
                />
                <Text
                  style={[
                    styles.energyValue,
                    isSelected && styles.energyValueSelected,
                  ]}
                >
                  {option.value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {value && (
          <Text style={styles.selectedLabel}>
            {ENERGY_OPTIONS.find((o) => o.value === value)?.label}
          </Text>
        )}
      </View>
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
  energyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
  },
  energyButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
  },
  energyButtonSelected: {
    borderColor: theme.colors.orangeBright,
    backgroundColor: '#1a1a1a',
  },
  icon: {
    marginBottom: theme.spacing.xs,
  },
  energyValue: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
  },
  energyValueSelected: {
    color: theme.colors.orangeBright,
  },
  selectedLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});

export default EnergySelector;
