/**
 * FitnessTestInstructionsModal - Pre-test instructions and overview
 *
 * Displays test format, rules, time limit, and scoring before starting the test.
 * User must acknowledge instructions before timer begins.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../styles/theme';

interface FitnessTestInstructionsModalProps {
  visible: boolean;
  onStart: () => void;
  onCancel: () => void;
}

export const FitnessTestInstructionsModal: React.FC<
  FitnessTestInstructionsModalProps
> = ({ visible, onStart, onCancel }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Header */}
            <Text style={styles.title}>RUNSTR FITNESS TEST</Text>
            <Text style={styles.subtitle}>
              Standardized 3-Component Assessment
            </Text>

            {/* Test Components */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TEST FORMAT</Text>
              <View style={styles.componentList}>
                <View style={styles.componentItem}>
                  <Text style={styles.componentNumber}>1.</Text>
                  <View style={styles.componentDetails}>
                    <Text style={styles.componentName}>Pushups</Text>
                    <Text style={styles.componentDesc}>
                      Max reps in 2 minutes
                    </Text>
                  </View>
                </View>

                <View style={styles.componentItem}>
                  <Text style={styles.componentNumber}>2.</Text>
                  <View style={styles.componentDetails}>
                    <Text style={styles.componentName}>Situps</Text>
                    <Text style={styles.componentDesc}>
                      Max reps in 2 minutes
                    </Text>
                  </View>
                </View>

                <View style={styles.componentItem}>
                  <Text style={styles.componentNumber}>3.</Text>
                  <View style={styles.componentDetails}>
                    <Text style={styles.componentName}>5K Run</Text>
                    <Text style={styles.componentDesc}>
                      Complete 5 kilometers
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Rules */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>RULES</Text>
              <Text style={styles.ruleItem}>
                • Complete exercises in order (pushups → situps → run)
              </Text>
              <Text style={styles.ruleItem}>
                • 60-minute time limit for all three components
              </Text>
              <Text style={styles.ruleItem}>
                • Use the workout tracker to record each exercise
              </Text>
              <Text style={styles.ruleItem}>
                • Return to this screen when done to see results
              </Text>
            </View>

            {/* Scoring */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SCORING</Text>
              <Text style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Pushups/Situps:</Text> 1 rep = 1
                point (max 100)
              </Text>
              <Text style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>5K Run:</Text> Time-based
                scoring (0-100 points)
              </Text>
              <Text style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Total Score:</Text> Sum of all
                three (max 300)
              </Text>
              <View style={styles.gradeTable}>
                <Text style={styles.gradeRow}>270-300: Elite</Text>
                <Text style={styles.gradeRow}>240-269: Advanced</Text>
                <Text style={styles.gradeRow}>210-239: Intermediate</Text>
                <Text style={styles.gradeRow}>180-209: Beginner</Text>
                <Text style={styles.gradeRow}>0-179: Baseline</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.startButton}
              onPress={onStart}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>Start Test</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  modalContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxHeight: '90%',
  },
  scrollView: {
    maxHeight: 600,
  },
  contentContainer: {
    padding: spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.orangeBright,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.headingTertiary,
    fontWeight: typography.weights.semiBold,
    color: colors.orangeDeep,
    marginBottom: spacing.md,
  },
  componentList: {
    gap: spacing.lg,
  },
  componentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  componentNumber: {
    fontSize: typography.headingSecondary,
    fontWeight: typography.weights.bold,
    color: colors.orangeBright,
  },
  componentDetails: {
    flex: 1,
  },
  componentName: {
    fontSize: typography.cardTitle,
    fontWeight: typography.weights.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  componentDesc: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  ruleItem: {
    fontSize: typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  scoreItem: {
    fontSize: typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  scoreLabel: {
    fontWeight: typography.weights.semiBold,
    color: colors.orangeBright,
  },
  gradeTable: {
    marginTop: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.small,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  gradeRow: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.small,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.cardTitle,
    fontWeight: typography.weights.semiBold,
    color: colors.textMuted,
  },
  startButton: {
    flex: 1,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.small,
    backgroundColor: colors.orangeDeep,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: typography.cardTitle,
    fontWeight: typography.weights.bold,
    color: colors.background,
  },
});
