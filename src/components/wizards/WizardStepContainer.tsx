/**
 * WizardStepContainer - Reusable step container for Event/League creation wizards
 * Provides navigation, progress indicator, and validation handling
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { theme } from '../../styles/theme';

export interface WizardStep {
  id: string;
  title: string;
  isValid: boolean;
}

interface WizardStepContainerProps {
  visible: boolean;
  currentStep: number;
  steps: WizardStep[];
  wizardTitle: string;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLastStep: boolean;
  children: React.ReactNode;
  isProcessing?: boolean;
  processingText?: string;
}

export const WizardStepContainer: React.FC<WizardStepContainerProps> = ({
  visible,
  currentStep,
  steps,
  wizardTitle,
  onClose,
  onNext,
  onPrevious,
  onComplete,
  canGoNext,
  canGoPrevious,
  isLastStep,
  children,
  isProcessing = false,
  processingText = 'Processing...',
}) => {
  const currentStepData = steps[currentStep];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.wizardTitle}>{wizardTitle}</Text>
            <Text style={styles.stepTitle}>{currentStepData?.title}</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <View
                  style={[
                    styles.progressDot,
                    index <= currentStep && styles.progressDotActive,
                    step.isValid &&
                      index < currentStep &&
                      styles.progressDotCompleted,
                  ]}
                >
                  {step.isValid && index < currentStep ? (
                    <Text style={styles.progressDotCheck}>✓</Text>
                  ) : (
                    <Text style={styles.progressDotNumber}>{index + 1}</Text>
                  )}
                </View>
                {index < steps.length - 1 && (
                  <View
                    style={[
                      styles.progressLine,
                      index < currentStep && styles.progressLineActive,
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Step Content */}
        <View style={styles.content}>{children}</View>

        {/* Navigation Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.navigationButton,
              styles.previousButton,
              !canGoPrevious && styles.navigationButtonDisabled,
            ]}
            onPress={onPrevious}
            disabled={!canGoPrevious}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navigationButtonText,
                !canGoPrevious && styles.navigationButtonTextDisabled,
              ]}
            >
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navigationButton,
              styles.nextButton,
              (!canGoNext || isProcessing) && styles.navigationButtonDisabled,
            ]}
            onPress={isLastStep ? onComplete : onNext}
            disabled={!canGoNext || isProcessing}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navigationButtonText,
                styles.nextButtonText,
                (!canGoNext || isProcessing) && styles.navigationButtonTextDisabled,
              ]}
            >
              {isProcessing && isLastStep ? processingText : (isLastStep ? 'Create' : 'Next')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: theme.colors.cardBackground,
  },

  closeButtonText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },

  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  wizardTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  stepTitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },

  headerSpacer: {
    width: 32,
  },

  // Progress indicator styles
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressDotActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },

  progressDotCompleted: {
    backgroundColor: '#10b981', // Green for completed
    borderColor: '#10b981',
  },

  progressDotNumber: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },

  progressDotCheck: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },

  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
  },

  progressLineActive: {
    backgroundColor: theme.colors.accent,
  },

  // Content styles
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Footer navigation styles
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },

  navigationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  previousButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  nextButton: {
    backgroundColor: theme.colors.accent,
  },

  navigationButtonDisabled: {
    opacity: 0.5,
  },

  navigationButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  nextButtonText: {
    color: theme.colors.accentText,
  },

  navigationButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
});
