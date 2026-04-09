/**
 * NotificationModal - Full-screen modal displaying all notifications
 * Grouped by date with pull-to-refresh and action handling
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { unifiedNotificationStore } from '../../services/notifications/UnifiedNotificationStore';
import { NotificationItem } from './NotificationItem';
import type {
  UnifiedNotification,
  GroupedNotifications,
} from '../../types/unifiedNotifications';
import { useNavigation } from '@react-navigation/native';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
}) => {
  const navigation = useNavigation<any>();
  const [groupedNotifications, setGroupedNotifications] =
    useState<GroupedNotifications>({
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (visible) {
      loadNotifications();

      // Subscribe to notification changes while modal is open
      const unsubscribe = unifiedNotificationStore.subscribe(
        (notifications, count) => {
          setUnreadCount(count);
          const grouped = unifiedNotificationStore.getGroupedNotifications();
          setGroupedNotifications(grouped);
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [visible]);

  const loadNotifications = () => {
    const grouped = unifiedNotificationStore.getGroupedNotifications();
    setGroupedNotifications(grouped);
    setUnreadCount(unifiedNotificationStore.getUnreadCount());
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Reload notifications (in case they were modified externally)
    loadNotifications();
    setIsRefreshing(false);
  };

  const handleNotificationPress = async (notification: UnifiedNotification) => {
    // Mark as read
    await unifiedNotificationStore.markAsRead(notification.id);

    // Navigate or perform default action based on type
    handleDefaultAction(notification);
  };

  const handleActionPress = async (
    notification: UnifiedNotification,
    actionId: string
  ) => {
    const action = notification.actions?.find((a) => a.id === actionId);
    if (!action) return;

    // Mark as read when action is taken
    await unifiedNotificationStore.markAsRead(notification.id);

    // Handle action based on type
    switch (action.type) {
      case 'view_challenge':
        handleViewChallenge(notification);
        break;
      case 'view_competition':
      case 'join_competition':
        handleViewCompetition(notification);
        break;
      case 'view_results':
        handleViewResults(notification);
        break;
      case 'view_wallet':
        handleViewWallet();
        break;
      default:
        console.log('Unhandled action type:', action.type);
    }
  };

  const handleDefaultAction = (notification: UnifiedNotification) => {
    // Default action when tapping notification (not a button)
    switch (notification.type) {
      case 'challenge_received':
        handleViewChallenge(notification);
        break;
      case 'competition_announcement':
      case 'competition_reminder':
        handleViewCompetition(notification);
        break;
      case 'competition_results':
        handleViewResults(notification);
        break;
      case 'incoming_zap':
        handleViewWallet();
        break;
      case 'team_join_request':
        onClose();
        navigation.navigate('Social');
        break;
      default:
        console.log('No default action for type:', notification.type);
    }
  };

  const handleViewChallenge = (notification: UnifiedNotification) => {
    onClose();
    // For now, just close the modal - challenge details screen may not exist yet
    console.log('View challenge:', (notification.metadata as any)?.challengeId);
  };

  const handleViewCompetition = (notification: UnifiedNotification) => {
    onClose();
    // Navigate to Clubs tab to view competitions
    navigation.navigate('Social');
  };

  const handleViewResults = (notification: UnifiedNotification) => {
    onClose();
    // Navigate to Clubs tab where results would be displayed
    navigation.navigate('Social');
  };

  const handleViewWallet = () => {
    onClose();
    // Navigate to Profile tab (wallet is displayed there)
    navigation.navigate('Profile');
  };


  const handleMarkAllAsRead = async () => {
    await unifiedNotificationStore.markAllAsRead();
    Toast.show({
      type: 'success',
      text1: 'Done',
      text2: 'All notifications marked as read',
    });
  };

  const renderSection = (
    title: string,
    notifications: UnifiedNotification[]
  ) => {
    if (notifications.length === 0) return null;

    return (
      <View style={styles.section} key={title}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onPress={() => handleNotificationPress(notification)}
            onActionPress={(actionId) =>
              handleActionPress(notification, actionId)
            }
          />
        ))}
      </View>
    );
  };

  const hasNotifications =
    groupedNotifications.today.length +
      groupedNotifications.yesterday.length +
      groupedNotifications.thisWeek.length +
      groupedNotifications.older.length >
    0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Notifications</Text>

          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.markAllButtonText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {unreadCount === 0 && <View style={styles.headerSpacer} />}
        </View>

        {/* Notifications List */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.text}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {hasNotifications ? (
            <>
              {renderSection('Today', groupedNotifications.today)}
              {renderSection('Yesterday', groupedNotifications.yesterday)}
              {renderSection('This Week', groupedNotifications.thisWeek)}
              {renderSection('Older', groupedNotifications.older)}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="notifications-off-outline"
                size={64}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyStateTitle}>No Notifications</Text>
              <Text style={styles.emptyStateSubtitle}>
                You're all caught up! Notifications for challenges,
                competitions, and zaps will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  markAllButton: {
    padding: 4,
  },
  markAllButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
