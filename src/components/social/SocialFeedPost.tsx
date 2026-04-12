// src/components/social/SocialFeedPost.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { timeAgo } from '../../types/social';
import type { SocialFeedPost as SocialFeedPostType } from '../../types/social';
import { SocialInteractionRow } from './SocialInteractionRow';

const MAX_IMAGE_HEIGHT = 300;

interface SocialFeedPostProps {
  post: SocialFeedPostType;
  userNpub: string;
}

export const SocialFeedPost: React.FC<SocialFeedPostProps> = ({ post, userNpub }) => {
  const [imageError, setImageError] = useState(false);
  const [imageAspect, setImageAspect] = useState(1);

  const firstImage = post.images && post.images.length > 0 ? post.images[0] : null;
  const showImage = firstImage && !imageError && firstImage.startsWith('https://');

  // Sanitize content: strip control chars and image URLs (images render separately)
  const sanitized = post.content
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)\S*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

      {showImage && (
        <Image
          source={{ uri: firstImage }}
          style={[styles.image, { aspectRatio: imageAspect }]}
          resizeMode="cover"
          onLoad={(e) => {
            const { width, height } = e.nativeEvent.source;
            if (width && height) {
              setImageAspect(width / height);
            }
          }}
          onError={() => setImageError(true)}
        />
      )}
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
    maxHeight: 500,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: theme.colors.cardBackground,
  },
});
