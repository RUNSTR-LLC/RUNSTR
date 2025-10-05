/**
 * EventDetailScreen - Detailed view of a specific event
 * Matches HTML mockup pixel-perfectly for event detail view
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, EventDetailData } from '../types';
import { theme } from '../styles/theme';

// UI Components
import { DetailHeader } from '../components/ui/DetailHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ActionButton } from '../components/ui/ActionButton';

// Event-specific Components
import { EventHeader } from '../components/event/EventHeader';
import { EventStats } from '../components/event/EventStats';
import { EventParticipants } from '../components/event/EventParticipants';
import { EventDetails } from '../components/event/EventDetails';
import { LiveLeaderboard } from '../components/competition/LiveLeaderboard';

// Real Data Services
import { CompetitionService } from '../services/competition/competitionService';
import { NostrCompetitionLeaderboardService } from '../services/competition/nostrCompetitionLeaderboardService';
import { getNostrTeamService } from '../services/nostr/NostrTeamService';
import { CaptainCache } from '../utils/captainCache';
import { getNpubFromStorage } from '../utils/nostr';
import NostrCompetitionParticipantService from '../services/nostr/NostrCompetitionParticipantService';
import { getAuthenticationData } from '../utils/nostrAuth';
import { nsecToPrivateKey } from '../utils/nostr';
import type { CompetitionLeaderboard, CompetitionParticipant } from '../services/competition/nostrCompetitionLeaderboardService';

// QR Code Components
import { QRDisplayModal } from '../components/qr/QRDisplayModal';
import QRCodeService from '../services/qr/QRCodeService';
import type { EventQRData } from '../services/qr/QRCodeService';

// Captain Management
import { EventParticipantManagementSection } from '../components/captain/EventParticipantManagementSection';

type EventDetailRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;
type EventDetailNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EventDetail'
>;

interface EventDetailScreenProps {
  route: EventDetailRouteProp;
  navigation: EventDetailNavigationProp;
}

export const EventDetailScreen: React.FC<EventDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { eventId, eventData: passedEventData } = route.params;
  const [eventData, setEventData] = useState<EventDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<
    'not_joined' | 'pending' | 'joined' | 'completed'
  >('not_joined');
  const [leaderboard, setLeaderboard] = useState<CompetitionLeaderboard | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [userIsCaptain, setUserIsCaptain] = useState(false);
  const [currentUserPubkey, setCurrentUserPubkey] = useState<string | null>(null);
  const [currentUserHexPubkey, setCurrentUserHexPubkey] = useState<string | null>(null);
  const [team, setTeam] = useState<any>(null);
  const [competition, setCompetition] = useState<any>(null);
  const participantService = NostrCompetitionParticipantService.getInstance();

  // QR Code state
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [eventQRData, setEventQRData] = useState<EventQRData | null>(null);

  // Load event data
  useEffect(() => {
    loadEventData();
    checkCaptainStatus();
    checkJoinStatus();
  }, [eventId]);

  const checkCaptainStatus = async () => {
    try {
      // Get current user pubkey
      const npub = await getNpubFromStorage();
      setCurrentUserPubkey(npub);

      // Get auth data for hex pubkey
      const authData = await getAuthenticationData();
      if (authData && authData.hexPubkey) {
        setCurrentUserHexPubkey(authData.hexPubkey);
      }

      if (!npub) return;

      // Get competition and team info
      const competitionService = CompetitionService.getInstance();
      const comp = competitionService.getCompetitionById(eventId);
      setCompetition(comp);

      if (comp?.teamId) {
        // Check captain cache first
        const captainCache = CaptainCache.getInstance();
        const isCaptain = await captainCache.getIsCaptain(comp.teamId);

        if (isCaptain !== null) {
          setUserIsCaptain(isCaptain);
        } else {
          // Fetch team data to verify captain status
          const teamService = getNostrTeamService();
          const teamData = teamService.getTeamById(comp.teamId);

          if (teamData) {
            setTeam(teamData);
            const captainStatus = teamData.captain === npub ||
                                 teamData.captainHex === npub;
            setUserIsCaptain(captainStatus);
            // Cache the result - guard against null competition
            if (comp?.teamId) {
              await captainCache.setIsCaptain(comp.teamId, captainStatus);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking captain status:', error);
    }
  };

  const loadEventData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let competition = null;

      // First try to use passed event data if available
      if (passedEventData) {
        console.log('Using passed event data:', passedEventData);

        // Validate critical fields before processing
        if (!passedEventData.id && !eventId) {
          throw new Error('Event ID is missing from both route params and passed data');
        }

        try {
          // Convert Nostr event to Competition format with comprehensive null guards
          const eventDate = passedEventData.eventDate ? new Date(passedEventData.eventDate) : new Date();

          // Validate date is not Invalid
          if (isNaN(eventDate.getTime())) {
            console.warn('⚠️ Invalid event date, using current date as fallback');
            eventDate.setTime(Date.now());
          }

          const startTime = Math.floor(eventDate.getTime() / 1000);

          competition = {
            id: passedEventData.id || eventId,
            teamId: passedEventData.teamId || '',
            name: passedEventData.name || 'Unnamed Event',
            description: passedEventData.description || '',
            type: 'event',
            activityType: passedEventData.activityType || 'running',
            competitionType: passedEventData.competitionType || 'distance',
            startTime,
            endTime: startTime + 86400, // Add 1 day
            entryFeesSats: passedEventData.entryFeesSats || 0,
            goalValue: passedEventData.targetValue,
            goalUnit: passedEventData.targetUnit || 'km',
            captainPubkey: passedEventData.captainPubkey || '',
          };

          console.log('✅ Successfully converted passed event data to competition format');
        } catch (conversionError) {
          console.error('❌ Error converting passed event data:', conversionError);
          // If conversion fails, try CompetitionService lookup as fallback
          const competitionService = CompetitionService.getInstance();
          competition = competitionService.getCompetitionById(eventId);
        }
      } else {
        // Fall back to CompetitionService lookup
        const competitionService = CompetitionService.getInstance();
        competition = competitionService.getCompetitionById(eventId);
      }

      if (!competition) {
        throw new Error(`Event not found: ${eventId}`);
      }

      // Load real leaderboard data
      setIsLoadingLeaderboard(true);
      const leaderboardService = NostrCompetitionLeaderboardService.getInstance();
      
      try {
        const eventLeaderboard = await leaderboardService.computeEventLeaderboard(
          competition,
          undefined, // Let it fetch all team members
          'current_user_id' // TODO: Get actual current user ID from auth
        );
        
        setLeaderboard(eventLeaderboard);

        // Also fetch and set team data if we don't have it yet
        if (!team && competition.teamId) {
          const teamService = getNostrTeamService();
          const teamData = teamService.getTeamById(competition.teamId);
          if (teamData) {
            setTeam(teamData);
          }
        }

        // Convert leaderboard participants to participant details format - guard against missing data
        const participantDetails = (eventLeaderboard?.participants || []).map((participant: CompetitionParticipant) => ({
          id: participant?.pubkey || 'unknown',
          name: participant?.name || `User ${(participant?.pubkey || 'unknown').substring(0, 8)}`,
          avatar: participant?.name?.charAt(0)?.toUpperCase() || 'U',
          position: participant?.position || 0,
          score: participant?.score || 0,
          distance: participant?.totalDistance ? `${Math.round(participant.totalDistance / 1000)} km` : '0 km',
          time: participant?.totalDuration ? formatDuration(participant.totalDuration) : '0 min',
          workouts: participant?.workoutCount || 0,
          lastActivity: participant?.lastActivity || 0,
          status: 'completed' as const,
        }));

        // Convert Competition to EventDetailData with real leaderboard data - guard all accesses
        const participantCount = eventLeaderboard?.participants?.length || 0;
        const prizePool = (competition?.entryFeesSats || 0) * participantCount;

        const eventDetailData: EventDetailData = {
          id: competition?.id || eventId,
          name: competition?.name || 'Unnamed Event',
          description: competition?.description || '',
          startDate: formatEventDateRange(competition?.startTime || 0, competition?.endTime || 0),
          endDate: '',  // We'll pass the full range in startDate
          prizePool, // Calculate from entry fees
          participants: participantDetails, // Use formatted participant details
          participantDetails, // Real participant details from leaderboard
          stats: {
            participantCount,
            completedCount: (eventLeaderboard?.participants || []).filter(p => (p?.workoutCount || 0) > 0).length,
          },
          progress: {
            isJoined: false, // TODO: Check if current user is participating
            timeRemaining: calculateTimeRemaining(competition?.endTime || 0),
            status: getEventStatus(competition),
            percentage: calculateEventProgress(competition),
            daysRemaining: Math.max(0, Math.ceil(
              ((competition?.endTime || 0) - Date.now() / 1000) / (24 * 60 * 60)
            )),
          },
          status: getEventStatus(competition),
          formattedPrize: `${prizePool} sats`,
          formattedTimeRemaining: formatTimeRemaining(competition?.endTime || 0),
          details: {
            distance: competition?.goalValue
              ? `${competition.goalValue} ${competition?.goalUnit || 'units'}`
              : 'No specific target',
            duration: competition?.type === 'event' ? '1 day' : '30 days',
            activityType: competition?.activityType || 'running',
            createdBy: 'Team Captain', // TODO: Get actual creator name from competition.captainPubkey
            startDate: new Date(
              (competition?.startTime || 0) * 1000
            ).toLocaleDateString(),
            endDate: new Date((competition?.endTime || 0) * 1000).toLocaleDateString(),
          },
        };

        setEventData(eventDetailData);
      } catch (leaderboardError) {
        console.error('Failed to load leaderboard data:', leaderboardError);
        // Fall back to basic event data without leaderboard - guard all accesses
        const eventDetailData: EventDetailData = {
          id: competition?.id || eventId,
          name: competition?.name || 'Unnamed Event',
          description: competition?.description || '',
          startDate: formatEventDateRange(competition?.startTime || 0, competition?.endTime || 0),
          endDate: '',  // We'll pass the full range in startDate
          prizePool: 0,
          participants: [],
          participantDetails: [],
          stats: {
            participantCount: 0,
            completedCount: 0,
          },
          progress: {
            isJoined: false,
            timeRemaining: calculateTimeRemaining(competition?.endTime || 0),
            status: getEventStatus(competition),
            percentage: calculateEventProgress(competition),
            daysRemaining: Math.max(0, Math.ceil(
              ((competition?.endTime || 0) - Date.now() / 1000) / (24 * 60 * 60)
            )),
          },
          status: getEventStatus(competition),
          formattedPrize: '0 sats',
          formattedTimeRemaining: formatTimeRemaining(competition?.endTime || 0),
          details: {
            distance: competition?.goalValue
              ? `${competition.goalValue} ${competition?.goalUnit || 'units'}`
              : 'No specific target',
            duration: competition?.type === 'event' ? '1 day' : '30 days',
            activityType: competition?.activityType || 'running',
            createdBy: 'Team Captain',
            startDate: new Date(
              (competition?.startTime || 0) * 1000
            ).toLocaleDateString(),
            endDate: new Date((competition?.endTime || 0) * 1000).toLocaleDateString(),
          },
        };
        setEventData(eventDetailData);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    } catch (err) {
      console.error('Failed to load event data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions
  const formatEventDateRange = (startTime: number, endTime: number): string => {
    const startDate = new Date(startTime * 1000);
    const endDate = new Date(endTime * 1000);
    const currentYear = new Date().getFullYear();

    const startMonth = startDate.toLocaleDateString('en-US', { month: 'long' });
    const startDay = startDate.getDate();
    const startYear = startDate.getFullYear();

    const endMonth = endDate.toLocaleDateString('en-US', { month: 'long' });
    const endDay = endDate.getDate();
    const endYear = endDate.getFullYear();

    // Same day event
    if (startMonth === endMonth && startDay === endDay && startYear === endYear) {
      const yearStr = startYear === currentYear ? '' : `, ${startYear}`;
      return `${startMonth} ${startDay}${yearStr}`;
    }

    // Same month, different days
    if (startMonth === endMonth && startYear === endYear) {
      const yearStr = startYear === currentYear ? '' : `, ${startYear}`;
      return `${startMonth} ${startDay}-${endDay}${yearStr}`;
    }

    // Different months or years
    const startYearStr = startYear === currentYear ? '' : `, ${startYear}`;
    const endYearStr = endYear === currentYear ? '' : `, ${endYear}`;
    return `${startMonth} ${startDay}${startYearStr} - ${endMonth} ${endDay}${endYearStr}`;
  };

  const calculateTimeRemaining = (endTime: number) => {
    const remaining = endTime - Math.floor(Date.now() / 1000);
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return { hours: Math.max(0, hours), minutes: Math.max(0, minutes) };
  };

  const getEventStatus = (
    competition: any
  ): 'upcoming' | 'active' | 'completed' => {
    if (!competition) return 'completed';
    const now = Math.floor(Date.now() / 1000);
    const startTime = competition.startTime || 0;
    const endTime = competition.endTime || 0;
    if (startTime > now) return 'upcoming'; // upcoming events
    if (endTime < now) return 'completed'; // completed events
    return 'active';
  };

  const calculateEventProgress = (competition: any): number => {
    if (!competition) return 0;
    const now = Math.floor(Date.now() / 1000);
    const startTime = competition.startTime || 0;
    const endTime = competition.endTime || 0;
    const total = endTime - startTime;
    if (total <= 0) return 0;
    const elapsed = now - startTime;
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  };

  const formatTimeRemaining = (endTime: number): string => {
    const remaining = endTime - Math.floor(Date.now() / 1000);
    if (remaining <= 0) return 'Expired';

    const days = Math.floor(remaining / (24 * 3600));
    const hours = Math.floor((remaining % (24 * 3600)) / 3600);

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Handle back navigation
  const handleBack = () => {
    navigation.goBack();
  };

  // Handle share functionality
  const handleShare = async () => {
    if (!eventData) return;

    try {
      const shareOptions = {
        message: `Check out the ${
          eventData?.name || 'event'
        } event on RUNSTR! ${eventData?.description || ''}`,
        title: `${eventData?.name || 'Event'} - RUNSTR Event`,
        url: `runstr://events/${eventId}`,
      };

      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  // Handle QR code display (captain only)
  const handleShowQRCode = () => {
    if (!eventData || !competition || !currentUserPubkey) return;

    // Generate QR data for this event
    const qrData = QRCodeService.generateEventQR(
      eventData.id,
      competition.teamId,
      currentUserPubkey,
      eventData.name,
      competition.startTime,
      competition.endTime,
      eventData.description
    );

    // Parse the JSON string back to object for the modal
    const parsedQRData = JSON.parse(qrData) as EventQRData;
    setEventQRData(parsedQRData);
    setQrModalVisible(true);
  };

  // Handle join/leave event
  const checkJoinStatus = async () => {
    try {
      if (!currentUserHexPubkey || !eventId) return;

      // Check if user is already an approved participant
      const isParticipant = await participantService.isApprovedParticipant(
        eventId,
        currentUserHexPubkey
      );

      if (isParticipant) {
        setJoinStatus('joined');
      } else {
        // Check if there's a pending request
        const pendingRequests = await participantService.getPendingJoinRequests(eventId);
        const userRequest = pendingRequests.find(
          r => r.userHexPubkey === currentUserHexPubkey
        );

        if (userRequest) {
          setJoinStatus('pending');
        }
      }
    } catch (error) {
      console.error('Error checking join status:', error);
    }
  };

  const handleJoinToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Get authentication data
      const authData = await getAuthenticationData();
      if (!authData || !authData.nsec) {
        Alert.alert(
          'Authentication Required',
          'Please log in again to join competitions.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      const privateKeyHex = nsecToPrivateKey(authData.nsec);

      if (joinStatus === 'not_joined') {
        // Check if competition requires approval
        const requiresApproval = competition?.requireApproval || false;

        if (requiresApproval) {
          // Send join request
          const result = await participantService.requestToJoin(
            eventId,
            privateKeyHex,
            'I would like to join this competition!'
          );

          if (result.success) {
            setJoinStatus('pending');
            Alert.alert(
              'Request Sent',
              'Your join request has been sent to the team captain for approval.'
            );
          } else {
            throw new Error(result.error || 'Failed to send join request');
          }
        } else {
          // Direct join without approval
          // First create participant list if it doesn't exist
          let participantList = await participantService.getParticipantList(eventId);

          if (!participantList && userIsCaptain && competition) {
            // Captain needs to create the participant list first
            await participantService.createParticipantList(
              eventId,
              competition.teamId,
              privateKeyHex,
              false
            );
          }

          // Now add user as approved participant
          const result = await participantService.approveParticipant(
            eventId,
            currentUserHexPubkey!,
            privateKeyHex
          );

          if (result.success) {
            setJoinStatus('joined');
            Alert.alert('Success', 'Successfully joined the event!');
          } else {
            throw new Error(result.error || 'Failed to join event');
          }
        }
      } else if (joinStatus === 'joined') {
        // Leave competition
        const result = await participantService.removeParticipant(
          eventId,
          currentUserHexPubkey!,
          privateKeyHex
        );

        if (result.success) {
          setJoinStatus('not_joined');
          Alert.alert('Success', 'Left the event successfully');
        } else {
          throw new Error(result.error || 'Failed to leave event');
        }
      }

      // Refresh participant count
      await checkJoinStatus();
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('Error toggling event join:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionButtonTitle = () => {
    if (!eventData) return '';
    if (eventData.status === 'completed') {
      return 'Event Completed';
    }
    if (eventData.progress?.daysRemaining === 0) {
      return 'Event Expired';
    }
    if (joinStatus === 'joined') {
      return 'Joined ✓';
    }
    if (joinStatus === 'pending') {
      return 'Pending Approval';
    }
    return 'Join Event';
  };

  const getActionButtonVariant = () => {
    if (joinStatus === 'pending') {
      return 'secondary';
    }
    if (
      !eventData ||
      eventData.status === 'completed' ||
      (eventData.progress?.daysRemaining ?? 0) === 0
    ) {
      return 'secondary';
    }
    return joinStatus === 'joined' ? 'secondary' : 'primary';
  };

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (error || !eventData) {
    return <ErrorState onRetry={loadEventData} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Status Bar */}

      {/* Header */}
      <DetailHeader
        title="Event Details"
        onBack={handleBack}
        onShare={handleShare}
      />

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Event Header Section */}
        <EventHeader
          title={eventData?.name || 'Event'}
          startDate={eventData?.startDate || ''}
          endDate={eventData?.endDate || ''}
          type="Distance"
          description={eventData?.description || ''}
          daysRemaining={eventData?.progress?.daysRemaining ?? 0}
          progressPercentage={eventData?.progress?.percentage ?? 0}
        />

        {/* Status Badges */}
        <View style={styles.statusBadgesContainer}>
          {joinStatus === 'joined' && (
            <View style={styles.joinedBadge}>
              <Text style={styles.badgeText}>✓ Joined</Text>
            </View>
          )}
          {joinStatus === 'pending' && (
            <View style={styles.pendingBadge}>
              <Text style={styles.badgeText}>⏳ Pending Approval</Text>
            </View>
          )}
          {eventData.status === 'active' && (
            <View style={styles.activeBadge}>
              <Text style={styles.badgeText}>🔴 Active Now</Text>
            </View>
          )}
          {eventData.status === 'completed' && (
            <View style={styles.completedBadge}>
              <Text style={styles.badgeText}>Completed</Text>
            </View>
          )}
          {userIsCaptain && (
            <View style={styles.captainBadge}>
              <Text style={styles.badgeText}>👑 Captain</Text>
            </View>
          )}
        </View>

        {/* Progress Bar Section */}
        <View style={styles.progressSection}>
          <ProgressBar
            percentage={eventData?.progress?.percentage ?? 0}
            height={4}
            backgroundColor={theme.colors.border}
            fillColor={theme.colors.text}
          />
          <Text style={styles.progressText}>
            {typeof eventData?.progress?.timeRemaining === 'object'
              ? `${eventData.progress.timeRemaining?.hours || 0}h ${eventData.progress.timeRemaining?.minutes || 0}m remaining`
              : eventData?.progress?.timeRemaining || 'Unknown'}
          </Text>
        </View>

        {/* Stats Section */}
        <EventStats
          participantCount={eventData?.stats?.participantCount ?? 0}
          completedCount={eventData?.stats?.completedCount ?? 0}
        />

        {/* Captain Participant Management */}
        {userIsCaptain && currentUserHexPubkey && eventData && (
          <EventParticipantManagementSection
            eventId={eventData.id}
            eventName={eventData.name}
            captainPubkey={currentUserHexPubkey}
            onParticipantUpdate={loadEventData}
            style={styles.participantManagement}
          />
        )}

        {/* Live Leaderboard with Distribution Panel for Captains */}
        {team && leaderboard && eventData && (
          <LiveLeaderboard
            competition={{
              id: eventData.id,
              teamId: team.id,
              name: eventData.name,
              description: eventData.description || '',
              type: 'event',
              startTime: eventData.startDate ? Math.floor(new Date(eventData.startDate).getTime() / 1000) : 0,
              endTime: eventData.endDate ? Math.floor(new Date(eventData.endDate).getTime() / 1000) : 0,
              activityType: eventData.details?.activityType as any || 'running',
              goalType: 'distance' as any,
              entryFeesSats: Math.floor((eventData.prizePool || 0) / Math.max(1, eventData.stats?.participantCount || 1)),
            }}
            team={team}
            userIsCaptain={userIsCaptain}
            currentUserPubkey={currentUserPubkey || undefined}
            showHeader={false}
          />
        )}

        {/* Fallback Participants Section if no leaderboard */}
        {!leaderboard && eventData && (
          <EventParticipants
            participants={eventData.participantDetails || []}
            totalCount={eventData.stats?.participantCount || 0}
          />
        )}

        {/* Event Details Section */}
        {eventData?.details && (
          <EventDetails
            distance={eventData.details.distance}
            duration={eventData.details.duration}
            activityType={eventData.details.activityType}
            createdBy={eventData.details.createdBy}
            startDate={eventData.details.startDate}
            endDate={eventData.details.endDate}
          />
        )}

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionSection}>
        {/* Show QR button for captains */}
        {userIsCaptain && (
          <TouchableOpacity
            style={styles.qrButton}
            onPress={handleShowQRCode}
            activeOpacity={0.7}
          >
            <Text style={styles.qrButtonText}>📱 Show QR Code</Text>
          </TouchableOpacity>
        )}

        <ActionButton
          title={getActionButtonTitle()}
          onPress={handleJoinToggle}
          variant={getActionButtonVariant()}
          loading={isLoading}
          disabled={
            eventData?.status === 'completed' ||
            (eventData?.progress?.daysRemaining ?? 0) === 0
          }
          accessibilityLabel={
            joinStatus === 'joined' ? 'Leave event' : 'Join event'
          }
          accessibilityHint={
            eventData.status === 'completed'
              ? 'Event is completed'
              : 'Tap to toggle event participation'
          }
        />
      </View>

      {/* QR Code Modal */}
      {eventQRData && (
        <QRDisplayModal
          visible={qrModalVisible}
          onClose={() => setQrModalVisible(false)}
          data={eventQRData}
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  progressSection: {
    marginVertical: 16,
  },
  progressText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: theme.typography.weights.regular,
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40, // Extra bottom padding for safe area
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  qrButton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  qrButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  participantManagement: {
    marginBottom: 20,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 16,
  },
  joinedBadge: {
    backgroundColor: theme.colors.success + '20',
    borderWidth: 1,
    borderColor: theme.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pendingBadge: {
    backgroundColor: theme.colors.warning + '20',
    borderWidth: 1,
    borderColor: theme.colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeBadge: {
    backgroundColor: theme.colors.error + '20',
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedBadge: {
    backgroundColor: theme.colors.textMuted + '20',
    borderWidth: 1,
    borderColor: theme.colors.textMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  captainBadge: {
    backgroundColor: theme.colors.accent + '20',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  bottomPadding: {
    height: 20, // Extra space before action button
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: theme.colors.background,
    fontWeight: '600',
  },
});

// Loading state component (for future use)
const LoadingState: React.FC = () => (
  <View style={[styles.container, styles.centerContent]}>
    <Text style={styles.loadingText}>Loading event details...</Text>
  </View>
);

// Error state component (for future use)
interface ErrorStateProps {
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ onRetry }) => (
  <View style={[styles.container, styles.centerContent]}>
    <Text style={styles.errorText}>Failed to load event details</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryButtonText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);
