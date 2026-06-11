// src/components/social/SocialInteractionRow.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { theme } from '../../styles/theme';
import SocialInteractionService from '../../services/social/SocialInteractionService';
import type { SocialFeedPost } from '../../types/social';
import { ExternalZapModal } from '../nutzap/ExternalZapModal';
import { LikesBottomSheet } from './LikesBottomSheet';
import { ZapsBottomSheet } from './ZapsBottomSheet';
import { InlineCommentList } from './InlineCommentList';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNWCZap } from '../../hooks/useNWCZap';

interface SocialInteractionRowProps {
  post: SocialFeedPost;
  userNpub: string;
}

export const SocialInteractionRow: React.FC<SocialInteractionRowProps> = ({ post, userNpub }) => {
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [repostCount, setRepostCount] = useState(post.repost_count || 0);
  const [zapTotal, setZapTotal] = useState(post.zap_total || 0);
  const [isLiked, setIsLiked] = useState(post.liked_by?.includes(userNpub) || false);
  const [isReposted, setIsReposted] = useState(post.reposted_by?.includes(userNpub) || false);
  const [localLikedBy, setLocalLikedBy] = useState<string[]>(post.liked_by || []);
  const [localRepostedBy, setLocalRepostedBy] = useState<string[]>(post.reposted_by || []);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [showZapModal, setShowZapModal] = useState(false);

  const [showLikes, setShowLikes] = useState(false);
  const [showZaps, setShowZaps] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const commentCount = (post as any).comment_count || 0;

  const debounceRef = useRef<number>(0);
  const zapFlash = useRef(new Animated.Value(1)).current;

  const { hasWallet: hasNWC, sendZap } = useNWCZap();
  const [defaultZapAmount, setDefaultZapAmount] = useState(50);

  useEffect(() => {
    AsyncStorage.getItem('@runstr:default_zap_amount').then((stored) => {
      if (stored) setDefaultZapAmount(parseInt(stored, 10) || 50);
    });
  }, []);

  const debounce = useCallback((action: string, fn: () => Promise<void>) => {
    const now = Date.now();
    if (now - debounceRef.current < 500 || isProcessing) return;
    debounceRef.current = now;
    setIsProcessing(action);
    fn().finally(() => setIsProcessing(null));
  }, [isProcessing]);

  const handleLike = useCallback(() => {
    if (isLiked) return; // Likes are one-way on Nostr (kind 7 has no unlike)
    debounce('like', async () => {
      setIsLiked(true);
      setLikeCount((c) => c + 1);
      setLocalLikedBy((prev) => prev.includes(userNpub) ? prev : [...prev, userNpub]);

      // Fire-and-forget — optimistic state stays regardless of Nostr publish result
      SocialInteractionService.toggleLike(post.id, post.event_id, post.npub).catch(() => {});
    });
  }, [isLiked, post, userNpub, debounce]);

  const handleZapTap = useCallback(() => {
    if (hasNWC) {
      debounce('zap', async () => {
        setZapTotal((z) => z + defaultZapAmount);
        Animated.sequence([
          Animated.timing(zapFlash, { toValue: 1.4, duration: 100, useNativeDriver: true }),
          Animated.timing(zapFlash, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        const success = await sendZap(post.npub, defaultZapAmount, `Zap from RUNSTR`);
        if (success) {
          Toast.show({ type: 'success', text1: 'Reward sent', visibilityTime: 1500 });
        } else {
          setZapTotal((z) => Math.max(z - defaultZapAmount, 0));
          Toast.show({ type: 'error', text1: "Couldn't send reward", visibilityTime: 2000 });
        }
      });
    } else {
      setShowZapModal(true);
    }
  }, [hasNWC, defaultZapAmount, post, debounce, sendZap, zapFlash]);

  const handleZapLongPress = useCallback(() => {
    setShowZapModal(true);
  }, []);

  const handleRepost = useCallback(() => {
    if (isReposted) return;
    debounce('repost', async () => {
      setIsReposted(true);
      setRepostCount((c) => c + 1);
      setLocalRepostedBy((prev) => prev.includes(userNpub) ? prev : [...prev, userNpub]);

      // Fire-and-forget — optimistic state stays regardless of Nostr publish result
      SocialInteractionService.repost(post.id, post.event_id, post.npub).catch(() => {});
    });
  }, [isReposted, post, userNpub, debounce]);

  const formatCount = (n: number): string => {
    if (n === 0) return '';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  return (
    <>
      <View style={styles.row}>
        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.action} onPress={handleLike} activeOpacity={0.7}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? theme.colors.orangeDeep : theme.colors.textMuted}
            />
          </TouchableOpacity>
          {likeCount > 0 && (
            <TouchableOpacity onPress={() => setShowLikes(true)} activeOpacity={0.7}>
              <Text style={[styles.count, isLiked && styles.countActive]}>{formatCount(likeCount)}</Text>
            </TouchableOpacity>
          )}
        </View>

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

        {/* Repost button removed 2026-06-09: feed keeps like / zap / comment only. */}

        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.action}
            onPress={() => setCommentsExpanded((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={commentsExpanded ? 'chatbubble' : 'chatbubble-outline'}
              size={20}
              color={commentsExpanded ? theme.colors.orangeDeep : theme.colors.textMuted}
            />
          </TouchableOpacity>
          {commentCount > 0 && (
            <Text style={[styles.count, commentsExpanded && styles.countActive]}>{formatCount(commentCount)}</Text>
          )}
        </View>
      </View>

      <InlineCommentList
        postId={post.id}
        postEventId={post.event_id}
        postAuthorPubkey={post.npub}
        commentCount={commentCount}
        expanded={commentsExpanded}
      />

      <ExternalZapModal
        visible={showZapModal}
        recipientNpub={post.npub}
        recipientName={post.author_name || 'Unknown'}
        onClose={() => setShowZapModal(false)}
        onSuccess={() => setShowZapModal(false)}
      />

      <LikesBottomSheet
        visible={showLikes}
        likedBy={localLikedBy}
        onClose={() => setShowLikes(false)}
      />

      <ZapsBottomSheet
        visible={showZaps}
        postId={post.id}
        zapTotal={zapTotal}
        onClose={() => setShowZaps(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 44,
    minHeight: 32,
  },
  action: {
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  count: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
  },
  countActive: {
    color: theme.colors.orangeDeep,
  },
});
