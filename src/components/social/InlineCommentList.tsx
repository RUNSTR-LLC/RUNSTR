// src/components/social/InlineCommentList.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { timeAgo } from '../../types/social';
import feedService from '../../services/social/SocialFeedService';
import type { SocialFeedComment } from '../../types/social';

interface InlineCommentListProps {
  postId: string;
  commentCount: number;
  expanded: boolean;
}

export const InlineCommentList: React.FC<InlineCommentListProps> = ({
  postId,
  commentCount,
  expanded,
}) => {
  const navigation = useNavigation<any>();
  const [comments, setComments] = useState<SocialFeedComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!expanded || commentCount === 0) return;
    let mounted = true;
    setIsLoading(true);

    feedService.getCommentsForPost(postId, 5).then((fetched) => {
      if (mounted) {
        setComments(fetched);
        setIsLoading(false);
      }
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });

    return () => { mounted = false; };
  }, [expanded, postId, commentCount]);

  if (!expanded || commentCount === 0) return null;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {comments.map((comment) => {
        const name = comment.author_name || comment.sender_npub.slice(0, 12) + '...';
        return (
          <View key={comment.id} style={styles.commentRow}>
            <Avatar name={name} size={24} imageUrl={comment.author_avatar || undefined} />
            <View style={styles.commentContent}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor} numberOfLines={1}>{name}</Text>
                <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
              </View>
              <Text style={styles.commentText} numberOfLines={3}>{comment.content}</Text>
            </View>
          </View>
        );
      })}
      {commentCount > 5 && (
        <TouchableOpacity
          onPress={() => navigation.navigate('Comments', { postId, commentCount })}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAll}>View all {commentCount} comments</Text>
        </TouchableOpacity>
      )}
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
});
