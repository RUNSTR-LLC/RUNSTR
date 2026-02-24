# Full-Screen Club Chat — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an expand button on the embedded club chat that pushes a full-screen chat screen.

**Architecture:** Create a new `ClubChatScreen` that reuses the existing `useClubChat` hook and `ChatMessageBubble` component. Add an expand icon to the CHAT section header in `ClubChatSection`. Register the new screen in `App.tsx` next to the existing `ClubPage` screen.

**Tech Stack:** React Native, TypeScript, React Navigation (stack), Ionicons

---

## Task 1: Create ClubChatScreen

**Files:**
- Create: `src/screens/ClubChatScreen.tsx`

**Step 1: Create the full-screen chat screen**

```tsx
/**
 * ClubChatScreen - Full-screen club chat pushed from club page
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
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { useClubChat } from '../hooks/useClubChat';
import { ChatMessageBubble } from '../components/club/ChatMessageBubble';
import type { SenderProfile } from '../components/club/ChatMessageBubble';
import type { ClubMessage, ReplyContext } from '../types/club';
import { nostrProfileService } from '../services/nostr/NostrProfileService';
import type { NostrProfile } from '../services/nostr/NostrProfileService';

interface ClubChatScreenProps {
  navigation: any;
  route: {
    params: {
      clubId: string;
      clubName: string;
      captainNpub: string;
    };
  };
}

export const ClubChatScreen: React.FC<ClubChatScreenProps> = ({
  navigation,
  route,
}) => {
  const { clubId, clubName, captainNpub } = route.params;

  const [userNpub, setUserNpub] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ClubMessage | null>(null);
  const [isAnnouncementMode, setIsAnnouncementMode] = useState(false);
  const [profiles, setProfiles] = useState<Map<string, NostrProfile>>(new Map());
  const fetchedNpubsRef = useRef<Set<string>>(new Set());

  const isCaptain = userNpub === captainNpub;

  useEffect(() => {
    const load = async () => {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      setUserNpub(npub);
    };
    load();
  }, []);

  const {
    messages,
    isLoading,
    isSending,
    canSend,
    hasMore,
    sendMessage,
    loadMore,
    deleteMessage,
    toggleReaction,
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
        console.error('[ClubChatScreen] Error fetching profiles:', err);
      }
    };
    fetchProfiles();
  }, [messages]);

  // Handlers
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (trimmed.length === 0 || !canSend || isSending) return;
    setInputText('');
    Keyboard.dismiss();
    const options: Parameters<typeof sendMessage>[1] = {};
    if (replyingTo) options.replyToId = replyingTo.id;
    if (isAnnouncementMode && isCaptain) options.messageType = 'announcement';
    const success = await sendMessage(trimmed, Object.keys(options).length > 0 ? options : undefined);
    if (success) {
      setReplyingTo(null);
      setIsAnnouncementMode(false);
    } else {
      setInputText(trimmed);
    }
  }, [inputText, canSend, isSending, sendMessage, replyingTo, isAnnouncementMode, isCaptain]);

  const handleDelete = useCallback(async (messageId: string) => {
    await deleteMessage(messageId);
  }, [deleteMessage]);

  const handleReply = useCallback((item: ClubMessage) => {
    setReplyingTo(item);
  }, []);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    toggleReaction(messageId, emoji);
  }, [toggleReaction]);

  // Render helpers
  const getProfileForNpub = useCallback((npub: string): SenderProfile | undefined => {
    const p = profiles.get(npub);
    if (!p) return undefined;
    return { name: p.name, display_name: p.display_name, picture: p.picture };
  }, [profiles]);

  const getReplyContext = useCallback((replyToId: string | null): ReplyContext | undefined => {
    if (!replyToId) return undefined;
    const target = messages.find((m) => m.id === replyToId);
    if (!target) return undefined;
    const p = profiles.get(target.sender_npub);
    return {
      id: target.id,
      sender_npub: target.sender_npub,
      content: target.content.slice(0, 80),
      sender_name: p?.display_name || p?.name,
    };
  }, [messages, profiles]);

  const renderMessage = useCallback(({ item }: { item: ClubMessage }) => {
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
        onReply={() => handleReply(item)}
        onReact={(emoji) => handleReact(item.id, emoji)}
        replyContext={getReplyContext(item.reply_to_id)}
        userNpub={userNpub ?? undefined}
        senderProfile={getProfileForNpub(item.sender_npub)}
      />
    );
  }, [captainNpub, userNpub, handleDelete, handleReply, handleReact, getProfileForNpub, getReplyContext]);

  const placeholderText = !canSend
    ? 'Rate limited...'
    : isAnnouncementMode
    ? 'Write an announcement...'
    : `Message ${clubName}`;

  const canSendNow = canSend && !isSending && inputText.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{clubName}</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {isLoading && messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onEndReached={() => {
              if (hasMore && !isLoading) loadMore();
            }}
            onEndReachedThreshold={0.3}
          />
        )}

        {/* Reply bar */}
        {replyingTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyBarContent}>
              <Text style={styles.replyBarLabel}>Replying to:</Text>
              <Text style={styles.replyBarText} numberOfLines={1}>
                {replyingTo.content.slice(0, 60)}
              </Text>
            </View>
            <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
              <Ionicons name="close" size={18} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        )}

        {/* Input bar */}
        {userNpub && (
          <View style={[styles.inputBar, isAnnouncementMode && styles.inputBarAnnouncement]}>
            {isCaptain && (
              <TouchableOpacity
                onPress={() => setIsAnnouncementMode((prev) => !prev)}
                style={[
                  styles.announcementButton,
                  isAnnouncementMode && styles.announcementButtonActive,
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="megaphone"
                  size={18}
                  color={isAnnouncementMode ? theme.colors.accent : theme.colors.textDark}
                />
              </TouchableOpacity>
            )}
            <TextInput
              style={[styles.textInput, !canSend && styles.textInputDisabled]}
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
              style={[styles.sendButton, canSendNow && styles.sendButtonActive]}
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
                  color={canSendNow ? theme.colors.accent : theme.colors.textDark}
                />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  messageList: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  replyBarContent: {
    flex: 1,
    marginRight: 8,
  },
  replyBarLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
    marginBottom: 1,
  },
  replyBarText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  inputBarAnnouncement: {
    borderColor: 'rgba(204, 122, 51, 0.3)',
  },
  announcementButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  announcementButtonActive: {
    backgroundColor: 'rgba(204, 122, 51, 0.12)',
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

export default ClubChatScreen;
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors in this file)

**Step 3: Commit**

```bash
git add src/screens/ClubChatScreen.tsx
git commit -m "Feature: Add full-screen ClubChatScreen"
```

---

## Task 2: Register ClubChatScreen in App.tsx navigation

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add ClubChat to the route params type**

In the `AuthenticatedStackParamList` type (around line 281), add before the closing brace:
```typescript
ClubChat: { clubId: string; clubName: string; captainNpub: string };
```

**Step 2: Add the screen registration**

Right before the `ClubPage` Screen (around line 885), add:
```tsx
{/* Club Chat Screen - Full-screen chat view */}
<AuthenticatedStack.Screen
  name="ClubChat"
  options={{ headerShown: false }}
