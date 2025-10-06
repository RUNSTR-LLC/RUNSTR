/**
 * ChallengeDetailScreen - Detailed view of a specific challenge
 * Matches HTML mockup pixel-perfectly for challenge detail view
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
import { RootStackParamList, ChallengeDetailData } from '../types';
import { theme } from '../styles/theme';

// UI Components
import { DetailHeader } from '../components/ui/DetailHeader';
import { TimeRemaining } from '../components/ui/TimeRemaining';
import { ActionButton } from '../components/ui/ActionButton';

// Challenge-specific Components
import { ChallengeHeader } from '../components/challenge/ChallengeHeader';
import { ChallengeVersus } from '../components/challenge/ChallengeVersus';
import { ChallengeStatus } from '../components/challenge/ChallengeStatus';
import { RulesSection } from '../components/challenge/RulesSection';

// Real Data Services
import { ChallengeService } from '../services/competition/ChallengeService';
import { NostrCompetitionLeaderboardService } from '../services/competition/nostrCompetitionLeaderboardService';
import type { CompetitionLeaderboard, CompetitionParticipant } from '../services/competition/nostrCompetitionLeaderboardService';

type ChallengeDetailRouteProp = RouteProp<
  RootStackParamList,
  'ChallengeDetail'
>;
type ChallengeDetailNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ChallengeDetail'
>;

interface ChallengeDetailScreenProps {
  route: ChallengeDetailRouteProp;
  navigation: ChallengeDetailNavigationProp;
}

export const ChallengeDetailScreen: React.FC<ChallengeDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { challengeId } = route.params;
  const [challengeData, setChallengeData] =
    useState<ChallengeDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [watchStatus, setWatchStatus] = useState<
    'not_watching' | 'watching' | 'participating'
  >('not_watching');
  const [leaderboard, setLeaderboard] = useState<CompetitionLeaderboard | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Load challenge data
  useEffect(() => {
    loadChallengeData();
  }, [challengeId]);

  const loadChallengeData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // For now, create a demo challenge scenario
      // In full implementation, challenges would be stored as Nostr events
      const mockChallengeParams = {
        activityType: 'Running',
        goalType: 'distance' as const,
        startTime: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000), // Started 1 day ago
        endTime: Math.floor((Date.now() + 6 * 24 * 60 * 60 * 1000) / 1000), // Ends in 6 days
        goalValue: 10, // 10km challenge
        goalUnit: 'km',
      };

      // Mock participant pubkeys (in real implementation, these would come from challenge event)
      const participant1 = 'npub1participant1example12345678901234567890';
      const participant2 = 'npub1participant2example12345678901234567890';

      // Load real leaderboard data for the challenge
      setIsLoadingLeaderboard(true);
      const leaderboardService = NostrCompetitionLeaderboardService.getInstance();
      
      try {
        const challengeLeaderboard = await leaderboardService.computeChallengeLeaderboard(
          challengeId,
          participant1,
          participant2,
          mockChallengeParams,
          'current_user_id' // TODO: Get actual current user ID from auth
        );
        
        setLeaderboard(challengeLeaderboard);
        
        // Convert leaderboard participants to competitor format
        const competitors = challengeLeaderboard.participants.map((participant: CompetitionParticipant, index: number) => ({
          id: participant.pubkey,
          name: participant.name || `Participant ${index + 1}`,
          avatar: participant.name?.charAt(0).toUpperCase() || `P${index + 1}`,
          score: participant.score,
          position: participant.position || index + 1,
          distance: participant.totalDistance ? `${Math.round(participant.totalDistance / 1000)} km` : '0 km',
          time: participant.totalDuration ? formatDuration(participant.totalDuration) : '0 min',
          workouts: participant.workoutCount || 0,
          isWinner: participant.position === 1 && challengeLeaderboard.participants.length > 1,
          status: 'completed' as const,
          progress: {
            value: participant.totalDistance || 0,
            percentage: Math.min(100, ((participant.totalDistance || 0) / (mockChallengeParams.goalValue || 1) / 1000) * 100),
            unit: 'km'
          }
        }));

        // Calculate time remaining
        const timeRemainingSeconds = mockChallengeParams.endTime - Math.floor(Date.now() / 1000);
        const formattedTimeRemaining = formatTimeRemaining(timeRemainingSeconds);
        const isExpired = timeRemainingSeconds <= 0;
        const isCompleted = isExpired; // For demo purposes

        // Create challenge detail data with real leaderboard
        const challengeDetailData: ChallengeDetailData = {
          id: challengeId,
          name: `${mockChallengeParams.goalValue}${mockChallengeParams.goalUnit} ${mockChallengeParams.activityType} Challenge`,
          description: `Complete ${mockChallengeParams.goalValue} ${mockChallengeParams.goalUnit} of ${mockChallengeParams.activityType.toLowerCase()} before the deadline`,
          prizePool: 1000, // Mock prize pool in sats
          competitors,
          progress: {
            isParticipating: false, // TODO: Check if current user is participating
            isWatching: true,
            status: isCompleted ? 'completed' : (isExpired ? 'completed' : 'active'),
            isCompleted,
            winner: competitors.find(c => c.isWinner),
          },
          timer: {
            timeRemaining: formattedTimeRemaining,
            isExpired,
          },
          rules: [
            {
              id: '1',
              text: `Complete ${mockChallengeParams.goalValue} ${mockChallengeParams.goalUnit} of ${mockChallengeParams.activityType.toLowerCase()} before deadline`,
            },
            { id: '2', text: 'Activities must be tracked and published to Nostr (kind 1301 events)' },
            { id: '3', text: 'Winner determined by total distance covered' },
            { id: '4', text: 'Challenge results updated in real-time from Nostr workout events' },
          ],
          status: isCompleted ? 'completed' : (isExpired ? 'expired' : 'active'),
          formattedPrize: '1000 sats',
          formattedDeadline: new Date(mockChallengeParams.endTime * 1000).toLocaleDateString(),
        };

        setChallengeData(challengeDetailData);
        setTimeRemaining(challengeDetailData.timer.timeRemaining);
        
      } catch (leaderboardError) {
        console.error('Failed to load challenge leaderboard:', leaderboardError);
        
        // Fall back to basic challenge data without leaderboard
        const challengeDetailData: ChallengeDetailData = {
          id: challengeId,
          name: 'Challenge',
          description: 'Head-to-head fitness challenge',
          prizePool: 0,
          competitors: [],
          progress: {
            isParticipating: false,
            isWatching: true,
            status: 'active',
            isCompleted: false,
          },
          timer: {
            timeRemaining: '0d 0h 0m',
            isExpired: false,
          },
          rules: [
            { id: '1', text: 'Complete the challenge requirements before deadline' },
            { id: '2', text: 'Activities must be tracked through RUNSTR app' },
            { id: '3', text: 'Winner takes the full prize pool' },
          ],
          status: 'active',
          formattedPrize: '0 sats',
          formattedDeadline: 'TBD',
        };
        setChallengeData(challengeDetailData);
      } finally {
        setIsLoadingLeaderboard(false);
      }
      
    } catch (err) {
      console.error('Failed to load challenge data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load challenge');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Helper function to format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return '0d 0h 0m';

    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${days}d ${hours}h ${minutes}m`;
  };

  // Timer countdown effect (for live updates)
  useEffect(() => {
    if (
      !challengeData ||
      challengeData.timer.isExpired ||
      challengeData.progress.isCompleted
    ) {
      return;
    }

    const timer = setInterval(() => {
      // TODO: Calculate actual time remaining from deadline
      setTimeRemaining(challengeData?.timer.timeRemaining || '');
    }, 1000);

    return () => clearInterval(timer);
  }, [challengeData]);

  // Handle back navigation
  const handleBack = () => {
    navigation.goBack();
  };

  // Handle share functionality
  const handleShare = async () => {
    if (!challengeData) return;

    try {
      const shareOptions = {
        message: `Check out the ${
          challengeData?.name || 'challenge'
        } challenge on RUNSTR! ${challengeData?.description || ''}`,
        title: `${challengeData?.name || 'Challenge'} - RUNSTR Challenge`,
        url: `runstr://challenges/${challengeId}`,
      };

      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing challenge:', error);
    }
  };

  // Handle watch/participate toggle
  const handleWatchToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Toggle watch status
      const newWatchStatus =
        watchStatus === 'watching' ? 'not_watching' : 'watching';

      setWatchStatus(newWatchStatus);

      const message =
        newWatchStatus === 'watching'
          ? 'You are now watching this challenge!'
          : 'Stopped watching this challenge';

      Alert.alert('Success', message);
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('Error toggling challenge watch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle participate action (for open challenges)
  const handleParticipate = async () => {
    if (isLoading || !challengeData || challengeData.status !== 'pending')
      return;

    Alert.alert(
      'Join Challenge',
      'Are you sure you want to participate in this challenge?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Join',
          onPress: async () => {
            setIsLoading(true);
            try {
              // Simulate API call
              await new Promise((resolve) => setTimeout(resolve, 1500));

              Alert.alert('Success', 'You have joined the challenge!');
              setWatchStatus('participating');
              setChallengeData((prevData) => {
                if (!prevData) return null;
                return {
                  ...prevData,
                  status: 'active',
                };
              });
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to join challenge. Please try again.'
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const getActionButtonTitle = () => {
    if (!challengeData) return '';
    if (challengeData.progress?.isCompleted) {
      return 'Challenge Completed';
    }

    if (challengeData.status === 'pending') {
      return 'Join Challenge';
    }

    if (watchStatus === 'watching') {
      return 'Watching Challenge';
    }

    if (watchStatus === 'participating') {
      return 'Participating ✓';
    }

    return 'Watch Challenge';
  };

  const getActionButtonVariant = () => {
    if (!challengeData) return 'secondary';
    if (
      challengeData.progress?.isCompleted ||
      watchStatus === 'watching' ||
      watchStatus === 'participating'
    ) {
      return 'secondary';
    }
    return 'primary';
  };

  const getActionButtonAction = () => {
    if (!challengeData) return handleWatchToggle;
    if (challengeData.status === 'pending') {
      return handleParticipate;
    }
    return handleWatchToggle;
  };

  const isActionButtonDisabled = () => {
    if (!challengeData) return true;
    return (
      challengeData.progress?.isCompleted || challengeData.timer?.isExpired
    );
  };

  const getAccessibilityLabel = () => {
    if (!challengeData) return 'Challenge';
    if (challengeData.progress?.isCompleted) {
      return 'Challenge completed';
    }
    if (challengeData.status === 'pending') {
      return 'Join challenge';
    }
    if (watchStatus === 'watching') {
      return 'Stop watching challenge';
    }
    if (watchStatus === 'participating') {
      return 'Currently participating in challenge';
    }
    return 'Start watching challenge';
  };

  const getAccessibilityHint = () => {
    if (!challengeData) return 'Loading challenge';
    if (challengeData.progress?.isCompleted) {
      return 'This challenge has been completed';
    }
    if (challengeData.timer?.isExpired) {
      return 'This challenge has expired';
    }
    if (challengeData.status === 'pending') {
      return 'Tap to join this challenge';
    }
    if (watchStatus === 'watching') {
      return 'Tap to stop watching this challenge';
    }
    return 'Tap to start watching this challenge';
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading challenge details...</Text>
      </View>
    );
  }

  // Error state
  if (error || !challengeData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error || 'Challenge not found'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadChallengeData}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Status Bar */}

      {/* Header */}
      <DetailHeader
        title="Challenge Details"
        onBack={handleBack}
        onShare={handleShare}
      />

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Challenge Header Section */}
        <ChallengeHeader
          title={challengeData.name}
          endDate={challengeData.formattedDeadline}
          prizeAmount={challengeData.formattedPrize}
          description={challengeData.description}
        />

        {/* VS Section */}
        <ChallengeVersus
          competitors={challengeData.competitors}
          isCompleted={challengeData.progress?.isCompleted || false}
          winner={challengeData.progress?.winner}
        />

        {/* Current Status Section */}
        <ChallengeStatus
          progress={challengeData.progress}
          isCompleted={challengeData.progress?.isCompleted || false}
          winner={challengeData.progress?.winner}
        />

        {/* Timer Section */}
        <View style={styles.timerSection}>
          <TimeRemaining
            timeRemaining={timeRemaining}
            isExpired={challengeData.timer?.isExpired || false}
            isCompleted={challengeData.progress?.isCompleted || false}
          />
        </View>

        {/* Rules Section */}
        <RulesSection rules={challengeData.rules} />

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionSection}>
        <ActionButton
          title={getActionButtonTitle()}
          onPress={getActionButtonAction()}
          variant={getActionButtonVariant()}
          loading={isLoading}
          disabled={isActionButtonDisabled()}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityHint={getAccessibilityHint()}
        />
      </View>
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
  timerSection: {
    alignItems: 'center',
    marginVertical: 20,
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
    fontWeight: theme.typography.weights.medium,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
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
    fontWeight: theme.typography.weights.semiBold,
  },
});
