/**
 * ClubLeaderboardSection - Weekly leaderboard for a fitness club
 *
 * Queries workout_submissions from Supabase for the current week (Mon-Sun),
 * groups by npub, and shows top 20 ranked by total distance.
 * Results are cached in-memory for 5 minutes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { Avatar } from '../ui/Avatar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClubLeaderboardSectionProps {
  clubId: string;
}

interface LeaderboardEntry {
  npub: string;
  profileName: string | null;
  profilePicture: string | null;
  totalDistanceKm: number;
  workoutCount: number;
}

// ---------------------------------------------------------------------------
// Cache (in-memory, 5 min TTL)
// ---------------------------------------------------------------------------

const cache = new Map<string, { entries: LeaderboardEntry[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekBounds(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  const weekStart = monday.toISOString().split('T')[0];
  const weekEnd = sunday.toISOString().split('T')[0];

  return { weekStart, weekEnd };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ClubLeaderboardSectionComponent: React.FC<ClubLeaderboardSectionProps> = ({
  clubId,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    // Check cache
    const cached = cache.get(clubId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setEntries(cached.entries);
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      const { weekStart, weekEnd } = getWeekBounds();

      const { data, error } = await supabase!
        .from('workout_submissions')
        .select('npub, profile_name, profile_picture, distance_meters')
        .eq('club_id', clubId)
        .gte('leaderboard_date', weekStart)
        .lte('leaderboard_date', weekEnd);

      if (error) {
        console.error('[ClubLeaderboardSection] Query error:', error);
        setIsLoading(false);
        return;
      }

      // Group by npub client-side
      const grouped = new Map<string, {
        profileName: string | null;
        profilePicture: string | null;
        totalMeters: number;
        count: number;
      }>();

      for (const row of data || []) {
        const existing = grouped.get(row.npub);
        const meters = row.distance_meters || 0;
        if (existing) {
          existing.totalMeters += meters;
          existing.count += 1;
          // Use the latest non-null profile info
          if (row.profile_name && !existing.profileName) {
            existing.profileName = row.profile_name;
          }
          if (row.profile_picture && !existing.profilePicture) {
            existing.profilePicture = row.profile_picture;
          }
        } else {
          grouped.set(row.npub, {
            profileName: row.profile_name || null,
            profilePicture: row.profile_picture || null,
            totalMeters: meters,
            count: 1,
          });
        }
      }

      // Sort by distance DESC, take top 20
      const sorted: LeaderboardEntry[] = Array.from(grouped.entries())
        .map(([npub, info]) => ({
          npub,
          profileName: info.profileName,
          profilePicture: info.profilePicture,
          totalDistanceKm: info.totalMeters / 1000,
          workoutCount: info.count,
        }))
        .sort((a, b) => b.totalDistanceKm - a.totalDistanceKm)
        .slice(0, 20);

      // Cache result
      cache.set(clubId, { entries: sorted, timestamp: Date.now() });
      setEntries(sorted);
    } catch (err) {
      console.error('[ClubLeaderboardSection] Exception:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>LEADERBOARD</Text>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="trophy-outline"
            size={36}
            color={theme.colors.textMuted}
          />
          <Text style={styles.emptyText}>No workouts yet this week</Text>
        </View>
      ) : (
        entries.map((entry, index) => {
          const rank = index + 1;
          const displayName =
            entry.profileName || entry.npub.slice(0, 12) + '...';

          return (
            <View key={entry.npub} style={styles.row}>
              <Text style={styles.rankText}>{rank}</Text>
              <Avatar
                name={displayName}
                imageUrl={entry.profilePicture || undefined}
                size={32}
                style={styles.avatar}
              />
              <View style={styles.nameContainer}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {displayName}
                </Text>
              </View>
              <Text style={styles.distanceText}>
                {entry.totalDistanceKm.toFixed(1)} km
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rankText: {
    width: 24,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  avatar: {
    marginHorizontal: 10,
  },
  nameContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
});

export const ClubLeaderboardSection = React.memo(ClubLeaderboardSectionComponent);
export default ClubLeaderboardSection;
