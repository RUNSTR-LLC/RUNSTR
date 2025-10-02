/**
 * NotificationItem - Individual notification card in the feed
 * Displays icon, title, body, timestamp, actions, and unread indicator
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { UnifiedNotification } from '../../types/unifiedNotifications';

interface NotificationItemProps {
  notification: UnifiedNotification;
  onPress: () => void;
  onActionPress: (actionId: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onActionPress,
}) => {
  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, !notification.isRead && styles.unreadContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left: Icon */}
      <View style={[styles.iconContainer, !notification.isRead && styles.unreadIconContainer]}>
        <Ionicons
          name={notification.icon as any}
          size={24}
          color={notification.isRead ? theme.colors.textMuted : theme.colors.text}
        />
      </View>

      {/* Middle: Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[styles.title, !notification.isRead && styles.unreadTitle]}
            numberOfLines={2}
          >
            {notification.title}
          </Text>
          <Text style={styles.timestamp}>{getRelativeTime(notification.timestamp)}</Text>
        </View>

        <Text style={styles.body} numberOfLines={3}>
          {notification.body}
        </Text>

        {/* Actions */}
        {notification.actions && notification.actions.length > 0 && (
          <View style={styles.actions}>
            {notification.actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionButton,
                  action.isPrimary ? styles.primaryActionButton : styles.secondaryActionButton,
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  onActionPress(action.id);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    action.isPrimary
                      ? styles.primaryActionButtonText
                      : styles.secondaryActionButtonText,
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Right: Unread indicator */}
      {!notification.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
  },
  unreadContainer: {
    backgroundColor: `${theme.colors.text}05`, // Very subtle white overlay
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.buttonHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  unreadIconContainer: {
    backgroundColor: theme.colors.border,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  unreadTitle: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  body: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryActionButton: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  secondaryActionButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
  },
  primaryActionButtonText: {
    color: theme.colors.background,
  },
  secondaryActionButtonText: {
    color: theme.colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626', // Red dot matching badge
    marginLeft: 8,
    marginTop: 20,
  },
});
