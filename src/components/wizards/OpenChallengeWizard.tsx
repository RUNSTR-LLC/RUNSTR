/**
 * OpenChallengeWizard - Create open challenges via QR code
 * 2-step flow: Activity Configuration → QR Code Display
 * No opponent selection - generates shareable QR code instead
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
} from 'react-native';
import { theme } from '../../styles/theme';
import { qrChallengeService } from '../../services/challenge/QRChallengeService';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import type { ActivityConfiguration } from '../../types/challenge';
import type { QRChallengeData } from '../../services/challenge/QRChallengeService';

// Step components
import { ActivityConfigurationStep } from './steps/ActivityConfigurationStep';
import { QRChallengeDisplayStep } from './steps/QRChallengeDisplayStep';

type OpenChallengeStep = 'activity_config' | 'qr_display';

export interface OpenChallengeWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface WizardProgressProps {
  currentStep: OpenChallengeStep;
}

const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep }) => {
  const steps: OpenChallengeStep[] = ['activity_config', 'qr_display'];
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

export const OpenChallengeWizard: React.FC<OpenChallengeWizardProps> = ({
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<OpenChallengeStep>('activity_config');
  const [configuration, setConfiguration] = useState<Partial<ActivityConfiguration>>({});
  const [challengeData, setChallengeData] = useState<QRChallengeData | null>(null);
  const [qrString, setQrString] = useState<string>('');
  const [deepLink, setDeepLink] = useState<string>('');

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
      case 'qr_display':
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
        await handleGenerateQR();
        break;
      case 'qr_display':
        // Done button handled by QRChallengeDisplayStep
        break;
    }
  }, [currentStep, validateCurrentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === 'qr_display') {
      setCurrentStep('activity_config');
    }
  }, [currentStep]);

  /**
   * Generate QR code for open challenge
   */
  const handleGenerateQR = useCallback(async () => {
    if (!configuration.activityType || !configuration.metric ||
        configuration.duration === undefined || configuration.wagerAmount === undefined) {
      Alert.alert('Error', 'Please complete all required fields');
      return;
    }

    try {
      // Get user identifiers
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.hexPubkey) {
        throw new Error('User not authenticated');
      }

      // Get user profile for name
      const userName = userIdentifiers.npub || 'Anonymous';

      // Create QR challenge data
      const data = await qrChallengeService.createQRChallenge(
        {
          activityType: configuration.activityType,
          metric: configuration.metric,
          duration: configuration.duration,
          wagerAmount: configuration.wagerAmount,
        },
        userIdentifiers.hexPubkey,
        userName
      );

      // Generate QR string and deep link
      const qrStr = qrChallengeService.toQRString(data);
      const link = qrChallengeService.toDeepLink(data);

      // Save to state
      setChallengeData(data);
      setQrString(qrStr);
      setDeepLink(link);

      // Move to QR display step
      setCurrentStep('qr_display');

      console.log(`✅ QR Challenge created: ${data.challenge_id}`);
    } catch (error) {
      console.error('Failed to generate QR challenge:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';

      Alert.alert('Generation Failed', errorMessage);
    }
  }, [configuration]);

  const handleDone = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const canGoBack = currentStep === 'qr_display';
  const isValid = validateCurrentStep();

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
          Create Challenge
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

        {currentStep === 'qr_display' && challengeData && (
          <QRChallengeDisplayStep
            challengeData={challengeData}
            qrString={qrString}
            deepLink={deepLink}
            onDone={handleDone}
          />
        )}
      </View>

      {/* Action Button (only on activity config step) */}
      {currentStep === 'activity_config' && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              !isValid && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!isValid}
          >
            <Text
              style={[
                styles.nextButtonText,
                !isValid && styles.nextButtonTextDisabled,
              ]}
            >
              Generate QR Code
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
    color: theme.colors.textMuted,
  },
});
