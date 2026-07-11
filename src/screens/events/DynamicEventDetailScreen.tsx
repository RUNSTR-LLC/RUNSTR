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
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { OstrichRefreshScrollView } from '../../components/ui/OstrichRefreshScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  useSupabaseLeaderboard,
  useCompetitionParticipation,
  SupabaseLeaderboardEntry,
} from '../../hooks/useSupabaseLeaderboard';
import { SupabaseCompetitionService } from '../../services/backend/SupabaseCompetitionService';
import { ClubService } from '../../services/backend/ClubService';
import { ClubMembershipService } from '../../services/backend/ClubMembershipService';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { PledgeService } from '../../services/pledge/PledgeService';
import { EventFinalizationService, FinalizationResult, PayoutRecipient } from '../../services/events/EventFinalizationService';
import { partitionRecipients, filterAlreadyPaid } from '../../services/events/payoutMath';
import { NWCStorageService } from '../../services/wallet/NWCStorageService';
import { NWCWalletService } from '../../services/wallet/NWCWalletService';
import { callEdgeFunction } from '../../utils/edgeFunctions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar } from '../../components/ui/Avatar';
import type { Competition, CompetitionConfig } from '../../utils/supabase';
import { deriveStatus } from '../../utils/competitionStatus';
import { getCharityById } from '../../constants/charities';

const RUNSTR_LOGO = require('../../../assets/images/icon.png');

const BATCH_SIZE = 21;

