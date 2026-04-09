# Social Feed Phase 2 — Outbound Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline comment posting (kind 1 replies to Nostr) and single-tap NWC zapping to the social feed.

**Architecture:** Comments publish to Nostr as kind 1 replies and appear optimistically in local state. Zaps use the existing `useNWCZap` hook for instant single-tap payments (50 sats default), with `ExternalZapModal` fallback for non-NWC users and long-press custom amounts. All users have keypairs — no anonymous gates.

**Tech Stack:** React Native, TypeScript, NDK (@nostr-dev-kit/ndk), NWC (useNWCZap hook), AsyncStorage

**Spec:** `docs/superpowers/specs/2026-04-05-social-feed-phase2-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/services/social/SocialInteractionService.ts` | Modify | Add `publishComment()` method |
| `src/components/social/InlineCommentList.tsx` | Modify | Add text input, optimistic comments, send handler |
| `src/components/social/SocialInteractionRow.tsx` | Modify | Single-tap NWC zap, long-press modal, pass event data to InlineCommentList |
| `src/components/social/SocialFeedPost.tsx` | Modify | Pass `event_id` and `npub` through to SocialInteractionRow |
| `src/screens/CommentsScreen.tsx` | Modify | Add reply input at bottom |

---

### Task 1: Add publishComment to SocialInteractionService

**Files:**
- Modify: `src/services/social/SocialInteractionService.ts`

- [ ] **Step 1: Add the publishComment method**

Add this method to the `SocialInteractionService` class, after the `zap` method (after line 74):

```typescript
  async publishComment(eventId: string, authorPubkey: string, content: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const ndk = await GlobalNDKService.getInstance();
      const signer = await UnifiedSigningService.getInstance().getSigner();
      if (!signer) throw new Error('No signer');

      const event = new NDKEvent(ndk);
      event.kind = 1 as NDKKind;
      event.content = content;
      event.tags = [
        ['e', eventId, '', 'root'],
        ['p', authorPubkey],
      ];

      await Promise.race([
        event.publish(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Publish timeout')), PUBLISH_TIMEOUT_MS)),
      ]);

      return { success: true };
    } catch (err) {
      console.warn('[SocialInteraction] Comment publish failed:', err);
      return { success: false, error: 'Failed to publish comment' };
    }
  }
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/services/social/SocialInteractionService.ts
git commit -m "Feature: Add publishComment method for kind 1 replies to Nostr"
```

---

### Task 2: Add Reply Input to InlineCommentList

**Files:**
- Modify: `src/components/social/InlineCommentList.tsx`

- [ ] **Step 1: Update imports and props**

Replace the imports and interface (lines 1-16) with:

```typescript
// src/components/social/InlineCommentList.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { timeAgo } from '../../types/social';
import feedService from '../../services/social/SocialFeedService';
import SocialInteractionService from '../../services/social/SocialInteractionService';
import type { SocialFeedComment } from '../../types/social';

interface InlineCommentListProps {
  postId: string;
  postEventId: string;
  postAuthorPubkey: string;
  commentCount: number;
  expanded: boolean;
}
```

- [ ] **Step 2: Update the component to accept new props and add comment input state**

Replace the component declaration and state (lines 18-25) with:

```typescript
export const InlineCommentList: React.FC<InlineCommentListProps> = ({
  postId,
  postEventId,
  postAuthorPubkey,
  commentCount,
  expanded,
}) => {
  const navigation = useNavigation<any>();
  const [comments, setComments] = useState<SocialFeedComment[]>([]);
  const [optimisticComments, setOptimisticComments] = useState<SocialFeedComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
```

- [ ] **Step 3: Add the send handler**

After the existing `useEffect` (after line 42), add:

