/**
 * TeamCreationWizard - Multi-step team creation flow for team captains
 * Guides captains through team setup, league configuration, and launch
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../styles/theme';
import { TeamCreationStep, TeamCreationData, User } from '../../types';
import { TeamBasicsStep } from './steps/TeamBasicsStep';
import { LeagueSettingsStep } from './steps/LeagueSettingsStep';
import { FirstEventStep } from './steps/FirstEventStep';
// TeamWalletSetupStep removed - using P2P NIP-60/61 payments
import { ReviewLaunchStep } from './steps/ReviewLaunchStep';

interface TeamCreationWizardProps {
  currentUser: User; // Authenticated user with real Nostr identity
  onComplete: (teamData: TeamCreationData, teamId?: string) => void;
  onCancel: () => void;
  onNavigateToTeam?: (teamId: string) => void; // Direct navigation to team dashboard
}

export const TeamCreationWizard: React.FC<TeamCreationWizardProps> = ({
  currentUser,
  onComplete,
  onCancel,
  onNavigateToTeam,
}) => {
  const [currentStep, setCurrentStep] =
    useState<TeamCreationStep>('team_basics');
  const [formData, setFormData] = useState<TeamCreationData>({
    teamName: '',
    teamAbout: '',
  });
  const [teamCode, setTeamCode] = useState<string>('');

  // Step progression handlers
  const handleNext = () => {
    // Validate current step before progressing
    if (!validateCurrentStep()) {
      return;
    }

    // Progress to next step - Simplified for Phase 2 (Nostr-only)
    switch (currentStep) {
      case 'team_basics':
        setCurrentStep('review_launch'); // Skip to review for Phase 2
        break;
      case 'review_launch':
        onComplete(formData);
        break;
    }
  };

  const handlePrevious = () => {
    switch (currentStep) {
      case 'review_launch':
        setCurrentStep('team_basics');
        break;
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  // Go to specific step (for edit functionality)
  const goToStep = (step: TeamCreationStep) => {
    setCurrentStep(step);
  };

  // Handle team launch completion
  const handleLaunchComplete = (code: string, teamId?: string) => {
    setTeamCode(code);
    onComplete(formData, teamId);
  };

  // Update form data
  const updateFormData = (updates: Partial<TeamCreationData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Validate current step
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 'team_basics':
        return (
          formData.teamName.trim().length >= 3 &&
          formData.teamAbout.trim().length >= 20
        );
      case 'league_settings':
        return !!(
          formData.competitionType &&
          formData.duration &&
          formData.payoutStructure &&
          formData.prizePool
        );
      case 'first_event':
        return !!(
          formData.eventName &&
          formData.eventType &&
          formData.eventStartDate &&
          formData.eventStartTime &&
          formData.eventPrizeAmount
        );
      case 'wallet_setup':
        return !!formData.walletCreated;
      default:
        return true;
    }
  };

  // Helper function to get step number for progress
  const getStepNumber = (step: TeamCreationStep): number => {
    const stepOrder: TeamCreationStep[] = [
      'team_basics',
      'review_launch', // Simplified to 2 steps for Phase 2
    ];
    return stepOrder.indexOf(step) + 1;
  };

  // Step progress calculation
  const getStepProgress = () => {
    const stepOrder: TeamCreationStep[] = [
      'team_basics',
      'review_launch', // Simplified to 2 steps for Phase 2
    ];
    const currentIndex = stepOrder.indexOf(currentStep);
    return {
      current: currentIndex + 1,
      total: stepOrder.length,
      progress: ((currentIndex + 1) / stepOrder.length) * 100,
    };
  };

  // Get step titles
  const getStepTitle = (step: TeamCreationStep): string => {
    const stepTitles = {
      team_basics: 'Team Basics',
      league_settings: 'League Settings',
      first_event: 'First Event',
      wallet_setup: 'Team Wallet Setup',
      review_launch: 'Review & Launch',
    };
    return stepTitles[step];
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'team_basics':
        return (
          <TeamBasicsStep
            data={formData}
            onUpdate={updateFormData}
            isValid={validateCurrentStep()}
          />
        );
      case 'review_launch':
        return (
          <ReviewLaunchStep
            data={formData}
            currentUser={currentUser}
            onDataChange={updateFormData}
            onNext={handleNext}
            onBack={handlePrevious}
            onEditStep={goToStep}
            onLaunchComplete={handleLaunchComplete}
            onNavigateToTeam={onNavigateToTeam}
          />
        );
      default:
        return (
          <View style={styles.placeholderStep}>
            <Text style={styles.placeholderText}>
              Unknown step: {currentStep}
            </Text>
          </View>
        );
    }
  };

  const progress = getStepProgress();
  const isFirstStep = currentStep === 'team_basics';
  const isLastStep = currentStep === 'review_launch';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[styles.backBtn, isFirstStep && styles.disabledBtn]}
            onPress={handlePrevious}
            disabled={isFirstStep}
          >
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Team</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleCancel}>
          <Text style={styles.closeBtnText}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${progress.progress}%` }]}
          />
        </View>
        <View style={styles.progressText}>
          <Text style={styles.stepInfo}>
            Step {progress.current} of {progress.total}
          </Text>
          <Text style={styles.stepTitle}>{getStepTitle(currentStep)}</Text>
        </View>
      </View>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation - Hide on review step since it has its own launch button */}
      {currentStep !== 'review_launch' && (
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.navBtn, isFirstStep && styles.disabledNavBtn]}
            onPress={handlePrevious}
            disabled={isFirstStep}
          >
            <Text
              style={[
                styles.navBtnText,
                isFirstStep && styles.disabledNavBtnText,
              ]}
            >
              Back
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navBtn,
              styles.primaryNavBtn,
              !validateCurrentStep() && styles.disabledNavBtn,
            ]}
            onPress={handleNext}
            disabled={!validateCurrentStep()}
          >
            <Text
              style={[
                styles.primaryNavBtnText,
                !validateCurrentStep() && styles.disabledPrimaryBtnText,
              ]}
            >
              Next
            </Text>
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

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  backBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    backgroundColor: 'transparent',
  },

  disabledBtn: {
    opacity: 0.3,
  },

  backBtnText: {
    color: theme.colors.text,
    fontSize: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },

  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    backgroundColor: 'transparent',
  },

  closeBtnText: {
    color: theme.colors.text,
    fontSize: 16,
  },

  // Progress Styles
  progressSection: {
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },

  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.text,
    borderRadius: 2,
  },

  progressText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stepInfo: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  stepTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  // Navigation Styles
  navigation: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    gap: 12,
  },

  navBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },

  primaryNavBtn: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },

  disabledNavBtn: {
    opacity: 0.3,
  },

  navBtnText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  disabledNavBtnText: {
    color: theme.colors.textMuted,
  },

  primaryNavBtnText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },

  disabledPrimaryBtnText: {
    color: theme.colors.textMuted,
  },

  // Placeholder Styles (for future steps)
  placeholderStep: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  placeholderText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
