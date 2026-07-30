/**
 * ClubLeaderboardSection - Daily leaderboard for a fitness club
 *
 * Queries workout_submissions from Supabase for today's date,
 * groups by npub, and shows top 20 ranked by total distance or steps.
 * Captain can choose 'distance' (shows distance + time) or 'steps' mode.
 * Results are cached in-memory for 5 minutes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import { Avatar } from '../ui/Avatar';
import { formatDuration } from '../../utils/formatters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClubLeaderboardSectionProps {
  clubId: string;
  leaderboardMetric?: 'distance' | 'steps';
  refreshKey?: number;
}

interface LeaderboardEntry {
  npub: string;
  profileName: string | null;
  profilePicture: string | null;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  totalSteps: number;
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

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}


function formatSteps(steps: number): string {
  if (steps >= 1000) {
    return steps.toLocaleString();
  }
  return steps.toString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ClubLeaderboardSectionComponent: React.FC<ClubLeaderboardSectionProps> = ({
  clubId,
  leaderboardMetric = 'distance',
  refreshKey,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    // Check cache (skip if forced refresh via refreshKey)
    if (refreshKey === undefined || refreshKey === 0) {
      const cached = cache.get(clubId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setEntries(cached.entries);
        setIsLoading(false);
        return;
      }
    } else {
      // Force refresh: clear stale cache
      cache.delete(clubId);
    }

    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      const today = getTodayDate();

      // Get club member npubs
      const { data: members, error: membersError } = await supabase!
        .from('club_memberships')
        .select('member_npub')
        .eq('club_id', clubId);

      if (membersError || !members || members.length === 0) {
        setIsLoading(false);
        return;
      }

      const memberNpubs = members.map((m) => m.member_npub);

      const { data, error } = await supabase!
        .from('workout_submissions')
        .select('npub, profile_name, profile_picture, distance_meters, duration_seconds, step_count, leaderboard_date')
        .in('npub', memberNpubs)
        .eq('leaderboard_date', today);

      if (error) {
        console.error('[ClubLeaderboardSection] Query error:', error);
        setIsLoading(false);
        return;
      }

      // Deduplicate by (npub, roundedDistance, date)
      const seenKeys = new Set<string>();
      const deduped = (data || []).filter((row) => {
        const roundedDist = Math.round((row.distance_meters || 0) / 10) * 10;
        const key = `${row.npub}:${roundedDist}:${row.leaderboard_date || 'unknown'}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      // Group by npub client-side
      const grouped = new Map<string, {
        profileName: string | null;
        profilePicture: string | null;
        totalMeters: number;
        totalSeconds: number;
        totalSteps: number;
        count: number;
      }>();

      for (const row of deduped) {
        const existing = grouped.get(row.npub);
        const meters = row.distance_meters || 0;
        const seconds = row.duration_seconds || 0;
        const steps = row.step_count || 0;
        if (existing) {
          existing.totalMeters += meters;
          existing.totalSeconds += seconds;
          existing.totalSteps += steps;
          existing.count += 1;
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
            totalSeconds: seconds,
            totalSteps: steps,
            count: 1,
          });
        }
      }

      // Build entries
      const allEntries: LeaderboardEntry[] = Array.from(grouped.entries())
        .map(([npub, info]) => ({
          npub,
          profileName: info.profileName,
          profilePicture: info.profilePicture,
          totalDistanceKm: info.totalMeters / 1000,
          totalDurationSeconds: info.totalSeconds,
          totalSteps: info.totalSteps,
          workoutCount: info.count,
        }));

      // Sort by the chosen metric DESC, take top 20
      const sorted = allEntries
        .sort((a, b) => {
          if (leaderboardMetric === 'steps') {
            return (b.totalSteps - a.totalSteps) || a.npub.localeCompare(b.npub);
          }
          return (b.totalDistanceKm - a.totalDistanceKm) || a.npub.localeCompare(b.npub);
        })
        .slice(0, 20);

      // Fetch Nostr profiles to fill missing names/avatars
      if (sorted.length > 0) {
        try {
          const npubs = sorted.map((e) => e.npub);
          const profiles = await nostrProfileService.getProfiles(npubs);
          for (const entry of sorted) {
            const profile = profiles.get(entry.npub);
            if (profile) {
              if (!entry.profileName) {
                entry.profileName = profile.display_name || profile.name || null;
              }
              if (!entry.profilePicture) {
                entry.profilePicture = profile.picture || null;
              }
            }
          }
        } catch (err) {
          console.warn('[ClubLeaderboardSection] Profile fetch failed:', err);
        }
      }

      cache.set(clubId, { entries: sorted, timestamp: Date.now() });
      setEntries(sorted);
    } catch (err) {
      console.error('[ClubLeaderboardSection] Exception:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clubId, leaderboardMetric, refreshKey]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isStepsMode = leaderboardMetric === 'steps';

  // Hide entire section while loading or when no entries
  if (isLoading || entries.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>LEADERBOARD</Text>

      {(
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
              {isStepsMode ? (
                <Text style={styles.primaryMetric}>
                  {formatSteps(entry.totalSteps)} steps
                </Text>
              ) : (
                <View style={styles.metricsContainer}>
                  <Text style={styles.primaryMetric}>
                    {entry.totalDistanceKm.toFixed(1)} km
                  </Text>
                  {entry.totalDurationSeconds > 0 && (
                    <Text style={styles.secondaryMetric}>
                      {formatDuration(entry.totalDurationSeconds)}
                    </Text>
                  )}
                </View>
              )}
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
  metricsContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  primaryMetric: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginLeft: 8,
  },
  secondaryMetric: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});

export const ClubLeaderboardSection = React.memo(ClubLeaderboardSectionComponent);
export default ClubLeaderboardSection;
