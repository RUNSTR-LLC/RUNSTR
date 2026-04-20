// src/components/social/PostComposerModal.tsx

import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';

interface PostComposerModalProps {
  visible: boolean;
  onClose: () => void;
  onPost: (content: string) => Promise<void>;
}

export const PostComposerModal: React.FC<PostComposerModalProps> = ({
  visible,
  onClose,
  onPost,
}) => {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handlePost = async () => {
    const trimmed = content.trim();
    if (!trimmed || isPosting) return;

    setIsPosting(true);
    try {
      await onPost(trimmed);
      setContent('');
      onClose();
    } finally {
      setIsPosting(false);
    }
  };

  const handleClose = () => {
    if (isPosting) return;
    setContent('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      onShow={() => inputRef.current?.focus()}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={isPosting}>
            <Text style={[styles.cancelText, isPosting && styles.disabled]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePost}
            disabled={!content.trim() || isPosting}
            style={[
              styles.postButton,
              (!content.trim() || isPosting) && styles.postButtonDisabled,
            ]}
          >
            {isPosting ? (
              <ActivityIndicator size="small" color={theme.colors.accentText} />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="What's on your mind?"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          value={content}
          onChangeText={setContent}
          maxLength={500}
          editable={!isPosting}
          autoFocus
        />

        <View style={styles.footer}>
          <Text style={styles.charCount}>
            {content.length}/500
          </Text>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cancelText: {
    color: theme.colors.text,
    fontSize: 16,
  },
  disabled: {
    opacity: 0.4,
  },
  postButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    minWidth: 64,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  postButtonText: {
    color: theme.colors.accentText,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'flex-end',
  },
  charCount: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
});
