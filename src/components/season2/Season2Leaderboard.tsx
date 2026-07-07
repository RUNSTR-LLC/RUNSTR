/**
 * Season2Leaderboard - User leaderboard component
 * Shows participants ranked by total distance with charity attribution
 *
 * PERFORMANCE: Uses React.memo and simple map (instead of FlatList) for efficient rendering.
 * FlatList's virtualization is defeated by scrollEnabled={false}, so simple map has less overhead.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { formatDistanceKm } from '../../utils/distanceFormatter';
import { ZappableUserRow } from '../ui/ZappableUserRow';
import { getSeason2Avatar } from '../../../assets/images/season2';
import type { Season2Participant } from '../../types/season2';

const BATCH_SIZE = 21; // Show 21 participants at a time

/**
 * Format workout count with activity-specific label
 */
function formatWorkoutCount(count: number, activityType?: string): string {
  if (activityType === 'running') {
    return count === 1 ? '1 Run' : `${count} Runs`;
  }
  if (activityType === 'walking') {
    return count === 1 ? '1 Walk' : `${count} Walks`;
  }
  if (activityType === 'cycling') {
    return count === 1 ? '1 Ride' : `${count} Rides`;
  }
  return count === 1 ? '1 Workout' : `${count} Workouts`;
}

/**
 * Memoized leaderboard row component
 * Only re-renders when pubkey, distance, rank, or charity changes
 */
interface LeaderboardRowProps {
  item: Season2Participant;
  index: number;
  activityType?: 'running' | 'walking' | 'cycling';
}