>
  {({ navigation, route }) => {
    const ClubChatScreen = require('./screens/ClubChatScreen').ClubChatScreen;
    return <ClubChatScreen route={route} navigation={navigation} />;
  }}
</AuthenticatedStack.Screen>
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "Feature: Register ClubChatScreen in navigation"
```

---

## Task 3: Add expand icon to ClubChatSection header

**Files:**
- Modify: `src/components/club/ClubChatSection.tsx`

**Step 1: Add navigation import and expand button**

Add import:
```typescript
import { useNavigation } from '@react-navigation/native';
```

Inside the component, after the existing hooks, add:
```typescript
const navigation = useNavigation<any>();
```

**Step 2: Replace the CHAT label with a header row**

Find the `<Text style={styles.sectionLabel}>CHAT</Text>` and replace with:
```tsx
<View style={styles.chatHeaderRow}>
  <Text style={styles.sectionLabel}>CHAT</Text>
  <TouchableOpacity
    onPress={() => navigation.navigate('ClubChat', {
      clubId,
      clubName,
      captainNpub,
    })}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Ionicons name="expand-outline" size={18} color={theme.colors.textMuted} />
  </TouchableOpacity>
</View>
```

Do the same for the members-only locked state return (replace the label there too with the same header row, but without the expand button since non-members can't chat).

**Step 3: Add chatHeaderRow style**

```typescript
chatHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 6,
},
```

And remove `marginBottom` from `sectionLabel` (since chatHeaderRow now handles it).

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/club/ClubChatSection.tsx
git commit -m "Feature: Add expand icon to club chat header"
```

---

## Verification

1. `npm run typecheck` — must pass after each task
2. Manual test: open club page → see expand icon next to CHAT label
3. Manual test: tap expand → full-screen chat opens with all messages
4. Manual test: send a message in full-screen chat → appears in real-time
5. Manual test: tap back arrow → returns to club page dashboard
6. Manual test: reply and react work in full-screen chat
