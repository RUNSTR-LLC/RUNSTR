/**
 * ChatMessage Component - Individual message bubble in team chat
 * Shows avatar, author name, message content, timestamp, and action buttons
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { NostrProfile, nostrProfileService } from '../../services/nostr/NostrProfileService';

interface ChatMessageProps {
  event: NDKEvent;
  isOwnMessage: boolean;
  onZap?: (pubkey: string) => void;
  onChallenge?: (pubkey: string) => void;
}

const truncatePubkey = (pubkey: string): string => {
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  // Show time if same day
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  // Show date if different day
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  event,
  isOwnMessage,
  onZap,
  onChallenge
}) => {
  const [userProfile, setUserProfile] = useState<NostrProfile | null>(null);

  useEffect(() => {
    if (!isOwnMessage) {
      fetchProfile();
    }
  }, [event.pubkey]);

  const fetchProfile = async () => {
    try {
      const profile = await nostrProfileService.getProfile(event.pubkey);
      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const displayName = userProfile?.display_name ||
                      userProfile?.name ||
                      truncatePubkey(event.pubkey);

  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
    ]}>
      {!isOwnMessage && (
        <View style={styles.messageHeader}>
          <Avatar
            name={displayName}
            size={32}
            imageUrl={userProfile?.picture}
          />
          <Text style={styles.authorName}>
            {displayName}
          </Text>
        </View>
      )}

      <View style={[
        styles.bubble,
        isOwnMessage ? styles.ownBubble : styles.otherBubble
      ]}>
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {event.content}
        </Text>

        <Text style={styles.timestamp}>
          {formatTimestamp(event.created_at!)}
        </Text>
      </View>

      {!isOwnMessage && (onZap || onChallenge) && (
        <View style={styles.actions}>
          {onZap && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onZap(event.pubkey)}
            >
              <Text style={styles.actionIcon}>⚡</Text>
            </TouchableOpacity>
          )}

          {onChallenge && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onChallenge(event.pubkey)}
            >
              <Text style={styles.actionIcon}>🏆</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  authorName: {
    color: theme.colors.orangeBright,
    fontSize: theme.typography.eventDetails,
    fontWeight: theme.typography.weights.semiBold,
    marginLeft: theme.spacing.lg,
  },
  bubble: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
  },
  ownBubble: {
    backgroundColor: theme.colors.orangeDeep, // Orange for own messages
  },
  otherBubble: {
    backgroundColor: theme.colors.border, // Dark grey for others
    borderWidth: 1,
    borderColor: theme.colors.gray,
  },
  messageText: {
    fontSize: theme.typography.body,
    lineHeight: 20,
  },
  ownMessageText: {
    color: theme.colors.accentText, // Black text on orange bubble
  },
  otherMessageText: {
    color: theme.colors.text, // Orange text on dark bubble
  },
  timestamp: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
  },
  actionButton: {
    marginRight: theme.spacing.xl,
  },
  actionIcon: {
    fontSize: 16,
  },
});
