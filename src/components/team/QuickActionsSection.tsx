/**
 * QuickActionsSection Component
 * Captain dashboard quick actions: Create Event and Edit League
 * Exact match to HTML mockup styling
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface QuickActionItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}

interface QuickActionsSectionProps {
  onCreateEvent: () => void;
  onCreateLeague: () => void;
  onEditTeam?: () => void;
  onManageFlash?: () => void;
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  onCreateEvent,
  onCreateLeague,
  onEditTeam,
  onManageFlash,
}) => {
  const quickActions: QuickActionItem[] = [
    {
      id: 'create-event',
      icon: 'flash-outline',
      title: 'Create Event',
      description: 'Set up a single-day competition',
      onPress: onCreateEvent,
    },
    {
      id: 'create-league',
      icon: 'trophy-outline',
      title: 'Create League',
      description: 'Start a multi-day league challenge',
      onPress: onCreateLeague,
    },
  ];

  // Add optional actions
  if (onEditTeam) {
    quickActions.push({
      id: 'edit-team',
      icon: 'create-outline',
      title: 'Edit Team',
      description: 'Update team information',
      onPress: onEditTeam,
    });
  }

  // Remove Team Charity quick action to avoid duplication with dedicated section
  // Charity management is handled in the dedicated Team Charity section

  if (onManageFlash) {
    quickActions.push({
      id: 'manage-flash',
      icon: 'flash-outline',
      title: 'Subscriptions',
      description: 'Flash Bitcoin subscriptions',
      onPress: onManageFlash,
    });
  }

  return (
    <View style={styles.container}>
      {quickActions.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={styles.actionCard}
          onPress={action.onPress}
          activeOpacity={0.8}
        >
          <View style={styles.actionIcon}>
            <Ionicons name={action.icon as any} size={20} color={theme.colors.text} />
          </View>
          <Text style={styles.actionTitle}>{action.title}</Text>
          <Text style={styles.actionDescription}>{action.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Quick actions grid - flexible layout for 2-4 items
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // Action card - exact CSS: background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; padding: 16px;
  actionCard: {
    width: '48%', // For 2 columns with gap
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xxl,
    marginBottom: 12,
    // Hover effect will be handled by TouchableOpacity activeOpacity
  },

  // Action icon - exact CSS: width: 32px; height: 32px; background: #1a1a1a; border-radius: 16px; margin-bottom: 8px;
  actionIcon: {
    width: 32,
    height: 32,
    backgroundColor: theme.colors.border,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },

  // Icon text - exact CSS: font-size: 16px;
  iconText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.regular,
  },

  // Action title - exact CSS: font-size: 14px; font-weight: 600; margin-bottom: 4px;
  actionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  // Action description - exact CSS: font-size: 11px; color: #666; line-height: 1.3;
  actionDescription: {
    fontSize: theme.typography.aboutTitle,
    color: theme.colors.textMuted,
    lineHeight: 14.3, // 11px * 1.3
  },
});
