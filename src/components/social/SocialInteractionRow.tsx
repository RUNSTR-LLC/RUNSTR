// src/components/social/SocialInteractionRow.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { theme } from '../../styles/theme';
import { WorkoutInteractionService } from '../../services/social/WorkoutInteractionService';
import type { FeedWorkout } from '../../types/feedWorkout';
import { ExternalZapModal } from '../nutzap/ExternalZapModal';
import { LikesBottomSheet } from './LikesBottomSheet';
import { ZapsBottomSheet } from './ZapsBottomSheet';
import { InlineCommentList } from './InlineCommentList';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNWCZap } from '../../hooks/useNWCZap';
import {
  DEFAULT_ZAP_AMOUNT_KEY,
  DEFAULT_ZAP_AMOUNT_FALLBACK,
  parseStoredZapAmount,
} from '../../constants/zap';

interface SocialInteractionRowProps {
  workout: FeedWorkout;
  userNpub: string;
}

export const SocialInteractionRow: React.FC<SocialInteractionRowProps> = ({ workout, userNpub }) => {
  const [likeCount, setLikeCount] = useState(workout.likeCount ?? 0);
  const [commentCount, setCommentCount] = useState(workout.commentCount ?? 0);
  const [zapTotal, setZapTotal] = useState(workout.zapTotal ?? 0);
  const [isLiked, setIsLiked] = useState(workout.likedByMe ?? false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [showZapModal, setShowZapModal] = useState(false);

  const [showLikes, setShowLikes] = useState(false);
  const [showZaps, setShowZaps] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);

  const debounceRef = useRef<number>(0);
  const zapFlash = useRef(new Animated.Value(1)).current;

  const { hasWallet: hasNWC, sendZap } = useNWCZap();
  const [defaultZapAmount, setDefaultZapAmount] = useState(DEFAULT_ZAP_AMOUNT_FALLBACK);

  useEffect(() => {
    AsyncStorage.getItem(DEFAULT_ZAP_AMOUNT_KEY)
      .then((stored) => setDefaultZapAmount(parseStoredZapAmount(stored)))
      .catch(() => {});
  }, []);

  const debounce = useCallback((action: string, fn: () => Promise<void>) => {
    const now = Date.now();
    if (now - debounceRef.current < 500 || isProcessing) return;
    debounceRef.current = now;
    setIsProcessing(action);
    fn().finally(() => setIsProcessing(null));
  }, [isProcessing]);

  const handleLike = useCallback(() => {
    debounce('like', async () => {
      // Optimistic update
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      setLikeCount((c) => wasLiked ? Math.max(c - 1, 0) : c + 1);

      try {
        await WorkoutInteractionService.getInstance().toggleLike(workout.eventId, userNpub);
      } catch {
        // Revert on error
        setIsLiked(wasLiked);
        setLikeCount((c) => wasLiked ? c + 1 : Math.max(c - 1, 0));
      }
    });
  }, [isLiked, workout.eventId, userNpub, debounce]);

  const handleZapTap = useCallback(() => {
    if (hasNWC) {
      debounce('zap', async () => {
        setZapTotal((z) => z + defaultZapAmount);
        Animated.sequence([
          Animated.timing(zapFlash, { toValue: 1.4, duration: 100, useNativeDriver: true }),
          Animated.timing(zapFlash, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        const success = await sendZap(workout.npub, defaultZapAmount, `Zap from RUNSTR`);
        if (success) {
          Toast.show({ type: 'success', text1: 'Reward sent', visibilityTime: 1500 });
          await WorkoutInteractionService.getInstance().recordZap(workout.eventId, userNpub, defaultZapAmount);
        } else {
          setZapTotal((z) => Math.max(z - defaultZapAmount, 0));
          Toast.show({ type: 'error', text1: "Couldn't send reward", visibilityTime: 2000 });
        }
      });
    } else {
      setShowZapModal(true);
    }
  }, [hasNWC, defaultZapAmount, workout, userNpub, debounce, sendZap, zapFlash]);

  const handleZapLongPress = useCallback(() => {
    setShowZapModal(true);
  }, []);

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
        eventId={workout.eventId}
        userNpub={userNpub}
        commentCount={commentCount}
        expanded={commentsExpanded}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
      />

      <ExternalZapModal
        visible={showZapModal}
        recipientNpub={workout.npub}
        recipientName={workout.authorName || 'Unknown'}
        onClose={() => setShowZapModal(false)}
        onSuccess={() => {
          setShowZapModal(false);
          setZapTotal((z) => z + defaultZapAmount);
          WorkoutInteractionService.getInstance().recordZap(workout.eventId, userNpub, defaultZapAmount).catch(() => {});
        }}
      />

      <LikesBottomSheet
        visible={showLikes}
        eventId={workout.eventId}
        onClose={() => setShowLikes(false)}
      />

      <ZapsBottomSheet
        visible={showZaps}
        eventId={workout.eventId}
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