```typescript
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (trimmed.length === 0 || isSending) return;

    setInputText('');
    Keyboard.dismiss();
    setIsSending(true);

    // Get user info for optimistic display
    const userNpub = await AsyncStorage.getItem('@runstr:npub');
    const userName = await AsyncStorage.getItem('@runstr:display_name');

    // Optimistic comment
    const optimistic: SocialFeedComment = {
      id: `optimistic-${Date.now()}`,
      event_id: '',
      post_id: postId,
      sender_npub: userNpub || '',
      content: trimmed,
      author_name: userName || 'You',
      author_avatar: null,
      created_at: new Date().toISOString(),
      indexed_at: new Date().toISOString(),
    };

    setOptimisticComments((prev) => [optimistic, ...prev]);

    const result = await SocialInteractionService.publishComment(postEventId, postAuthorPubkey, trimmed);
    if (!result.success) {
      setOptimisticComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      setInputText(trimmed);
      Toast.show({ type: 'error', text1: 'Comment not sent', visibilityTime: 2000 });
    }

    setIsSending(false);
  }, [inputText, isSending, postId, postEventId, postAuthorPubkey]);
```

- [ ] **Step 4: Update the early return condition**

Replace the early return (line 44) with:

```typescript
  if (!expanded) return null;
```

This removes the `commentCount === 0` gate so the input is always visible when expanded (even with no existing comments).

- [ ] **Step 5: Update the loading early return**

Replace the loading check (lines 46-52) with:

```typescript
  if (isLoading && comments.length === 0 && optimisticComments.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        {renderInput()}
      </View>
    );
  }
```

Wait — we need to define `renderInput` first. Let me restructure. Replace the entire return block (lines 54-80) and the loading block with:

```typescript
  const allComments = [...optimisticComments, ...comments];

  const renderInput = () => (
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        value={inputText}
        onChangeText={setInputText}
        placeholder="Add a comment..."
        placeholderTextColor={theme.colors.textMuted}
        maxLength={500}
        multiline={false}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        editable={!isSending}
      />
      <TouchableOpacity
        onPress={handleSend}
        disabled={inputText.trim().length === 0 || isSending}
        activeOpacity={0.7}
      >
        <Ionicons
          name="send"
          size={18}
          color={inputText.trim().length > 0 ? theme.colors.accent : theme.colors.textDark}
        />
      </TouchableOpacity>
    </View>
  );

  if (isLoading && allComments.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        {renderInput()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {allComments.map((comment) => {
        const name = comment.author_name || comment.sender_npub.slice(0, 12) + '...';
        const isOptimistic = comment.id.startsWith('optimistic-');
        return (
          <View key={comment.id} style={[styles.commentRow, isOptimistic && styles.optimistic]}>
            <Avatar name={name} size={24} imageUrl={comment.author_avatar || undefined} />
            <View style={styles.commentContent}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor} numberOfLines={1}>{name}</Text>
                <Text style={styles.commentTime}>{isOptimistic ? 'now' : timeAgo(comment.created_at)}</Text>
              </View>
              <Text style={styles.commentText} numberOfLines={3}>{comment.content}</Text>
            </View>
          </View>
        );
      })}
      {commentCount > 5 && (
        <TouchableOpacity
          onPress={() => navigation.navigate('Comments', { postId, postEventId, postAuthorPubkey, commentCount })}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAll}>View all {commentCount} comments</Text>
        </TouchableOpacity>
      )}
      {renderInput()}
    </View>
  );
```

- [ ] **Step 6: Add new styles**

Add these to the StyleSheet:

```typescript
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  optimistic: {
    opacity: 0.6,
  },
```

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: Errors in `SocialInteractionRow.tsx` because `InlineCommentList` now requires `postEventId` and `postAuthorPubkey` props. Fixed in Task 4.

- [ ] **Step 8: Commit**

```bash
git add src/components/social/InlineCommentList.tsx
git commit -m "Feature: Add inline comment input with optimistic posting"
```

---

### Task 3: Add Reply Input to CommentsScreen

**Files:**
- Modify: `src/screens/CommentsScreen.tsx`

- [ ] **Step 1: Update imports**

Add these imports after the existing ones (after line 11):

```typescript
import { TextInput, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import SocialInteractionService from '../services/social/SocialInteractionService';
```

