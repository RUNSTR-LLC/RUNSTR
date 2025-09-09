/**
 * AutoWithdrawSection - Auto-withdraw settings toggle and configuration
 * Allows users to set automatic withdrawals when balance reaches threshold
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { theme } from '../../styles/theme';

interface AutoWithdrawConfig {
  enabled: boolean;
  threshold: number;
  lightningAddress?: string;
}

interface AutoWithdrawSectionProps {
  config: AutoWithdrawConfig;
  onChange: (enabled: boolean, threshold?: number) => void;
}

export const AutoWithdrawSection: React.FC<AutoWithdrawSectionProps> = ({
  config,
  onChange,
}) => {
  const [threshold, setThreshold] = useState(config.threshold.toString());

  const handleToggle = () => {
    const newEnabled = !config.enabled;
    onChange(newEnabled, newEnabled ? parseInt(threshold) : undefined);
  };

  const handleThresholdChange = (value: string) => {
    setThreshold(value);
    if (config.enabled && value) {
      const numericValue = parseInt(value);
      if (!isNaN(numericValue)) {
        onChange(config.enabled, numericValue);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Toggle */}
      <View style={styles.header}>
        <Text style={styles.title}>Auto-withdraw</Text>

        <TouchableOpacity
          style={[styles.toggle, config.enabled && styles.toggleActive]}
          onPress={handleToggle}
        >
          <View
            style={[
              styles.toggleKnob,
              config.enabled && styles.toggleKnobActive,
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* Description */}
      <Text style={styles.description}>
        Automatically send earnings to your lightning address when balance
        reaches threshold
      </Text>

      {/* Threshold Setting */}
      <View style={styles.thresholdContainer}>
        <Text style={styles.thresholdLabel}>Threshold:</Text>

        <TextInput
          style={[
            styles.thresholdInput,
            !config.enabled && styles.inputDisabled,
          ]}
          value={threshold}
          onChangeText={handleThresholdChange}
          placeholder="50000"
          placeholderTextColor="#666"
          keyboardType="numeric"
          editable={config.enabled}
        />

        <Text style={styles.thresholdUnit}>sats</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: theme.colors.border,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: theme.colors.text,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    backgroundColor: '#666',
    borderRadius: 10,
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    backgroundColor: theme.colors.background,
    transform: [{ translateX: 20 }],
  },
  description: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 12,
  },
  thresholdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thresholdLabel: {
    fontSize: 12,
    color: '#666',
  },
  thresholdInput: {
    width: 80,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: theme.colors.text,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  thresholdUnit: {
    fontSize: 12,
    color: '#666',
  },
});
