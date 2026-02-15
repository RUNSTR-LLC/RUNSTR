/**
 * ClubChatSection - Embedded chat section for the club page
 *
 * Uses the useClubChat hook for state, messaging, realtime, and rate limiting.
 * Shows messages in an inverted FlatList (newest at bottom).
 * Captain messages get a left orange border and name in accent color.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { useClubChat } from '../../hooks/useClubChat';
import { ChatMessageBubble } from './ChatMessageBubble';
import type { ClubMessage } from '../../types/club';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClubChatSectionProps {
  clubId: string;
  clubName: string;
  captainNpub: string;
  isMember: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ClubChatSectionComponent: React.FC<ClubChatSectionProps> = ({
  clubId,
  clubName,
  captainNpub,
  isMember,
}) => {
  const [userNpub, setUserNpub] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<ClubMessage>>(null);

  // Load user npub
  useEffect(() => {
    const load = async () => {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      setUserNpub(npub);
    };
    load();
  }, []);

  // Club chat hook
  const {
    messages,
    isLoading,
    isSending,
    canSend,
    hasMore,
    sendMessage,
    loadMore,
    deleteMessage,
  } = useClubChat(clubId, userNpub);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (trimmed.length === 0 || !canSend || isSending) return;

    setInputText('');
    Keyboard.dismiss();

    const success = await sendMessage(trimmed);
    if (!success) {
      // Restore text if send failed
      setInputText(trimmed);
    }
  }, [inputText, canSend, isSending, sendMessage]);

  const handleDelete = useCallback(
    async (messageId: string) => {
      await deleteMessage(messageId);
    },
    [deleteMessage]
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoading) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderMessage = useCallback(
    ({ item }: { item: ClubMessage }) => {
      const isCaptain = item.sender_npub === captainNpub;
      const isOwnMessage = item.sender_npub === userNpub;
      // Captain can delete any message. Own messages can be deleted by sender.
      const canDeleteMessage =
        userNpub === captainNpub || isOwnMessage;

      return (
        <ChatMessageBubble
          message={item}
          isCaptain={isCaptain}
          isOwnMessage={isOwnMessage}
          canDelete={canDeleteMessage}
          onDelete={() => handleDelete(item.id)}
        />
      );
    },
    [captainNpub, userNpub, handleDelete]
  );

  const keyExtractor = useCallback(
    (item: ClubMessage) => item.id,
    []
  );

  // -------------------------------------------------------------------------
  // Input placeholder text
  // -------------------------------------------------------------------------

  const placeholderText = !canSend
    ? 'Rate limited...'
    : `Message ${clubName}`;

  const canSendNow = canSend && !isSending && inputText.trim().length > 0;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>CHAT</Text>

      {/* Messages list */}
      <View style={styles.chatContainer}>
        {isLoading && messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="chatbubbles-outline"
              size={36}
              color={theme.colors.textMuted}
            />
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            inverted={true}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      {/* Input bar - only shown to club members */}
      {userNpub && isMember && (
        <View style={styles.inputBar}>
          <TextInput
            style={[
              styles.textInput,
              !canSend && styles.textInputDisabled,
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={placeholderText}
            placeholderTextColor={theme.colors.textDark}
            editable={canSend}
            maxLength={1000}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={true}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              canSendNow && styles.sendButtonActive,
            ]}
            onPress={handleSend}
            disabled={!canSendNow}
            activeOpacity={0.7}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={
                  canSendNow
                    ? theme.colors.accent
                    : theme.colors.textDark
                }
              />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  chatContainer: {
    minHeight: 200,
    maxHeight: 400,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 8,
  },
  textInputDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  sendButtonActive: {
    backgroundColor: 'rgba(255, 123, 28, 0.1)',
  },
});

export const ClubChatSection = React.memo(ClubChatSectionComponent);
export default ClubChatSection;
