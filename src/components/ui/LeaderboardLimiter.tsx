/**
 * LeaderboardLimiter - Shared component for "Top N + Your Position" display pattern
 *
 * Used by all leaderboards (Season 2, Distance, Dynamic Events) to:
 * - Display only top N entries (default 25)
 * - Show logged-in user's position below if outside top N
 * - Show lock icon for non-Season 2 participants (private participation)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { npubToHex } from '../../utils/ndkConversion';

// ============================================================================
// Types
// ============================================================================

interface BaseEntry {
  rank: number;
  pubkey?: string;
  npub?: string;
}

interface LeaderboardLimiterProps<T extends BaseEntry> {
  /** Full ranked list of entries */
  entries: T[];
  /** Maximum entries to display (default 25) */
  maxDisplay?: number;
  /** Hex pubkey of logged-in user */
  currentUserPubkey?: string;
  /** Whether current user is a Season 2 participant */
  isCurrentUserSeason2?: boolean;
  /** Render function for each entry */
  renderEntry: (entry: T, index: number, isUserEntry: boolean) => React.ReactNode;
  /** Optional custom render for the "Your position" section */
  renderUserPosition?: (entry: T) => React.ReactNode;
  /** Show separator between top N and user position (default true) */
  showSeparator?: boolean;
}

interface LimitedResult<T> {
  displayEntries: T[];
  userEntry: T | null;
  userInTopN: boolean;
  showUserPosition: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find user's entry in the leaderboard by matching pubkey or npub
 */
function findUserEntry<T extends BaseEntry>(
  entries: T[],
  userPubkey?: string
): T | null {
  if (!userPubkey) return null;

  return entries.find(entry => {
    // Match by hex pubkey
    if (entry.pubkey === userPubkey) return true;

    // Match by npub (convert to hex for comparison)
    if (entry.npub) {
      const entryHex = npubToHex(entry.npub);
      if (entryHex === userPubkey) return true;
    }

    return false;
  }) || null;
}

/**
 * Calculate which entries to display and whether to show user position
 */
function calculateLimitedEntries<T extends BaseEntry>(
  entries: T[],
  maxDisplay: number,
  userPubkey?: string
): LimitedResult<T> {
  const userEntry = findUserEntry(entries, userPubkey);
  const userRank = userEntry?.rank ?? -1;
  const userInTopN = userRank > 0 && userRank <= maxDisplay;

  // Display top N entries
  const displayEntries = entries.slice(0, maxDisplay);

  // Show user position if:
  // 1. User is logged in
  // 2. User has an entry in the leaderboard
  // 3. User is NOT in top N
  const showUserPosition = !!userEntry && !userInTopN;

  return {
    displayEntries,
    userEntry,
    userInTopN,
    showUserPosition,
  };
}

// ============================================================================
// Component
// ============================================================================

export function LeaderboardLimiter<T extends BaseEntry>({
  entries,
  maxDisplay = 25,
  currentUserPubkey,
  isCurrentUserSeason2 = true,
  renderEntry,
  renderUserPosition,
  showSeparator = true,
}: LeaderboardLimiterProps<T>): React.ReactElement {
  const {
    displayEntries,
    userEntry,
    showUserPosition,
  } = useMemo(
    () => calculateLimitedEntries(entries, maxDisplay, currentUserPubkey),
    [entries, maxDisplay, currentUserPubkey]
  );

  return (
    <View style={styles.container}>
      {/* Top N entries */}
      {displayEntries.map((entry, index) => {
        const isUserEntry = !!currentUserPubkey && (
          entry.pubkey === currentUserPubkey ||
          (!!entry.npub && npubToHex(entry.npub) === currentUserPubkey)
        );
        return (
          <View key={entry.pubkey || entry.npub || index}>
            {renderEntry(entry, index, !!isUserEntry)}
          </View>
        );
      })}

      {/* User position section (if outside top N) */}
      {showUserPosition && userEntry && (
        <>
          {/* Separator */}
          {showSeparator && (
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>
                {entries.length - maxDisplay} more
              </Text>
              <View style={styles.separatorLine} />
            </View>
          )}

          {/* User's position */}
          <View style={styles.userPositionContainer}>
            {/* Privacy indicator for non-S2 users */}
            {!isCurrentUserSeason2 && (
              <View style={styles.privateIndicator}>
                <Ionicons
                  name="lock-closed"
                  size={12}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.privateText}>Private</Text>
              </View>
            )}

            {/* Custom or default user position render */}
            {renderUserPosition ? (
              renderUserPosition(userEntry)
            ) : (
              <View style={styles.defaultUserPosition}>
                {renderEntry(userEntry, userEntry.rank - 1, true)}
              </View>
            )}
          </View>
        </>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No entries yet</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  separatorText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginHorizontal: 12,
  },
  userPositionContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: theme.colors.text,
  },
  privateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 4,
  },
  privateText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  defaultUserPosition: {
    // Inherits from container
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
});

export default LeaderboardLimiter;
