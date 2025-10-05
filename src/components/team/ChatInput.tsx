/**
 * ChatInput Component - Message input field for team chat
 * Handles text input with auto-resize and send button
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { theme } from '../../styles/theme';

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  loading?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  loading = false,
  placeholder = 'Type a message...'
}) => {
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);

  const handleSend = async () => {
    if (!text.trim() || loading) return;

    const content = text.trim();
    setText(''); // Clear input immediately
    setInputHeight(40); // Reset height
    Keyboard.dismiss();

    try {
      await onSend(content);
    } catch (error) {
      // Restore text on error
      setText(content);
      console.error('Send failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          { height: Math.min(inputHeight, 100) }
        ]}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        maxLength={500}
        onContentSizeChange={(e) => {
          setInputHeight(e.nativeEvent.contentSize.height);
        }}
        editable={!loading}
      />

      <TouchableOpacity
        style={[
          styles.sendButton,
          (!text.trim() || loading) && styles.sendButtonDisabled
        ]}
        onPress={handleSend}
        disabled={!text.trim() || loading}
      >
        <Text style={styles.sendButtonText}>
          {loading ? '...' : 'Send'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.gray,
  },
  sendButton: {
    marginLeft: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: 10,
    backgroundColor: theme.colors.orangeDeep,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.gray,
    opacity: 0.5,
  },
  sendButtonText: {
    color: theme.colors.accentText, // Black text on orange button
    fontWeight: theme.typography.weights.semiBold,
    fontSize: theme.typography.body,
  },
});
