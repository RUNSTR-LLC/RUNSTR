/**
 * ChatInput
 *
 * Text input with send button for chat interface.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = React.memo(
  ({
    onSend,
    disabled = false,
    isLoading = false,
    placeholder = 'Type a message...',
  }) => {
    const [text, setText] = useState('');

    const handleSend = useCallback(() => {
      const trimmed = text.trim();
      if (trimmed && !disabled && !isLoading) {
        onSend(trimmed);
        setText('');
      }
    }, [text, onSend, disabled, isLoading]);

    const canSend = text.trim().length > 0 && !disabled && !isLoading;

    return (
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          maxLength={500}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.orangeBright} />
          ) : (
            <SendIcon active={canSend} />
          )}
        </TouchableOpacity>
      </View>
    );
  }
);

// Simple send arrow icon
const SendIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <View style={styles.iconContainer}>
    <View
      style={[
        styles.arrow,
        { borderColor: active ? theme.colors.orangeBright : theme.colors.textMuted },
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    maxHeight: 100,
    paddingVertical: theme.spacing.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: theme.colors.orangeDeep,
  },
  iconContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },
});

export default ChatInput;
