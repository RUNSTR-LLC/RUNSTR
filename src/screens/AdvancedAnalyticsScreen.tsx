/**
 * Advanced Analytics Screen
 * Privacy-first local analytics dashboard
 * All calculations happen on-device using local workout data
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
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { PrivacyNoticeModal } from '../components/ui/PrivacyNoticeModal';
import localWorkoutStorage from '../services/fitness/LocalWorkoutStorageService';
import type { LocalWorkout } from '../services/fitness/LocalWorkoutStorageService';
import unifiedCache from '../services/cache/UnifiedNostrCache';
import { CacheKeys, CacheTTL } from '../constants/cacheTTL';
import { Nuclear1301Service } from '../services/fitness/Nuclear1301Service';
import type { NostrWorkout } from '../types/nostrWorkout';
import type { AnalyticsSummary, HealthProfile } from '../types/analytics';
import { CardioPerformanceAnalytics } from '../services/analytics/CardioPerformanceAnalytics';
import { BodyCompositionAnalytics } from '../services/analytics/BodyCompositionAnalytics';
import { StreakAnalyticsService } from '../services/analytics/StreakAnalyticsService';
import { HealthSnapshotCard } from '../components/analytics/HealthSnapshotCard';
import { LevelCard } from '../components/analytics/LevelCard';
import { GoalsHabitsCard } from '../components/analytics/GoalsHabitsCard';
import { CollapsibleAchievementsCard } from '../components/analytics/CollapsibleAchievementsCard';
import { FitnessTestInstructionsModal } from '../components/fitness/FitnessTestInstructionsModal';
import FitnessTestService from '../services/fitness/FitnessTestService';
import { PersonalRecordsService } from '../services/analytics/PersonalRecordsService';
import type { AllPersonalRecords } from '../services/analytics/PersonalRecordsService';

const PRIVACY_NOTICE_KEY = '@runstr:analytics_privacy_accepted';
const HEALTH_PROFILE_KEY = '@runstr:health_profile';
const MAX_TEST_DURATION = 3600; // 60 minutes in seconds

export const AdvancedAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(
    null
  );
  const [personalRecords, setPersonalRecords] =
    useState<AllPersonalRecords | null>(null);

  // Fitness Test state
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [isTestActive, setIsTestActive] = useState(false);
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    initializeAnalytics();
    checkActiveTest();
  }, []);

  // Timer effect for fitness test
  useEffect(() => {
    if (!isTestActive || !testStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
      setElapsedSeconds(elapsed);

      // Auto-finish if max duration reached
      if (elapsed >= MAX_TEST_DURATION) {
        handleFinishTest();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTestActive, testStartTime]);

  const initializeAnalytics = async () => {
    try {
      // Check if user has accepted privacy notice
      const privacyAccepted = await AsyncStorage.getItem(PRIVACY_NOTICE_KEY);

      if (!privacyAccepted) {
        setShowPrivacyModal(true);
        setLoading(false);
        return;
      }

      // Load and calculate analytics
      await loadAnalytics();
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      console.log(
        '[AdvancedAnalytics] Loading analytics with complete workout dataset...'
      );

      // Load health profile
      const profileData = await AsyncStorage.getItem(HEALTH_PROFILE_KEY);
      let profile: HealthProfile | null = null;
      try {
        profile = profileData ? JSON.parse(profileData) : null;
      } catch (e) {
        console.warn('[AdvancedAnalytics] Failed to parse health profile:', e);
        profile = null;
      }
      setHealthProfile(profile);

      // Get ALL local workouts (includes GPS, manual, daily steps, AND imported Nostr)
      const allWorkouts = await localWorkoutStorage.getAllWorkouts();
      console.log(
        `[AdvancedAnalytics] Total workouts for analytics: ${allWorkouts.length}`
      );
      setWorkouts(allWorkouts);

      // Calculate simplified analytics (5 metrics only)

      // 1. VO2 Max + Body Composition (for Health Snapshot Card)
      const cardioMetrics = profile
        ? CardioPerformanceAnalytics.calculateMetrics(allWorkouts, profile)
        : CardioPerformanceAnalytics.calculateMetrics(allWorkouts);

      const bodyComposition =
        profile && (profile.weight || profile.height)
          ? BodyCompositionAnalytics.calculateMetrics(profile, allWorkouts)
          : undefined;

      // 2. Personal Records (for Achievements Card)
      const prs = PersonalRecordsService.getAllPRs(allWorkouts);

      // Store simplified analytics
      const summary: AnalyticsSummary = {
        cardio: cardioMetrics || undefined,
        bodyComposition: bodyComposition || undefined,
        lastUpdated: new Date().toISOString(),
      };

      setAnalytics(summary);
      setPersonalRecords(prs);

      setLoading(false);
      console.log('[AdvancedAnalytics] ✅ Analytics calculation complete');
    } catch (error) {
      console.error('[AdvancedAnalytics] ❌ Failed to load analytics:', error);
      setLoading(false);
    }
  };

  const handlePrivacyAccept = async () => {
    try {
      await AsyncStorage.setItem(PRIVACY_NOTICE_KEY, 'true');
      setShowPrivacyModal(false);
      await loadAnalytics();
    } catch (error) {
      console.error('Failed to save privacy acceptance:', error);
    }
  };

  const handlePrivacyClose = () => {
    setShowPrivacyModal(false);
    navigation.goBack(); // Go back if user declines
  };

  // Check if there's an active fitness test on mount
  const checkActiveTest = async () => {
    try {
      const activeTest = await FitnessTestService.getActiveTest();
      if (activeTest) {
        setIsTestActive(true);
        setTestStartTime(activeTest.startTime);
        const elapsed = Math.floor((Date.now() - activeTest.startTime) / 1000);
        setElapsedSeconds(elapsed);
        console.log('[FitnessTest] Resumed active test:', activeTest.id);
      }
    } catch (error) {
      console.error('[FitnessTest] Failed to check active test:', error);
    }
  };

  const handleStartFitnessTest = () => {
    setShowInstructionsModal(true);
  };

  const handleInstructionsStart = async () => {
    try {
      setShowInstructionsModal(false);
      const testId = await FitnessTestService.startTest();
      setIsTestActive(true);
      setTestStartTime(Date.now());
      setElapsedSeconds(0);
      console.log('[FitnessTest] Test started:', testId);
    } catch (error) {
      console.error('[FitnessTest] Failed to start test:', error);
    }
  };

  const handleCancelTest = async () => {
    try {
      await FitnessTestService.cancelTest();
      setIsTestActive(false);
      setTestStartTime(null);
      setElapsedSeconds(0);
      console.log('[FitnessTest] Test canceled');
    } catch (error) {
      console.error('[FitnessTest] Failed to cancel test:', error);
    }
  };

  const handleFinishTest = async () => {
    try {
      const result = await FitnessTestService.finishTest();
      setIsTestActive(false);
      setTestStartTime(null);
      setElapsedSeconds(0);
      console.log('[FitnessTest] Test finished:', result);

      // Navigate to results screen
      (navigation as any).navigate('FitnessTestResults', { testId: result.id });
    } catch (error) {
      console.error('[FitnessTest] Failed to finish test:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Calculating analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Experimental</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* RUNSTR Rank (Web of Trust) */}
        <LevelCard />

        {/* Achievements (Personal Records) */}
        {personalRecords && (
          <CollapsibleAchievementsCard personalRecords={personalRecords} />
        )}

        {/* Section 3: Goals & Habits */}
        <GoalsHabitsCard />

        {/* RUNSTR Fitness Test Card - HIDDEN FOR NOW
        <View style={styles.fitnessTestCard}>
          <View style={styles.fitnessTestHeader}>
            <Ionicons name="timer-outline" size={24} color="#FF9D42" />
            <Text style={styles.fitnessTestTitle}>RUNSTR Fitness Test</Text>
          </View>

          {!isTestActive ? (
            <>
              <Text style={styles.fitnessTestDesc}>
                Complete 3 exercises in 60 minutes: pushups, situps, and 5K run.
                Get a score out of 300.
              </Text>
              <TouchableOpacity
                style={styles.startTestButton}
                onPress={handleStartFitnessTest}
              >
                <Text style={styles.startTestButtonText}>
                  Start RUNSTR Test
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.timerContainer}>
                <Text style={styles.timerLabel}>Time Elapsed</Text>
                <Text style={styles.timerDisplay}>
                  {formatTime(elapsedSeconds)} / 60:00
                </Text>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${(elapsedSeconds / MAX_TEST_DURATION) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <Text style={styles.testInstructions}>
                Use the workout tracker to complete pushups, situps, and 5K run.
                Return here when done.
              </Text>

              <View style={styles.testButtons}>
                <TouchableOpacity
                  style={styles.cancelTestButton}
                  onPress={handleCancelTest}
                >
                  <Text style={styles.cancelTestButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.finishTestButton}
                  onPress={handleFinishTest}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#000" />
                  <Text style={styles.finishTestButtonText}>Finish Test</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
        */}

        {/* Last Updated */}
        {analytics && (
          <Text style={styles.lastUpdated}>
            Last updated: {new Date(analytics.lastUpdated).toLocaleString()}
          </Text>
        )}
      </ScrollView>

      {/* Privacy Notice Modal */}
      <PrivacyNoticeModal
        visible={showPrivacyModal}
        onClose={handlePrivacyClose}
        onAccept={handlePrivacyAccept}
      />

      {/* Fitness Test Instructions Modal */}
      <FitnessTestInstructionsModal
        visible={showInstructionsModal}
        onStart={handleInstructionsStart}
        onCancel={() => setShowInstructionsModal(false)}
      />
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

  backButton: {
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
    color: '#FF9D42',
    fontWeight: theme.typography.weights.medium,
  },

  content: {
    flex: 1,
  },

  contentContainer: {
    padding: 12,
    paddingBottom: 80,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },

  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },

  section: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FFB366',
    marginBottom: 12,
  },

  scoreCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 16,
  },

  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF9D42' + '15',
    borderWidth: 3,
    borderColor: '#FF9D42',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreValue: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
  },

  scoreLabel: {
    fontSize: 14,
    color: '#CC7A33',
  },

  scoreDetails: {
    flex: 1,
  },

  categoryLabel: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  trendLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  categoryBreakdown: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    gap: 16,
  },

  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  categoryName: {
    width: 80,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#FF9D42',
    borderRadius: 4,
  },

  categoryScore: {
    width: 40,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FF9D42',
    textAlign: 'right',
  },

  recommendations: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    marginTop: 16,
  },

  recommendationsTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },

  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  metricCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    gap: 16,
  },

  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  metricLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  metricValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginRight: 12,
  },

  metricTrend: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },

  metricTrendPositive: {
    color: theme.colors.orangeBright,
  },

  metricSubtext: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  lastUpdated: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },

  emptyMetricState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },

  emptyMetricTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyMetricText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },

  // Fitness Test styles
  fitnessTestCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 14,
    marginBottom: 16,
  },

  fitnessTestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  fitnessTestTitle: {
    fontSize: 17,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FFB366',
  },

  fitnessTestDesc: {
    fontSize: 13,
    color: '#CC7A33',
    lineHeight: 18,
    marginBottom: 12,
  },

  startTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9D42',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },

  startTestButtonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: '#000',
  },

  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  timerLabel: {
    fontSize: 14,
    color: '#CC7A33',
    marginBottom: 8,
  },

  timerDisplay: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: '#FF9D42',
    marginBottom: 16,
  },

  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF9D42',
    borderRadius: 4,
  },

  testInstructions: {
    fontSize: 14,
    color: '#CC7A33',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  testButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  cancelTestButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    alignItems: 'center',
  },

  cancelTestButtonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: '#CC7A33',
  },

  finishTestButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF9D42',
    paddingVertical: 14,
    borderRadius: 12,
  },

  finishTestButtonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: '#000',
  },
});
