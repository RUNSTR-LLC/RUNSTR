// src/components/social/SocialFeedPost.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { timeAgo } from '../../types/social';
import type { FeedWorkout } from '../../types/feedWorkout';
import { SocialInteractionRow } from './SocialInteractionRow';
import { WorkoutPostCard } from './WorkoutPostCard';

interface SocialFeedPostProps {
  workout: FeedWorkout;
  userNpub: string;
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

      <SocialInteractionRow workout={workout} userNpub={userNpub} />
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
