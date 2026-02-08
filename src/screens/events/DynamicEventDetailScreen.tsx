/**
 * DynamicEventDetailScreen - Detail screen for Supabase-driven competitions
 *
 * Takes an eventId from navigation params and renders the full event detail
 * using existing hooks (useSupabaseLeaderboard, useCompetitionParticipation).
 * Supports all four templates: distance_race, step_challenge, goal_challenge, fundraiser.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  useSupabaseLeaderboard,
  useCompetitionParticipation,
  SupabaseLeaderboardEntry,
} from '../../hooks/useSupabaseLeaderboard';
import { SupabaseCompetitionService } from '../../services/backend/SupabaseCompetitionService';
import { Avatar } from '../../components/ui/Avatar';
import type { Competition, CompetitionConfig } from '../../utils/supabase';

const BATCH_SIZE = 21;

interface DynamicEventDetailScreenProps {
  navigation: any;
  route: { params: { eventId: string } };
}

type EventStatus = 'active' | 'upcoming' | 'ended';

function deriveStatus(comp: Competition): EventStatus {
  const now = Date.now();
  const start = new Date(comp.start_date).getTime();
  const end = new Date(comp.end_date).getTime();
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

const ACTIVITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  running: 'fitness-outline',
  walking: 'walk-outline',
  cycling: 'bicycle-outline',
  hiking: 'trail-sign-outline',
};

function getActivityIcon(types: string[]): keyof typeof Ionicons.glyphMap {
  for (const t of types) {
    if (ACTIVITY_ICONS[t]) return ACTIVITY_ICONS[t];
  }
  return 'barbell-outline';
}

function formatScore(score: number, unit?: string): string {
  switch (unit) {
    case 'steps':
      return `${Math.round(score).toLocaleString()} steps`;
    case 'minutes':
      return `${Math.round(score)} min`;
    case 'count':
      return `${Math.round(score)}`;
    case 'mi':
      return `${score.toFixed(1)} mi`;
    case 'km':
    default:
      return `${score.toFixed(1)} km`;
  }
}

export const DynamicEventDetailScreen: React.FC<DynamicEventDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { eventId } = route.params;

  // Competition data from Supabase
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [compLoading, setCompLoading] = useState(true);

  // Reuse existing hooks
  const {
    leaderboard,
    charityRankings,
    isLoading: leaderboardLoading,
    refresh: refreshLeaderboard,
    currentUserPubkey,
    currentUserRank,
  } = useSupabaseLeaderboard(eventId);

  const {
    isParticipating,
    join,
  } = useCompetitionParticipation(eventId);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [visibleBatches, setVisibleBatches] = useState(1);

  // Fetch competition details
  useEffect(() => {
    const fetchCompetition = async () => {
      try {
        const comps = await SupabaseCompetitionService.fetchDynamicCompetitions();
        const found = comps.find((c) => c.external_id === eventId);
        if (found) {
          setCompetition(found);
        }
      } catch (err) {
        console.error('[DynamicEventDetail] Error fetching competition:', err);
      } finally {
        setCompLoading(false);
      }
    };
    fetchCompetition();
  }, [eventId]);

  const handleJoin = async () => {
    if (isJoining) return;
    setIsJoining(true);
    try {
      await join();
      await refreshLeaderboard();
    } finally {
      setIsJoining(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshLeaderboard();
    } finally {
      setImmediate(() => setIsRefreshing(false));
    }
  }, [refreshLeaderboard]);

  // Loading state
  if (compLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!competition) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = deriveStatus(competition);
  const config: CompetitionConfig = competition.config || {};
  const activityTypes = config.activity_types || [competition.activity_type];
  const scoreUnit = config.score_unit || 'km';
  const prizePool = competition.prize_pool_sats || 0;
  const winnerCount = config.winner_count ?? 3;
  const template = competition.template || 'distance_race';

  // Derive status text
  const getStatusText = () => {
    const now = Date.now();
    if (status === 'active') {
      const daysLeft = Math.ceil((new Date(competition.end_date).getTime() - now) / 86400000);
      return daysLeft > 0 ? `${daysLeft} days remaining` : 'Ending today';
    }
    if (status === 'upcoming') {
      const daysUntil = Math.ceil((new Date(competition.start_date).getTime() - now) / 86400000);
      return daysUntil > 0 ? `Starts in ${daysUntil} days` : 'Starting soon';
    }
    return 'Event ended';
  };

  // Format date range
  const formatDateRange = () => {
    const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
    const s = new Date(competition.start_date).toLocaleDateString('en-US', opts);
    const e = new Date(competition.end_date).toLocaleDateString('en-US', opts);
    return `${s} - ${e}`;
  };

  // Compute total score
  const totalScore = leaderboard.reduce((sum, entry) => sum + entry.score, 0);

  // Batch rendering
  const visibleEntries = leaderboard.slice(0, visibleBatches * BATCH_SIZE);
  const hasMore = visibleEntries.length < leaderboard.length;
  const remainingCount = leaderboard.length - visibleEntries.length;

  // Prize text
  const getPrizeText = () => {
    if (config.prizes && config.prizes.length > 0) {
      return config.prizes
        .map((p) => `${p.label}: ${p.amount_sats.toLocaleString()} sats`)
        .join(' | ');
    }
    if (prizePool > 0 && winnerCount > 0) {
      const perWinner = Math.floor(prizePool / winnerCount);
      return `Top ${winnerCount} win ${perWinner.toLocaleString()} sats each`;
    }
    return null;
  };

  const prizeText = getPrizeText();

  const renderParticipant = (item: SupabaseLeaderboardEntry) => {
    const isTop3 = item.rank <= 3;
    const isCurrentUser = currentUserPubkey && item.npub === currentUserPubkey;

    return (
      <View
        key={item.npub}
        style={[styles.participantRow, isCurrentUser && styles.currentUserRow]}
      >
        <View style={[styles.rankContainer, isTop3 && styles.top3Rank]}>
          {isTop3 ? (
            <Ionicons name="trophy" size={16} color={theme.colors.accent} />
          ) : (
            <Text style={styles.rank}>{item.rank}</Text>
          )}
        </View>
        <Avatar
          imageUrl={item.picture}
          name={item.displayName || item.name || '?'}
          size={40}
          style={styles.avatar}
        />
        <View style={styles.participantInfo}>
          <Text style={styles.participantName} numberOfLines={1}>
            {item.displayName || item.name || item.npub.slice(0, 12) + '...'}
          </Text>
          <Text style={styles.participantStats}>
            {item.workout_count || 0} {(item.workout_count || 0) === 1 ? 'workout' : 'workouts'}
          </Text>
        </View>
        <Text style={[styles.distanceValue, isTop3 && styles.top3Distance]}>
          {formatScore(item.score, scoreUnit)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{competition.name}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* Banner Image */}
        {competition.image_url ? (
          <Image
            source={{ uri: competition.image_url }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.bannerImage, styles.bannerPlaceholder]}>
            <Ionicons
              name={getActivityIcon(activityTypes)}
              size={48}
              color={theme.colors.textMuted}
            />
          </View>
        )}

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{competition.name}</Text>
          <Text style={styles.statusText}>{getStatusText()}</Text>

          {/* Date */}
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>{formatDateRange()}</Text>
          </View>

          {/* Description / About */}
          {(competition.description || config.rules) && (
            <View style={styles.aboutSection}>
              <Text style={styles.aboutText}>
                {config.rules || competition.description}
              </Text>
            </View>
          )}

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {winnerCount > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{winnerCount}</Text>
                <Text style={styles.statLabel}>winners</Text>
              </View>
            )}
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{leaderboard.length}</Text>
              <Text style={styles.statLabel}>participants</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {formatScore(totalScore, scoreUnit)}
              </Text>
              <Text style={styles.statLabel}>total</Text>
            </View>
            {prizePool > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {prizePool >= 1000 ? `${(prizePool / 1000).toFixed(0)}k` : prizePool}
                </Text>
                <Text style={styles.statLabel}>sats total</Text>
              </View>
            )}
          </View>

          {/* Prize Info */}
          {prizeText && (
            <View style={styles.prizeSection}>
              <Ionicons name="flash" size={20} color={theme.colors.accent} />
              <Text style={styles.prizeText}>{prizeText}</Text>
            </View>
          )}

          {/* Join Button */}
          {currentUserPubkey && !isParticipating && status !== 'ended' && competition.is_open && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <>
                  <Ionicons
                    name={getActivityIcon(activityTypes)}
                    size={20}
                    color={theme.colors.text}
                  />
                  <Text style={styles.joinButtonText}>Join Event</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Joined Badge */}
          {isParticipating && (
            <View style={styles.joinedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
              <Text style={styles.joinedBadgeText}>You're participating!</Text>
            </View>
          )}
        </View>

        {/* Leaderboard */}
        <View style={styles.leaderboardSection}>
          <View style={styles.leaderboardTitleRow}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            {activityTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}
            {scoreUnit ? ` - by ${scoreUnit}` : ''}
          </Text>

          {leaderboardLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading participants...</Text>
            </View>
          ) : leaderboard.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name={getActivityIcon(activityTypes)}
                size={48}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyText}>No data yet</Text>
              <Text style={styles.emptySubtext}>
                Join and submit workouts to appear on the leaderboard!
              </Text>
            </View>
          ) : (
            <>
              {visibleEntries.map((item) => renderParticipant(item))}

              {hasMore && (
                <TouchableOpacity
                  style={styles.seeMoreButton}
                  onPress={() => setVisibleBatches((b) => b + 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeMoreText}>
                    See More ({remainingCount} remaining)
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.accent} />
                </TouchableOpacity>
              )}

              {/* Current user position if not visible */}
              {currentUserRank && currentUserRank > 25 && (
                <View style={styles.currentUserSection}>
                  <Text style={styles.currentUserLabel}>Your Position</Text>
                  {leaderboard
                    .filter((e) => e.npub === currentUserPubkey)
                    .map((e) => renderParticipant(e))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Charity Rankings (fundraiser template) */}
        {template === 'fundraiser' && charityRankings.length > 0 && (
          <View style={styles.leaderboardSection}>
            <Text style={styles.sectionTitle}>Charity Rankings</Text>
            <Text style={styles.sectionSubtitle}>By total distance contributed</Text>
            {charityRankings.map((charity) => (
              <View key={charity.charityId} style={styles.participantRow}>
                <View style={styles.rankContainer}>
                  <Text style={styles.rank}>{charity.rank}</Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{charity.charityName}</Text>
                  <Text style={styles.participantStats}>
                    {charity.participantCount} supporters
                  </Text>
                </View>
                <Text style={styles.distanceValue}>
                  {charity.totalDistance.toFixed(1)} km
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Note Section */}
        <View style={styles.noteSection}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
          <Text style={styles.noteText}>
            Join the event and submit workouts to appear on the leaderboard.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  bannerImage: {
    width: '100%',
    height: 200,
    backgroundColor: theme.colors.border,
  },
  bannerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginLeft: 8,
  },
  aboutSection: {
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  aboutText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statBox: {
    width: '25%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  prizeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.accent}15`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  prizeText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.accent}15`,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
  },
  joinedBadgeText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
  },
  leaderboardSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  leaderboardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  currentUserRow: {
    backgroundColor: `${theme.colors.accent}10`,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  rankContainer: {
    width: 28,
    alignItems: 'center',
  },
  top3Rank: {},
  rank: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },
  avatar: {
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  participantStats: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  distanceValue: {
    fontSize: 15,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    marginLeft: 8,
  },
  top3Distance: {
    color: '#FF9D42',
  },
  currentUserSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  currentUserLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  seeMoreText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DynamicEventDetailScreen;
