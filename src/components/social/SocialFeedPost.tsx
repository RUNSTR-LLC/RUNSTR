// src/components/social/SocialFeedPost.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/LoadingStates';
import { timeAgo } from '../../types/social';
import type { SocialFeedPost as SocialFeedPostType } from '../../types/social';
import { SocialInteractionRow } from './SocialInteractionRow';
import { WorkoutPostCard } from './WorkoutPostCard';
import { useMatchedWorkout } from '../../hooks/useMatchedWorkout';

interface SocialFeedPostProps {
  post: SocialFeedPostType;
  userNpub: string;
}

export const SocialFeedPost: React.FC<SocialFeedPostProps> = ({ post, userNpub }) => {
  const [imageError, setImageError] = useState(false);
  const [imageAspect, setImageAspect] = useState(1);

  const firstImage = post.images && post.images.length > 0 ? post.images[0] : null;
  const showImage = firstImage && !imageError && firstImage.startsWith('https://');

  // If this is a workout post, the workout PNG is redundant in-feed — swap
  // it for a compact native card driven by Supabase workout_submissions.
  const matchedWorkout = useMatchedWorkout(post);
  const workoutForCard =
    matchedWorkout && matchedWorkout !== 'loading' ? matchedWorkout : null;
  const isLookingUpWorkout = matchedWorkout === 'loading';

  // Workout posts that failed to match a Supabase workout still render the
  // full-bleed PNG. Clamp its aspect ratio so the 9:16 composition doesn't
  // eat the viewport. Non-workout photo posts keep their natural aspect.
  const isWorkoutHashtagPost =
    post.hashtags?.some((h) => h.toLowerCase() === 'runstr') ?? false;
  const imageAspectForRender = isWorkoutHashtagPost
    ? Math.max(imageAspect, 1)
    : imageAspect;

  // Sanitize content: strip control chars, image URLs (rendered separately),
  // and hashtag noise (#RUNSTR #Running etc.).
  let sanitized = post.content
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)\S*/gi, '')
    .replace(/(^|\s)#\w+/g, '') // strip hashtags
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // When the native workout card renders the stats, drop the auto-generated
  // emoji stat lines (⏱️ Duration / 📏 Distance / …) so they aren't shown twice.
  if (workoutForCard) {
    sanitized = sanitized
      .split('\n')
      .filter((line) => !/^\s*[^\x00-\x7F]/.test(line))
      .join('\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }
  const displayContent = sanitized.length > 500
    ? sanitized.slice(0, 500) + '...'
    : sanitized;

  return (
    <View style={styles.card}>
      <View style={styles.authorRow}>
        <Avatar
          name={post.author_name || '?'}
          size={36}
          imageUrl={post.author_avatar || undefined}
        />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName} numberOfLines={1}>
            {post.author_name || 'Anonymous'}
          </Text>
          <Text style={styles.timestamp}>{timeAgo(post.created_at)}</Text>
        </View>
      </View>

      <Text style={styles.content}>{displayContent}</Text>

      {workoutForCard ? (
        <WorkoutPostCard workout={workoutForCard} />
      ) : isLookingUpWorkout ? (
        <Skeleton
          width="100%"
          height={200}
          borderRadius={12}
          style={{ marginTop: 10 }}
        />
      ) : showImage ? (
        <Image
          source={{ uri: firstImage }}
          style={[styles.image, { aspectRatio: imageAspectForRender }]}
          resizeMode="cover"
          onLoad={(e) => {
            const { width, height } = e.nativeEvent.source;
            if (width && height) {
              setImageAspect(width / height);
            }
          }}
          onError={() => setImageError(true)}
        />
      ) : null}
      <SocialInteractionRow post={post} userNpub={userNpub} />
    </View>
  );
};

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
  content: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.regular,
    lineHeight: 20,
  },
  image: {
    width: '100%',
    maxHeight: 420,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: theme.colors.cardBackground,
  },
});
