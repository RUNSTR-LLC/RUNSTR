/**
 * EventDetailScreen - Simplified event detail view
 * Uses SimpleCompetitionService and SimpleLeaderboardService
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { SimpleLeagueDisplay } from '../components/team/SimpleLeagueDisplay';
import type { RootStackParamList } from '../types';

type EventDetailRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;
type EventDetailNavigationProp = StackNavigationProp<RootStackParamList, 'EventDetail'>;

interface EventDetailScreenProps {
  route: EventDetailRouteProp;
  navigation: EventDetailNavigationProp;
}

export const EventDetailScreen: React.FC<EventDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { eventId, eventData: passedEventData } = route.params;

  const [eventData, setEventData] = useState<any>(passedEventData || null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isCaptain, setIsCaptain] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(!passedEventData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading event:', eventId);

      // Use passed event data or fetch from Nostr
      let event = passedEventData;

      if (!event) {
        const SimpleCompetitionService = (await import('../services/competition/SimpleCompetitionService')).default;
        event = await SimpleCompetitionService.getInstance().getEventById(eventId);
      }

      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }

      console.log('✅ Event loaded:', event.name);
      setEventData(event);

      // Get team members
      const TeamMemberCache = (await import('../services/team/TeamMemberCache')).TeamMemberCache.getInstance();
      const members = await TeamMemberCache.getTeamMembers(
        event.teamId,
        event.captainPubkey
      );

      console.log(`Found ${members.length} team members`);

      // Set participants
      setParticipants(members);

      // Check if current user is a participant and/or captain
      const userHexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (userHexPubkey) {
        const isUserParticipant = members.includes(userHexPubkey);
        setIsParticipant(isUserParticipant);
        console.log(`User is${isUserParticipant ? '' : ' not'} a participant`);

        // Check if user is the captain
        const isUserCaptain = event.captainPubkey === userHexPubkey;
        setIsCaptain(isUserCaptain);
        console.log(`User is${isUserCaptain ? '' : ' not'} the captain`);
      }

      // Calculate leaderboard
      const SimpleLeaderboardService = (await import('../services/competition/SimpleLeaderboardService')).default;
      const rankings = await SimpleLeaderboardService.calculateEventLeaderboard(
        event,
        members
      );

      setLeaderboard(rankings);
      console.log(`✅ Leaderboard calculated: ${rankings.length} entries`);

    } catch (err) {
      console.error('❌ Failed to load event:', err);
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setIsLoading(false);
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
      const userNpub = await AsyncStorage.getItem('@runstr:npub');

      if (!userHexPubkey || !userNpub) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // 1. Store join locally for instant UX
      const localJoinsKey = `@runstr:event_joins:${eventId}`;
      await AsyncStorage.setItem(localJoinsKey, JSON.stringify({
        eventId,
        userId: userHexPubkey,
        joinedAt: Date.now(),
      }));

      // 2. Create Nostr join request (kind 1105)
      const EventJoinRequestService = (await import('../services/events/EventJoinRequestService')).default;
      await EventJoinRequestService.getInstance().createJoinRequest(
        eventId,
        eventData.teamId,
        userNpub,
        `Request to join ${eventData.name}`
      );

      // 3. Update UI
      setIsParticipant(true);
      Alert.alert('Success', 'Join request sent! The captain will review your request.');

      console.log('✅ Join request created for event:', eventId);
    } catch (error) {
      console.error('❌ Failed to join event:', error);
      Alert.alert('Error', 'Failed to send join request. Please try again.');
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
      year: 'numeric'
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
          <Text style={styles.errorText}>{error || 'Event not found'}</Text>
          <TouchableOpacity onPress={loadEventData} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
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

          {/* Captain Dashboard Button */}
          {isCaptain && (
            <TouchableOpacity
              style={styles.captainDashboardButton}
              onPress={() => navigation.navigate('EventCaptainDashboard', {
                eventId,
                eventData,
              })}
              activeOpacity={0.8}
            >
              <Ionicons name="shield" size={18} color={theme.colors.background} />
              <Text style={styles.captainDashboardButtonText}>Captain Dashboard</Text>
            </TouchableOpacity>
          )}

          {/* Status Badge */}
          <View style={styles.statusBadgeContainer}>
            <View style={[
              styles.statusBadge,
              status === 'active' && styles.statusBadgeActive,
              status === 'past' && styles.statusBadgePast,
              status === 'upcoming' && styles.statusBadgeUpcoming,
            ]}>
              <Text style={styles.statusBadgeText}>
                {status === 'active' && '🔴 Active'}
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

          <View style={styles.eventInfoRow}>
            <Text style={styles.eventLabel}>Activity</Text>
            <Text style={styles.eventValue}>
              {eventData.activityType || 'Any'}
            </Text>
          </View>

          <View style={styles.eventInfoRow}>
            <Text style={styles.eventLabel}>Scoring</Text>
            <Text style={styles.eventValue}>
              {eventData.metric?.replace('_', ' ') || 'Total distance'}
            </Text>
          </View>

          {eventData.targetDistance && (
            <View style={styles.eventInfoRow}>
              <Text style={styles.eventLabel}>Target</Text>
              <Text style={styles.eventValue}>
                {eventData.targetDistance} {eventData.targetUnit || 'km'}
              </Text>
            </View>
          )}
        </View>

        {/* Participants Section */}
        <View style={styles.participantsCard}>
          <View style={styles.participantsHeader}>
            <Ionicons name="people" size={20} color={theme.colors.text} />
            <Text style={styles.participantsTitle}>Participants</Text>
          </View>
          <Text style={styles.participantsCount}>
            {participants.length} {participants.length === 1 ? 'person' : 'people'} joined
          </Text>
        </View>

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
                <Ionicons name="add-circle" size={20} color={theme.colors.background} />
                <Text style={styles.joinButtonText}>Join Event</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Participant Badge */}
        {isParticipant && (
          <View style={styles.participantBadge}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            <Text style={styles.participantBadgeText}>You're participating!</Text>
          </View>
        )}

        {/* Leaderboard */}
        <View style={styles.leaderboardContainer}>
          <SimpleLeagueDisplay
            leagueName="Event Leaderboard"
            leaderboard={leaderboard}
            loading={isLoading}
            onRefresh={loadEventData}
          />
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
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
    backgroundColor: theme.colors.error + '20',
    borderColor: theme.colors.error,
  },
  statusBadgePast: {
    backgroundColor: theme.colors.textMuted + '20',
    borderColor: theme.colors.textMuted,
  },
  statusBadgeUpcoming: {
    backgroundColor: theme.colors.accent + '20',
    borderColor: theme.colors.accent,
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
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
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
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
  captainDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  captainDashboardButtonText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: '600',
  },
});
