/**
 * FitnessTestResultsScreen - Display RUNSTR Fitness Test results
 *
 * Shows test scores, grade badge, and publishing options to Nostr.
 * Allows viewing test history and comparing against previous attempts.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import FitnessTestService from '../services/fitness/FitnessTestService';
import type { FitnessTestResult } from '../types/fitnessTest';
import { FITNESS_TEST_GRADES } from '../types/fitnessTest';
import WorkoutCardGenerator from '../services/nostr/workoutCardGenerator';
import WorkoutPublishingService from '../services/nostr/workoutPublishingService';

type RouteParams = {
  FitnessTestResults: {
    testId: string;
  };
};

export const FitnessTestResultsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'FitnessTestResults'>>();
  const { testId } = route.params;

  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<FitnessTestResult | null>(null);
  const [personalBest, setPersonalBest] = useState<FitnessTestResult | null>(
    null
  );
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadTestResult();
  }, [testId]);

  const loadTestResult = async () => {
    try {
      setLoading(true);

      // Load test result
      const result = await FitnessTestService.getTestById(testId);
      setTestResult(result);

      // Load personal best for comparison
      const best = await FitnessTestService.getPersonalBest();
      setPersonalBest(best);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load test result:', error);
      setLoading(false);
    }
  };

  const handlePublishToNostr = async (kind: 'kind1301' | 'kind1') => {
    if (!testResult) return;

    try {
      setPublishing(true);

      if (kind === 'kind1') {
        // Generate beautiful social card
        console.log('🎨 Generating fitness test social card...');
        const cardGenerator = WorkoutCardGenerator;

        const cardData = await cardGenerator.generateFitnessTestCard({
          score: testResult.compositeScore,
          maxScore: 300,
          grade: testResult.grade,
          duration: testResult.testDuration,
          components: {
            pushups: testResult.pushups as { reps: number; score: number; } | null,
            situps: testResult.situps as { reps: number; score: number; } | null,
            run5k: testResult.run as { timeSeconds: number; score: number; } | null,
          },
        });

        // Upload and publish card
        console.log('📤 Publishing fitness test card to Nostr...');
        const publishingService = WorkoutPublishingService;

        const eventId = await (publishingService as any).uploadCardAndPublish(
          cardData.svgContent,
          `RUNSTR Fitness Test - ${testResult.compositeScore}/300 (${testResult.grade})`,
          {
            workoutId: testResult.id,
            activityType: 'fitness_test',
            score: testResult.compositeScore.toString(),
            grade: testResult.grade,
          }
        );

        console.log(`✅ Fitness test card published: ${eventId}`);

        // Mark as published
        await FitnessTestService.markAsPublished(testId, kind, eventId);
      } else {
        // kind 1301: Structured fitness test data
        // TODO: Implement structured data publishing if needed
        console.log('Publishing as kind 1301 not yet implemented');
      }

      // Reload result to show updated published status
      await loadTestResult();

      setPublishing(false);
    } catch (error) {
      console.error('❌ Failed to publish test:', error);
      setPublishing(false);
    }
  };

  const handleViewHistory = () => {
    // TODO: Navigate to test history screen
    console.log('View test history');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.orangeBright} />
          <Text style={styles.loadingText}>Loading results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!testResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={theme.colors.textMuted}
          />
          <Text style={styles.errorText}>Test results not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const gradeInfo = FITNESS_TEST_GRADES.find(
    (g) => g.name === testResult.grade
  );
  const isPersonalBest = personalBest && testResult.id === personalBest.id;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Results</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Composite Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreTitle}>Your Score</Text>
            {isPersonalBest && (
              <View style={styles.pbBadge}>
                <Ionicons
                  name="trophy"
                  size={16}
                  color={theme.colors.background}
                />
                <Text style={styles.pbText}>PB</Text>
              </View>
            )}
          </View>

          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{testResult.compositeScore}</Text>
            <Text style={styles.scoreMax}>/ 300</Text>
          </View>

          <View style={styles.gradeBadge}>
            <Text style={styles.gradeEmoji}>{gradeInfo?.emoji}</Text>
            <Text style={styles.gradeName}>{testResult.grade}</Text>
          </View>

          <Text style={styles.testDuration}>
            Completed in {formatDuration(testResult.testDuration)}
          </Text>
        </View>

        {/* Component Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Component Breakdown</Text>

          {/* Pushups */}
          <View style={styles.componentRow}>
            <View style={styles.componentInfo}>
              <Text style={styles.componentName}>Pushups</Text>
              {testResult.pushups ? (
                <Text style={styles.componentDetails}>
                  {testResult.pushups.reps} reps
                </Text>
              ) : (
                <Text style={styles.componentMissing}>Not completed</Text>
              )}
            </View>
            <Text style={styles.componentScore}>
              {testResult.pushups?.score ?? 0} pts
            </Text>
          </View>

          {/* Situps */}
          <View style={styles.componentRow}>
            <View style={styles.componentInfo}>
              <Text style={styles.componentName}>Situps</Text>
              {testResult.situps ? (
                <Text style={styles.componentDetails}>
                  {testResult.situps.reps} reps
                </Text>
              ) : (
                <Text style={styles.componentMissing}>Not completed</Text>
              )}
            </View>
            <Text style={styles.componentScore}>
              {testResult.situps?.score ?? 0} pts
            </Text>
          </View>

          {/* 5K Run */}
          <View style={styles.componentRow}>
            <View style={styles.componentInfo}>
              <Text style={styles.componentName}>5K Run</Text>
              {testResult.run ? (
                <Text style={styles.componentDetails}>
                  {formatTime(testResult.run.timeSeconds!)}
                </Text>
              ) : (
                <Text style={styles.componentMissing}>Not completed</Text>
              )}
            </View>
            <Text style={styles.componentScore}>
              {testResult.run?.score ?? 0} pts
            </Text>
          </View>
        </View>

        {/* Publishing Options */}
        <View style={styles.publishingCard}>
          <Text style={styles.publishingTitle}>Share Your Results</Text>

          <TouchableOpacity
            style={[
              styles.publishButton,
              testResult.kind1301EventId && styles.publishedButton,
            ]}
            onPress={() => handlePublishToNostr('kind1301')}
            disabled={publishing || !!testResult.kind1301EventId}
          >
            <Ionicons
              name={
                testResult.kind1301EventId
                  ? 'checkmark-circle'
                  : 'cloud-upload-outline'
              }
              size={20}
              color={
                testResult.kind1301EventId
                  ? theme.colors.success
                  : theme.colors.background
              }
            />
            <Text
              style={[
                styles.publishButtonText,
                testResult.kind1301EventId && styles.publishedButtonText,
              ]}
            >
              {testResult.kind1301EventId ? 'Competing' : 'Compete'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.publishButton,
              styles.shareButton,
              testResult.kind1EventId && styles.publishedButton,
            ]}
            onPress={() => handlePublishToNostr('kind1')}
            disabled={publishing || !!testResult.kind1EventId}
          >
            <Ionicons
              name={
                testResult.kind1EventId
                  ? 'checkmark-circle'
                  : 'chatbubble-outline'
              }
              size={20}
              color={
                testResult.kind1EventId
                  ? theme.colors.success
                  : theme.colors.background
              }
            />
            <Text
              style={[
                styles.publishButtonText,
                testResult.kind1EventId && styles.publishedButtonText,
              ]}
            >
              {testResult.kind1EventId ? 'Posted' : 'Post'}
            </Text>
          </TouchableOpacity>

          {publishing && (
            <ActivityIndicator
              size="small"
              color={theme.colors.orangeBright}
              style={styles.publishingLoader}
            />
          )}
        </View>

        {/* View History Button */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={handleViewHistory}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.historyButtonText}>View Test History</Text>
        </TouchableOpacity>

        {/* Test Date */}
        <Text style={styles.testDate}>
          Completed {new Date(testResult.timestamp).toLocaleString()}
        </Text>
      </ScrollView>
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
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.orangeBright,
    fontWeight: theme.typography.weights.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.orangeDeep,
    borderRadius: theme.borderRadius.small,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  scoreCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textPrimary,
  },
  pbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.orangeBright,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
  },
  pbText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },
  scoreCircle: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
  },
  scoreMax: {
    fontSize: 24,
    color: theme.colors.textMuted,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.medium,
    marginBottom: 12,
  },
  gradeEmoji: {
    fontSize: 24,
  },
  gradeName: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
  },
  testDuration: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  breakdownCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  componentInfo: {
    flex: 1,
  },
  componentName: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  componentDetails: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  componentMissing: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  componentScore: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
  },
  publishingCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    marginBottom: 16,
    gap: 12,
  },
  publishingTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.text,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.small,
  },
  shareButton: {
    backgroundColor: theme.colors.text,
  },
  publishedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  publishButtonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
  publishedButtonText: {
    color: theme.colors.textSecondary,
  },
  publishingLoader: {
    marginTop: 8,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.small,
    marginBottom: 16,
  },
  historyButtonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
  },
  testDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
