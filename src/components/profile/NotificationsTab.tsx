/**
 * NotificationsTab Component - Notification history and info
 * Displays all notifications without toggle controls
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../../styles/theme';
import { NotificationHistory } from '../../types';
import { Card } from '../ui/Card';
import { NotificationService } from '../../services/notificationService';

interface NotificationsTabProps {
  // No settings needed anymore - just display notifications
}

export const NotificationsTab: React.FC<NotificationsTabProps> = () => {
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Info Card */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>About Notifications</Text>
        <Text style={styles.infoText}>
          You'll receive notifications for new competitions, leaderboard changes,
          competition reminders, and team announcements. Notifications appear when
          your app is open or running in the background.
        </Text>
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
    </ScrollView>
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

  infoText: {
    fontSize: 13,
    color: theme.colors.textSecondary, // #ccc
    lineHeight: 18,
  },
});
