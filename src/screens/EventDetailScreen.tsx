/**
 * EventDetailScreen - Simplified event detail view
 * Uses SimpleCompetitionService and SimpleLeaderboardService
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { SimpleLeagueDisplay } from '../components/team/SimpleLeagueDisplay';
import { EventPaymentModal } from '../components/event/EventPaymentModal';
import { CustomAlert } from '../components/ui/CustomAlert';
import { TeamGoalProgressCard } from '../components/team/TeamGoalProgressCard';
import type { RootStackParamList } from '../types';

type EventDetailRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;
type EventDetailNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EventDetail'
>;

interface EventDetailScreenProps {
  route: EventDetailRouteProp;
  navigation: EventDetailNavigationProp;
}

/**
 * Normalize eventId from route params to handle malformed d-tag formats
 * Fixes bug where participant list IDs are passed instead of event IDs
 *
 * @example
 * normalizeEventId('event-event_sunday10k-participants') → 'event_sunday10k'
 * normalizeEventId('sunday10k') → 'sunday10k'
 */
const normalizeEventId = (input: string): string => {
  if (input.startsWith('event-') && input.endsWith('-participants')) {
    // Extract ID from malformed d-tag: event-{ID}-participants → {ID}
    return input.replace(/^event-/, '').replace(/-participants$/, '');
  }
  return input;
};

