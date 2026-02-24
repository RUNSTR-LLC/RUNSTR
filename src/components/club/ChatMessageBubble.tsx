/**
 * ChatMessageBubble - Chat message with replies, reactions, announcements, workout cards.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, ActionSheetIOS, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import type { ClubMessage, ReplyContext } from '../../types/club';

const REACTION_ICONS: Record<string, { name: string; label: string }> = {
  flame: { name: 'flame-outline', label: 'Fire' },
  fitness: { name: 'fitness-outline', label: 'Strong' },
  thumbs: { name: 'thumbs-up-outline', label: 'Nice' },
  heart: { name: 'heart-outline', label: 'Love' },
  happy: { name: 'happy-outline', label: 'Haha' },
};
const ALLOWED_REACTIONS = Object.keys(REACTION_ICONS) as (keyof typeof REACTION_ICONS)[];

export interface SenderProfile {
  name?: string;
  display_name?: string;
  picture?: string;
}

interface ChatMessageBubbleProps {
  message: ClubMessage;
  isCaptain: boolean;
  isOwnMessage: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onReply?: () => void;
  onPin?: () => void;
  onChallenge?: () => void;
  onReact?: (emoji: string) => void;
  replyContext?: ReplyContext;
  userNpub?: string;
  senderProfile?: SenderProfile;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  const years = Math.floor(months / 12);
  return `${years}y`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getActivityIcon(exerciseType: string): string {
  switch (exerciseType) {
    case 'running': return 'walk-outline';
    case 'walking': return 'footsteps-outline';
    case 'cycling': return 'bicycle-outline';
    case 'hiking': return 'trail-sign-outline';
    case 'swimming': return 'water-outline';
    case 'strength': return 'barbell-outline';
    case 'yoga': return 'body-outline';
    case 'meditation': return 'leaf-outline';
    default: return 'fitness-outline';
  }
}

const ChatMessageBubbleComponent: React.FC<ChatMessageBubbleProps> = ({
  message,
  isCaptain,
  isOwnMessage,
  canDelete,
  onDelete,
  onReply,
  onPin,
  onChallenge,
  onReact,
  replyContext,
  userNpub,
  senderProfile,
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const displayName =
    senderProfile?.display_name ||
    senderProfile?.name ||
    message.sender_npub.slice(0, 12) + '...';
  const relativeTime = formatRelativeTime(message.created_at);

  const isAnnouncement = message.message_type === 'announcement';
  const isWorkout = message.message_type === 'workout';
  const reactions = message.reactions || {};

  const handleLongPress = useCallback(() => {
    const options: string[] = [];
    const actions: (() => void)[] = [];

    if (onReply) {
      options.push('Reply');
      actions.push(onReply);
    }

    if (onPin) {
      options.push('Pin');
      actions.push(onPin);
    }

    if (onChallenge && !isOwnMessage) {
      options.push('Challenge');
      actions.push(onChallenge);
    }

    if (canDelete) {
      options.push('Delete');
      actions.push(() => {
        Alert.alert(
          'Delete this message?',
          'This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ]
        );
      });
    }

    if (options.length === 0) return;

    options.push('Cancel');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: options.indexOf('Delete'),
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex < actions.length) {
            actions[buttonIndex]();
          }
        }
      );
    } else {
      // Android fallback: use Alert with buttons
      const buttons = actions.map((action, i) => ({
        text: options[i],
        onPress: action,
        style: (options[i] === 'Delete' ? 'destructive' : 'default') as 'destructive' | 'default',
      }));
      buttons.push({ text: 'Cancel', onPress: () => {}, style: 'default' as const });
      Alert.alert('Message Options', undefined, buttons);
    }
  }, [canDelete, onDelete, onReply, onPin, onChallenge, isOwnMessage]);

  const handleTap = useCallback(() => {
    if (onReact) {
      setShowReactionPicker((prev) => !prev);
    }
  }, [onReact]);

  const handleReactionSelect = useCallback((emoji: string) => {
    setShowReactionPicker(false);
    onReact?.(emoji);
  }, [onReact]);

  const handleReactionPillPress = useCallback((emoji: string) => {
    onReact?.(emoji);
  }, [onReact]);

  return (
    <View>
      <Pressable
        onPress={handleTap}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [
          styles.container,
          isCaptain && styles.captainContainer,
          isOwnMessage && styles.ownContainer,
          isAnnouncement && styles.announcementContainer,
          pressed && (canDelete || !!onReply) && styles.pressedContainer,
        ]}
      >
        {/* Avatar */}
        {!isWorkout && (
          <Avatar
            name={displayName}
            imageUrl={senderProfile?.picture}
            size={32}
            style={styles.avatar}
          />
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Reply quote block */}
          {replyContext && (
            <View style={styles.replyQuote}>
              <Text style={styles.replyName} numberOfLines={1}>
                {replyContext.sender_name || replyContext.sender_npub.slice(0, 12) + '...'}
              </Text>
              <Text style={styles.replyContent} numberOfLines={1}>
                {replyContext.content}
              </Text>
            </View>
          )}

          {/* Header row: name + timestamp + announcement icon */}
          <View style={styles.headerRow}>
            {isAnnouncement && (
              <Ionicons
                name="megaphone"
                size={14}
                color={theme.colors.accent}
                style={styles.announcementIcon}
              />
            )}
            {isWorkout ? (
              <View style={styles.workoutHeader}>
                <Ionicons
                  name={getActivityIcon(message.metadata?.exercise_type || '') as any}
                  size={16}
                  color={theme.colors.accent}
                  style={styles.workoutIcon}
                />
                <Text style={styles.workoutLabel}>Workout</Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.senderName,
                  isCaptain && styles.captainName,
                  isAnnouncement && styles.announcementName,
                ]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
            )}
            <Text style={styles.timestamp}>{relativeTime}</Text>
          </View>

          {/* Message body — workout card or text */}
          {isWorkout && message.metadata ? (
            <View style={styles.workoutCard}>
              <Text style={styles.messageText}>{message.content}</Text>
              <View style={styles.workoutStats}>
                <Text style={styles.workoutStat}>
                  {formatDuration(message.metadata.duration_seconds)}
                </Text>
                {message.metadata.distance_meters != null && message.metadata.distance_meters > 0 && (
                  <Text style={styles.workoutStat}>
                    {(message.metadata.distance_meters / 1000).toFixed(2)} km
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.messageText}>{message.content}</Text>
          )}

          {/* Reaction pills */}
          {Object.keys(reactions).length > 0 && (
            <View style={styles.reactionRow}>
              {Object.entries(reactions).map(([key, users]) => {
                const hasOwn = userNpub ? users.includes(userNpub) : false;
                const icon = REACTION_ICONS[key];
                if (!icon) return null;
                return (
                  <Pressable
                    key={key}
                    onPress={() => handleReactionPillPress(key)}
                    style={[styles.reactionPill, hasOwn && styles.reactionPillOwn]}
                  >
                    <Ionicons
                      name={icon.name as any}
                      size={14}
                      color={hasOwn ? theme.colors.accent : theme.colors.textMuted}
                      style={styles.reactionIcon}
                    />
                    <Text style={[styles.reactionCount, hasOwn && styles.reactionCountOwn]}>
                      {users.length}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </Pressable>

      {/* Reaction picker (shown on tap) */}
      {showReactionPicker && (
        <View style={styles.reactionPicker}>
          {ALLOWED_REACTIONS.map((key) => (
            <Pressable
              key={key}
              onPress={() => handleReactionSelect(key)}
              style={styles.reactionPickerButton}
            >
              <Ionicons
                name={REACTION_ICONS[key].name as any}
                size={22}
                color={theme.colors.textMuted}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  captainContainer: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  ownContainer: {
    backgroundColor: 'rgba(204, 122, 51, 0.05)',
    borderRightWidth: 3,
    borderRightColor: theme.colors.accent,
  },
  announcementContainer: {
    backgroundColor: 'rgba(204, 122, 51, 0.08)',
    borderColor: 'rgba(204, 122, 51, 0.25)',
  },
  pressedContainer: {
    opacity: 0.7,
  },
  avatar: {
    marginRight: 10,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  announcementIcon: {
    marginRight: 4,
  },
  announcementName: {
    color: theme.colors.accent,
  },
  senderName: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  captainName: {
    color: theme.colors.accent,
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.textDark,
  },
  messageText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  // Reply quote
  replyQuote: {
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.accent,
    paddingLeft: 8,
    marginBottom: 6,
    paddingVertical: 2,
  },
  replyName: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },
  replyContent: {
    fontSize: 12,
    color: theme.colors.textDark,
  },
  // Workout card
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  workoutIcon: {
    marginRight: 4,
  },
  workoutLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workoutCard: {
    marginTop: 2,
  },
  workoutStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  workoutStat: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.semiBold,
  },
  // Reactions
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reactionPillOwn: {
    backgroundColor: 'rgba(204, 122, 51, 0.12)',
    borderColor: 'rgba(204, 122, 51, 0.3)',
  },
  reactionIcon: {
    marginRight: 3,
  },
  reactionCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  reactionCountOwn: {
    color: theme.colors.accent,
  },
  // Reaction picker
  reactionPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 4,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: 40,
  },
  reactionPickerButton: {
    padding: 6,
  },
});

export const ChatMessageBubble = React.memo(ChatMessageBubbleComponent);
export default ChatMessageBubble;
