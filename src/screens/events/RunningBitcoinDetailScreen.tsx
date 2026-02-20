/**
 * RunningBitcoinDetailScreen - Running Bitcoin Challenge detail screen
 * Shows event info, leaderboard, and donate button
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
  Linking,
} from 'react-native';

// Batch rendering for performance (same pattern as Season II)
const BATCH_SIZE = 21;
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  RUNNING_BITCOIN_CONFIG,
  getRunningBitcoinStatus,
  getDaysRemaining,
} from '../../constants/runningBitcoin';
import {
  RunningBitcoinService,
  type RunningBitcoinParticipant,
} from '../../services/challenge/RunningBitcoinService';
import { Avatar } from '../../components/ui/Avatar';
import { useRunningBitcoin } from '../../hooks/useRunningBitcoin';

// Note: Reward claiming is now fully automatic via auto-pay on workout publish
// No manual claim button needed - just show status

interface RunningBitcoinDetailScreenProps {
  navigation: any;
}

export const RunningBitcoinDetailScreen: React.FC<RunningBitcoinDetailScreenProps> = ({
  navigation,
}) => {
  // Use the hook for state management and fast refresh
  const {
    leaderboard,
    isLoading,
    refreshAll,
    currentUserPubkey,
    hasJoined,
    joinChallenge,
  } = useRunningBitcoin();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [hasClaimedReward, setHasClaimedReward] = useState(false);
  const [visibleBatches, setVisibleBatches] = useState(1);

  // Get current user's participant data
  const currentUserParticipant = leaderboard?.participants.find(
    p => p.pubkey === currentUserPubkey
  );
  const isFinisher = currentUserParticipant?.isFinisher ?? false;

  // Check if user has already claimed their reward (auto-paid)
  useEffect(() => {
    const checkRewardStatus = async () => {
      if (!currentUserPubkey) return;

      try {
        const claimed = await RunningBitcoinService.hasClaimedReward(currentUserPubkey);
        setHasClaimedReward(claimed);
      } catch (error) {
        console.error('[RunningBitcoinDetail] Error checking reward status:', error);
      }
    };
    checkRewardStatus();
  }, [currentUserPubkey]);

  const handleJoinChallenge = async () => {
    if (!currentUserPubkey || isJoining) return;

    setIsJoining(true);
    try {
      await joinChallenge();
    } catch (error) {
      console.error('[RunningBitcoinDetail] Error joining challenge:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshAll();
    // Use setImmediate to bypass iOS timer blocking
    setImmediate(() => setIsRefreshing(false));
  }, [refreshAll]);

  const handleDonate = () => {
    Linking.openURL(RUNNING_BITCOIN_CONFIG.donateUrl);
  };

  // Note: Manual claim button removed - rewards are now auto-paid when user reaches 21km
  // and publishes any workout. The reward status is checked via hasClaimedReward().

  const status = getRunningBitcoinStatus();
  const daysRemaining = getDaysRemaining();

  const formatDateRange = () => {
    const start = RUNNING_BITCOIN_CONFIG.startDate;
    const end = RUNNING_BITCOIN_CONFIG.endDate;
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const getStatusText = () => {
    switch (status) {
      case 'active':
        return daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Ending today';
      case 'upcoming':
        return 'Coming soon';
      case 'ended':
        return 'Challenge ended';
    }
  };

  // Show all participants from baseline (demo baseline may have finishers with distance=0)
  const activeParticipants = leaderboard?.participants || [];
  const finisherCount = leaderboard?.finishers.length || 0;

  // Batch rendering: show 21 at a time with "See More" button
  const visibleParticipants = activeParticipants.slice(0, visibleBatches * BATCH_SIZE);
  const hasMore = visibleParticipants.length < activeParticipants.length;
  const remainingCount = activeParticipants.length - visibleParticipants.length;

  const renderParticipant = ({ item, index }: { item: RunningBitcoinParticipant; index: number }) => {
    const progressPercent = Math.min(100, (item.totalDistanceKm / RUNNING_BITCOIN_CONFIG.goalDistanceKm) * 100);

    return (
      <View style={styles.participantRow}>
        <Text style={styles.rank}>{index + 1}</Text>
        <Avatar
          imageUrl={item.picture}
          name={item.name}
          size={40}
          style={styles.avatar}
        />
        <View style={styles.participantInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.participantName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isFinisher && (
              <View style={styles.finisherBadge}>
                <Ionicons
                  name={item.finisherRank && item.finisherRank <= 21 ? 'trophy' : 'checkmark-circle'}
                  size={16}
                  color={theme.colors.accent}
                />
              </View>
            )}
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.participantStats}>
            {item.totalDistanceKm.toFixed(1)} / {RUNNING_BITCOIN_CONFIG.goalDistanceKm} km • {item.workoutCount} workouts
          </Text>
        </View>
        <Text style={styles.distanceValue}>
          {item.totalDistanceKm.toFixed(1)} km
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Running Bitcoin</Text>
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
        <Image
          source={RUNNING_BITCOIN_CONFIG.bannerImage}
          style={styles.bannerImage}
          resizeMode="contain"
        />

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{RUNNING_BITCOIN_CONFIG.eventName}</Text>
          <Text style={styles.statusText}>{getStatusText()}</Text>

          {/* Date */}
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>{formatDateRange()}</Text>
          </View>

          {/* Memorial Text */}
          <View style={styles.memorialSection}>
            <Text style={styles.memorialText}>
              "Running Bitcoin" - Hal Finney's tweet on January 10, 2009, marked the first Bitcoin
              transaction after Satoshi. This challenge honors his legacy and supports ALS research.
            </Text>
          </View>

          {/* Goal Stats - Simplified: just goal and finishers */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{RUNNING_BITCOIN_CONFIG.goalDistanceKm}</Text>
              <Text style={styles.statLabel}>km goal</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{finisherCount}</Text>
              <Text style={styles.statLabel}>finishers</Text>
            </View>
          </View>

          {/* Prize Info */}
          <View style={styles.prizeSection}>
            <Ionicons name="flash" size={20} color={theme.colors.accent} />
            <Text style={styles.prizeText}>
              All users who complete the challenge will earn {RUNNING_BITCOIN_CONFIG.finisherRewardSats.toLocaleString()} sats
            </Text>
          </View>

          {/* Join Button - Show if not joined and challenge not ended */}
          {currentUserPubkey && !hasJoined && status !== 'ended' && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoinChallenge}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <>
                  <Ionicons name="fitness" size={20} color={theme.colors.text} />
                  <Text style={styles.joinButtonText}>Join Challenge</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Joined Badge - Show if already joined */}
          {hasJoined && (
            <View style={styles.joinedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
              <Text style={styles.joinedBadgeText}>You're participating!</Text>
            </View>
          )}

          {/* Finisher Status - Reward is auto-paid on workout publish */}
          {isFinisher && hasClaimedReward && (
            <View style={styles.sharedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.sharedBadgeText}>21km Complete - Reward Paid!</Text>
            </View>
          )}

          {/* Finisher pending reward - will be paid on next workout */}
          {isFinisher && !hasClaimedReward && (
            <View style={styles.pendingRewardBadge}>
              <Ionicons name="flash" size={20} color={theme.colors.accent} />
              <Text style={styles.pendingRewardText}>
                21km Complete! Reward will be sent on next workout.
              </Text>
            </View>
          )}

          {/* Donate Button */}
          <TouchableOpacity style={styles.donateButton} onPress={handleDonate}>
            <Ionicons name="heart" size={20} color="#000" />
            <Text style={styles.donateButtonText}>Donate to ALS Network</Text>
          </TouchableOpacity>
        </View>

        {/* Leaderboard */}
        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <Text style={styles.sectionSubtitle}>Running + Walking combined</Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading participants...</Text>
            </View>
          ) : activeParticipants.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No workouts logged yet</Text>
              <Text style={styles.emptySubtext}>Start running or walking to appear on the leaderboard!</Text>
            </View>
          ) : (
            <>
              {visibleParticipants.map((item, index) => (
                <React.Fragment key={item.pubkey}>
                  {renderParticipant({ item, index })}
                </React.Fragment>
              ))}
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
            </>
          )}
        </View>

        {/* Eligible Activities Note */}
        <View style={styles.noteSection}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
          <Text style={styles.noteText}>
            Join the challenge and submit running or walking workouts to appear on the leaderboard.
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
  },
  headerButton: {
    padding: 4,
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
  memorialSection: {
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  memorialText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statBox: {
    width: '50%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
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
    backgroundColor: '#111111',
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
    borderColor: theme.colors.text,
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
    backgroundColor: '#111111',
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
  shareCompletionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
  },
  shareCompletionButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: '#000',
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 123, 28, 0.15)', // Orange tint matching theme
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
  },
  sharedBadgeText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.success, // Orange (theme.colors.success is #FF9D42)
  },
  pendingRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 157, 66, 0.15)', // Accent tint
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  pendingRewardText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
    flex: 1,
    textAlign: 'center',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  donateButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: '#000',
  },
  leaderboardSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
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
  rank: {
    width: 28,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantName: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  finisherBadge: {
    marginLeft: 4,
  },
  finisherBadgeText: {
    fontSize: 14,
  },
  progressContainer: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.text,
    borderRadius: 2,
  },
  participantStats: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  distanceValue: {
    fontSize: 15,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
    marginLeft: 8,
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

export default RunningBitcoinDetailScreen;
