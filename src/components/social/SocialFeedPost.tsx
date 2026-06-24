// src/components/social/SocialFeedPost.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { timeAgo } from '../../types/social';
import type { SocialFeedPost as SocialFeedPostType } from '../../types/social';
import type { FeedWorkout } from '../../types/feedWorkout';
import { SocialInteractionRow } from './SocialInteractionRow';
import { WorkoutPostCard } from './WorkoutPostCard';

interface SocialFeedPostProps {
  workout: FeedWorkout;
  userNpub: string;
}

/**
 * Maps a FeedWorkout to the SocialFeedPost shape that SocialInteractionRow expects.
 * Interaction counts start at 0 for workout-feed posts until Phase 2 re-keys
 * the interaction tables to the 1301 event_id.
 * Zaps (Nostr-native, keyed by event_id + npub) work immediately.
 * TODO(phase2): re-key interaction reads/writes to the 1301 event_id so cross-network counts populate
 */
function feedWorkoutToInteractionPost(w: FeedWorkout): SocialFeedPostType {
  return {
    id: w.eventId,
    event_id: w.eventId,
    npub: w.npub,
    content: w.title ?? '',
    images: null,
    hashtags: null,
    author_name: w.authorName,
    author_avatar: w.authorAvatar,
    created_at: w.occurredAt,
    indexed_at: w.occurredAt,
    like_count: 0,
    repost_count: 0,
    zap_total: 0,
    comment_count: 0,
    liked_by: null,
    reposted_by: null,
  };
}

const SocialFeedPostInner: React.FC<SocialFeedPostProps> = ({ workout, userNpub }) => {
  const displayName = workout.authorName || 'Anonymous';

  return (
    <View style={styles.card}>
      <View style={styles.authorRow}>
        <Avatar name={displayName} size={36} imageUrl={workout.authorAvatar || undefined} />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.timestamp}>{timeAgo(workout.occurredAt)}</Text>
        </View>
      </View>

      <WorkoutPostCard workout={workout} title={workout.title} />

      <SocialInteractionRow post={feedWorkoutToInteractionPost(workout)} userNpub={userNpub} />
    </View>
  );
};

// Memoized: the feed re-renders on refresh/pagination/club-load; without this
// every mounted row re-reconciles on each parent update.
export const SocialFeedPost = React.memo(SocialFeedPostInner);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorInfo: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
  timestamp: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.regular,
    marginTop: 1,
  },
});
