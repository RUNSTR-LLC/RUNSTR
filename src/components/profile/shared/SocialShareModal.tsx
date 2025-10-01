/**
 * SocialShareModal - Modal for sharing workouts to social platforms
 * Currently supports Nostr with other platforms coming soon
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../../../styles/theme';
import { WorkoutPublishingService } from '../../../services/nostr/workoutPublishingService';
import { WorkoutStatusTracker } from '../../../services/fitness/WorkoutStatusTracker';
import { getNsecFromStorage } from '../../../utils/nostr';
import type { Workout } from '../../../types/workout';

interface SocialShareModalProps {
  visible: boolean;
  workout: Workout | null;
  userId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Platform {
  id: string;
  name: string;
  icon: string;
  available: boolean;
  color: string;
}

const platforms: Platform[] = [
  { id: 'nostr', name: 'Nostr', icon: '⚡', available: true, color: '#8B5CF6' },
  { id: 'twitter', name: 'Twitter', icon: '🐦', available: false, color: '#1DA1F2' },
  { id: 'instagram', name: 'Instagram', icon: '📸', available: false, color: '#E4405F' },
  { id: 'facebook', name: 'Facebook', icon: '👤', available: false, color: '#1877F2' },
];

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  visible,
  workout,
  userId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const publishingService = WorkoutPublishingService.getInstance();
  const statusTracker = WorkoutStatusTracker.getInstance();

  const handleShare = async (platform: Platform) => {
    if (!workout || !platform.available) return;

    if (platform.id === 'nostr') {
      setSelectedPlatform(platform.id);
      setLoading(true);

      try {
        // Get user's nsec
        const nsec = await getNsecFromStorage(userId);
        if (!nsec) {
          Alert.alert(
            'Authentication Required',
            'Please log in with your Nostr key to share workouts.'
          );
          return;
        }

        // Post to Nostr as kind 1 social event
        const result = await publishingService.postWorkoutToSocial(
          workout,
          nsec,
          userId,
          {
            includeCard: true,
            cardTemplate: 'achievement',
            includeStats: true,
            includeMotivation: true,
          }
        );

        if (result.success) {
          // Mark as posted
          await statusTracker.markAsPosted(workout.id, result.eventId);

          Alert.alert(
            'Success',
            'Workout shared to Nostr successfully!',
            [{ text: 'OK', onPress: () => {
              onSuccess?.();
              onClose();
            }}]
          );
        } else {
          throw new Error(result.error || 'Failed to share workout');
        }
      } catch (error) {
        console.error('Failed to share to Nostr:', error);
        Alert.alert(
          'Error',
          'Failed to share workout. Please try again.'
        );
      } finally {
        setLoading(false);
        setSelectedPlatform(null);
      }
    } else {
      // Coming soon for other platforms
      Alert.alert(
        'Coming Soon',
        `${platform.name} integration is coming soon!`
      );
    }
  };

  const formatWorkoutSummary = (workout: Workout): string => {
    const type = workout.type.charAt(0).toUpperCase() + workout.type.slice(1);
    const duration = Math.round(workout.duration / 60);
    const distance = workout.distance
      ? ` • ${(workout.distance / 1000).toFixed(2)}km`
      : '';
    return `${type} • ${duration} min${distance}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share Workout</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Workout Preview */}
          {workout && (
            <View style={styles.workoutPreview}>
              <Text style={styles.workoutSummary}>
                {formatWorkoutSummary(workout)}
              </Text>
              <Text style={styles.workoutDate}>
                {new Date(workout.startTime).toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Platforms */}
          <View style={styles.platforms}>
            {platforms.map((platform) => (
              <TouchableOpacity
                key={platform.id}
                style={[
                  styles.platformButton,
                  !platform.available && styles.platformDisabled,
                  selectedPlatform === platform.id && styles.platformSelected,
                ]}
                onPress={() => handleShare(platform)}
                disabled={!platform.available || loading}
              >
                <Text style={styles.platformIcon}>{platform.icon}</Text>
                <Text style={[
                  styles.platformName,
                  !platform.available && styles.platformNameDisabled,
                ]}>
                  {platform.name}
                </Text>
                {!platform.available && (
                  <Text style={styles.comingSoon}>Coming Soon</Text>
                )}
                {loading && selectedPlatform === platform.id && (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.accent}
                    style={styles.loader}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Info Text */}
          <Text style={styles.infoText}>
            Share your workout achievements with your social networks
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  workoutPreview: {
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  workoutSummary: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  workoutDate: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  platforms: {
    marginBottom: 24,
  },
  platformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  platformDisabled: {
    opacity: 0.5,
  },
  platformSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '10',
  },
  platformIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  platformName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  platformNameDisabled: {
    color: theme.colors.textSecondary,
  },
  comingSoon: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  loader: {
    marginLeft: 8,
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});