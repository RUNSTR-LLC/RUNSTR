/**
 * GroupedNotificationCard - Collapsible card for grouped notifications
 * Shows multiple notifications in a compact grouped format
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { theme } from '../../styles/theme';
import { GroupedNotification } from '../../types';

interface GroupedNotificationCardProps {
  groupedNotification: GroupedNotification;
  onPress?: (groupedNotification: GroupedNotification) => void;
  onNotificationPress?: (notificationId: string) => void;
  style?: any;
}

export const GroupedNotificationCard: React.FC<
  GroupedNotificationCardProps
> = ({ groupedNotification, onPress, onNotificationPress, style }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffHours = Math.floor(
      (now.getTime() - past.getTime()) / (1000 * 60 * 60)
    );

    if (diffHours < 1) return '1h';
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'bitcoin_earned':
      case 'weekly_earnings_summary':
        return '+';
      case 'challenge_invitation':
      case 'challenge_received':
        return '⚡';
      case 'live_position_gained':
      case 'position_change':
        return '↑';
      case 'team_event':
        return 'E';
      case 'team_member_joined':
        return '+';
      default:
        return '•';
    }
  };

  const handleHeaderPress = () => {
    setIsExpanded(!isExpanded);
    if (onPress) {
      onPress(groupedNotification);
    }
  };

  const handleNotificationPress = (notificationId: string) => {
    if (onNotificationPress) {
      onNotificationPress(notificationId);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <Pressable style={styles.header} onPress={handleHeaderPress}>
        <Text style={styles.groupTitle}>{groupedNotification.appName}</Text>
        <Text style={styles.groupCount}>
          {groupedNotification.count} notifications
        </Text>
      </Pressable>

      {/* Notifications List */}
      {isExpanded && (
        <ScrollView
          style={styles.notificationsList}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {groupedNotification.notifications.map((notification, index) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.groupItem,
                index === groupedNotification.notifications.length - 1 &&
                  styles.groupItemLast,
              ]}
              onPress={() => handleNotificationPress(notification.id)}
              activeOpacity={0.7}
            >
              <View style={styles.groupIcon}>
                <Text style={styles.groupIconText}>
                  {getNotificationIcon(notification.type)}
                </Text>
              </View>
              <Text style={styles.groupText} numberOfLines={1}>
                {notification.title}
              </Text>
              <Text style={styles.groupTime}>
                {formatTimeAgo(notification.timestamp)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground, // #0a0a0a
    borderWidth: 1,
    borderColor: theme.colors.border, // #1a1a1a
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },

  header: {
    backgroundColor: theme.colors.background, // #000
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  groupTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text, // #fff
  },

  groupCount: {
    fontSize: 11,
    color: theme.colors.textMuted, // #666
    backgroundColor: theme.colors.buttonHover, // #1a1a1a
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },

  notificationsList: {
    maxHeight: 200,
  },

  groupItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  groupItemLast: {
    borderBottomWidth: 0,
  },

  groupIcon: {
    width: 24,
    height: 24,
    backgroundColor: theme.colors.buttonBorder, // #333
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  groupIconText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text, // #fff
  },

  groupText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary, // #ccc
  },

  groupTime: {
    fontSize: 11,
    color: theme.colors.textMuted, // #666
  },
});
