/**
 * LeaderboardsScreen - Dedicated screen for daily leaderboards
 *
 * Shows daily running leaderboards with back navigation to the events page.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { OstrichRefreshScrollView } from '../components/ui/OstrichRefreshScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { LeaderboardsContent } from '../components/compete';
import { PendingSubmissionService } from '../services/competition/PendingSubmissionService';
import { StepCompetitionService } from '../services/competition/StepCompetitionService';

interface LeaderboardsScreenProps {
  navigation?: any;
}

export const LeaderboardsScreen: React.FC<LeaderboardsScreenProps> = ({ navigation: propNavigation }) => {
  const hookNavigation = useNavigation<any>();
  const navigation = propNavigation || hookNavigation;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(1);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount to prevent state updates on dead component
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  // Refresh handler - triggers re-fetch in LeaderboardsContent
  // Also retries any pending workout submissions that failed to sync
  const handleRefresh = useCallback(async () => {
    console.log('[LeaderboardsScreen] Pull-to-refresh started');
    setIsRefreshing(true);

    // Safety timeout - reset spinner after 10 seconds max (prevents frozen UI on network failure)
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('[LeaderboardsScreen] Refresh timeout safety - resetting spinner');
      setIsRefreshing(false);
    }, 10000);

    // Retry pending submissions first (before refreshing leaderboard)
    try {
      const retryResult = await PendingSubmissionService.retryAll();
      if (retryResult.succeeded > 0) {
        Toast.show({
          type: 'success',
          text1: `${retryResult.succeeded} workout${retryResult.succeeded > 1 ? 's' : ''} synced!`,
          text2: 'Your workout is now on the leaderboard',
          position: 'bottom',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.warn('[LeaderboardsScreen] Retry failed:', error);
      // Non-blocking - continue with refresh even if retry fails
    }

    // Sync daily steps for universal leaderboard
    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (npub) {
        const stepResult = await StepCompetitionService.forceSubmitSteps(npub);
        if (stepResult.success) {
          console.log('[LeaderboardsScreen] Daily steps synced to leaderboard');
        }
      }
    } catch (error) {
      console.warn('[LeaderboardsScreen] Step sync failed:', error);
      // Non-blocking - continue with refresh even if step sync fails
    }

    // Sync health platform workouts (HealthKit/Health Connect) to leaderboard
    try {
      const { HealthSyncManager } = require('../services/fitness/HealthSyncManager');
      await HealthSyncManager.syncTodayToLeaderboard();
    } catch (error) {
      console.warn('[LeaderboardsScreen] Health sync failed:', error);
    }

    // Increment trigger to tell LeaderboardsContent to re-fetch with forceRefresh
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Callback from LeaderboardsContent when fetch completes
  const handleRefreshComplete = useCallback(() => {
    console.log('[LeaderboardsScreen] Refresh complete');
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    setIsRefreshing(false);
    setLoading(false);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboards</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      )}
      <OstrichRefreshScrollView
        style={[styles.scrollView, loading && { position: 'absolute', opacity: 0 }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      >
        <LeaderboardsContent
          refreshTrigger={refreshTrigger}
          onRefreshComplete={handleRefreshComplete}
        />
      </OstrichRefreshScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
});

export default LeaderboardsScreen;
