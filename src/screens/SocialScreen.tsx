// src/screens/SocialScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { OstrichRefreshFlatList } from '../components/ui/OstrichRefreshScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { ClubsRow } from '../components/social/ClubsRow';
import { SocialFeedPost } from '../components/social/SocialFeedPost';
import { PostComposerModal } from '../components/social/PostComposerModal';
import { SectionHeader } from '../components/social/SectionHeader';
import { EventsList } from '../components/social/EventsList';
import { useDynamicCompetitions } from '../hooks/useDynamicCompetitions';
import { shouldShowEinundzwanzig } from '../constants/einundzwanzig';
import SocialFeedService from '../services/social/SocialFeedService';
import { ClubService } from '../services/backend/ClubService';
import { ClubMembershipService } from '../services/backend/ClubMembershipService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SocialFeedPost as SocialFeedPostType } from '../types/social';
import type { Club } from '../types/club';

// Default export is a singleton instance
const feedService = SocialFeedService;

const SocialScreenComponent: React.FC = () => {
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<SocialFeedPostType[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [userClubId, setUserClubId] = useState<string | null>(null);
  const [userNpub, setUserNpub] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [composerVisible, setComposerVisible] = useState(false);

  const handleLeaderboardPress = useCallback(() => {
    navigation.navigate('Leaderboards');
  }, [navigation]);

  const handleEinundzwanzigPress = useCallback(() => {
    navigation.navigate('EinundzwanzigDetail');
  }, [navigation]);

  const handleDynamicEventPress = useCallback((eventId: string) => {
    navigation.navigate('DynamicEventDetail', { eventId });
  }, [navigation]);

  const handleOpenComposer = useCallback(() => {
    setComposerVisible(true);
  }, []);

  const handleSeeMoreEvents = useCallback(() => {
    navigation.navigate('Compete');
  }, [navigation]);

  // Decide whether to surface the "See more" pill on the Events header.
  // EventsList caps at 3 rows; show the pill only when there's overflow.
  const { competitions: allCompetitions } = useDynamicCompetitions();
  const totalEventCount = 1 + (shouldShowEinundzwanzig() ? 1 : 0) + allCompetitions.length;
  const hasMoreEvents = totalEventCount > 3;

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
    try {
      const lastPost = posts[posts.length - 1];
      const morePosts = await feedService.fetchFeed(lastPost.created_at);

      if (morePosts.length < 20) {
        setHasMore(false);
      }

      setPosts((prev) => [...prev, ...morePosts]);
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, posts]);

  const handleCreatePost = useCallback(async (content: string) => {
    const localPost = await feedService.createLocalPost(content);
    if (localPost) {
      setPosts((prev) => [localPost, ...prev]);
    }
  }, []);

  const renderPost = useCallback(({ item }: { item: SocialFeedPostType }) => (
    <SocialFeedPost post={item} userNpub={userNpub} />
  ), [userNpub]);

  const handleClubCreated = useCallback(() => {
    loadData(true);
  }, []);

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

  const renderHeader = useCallback(() => (
    <>
      <SectionHeader title="Clubs" />
      <ClubsRow clubs={clubs} userClubId={userClubId} onClubCreated={handleClubCreated} />
      <View style={styles.sectionDivider} />
      <SectionHeader
        title="Events"
        actionLabel={hasMoreEvents ? 'See more' : undefined}
        actionIcon={hasMoreEvents ? 'arrow-forward' : undefined}
        onActionPress={hasMoreEvents ? handleSeeMoreEvents : undefined}
      />
      <EventsList
        onLeaderboardPress={handleLeaderboardPress}
        onEinundzwanzigPress={handleEinundzwanzigPress}
        onDynamicEventPress={handleDynamicEventPress}
      />
      <View style={styles.sectionDivider} />
      <SectionHeader
        title="Feed"
        actionLabel="Post"
        actionIcon="add"
        onActionPress={handleOpenComposer}
      />
    </>
  ), [clubs, userClubId, handleClubCreated, handleLeaderboardPress, handleEinundzwanzigPress, handleDynamicEventPress, handleOpenComposer, hasMoreEvents, handleSeeMoreEvents]);

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
        <View style={styles.headerSpacer} />
        <OstrichRefreshFlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </TexturedBackground>
      <PostComposerModal
        visible={composerVisible}
        onClose={() => setComposerVisible(false)}
        onPost={handleCreatePost}
      />
    </SafeAreaView>
  );
};

export const SocialScreen = React.memo(SocialScreenComponent);

const styles = StyleSheet.create({
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginTop: 16,
  },
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
  headerSpacer: {
    height: 12,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: theme.colors.orangeBright,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    color: theme.colors.accentText,
    fontSize: 15,
    fontWeight: theme.typography.weights.bold,
  },
});
