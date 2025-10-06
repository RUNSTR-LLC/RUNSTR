/**
 * WorkoutHistoryScreen - Two-Tab Workout View
 * Public Tab: 1301 notes from Nostr (cache-first instant display)
 * Private Tab: Local Activity Tracker workouts (zero loading time)
 * Simple architecture with no merge complexity
 *
 * IMPORTANT: This replaced the old complex merge-based screen
 * Old features removed: WorkoutCacheService, HealthKit, filter tabs, "Sync Now" button
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { WorkoutPublishingService } from '../services/nostr/workoutPublishingService';
import LocalWorkoutStorageService from '../services/fitness/LocalWorkoutStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nsecToPrivateKey } from '../utils/nostr';

// UI Components
import { LoadingOverlay } from '../components/ui/LoadingStates';
import { Ionicons } from '@expo/vector-icons';

// Two-Tab Workout Components
import { WorkoutTabNavigator } from '../components/profile/WorkoutTabNavigator';
import type { LocalWorkout } from '../services/fitness/LocalWorkoutStorageService';

interface WorkoutHistoryScreenProps {
  route?: {
    params?: {
      userId?: string;
      pubkey?: string;
    };
  };
}

export const WorkoutHistoryScreen: React.FC<WorkoutHistoryScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation();
  const [pubkey, setPubkey] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userNsec, setUserNsec] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Use static getInstance methods correctly
  const localStorageService = LocalWorkoutStorageService.getInstance();
  const publishingService = WorkoutPublishingService.getInstance();

  // Load user credentials on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      console.log('[WorkoutHistory] Loading user data...');

      // Try to get from route params first
      let activePubkey = route?.params?.pubkey || '';
      let activeUserId = route?.params?.userId || '';

      // Fallback to AsyncStorage if not in params
      if (!activePubkey) {
        const storedNpub = await AsyncStorage.getItem('@runstr:npub');
        const storedHexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
        activePubkey = storedHexPubkey || storedNpub || '';
        console.log('[WorkoutHistory] Loaded pubkey from storage:', activePubkey?.slice(0, 20) + '...');
      }

      if (!activeUserId) {
        activeUserId = activePubkey; // Use pubkey as userId fallback
      }

      setPubkey(activePubkey);
      setUserId(activeUserId);

      // Load nsec for posting
      const storedNsec = await AsyncStorage.getItem('@runstr:user_nsec');
      if (storedNsec) {
        setUserNsec(storedNsec);
        console.log('[WorkoutHistory] ✅ User nsec loaded');
      } else {
        console.warn('[WorkoutHistory] No nsec found - posting will not work');
      }
    } catch (error) {
      console.error('[WorkoutHistory] ❌ Failed to load user data:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  /**
   * Handle posting a local workout to Nostr
   * Creates kind 1301 event and marks workout as synced
   * This makes the workout disappear from Private tab and appear in Public tab
   */
  const handlePostToNostr = async (workout: LocalWorkout) => {
    try {
      console.log(`[WorkoutHistory] Posting workout ${workout.id} to Nostr...`);

      if (!userNsec) {
        Alert.alert('Error', 'No private key found. Please log in again.');
        return;
      }

      // Convert LocalWorkout to PublishableWorkout format
      // Remove source field that causes type mismatch
      const { source, splits, ...workoutData } = workout;

      const publishableWorkout = {
        ...workoutData,
        id: workout.id,
        userId: userId,
        type: workout.type,
        duration: workout.duration / 60, // Convert seconds to minutes for publishing service
        distance: workout.distance,
        calories: workout.calories,
        startTime: workout.startTime,
        endTime: workout.endTime,
      };

      // Convert nsec to hex private key
      const privateKeyHex = nsecToPrivateKey(userNsec);

      // Publish to Nostr as kind 1301 event
      const result = await publishingService.saveWorkoutToNostr(
        publishableWorkout,
        privateKeyHex,
        userId
      );

      if (result.success && result.eventId) {
        console.log(`[WorkoutHistory] ✅ Workout published: ${result.eventId}`);

        // Mark workout as synced - IT WILL DISAPPEAR FROM PRIVATE TAB
        await localStorageService.markAsSynced(workout.id, result.eventId);
        console.log(`[WorkoutHistory] ✅ Workout marked as synced`);

        Alert.alert(
          '✅ Success',
          'Workout posted to Nostr!\n\nPull down to refresh and see it in your Public tab.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(result.error || 'Failed to publish workout');
      }
    } catch (error) {
      console.error('[WorkoutHistory] ❌ Post to Nostr failed:', error);
      Alert.alert(
        'Error',
        'Failed to post workout to Nostr. Please try again.'
      );
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingOverlay message="Loading..." visible={true} />
      </SafeAreaView>
    );
  }

  if (!pubkey) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
          <Text style={styles.errorTitle}>No User Found</Text>
          <Text style={styles.errorMessage}>
            Please log in to view your workouts
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={handleGoBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Workouts</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Two-Tab Workout Navigator */}
      <WorkoutTabNavigator
        userId={userId}
        pubkey={pubkey}
        onPostToNostr={handlePostToNostr}
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
    width: 40, // Match back button width
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  errorButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
  },

  errorButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },
});