const LeaderboardRow = memo(
  ({ item, index, activityType }: LeaderboardRowProps) => {
    const rank = index + 1;
    const formattedDistance = formatDistanceKm(item.totalDistance);
    const bundledAvatar = getSeason2Avatar(item.pubkey);

    return (
      <View style={styles.row}>
        {/* Lock icon for private competitors */}
        {item.isPrivateCompetitor && (
          <Ionicons
            name="lock-closed"
            size={12}
            color={theme.colors.textMuted}
            style={styles.privateLockIcon}
          />
        )}

        {/* Rank */}
        <View
          style={[
            styles.rankContainer,
            rank <= 3 && styles.topRank,
            rank === 1 && styles.firstPlace,
          ]}
        >
          <Text style={[styles.rankText, rank <= 3 && styles.topRankText]}>
            {rank}
          </Text>
        </View>

        {/* User info with stats below */}
        <View style={styles.userContainer}>
          <ZappableUserRow
            npub={item.npub || item.pubkey}
            fallbackName={item.name}
            fallbackPicture={item.picture}
            bundledPicture={bundledAvatar}
            showQuickZap={false}
            skipProfileFetch={true}
          />
          {/* Stats row below the name */}
          <View style={styles.statsRow}>
            <Text style={styles.distanceText}>{formattedDistance}</Text>
            {item.charityName && (
              <Text style={styles.charityText}>• {item.charityName}</Text>
            )}
            {/* Private competitor indicator */}
            {item.isPrivateCompetitor && (
              <Text style={styles.privateText}>• Private</Text>
            )}
          </View>
        </View>

        {/* Workout count badge on far right */}
        {item.workoutCount > 0 && (
          <View style={styles.workoutCountContainer}>
            <Text style={styles.workoutCountText}>
              {formatWorkoutCount(item.workoutCount, activityType)}
            </Text>
          </View>
        )}
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if these specific values changed
    return (
      prevProps.item.pubkey === nextProps.item.pubkey &&
      prevProps.item.totalDistance === nextProps.item.totalDistance &&
      prevProps.item.workoutCount === nextProps.item.workoutCount &&
      prevProps.item.charityName === nextProps.item.charityName &&
      prevProps.item.isPrivateCompetitor === nextProps.item.isPrivateCompetitor &&
      prevProps.index === nextProps.index
    );
  }
);

interface Season2LeaderboardProps {
  participants: Season2Participant[];
  isLoading?: boolean;
  emptyMessage?: string;
  currentUserPubkey?: string;
  isCurrentUserSeason2?: boolean;
  activityType?: 'running' | 'walking' | 'cycling';
  isBaselineOnly?: boolean; // Shows date indicator when true
  baselineDate?: string; // e.g., "01/08/2026"
}

// Track render timing globally for this component
let leaderboardRenderCount = 0;
let lastLeaderboardRenderTime = Date.now();

export const Season2Leaderboard: React.FC<Season2LeaderboardProps> = ({
  participants,
  isLoading = false,
  emptyMessage = 'No participants yet',
  currentUserPubkey: _currentUserPubkey, // Kept for backward compatibility
  isCurrentUserSeason2: _isCurrentUserSeason2 = true, // Kept for backward compatibility
  activityType,
  isBaselineOnly = false,
  baselineDate,
}) => {
  // [TIMING] Track render timing
  leaderboardRenderCount++;
  const renderStart = Date.now();
  const timeSinceLastRender = renderStart - lastLeaderboardRenderTime;
  lastLeaderboardRenderTime = renderStart;

  const participantsWithWorkouts = participants.filter(p => p.totalDistance > 0).length;
  console.log(`[TIMING-LEADERBOARD] Render #${leaderboardRenderCount} (+${timeSinceLastRender}ms): isLoading=${isLoading}, total=${participants.length}, withWorkouts=${participantsWithWorkouts}`);

  // [BLOCK-8] Track when useEffect fires after participants change
  const renderStartRef = useRef(renderStart);
  renderStartRef.current = renderStart;
  useEffect(() => {
    const effectDelay = Date.now() - renderStartRef.current;
    console.log(`[BLOCK-8] Leaderboard useEffect fired: ${effectDelay}ms after render start, participants with workouts: ${participantsWithWorkouts}`);
  }, [participantsWithWorkouts]);

  // =========================================================================
  // BATCH-BASED RENDERING: Show 21 at a time with "See More" button
  // =========================================================================
  const [visibleBatches, setVisibleBatches] = useState(1);

  // Reset to first batch when participants change (tab switch)
  useEffect(() => {
    setVisibleBatches(1);
  }, [activityType]);

  // Calculate visible participants and remaining count
  const visibleParticipants = participants.slice(0, visibleBatches * BATCH_SIZE);
  const hasMore = visibleParticipants.length < participants.length;
  const remainingCount = participants.length - visibleParticipants.length;
  console.log(`[BATCH-RENDER] Showing ${visibleParticipants.length}/${participants.length} participants (batch ${visibleBatches})`);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.orangeBright} />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  if (participants.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>LEADERBOARD</Text>
        {isBaselineOnly && baselineDate && (
          <Text style={styles.baselineDateText}>{baselineDate}</Text>
        )}
      </View>
      {/* Simple map to render visible participants */}
      <View>
        {visibleParticipants.map((item, index) => (
          <React.Fragment key={item.pubkey}>
            <LeaderboardRow item={item} index={index} activityType={activityType} />
            {index < visibleParticipants.length - 1 && <View style={styles.separator} />}
          </React.Fragment>
        ))}
      </View>

      {/* See More button */}
      {hasMore && (
        <TouchableOpacity
          style={styles.seeMoreButton}
          onPress={() => setVisibleBatches(b => b + 1)}
          activeOpacity={0.7}
        >
          <Text style={styles.seeMoreText}>
            See More ({remainingCount} remaining)
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.orangeBright} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    letterSpacing: 1,
  },
  baselineDateText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  loadingContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
  emptyContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rankContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topRank: {
    backgroundColor: theme.colors.orangeBright,
  },
  firstPlace: {
    backgroundColor: theme.colors.orangeBright,
  },
  rankText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
  },
  topRankText: {
    color: theme.colors.background,
  },
  userContainer: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 44, // Align with name (avatar 36 + margin 8)
    marginTop: -4,
    paddingBottom: 4,
  },
  distanceText: {
    color: theme.colors.orangeBright,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
  charityText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  privateLockIcon: {
    marginRight: 4,
  },
  privateText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  workoutCountContainer: {
    backgroundColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  workoutCountText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
  },
  seeMoreButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  seeMoreText: {
    color: theme.colors.orangeBright,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
});

export default Season2Leaderboard;
