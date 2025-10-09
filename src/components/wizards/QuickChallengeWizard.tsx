/**
 * QuickChallengeWizard - Streamlined challenge creation with preselected opponent
 * Used when tapping challenge icon next to usernames
 * 2-step flow: Activity Configuration → Review & Send
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
  Modal,
} from 'react-native';
import { theme } from '../../styles/theme';
import { challengeRequestService } from '../../services/challenge/ChallengeRequestService';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import UnifiedSigningService from '../../services/auth/UnifiedSigningService';
import type { ActivityConfiguration } from '../../types/challenge';
import type { DiscoveredNostrUser } from '../../services/user/UserDiscoveryService';

// Step components
import { ActivityConfigurationStep } from './steps/ActivityConfigurationStep';
import { ChallengeReviewStep } from './steps/ChallengeReviewStep';

type QuickChallengeStep = 'activity_config' | 'review';

export interface QuickChallengeWizardProps {
  opponent: DiscoveredNostrUser | {
    pubkey: string;
    name: string;
    displayName?: string;
    picture?: string;
    npub?: string;
  };
  onComplete: () => void;
  onCancel: () => void;
}

interface WizardProgressProps {
  currentStep: QuickChallengeStep;
}

const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep }) => {
  const steps: QuickChallengeStep[] = ['activity_config', 'review'];
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

export const QuickChallengeWizard: React.FC<QuickChallengeWizardProps> = ({
  opponent,
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<QuickChallengeStep>('activity_config');
  const [configuration, setConfiguration] = useState<Partial<ActivityConfiguration>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Normalize opponent data to DiscoveredNostrUser format
  const normalizedOpponent: DiscoveredNostrUser = {
    pubkey: opponent.pubkey,
    npub: opponent.npub || opponent.pubkey,
    name: opponent.name,
    displayName: opponent.displayName,
    picture: opponent.picture,
    activityStatus: 'active' as const,
  };

  // Step validation
  const validateCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case 'activity_config':
        return !!(
          configuration.activityType &&
          configuration.metric &&
          configuration.duration !== undefined &&
          configuration.wagerAmount !== undefined
        );
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, configuration]);

  // Navigation handlers
  const handleNext = useCallback(async () => {
    if (!validateCurrentStep()) {
      return;
    }

    switch (currentStep) {
      case 'activity_config':
        setCurrentStep('review');
        break;
      case 'review':
        await handleSendChallenge();
        break;
    }
  }, [currentStep, validateCurrentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === 'review') {
      setCurrentStep('activity_config');
    }
  }, [currentStep]);

  const handleSendChallenge = useCallback(async () => {
    if (!configuration.activityType || !configuration.metric ||
        configuration.duration === undefined || configuration.wagerAmount === undefined) {
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

      // Get signer from UnifiedSigningService (works for both nsec and Amber)
      const signer = await UnifiedSigningService.getSigner();
      if (!signer) {
        throw new Error('Cannot access signing capability. Please ensure you are logged in.');
      }

      // Create challenge request with actual Nostr publishing
      const result = await challengeRequestService.createChallengeRequest(
        {
          challengedPubkey: opponent.pubkey,
          activityType: configuration.activityType,
          metric: configuration.metric,
          duration: configuration.duration,
          wagerAmount: configuration.wagerAmount,
        },
        signer
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to send challenge');
      }

      console.log(`✅ Challenge sent successfully: ${result.challengeId}`);

      // Show success and close
      Alert.alert(
        'Challenge Sent!',
        `Your challenge has been sent to ${opponent.name || 'your opponent'}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onComplete();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to send challenge:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';

      Alert.alert(
        'Challenge Failed',
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
  }, [opponent, configuration, onComplete, onCancel]);

  const handleEditConfiguration = () => {
    setCurrentStep('activity_config');
  };

  const canGoBack = currentStep === 'review';
  const isValid = validateCurrentStep();

  // Get opponent display name
  const opponentName = opponent.displayName || opponent.name || 'Opponent';

  return (
    <SafeAreaView style={styles.container}>
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

        <Text style={styles.headerTitle} numberOfLines={1}>
          Challenge {opponentName}
        </Text>

        <TouchableOpacity style={styles.headerButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <WizardProgress currentStep={currentStep} />

      {/* Step Content */}
      <View style={styles.content}>
        {currentStep === 'activity_config' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Challenge Details</Text>
            <Text style={styles.stepSubtitle}>
              Choose activity, metric, and duration
            </Text>
            <ActivityConfigurationStep
              configuration={configuration as ActivityConfiguration}
              onUpdateConfiguration={(updates) =>
                setConfiguration((prev) => ({ ...prev, ...updates }))
              }
            />
          </View>
        )}

        {currentStep === 'review' && configuration.activityType && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review Challenge</Text>
            <Text style={styles.stepSubtitle}>
              Confirm details before sending
            </Text>
            <ChallengeReviewStep
              opponent={normalizedOpponent}
              configuration={configuration as ActivityConfiguration}
              onEditConfiguration={handleEditConfiguration}
            />
          </View>
        )}
      </View>

      {/* Action Button */}
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
    minWidth: 60,
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'right',
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
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
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
