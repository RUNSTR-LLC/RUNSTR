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
import { WorkoutInteractionService } from '../../services/social/WorkoutInteractionService';
import type { WorkoutComment } from '../../services/social/WorkoutInteractionService';

interface InlineCommentListProps {
  eventId: string;
  userNpub: string;
  commentCount: number;
  expanded: boolean;
  onCommentAdded?: () => void;
}

export const InlineCommentList: React.FC<InlineCommentListProps> = ({
  eventId,
  userNpub,
  commentCount,
  expanded,
  onCommentAdded,
}) => {
  const navigation = useNavigation<any>();
  const [comments, setComments] = useState<WorkoutComment[]>([]);
  const [optimisticComments, setOptimisticComments] = useState<WorkoutComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    let mounted = true;
    setIsLoading(true);

    WorkoutInteractionService.getInstance().getComments(eventId, 5).then((fetched) => {
      if (mounted) {
        setComments(fetched);
        setIsLoading(false);
      }
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });

    return () => { mounted = false; };
  }, [expanded, eventId, commentCount]);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (trimmed.length === 0 || isSending) return;

    setInputText('');
    Keyboard.dismiss();
    setIsSending(true);

    const userName = await AsyncStorage.getItem('@runstr:display_name');
    const userAvatar = await AsyncStorage.getItem('@runstr:profile_picture');

    const optimistic: WorkoutComment = {
      id: `optimistic-${Date.now()}`,
      event_id: eventId,
      npub: userNpub,
      content: trimmed,
      author_name: userName || null,
      author_avatar: userAvatar || null,
      created_at: new Date().toISOString(),
    };

    setOptimisticComments((prev) => [optimistic, ...prev]);

    const result = await WorkoutInteractionService.getInstance().addComment(
      eventId,
      userNpub,
      trimmed,
      userName || undefined,
      userAvatar || undefined,
    );

    if (result) {
      // Replace optimistic entry with the real one and notify parent
      setOptimisticComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      setComments((prev) => [result, ...prev]);
      onCommentAdded?.();
    } else {
      setOptimisticComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      setInputText(trimmed);
      Toast.show({ type: 'error', text1: 'Comment not sent', visibilityTime: 2000 });
    }

    setIsSending(false);
  }, [inputText, isSending, eventId, userNpub, onCommentAdded]);

  if (!expanded) return null;

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
        const name = comment.author_name || (comment.npub?.slice(0, 12) ?? '?') + '...';
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
          onPress={() => navigation.navigate('Comments', { eventId, commentCount })}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAll}>View all {commentCount} comments</Text>
        </TouchableOpacity>
      )}
      {renderInput()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  commentRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  commentAuthor: { fontSize: 12, fontWeight: theme.typography.weights.semiBold, color: theme.colors.text, flexShrink: 1 },
  commentTime: { fontSize: 11, color: theme.colors.textMuted },
  commentText: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  viewAll: { fontSize: 13, color: theme.colors.accent, fontWeight: theme.typography.weights.medium, paddingVertical: 4 },
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
});