Also update the existing `react-native` import (line 4) to remove `View, Text, FlatList, ActivityIndicator, TouchableOpacity` if they'd be duplicated — actually, just add `TextInput, Keyboard, KeyboardAvoidingView, Platform` to the existing import on line 4:

Replace line 4:
```typescript
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
```

- [ ] **Step 2: Update route params and add state**

Replace the interface and initial state (lines 15-24) with:

```typescript
interface CommentsScreenProps {
  navigation: any;
  route: { params: { postId: string; postEventId: string; postAuthorPubkey: string; commentCount: number } };
}

export const CommentsScreen: React.FC<CommentsScreenProps> = ({ navigation, route }) => {
  const { postId, postEventId, postAuthorPubkey, commentCount } = route.params;
  const [comments, setComments] = useState<SocialFeedComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
```

- [ ] **Step 3: Add handleSend callback**

After the `loadMore` callback (after line 46), add:

```typescript
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (trimmed.length === 0 || isSending) return;

    setInputText('');
    Keyboard.dismiss();
    setIsSending(true);

    const userNpub = await AsyncStorage.getItem('@runstr:npub');
    const userName = await AsyncStorage.getItem('@runstr:display_name');

    const optimistic: SocialFeedComment = {
      id: `optimistic-${Date.now()}`,
      event_id: '',
      post_id: postId,
      sender_npub: userNpub || '',
      content: trimmed,
      author_name: userName || 'You',
      author_avatar: null,
      created_at: new Date().toISOString(),
      indexed_at: new Date().toISOString(),
    };

    setComments((prev) => [optimistic, ...prev]);

    const result = await SocialInteractionService.publishComment(postEventId, postAuthorPubkey, trimmed);
    if (!result.success) {
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      setInputText(trimmed);
      Toast.show({ type: 'error', text1: 'Comment not sent', visibilityTime: 2000 });
    }

    setIsSending(false);
  }, [inputText, isSending, postId, postEventId, postAuthorPubkey]);
```

- [ ] **Step 4: Wrap content in KeyboardAvoidingView and add input bar**

Replace the return JSX (lines 64-88) with:

```typescript
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments ({commentCount})</Text>
        <View style={{ width: 28 }} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
          />
        )}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Add a comment..."
            placeholderTextColor={theme.colors.textMuted}
            maxLength={500}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!isSending}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={inputText.trim().length === 0 || isSending}
            activeOpacity={0.7}
            style={styles.sendButton}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim().length > 0 ? theme.colors.accent : theme.colors.textDark}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
```

- [ ] **Step 5: Add new styles**

Add to the StyleSheet:

```typescript
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
```

- [ ] **Step 6: Update CommentsScreen route params in navigation types**

In `src/types/index.ts`, update the Comments entry in `RootStackParamList`:

```typescript
  Comments: { postId: string; postEventId: string; postAuthorPubkey: string; commentCount: number };
```

Also update the local `RootStackParamList` in `src/navigation/AppNavigator.tsx` to match:

```typescript
  Comments: { postId: string; postEventId: string; postAuthorPubkey: string; commentCount: number };
```

- [ ] **Step 7: Commit**

```bash
git add src/screens/CommentsScreen.tsx src/types/index.ts src/navigation/AppNavigator.tsx
git commit -m "Feature: Add reply input to CommentsScreen with optimistic posting"
```

---

### Task 4: Wire SocialInteractionRow — Pass Event Data and Single-Tap Zap

**Files:**
- Modify: `src/components/social/SocialInteractionRow.tsx`

- [ ] **Step 1: Add imports for NWC zap**

Add these imports after the existing imports (after line 13):

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNWCZap } from '../../hooks/useNWCZap';
```

- [ ] **Step 2: Add NWC zap hook and default amount state**

Inside the component, after the existing state declarations (after line 35), add:

```typescript
  const { hasWallet: hasNWC, sendZap } = useNWCZap();
  const [defaultZapAmount, setDefaultZapAmount] = useState(50);

  // Load saved default zap amount
  useEffect(() => {
    AsyncStorage.getItem('@runstr:default_zap_amount').then((stored) => {
      if (stored) setDefaultZapAmount(parseInt(stored, 10) || 50);
    });
  }, []);