export const EventDetailScreen: React.FC<EventDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const {
    eventId: rawEventId,
    eventData: passedEventData,
    teamId: contextTeamId, // ✅ NEW: Team context from navigation
    captainPubkey: contextCaptainPubkey, // ✅ NEW: Captain context from navigation
  } = route.params;

  // ✅ FIX: Memoize eventId normalization to prevent infinite useEffect loop
  const eventId = useMemo(() => {
    const normalized = normalizeEventId(rawEventId);

    // DEBUG: Log normalization if ID was malformed
    if (rawEventId !== normalized) {
      console.log('🔧 EventDetailScreen: Normalized malformed eventId');
      console.log(`  - Raw: ${rawEventId}`);
      console.log(`  - Normalized: ${normalized}`);
    }

    return normalized;
  }, [rawEventId]);

  const [eventData, setEventData] = useState<any>(passedEventData || null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isCaptain, setIsCaptain] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(!passedEventData);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState('');
  const [participationType, setParticipationType] = useState<
    'in-person' | 'virtual'
  >('virtual'); // ✅ NEW: Default to virtual (safer assumption)
  const [teamGoalProgress, setTeamGoalProgress] = useState<{
    current: number;
    goal: number;
    percentage: number;
    formattedCurrent: string;
    formattedGoal: string;
    unit: string;
  } | null>(null);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message?: string;
    buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>;
  }>({
    title: '',
    message: '',
    buttons: [],
  });

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    setError(null);

    try {
      console.log('🔍 Loading event:', eventId);

      // PHASE 1: Event data - Cache-first pattern
      let event = passedEventData;
      let usedSnapshot = false;

      if (!event) {
        // ✅ CRITICAL: Check local snapshot FIRST (instant display)
        const { EventSnapshotStore } = await import(
          '../services/event/EventSnapshotStore'
        );
        const snapshot = await EventSnapshotStore.getSnapshot(eventId);

        if (snapshot && !EventSnapshotStore.isExpired(snapshot)) {
          console.log(
            '⚡ Using cached snapshot (instant load) -',
            snapshot.eventData.name
          );
          event = snapshot.eventData;
          setEventData(event);
          setParticipants(snapshot.participants);
          setLeaderboard(snapshot.leaderboard);
          setIsParticipant(snapshot.userIsParticipant);
          setLoadingMembers(false);
          setLoadingLeaderboard(false);
          setIsLoading(false);
          usedSnapshot = true;

          // For active/upcoming events, refresh in background
          // Also refresh completed events if they have stale/empty participant data
          if (snapshot.eventStatus !== 'completed' || snapshot.participantCount === 0) {
            console.log(
              '🔄 Scheduling background refresh for active/upcoming event or stale completed event'
            );
            loadFreshDataInBackground(eventId, event);
          }

          return; // Exit early - display cached data
        }

        // No cache or expired - fetch from Nostr
        setIsLoading(true);
        console.log('⏳ Fetching event from Nostr (no cache)...');
        const SimpleCompetitionService = (
          await import('../services/competition/SimpleCompetitionService')
        ).default;
        // ✅ FIX: Use fallback method to handle both d-tag and Nostr event ID
        event = await SimpleCompetitionService.getInstance().getEventByIdOrDTag(
          eventId
        );

        // ✅ FIX: If Nostr fetch failed but we have eventData prop, use it
        if (!event && eventData) {
          console.warn(
            '⚠️ Nostr fetch failed, using passed event data as fallback'
          );
          event = {
            ...eventData,
            teamId: eventData.teamId || initialTeamId,
            captainPubkey: eventData.captainPubkey || currentUser?.pubkey || '',
          };
        }

        setIsLoading(false);
      } else {
        console.log('✅ Using passed event data (instant load)');
      }

      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }

      console.log('✅ Event loaded:', event.name);

      // ✅ FIX: Enrich event with team context if missing
      if ((!event.teamId || event.teamId === '') && contextTeamId) {
        console.log(`⚡ Enriching event with contextTeamId: ${contextTeamId}`);
        event.teamId = contextTeamId;
      }
      if (
        (!event.captainPubkey || event.captainPubkey.trim() === '') &&
        contextCaptainPubkey
      ) {
        console.log(
          `⚡ Enriching event with contextCaptainPubkey: ${contextCaptainPubkey?.slice(
            0,
            20
          )}...`
        );
        event.captainPubkey = contextCaptainPubkey;
      }

      setEventData(event);

      // ✅ FIX: Use event.pubkey (Nostr event author) as captain fallback
      // Every Nostr event has event.pubkey - that's the event creator (captain)
      if (!event.captainPubkey || event.captainPubkey.trim() === '') {
        const fallbackCaptain = event.pubkey || contextCaptainPubkey;
        if (fallbackCaptain) {
          console.log(
            `⚡ Using fallback captain: ${fallbackCaptain.slice(
              0,
              20
            )}... (from event.pubkey)`
          );
          event.captainPubkey = fallbackCaptain;
        } else {
          console.warn(
            `⚠️ Event ${eventId} has no captain info - participants may not load`
          );
          console.warn('Event data:', JSON.stringify(event, null, 2));
          // Don't crash - continue with limited view
        }
      }

      // PHASE 2: Event participants - SIMPLIFIED (captain + local storage only)
      setLoadingMembers(true);
      console.log('⏳ Building participant list (captain + local)...');

      // ✅ SIMPLIFIED FIX: No Nostr queries - just captain + local storage
      let eventParticipants: string[] = [];

      // Always include captain first
      if (event.captainPubkey && event.captainPubkey.trim() !== '') {
        eventParticipants.push(event.captainPubkey);
        console.log(
          `✅ Added captain to participants: ${event.captainPubkey.slice(
            0,
            20
          )}...`
        );
      } else {
        console.warn(
          '⚠️ No captain information available - leaderboard may be empty'
        );
      }

      // Check if current user joined locally and add them
      const userHexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (userHexPubkey) {
        const { EventParticipationStore } = await import(
          '../services/event/EventParticipationStore'
        );
        const userJoinedLocally =
          await EventParticipationStore.hasUserJoinedLocally(eventId);

        if (userJoinedLocally && !eventParticipants.includes(userHexPubkey)) {
          eventParticipants.push(userHexPubkey);
          console.log(
            '✅ Added local participant:',
            userHexPubkey.slice(0, 20)
          );
        }
      }

      // Step 3: Add captain-approved participants from kind 30000 list
      if (event.captainPubkey && event.id) {
        try {
          console.log(
            '⏳ Fetching approved participants from kind 30000 list...'
          );
          const { NostrListService } = await import(
            '../services/nostr/NostrListService'
          );
          const listService = NostrListService.getInstance();

          const approvedParticipants = await listService.getListMembers(
            event.captainPubkey,
            `event-${event.id}-participants`
          );

          console.log(
            `📋 Found ${approvedParticipants.length} approved participants in kind 30000 list`
          );

          // Merge approved participants with existing array (deduplication)
          for (const pubkey of approvedParticipants) {
            if (!eventParticipants.includes(pubkey)) {
              eventParticipants.push(pubkey);
            }
          }

          console.log(
            `✅ Total participants after merge: ${eventParticipants.length}`
          );
        } catch (error) {
          console.warn(
            '⚠️ Failed to fetch approved participants (non-blocking):',
            error
          );
          console.warn('   Continuing with captain + local participants only');
        }
      }

      setParticipants(eventParticipants);
      setLoadingMembers(false);
      console.log(
        `✅ Participant list built instantly: ${eventParticipants.length} participants`
      );

      // Set user participation status
      if (userHexPubkey) {
        const isUserParticipant = eventParticipants.includes(userHexPubkey);
        setIsParticipant(isUserParticipant);

        const isUserCaptain = event.captainPubkey === userHexPubkey;
        setIsCaptain(isUserCaptain);

        console.log(
          `User is${
            isUserCaptain
              ? ' the captain'
              : isUserParticipant
              ? ' a participant'
              : ' not participating'
          }`
        );
      }

      // PHASE 3: Leaderboard calculation (heaviest operation, show skeleton)
      // ✅ FIX: Guard against duplicate calculations if component re-renders
      if (loadingLeaderboard) {
        console.warn(
          '⚠️ Leaderboard already calculating - skipping duplicate request'
        );
        return;
      }

      setLoadingLeaderboard(true);
      console.log('⏳ Calculating leaderboard...');

      // ✅ SIMPLIFIED: eventParticipants already contains captain + local user
      const participantsForLeaderboard = eventParticipants;
      console.log(
        `📊 Leaderboard will query for ${participantsForLeaderboard.length} participants (captain + local)`
      );

      // ✅ FIX: Show empty state if no participants (don't get stuck loading)
      if (participantsForLeaderboard.length === 0) {
        console.warn(
          '⚠️ No participants to display - showing empty leaderboard'
        );
        setLeaderboard([]);
        setTeamGoalProgress(null);
        setLoadingLeaderboard(false);
        return;
      }

      // Wrap leaderboard calculation in try-catch to ensure loading state clears
      try {
        const SimpleLeaderboardService = (
          await import('../services/competition/SimpleLeaderboardService')
        ).default;
        const rankings =
          await SimpleLeaderboardService.calculateEventLeaderboard(
            event,
            participantsForLeaderboard
          );

        setLeaderboard(rankings);
        console.log(`✅ Leaderboard calculated: ${rankings.length} entries`);

        // Calculate team goal progress if event has team-total scoring mode
        if (event.scoringMode === 'team-total' && event.teamGoal) {
          console.log('🎯 Calculating team goal progress...');
          const progress =
            await SimpleLeaderboardService.calculateTeamGoalProgress(
              event,
              participantsForLeaderboard
            );
          setTeamGoalProgress(progress);
          console.log(
            `✅ Team goal progress: ${progress.percentage.toFixed(1)}%`
          );
        } else {
          setTeamGoalProgress(null);
        }

        // ✅ Clear loading state on success
        setLoadingLeaderboard(false);
      } catch (leaderboardError) {
        console.error('❌ Leaderboard calculation failed:', leaderboardError);
        // Show empty leaderboard on error instead of infinite loading
        setLeaderboard([]);
        setTeamGoalProgress(null);
        // ✅ Clear loading state on error
        setLoadingLeaderboard(false);
      }

      // ✅ CRITICAL: Save snapshot for instant future access
      if (!usedSnapshot && event) {
        try {
          const { EventSnapshotStore } = await import(
            '../services/event/EventSnapshotStore'
          );
          await EventSnapshotStore.saveSnapshot({
            eventId,
            eventData: event,
            participants,
            leaderboard: rankings,
            userIsParticipant: isParticipant,
          });
          console.log('💾 Event snapshot saved for instant future display');
        } catch (snapshotError) {
          console.warn(
            '⚠️ Failed to save snapshot (non-critical):',
            snapshotError
          );
          // Don't throw - snapshot is optional optimization
        }
      }
    } catch (err) {
      console.error('❌ Failed to load event:', err);

      // ✅ FIX: Provide specific error messages based on error type
      let errorMessage = 'Failed to load event';
      if (err instanceof Error) {
        if (err.message.includes('not found')) {
          errorMessage =
            `Event Not Found\n\n` +
            `This event may have been:\n` +
            `• Deleted by the captain\n` +
            `• Moved to different relays\n` +
            `• Created with an invalid ID\n\n` +
            `Event ID: ${eventId}`;
        } else if (
          err.message.includes('timeout') ||
          err.message.includes('timed out')
        ) {
          errorMessage =
            `Connection Timeout\n\n` +
            `Unable to reach Nostr relays.\n\n` +
            `Please check your connection and try again.`;
        } else if (err.message.includes('No connected relays')) {
          errorMessage =
            `No Relay Connection\n\n` +
            `Cannot connect to Nostr network.\n\n` +
            `Please check your internet connection.`;
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      }

      setError(errorMessage);
      setIsLoading(false);
      setLoadingMembers(false);
      setLoadingLeaderboard(false);
    }
  };

  const loadFreshDataInBackground = async (
    eventId: string,
    cachedEvent: any
  ) => {
    // Non-blocking background refresh for active/upcoming events
    try {
      console.log('🔄 Background refresh started for event:', eventId);

      const SimpleCompetitionService = (
        await import('../services/competition/SimpleCompetitionService')
      ).default;
      const NostrListService = (
        await import('../services/nostr/NostrListService')
      ).NostrListService.getInstance();
      const SimpleLeaderboardService = (
        await import('../services/competition/SimpleLeaderboardService')
      ).default;

      // Fetch fresh data
      const freshEvent =
        await SimpleCompetitionService.getInstance().getEventByIdOrDTag(
          eventId
        );
      if (!freshEvent) {
        console.warn('⚠️ Background refresh: Event not found');
        return;
      }

      const freshParticipants = await NostrListService.getListMembers(
        freshEvent.captainPubkey,
        `event-${freshEvent.id}-participants` // Use freshEvent.id (d-tag) not route param
      );

      const freshLeaderboard =
        await SimpleLeaderboardService.calculateEventLeaderboard(
          freshEvent,
          freshParticipants
        );

      // Calculate team goal progress for background refresh
      let freshTeamGoalProgress = null;
      if (freshEvent.scoringMode === 'team-total' && freshEvent.teamGoal) {
        freshTeamGoalProgress =
          await SimpleLeaderboardService.calculateTeamGoalProgress(
            freshEvent,
            freshParticipants
          );
      }

      // Update UI with fresh data (only if still on this screen)
      setEventData(freshEvent);
      setParticipants(freshParticipants);
      setLeaderboard(freshLeaderboard);
      setTeamGoalProgress(freshTeamGoalProgress);

      // Check user participation
      const userHexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (userHexPubkey) {
        const isUserParticipant = freshParticipants.includes(userHexPubkey);
        setIsParticipant(isUserParticipant);
      }

      // Save updated snapshot
      const { EventSnapshotStore } = await import(
        '../services/event/EventSnapshotStore'
      );
      await EventSnapshotStore.saveSnapshot({
        eventId,
        eventData: freshEvent,
        participants: freshParticipants,
        leaderboard: freshLeaderboard,
        userIsParticipant: isParticipant,
      });

      console.log('✅ Background refresh complete and snapshot updated');
    } catch (error) {
      console.warn(
        '⚠️ Background refresh failed (showing cached data):',
        error
      );
      // Don't show error to user - cached data is still displayed
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleJoinEvent = async () => {
    if (!eventData) return;

    setIsJoining(true);
    try {
      // Get user pubkey
      const userHexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userHexPubkey) {
        setAlertConfig({
          title: 'Error',
          message: 'User not authenticated',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setAlertVisible(true);
        return;
      }

      // Create QREventData format for EventJoinService
      const qrEventData = {
        type: eventData.entryFeesSats > 0 ? 'paid_event' : 'free_event',
        event_id: eventData.id,
        team_id: eventData.teamId,
        event_name: eventData.name,
        event_date: eventData.eventDate,
        activity_type: eventData.activityType,
        entry_fee: eventData.entryFeesSats || 0,
        captain_pubkey: eventData.captainPubkey,
        description: eventData.description,
        created_at: Math.floor(Date.now() / 1000),
      };

      // Check if this is a paid event with Lightning address
      if (eventData.entryFeesSats > 0 && eventData.lightningAddress) {
        console.log(
          '💳 Paid event with Lightning address - generating invoice...'
        );

        // Generate Lightning invoice via LNURL
        const invoiceResult = await eventJoinService.getEventEntryInvoice(
          qrEventData,
          eventData.lightningAddress
        );

        if (!invoiceResult.success || !invoiceResult.invoice) {
          throw new Error(invoiceResult.error || 'Failed to generate invoice');
        }

        // Show payment modal with invoice
        setPaymentInvoice(invoiceResult.invoice);
        setShowPaymentModal(true);

        console.log('✅ Invoice generated - showing payment modal');
        return; // Exit early - payment confirmation will handle the rest
      }

      // Free event or paid event without Lightning address (fallback to NWC)
      const result = await eventJoinService.joinFreeEvent(
        qrEventData,
        participationType
      );

      if (result.success) {
        // Store participation locally for instant UX
        const { EventParticipationStore } = await import(
          '../services/event/EventParticipationStore'
        );
        await EventParticipationStore.addParticipation({
          eventId: eventData.id,
          eventData: eventData, // ✅ Store complete event object
          entryFeePaid: eventData.entryFeesSats || 0,
          paymentMethod: 'lightning',
          paidAt: Date.now(),
          status: 'pending_approval',
          localOnly: true,
        });

        // Update UI
        setIsParticipant(true);

        // Invalidate snapshot - participants changed
        const { EventSnapshotStore } = await import(
          '../services/event/EventSnapshotStore'
        );
        await EventSnapshotStore.deleteSnapshot(eventData.id);
        console.log('🗑️ Cache invalidated - participants changed');

        console.log('✅ Joined event:', eventData.name);
      }
    } catch (error) {
      console.error('❌ Failed to join event:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to join event. Please try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    } finally {
      setIsJoining(false);
    }
  };

  const handlePaymentConfirmed = async () => {
    if (!eventData || !paymentInvoice) return;

    setIsJoining(true);
    try {
      console.log('✅ User confirmed payment - submitting join request...');

      // Create QREventData format
      const qrEventData = {
        type: 'paid_event' as const,
        event_id: eventData.id,
        team_id: eventData.teamId,
        event_name: eventData.name,
        event_date: eventData.eventDate,
        activity_type: eventData.activityType,
        entry_fee: eventData.entryFeesSats || 0,
        captain_pubkey: eventData.captainPubkey,
        description: eventData.description,
        created_at: Math.floor(Date.now() / 1000),
      };

      // Submit join request with payment proof
      const result = await eventJoinService.submitPaidJoinRequest(
        qrEventData,
        paymentInvoice,
        participationType
      );

      if (result.success) {
        // Store participation locally for instant UX
        const { EventParticipationStore } = await import(
          '../services/event/EventParticipationStore'
        );
        await EventParticipationStore.addParticipation({
          eventId: eventData.id,
          eventData: eventData, // ✅ Store complete event object
          entryFeePaid: eventData.entryFeesSats || 0,
          paymentMethod: 'lightning',
          paidAt: Date.now(),
          status: 'pending_approval',
          localOnly: true,
        });

        // Update UI
        setIsParticipant(true);
        setShowPaymentModal(false);

        // Invalidate snapshot - participants changed
        const { EventSnapshotStore } = await import(
          '../services/event/EventSnapshotStore'
        );
        await EventSnapshotStore.deleteSnapshot(eventData.id);
        console.log('🗑️ Cache invalidated - participants changed');

        console.log('✅ Paid join request submitted successfully');
      }
    } catch (error) {
      console.error('❌ Failed to submit join request:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to submit join request. Please try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    } finally {
      setIsJoining(false);
    }
  };

  const getEventStatus = () => {
    if (!eventData?.eventDate) return 'unknown';

    const eventDate = new Date(eventData.eventDate);
    const now = new Date();

    // Reset time portions for comparison
    eventDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    if (eventDate > now) return 'upcoming';
    if (eventDate < now) return 'past';
    return 'active';
  };

  const formatEventDate = () => {
    if (!eventData?.eventDate) return 'Unknown date';

    const eventDate = new Date(eventData.eventDate);
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !eventData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={theme.colors.textMuted}
          />
          <Text style={styles.errorText}>
            {error || 'Event not found'}
            {'\n\n'}
            This event may have been deleted or is no longer available on Nostr
            relays.
          </Text>
          <TouchableOpacity onPress={loadEventData} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backToListButton}
          >
            <Text style={styles.backToListButtonText}>Back to Events</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = getEventStatus();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Info Card */}
        <View style={styles.eventCard}>
          <Text style={styles.eventName}>{eventData.name}</Text>

          {/* Status Badge */}
          <View style={styles.statusBadgeContainer}>
            <View
              style={[
                styles.statusBadge,
                status === 'active' && styles.statusBadgeActive,
                status === 'past' && styles.statusBadgePast,
                status === 'upcoming' && styles.statusBadgeUpcoming,
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {status === 'active' && 'Active'}
                {status === 'past' && '✓ Completed'}
                {status === 'upcoming' && '⏰ Upcoming'}
              </Text>
            </View>
          </View>

          <View style={styles.eventInfoRow}>
            <Text style={styles.eventLabel}>Date</Text>
            <Text style={styles.eventValue}>{formatEventDate()}</Text>
          </View>

          {eventData.description && (
            <View style={styles.eventInfoRow}>
              <Text style={styles.eventLabel}>Description</Text>
              <Text style={styles.eventValue}>{eventData.description}</Text>
            </View>
          )}

          {eventData.location && (
            <View style={styles.eventInfoRow}>
              <View style={styles.locationHeader}>
                <Ionicons
                  name="location"
                  size={16}
                  color={theme.colors.accent}
                />
                <Text style={styles.eventLabel}>Location</Text>
              </View>
              <Text style={styles.eventValue}>{eventData.location}</Text>
            </View>
          )}

          <View style={styles.eventInfoRow}>
            <Text style={styles.eventLabel}>Activity</Text>
            <Text style={styles.eventValue}>
              {eventData.activityType || 'Any'}
            </Text>
          </View>

          <View style={styles.eventInfoRow}>
            <Text style={styles.eventLabel}>Scoring</Text>
            <Text style={styles.eventValue}>
              {/* ✅ FIX: Use scoringType instead of metric */}
              {eventData.scoringType === 'completion' && 'Completion'}
              {eventData.scoringType === 'fastest_time' && 'Fastest Time'}
              {!eventData.scoringType &&
                (eventData.metric
                  ?.replace(/_/g, ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase()) ||
                  'Total Distance')}
            </Text>
          </View>

          {eventData.entryFeesSats > 0 && (
            <View style={styles.eventInfoRow}>
              <Text style={styles.eventLabel}>Entry Fee</Text>
              <View style={styles.entryFeeValue}>
                <Ionicons
                  name="flash"
                  size={16}
                  color={theme.colors.orangeBright}
                />
                <Text style={[styles.eventValue, { marginLeft: 4 }]}>
                  {eventData.entryFeesSats} sats
                </Text>
              </View>
            </View>
          )}

          {eventData.paymentDestination === 'charity' &&
            eventData.paymentRecipientName && (
              <View style={styles.charityCard}>
                <Ionicons name="heart" size={20} color={theme.colors.accent} />
                <Text style={styles.charityText}>
                  100% of entry fees support {eventData.paymentRecipientName}
                </Text>
              </View>
            )}

          {eventData.targetDistance && (
            <View style={styles.eventInfoRow}>
              <Text style={styles.eventLabel}>Target</Text>
              <Text style={styles.eventValue}>
                {eventData.targetDistance} {eventData.targetUnit || 'km'}
              </Text>
            </View>
          )}
        </View>

        {/* Team Goal Progress Card (for team-total scoring mode) */}
        {teamGoalProgress && (
          <TeamGoalProgressCard
            current={teamGoalProgress.current}
            goal={teamGoalProgress.goal}
            percentage={teamGoalProgress.percentage}
            formattedCurrent={teamGoalProgress.formattedCurrent}
            formattedGoal={teamGoalProgress.formattedGoal}
            unit={teamGoalProgress.unit}
          />
        )}

        {/* Participants Section */}
        <View style={styles.participantsCard}>
          <View style={styles.participantsHeader}>
            <Ionicons name="people" size={20} color={theme.colors.text} />
            <Text style={styles.participantsTitle}>Participants</Text>
          </View>
          {loadingMembers ? (
            <View style={styles.loadingParticipants}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.loadingParticipantsText}>
                Loading participants...
              </Text>
            </View>
          ) : (
            <Text style={styles.participantsCount}>
              {participants.length}{' '}
              {participants.length === 1 ? 'person' : 'people'} joined
            </Text>
          )}
        </View>

        {/* Participation Type Selector */}
        {!isParticipant && (
          <View style={styles.participationTypeContainer}>
            {eventData.location && (
              <View style={styles.locationRow}>
                <Ionicons
                  name="location"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.locationText}>{eventData.location}</Text>
              </View>
            )}
            <Text style={styles.participationTypeLabel}>
              Participation Type:
            </Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setParticipationType('in-person')}
                activeOpacity={0.7}
              >
                <View style={styles.radioCircle}>
                  {participationType === 'in-person' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>In-Person</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setParticipationType('virtual')}
                activeOpacity={0.7}
              >
                <View style={styles.radioCircle}>
                  {participationType === 'virtual' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>Virtual</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Join Button */}
        {!isParticipant && (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleJoinEvent}
            disabled={isJoining}
            activeOpacity={0.8}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <>
                <Ionicons
                  name={eventData.entryFeesSats > 0 ? 'flash' : 'add-circle'}
                  size={20}
                  color={theme.colors.background}
                />
                <Text style={styles.joinButtonText}>
                  {eventData.entryFeesSats > 0
                    ? `Pay ${eventData.entryFeesSats} sats to Join`
                    : 'Join Event'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Participant Badge */}
        {isParticipant && (
          <View style={styles.participantBadge}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.success}
            />
            <Text style={styles.participantBadgeText}>
              You're participating!
            </Text>
          </View>
        )}

        {/* Leaderboard */}
        <View style={styles.leaderboardContainer}>
          {loadingLeaderboard ? (
            <View style={styles.leaderboardLoading}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={styles.leaderboardLoadingText}>
                Calculating leaderboard...
              </Text>
            </View>
          ) : (
            <SimpleLeagueDisplay
              leagueName="Event Leaderboard"
              leaderboard={leaderboard}
              loading={false}
              onRefresh={loadEventData}
            />
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Payment Modal */}
      <EventPaymentModal
        visible={showPaymentModal}
        eventName={eventData?.name || ''}
        amountSats={eventData?.entryFeesSats || 0}
        invoice={paymentInvoice}
        paymentDestination={eventData?.paymentDestination}
        paymentRecipientName={eventData?.paymentRecipientName}
        participationType={participationType}
        onPaid={handlePaymentConfirmed}
        onCancel={() => {
          setShowPaymentModal(false);
          setIsJoining(false);
        }}
      />

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  eventName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
  },
  statusBadgeContainer: {
    marginBottom: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: '#111111',
    borderColor: '#FF9D42',
  },
  statusBadgePast: {
    backgroundColor: theme.colors.textMuted + '20',
    borderColor: theme.colors.textMuted,
  },
  statusBadgeUpcoming: {
    backgroundColor: '#111111',
    borderColor: theme.colors.text,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  eventInfoRow: {
    marginBottom: 12,
  },
  eventLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  eventValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  entryFeeValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  charityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#111111',
  },
  charityText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    flex: 1,
  },
  participantsCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  participantsCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  loadingParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  loadingParticipantsText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  joinButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  participantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.success,
    gap: 8,
  },
  participantBadgeText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '500',
  },
  leaderboardContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  leaderboardLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 16,
  },
  leaderboardLoadingText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
  },
  backToListButton: {
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backToListButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  // ✅ NEW: Participation type selector styles
  participationTypeContainer: {
    backgroundColor: theme.colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  participationTypeLabel: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.text,
  },
  radioLabel: {
    fontSize: 15,
    color: theme.colors.text,
  },
});
