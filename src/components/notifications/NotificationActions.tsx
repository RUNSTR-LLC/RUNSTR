/**
 * NotificationActions - Interactive action buttons for notifications
 * Handles accept/decline, view actions, etc.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { NotificationAction } from '../../types';

interface NotificationActionsProps {
  actions: NotificationAction[];
  onActionPress: (actionId: string) => void;
  style?: any;
}

export const NotificationActions: React.FC<NotificationActionsProps> = ({
  actions,
  onActionPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={[
            styles.actionButton,
            action.type === 'primary' && styles.primaryButton,
          ]}
          onPress={() => onActionPress(action.id)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.actionButtonText,
              action.type === 'primary' && styles.primaryButtonText,
            ]}
          >
            {action.text}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },

  actionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder, // #333
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    backgroundColor: theme.colors.text, // #fff
    borderColor: theme.colors.text,
  },

  actionButtonText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text, // #fff
  },

  primaryButtonText: {
    color: theme.colors.background, // #000
  },
});
