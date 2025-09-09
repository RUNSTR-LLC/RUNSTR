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
import { ChallengeService } from '../services/challengeService';

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

  // Load challenge data
  useEffect(() => {
    loadChallengeData();
  }, [challengeId]);

  const loadChallengeData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // For now, we'll fetch pending challenges and find the one we need
      // In a full implementation, there would be a getChallengeById method
      const pendingChallenges = await ChallengeService.getUserPendingChallenges(
        'current-user-id'
      );
      const challenge = pendingChallenges.find((c) => c.id === challengeId);

      if (!challenge) {
        throw new Error(`Challenge not found: ${challengeId}`);
      }

      // Convert Challenge to ChallengeDetailData (simplified for now)
      const challengeDetailData: ChallengeDetailData = {
        id: challenge.id,
        name: challenge.name || 'Challenge',
        description: challenge.description || 'No description available',
        prizePool: challenge.prizePool || 0,
        competitors: [], // TODO: Get actual competitor data
        progress: {
          isParticipating: false,
          isWatching: true,
          status:
            challenge.status === 'completed'
              ? 'completed'
              : challenge.status === 'pending'
              ? 'expired'
              : 'active',
          isCompleted: challenge.status === 'completed',
        },
        timer: {
          timeRemaining: '0d 0h 0m', // TODO: Calculate actual time remaining
          isExpired: false,
        },
        rules: [
          {
            id: '1',
            text: 'Complete the challenge requirements before deadline',
          },
          { id: '2', text: 'Activities must be tracked through RUNSTR app' },
          { id: '3', text: 'Winner takes the full prize pool' },
        ],
        status: challenge.status as
          | 'pending'
          | 'accepted'
          | 'active'
          | 'completed'
          | 'disputed',
        formattedPrize: `${challenge.prizePool || 0} sats`,
        formattedDeadline: 'To be calculated', // TODO: Format actual deadline
      };

      setChallengeData(challengeDetailData);
      setTimeRemaining(challengeDetailData.timer.timeRemaining);
    } catch (err) {
      console.error('Failed to load challenge data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load challenge');
    } finally {
      setIsLoading(false);
    }
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
    <View style={styles.container}>
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
