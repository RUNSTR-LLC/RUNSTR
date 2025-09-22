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
import type { CompetitionLeaderboard, CompetitionParticipant } from '../services/competition/nostrCompetitionLeaderboardService';

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
  const { eventId } = route.params;
  const [eventData, setEventData] = useState<EventDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<
    'not_joined' | 'joined' | 'completed'
  >('not_joined');
  const [leaderboard, setLeaderboard] = useState<CompetitionLeaderboard | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [userIsCaptain, setUserIsCaptain] = useState(false);
  const [currentUserPubkey, setCurrentUserPubkey] = useState<string | null>(null);
  const [team, setTeam] = useState<any>(null);

  // Load event data
  useEffect(() => {
    loadEventData();
    checkCaptainStatus();
  }, [eventId]);

  const checkCaptainStatus = async () => {
    try {
      // Get current user pubkey
      const npub = await getNpubFromStorage();
      setCurrentUserPubkey(npub);

      if (!npub) return;

      // Get competition and team info
      const competitionService = CompetitionService.getInstance();
      const competition = competitionService.getCompetitionById(eventId);

      if (competition && competition.teamId) {
        // Check captain cache first
        const captainCache = CaptainCache.getInstance();
        const isCaptain = await captainCache.getIsCaptain(competition.teamId);

        if (isCaptain !== null) {
          setUserIsCaptain(isCaptain);
        } else {
          // Fetch team data to verify captain status
          const teamService = getNostrTeamService();
          const teamData = await teamService.fetchTeamById(competition.teamId);

          if (teamData) {
            setTeam(teamData);
            const captainStatus = teamData.captain === npub ||
                                 teamData.captainHex === npub;
            setUserIsCaptain(captainStatus);
            // Cache the result
            await captainCache.setIsCaptain(competition.teamId, captainStatus);
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
      const competitionService = CompetitionService.getInstance();
      const competition = competitionService.getCompetitionById(eventId);

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
          const teamData = await teamService.fetchTeamById(competition.teamId);
          if (teamData) {
            setTeam(teamData);
          }
        }

        // Convert leaderboard participants to participant details format
        const participantDetails = eventLeaderboard.participants.map((participant: CompetitionParticipant) => ({
          id: participant.pubkey,
          name: participant.name || `User ${participant.pubkey.substring(0, 8)}`,
          avatar: participant.name?.charAt(0).toUpperCase() || 'U',
          position: participant.position || 0,
          score: participant.score,
          distance: participant.totalDistance ? `${Math.round(participant.totalDistance / 1000)} km` : '0 km',
          time: participant.totalDuration ? formatDuration(participant.totalDuration) : '0 min',
          workouts: participant.workoutCount || 0,
          lastActivity: participant.lastActivity || 0,
          status: 'completed' as const,
        }));

        // Convert Competition to EventDetailData with real leaderboard data
        const eventDetailData: EventDetailData = {
          id: competition.id,
          name: competition.name,
          description: competition.description,
          startDate: new Date(competition.startTime * 1000).toISOString(),
          endDate: new Date(competition.endTime * 1000).toISOString(),
          prizePool: competition.entryFeesSats * eventLeaderboard.participants.length, // Calculate from entry fees
          participants: participantDetails, // Use formatted participant details
          participantDetails, // Real participant details from leaderboard
          stats: {
            participantCount: eventLeaderboard.participants.length,
            completedCount: eventLeaderboard.participants.filter(p => (p.workoutCount || 0) > 0).length,
          },
          progress: {
            isJoined: false, // TODO: Check if current user is participating
            timeRemaining: calculateTimeRemaining(competition.endTime),
            status: getEventStatus(competition),
            percentage: calculateEventProgress(competition),
            daysRemaining: Math.ceil(
              (competition.endTime - Date.now() / 1000) / (24 * 60 * 60)
            ),
          },
          status: getEventStatus(competition),
          formattedPrize: `${competition.entryFeesSats * eventLeaderboard.participants.length} sats`,
          formattedTimeRemaining: formatTimeRemaining(competition.endTime),
          details: {
            distance: competition.goalValue
              ? `${competition.goalValue} ${competition.goalUnit || 'units'}`
              : 'No specific target',
            duration: competition.type === 'event' ? '1 day' : '30 days',
            activityType: competition.activityType,
            createdBy: 'Team Captain', // TODO: Get actual creator name from competition.captainPubkey
            startDate: new Date(
              competition.startTime * 1000
            ).toLocaleDateString(),
            endDate: new Date(competition.endTime * 1000).toLocaleDateString(),
          },
        };

        setEventData(eventDetailData);
      } catch (leaderboardError) {
        console.error('Failed to load leaderboard data:', leaderboardError);
        // Fall back to basic event data without leaderboard
        const eventDetailData: EventDetailData = {
          id: competition.id,
          name: competition.name,
          description: competition.description,
          startDate: new Date(competition.startTime * 1000).toISOString(),
          endDate: new Date(competition.endTime * 1000).toISOString(),
          prizePool: 0,
          participants: [],
          participantDetails: [],
          stats: {
            participantCount: 0,
            completedCount: 0,
          },
          progress: {
            isJoined: false,
            timeRemaining: calculateTimeRemaining(competition.endTime),
            status: getEventStatus(competition),
            percentage: calculateEventProgress(competition),
            daysRemaining: Math.ceil(
              (competition.endTime - Date.now() / 1000) / (24 * 60 * 60)
            ),
          },
          status: getEventStatus(competition),
          formattedPrize: '0 sats',
          formattedTimeRemaining: formatTimeRemaining(competition.endTime),
          details: {
            distance: competition.goalValue
              ? `${competition.goalValue} ${competition.goalUnit || 'units'}`
              : 'No specific target',
            duration: competition.type === 'event' ? '1 day' : '30 days',
            activityType: competition.activityType,
            createdBy: 'Team Captain',
            startDate: new Date(
              competition.startTime * 1000
            ).toLocaleDateString(),
            endDate: new Date(competition.endTime * 1000).toLocaleDateString(),
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
  const calculateTimeRemaining = (endTime: number) => {
    const remaining = endTime - Math.floor(Date.now() / 1000);
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return { hours: Math.max(0, hours), minutes: Math.max(0, minutes) };
  };

  const getEventStatus = (
    competition: any
  ): 'upcoming' | 'active' | 'completed' => {
    const now = Math.floor(Date.now() / 1000);
    if (competition.startTime > now) return 'upcoming'; // upcoming events
    if (competition.endTime < now) return 'completed'; // completed events
    return 'active';
  };

  const calculateEventProgress = (competition: any): number => {
    const now = Math.floor(Date.now() / 1000);
    const total = competition.endTime - competition.startTime;
    const elapsed = now - competition.startTime;
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

  // Handle join/leave event
  const handleJoinToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Toggle join status
      const newJoinStatus = joinStatus === 'joined' ? 'not_joined' : 'joined';

      setJoinStatus(newJoinStatus);

      setEventData((prevData) => {
        if (!prevData) return null;
        return {
          ...prevData,
          stats: {
            ...prevData.stats,
            participantCount:
              newJoinStatus === 'joined'
                ? prevData.stats.participantCount + 1
                : prevData.stats.participantCount - 1,
          },
        };
      });

      const message =
        newJoinStatus === 'joined'
          ? 'Successfully joined the event!'
          : 'Left the event successfully';

      Alert.alert('Success', message);
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
    return 'Join Event';
  };

  const getActionButtonVariant = () => {
    if (
      !eventData ||
      eventData.status === 'completed' ||
      eventData.progress.daysRemaining === 0
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
    <View style={styles.container}>
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
          title={eventData.name}
          startDate={eventData.startDate}
          endDate={eventData.endDate}
          type="Distance"
          description={eventData.description}
          daysRemaining={eventData.progress.daysRemaining ?? 0}
          progressPercentage={eventData.progress.percentage}
        />

        {/* Progress Bar Section */}
        <View style={styles.progressSection}>
          <ProgressBar
            percentage={eventData.progress.percentage}
            height={4}
            backgroundColor={theme.colors.border}
            fillColor={theme.colors.text}
          />
          <Text style={styles.progressText}>
            {typeof eventData.progress.timeRemaining === 'object'
              ? `${eventData.progress.timeRemaining.hours}h ${eventData.progress.timeRemaining.minutes}m remaining`
              : eventData.progress.timeRemaining}
          </Text>
        </View>

        {/* Stats Section */}
        <EventStats
          participantCount={eventData.stats.participantCount}
          completedCount={eventData.stats.completedCount}
        />

        {/* Live Leaderboard with Distribution Panel for Captains */}
        {team && leaderboard && (
          <LiveLeaderboard
            competition={{
              id: eventData.id,
              teamId: team.id,
              name: eventData.name,
              description: eventData.description,
              type: 'event',
              startTime: Math.floor(new Date(eventData.startDate).getTime() / 1000),
              endTime: Math.floor(new Date(eventData.endDate).getTime() / 1000),
              activityType: eventData.details.activityType as any,
              goalType: 'distance' as any,
              entryFeesSats: Math.floor(eventData.prizePool / Math.max(1, eventData.stats.participantCount)),
            }}
            team={team}
            userIsCaptain={userIsCaptain}
            currentUserPubkey={currentUserPubkey || undefined}
            showHeader={false}
          />
        )}

        {/* Fallback Participants Section if no leaderboard */}
        {!leaderboard && (
          <EventParticipants
            participants={eventData.participantDetails}
            totalCount={eventData.stats.participantCount}
          />
        )}

        {/* Event Details Section */}
        <EventDetails
          distance={eventData.details.distance}
          duration={eventData.details.duration}
          activityType={eventData.details.activityType}
          createdBy={eventData.details.createdBy}
          startDate={eventData.details.startDate}
          endDate={eventData.details.endDate}
        />

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionSection}>
        <ActionButton
          title={getActionButtonTitle()}
          onPress={handleJoinToggle}
          variant={getActionButtonVariant()}
          loading={isLoading}
          disabled={
            eventData.status === 'completed' ||
            eventData.progress.daysRemaining === 0
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
    </View>
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
