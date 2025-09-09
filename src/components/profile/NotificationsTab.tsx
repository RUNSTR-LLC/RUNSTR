/**
 * NotificationsTab Component - Push notification settings and history
 * Matches notifications tab content from HTML mockup exactly
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import { NotificationSettings, NotificationHistory } from '../../types';
import { Card } from '../ui/Card';
import { NotificationService } from '../../services/notificationService';

interface NotificationsTabProps {
  settings: NotificationSettings;
  onSettingChange: (key: keyof NotificationSettings, value: boolean) => void;
}

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ value, onValueChange }) => {
  return (
    <TouchableOpacity
      style={[styles.toggle, value && styles.toggleActive]}
      onPress={() => onValueChange(!value)}
      activeOpacity={1}
    >
      <View style={[styles.toggleHandle, value && styles.toggleHandleActive]} />
    </TouchableOpacity>
  );
};

interface NotificationItemProps {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  title,
  subtitle,
  value,
  onValueChange,
  isLast = false,
}) => {
  return (
    <View
      style={[styles.notificationItem, isLast && styles.notificationItemLast]}
    >
      <View style={styles.notificationInfo}>
        <Text style={styles.notificationTitle}>{title}</Text>
        <Text style={styles.notificationSubtitle}>{subtitle}</Text>
      </View>
      <Toggle value={value} onValueChange={onValueChange} />
    </View>
  );
};

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  settings,
  onSettingChange,
}) => {
  const [notificationHistory, setNotificationHistory] =
    useState<NotificationHistory>({
      items: [],
      unreadCount: 0,
      lastUpdated: new Date().toISOString(),
    });
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotificationHistory();
  }, []);

  const loadNotificationHistory = async () => {
    setIsLoading(true);
    try {
      const history = await NotificationService.getNotificationHistory();
      setNotificationHistory(history);
    } catch (error) {
      console.error('Failed to load notification history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await NotificationService.markAsRead(notificationId);
    await loadNotificationHistory(); // Refresh the history
  };

  const handleToggleHistory = () => {
    setIsHistoryExpanded(!isHistoryExpanded);
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes > 0 ? `${diffMinutes}m ago` : 'Just now';
    }
  };

  const notifications = [
    {
      key: 'eventNotifications' as keyof NotificationSettings,
      title: 'Event Notifications',
      subtitle: 'Competitions, deadlines, results',
    },
    {
      key: 'leagueUpdates' as keyof NotificationSettings,
      title: 'League Updates',
      subtitle: 'Rank changes, position moves',
    },
    {
      key: 'teamAnnouncements' as keyof NotificationSettings,
      title: 'Team Announcements',
      subtitle: 'Captain messages, updates',
    },
    {
      key: 'bitcoinRewards' as keyof NotificationSettings,
      title: 'Bitcoin Rewards',
      subtitle: 'Workout earnings, payouts',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Push Notifications Settings */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Push Notifications</Text>
        <View style={styles.notificationsGroup}>
          {notifications.map((notification, index) => (
            <NotificationItem
              key={notification.key}
              title={notification.title}
              subtitle={notification.subtitle}
              value={settings[notification.key]}
              onValueChange={(value) =>
                onSettingChange(notification.key, value)
              }
              isLast={index === notifications.length - 1}
            />
          ))}
        </View>
      </Card>

      {/* Notification History */}
      <Card style={styles.card}>
        <TouchableOpacity
          style={styles.historyHeader}
          onPress={handleToggleHistory}
          activeOpacity={0.7}
        >
          <View style={styles.historyTitleContainer}>
            <Text style={styles.cardTitle}>Notification History</Text>
            {notificationHistory.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {notificationHistory.unreadCount}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.expandIcon,
              isHistoryExpanded && styles.expandIconRotated,
            ]}
          >
            ▼
          </Text>
        </TouchableOpacity>

        {isHistoryExpanded && (
          <View style={styles.historyContent}>
            {isLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Loading...</Text>
              </View>
            ) : notificationHistory.items.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No notifications yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Your recent notifications will appear here
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {notificationHistory.items.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.historyItem,
                      index === notificationHistory.items.length - 1 &&
                        styles.historyItemLast,
                      !item.isRead && styles.historyItemUnread,
                    ]}
                    onPress={() => handleMarkAsRead(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.historyItemContent}>
                      <View style={styles.historyItemHeader}>
                        <Text
                          style={[
                            styles.historyItemTitle,
                            !item.isRead && styles.historyItemTitleUnread,
                          ]}
                        >
                          {item.title}
                        </Text>
                        <Text style={styles.historyItemTime}>
                          {formatTimestamp(item.timestamp)}
                        </Text>
                      </View>
                      <Text style={styles.historyItemMessage}>
                        {item.message}
                      </Text>
                    </View>
                    {!item.isRead && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  card: {
    marginBottom: theme.spacing.xl, // 12px
  },

  // CSS: font-size: 12px; font-weight: 600; margin-bottom: 12px; color: #ccc; text-transform: uppercase; letter-spacing: 0.5px;
  cardTitle: {
    fontSize: 12, // Exact from CSS
    fontWeight: theme.typography.weights.semiBold, // 600
    marginBottom: theme.spacing.xl, // 12px
    color: theme.colors.textSecondary, // #ccc
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  notificationsGroup: {
    // Container for grouped notification items
  },

  // CSS: display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #1a1a1a;
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl, // 16px
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border, // #1a1a1a
  },

  notificationItemLast: {
    borderBottomWidth: 0,
  },

  notificationInfo: {
    flex: 1,
  },

  // CSS: font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 2px;
  notificationTitle: {
    fontSize: 15, // Exact from CSS
    fontWeight: theme.typography.weights.semiBold, // 600
    color: theme.colors.text, // #fff
    marginBottom: theme.spacing.xs, // 2px
  },

  // CSS: font-size: 12px; color: #666;
  notificationSubtitle: {
    fontSize: 12, // Exact from CSS
    color: theme.colors.textMuted, // #666
  },

  // CSS: width: 44px; height: 24px; background: #333; border-radius: 12px; position: relative;
  toggle: {
    width: 44, // Exact from CSS
    height: 24, // Exact from CSS
    backgroundColor: theme.colors.syncBackground, // #333
    borderRadius: 12, // Exact from CSS
    position: 'relative',
    justifyContent: 'center',
  },

  // CSS: .toggle.active { background: #fff; }
  toggleActive: {
    backgroundColor: theme.colors.accent, // #fff
  },

  // CSS: width: 20px; height: 20px; background: #fff; border-radius: 10px; position: absolute; top: 2px; left: 2px;
  toggleHandle: {
    width: 20, // Exact from CSS
    height: 20, // Exact from CSS
    backgroundColor: theme.colors.text, // #fff
    borderRadius: 10, // Exact from CSS
    position: 'absolute',
    top: 2, // Exact from CSS
    left: 2, // Exact from CSS
  },

  // CSS: .toggle.active .toggle-handle { transform: translateX(20px); background: #000; }
  toggleHandleActive: {
    transform: [{ translateX: 20 }], // Exact from CSS
    backgroundColor: theme.colors.accentText, // #000
  },

  // Notification History Styles
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm, // 4px
  },

  historyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  unreadBadge: {
    backgroundColor: theme.colors.accent, // #fff
    borderRadius: 10,
    paddingHorizontal: theme.spacing.sm, // 4px
    paddingVertical: theme.spacing.xs, // 2px
    marginLeft: theme.spacing.sm, // 4px
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  unreadBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold, // 700
    color: theme.colors.accentText, // #000
  },

  expandIcon: {
    fontSize: 12,
    color: theme.colors.textSecondary, // #ccc
    fontWeight: theme.typography.weights.semiBold, // 600
  },

  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },

  historyContent: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border, // #1a1a1a
    paddingTop: theme.spacing.xl, // 12px
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl, // 12px
  },

  emptyStateText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold, // 600
    color: theme.colors.textSecondary, // #ccc
    textAlign: 'center',
  },

  emptyStateSubtext: {
    fontSize: 12,
    color: theme.colors.textMuted, // #666
    textAlign: 'center',
    marginTop: theme.spacing.xs, // 2px
  },

  historyList: {
    // Container for history items
  },

  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.xl, // 12px
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border, // #1a1a1a
  },

  historyItemLast: {
    borderBottomWidth: 0,
  },

  historyItemUnread: {
    backgroundColor: `${theme.colors.accent}08`, // Very subtle white background for unread
  },

  historyItemContent: {
    flex: 1,
  },

  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs, // 2px
  },

  historyItemTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold, // 600
    color: theme.colors.textSecondary, // #ccc
    flex: 1,
    marginRight: theme.spacing.sm, // 4px
  },

  historyItemTitleUnread: {
    color: theme.colors.text, // #fff for unread
    fontWeight: theme.typography.weights.bold, // 700 for unread
  },

  historyItemTime: {
    fontSize: 11,
    color: theme.colors.textMuted, // #666
  },

  historyItemMessage: {
    fontSize: 12,
    color: theme.colors.textMuted, // #666
    lineHeight: 16,
  },

  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent, // #fff
    marginLeft: theme.spacing.sm, // 4px
    marginTop: theme.spacing.sm, // 4px
  },
});
