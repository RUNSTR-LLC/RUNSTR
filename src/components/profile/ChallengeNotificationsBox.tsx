/**
 * ChallengeNotificationsBox - Displays incoming challenge requests on Profile
 * Shows pending challenges with accept/decline functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { theme } from '../../styles/theme';
import { challengeNotificationHandler, type ChallengeNotification } from '../../services/notifications/ChallengeNotificationHandler';

export const ChallengeNotificationsBox: React.FC = () => {
  const [notifications, setNotifications] = useState<ChallengeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    // Load initial notifications
    loadNotifications();

    // Subscribe to new notifications
    const unsubscribe = challengeNotificationHandler.onNotification((notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    // Start listening for incoming challenges
    challengeNotificationHandler.startListening().catch((error) => {
      console.error('Failed to start challenge notifications:', error);
    });

    return () => {
      unsubscribe();
      challengeNotificationHandler.stopListening();
    };
  }, []);

  const loadNotifications = () => {
    try {
      const allNotifications = challengeNotificationHandler.getNotifications();
      // Only show request-type notifications that haven't been read
      const pendingRequests = allNotifications.filter(
        (n) => n.type === 'request' && !n.read
      );
      setNotifications(pendingRequests);
    } catch (error) {
      console.error('Failed to load challenge notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (notificationId: string) => {
    setProcessingId(notificationId);
    try {
      const result = await challengeNotificationHandler.acceptChallenge(notificationId);

      if (result.success) {
        // Remove from pending list
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        Alert.alert('Success', 'Challenge accepted! Good luck!');
      } else {
        Alert.alert('Error', result.error || 'Failed to accept challenge');
      }
    } catch (error) {
      console.error('Error accepting challenge:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (notificationId: string) => {
    Alert.alert(
      'Decline Challenge',
      'Are you sure you want to decline this challenge?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(notificationId);
            try {
              const result = await challengeNotificationHandler.declineChallenge(notificationId);

              if (result.success) {
                // Remove from pending list
                setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
              } else {
                Alert.alert('Error', result.error || 'Failed to decline challenge');
              }
            } catch (error) {
              console.error('Error declining challenge:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  // Don't show the box if there are no pending challenges
  if (!loading && notifications.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Challenge Requests</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{notifications.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.text} />
        </View>
      ) : (
        <View style={styles.notificationsList}>
          {notifications.map((notification) => (
            <View key={notification.id} style={styles.notificationCard}>
              {/* Challenger Info */}
              <View style={styles.challengerInfo}>
                <View style={styles.avatar}>
                  {notification.challengerPicture ? (
                    <Image
                      source={{ uri: notification.challengerPicture }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {notification.challengerName?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  )}
                </View>
                <View style={styles.challengerDetails}>
                  <Text style={styles.challengerName}>
                    {notification.challengerName || 'Unknown User'}
                  </Text>
                  <Text style={styles.challengeDetails}>
                    {notification.activityType} • {notification.metric} • {notification.duration} days
                  </Text>
                  <Text style={styles.wagerText}>
                    Wager: {notification.wagerAmount.toLocaleString()} sats
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.declineButton,
                    processingId === notification.id && styles.disabledButton,
                  ]}
                  onPress={() => handleDecline(notification.id)}
                  disabled={processingId === notification.id}
                >
                  {processingId === notification.id ? (
                    <ActivityIndicator size="small" color={theme.colors.textMuted} />
                  ) : (
                    <Text style={styles.declineButtonText}>Decline</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.acceptButton,
                    processingId === notification.id && styles.disabledButton,
                  ]}
                  onPress={() => handleAccept(notification.id)}
                  disabled={processingId === notification.id}
                >
                  {processingId === notification.id ? (
                    <ActivityIndicator size="small" color={theme.colors.accentText} />
                  ) : (
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.background,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  notificationsList: {
    gap: 12,
  },
  notificationCard: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  challengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  challengerDetails: {
    flex: 1,
  },
  challengerName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  challengeDetails: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  wagerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  acceptButton: {
    backgroundColor: theme.colors.text,
  },
  disabledButton: {
    opacity: 0.5,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.background,
  },
});
