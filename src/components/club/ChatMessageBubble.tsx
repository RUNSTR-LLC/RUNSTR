/**
 * ChatMessageBubble - Single chat message display
 *
 * Shows sender avatar, name, relative timestamp, and message content.
 * Captain messages get an orange left border and name in accent color.
 * Own messages have a subtle orange background tint.
 * Long press triggers delete for captains (moderation).
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import type { ClubMessage } from '../../types/club';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  senderProfile?: SenderProfile;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ChatMessageBubbleComponent: React.FC<ChatMessageBubbleProps> = ({
  message,
  isCaptain,
  isOwnMessage,
  canDelete,
  onDelete,
  senderProfile,
}) => {
  const displayName =
    senderProfile?.display_name ||
    senderProfile?.name ||
    message.sender_npub.slice(0, 12) + '...';
  const relativeTime = formatRelativeTime(message.created_at);

  const handleLongPress = useCallback(() => {
    if (!canDelete) return;

    Alert.alert(
      'Delete this message?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  }, [canDelete, onDelete]);

  return (
    <Pressable
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={({ pressed }) => [
        styles.container,
        isCaptain && styles.captainContainer,
        isOwnMessage && styles.ownContainer,
        pressed && canDelete && styles.pressedContainer,
      ]}
    >
      {/* Avatar */}
      <Avatar
        name={displayName}
        imageUrl={senderProfile?.picture}
        size={32}
        style={styles.avatar}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Header row: name + timestamp */}
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.senderName,
              isCaptain && styles.captainName,
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text style={styles.timestamp}>{relativeTime}</Text>
        </View>

        {/* Message body */}
        <Text style={styles.messageText}>{message.content}</Text>
      </View>
    </Pressable>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
    backgroundColor: '#0f0f0f',
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
});

export const ChatMessageBubble = React.memo(ChatMessageBubbleComponent);
export default ChatMessageBubble;
