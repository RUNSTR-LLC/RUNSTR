// src/screens/CommentsScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Avatar } from '../components/ui/Avatar';
import { timeAgo } from '../types/social';
import feedService from '../services/social/SocialFeedService';
import type { SocialFeedComment } from '../types/social';

const PAGE_SIZE = 20;

interface CommentsScreenProps {
  navigation: any;
  route: { params: { postId: string; commentCount: number } };
}

export const CommentsScreen: React.FC<CommentsScreenProps> = ({ navigation, route }) => {
  const { postId, commentCount } = route.params;
  const [comments, setComments] = useState<SocialFeedComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let mounted = true;
    feedService.getCommentsForPost(postId, PAGE_SIZE).then((fetched) => {
      if (mounted) {
        setComments(fetched);
        setHasMore(fetched.length >= PAGE_SIZE);
        setIsLoading(false);
      }
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });
    return () => { mounted = false; };
  }, [postId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || comments.length === 0) return;
    const oldest = comments[comments.length - 1];
    const more = await feedService.getCommentsForPost(postId, PAGE_SIZE, oldest.created_at);
    if (more.length < PAGE_SIZE) setHasMore(false);
    setComments((prev) => [...prev, ...more]);
  }, [hasMore, comments, postId]);

  const renderComment = ({ item }: { item: SocialFeedComment }) => {
    const name = item.author_name || item.sender_npub.slice(0, 12) + '...';
    return (
      <View style={styles.commentRow}>
        <Avatar name={name} size={32} imageUrl={item.author_avatar || undefined} />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor} numberOfLines={1}>{name}</Text>
            <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments ({commentCount})</Text>
        <View style={{ width: 28 }} />
      </View>
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
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: theme.typography.weights.semiBold, color: theme.colors.text },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  commentAuthor: { fontSize: 13, fontWeight: theme.typography.weights.semiBold, color: theme.colors.text, flexShrink: 1 },
  commentTime: { fontSize: 12, color: theme.colors.textMuted },
  commentText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default CommentsScreen;
