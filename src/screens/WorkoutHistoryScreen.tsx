/**
 * WorkoutHistoryScreen - Workout History View
 * Local Tab: Local Activity Tracker workouts (zero loading time)
 * Apple Health Tab: HealthKit workouts with post buttons (iOS)
 * Health Connect Tab: Health Connect workouts (Android)
 *
 * Tabs are displayed in the header row next to the back button.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nostrProfileService } from '../services/nostr/NostrProfileService';
import type { NostrProfile } from '../services/nostr/NostrProfileService';
import workoutPublishingService, {
  type PublishableWorkout,
} from '../services/nostr/workoutPublishingService';
import { UnifiedSigningService } from '../services/auth/UnifiedSigningService';

// UI Components
import { LoadingOverlay } from '../components/ui/LoadingStates';
import { Ionicons } from '@expo/vector-icons';
import { EnhancedSocialShareModal } from '../components/profile/shared/EnhancedSocialShareModal';

// Unified Workout Components
import { WorkoutTabNavigator } from '../components/profile/WorkoutTabNavigator';
import { WorkoutStatsSheet } from '../components/profile/WorkoutStatsSheet';

// Import type from the service file (not from the default export)
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
  const navigation = useNavigation<any>();
  const [pubkey, setPubkey] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  // Note: signer is no longer cached in state - we get a fresh signer at publish time
  // to ensure we're using current auth after sign out/sign in
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showStatsSheet, setShowStatsSheet] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<NostrProfile | null>(null);

  const loadUserData = useCallback(async () => {
    try {
      console.log('[WorkoutHistory] Loading user data...');

      // Try to get from route params first
      let activePubkey = route?.params?.pubkey || '';
      let activeUserId = route?.params?.userId || '';

      // Fallback to AsyncStorage if not in params
      if (!activePubkey) {
        const storedNpub = await AsyncStorage.getItem('@runstr:npub');
        const storedHexPubkey = await AsyncStorage.getItem(
          '@runstr:hex_pubkey'
        );
        activePubkey = storedHexPubkey || storedNpub || '';
        console.log(
          '[WorkoutHistory] Loaded pubkey from storage:',
          activePubkey?.slice(0, 20) + '...'
        );
      }

      if (!activeUserId) {
        // Allow guest/local users to view timeline without requiring Nostr login
        activeUserId = activePubkey || 'local-device';
      }

      setPubkey(activePubkey);
      setUserId(activeUserId);

      // Note: Signer is now loaded fresh at publish time (not cached here)
      // This ensures we always use current auth state after sign out/sign in
      if (!activePubkey) {
        console.log('[WorkoutHistory] ✅ Guest/local mode enabled (no pubkey found)');
      } else {
        console.log('[WorkoutHistory] ✅ User data loaded (signer loaded at publish time)');
      }
    } catch (error) {
      console.error('[WorkoutHistory] ❌ Failed to load user data:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [route?.params?.pubkey, route?.params?.userId]);

  // Load user credentials on mount and when route params change
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Load user profile in background (non-blocking, for social cards only)
  useEffect(() => {
    if (pubkey) {
      console.log('[WorkoutHistory] Loading profile in background...');
      nostrProfileService
        .getProfile(pubkey)
        .then((profile) => {
          setUserProfile(profile);
          console.log('[WorkoutHistory] ✅ User profile loaded (background)');
        })
        .catch((profileError) => {
          console.warn(
            '[WorkoutHistory] Failed to load profile (background):',
            profileError
          );
        });
    }
  }, [pubkey]);



  /**
   * Handle posting a HealthKit workout to social feeds as kind 1
   * Opens the EnhancedSocialShareModal for template selection
   */
  const handleSocialShareHealthKit = async (workout: any) => {
    console.log(
      `[WorkoutHistory] Opening social share modal for HealthKit workout ${workout.id}...`
    );
    setSelectedWorkout(workout);
    setShowSocialModal(true);
  };

  /**
   * Handle posting a Health Connect workout to social feeds as kind 1
   * Opens the enhanced social share modal
   */
  const handleSocialShareHealthConnect = async (workout: any) => {
    console.log(
      `[WorkoutHistory] Opening social share modal for Health Connect workout ${workout.id}...`
    );
    setSelectedWorkout(workout);
    setShowSocialModal(true);
  };

  /**
   * Handle posting a local workout to Nostr as kind 1 social event
   * Opens enhanced social share modal with image generation
   */
  const handlePostToSocial = async (workout: LocalWorkout) => {
    console.log(
      `[WorkoutHistory] Opening social share modal for workout ${workout.id}...`
    );
    setSelectedWorkout(workout);
    setShowSocialModal(true);
  };

  /**
   * Handle posting selected workout to Nostr as kind 1 social event
   * Called by EnhancedSocialShareModal after card capture
   */
  const handlePostToNostr = async (
    cardImageUri?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!selectedWorkout) {
        return { success: false, error: 'No workout selected' };
      }

      const signer = await UnifiedSigningService.getInstance().getSigner();
      if (!signer) {
        return { success: false, error: 'Not authenticated. Please log in again.' };
      }

      const npub = await AsyncStorage.getItem('@runstr:npub');
      const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      const publisherId = npub || hexPubkey || userId;

      const publishableWorkout: PublishableWorkout = {
        ...selectedWorkout,
        userId: selectedWorkout.userId || publisherId || 'unknown',
        canPostToSocial: true,
      };

      const result = await workoutPublishingService.postWorkoutToSocial(
        publishableWorkout,
        signer,
        publisherId || 'unknown',
        {
          includeCard: true,
          cardImageUri,
          userAvatar: userProfile?.picture,
          userName: userProfile?.name || userProfile?.display_name,
        }
      );

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Failed to publish workout post',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to publish workout post';
      console.error('[WorkoutHistory] Failed to post workout to social:', error);
      return { success: false, error: errorMessage };
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleNavigateToAnalytics = () => {
    navigation.navigate('AdvancedAnalytics' as any);
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
      {/* Header with back button and stats button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        <TouchableOpacity
          onPress={() => setShowStatsSheet(true)}
          style={styles.statsButton}
        >
          <Ionicons name="stats-chart" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Unified Workout List - all sources merged into one view */}
      <WorkoutTabNavigator
        userId={userId}
        pubkey={pubkey}
        onPostToSocial={handlePostToSocial}
        onSocialShareHealthKit={handleSocialShareHealthKit}
        onSocialShareHealthConnect={handleSocialShareHealthConnect}
        onNavigateToAnalytics={handleNavigateToAnalytics}
      />

      {/* Enhanced Social Share Modal */}
      <EnhancedSocialShareModal
        visible={showSocialModal}
        workout={selectedWorkout}
        userId={userId}
        userAvatar={userProfile?.picture}
        userName={userProfile?.name || userProfile?.display_name}
        localWorkoutId={selectedWorkout?.id}
        onPostToNostr={handlePostToNostr}
        onClose={() => {
          setShowSocialModal(false);
          setSelectedWorkout(null);
        }}
        onSuccess={() => {
          setShowSocialModal(false);
          setSelectedWorkout(null);
          // Success alert handled by child component (PrivateWorkoutsTab)
        }}
      />

      {/* Workout Stats Sheet */}
      <WorkoutStatsSheet
        visible={showStatsSheet}
        onClose={() => setShowStatsSheet(false)}
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  backButton: {
    padding: 8,
  },

  headerSpacer: {
    flex: 1,
  },

  statsButton: {
    padding: 8,
  },

});
