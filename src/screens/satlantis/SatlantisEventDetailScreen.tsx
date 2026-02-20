/**
 * SatlantisEventDetailScreen - Event detail with participants and leaderboard
 * Shows event metadata, participant count, and fastest-time leaderboard
 * Supports RUNSTR event joining with free/paid options
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
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useSatlantisEventDetail } from '../../hooks/useSatlantisEvents';
import { SatlantisLeaderboard } from '../../components/satlantis/SatlantisLeaderboard';
import { SatlantisTeamLeaderboard } from '../../components/satlantis/SatlantisTeamLeaderboard';
import { EventJoinButton } from '../../components/satlantis/EventJoinButton';
import { EventCreatorControls } from '../../components/satlantis/EventCreatorControls';
import { SatlantisEventJoinService } from '../../services/satlantis/SatlantisEventJoinService';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { useAuth } from '../../contexts/AuthContext';
import { formatEventDateTime } from '../../types/satlantis';
// CacheInvalidator removed - Option A: pull-to-refresh only updates workouts
import { nip19 } from 'nostr-tools';

interface SatlantisEventDetailScreenProps {
  route: {
    params: {
      eventId: string;
      eventPubkey: string;
    };
  };
  navigation: any;
}

// Debug Section Component - for troubleshooting RSVP issues
const DebugSection: React.FC<{
  eventId: string;
  eventPubkey: string;
  onRefresh: () => void;
  currentUserHexPubkey: string | null;
}> = ({ eventId, eventPubkey, onRefresh, currentUserHexPubkey }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const handleClearLocalJoin = async () => {
    console.log('[DEBUG] Clearing local join for event:', eventId);
    await SatlantisEventJoinService.debugClearLocalJoin(eventPubkey, eventId);
    setDebugInfo('Local join cleared! You can now re-join.');
    // Wait a moment then refresh
    setTimeout(() => {
      onRefresh();
    }, 500);
  };

  const handleForceLocalJoin = async () => {
    if (!currentUserHexPubkey) {
      setDebugInfo('Error: No user pubkey available');
      return;
    }
    console.log('[DEBUG] Force adding local join for user:', currentUserHexPubkey.slice(0, 16) + '...');
    await SatlantisEventJoinService.debugForceLocalJoin(eventPubkey, eventId, currentUserHexPubkey);
    setDebugInfo('Force joined locally! Refreshing...');
    setTimeout(() => {
      onRefresh();
    }, 500);
  };

  const handleForceReJoin = async () => {
    if (!currentUserHexPubkey) {
      setDebugInfo('Error: No user pubkey available');
      return;
    }
    setDebugInfo('Publishing new RSVP to Nostr...');
    console.log('[DEBUG] Force re-joining event with pubkey:', currentUserHexPubkey.slice(0, 16) + '...');

    // First clear local join to allow re-joining
    await SatlantisEventJoinService.debugClearLocalJoin(eventPubkey, eventId);

    // Create a minimal SatlantisEvent object for joinEvent
    const minimalEvent = {
      id: eventId,
      pubkey: eventPubkey,
      title: 'Event',
      startTime: 0,
      endTime: 0,
      sportType: 'running',
      joinMethod: 'open',
    } as any;

    // Publish new RSVP
    const result = await SatlantisEventJoinService.joinEvent(minimalEvent);

    if (result.success) {
      setDebugInfo(`✅ New RSVP published!\nEvent ID: ${result.rsvpEventId?.slice(0, 16)}...\nYour pubkey: ${currentUserHexPubkey.slice(0, 16)}...\n\nRefreshing...`);
      setTimeout(() => {
        onRefresh();
      }, 1000);
    } else {
      setDebugInfo(`❌ Failed: ${result.error}`);
    }
  };

  const handleShowDebugInfo = async () => {
    const allJoins = await SatlantisEventJoinService.debugGetAllLocalJoins();
    const key = `${eventPubkey}:${eventId}`;
    const eventJoin = allJoins[key];
    const info = [
      `Event ID: ${eventId}`,
      `Event Pubkey: ${eventPubkey.slice(0, 16)}...`,
      `Your Pubkey: ${currentUserHexPubkey?.slice(0, 16) || 'N/A'}...`,
      `---`,
      `Local join for this event:`,
      eventJoin ? JSON.stringify(eventJoin, null, 2) : 'None',
      `---`,
      `All local joins count: ${Object.keys(allJoins).length}`,
    ];
    setDebugInfo(info.join('\n'));
  };

  if (!isExpanded) {
    return (
      <TouchableOpacity
        style={styles.debugToggle}
        onPress={() => setIsExpanded(true)}
      >
        <Ionicons name="bug" size={14} color={theme.colors.textMuted} />
        <Text style={styles.debugToggleText}>Debug Tools</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.debugSection}>
      <TouchableOpacity
        style={styles.debugHeader}
        onPress={() => setIsExpanded(false)}
      >
        <Ionicons name="bug" size={16} color={theme.colors.accent} />
        <Text style={styles.debugTitle}>RSVP Debug Tools</Text>
        <Ionicons name="chevron-up" size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.debugButtonRow}>
        <TouchableOpacity style={styles.debugButton} onPress={handleClearLocalJoin}>
          <Text style={styles.debugButtonText}>Clear Local Join</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.debugButton} onPress={handleForceLocalJoin}>
          <Text style={styles.debugButtonText}>Force Local Join</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.debugButton, { backgroundColor: theme.colors.text }]} onPress={handleForceReJoin}>
        <Text style={[styles.debugButtonText, { fontWeight: 'bold' }]}>🔄 Force Re-Join (Publish RSVP)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.debugButton} onPress={handleShowDebugInfo}>
        <Text style={styles.debugButtonText}>Show Debug Info</Text>
      </TouchableOpacity>

      {debugInfo ? (
        <View style={styles.debugInfoBox}>
          <Text style={styles.debugInfoText}>{debugInfo}</Text>
        </View>
      ) : null}

      <Text style={styles.debugHint}>
        Use these tools if your join isn't being detected. Check Metro logs for detailed output.
      </Text>
    </View>
  );
};

export const SatlantisEventDetailScreen: React.FC<SatlantisEventDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { eventId, eventPubkey } = route.params;
  const { currentUser } = useAuth();

  // Get user's hex pubkey for leaderboard visibility filtering
  const currentUserHexPubkey = React.useMemo(() => {
    if (!currentUser?.npub) return undefined;
    try {
      const decoded = nip19.decode(currentUser.npub);
      return decoded.data as string;
    } catch {
      return undefined;
    }
  }, [currentUser?.npub]);

  const {
    event,
    leaderboard,
    teamLeaderboard,
    eventStatus,
    isLoading,
    isLoadingLeaderboard,
    error,
    refresh,
    addLocalParticipant,
  } = useSatlantisEventDetail(eventPubkey, eventId, currentUserHexPubkey);

  // Separate state for pull-to-refresh spinner (prevents full-screen "Loading event..." blocker)
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle pull-to-refresh (Option A: workouts only, RSVPs stay cached)
  const handleRefresh = useCallback(async () => {
    console.log(`[SatlantisEventDetail] 🔄 Pull-to-refresh triggered for event ${eventId}`);
    setIsRefreshing(true);
    try {
      // Option A: Only refresh workouts - event/RSVPs stay cached
      // Background RSVP check in hook will update if count changes
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [eventId, refresh]);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
  });

  // Handle successful join
  const handleJoinSuccess = useCallback(() => {
    // Add user to local participant list immediately for optimistic UI
    if (currentUserHexPubkey) {
      addLocalParticipant(currentUserHexPubkey);
    }

    setAlertConfig({
      title: 'Joined!',
      message: 'You have successfully joined this event.',
    });
    setAlertVisible(true);
    refresh();
  }, [refresh, currentUserHexPubkey, addLocalParticipant]);

  // Handle join error
  const handleJoinError = useCallback((error: string) => {
    setAlertConfig({
      title: 'Error',
      message: error,
    });
    setAlertVisible(true);
  }, []);

  const getStatusStyles = () => {
    switch (eventStatus) {
      case 'live':
        return { backgroundColor: theme.colors.text };
      case 'upcoming':
        return { backgroundColor: theme.colors.text };
      case 'ended':
        return { backgroundColor: theme.colors.textMuted };
    }
  };

  // Loading state - ONLY show full-screen spinner on INITIAL load (no cached event)
  // During pull-to-refresh, event is already loaded so we show inline spinner instead
  if (isLoading && !event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="warning-outline"
            size={48}
            color={theme.colors.textMuted}
          />
          <Text style={styles.errorText}>{error || 'Event not found'}</Text>
          <TouchableOpacity
            style={styles.backButtonError}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonErrorText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        {/* Event Image */}
        {event.image ? (
          <Image
            key={`event-banner-${event.id}`}
            source={{ uri: event.image }}
            style={styles.eventImage}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons
              name="trophy-outline"
              size={48}
              color={theme.colors.textMuted}
            />
          </View>
        )}

        {/* Event Info */}
        <View style={styles.infoSection}>
          {/* Status Badge */}
          <View style={[styles.statusBadge, getStatusStyles()]}>
            <Text style={styles.statusText}>{eventStatus.toUpperCase()}</Text>
          </View>

          <Text style={styles.eventTitle}>{event.title}</Text>

          {/* Created By - uses cached profile from event */}
          <View style={styles.creatorRow}>
            {event.creatorProfile?.picture ? (
              <Image
                key={`creator-avatar-${event.pubkey}`}
                source={{ uri: event.creatorProfile.picture }}
                style={styles.creatorAvatar}
              />
            ) : (
              <View style={styles.creatorAvatarPlaceholder}>
                <Ionicons name="person" size={16} color={theme.colors.textMuted} />
              </View>
            )}
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorLabel}>Created by</Text>
              <Text style={styles.creatorName}>
                {event.creatorProfile?.name || 'Anonymous'}
              </Text>
            </View>
          </View>

          {/* Date/Time */}
          <View style={styles.metaRow}>
            <Ionicons name="calendar" size={18} color={theme.colors.accent} />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>Start</Text>
              <Text style={styles.metaValue}>
                {formatEventDateTime(event.startTime)}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="flag" size={18} color={theme.colors.accent} />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>End</Text>
              <Text style={styles.metaValue}>
                {formatEventDateTime(event.endTime)}
              </Text>
            </View>
          </View>

          {/* Location */}
          {event.location && (
            <View style={styles.metaRow}>
              <Ionicons name="location" size={18} color={theme.colors.accent} />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Location</Text>
                <Text style={styles.metaValue}>{event.location}</Text>
              </View>
            </View>
          )}

          {/* Distance */}
          {event.distance && (
            <View style={styles.metaRow}>
              <Ionicons
                name="speedometer"
                size={18}
                color={theme.colors.accent}
              />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Distance</Text>
                <Text style={styles.metaValue}>
                  {event.distance} {event.distanceUnit || 'km'}
                </Text>
              </View>
            </View>
          )}

          {/* Sport Type */}
          <View style={styles.metaRow}>
            <Ionicons name="fitness" size={18} color={theme.colors.accent} />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>Sport</Text>
              <Text style={styles.metaValue}>
                {event.sportType.charAt(0).toUpperCase() +
                  event.sportType.slice(1)}
              </Text>
            </View>
          </View>

          {/* Description */}
          {event.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>About</Text>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>
          )}

          {/* RUNSTR Event Info */}
          {event.isRunstrEvent && (
            <View style={styles.runstrInfoSection}>
              <Text style={styles.runstrBadge}>RUNSTR EVENT</Text>
              <View style={styles.runstrInfoGrid}>
                {event.scoringType && (
                  <View style={styles.runstrInfoItem}>
                    <Text style={styles.runstrInfoLabel}>Scoring</Text>
                    <Text style={styles.runstrInfoValue}>
                      {event.scoringType === 'fastest_time'
                        ? 'Fastest Time'
                        : event.scoringType === 'most_distance'
                          ? 'Most Distance'
                          : 'Participation'}
                    </Text>
                  </View>
                )}
                {event.payoutScheme && (
                  <View style={styles.runstrInfoItem}>
                    <Text style={styles.runstrInfoLabel}>Payout</Text>
                    <Text style={styles.runstrInfoValue}>
                      {event.payoutScheme === 'winner_takes_all'
                        ? 'Top 1'
                        : event.payoutScheme === 'top_3_split'
                          ? 'Top 3'
                          : event.payoutScheme === 'top_5_split'
                            ? 'Top 5'
                            : 'Fixed Amount'}
                    </Text>
                  </View>
                )}
                {event.prizePoolSats && event.prizePoolSats > 0 && (
                  <View style={styles.runstrInfoItem}>
                    <Text style={styles.runstrInfoLabel}>Prize Pool</Text>
                    <Text style={styles.runstrInfoValueHighlight}>
                      {event.prizePoolSats.toLocaleString()} sats
                    </Text>
                  </View>
                )}
                {event.joinMethod === 'donation' && (event.suggestedDonationSats || event.entryFeeSats) && (
                  <View style={styles.runstrInfoItem}>
                    <Text style={styles.runstrInfoLabel}>Suggested Donation</Text>
                    <Text style={styles.runstrInfoValue}>
                      {(event.suggestedDonationSats || event.entryFeeSats || 0).toLocaleString()} sats
                    </Text>
                  </View>
                )}
                {/* Pledge/Commitment System Info */}
                {event.pledgeCost && event.pledgeCost > 0 && (
                  <View style={styles.runstrInfoItem}>
                    <Text style={styles.runstrInfoLabel}>Entry Cost</Text>
                    <Text style={styles.runstrInfoValue}>
                      {event.pledgeCost} daily workout{event.pledgeCost > 1 ? 's' : ''} ({event.pledgeCost * 50} sats)
                    </Text>
                  </View>
                )}
                {event.pledgeCost && event.pledgeCost > 0 && (
                  <View style={styles.runstrInfoItem}>
                    <Text style={styles.runstrInfoLabel}>Rewards Go To</Text>
                    <Text style={styles.runstrInfoValue}>
                      {event.pledgeDestination === 'charity'
                        ? event.pledgeCharityName || 'Charity'
                        : event.creatorProfile?.name || 'Event Creator'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Join Button */}
          <View style={styles.joinButtonContainer}>
            <EventJoinButton
              event={event}
              onJoinSuccess={handleJoinSuccess}
              onError={handleJoinError}
            />
          </View>
        </View>

        {/* Leaderboard - Team or Individual based on event type */}
        <View style={styles.leaderboardSection}>
          {event.isTeamCompetition ? (
            <SatlantisTeamLeaderboard
              entries={teamLeaderboard}
              isLoading={isLoadingLeaderboard}
              eventStatus={eventStatus}
              scoringType={event.scoringType}
            />
          ) : (
            <SatlantisLeaderboard
              entries={leaderboard}
              isLoading={isLoadingLeaderboard}
              eventStatus={eventStatus}
              currentUserNpub={currentUser?.npub}
            />
          )}
        </View>

        {/* Payout Controls - shown to ANYONE when event ended and has prize pool */}
        {event.isRunstrEvent &&
          event.prizePoolSats &&
          event.prizePoolSats > 0 &&
          eventStatus === 'ended' && (
            <View style={styles.creatorControlsSection}>
              <EventCreatorControls
                event={event}
                leaderboard={leaderboard}
              />
            </View>
          )}

        {/* Debug Section - hidden for now
        <DebugSection
          eventId={eventId}
          eventPubkey={eventPubkey}
          onRefresh={refresh}
          currentUserHexPubkey={currentUserHexPubkey}
        />
        */}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Alert */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={[{ text: 'OK', style: 'default', onPress: () => setAlertVisible(false) }]}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginHorizontal: 12,
  },
  headerSpacer: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  backButtonError: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.text,
    borderRadius: 8,
  },
  backButtonErrorText: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.semiBold,
  },
  eventImage: {
    width: '100%',
    height: 200,
    backgroundColor: theme.colors.border,
  },
  imagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creatorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
  },
  creatorAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorInfo: {
    marginLeft: 10,
  },
  creatorLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  metaContent: {
    marginLeft: 12,
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  metaValue: {
    fontSize: 15,
    color: theme.colors.text,
    marginTop: 2,
  },
  descriptionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  leaderboardSection: {
    paddingHorizontal: 16,
  },
  creatorControlsSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  bottomPadding: {
    height: 40,
  },
  // RUNSTR Info Section
  runstrInfoSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  runstrBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.text,
    color: theme.colors.background,
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  runstrInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  runstrInfoItem: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 12,
    minWidth: '45%',
    flex: 1,
  },
  runstrInfoLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  runstrInfoValue: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  runstrInfoValueHighlight: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  // Join Button
  joinButtonContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  // Debug Section Styles
  debugToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    opacity: 0.5,
    gap: 6,
  },
  debugToggleText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  debugSection: {
    margin: 16,
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  debugTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  debugButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  debugButton: {
    flex: 1,
    backgroundColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  debugInfoBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  debugInfoText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  debugHint: {
    marginTop: 12,
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SatlantisEventDetailScreen;
