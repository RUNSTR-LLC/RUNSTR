/**
 * GlobalChallengeWizard - Global 1v1 challenge creation flow
 * Guides users through creating challenges with any Nostr user
 * Replaces team-only ChallengeCreationWizard for global challenges
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';
import { challengeRequestService } from '../../services/challenge/ChallengeRequestService';
import { userDiscoveryService, type DiscoveredNostrUser } from '../../services/user/UserDiscoveryService';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import type { ActivityConfiguration } from '../../types/challenge';
import QRCodeService, { type ChallengeQRData } from '../../services/qr/QRCodeService';

// Step components
import { UserSearchStep } from './steps/UserSearchStep';
import { ActivityConfigurationStep } from './steps/ActivityConfigurationStep';
import { ChallengeReviewStep } from './steps/ChallengeReviewStep';
import { SuccessScreen } from './steps/SuccessScreen';

type GlobalChallengeStep = 'user_search' | 'activity_config' | 'review' | 'success';

interface GlobalChallengeWizardProps {
  onComplete?: () => void;
  onCancel: () => void;
  preselectedOpponent?: DiscoveredNostrUser; // For in-app challenge buttons
}

interface WizardProgressProps {
  currentStep: GlobalChallengeStep;
}

const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep }) => {
  const steps: GlobalChallengeStep[] = ['user_search', 'activity_config', 'review'];
  const currentIndex = steps.indexOf(currentStep);

  return (
    <View style={styles.progressContainer}>
      {steps.map((step, index) => (
        <View
          key={step}
          style={[
            styles.progressDot,
            index === currentIndex && styles.progressDotActive,
            index < currentIndex && styles.progressDotCompleted,
          ]}
        />
      ))}
    </View>
  );
};

export const GlobalChallengeWizard: React.FC<GlobalChallengeWizardProps> = ({
  onComplete,
  onCancel,
  preselectedOpponent,
}) => {
  // Skip user search if opponent is preselected
  const [currentStep, setCurrentStep] = useState<GlobalChallengeStep>(
    preselectedOpponent ? 'activity_config' : 'user_search'
  );
  const [selectedUser, setSelectedUser] = useState<DiscoveredNostrUser | undefined>(preselectedOpponent);
  const [configuration, setConfiguration] = useState<Partial<ActivityConfiguration>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challengeQRData, setChallengeQRData] = useState<ChallengeQRData | null>(null);

  // Step validation
  const validateCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case 'user_search':
        return !!selectedUser;
      case 'activity_config':
        return !!(
          configuration.activityType &&
          configuration.metric &&
          configuration.duration &&
          configuration.wagerAmount
        );
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedUser, configuration]);

  // Navigation handlers
  const handleNext = useCallback(async () => {
    if (!validateCurrentStep()) {
      return;
    }

    switch (currentStep) {
      case 'user_search':
        setCurrentStep('activity_config');
        break;
      case 'activity_config':
        setCurrentStep('review');
        break;
      case 'review':
        await handleCreateChallenge();
        break;
    }
  }, [currentStep, validateCurrentStep]);

  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'activity_config':
        // Only go back to user search if no preselected opponent
        if (!preselectedOpponent) {
          setCurrentStep('user_search');
        }
        break;
      case 'review':
        setCurrentStep('activity_config');
        break;
    }
  }, [currentStep, preselectedOpponent]);

  const handleCreateChallenge = useCallback(async () => {
    if (!selectedUser || !configuration.activityType || !configuration.metric ||
        !configuration.duration || configuration.wagerAmount === undefined) {
      Alert.alert('Error', 'Please complete all required fields');
      return;
    }

    try {
      setIsSubmitting(true);

      // Get user identifiers
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.hexPubkey) {
        throw new Error('User not authenticated');
      }

      // Create challenge request
      const result = await challengeRequestService.createChallengeRequest(
        {
          challengedPubkey: selectedUser.pubkey,
          activityType: configuration.activityType,
          metric: configuration.metric,
          duration: configuration.duration,
          wagerAmount: configuration.wagerAmount,
        },
        '' // TODO: Pass nsec from user auth
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to create challenge');
      }

      // Add to recent challengers
      await userDiscoveryService.addRecentChallenger(selectedUser.pubkey);

      // Generate QR code data
      const now = Math.floor(Date.now() / 1000);
      const qrData: ChallengeQRData = {
        type: 'challenge',
        id: result.challengeId || '',
        creator_npub: userIdentifiers.hexPubkey,
        name: `${configuration.activityType} Challenge`,
        activity: configuration.activityType,
        metric: configuration.metric,
        duration: configuration.duration,
        wager: configuration.wagerAmount,
        startsAt: now,
        expiresAt: now + (configuration.duration * 24 * 60 * 60),
      };
      setChallengeQRData(qrData);

      // Move to success screen
      setCurrentStep('success');

      console.log(`Challenge created: ${result.challengeId}`);
    } catch (error) {
      console.error('Failed to create challenge:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';

      Alert.alert(
        'Challenge Creation Failed',
        errorMessage,
        [
          {
            text: 'Try Again',
            onPress: () => setIsSubmitting(false),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setIsSubmitting(false);
              onCancel();
            },
          },
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUser, configuration, onCancel]);

  const handleEditOpponent = () => {
    setCurrentStep('user_search');
  };

  const handleEditConfiguration = () => {
    setCurrentStep('activity_config');
  };

  const handleSuccessDone = () => {
    if (onComplete) {
      onComplete();
    }
    onCancel();
  };

  // Can't go back from user search, success, or activity_config if opponent was preselected
  const canGoBack =
    currentStep !== 'user_search' &&
    currentStep !== 'success' &&
    !(currentStep === 'activity_config' && preselectedOpponent);
  const isValid = validateCurrentStep();
  const showActionButton = currentStep !== 'success';

  return (
    <SafeAreaView style={styles.container}>
      {currentStep !== 'success' && (
        <>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.headerButton,
                !canGoBack && styles.headerButtonDisabled,
              ]}
              onPress={handleBack}
              disabled={!canGoBack}
            >
              <Text
                style={[
                  styles.headerButtonText,
                  !canGoBack && styles.headerButtonTextDisabled,
                ]}
              >
                ←
              </Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>New Challenge</Text>

            <TouchableOpacity style={styles.headerButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <WizardProgress currentStep={currentStep} />
        </>
      )}

      {/* Step Content */}
      <View style={styles.content}>
        {currentStep === 'user_search' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Find Opponent</Text>
            <Text style={styles.stepSubtitle}>
              Search any Nostr user globally
            </Text>
            <UserSearchStep
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
            />
          </View>
        )}

        {currentStep === 'activity_config' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Configure Challenge</Text>
            <Text style={styles.stepSubtitle}>
              Set activity type, metric, duration, and wager
            </Text>
            <ActivityConfigurationStep
              configuration={configuration as ActivityConfiguration}
              onUpdateConfiguration={(updates) =>
                setConfiguration((prev) => ({ ...prev, ...updates }))
              }
            />
          </View>
        )}

        {currentStep === 'review' && selectedUser && configuration.activityType && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review Challenge</Text>
            <Text style={styles.stepSubtitle}>
              Confirm details before sending
            </Text>
            <ChallengeReviewStep
              opponent={selectedUser}
              configuration={configuration as ActivityConfiguration}
              onEditOpponent={handleEditOpponent}
              onEditConfiguration={handleEditConfiguration}
            />
          </View>
        )}

        {currentStep === 'success' && selectedUser && (
          <SuccessScreen
            challengeData={{
              opponentInfo: {
                id: selectedUser.pubkey,
                name: selectedUser.displayName || selectedUser.name || 'Unknown',
                avatar: selectedUser.picture || '',
                stats: { challengesCount: 0, winsCount: 0 },
              },
              duration: configuration.duration || 7,
              wagerAmount: configuration.wagerAmount || 0,
            }}
            qrData={challengeQRData}
            onDone={handleSuccessDone}
            isInAppChallenge={!!preselectedOpponent}
          />
        )}
      </View>

      {/* Action Button */}
      {showActionButton && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              (!isValid || isSubmitting) && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.colors.accentText} />
            ) : (
              <Text
                style={[
                  styles.nextButtonText,
                  (!isValid || isSubmitting) && styles.nextButtonTextDisabled,
                ]}
              >
                {currentStep === 'review' ? 'Send Challenge' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButton: {
    padding: 4,
  },
  headerButtonDisabled: {
    opacity: 0.3,
  },
  headerButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  headerButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cancelButtonText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.buttonBorder,
  },
  progressDotActive: {
    backgroundColor: theme.colors.text,
    width: 24,
    borderRadius: 4,
  },
  progressDotCompleted: {
    backgroundColor: theme.colors.textMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: theme.colors.buttonBorder,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
  nextButtonTextDisabled: {
    color: theme.colors.accentText,
  },
});