```

Add `useEffect` to the imports on line 3:

```typescript
import React, { useState, useRef, useCallback, useEffect } from 'react';
```

- [ ] **Step 3: Replace handleZap with tap/long-press logic**

Replace the `handleZap` callback (lines 55-57) with:

```typescript
  const handleZapTap = useCallback(() => {
    if (hasNWC) {
      // Instant NWC zap at default amount
      debounce('zap', async () => {
        setZapTotal((z) => z + defaultZapAmount);
        Animated.sequence([
          Animated.timing(zapFlash, { toValue: 1.4, duration: 100, useNativeDriver: true }),
          Animated.timing(zapFlash, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        const success = await sendZap(post.npub, defaultZapAmount, `Zap from RUNSTR`);
        if (success) {
          Toast.show({ type: 'success', text1: `Zapped ${defaultZapAmount} sats`, visibilityTime: 1500 });
        } else {
          setZapTotal((z) => Math.max(z - defaultZapAmount, 0));
          Toast.show({ type: 'error', text1: 'Zap failed', visibilityTime: 2000 });
        }
      });
    } else {
      setShowZapModal(true);
    }
  }, [hasNWC, defaultZapAmount, post, debounce, sendZap, zapFlash]);

  const handleZapLongPress = useCallback(() => {
    setShowZapModal(true);
  }, []);
```

- [ ] **Step 4: Update the zap button JSX**

Replace the zap TouchableOpacity (line 95):

```typescript
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.action}
            onPress={handleZapTap}
            onLongPress={handleZapLongPress}
            delayLongPress={400}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: zapFlash }] }}>
              <Ionicons name="flash-outline" size={20} color={theme.colors.textMuted} />
            </Animated.View>
          </TouchableOpacity>
          {zapTotal > 0 && (
            <TouchableOpacity onPress={() => setShowZaps(true)} activeOpacity={0.7}>
              <Text style={styles.count}>{formatCount(zapTotal)}</Text>
            </TouchableOpacity>
          )}
        </View>
```

- [ ] **Step 5: Update InlineCommentList props**

Replace the InlineCommentList usage (line 144) with:

```typescript
      <InlineCommentList
        postId={post.id}
        postEventId={post.event_id}
        postAuthorPubkey={post.npub}
        commentCount={commentCount}
        expanded={commentsExpanded}
      />
```

- [ ] **Step 6: Update the comment button to always expand (allow commenting even with 0 comments)**

Replace the comment button `onPress` (lines 123-129) with:

```typescript
            onPress={() => setCommentsExpanded((prev) => !prev)}
```

Remove the Toast-based "No comments yet" gate — users should be able to open the input even on posts with no comments.

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/social/SocialInteractionRow.tsx
git commit -m "Feature: Single-tap NWC zap and wire comment input props"
```

---

### Task 5: Pass event_id and npub Through SocialFeedPost

**Files:**
- Modify: `src/components/social/SocialFeedPost.tsx`

This task is a no-op check. `SocialFeedPost` already passes the full `post` object to `SocialInteractionRow`:

```typescript
<SocialInteractionRow post={post} userNpub={userNpub} />
```

And `SocialInteractionRow` reads `post.event_id` and `post.npub` directly. No changes needed to `SocialFeedPost.tsx`.

- [ ] **Step 1: Verify no changes needed**

Read `src/components/social/SocialFeedPost.tsx` and confirm `post` is passed to `SocialInteractionRow`. Already verified — the full `post` object is passed at line 60.

- [ ] **Step 2: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit any remaining fixes**

If typecheck passes clean, no commit needed. If there are errors, fix and commit:

```bash
git add -A
git commit -m "Fix: Resolve typecheck issues for Phase 2 social interactions"
```
