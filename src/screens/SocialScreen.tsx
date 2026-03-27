// src/screens/SocialScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { ClubsRow } from '../components/social/ClubsRow';
import { SocialFeedPost } from '../components/social/SocialFeedPost';
import SocialFeedService from '../services/social/SocialFeedService';
import { ClubService } from '../services/backend/ClubService';
import { ClubMembershipService } from '../services/backend/ClubMembershipService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SocialFeedPost as SocialFeedPostType } from '../types/social';
import type { Club } from '../types/club';

// Default export is a singleton instance
const feedService = SocialFeedService;

const SocialScreenComponent: React.FC = () => {
  const [posts, setPosts] = useState<SocialFeedPostType[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [userClubId, setUserClubId] = useState<string | null>(null);
  const [userNpub, setUserNpub] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadData = async (refresh = false) => {
    try {
      if (refresh) {
        feedService.clearCache();
      }

      const cached = feedService.getCachedFeed();
      const [clubsData, feedData, npub] = await Promise.all([
        ClubService.fetchActiveClubs(),
        refresh || !cached ? feedService.fetchFeed() : Promise.resolve(cached),
        AsyncStorage.getItem('@runstr:npub'),
      ]);

      setClubs(clubsData);
      setPosts(feedData);
      setHasMore(feedData.length >= 20);

      if (npub) {
        setUserNpub(npub);
        const clubId = await ClubMembershipService.getCurrentClub(npub);
        setUserClubId(clubId);
      }
    } catch (error) {
      console.error('[SocialScreen] Failed to load data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(true);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || posts.length === 0) return;

    setIsLoadingMore(true);
    const lastPost = posts[posts.length - 1];
    const morePosts = await feedService.fetchFeed(lastPost.created_at);

    if (morePosts.length < 20) {
      setHasMore(false);
    }

    setPosts((prev) => [...prev, ...morePosts]);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, posts]);

  const renderPost = useCallback(({ item }: { item: SocialFeedPostType }) => (
    <SocialFeedPost post={item} userNpub={userNpub} />
  ), [userNpub]);

  const renderHeader = useCallback(() => (
    <ClubsRow clubs={clubs} userClubId={userClubId} />
  ), [clubs, userClubId]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No posts yet.</Text>
        <Text style={styles.emptySubtext}>Share a workout to get started.</Text>
      </View>
    );
  }, [isLoading]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }, [isLoadingMore]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TexturedBackground edges={[]}>
          <View style={styles.headerSpacer} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        </TexturedBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TexturedBackground edges={[]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Social</Text>
        </View>
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.text}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </TexturedBackground>
    </SafeAreaView>
  );
};

export const SocialScreen = React.memo(SocialScreenComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
