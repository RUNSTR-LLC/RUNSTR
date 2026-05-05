import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  actionIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onActionPress?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel,
  actionIcon,
  onActionPress,
}) => (
  <View style={styles.container}>
    <View style={styles.titleRow}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onActionPress && (
        <TouchableOpacity
          style={styles.pill}
          onPress={onActionPress}
          activeOpacity={0.8}
        >
          {actionIcon && (
            <Ionicons
              name={actionIcon}
              size={14}
              color={theme.colors.background}
              style={styles.pillIcon}
            />
          )}
          <Text style={styles.pillLabel}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
    <View style={styles.accentRule} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: theme.typography.weights.bold,
  },
  accentRule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.orangeBright,
    marginTop: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.orangeBright,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillIcon: {
    marginRight: 4,
  },
  pillLabel: {
    color: theme.colors.background,
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
  },
});
