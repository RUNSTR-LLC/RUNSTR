/**
 * ChallengeRequestCard - Displays incoming challenge request with accept/decline actions
 * Used in NotificationModal to show challenge requests from other users
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { ChallengeNotification } from '../../services/notifications/ChallengeNotificationHandler';
import { challengeNotificationHandler } from '../../services/notifications/ChallengeNotificationHandler';

interface ChallengeRequestCardProps {
  notification: ChallengeNotification;
  onAccept?: () => void;
  onDecline?: () => void;
  onViewChallenge?: (challengeId: string) => void;
}

export const ChallengeRequestCard: React.FC<ChallengeRequestCardProps> = ({
  notification,
  onAccept,
  onDecline,
  onViewChallenge,
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>(
    notification.type === 'request' ? 'pending' : notification.type === 'accepted' ? 'accepted' : 'declined'
  );

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const result = await challengeNotificationHandler.acceptChallenge(notification.id);
      if (result.success) {
        setStatus('accepted');
        onAccept?.();
      } else {
        console.error('Failed to accept challenge:', result.error);
        // TODO: Show error toast
      }
    } catch (error) {
      console.error('Error accepting challenge:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      const result = await challengeNotificationHandler.declineChallenge(notification.id);
      if (result.success) {
        setStatus('declined');
        onDecline?.();
      } else {
        console.error('Failed to decline challenge:', result.error);
      }
    } catch (error) {
      console.error('Error declining challenge:', error);
    } finally {
      setIsDeclining(false);
    }
  };

  const getActivityIcon = () => {
    const iconMap: Record<string, string> = {
      running: 'walk',
      walking: 'walk-outline',
      cycling: 'bicycle',
      hiking: 'trail-sign',
      swimming: 'water',
      rowing: 'boat',
      workout: 'fitness',
    };
    return iconMap[notification.activityType] || 'trophy';
  };

  const formatDuration = () => {
    if (notification.duration === 1) return '1 day';
    if (notification.duration === 7) return '1 week';
    if (notification.duration === 14) return '2 weeks';
    if (notification.duration === 30) return '1 month';
    return `${notification.duration} days`;
  };

  const formatMetric = () => {
    const metricMap: Record<string, string> = {
      distance: 'Distance',
      duration: 'Duration',
      count: 'Count',
      calories: 'Calories',
      pace: 'Pace',
    };
    return metricMap[notification.metric] || notification.metric;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {notification.challengerAvatar ? (
            <Image
              source={{ uri: notification.challengerAvatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {notification.challengerName?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerText}>
          <Text style={styles.challengerName}>
            {notification.challengerName || 'Unknown User'}
          </Text>
          <Text style={styles.challengeTitle}>challenged you!</Text>
        </View>

        <Ionicons
          name={getActivityIcon() as any}
          size={24}
          color={theme.colors.accent}
        />
      </View>

      {/* Challenge Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="barbell-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{notification.activityType}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="speedometer-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{formatMetric()}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{formatDuration()}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="flash" size={16} color={theme.colors.accent} />
          <Text style={styles.detailText}>{notification.wagerAmount} sats</Text>
        </View>
      </View>

      {/* Action Buttons */}
      {status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={handleDecline}
            disabled={isDeclining || isAccepting}
            activeOpacity={0.7}
          >
            {isDeclining ? (
              <ActivityIndicator size="small" color={theme.colors.text} />
            ) : (
              <>
                <Ionicons name="close-outline" size={20} color={theme.colors.text} />
                <Text style={styles.declineButtonText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={handleAccept}
            disabled={isAccepting || isDeclining}
            activeOpacity={0.7}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color={theme.colors.accentText} />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={20} color={theme.colors.accentText} />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Status Message */}
      {status === 'accepted' && (
        <View style={styles.statusContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#00ff00" />
          <Text style={styles.statusText}>Challenge Accepted!</Text>
          {onViewChallenge && (
            <TouchableOpacity onPress={() => onViewChallenge(notification.challengeId)}>
              <Text style={styles.viewLink}>View Challenge</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {status === 'declined' && (
        <View style={styles.statusContainer}>
          <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
          <Text style={[styles.statusText, styles.statusTextDeclined]}>
            Challenge Declined
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerText: {
    flex: 1,
  },
  challengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  challengeTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  declineButton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  acceptButton: {
    backgroundColor: theme.colors.accent,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ff00',
  },
  statusTextDeclined: {
    color: theme.colors.textMuted,
  },
  viewLink: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
    marginLeft: 8,
  },
});
