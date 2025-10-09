/**
 * Enhanced Workout History Screen - Two-Tab Workout View
 * Public Tab: 1301 notes from Nostr (cache-first instant display)
 * Private Tab: Local Activity Tracker workouts (zero loading time)
 * Simple architecture with no merge complexity
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { theme } from '../styles/theme';
import { WorkoutPublishingService } from '../services/nostr/workoutPublishingService';
import localWorkoutStorage from '../services/fitness/LocalWorkoutStorageService';
import { UnifiedSigningService } from '../services/auth/UnifiedSigningService';
import type { NDKSigner } from '@nostr-dev-kit/ndk';
import FEATURE_FLAGS from '../constants/featureFlags';

// UI Components
import { LoadingOverlay } from '../components/ui/LoadingStates';
import { BottomNavigation } from '../components/ui/BottomNavigation';

// Two-Tab Workout Components
import { WorkoutTabNavigator } from '../components/profile/WorkoutTabNavigator';
import type { LocalWorkout } from '../services/fitness/LocalWorkoutStorageService';

interface EnhancedWorkoutHistoryScreenProps {
  userId: string;
  pubkey: string;
  onNavigateBack: () => void;
  onNavigateToTeam: () => void;
}

export const EnhancedWorkoutHistoryScreen: React.FC<EnhancedWorkoutHistoryScreenProps> = ({
  userId,
  pubkey,
  onNavigateBack,
  onNavigateToTeam,
}) => {
  const [signer, setSigner] = useState<NDKSigner | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Services - localWorkoutStorage is already a singleton instance
  const publishingService = WorkoutPublishingService.getInstance();

  // Load user credentials on mount
  useEffect(() => {
    loadUserCredentials();
  }, [userId]);

  const loadUserCredentials = async () => {
    try {
      console.log('[EnhancedWorkoutHistory] Loading user credentials...');
      const userSigner = await UnifiedSigningService.getInstance().getSigner();
      if (userSigner) {
        setSigner(userSigner);
        console.log('[EnhancedWorkoutHistory] ✅ User signer loaded');
      } else {
        console.warn('[EnhancedWorkoutHistory] No signer available');
      }
    } catch (error) {
      console.error('[EnhancedWorkoutHistory] ❌ Failed to load credentials:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  /**
   * Handle posting a local workout to Nostr
   * Creates kind 1 social event with workout card
   */
  const handlePostToNostr = async (workout: LocalWorkout) => {
    try {
      console.log(`[EnhancedWorkoutHistory] Posting workout ${workout.id} to Nostr...`);

      if (!signer) {
        Alert.alert('Error', 'No signer available. Please log in again.');
        return;
      }

      // Convert LocalWorkout to PublishableWorkout format
      const publishableWorkout = {
        ...workout,
        userId: userId,
        source: 'manual' as const, // Map local workout source to standard type
        type: workout.type,
        duration: workout.duration / 60, // Convert seconds to minutes for publishing service
        distance: workout.distance,
        calories: workout.calories,
        syncedAt: workout.syncedAt || new Date().toISOString(),
      };

      // Publish to Nostr as kind 1 social event
      const result = await publishingService.postWorkoutToSocial(
        publishableWorkout,
        signer,
        userId
      );

      if (result.success && result.eventId) {
        console.log(`[EnhancedWorkoutHistory] ✅ Workout published: ${result.eventId}`);

        // Mark workout as synced - IT WILL DISAPPEAR FROM PRIVATE TAB
        await localWorkoutStorage.markAsSynced(workout.id, result.eventId);
        console.log(`[EnhancedWorkoutHistory] ✅ Workout marked as synced`);

        Alert.alert(
          '✅ Success',
          'Workout posted to Nostr!\nIt will now appear in your Public tab.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(result.error || 'Failed to publish workout');
      }
    } catch (error) {
      console.error('[EnhancedWorkoutHistory] ❌ Post to Nostr failed:', error);
      Alert.alert(
        'Error',
        'Failed to post workout to Nostr. Please try again.'
      );
    }
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingOverlay message="Loading..." visible={true} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workouts</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Two-Tab Workout Navigator */}
      <WorkoutTabNavigator
        userId={userId}
        pubkey={pubkey}
        onPostToNostr={handlePostToNostr}
      />

      {/* Bottom Navigation */}
      <BottomNavigation
        activeScreen="profile"
        onNavigateToTeam={onNavigateToTeam}
        onNavigateToProfile={() => {}} // Already on profile section
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

  backButtonText: {
    fontSize: 24,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },

  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
  },

  headerSpacer: {
    width: 40, // Match back button width
  },
});
