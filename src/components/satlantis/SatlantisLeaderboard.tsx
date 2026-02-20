/**
 * SatlantisLeaderboard - Event leaderboard with zap capability
 * Any user can zap any participant (not just organizer)
 *
 * Privacy model:
 * - Season II participants (public): visible to all users
 * - Non-Season II participants (private): visible only to themselves, marked with 🔒 icon
 *
 * PERFORMANCE: Uses batch-based rendering (21 at a time) with "See More" button
 * and React.memo for efficient row rendering.
 */

import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { ZappableUserRow } from '../ui/ZappableUserRow';
import type {
  SatlantisLeaderboardEntry,
  SatlantisEventStatus,
} from '../../types/satlantis';

const BATCH_SIZE = 21; // Show 21 participants at a time

/**
 * Memoized leaderboard entry row component
 * Only re-renders when entry data actually changes
 */
interface LeaderboardEntryRowProps {
  entry: SatlantisLeaderboardEntry;
  currentUserNpub?: string;
}

const LeaderboardEntryRow = memo(
  ({ entry, currentUserNpub }: LeaderboardEntryRowProps) => {
    return (
      <View style={[styles.entryRow, entry.isPrivate && styles.privateEntry]}>
        {/* Rank */}
        <View style={styles.rankSection}>
          {entry.isPrivate && (
            <Ionicons
              name="lock-closed"
              size={12}
              color={theme.colors.textMuted}
              style={styles.lockIcon}
            />
          )}
          <Text style={[styles.rankText, entry.rank <= 3 && styles.topRank]}>
            {entry.rank}
          </Text>
        </View>

        {/* User with zap button */}
        <View style={styles.userSection}>
          <ZappableUserRow
            npub={entry.npub}
            showQuickZap={entry.npub !== currentUserNpub}
            hideActionsForCurrentUser={entry.npub === currentUserNpub}
            additionalContent={
              <View style={styles.scoreSection}>
                <Text style={styles.scoreText}>{entry.formattedScore}</Text>
              </View>
            }
            style={styles.userRow}
          />
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if these specific values changed
    return (
      prevProps.entry.npub === nextProps.entry.npub &&
      prevProps.entry.rank === nextProps.entry.rank &&
      prevProps.entry.formattedScore === nextProps.entry.formattedScore &&
      prevProps.entry.isPrivate === nextProps.entry.isPrivate &&
      prevProps.currentUserNpub === nextProps.currentUserNpub
    );
  }
);

interface SatlantisLeaderboardProps {
  entries: SatlantisLeaderboardEntry[];
  isLoading: boolean;
  eventStatus: SatlantisEventStatus;
  currentUserNpub?: string;
}

export const SatlantisLeaderboard: React.FC<SatlantisLeaderboardProps> = ({
  entries,
  isLoading,
  eventStatus,
  currentUserNpub,
}) => {
  // Batch-based rendering state
  const [visibleBatches, setVisibleBatches] = useState(1);

  // Reset to first batch when entries change significantly
  useEffect(() => {
    setVisibleBatches(1);
  }, [entries.length]);

  // Calculate visible entries and user position
  const visibleCount = visibleBatches * BATCH_SIZE;
  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = visibleCount < entries.length;
  const remainingCount = entries.length - visibleCount;

  // Find user's position if outside visible entries
  const userIndex = currentUserNpub
    ? entries.findIndex(e => e.npub === currentUserNpub)
    : -1;
  const userRank = userIndex >= 0 ? userIndex + 1 : -1;
  const userEntryOutsideVisible =
    userIndex >= visibleCount ? entries[userIndex] : null;
  // Upcoming events - show placeholder
  if (eventStatus === 'upcoming') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Leaderboard will appear when the event starts
          </Text>
        </View>
      </View>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading results...</Text>
        </View>
      </View>
    );
  }

  // No entries - prompt users to join
  if (entries.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No participants yet</Text>
          <Text style={styles.emptySubtext}>
            Join the event to appear on the leaderboard!
          </Text>
        </View>
      </View>
    );
  }

  // Leaderboard with entries
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Leaderboard {eventStatus === 'live' ? '(Live)' : '(Final)'}
      </Text>

      {/* Visible entries using memoized component */}
      {visibleEntries.map((entry) => (
        <LeaderboardEntryRow
          key={entry.npub}
          entry={entry}
          currentUserNpub={currentUserNpub}
        />
      ))}

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
          <Ionicons name="chevron-down" size={16} color={theme.colors.accent} />
        </TouchableOpacity>
      )}

      {/* User position section (if outside visible entries) */}
      {userEntryOutsideVisible && userRank > 0 && (
        <>
          {/* Separator */}
          <View style={styles.userPositionSeparator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>Your position</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* User's entry */}
          <View style={[styles.entryRow, styles.userPositionRow, userEntryOutsideVisible.isPrivate && styles.privateEntry]}>
            <View style={styles.rankSection}>
              {userEntryOutsideVisible.isPrivate && (
                <Ionicons
                  name="lock-closed"
                  size={12}
                  color={theme.colors.textMuted}
                  style={styles.lockIcon}
                />
              )}
              <Text style={styles.rankText}>{userRank}</Text>
            </View>
            <View style={styles.userSection}>
              <ZappableUserRow
                npub={userEntryOutsideVisible.npub}
                showQuickZap={false}
                hideActionsForCurrentUser={true}
                additionalContent={
                  <View style={styles.scoreSection}>
                    <Text style={styles.scoreText}>{userEntryOutsideVisible.formattedScore}</Text>
                  </View>
                }
                style={styles.userRow}
              />
            </View>
          </View>
        </>
      )}

      {entries.length > 0 && eventStatus === 'live' && (
        <Text style={styles.refreshHint}>
          Updates automatically as workouts are posted
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginLeft: 8,
    color: theme.colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 8,
  },
  privateEntry: {
    opacity: 0.85,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  rankSection: {
    width: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  lockIcon: {
    marginRight: 2,
  },
  rankText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },
  topRank: {
    color: theme.colors.accent,
  },
  userSection: {
    flex: 1,
  },
  userRow: {
    paddingVertical: 0,
  },
  scoreSection: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },
  refreshHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  userPositionSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  separatorText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginHorizontal: 8,
    textTransform: 'uppercase',
  },
  userPositionRow: {
    borderWidth: 1,
    borderColor: theme.colors.text,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    paddingHorizontal: 8,
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
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
});

export default SatlantisLeaderboard;
