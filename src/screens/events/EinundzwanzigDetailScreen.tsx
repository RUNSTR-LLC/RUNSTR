/**
 * EinundzwanzigDetailScreen - Einundzwanzig Fitness Challenge detail screen
 *
 * Shows event info with a combined running+walking leaderboard and 3 featured charities.
 * Uses Supabase for leaderboard data.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import {
  EINUNDZWANZIG_CONFIG,
  getEinundzwanzigStatus,
  getDaysRemaining,
  getDaysUntilStart,
  EINUNDZWANZIG_DEMO_MODE,
  EINUNDZWANZIG_COMPETITION_ID,
  EINUNDZWANZIG_FEATURED_CHARITIES,
  EINUNDZWANZIG_REWARD_CONFIG,
  EINUNDZWANZIG_MAX_PAYOUT_SATS,
} from '../../constants/einundzwanzig';
import { getCharityById } from '../../constants/charities';
import { EinundzwanzigService } from '../../services/challenge/EinundzwanzigService';
import { useSupabaseLeaderboard } from '../../hooks/useSupabaseLeaderboard';
import { Season2Leaderboard } from '../../components/season2/Season2Leaderboard';
import { ExternalZapModal } from '../../components/nutzap/ExternalZapModal';
import type { Season2Participant } from '../../types/season2';

interface EinundzwanzigDetailScreenProps {
  navigation: any;
}

export const EinundzwanzigDetailScreen: React.FC<EinundzwanzigDetailScreenProps> = ({
  navigation,
}) => {
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userPubkey, setUserPubkey] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [zapModalVisible, setZapModalVisible] = useState(false);
  const [zapRecipient, setZapRecipient] = useState<{
    name: string;
    lightningAddress: string;
    charityId: string;
  } | null>(null);

  // Always use EIN competition ID - demo mode only shifts dates, not data source
  const competitionId = EINUNDZWANZIG_COMPETITION_ID;

  const {
    leaderboard,
    isLoading,
    hasRealData,
    refresh,
    currentUserPubkey,
  } = useSupabaseLeaderboard(competitionId);

  // Transform leaderboard data to Season2Participant format
  // Users without a featured team tag show "No Team"
  const participants = useMemo((): Season2Participant[] => {
    const featuredTeams = EINUNDZWANZIG_FEATURED_CHARITIES as readonly string[];
    return leaderboard.map((entry) => {
      const hasFeaturedTeam = entry.charityId && featuredTeams.includes(entry.charityId);
      return {
        pubkey: entry.npub,
        npub: entry.npub,
        name: entry.name || 'Anonymous',
        picture: entry.picture,
        totalDistance: entry.score, // Already in km from useSupabaseLeaderboard
        workoutCount: entry.workout_count || 0,
        charityId: hasFeaturedTeam ? entry.charityId : undefined,
        charityName: hasFeaturedTeam ? entry.charityName : 'No Team',
        isLocalJoin: false, // All Einundzwanzig participants are from Supabase
      };
    });
  }, [leaderboard]);

  // Calculate stats from leaderboard
  const totalDistanceKm = useMemo(() => {
    return participants.reduce((sum, p) => sum + p.totalDistance, 0);
  }, [participants]);

  const totalParticipants = participants.length;

  // Calculate featured charity totals using O(n) Map lookup instead of O(n*m) filter
  const featuredCharityStats = useMemo(() => {
    // Build Map once: charityId -> { totalKm, count }
    const charityMap = new Map<string, { totalKm: number; count: number }>();

    for (const p of participants) {
      if (!p.charityId) continue;
      const existing = charityMap.get(p.charityId) || { totalKm: 0, count: 0 };
      existing.totalKm += p.totalDistance;
      existing.count += 1;
      charityMap.set(p.charityId, existing);
    }

    // Map featured charities using O(1) lookups
    return EINUNDZWANZIG_FEATURED_CHARITIES.map((charityId) => {
      const charity = getCharityById(charityId);
      const stats = charityMap.get(charityId) || { totalKm: 0, count: 0 };

      return {
        charityId,
        charityName: charity?.name || charityId,
        charityImage: charity?.image,
        lightningAddress: charity?.lightningAddress,
        totalKm: stats.totalKm,
        estimatedSats: Math.floor(stats.totalKm * EINUNDZWANZIG_CONFIG.satsPerKm),
        participantCount: stats.count,
      };
    });
  }, [participants]);

  // Load user state on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
        setUserPubkey(pubkey);

        if (pubkey) {
          const joined = await EinundzwanzigService.hasJoined(pubkey);
          setHasJoined(joined);
        }

        // Load selected team
        const teamId = await AsyncStorage.getItem('@runstr:selected_team_id');
        setSelectedTeamId(teamId);
      } catch (error) {
        console.error('[EinundzwanzigDetail] Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  const handleJoin = async () => {
    if (!userPubkey || isJoining) return;

    setIsJoining(true);

    // OPTIMISTIC: Show joined state immediately
    setHasJoined(true);
    setIsJoining(false);

    // BACKGROUND: Fire-and-forget join + refresh
    EinundzwanzigService.joinChallenge(userPubkey)
      .then((success) => {
        if (success) {
          // Refresh leaderboard in background (non-blocking)
          refresh().catch((err) => {
            console.warn('[EinundzwanzigDetail] Background refresh failed:', err);
          });
        } else {
          // Rollback on failure
          setHasJoined(false);
        }
      })
      .catch((error) => {
        console.error('[EinundzwanzigDetail] Error joining challenge:', error);
        setHasJoined(false);
      });
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      // Use setImmediate to ensure state resets after gesture completes
      // This prevents blocking iOS back gesture recognition
      setImmediate(() => setIsRefreshing(false));
    }
  }, [refresh]);

  const handleOpenWebsite = () => {
    Linking.openURL(EINUNDZWANZIG_CONFIG.website);
  };

  // Handle team selection - memoized to prevent re-renders
  const handleSelectTeam = useCallback(async (charityId: string) => {
    const newValue = selectedTeamId === charityId ? null : charityId;
    if (newValue) {
      await AsyncStorage.setItem('@runstr:selected_team_id', newValue);
    } else {
      await AsyncStorage.removeItem('@runstr:selected_team_id');
    }
    setSelectedTeamId(newValue);
  }, [selectedTeamId]);

  // Handle zap button press
  const handleZapTeam = (charity: typeof featuredCharityStats[0]) => {
    if (charity.lightningAddress) {
      setZapRecipient({
        name: charity.charityName,
        lightningAddress: charity.lightningAddress,
        charityId: charity.charityId,
      });
      setZapModalVisible(true);
    }
  };

  const status = getEinundzwanzigStatus();
  const daysRemaining = getDaysRemaining();
  const daysUntilStart = getDaysUntilStart();

  const formatDateRange = () => {
    const start = EINUNDZWANZIG_CONFIG.startDate;
    const end = EINUNDZWANZIG_CONFIG.endDate;
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const getStatusText = () => {
    switch (status) {
      case 'active':
        return daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Ending today';
      case 'upcoming':
        return daysUntilStart > 0 ? `Starts in ${daysUntilStart} days` : 'Starting soon';
      case 'ended':
        return 'Challenge ended';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Einundzwanzig</Text>
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
          source={EINUNDZWANZIG_CONFIG.bannerImage}
          style={styles.bannerImage}
          resizeMode="contain"
        />

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{EINUNDZWANZIG_CONFIG.eventName}</Text>
          <Text style={styles.statusText}>{getStatusText()}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>{formatDateRange()}</Text>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionText}>{EINUNDZWANZIG_CONFIG.description}</Text>
          </View>

          {/* Stats Grid - Combined running+walking totals */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalDistanceKm.toFixed(0)}</Text>
              <Text style={styles.statLabel}>total km</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{(EINUNDZWANZIG_MAX_PAYOUT_SATS / 1_000_000)}M</Text>
              <Text style={styles.statLabel}>Rewards Pool</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalParticipants}</Text>
              <Text style={styles.statLabel}>participants</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>teams</Text>
            </View>
          </View>

          {/* Sats Per Km Info */}
          <View style={styles.prizeSection}>
            <Ionicons name="flash" size={20} color={theme.colors.accent} />
            <Text style={styles.prizeText}>
              Every kilometer = {EINUNDZWANZIG_CONFIG.satsPerKm.toLocaleString()} sats for your selected team
            </Text>
          </View>

          {/* Double Rewards Banner */}
          <View style={styles.doubleRewardsBanner}>
            <Ionicons name="flash" size={20} color={theme.colors.orangeBright} />
            <Text style={styles.doubleRewardsText}>
              Double rewards! Earn {EINUNDZWANZIG_REWARD_CONFIG.bonusRewardSats} sats per daily workout during this challenge
            </Text>
          </View>

          {/* Join Button - Show if not joined and challenge not ended */}
          {userPubkey && !hasJoined && status !== 'ended' && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoin}
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

          {/* Joined Badge */}
          {hasJoined && (
            <View style={styles.joinedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
              <Text style={styles.joinedBadgeText}>Joined!</Text>
            </View>
          )}

          {/* Website Button */}
          <TouchableOpacity style={styles.websiteButton} onPress={handleOpenWebsite}>
            <Ionicons name="globe-outline" size={20} color={theme.colors.text} />
            <Text style={styles.websiteButtonText}>Visit Einundzwanzig</Text>
          </TouchableOpacity>
        </View>

        {/* Demo Mode Indicator */}
        {EINUNDZWANZIG_DEMO_MODE && (
          <View style={styles.demoIndicator}>
            <Text style={styles.demoText}>
              Demo Mode: Simulating active event (last 10 days)
            </Text>
          </View>
        )}

        {/* User Leaderboard Section */}
        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          {isLoading && !hasRealData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
          ) : participants.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>Coming Soon</Text>
              <Text style={styles.emptySubtext}>
                The leaderboard will populate once participants join.
              </Text>
            </View>
          ) : (
            <Season2Leaderboard
              participants={participants}
              isLoading={false}
              currentUserPubkey={currentUserPubkey}
              activityType="running" // Combined leaderboard shows distance in km
              emptyMessage="No participants yet"
            />
          )}
        </View>

        {/* Featured Teams Section */}
        <View style={styles.featuredTeamsSection}>
          <Text style={styles.sectionTitle}>Featured Teams</Text>
          <Text style={styles.sectionSubtitle}>
            Each team receives {EINUNDZWANZIG_CONFIG.satsPerKm.toLocaleString()} sats per kilometer at the end of the challenge
          </Text>
          {featuredCharityStats.map((charity) => {
            const isSelected = selectedTeamId === charity.charityId;
            return (
              <TouchableOpacity
                key={charity.charityId}
                style={[
                  styles.featuredCharityCard,
                  isSelected && styles.featuredCharityCardSelected,
                ]}
                onPress={() => handleSelectTeam(charity.charityId)}
                activeOpacity={0.7}
              >
                {charity.charityImage && (
                  <Image source={charity.charityImage} style={styles.charityImage} />
                )}
                <View style={styles.charityInfo}>
                  <Text style={styles.charityName}>{charity.charityName}</Text>
                  <Text style={styles.charityStats}>
                    {charity.totalKm.toFixed(1)} km • {charity.participantCount} supporter{charity.participantCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                {/* Zap Button */}
                <TouchableOpacity
                  style={styles.zapButton}
                  onPress={() => handleZapTeam(charity)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="flash-outline" size={16} color={theme.colors.orangeBright} />
                </TouchableOpacity>
                {/* Selection Checkmark */}
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={theme.colors.success}
                    style={styles.checkmark}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info Note */}
        <View style={styles.noteSection}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
          <Text style={styles.noteText}>
            Running and walking workouts during the event period count toward your total distance.
            Select one of the featured teams above to support them with your kilometers.
          </Text>
        </View>
      </ScrollView>

      {/* External Zap Modal */}
      {zapRecipient && (
        <ExternalZapModal
          visible={zapModalVisible}
          recipientNpub={zapRecipient.lightningAddress}
          recipientName={zapRecipient.name}
          memo={`Donation to ${zapRecipient.name}`}
          onClose={() => {
            setZapModalVisible(false);
            setZapRecipient(null);
          }}
          isCharityDonation={true}
          charityId={zapRecipient.charityId}
          charityLightningAddress={zapRecipient.lightningAddress}
        />
      )}
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
  descriptionSection: {
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  descriptionText: {
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
    backgroundColor: `${theme.colors.accent}15`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  prizeText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
  },
  doubleRewardsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 157, 66, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 157, 66, 0.3)',
  },
  doubleRewardsText: {
    flex: 1,
    fontSize: 14,
    color: '#FF9D42',
    fontWeight: theme.typography.weights.semiBold,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
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
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    gap: 8,
  },
  websiteButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  demoIndicator: {
    backgroundColor: 'rgba(255, 157, 66, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  demoText: {
    color: '#FF9D42',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: theme.typography.weights.medium,
  },
  leaderboardSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  featuredTeamsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  featuredCharityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  charityImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  charityInfo: {
    flex: 1,
  },
  charityName: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  charityStats: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  featuredCharityCardSelected: {
    borderColor: theme.colors.success,
    borderWidth: 2,
  },
  zapButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkmark: {
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    marginBottom: 16,
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
  noteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
    gap: 8,
    marginBottom: 32,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
});

export default EinundzwanzigDetailScreen;
