/**
 * ChallengeCreationWizard - Multi-step challenge creation flow
 * Guides users through creating peer-to-peer challenges with teammates
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
import {
  ChallengeCreationStep,
  ChallengeCreationData,
  ChallengeCreationWizardProps,
} from '../../types';
import { useChallengeCreation } from '../../hooks/useChallengeCreation';

// Step components
import { ChooseOpponentStep } from './steps/ChooseOpponentStep';
import { ChallengeTypeStep } from './steps/ChallengeTypeStep';
import { WagerAmountStep } from './steps/WagerAmountStep';
import { ReviewConfirmStep } from './steps/ReviewConfirmStep';
import { SuccessScreen } from './steps/SuccessScreen';

interface WizardProgressProps {
  currentStep: ChallengeCreationStep;
}

const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep }) => {
  const steps: ChallengeCreationStep[] = [
    'choose_opponent',
    'challenge_type',
    'wager_amount',
    'review_confirm',
  ];

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

export const ChallengeCreationWizard: React.FC<
  ChallengeCreationWizardProps
> = ({ onComplete, onCancel, teammates, currentUser, teamId }) => {
  const [currentStep, setCurrentStep] =
    useState<ChallengeCreationStep>('choose_opponent');
  const [formData, setFormData] = useState<ChallengeCreationData>({
    wagerAmount: 1000,
    duration: 7,
  });

  // Use challenge creation hook for data and actions
  const {
    teammates: hookTeammates,
    isLoading,
    error,
    validateWager,
    formatWagerDisplay,
    createChallenge,
    refreshTeammates,
    clearError,
  } = useChallengeCreation({
    currentUser,
    teamId,
    onComplete,
  });

  // Use provided teammates or hook teammates
  const effectiveTeammates = teammates || hookTeammates;

  // Step validation
  const validateCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case 'choose_opponent':
        return !!formData.opponentId && !!formData.opponentInfo;
      case 'challenge_type':
        return !!formData.challengeType;
      case 'wager_amount':
        return validateWager(formData.wagerAmount).isValid;
      case 'review_confirm':
        return true;
      default:
        return false;
    }
  }, [currentStep, formData, validateWager]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) {
      return;
    }

    switch (currentStep) {
      case 'choose_opponent':
        setCurrentStep('challenge_type');
        break;
      case 'challenge_type':
        setCurrentStep('wager_amount');
        break;
      case 'wager_amount':
        // Calculate expiration date
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + formData.duration);
        setFormData((prev) => ({
          ...prev,
          expiresAt: expirationDate.toISOString(),
        }));
        setCurrentStep('review_confirm');
        break;
      case 'review_confirm':
        handleCreateChallenge();
        break;
    }
  }, [currentStep, formData, validateCurrentStep]);

  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'challenge_type':
        setCurrentStep('choose_opponent');
        break;
      case 'wager_amount':
        setCurrentStep('challenge_type');
        break;
      case 'review_confirm':
        setCurrentStep('wager_amount');
        break;
    }
  }, [currentStep]);

  const handleCreateChallenge = useCallback(async () => {
    try {
      // Clear any previous errors
      clearError();

      // Validate all form data before submission
      if (
        !formData.opponentId ||
        !formData.challengeType ||
        !formData.wagerAmount
      ) {
        throw new Error(
          'Please complete all required fields before creating the challenge.'
        );
      }

      // Create challenge using the hook
      await createChallenge(formData);

      // Move to success screen
      setCurrentStep('success');
    } catch (error) {
      console.error('Failed to create challenge:', error);

      // Determine error type and show appropriate message
      let errorTitle = 'Challenge Creation Failed';
      let errorMessage = 'An unexpected error occurred. Please try again.';
      let actions = [
        {
          text: 'Try Again',
          onPress: () => clearError(),
        },
      ];

      if (error instanceof Error) {
        errorMessage = error.message;

        // Handle specific error types
        if (
          error.message.includes('network') ||
          error.message.includes('connection')
        ) {
          errorTitle = 'Connection Error';
          errorMessage = 'Please check your internet connection and try again.';
          actions.push({
            text: 'Retry',
            onPress: () => {
              clearError();
              // Retry after a short delay
              setTimeout(() => handleCreateChallenge(), 1000);
            },
          });
        } else if (
          error.message.includes('insufficient funds') ||
          error.message.includes('balance')
        ) {
          errorTitle = 'Insufficient Balance';
          errorMessage =
            "You don't have enough sats in your wallet for this wager amount.";
          actions = [
            {
              text: 'Add Funds',
              onPress: () => {
                // Navigate to wallet screen (would need navigation prop)
                clearError();
              },
            },
            {
              text: 'Change Amount',
              onPress: () => {
                setCurrentStep('wager_amount');
                clearError();
              },
            },
          ];
        } else if (
          error.message.includes('user not found') ||
          error.message.includes('opponent')
        ) {
          errorTitle = 'Opponent Unavailable';
          errorMessage =
            'The selected opponent is no longer available. Please choose another teammate.';
          actions = [
            {
              text: 'Choose Another',
              onPress: () => {
                setCurrentStep('choose_opponent');
                clearError();
              },
            },
          ];
        }
      }

      Alert.alert(errorTitle, errorMessage, actions);
    }
  }, [formData, createChallenge, clearError, setCurrentStep]);

  // Data update handler
  const updateFormData = useCallback(
    (updates: Partial<ChallengeCreationData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const canGoBack =
    currentStep !== 'choose_opponent' && currentStep !== 'success';
  const isValid = validateCurrentStep();

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
        {currentStep === 'choose_opponent' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose Opponent</Text>
            <Text style={styles.stepSubtitle}>
              Select a teammate to challenge
            </Text>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.text} />
                <Text style={styles.loadingText}>Loading teammates...</Text>
              </View>
            ) : (
              <ChooseOpponentStep
                teammates={effectiveTeammates}
                selectedOpponentId={formData.opponentId}
                onSelectOpponent={(teammate) => {
                  updateFormData({
                    opponentId: teammate.id,
                    opponentInfo: teammate,
                  });
                }}
              />
            )}
          </View>
        )}

        {currentStep === 'challenge_type' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Challenge Type</Text>
            <Text style={styles.stepSubtitle}>
              Choose what kind of challenge you want to create
            </Text>
            <ChallengeTypeStep
              selectedChallengeType={formData.challengeType}
              onSelectChallengeType={(challengeType) => {
                updateFormData({ challengeType });
              }}
            />
          </View>
        )}

        {currentStep === 'wager_amount' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Set Wager</Text>
            <Text style={styles.stepSubtitle}>
              How much are you wagering on this challenge?
            </Text>
            <WagerAmountStep
              wagerAmount={formData.wagerAmount}
              onWagerAmountChange={(wagerAmount) => {
                updateFormData({ wagerAmount });
              }}
            />
          </View>
        )}

        {currentStep === 'review_confirm' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review Challenge</Text>
            <Text style={styles.stepSubtitle}>
              Confirm the details before creating your challenge
            </Text>
            <ReviewConfirmStep challengeData={formData} />
          </View>
        )}

        {currentStep === 'success' && (
          <SuccessScreen
            challengeData={formData}
            onDone={() => {
              // Reset wizard and close
              setCurrentStep('choose_opponent');
              setFormData({ wagerAmount: 1000, duration: 7 });
              onCancel();
            }}
          />
        )}
      </View>

      {/* Action Button */}
      {currentStep !== 'success' && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              (!isValid || isLoading) && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!isValid || isLoading}
          >
            {isLoading && currentStep === 'review_confirm' ? (
              <ActivityIndicator size="small" color={theme.colors.accentText} />
            ) : (
              <Text
                style={[
                  styles.nextButtonText,
                  (!isValid || isLoading) && styles.nextButtonTextDisabled,
                ]}
              >
                {currentStep === 'review_confirm' ? 'Create Challenge' : 'Next'}
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
  placeholder: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 50,
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
    color: theme.colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