interface DynamicEventDetailScreenProps {
  navigation: any;
  route: { params: { eventId: string } };
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
    case 'seconds': {
      // Format duration in seconds as mm:ss or H:mm:ss
      const totalSec = Math.round(score);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      return `${m}:${String(s).padStart(2, '0')}`;
    }
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
  const [isEventCreator, setIsEventCreator] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);

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

  const [finalizationResult, setFinalizationResult] = useState<FinalizationResult | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [visibleBatches, setVisibleBatches] = useState(1);
  const [clubName, setClubName] = useState<string | null>(null);
  const [isClubMember, setIsClubMember] = useState<boolean | null>(null); // null = not checked yet
  const [showClubGateAlert, setShowClubGateAlert] = useState(false);
  const [totalRaised, setTotalRaised] = useState<number>(0);

  const charityConfig = competition?.config;
  const isCharityEvent = !!charityConfig?.charity_id;
  const charity = isCharityEvent ? getCharityById(charityConfig.charity_id) : null;

  // Fetch competition details (try cache first, then direct lookup)
  useEffect(() => {
    const fetchCompetition = async () => {
      try {
        // Try cached list first
        const comps = await SupabaseCompetitionService.fetchDynamicCompetitions();
        let found = comps.find((c) => c.external_id === eventId);

        // Fallback: direct query (handles newly created events not yet in cache)
        if (!found) {
          found = await SupabaseCompetitionService.fetchCompetitionByExternalId(eventId);
        }

        if (found) {
          setCompetition(found);

          // Check if current user is the event creator
          const npub = await AsyncStorage.getItem('@runstr:npub');
          if (npub && found.created_by_npub === npub) {
            setIsEventCreator(true);
          }
        }
      } catch (err) {
        console.error('[DynamicEventDetail] Error fetching competition:', err);
      } finally {
        setCompLoading(false);
      }
    };
    fetchCompetition();
  }, [eventId]);

  // Fetch club info when competition belongs to a club
  useEffect(() => {
    if (!competition?.club_id) return;

    const fetchClubInfo = async () => {
      // Fetch club name
      const club = await ClubService.getClubById(competition.club_id!);
      if (club) {
        setClubName(club.name);
      }

      // Check if current user is a member of this club
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (npub) {
        const member = await ClubMembershipService.isMember(competition.club_id!, npub);
        setIsClubMember(member);
      } else {
        setIsClubMember(false);
      }
    };
    fetchClubInfo();
  }, [competition]);

  useEffect(() => {
    if (!isCharityEvent || !competition) return;

    const fetchTotalRaised = async () => {
      try {
        const { supabase, isSupabaseConfigured } = await import('../../utils/supabase');
        if (!isSupabaseConfigured() || !supabase) return;

        const { data, error } = await supabase
          .from('charity_reward_payments')
          .select('amount_sats')
          .eq('charity_id', charityConfig!.charity_id!)
          .gte('created_at', competition.start_date)
          .lte('created_at', competition.end_date)
          .eq('status', 'success');

        if (!error && data) {
          const fromPayments = data.reduce((sum: number, r: { amount_sats: number }) => sum + (r.amount_sats || 0), 0);
          const captainDonation = charityConfig?.captain_donation_sats || 0;
          setTotalRaised(fromPayments + captainDonation);
        }
      } catch (err) {
        console.error('[DynamicEventDetail] Error fetching total raised:', err);
      }
    };
    fetchTotalRaised();
  }, [isCharityEvent, competition, charityConfig]);

  const handleCharityJoin = async () => {
    setIsJoining(true);
    try {
      if (!competition || !charityConfig?.charity_id) return;

      // Switch reward destination to this charity
      await AsyncStorage.setItem('@runstr:selected_team_id', charityConfig.charity_id);

      // Join the competition via existing hook
      await join();
      await refreshLeaderboard();

      Alert.alert('Joined!', `Your next reward will go to ${charityConfig.charity_name || 'charity'}. Thank you!`);
    } catch (error) {
      console.error('[DynamicEventDetail] Charity join error:', error);
      Alert.alert('Error', 'Failed to join event. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handlePledgeAndJoin = async () => {
    setIsJoining(true);
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) return;

      // Check eligibility (active pledge, Lightning address, etc.)
      const eligibility = await PledgeService.canCreatePledge(userPubkey);
      if (!eligibility.allowed) {
        Alert.alert(
          eligibility.reason === 'active_pledge_exists' ? 'Active Pledge' : 'Cannot Join',
          eligibility.message || 'Unable to create pledge.',
        );
        return;
      }

      // Get captain's lightning address from competition config
      const captainAddress = competition?.config?.captain_lightning_address || '';
      if (!captainAddress) {
        Alert.alert('Event Error', 'This event is missing a reward destination. Contact the event captain.');
        return;
      }
      const captainName = competition?.name || 'Event Captain';

      // Create the pledge
      const pledge = await PledgeService.createPledge({
        eventId: competition!.id,
        eventName: competition!.name,
        totalWorkouts: competition!.config!.ticket_pledge_days!,
        destination: {
          type: 'captain',
          lightningAddress: captainAddress,
          name: captainName,
        },
        userPubkey,
      });

      if (!pledge) {
        Alert.alert('Error', 'Failed to create pledge. Please try again.');
        return;
      }

      // Join the competition — roll back pledge if this fails
      try {
        await join();
        await refreshLeaderboard();
      } catch (joinError) {
        console.error('[DynamicEventDetail] Join failed after pledge, rolling back:', joinError);
        await PledgeService.clearActivePledge(userPubkey);
        Alert.alert('Error', 'Failed to join event. Your pledge has been cancelled. Please try again.');
        return;
      }
    } catch (error) {
      console.error('[DynamicEventDetail] Pledge + join error:', error);
      Alert.alert('Error', 'Failed to join event. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoin = async () => {
    if (isJoining) return;

    // Check club membership gate before joining
    if (competition?.club_id && isClubMember === false) {
      setShowClubGateAlert(true);
      return;
    }

    // Charity event: use simplified join flow
    if (isCharityEvent) {
      await handleCharityJoin();
      return;
    }

    // Pledge gate for ticketed events
    const pledgeDays = competition?.config?.ticket_pledge_days;
    if (pledgeDays && pledgeDays > 0) {
      Alert.alert(
        'Entry Fee Required',
        `This event requires pledging ${pledgeDays} workout day${pledgeDays > 1 ? 's' : ''} to enter. Your next ${pledgeDays} daily reward${pledgeDays > 1 ? 's' : ''} will go to the event captain.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pledge & Join', onPress: handlePledgeAndJoin },
        ]
      );
      return;
    }

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

  const handleFinalize = async () => {
    if (!competition?.config) return;
    setIsFinalizing(true);
    try {
      const config = competition.config;
      const prizePoolSats = config.prize_pool_sats || competition.prize_pool_sats || 0;
      const distribution = config.prize_distribution || 'top3';

      // Step 1: Get finishers
      const result = await EventFinalizationService.finalizeEvent(
        competition.id,
        config.winner_selection === 'random' ? 'random' : 'ranked',
        distribution === 'all_participants' ? 0 : (config.qualifying_distance_km || 0),
        prizePoolSats,
      );
      setFinalizationResult(result);

      // Step 2: Auto-payout if prize pool exists
      if (prizePoolSats > 0 && result.finishers.length > 0) {
        setIsPaying(true);

        const recipients = EventFinalizationService.calculateSplits(
          result.finishers,
          prizePoolSats,
          distribution,
        );

        const payoutResults = await EventFinalizationService.executePayout(recipients);

        // Update finalization result with payout info
        setFinalizationResult(prev => prev ? { ...prev, payoutResults } : prev);

        // Store results in competition config
        try {
          await callEdgeFunction('manage-competition', {
            action: 'update',
            competition_id: competition.id,
            npub: await AsyncStorage.getItem('@runstr:npub') || '',
            updates: {
              config: { ...config, payout_results: payoutResults },
            },
          });
        } catch (e) {
          console.warn('[DynamicEventDetail] Failed to persist payout results:', e);
        }

        // Show summary
        const successCount = payoutResults.filter(p => p.success).length;
        const failCount = payoutResults.filter(p => !p.success).length;
        const totalPaid = payoutResults.filter(p => p.success).reduce((sum, p) => sum + p.amount_sats, 0);

        let summary = `Paid ${totalPaid} sats to ${successCount} recipient${successCount !== 1 ? 's' : ''}.`;
        if (failCount > 0) {
          summary += ` ${failCount} payment${failCount !== 1 ? 's' : ''} failed.`;
        }
        Alert.alert('Event Finalized', summary);

        setIsPaying(false);
      } else if (result.finishers.length === 0) {
        Alert.alert('No Finishers', 'No participants met the qualifying criteria.');
      } else {
        Alert.alert('Event Finalized', `${result.finishers.length} finisher${result.finishers.length !== 1 ? 's' : ''}.`);
      }
    } catch (error) {
      console.error('[DynamicEventDetail] Finalization error:', error);
      Alert.alert('Error', 'Failed to finalize event. Please try again.');
    } finally {
      setIsFinalizing(false);
      setIsPaying(false);
    }
  };

  const handlePayWinners = async () => {
    if (!competition?.config) return;

    // Guard: NWC wallet must be connected (string lives only on-device).
    const hasWallet = await NWCStorageService.hasNWC();
    if (!hasWallet) {
      Alert.alert(
        'Connect a wallet',
        'To pay winners you need to connect your wallet first. Open the Rewards screen and connect your wallet, then try again.',
      );
      return;
    }

    setIsFinalizing(true);
    try {
      const config = competition.config;
      const prizePoolSats = config.prize_pool_sats || competition.prize_pool_sats || 0;
      const distribution = config.prize_distribution || 'top3';

      const result = await EventFinalizationService.finalizeEvent(
        competition.id,
        config.winner_selection === 'random' ? 'random' : 'ranked',
        distribution === 'all_participants' ? 0 : (config.qualifying_distance_km || 0),
        prizePoolSats,
      );
      setFinalizationResult(result);

      if (prizePoolSats <= 0 || result.finishers.length === 0) {
        Alert.alert('No payouts', 'There are no qualifying finishers to pay.');
        return;
      }

      // Compute splits, drop anyone already paid, then separate payable vs unpayable.
      const allRecipients = EventFinalizationService.calculateSplits(
        result.finishers,
        prizePoolSats,
        distribution,
      );
      const notYetPaid = filterAlreadyPaid(allRecipients, config.payout_results);
      const { payable, unpayable } = partitionRecipients(notYetPaid);

      if (payable.length === 0) {
        Alert.alert(
          'Nothing to pay',
          unpayable.length > 0
            ? `${unpayable.length} winner(s) have no reward destination and can't be paid. Everyone else is already paid.`
            : 'All winners are already paid.',
        );
        return;
      }

      const total = payable.reduce((s, r) => s + r.amount_sats, 0);

      // Best-effort balance check (non-blocking if the wallet is slow/unreachable).
      let balanceWarning = '';
      try {
        const { balance, error } = await NWCWalletService.getBalance();
        if (!error && balance < total) {
          balanceWarning = `\n\nWarning: your wallet balance (${balance} sats) is less than ${total} sats — some payments may fail.`;
        }
      } catch {
        // ignore — proceed to confirm
      }

      const lines = payable
        .map(r => `• ${r.name || r.npub.slice(0, 12) + '…'}: ${r.amount_sats} sats`)
        .join('\n');
      const unpayableNote =
        unpayable.length > 0
          ? `\n\n${unpayable.length} winner(s) can't be paid (no reward destination) and will be skipped.`
          : '';

      Alert.alert(
        'Pay winners?',
        `Send ${total} sats from your wallet to ${payable.length} winner(s):\n\n${lines}${unpayableNote}${balanceWarning}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay',
            onPress: async () => {
              setIsPaying(true);
              try {
                const payoutResults = await EventFinalizationService.executePayout(payable);

                // Merge: prior successes + unpayable (marked) + this run's results.
                const priorSuccesses = (config.payout_results || []).filter(
                  (p: PayoutRecipient) => p.success,
                );
                const unpayableMarked: PayoutRecipient[] = unpayable.map(u => ({
                  ...u,
                  success: false,
                  error: 'No reward destination',
                }));
                const merged = [...priorSuccesses, ...payoutResults, ...unpayableMarked];

                setFinalizationResult(prev => (prev ? { ...prev, payoutResults: merged } : prev));

                try {
                  await callEdgeFunction('manage-competition', {
                    action: 'update',
                    competition_id: competition.id,
                    npub: (await AsyncStorage.getItem('@runstr:npub')) || '',
                    updates: { config: { ...config, payout_results: merged } },
                  });
                } catch (e) {
                  console.warn('[DynamicEventDetail] Failed to persist payout results:', e);
                }

                // Refresh in-memory competition state so a same-session re-run
                // reads the updated payout_results and skips already-paid winners.
                setCompetition(prev =>
                  prev ? { ...prev, config: { ...prev.config, payout_results: merged } } : prev,
                );

                const successCount = payoutResults.filter(p => p.success).length;
                const failCount = payoutResults.filter(p => !p.success).length;
                const totalPaid = payoutResults
                  .filter(p => p.success)
                  .reduce((s, p) => s + p.amount_sats, 0);
                let summary = `Paid ${totalPaid} sats to ${successCount} winner${successCount !== 1 ? 's' : ''}.`;
                if (failCount > 0) summary += ` ${failCount} payment${failCount !== 1 ? 's' : ''} failed — re-run to retry.`;
                Alert.alert('Done', summary);
              } finally {
                setIsPaying(false);
              }
            },
          },
        ],
      );
    } finally {
      setIsFinalizing(false);
    }
  };

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
  // Infer score_unit from scoring_method when not explicitly set
  // Existing events created before this fix may be missing score_unit
  const scoreUnit = config.score_unit
    || (competition.scoring_method === 'fastest_time' ? 'seconds'
      : competition.scoring_method === 'total_steps' ? 'steps' : 'km');
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

      <OstrichRefreshScrollView
        style={styles.scrollView}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      >
        {/* Banner Image */}
        {competition.image_url ? (
          <Image
            source={{ uri: competition.image_url }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={RUNSTR_LOGO}
            style={[styles.bannerImage, { backgroundColor: theme.colors.background }]}
            resizeMode="contain"
          />
        )}

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{competition.name}</Text>

          {/* Club attribution badge */}
          {clubName && (
            <View style={styles.clubBadge}>
              <Ionicons name="people" size={14} color={theme.colors.accent} />
              <Text style={styles.clubBadgeText}>{clubName} Event</Text>
            </View>
          )}

          <Text style={styles.statusText}>{getStatusText()}</Text>

          {/* Charity Event Info */}
          {isCharityEvent && charity && (
            <View style={styles.charityBanner}>
              {charity.image && (
                <Image source={charity.image} style={styles.charityBannerImage} />
              )}
              <View style={styles.charityBannerText}>
                <Text style={styles.charityBannerName}>{charity.name}</Text>
                <Text style={styles.charityBannerRaised}>
                  {totalRaised.toLocaleString()} sats raised
                </Text>
              </View>
            </View>
          )}

              {/* Prize Pool Info */}
              {competition?.config?.prize_pool_sats && (
                <View style={styles.prizePoolBanner}>
                  <Ionicons name="trophy-outline" size={20} color={theme.colors.primary} />
                  <View style={styles.prizePoolText}>
                    <Text style={styles.prizePoolAmount}>
                      {competition.config.prize_pool_sats.toLocaleString()} sats prize pool
                    </Text>
                    <Text style={styles.prizePoolDistribution}>
                      {competition.config.prize_distribution === 'all_participants'
                        ? 'Split among all participants'
                        : 'Top 3: 50% / 30% / 20%'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Payout Results (after finalization) */}
              {competition?.config?.payout_results && (
                <View style={styles.payoutResults}>
                  <Text style={styles.payoutResultsTitle}>Payout Results</Text>
                  {competition.config.payout_results.map((p: PayoutRecipient, i: number) => (
                    <View key={i} style={styles.payoutRow}>
                      <Text style={styles.payoutName} numberOfLines={1}>
                        {p.name || p.npub.slice(0, 12) + '...'}
                      </Text>
                      <Text style={[styles.payoutAmount, !p.success && styles.payoutFailed]}>
                        {p.success ? `${p.amount_sats} sats` : 'Failed'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

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

          {/* Ticketing Info */}
          {competition?.config?.ticket_pledge_days != null && competition.config.ticket_pledge_days > 0 && (
            <View style={[styles.infoRow, { backgroundColor: '#111111' }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Entry Fee</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {competition.config.ticket_pledge_days} workout day{competition.config.ticket_pledge_days > 1 ? 's' : ''} pledged to captain
              </Text>
            </View>
          )}
          {competition?.config?.winner_selection === 'random' && (
            <View style={[styles.infoRow, { backgroundColor: '#111111' }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Winner</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>Random draw from finishers</Text>
            </View>
          )}
          {competition?.config?.qualifying_distance_km != null && competition.config.qualifying_distance_km > 0 && (
            <View style={[styles.infoRow, { backgroundColor: '#111111' }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Qualifying</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {competition.config.qualifying_distance_km} km minimum
              </Text>
            </View>
          )}

          {/* Club membership gate banner (visible before Join button) */}
          {competition.club_id && isClubMember === false && !isParticipating && status !== 'ended' && (
            <View style={styles.clubGateBanner}>
              <Ionicons name="lock-closed" size={16} color={theme.colors.textMuted} />
              <Text style={styles.clubGateText}>
                Club members only - Join {clubName || 'the club'} to participate
              </Text>
            </View>
          )}

          {/* Join Button */}
          {currentUserPubkey && !isParticipating && status !== 'ended' && competition.is_open && (
            <TouchableOpacity
              style={[
                styles.joinButton,
                competition.club_id && isClubMember === false && styles.joinButtonDisabled,
              ]}
              onPress={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <>
                  <Ionicons
                    name={competition.club_id && isClubMember === false ? 'lock-closed' : getActivityIcon(activityTypes)}
                    size={20}
                    color={competition.club_id && isClubMember === false ? theme.colors.textMuted : theme.colors.text}
                  />
                  <Text style={[
                    styles.joinButtonText,
                    competition.club_id && isClubMember === false && styles.joinButtonTextDisabled,
                  ]}>
                    {competition.club_id && isClubMember === false ? 'Club Members Only' : 'Join Event'}
                  </Text>
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

          {/* Cancel Event (creator only) */}
          {isEventCreator && status !== 'ended' && (
            <TouchableOpacity
              style={styles.cancelEventButton}
              onPress={() => setShowCancelAlert(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.cancelEventText}>Cancel Event</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Leaderboard */}
        <View style={styles.leaderboardSection}>
          <View style={styles.leaderboardTitleRow}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            {activityTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}
            {scoreUnit === 'seconds' ? ' - Fastest time' : scoreUnit ? ` - by ${scoreUnit}` : ''}
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

        {/* Event Finalization (Creator Only, Event Ended) */}
        {isEventCreator && status === 'ended' && competition?.config?.winner_selection === 'random' && (
          <View style={[styles.finalizationSection, { backgroundColor: theme.colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 12 }]}>Event Finalization</Text>
            {!finalizationResult ? (
              <TouchableOpacity
                style={[styles.finalizeButton, { backgroundColor: theme.colors.accent }]}
                onPress={handleFinalize}
                disabled={isFinalizing}
              >
                {isFinalizing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.finalizeButtonText}>Draw Random Winner</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View>
                <Text style={[styles.finalizationSubtitle, { color: theme.colors.textMuted }]}>
                  {finalizationResult.finishers.length} finisher{finalizationResult.finishers.length !== 1 ? 's' : ''} qualified
                </Text>
                {finalizationResult.winner ? (
                  <Text style={[styles.winnerText, { color: theme.colors.accent }]}>
                    Winner: {finalizationResult.winner.name || finalizationResult.winner.npub.slice(0, 16) + '...'}
                  </Text>
                ) : (
                  <Text style={[styles.noFinishersText, { color: theme.colors.textMuted }]}>
                    No finishers met the qualifying distance.
                  </Text>
                )}
                {isPaying && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                    <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>Sending prizes...</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Pay Winners (Creator Only, Ended, has prize pool, non-random) */}
        {isEventCreator &&
          status === 'ended' &&
          (competition?.config?.prize_pool_sats || 0) > 0 &&
          competition?.config?.winner_selection !== 'random' && (
            <View style={[styles.finalizationSection, { backgroundColor: theme.colors.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 12 }]}>
                Pay Winners
              </Text>
              <Text style={[styles.finalizationSubtitle, { color: theme.colors.textMuted, marginBottom: 12 }]}>
                {(competition.config.prize_pool_sats || 0).toLocaleString()} sats ·{' '}
                {competition.config.prize_distribution === 'all_participants'
                  ? 'split among all finishers'
                  : 'Top 3 (50/30/20)'}
              </Text>
              <TouchableOpacity
                style={[styles.finalizeButton, { backgroundColor: theme.colors.accent }]}
                onPress={handlePayWinners}
                disabled={isFinalizing || isPaying}
              >
                {isFinalizing || isPaying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.finalizeButtonText}>Pay Winners</Text>
                )}
              </TouchableOpacity>
              {isPaying && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>Sending prizes…</Text>
                </View>
              )}
            </View>
          )}

        {/* Note Section */}
        <View style={styles.noteSection}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
          <Text style={styles.noteText}>
            Join the event and submit workouts to appear on the leaderboard.
          </Text>
        </View>
      </OstrichRefreshScrollView>

      {/* Club membership gate alert */}
      <CustomAlert
        visible={showClubGateAlert}
        title="Club Members Only"
        message={`This event is for ${clubName || 'club'} members. Join the club first to participate.`}
        buttons={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowClubGateAlert(false) },
          { text: 'Go to Club', onPress: () => {
            setShowClubGateAlert(false);
            if (competition?.club_id) {
              navigation.navigate('ClubPage', { clubId: competition.club_id, clubName: clubName || 'Club' });
            }
          }},
        ]}
        onClose={() => setShowClubGateAlert(false)}
      />

      {/* Cancel event confirmation (creator only) */}
      <CustomAlert
        visible={showCancelAlert}
        title="Cancel Event"
        message={`Are you sure you want to cancel "${competition?.name}"? This will remove the event and all participants.`}
        buttons={[
          { text: 'Keep', style: 'cancel', onPress: () => setShowCancelAlert(false) },
          { text: 'Cancel Event', style: 'destructive', onPress: async () => {
            setShowCancelAlert(false);
            const npub = await AsyncStorage.getItem('@runstr:npub');
            if (!npub) return;
            const result = await SupabaseCompetitionService.deleteCompetition(eventId, npub);
            if (result.success) {
              navigation.goBack();
            }
          }},
        ]}
        onClose={() => setShowCancelAlert(false)}
      />
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
  clubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  clubBadgeText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
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
    backgroundColor: '#111111',
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
    color: theme.colors.accent,
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
  joinButtonDisabled: {
    borderColor: theme.colors.border,
    opacity: 0.7,
  },
  joinButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  clubGateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  clubGateText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
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
    backgroundColor: '#111111',
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
    color: theme.colors.accent,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  cancelEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 8,
  },
  cancelEventText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  finalizationSection: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  finalizeButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  finalizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  finalizationSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  winnerText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  payButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  noFinishersText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  charityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, marginHorizontal: 0, marginTop: 0, marginBottom: 12,
    backgroundColor: theme.colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  charityBannerImage: {
    width: 48, height: 48, borderRadius: 24,
  },
  charityBannerText: {
    flex: 1,
  },
  charityBannerName: {
    fontSize: 16, fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  charityBannerRaised: {
    fontSize: 14, color: theme.colors.primary, marginTop: 2,
    fontWeight: theme.typography.weights.semiBold,
  },
  prizePoolBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, marginHorizontal: 16, marginTop: 8,
    backgroundColor: theme.colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  prizePoolText: {
    flex: 1,
  },
  prizePoolAmount: {
    fontSize: 15, fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  prizePoolDistribution: {
    fontSize: 13, color: theme.colors.textMuted, marginTop: 2,
  },
  payoutResults: {
    paddingHorizontal: 16, marginTop: 12,
  },
  payoutResultsTitle: {
    fontSize: 13, fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: 8,
  },
  payoutRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  payoutName: {
    fontSize: 14, color: theme.colors.text, flex: 1,
  },
  payoutAmount: {
    fontSize: 14, fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.primary,
  },
  payoutFailed: {
    color: theme.colors.error,
  },
});

export default DynamicEventDetailScreen;
