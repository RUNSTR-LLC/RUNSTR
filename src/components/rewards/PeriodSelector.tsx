/**
 * PeriodSelector - Toggle buttons for selecting time period
 *
 * Horizontal toggle buttons: Day | Week | Month | All
 * Selected state has filled orange background
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { PERIOD_OPTIONS, type PeriodType } from '../../types/transparencyDashboard';

interface PeriodSelectorProps {
  selected: PeriodType;
  onChange: (period: PeriodType) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selected,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      {PERIOD_OPTIONS.map((option) => {
        const isSelected = option.type === selected;
        return (
          <TouchableOpacity
            key={option.type}
            style={[styles.button, isSelected && styles.buttonSelected]}
            onPress={() => onChange(option.type)}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, isSelected && styles.buttonTextSelected]}>
              {option.shortLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSelected: {
    backgroundColor: theme.colors.orangeBright,
    borderColor: theme.colors.orangeBright,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: '#888',
  },
  buttonTextSelected: {
    color: '#000',
  },
});

export default PeriodSelector;
