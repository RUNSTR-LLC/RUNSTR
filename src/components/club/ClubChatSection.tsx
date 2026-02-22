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
import type { SenderProfile } from './ChatMessageBubble';
import type { ClubMessage } from '../../types/club';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';

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
  const [profiles, setProfiles] = useState<Map<string, NostrProfile>>(new Map());
  const fetchedNpubsRef = useRef<Set<string>>(new Set());

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

  // Fetch profiles for message senders
  useEffect(() => {
    if (messages.length === 0) return;

    const newNpubs = messages
      .map((m) => m.sender_npub)
      .filter((npub) => !fetchedNpubsRef.current.has(npub));

    const uniqueNew = [...new Set(newNpubs)];
    if (uniqueNew.length === 0) return;

    uniqueNew.forEach((npub) => fetchedNpubsRef.current.add(npub));

    const fetchProfiles = async () => {
      try {
        const fetched = await nostrProfileService.getProfiles(uniqueNew);
        setProfiles((prev) => {
          const merged = new Map(prev);
          fetched.forEach((profile, npub) => merged.set(npub, profile));
          return merged;
        });
      } catch (err) {
        console.error('[ClubChatSection] Error fetching profiles:', err);
      }
    };

    fetchProfiles();
  }, [messages]);

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

  const getProfileForNpub = useCallback(
    (npub: string): SenderProfile | undefined => {
      const p = profiles.get(npub);
      if (!p) return undefined;
      return { name: p.name, display_name: p.display_name, picture: p.picture };
    },
    [profiles]
  );

  const renderMessage = useCallback(
    (item: ClubMessage) => {
      const isCaptainMsg = item.sender_npub === captainNpub;
      const isOwnMessage = item.sender_npub === userNpub;
      const canDeleteMessage = userNpub === captainNpub || isOwnMessage;

      return (
        <ChatMessageBubble
          message={item}
          isCaptain={isCaptainMsg}
          isOwnMessage={isOwnMessage}
          canDelete={canDeleteMessage}
          onDelete={() => handleDelete(item.id)}
          senderProfile={getProfileForNpub(item.sender_npub)}
        />
      );
    },
    [captainNpub, userNpub, handleDelete, getProfileForNpub]
  );

  // No auto-scroll needed - inverted FlatList keeps newest at bottom

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

  // Members-only gate: show lock teaser for non-members
  if (!isMember) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CHAT</Text>
        <View style={styles.lockedContainer}>
          <Ionicons
            name="lock-closed"
            size={36}
            color={theme.colors.textDark}
          />
          <Text style={styles.lockedTitle}>Members Only</Text>
          <Text style={styles.lockedSubtitle}>
            Join {clubName} to access the club chat
          </Text>
        </View>
      </View>
    );
  }

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
            <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => renderMessage(item)}
            keyExtractor={(item) => item.id}
            inverted
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={true}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.1}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={5}
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
  lockedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lockedTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginTop: 10,
  },
  lockedSubtitle: {
    fontSize: 14,
    color: theme.colors.textDark,
    marginTop: 4,
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
    backgroundColor: 'rgba(204, 122, 51, 0.1)',
  },
});

export const ClubChatSection = React.memo(ClubChatSectionComponent);
export default ClubChatSection;
