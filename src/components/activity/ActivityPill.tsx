// src/components/activity/ActivityPill.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { ActivityIconConfig } from '../../types/activityMenu';

interface ActivityPillProps {
  activity: ActivityIconConfig;
  isActive: boolean;
  onPress: () => void;
}

export const ActivityPill: React.FC<ActivityPillProps> = ({
  activity,
  isActive,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.containerActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={activity.label}
      accessibilityRole="button"
    >
      <Ionicons
        name={activity.icon}
        size={24}
        color={isActive ? theme.colors.text : theme.colors.textMuted}
      />
      <Text
        style={[styles.label, isActive && styles.labelActive]}
        numberOfLines={1}
      >
        {activity.label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 44,
    minHeight: 44,
  },
  containerActive: {
    backgroundColor: theme.colors.border,
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep,
    borderRadius: 8,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    marginTop: 4,
  },
  labelActive: {
    color: theme.colors.text,
  },
});
