/**
 * MessageBubble
 *
 * Styled chat message bubble for user/assistant messages.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import type { ChatMessage } from '../../services/ai/ChatCoachService';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(
  ({ message }) => {
    const isUser = message.role === 'user';

    return (
      <View
        style={[
          styles.container,
          isUser ? styles.userContainer : styles.assistantContainer,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.text,
              isUser ? styles.userText : styles.assistantText,
            ]}
          >
            {message.content}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    );
  }
);

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
    borderRadius: theme.borderRadius.large,
  },
  userBubble: {
    backgroundColor: theme.colors.orangeDeep,
    borderBottomRightRadius: theme.spacing.sm,
  },
  assistantBubble: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: theme.spacing.sm,
  },
  text: {
    fontSize: theme.typography.body,
    lineHeight: 20,
  },
  userText: {
    color: '#000',
  },
  assistantText: {
    color: theme.colors.text,
  },
  timestamp: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
});

export default MessageBubble;
