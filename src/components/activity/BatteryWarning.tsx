/**
 * BatteryWarning - Shows battery level warnings during activity tracking
 * Helps users understand when battery may affect tracking accuracy
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { BatteryOptimizationService } from '../../services/activity/BatteryOptimizationService';

export const BatteryWarning: React.FC = () => {
  const [warning, setWarning] = useState<{
    level: 'critical' | 'low' | 'medium' | null;
    message: string | null;
  }>({ level: null, message: null });

  useEffect(() => {
    const batteryService = BatteryOptimizationService.getInstance();

    // Check initial battery status
    const checkBattery = () => {
      const batteryWarning = batteryService.getBatteryWarning();
      setWarning(batteryWarning);
    };

    // Check immediately
    checkBattery();

    // Subscribe to battery changes
    const unsubscribe = batteryService.addListener((mode, level) => {
      checkBattery();
    });

    // Check periodically (every 30 seconds)
    const interval = setInterval(checkBattery, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (!warning.message) {
    return null;
  }

  const getIconColor = () => {
    switch (warning.level) {
      case 'critical':
        return theme.colors.text; // White for critical
      case 'low':
        return theme.colors.textMuted; // Gray for low
      case 'medium':
        return theme.colors.textMuted; // Gray for medium
      default:
        return theme.colors.textMuted;
    }
  };

  const getContainerStyle = () => {
    if (warning.level === 'critical') {
      return [styles.container, styles.containerCritical];
    }
    return styles.container;
  };

  return (
    <View style={getContainerStyle()}>
      <Ionicons
        name="battery-dead"
        size={16}
        color={getIconColor()}
        style={styles.icon}
      />
      <Text style={styles.text}>{warning.message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.medium,
    padding: 8,
    marginHorizontal: 20,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  containerCritical: {
    borderColor: theme.colors.text,
    borderWidth: 2,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: theme.colors.textMuted,
    fontSize: 12,
    flex: 1,
  },
});