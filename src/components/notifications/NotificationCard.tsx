/**
 * NotificationCard - Rich notification component matching HTML mockup styles
 * Renders different notification types with interactive content
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../../styles/theme';
import { RichNotificationData } from '../../types';
import { MiniLeaderboard } from './MiniLeaderboard';
import { EarningsDisplay } from './EarningsDisplay';
import { NotificationActions } from './NotificationActions';
import { LiveIndicator } from './LiveIndicator';

interface NotificationCardProps {
  notification: RichNotificationData;
  onPress?: (notification: RichNotificationData) => void;
  onActionPress?: (
    actionId: string,
    notification: RichNotificationData
  ) => void;
  style?: any;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onActionPress,
  style,
}) => {
  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMinutes = Math.floor(
      (now.getTime() - past.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const getNotificationTypeStyle = () => {
    switch (notification.type) {
      case 'bitcoin_earned':
      case 'weekly_earnings_summary':
        return styles.notificationEarnings;
      case 'live_position_threat':
      case 'live_position_gained':
      case 'challenge_invitation':
        return styles.notificationCompetition;
      case 'team_event':
      case 'team_member_joined':
      case 'team_announcement':
        return styles.notificationTeam;
      case 'workout_reminder':
      case 'streak_reminder':
        return styles.notificationReminder;
      default:
        return {};
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress(notification);
    }
  };

  const handleActionPress = (actionId: string) => {
    if (onActionPress) {
      onActionPress(actionId, notification);
    }
  };

  return (
    <Pressable
      style={[
        styles.notificationCard,
        getNotificationTypeStyle(),
        notification.isNew && styles.notificationNew,
        style,
      ]}
      onPress={handlePress}
      android_ripple={{ color: theme.colors.buttonHover }}
    >
      {/* Header */}
      <View style={styles.notificationHeader}>
        <View style={styles.appInfo}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>R</Text>
          </View>
          <Text style={styles.appName}>RUNSTR</Text>
        </View>
        <Text style={styles.notificationTime}>
          {formatTimeAgo(notification.timestamp)}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.notificationContent}>
        {/* Live Indicator */}
        {notification.liveIndicator?.isLive && (
          <LiveIndicator text={notification.liveIndicator.text} />
        )}

        {/* Title and Body */}
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationBody}>{notification.body}</Text>

        {/* Rich Content */}
        {(notification.miniLeaderboard ||
          notification.earningsSection ||
          notification.actions) && (
          <View style={styles.richContent}>
            {/* Mini Leaderboard */}
            {notification.miniLeaderboard && (
              <MiniLeaderboard entries={notification.miniLeaderboard} />
            )}

            {/* Earnings Display */}
            {notification.earningsSection && (
              <EarningsDisplay
                amount={notification.earningsSection.amount}
                label={notification.earningsSection.label}
              />
            )}

            {/* Action Buttons */}
            {notification.actions && (
              <NotificationActions
                actions={notification.actions}
                onActionPress={handleActionPress}
              />
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  notificationCard: {
    backgroundColor: theme.colors.cardBackground, // #0a0a0a
    borderWidth: 1,
    borderColor: theme.colors.border, // #1a1a1a
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },

  notificationNew: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.text, // #fff
  },

  notificationHeader: {
    backgroundColor: theme.colors.background, // #000
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  appIcon: {
    width: 20,
    height: 20,
    backgroundColor: theme.colors.text, // #fff
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  appIconText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background, // #000
  },

  appName: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textSecondary, // #ccc
  },

  notificationTime: {
    fontSize: 11,
    color: theme.colors.textMuted, // #666
  },

  notificationContent: {
    padding: 16,
  },

  notificationTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text, // #fff
    marginBottom: 4,
    lineHeight: 19.2, // 16 * 1.2
  },

  notificationBody: {
    fontSize: 14,
    color: theme.colors.textTertiary, // #999
    lineHeight: 18.2, // 14 * 1.3
    marginBottom: 12,
  },

  richContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border, // #1a1a1a
  },

  // Notification type styles
  notificationEarnings: {
    // Earnings notifications use default styles
  },

  notificationCompetition: {
    // Competition notifications use default styles
  },

  notificationTeam: {
    // Team notifications use default styles
  },

  notificationReminder: {
    // Reminder notifications have different app icon
  },
});
