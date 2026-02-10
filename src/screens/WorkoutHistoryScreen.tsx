/**
 * WorkoutHistoryScreen - Workout History View
 * Local Tab: Local Activity Tracker workouts (zero loading time)
 * Apple Health Tab: HealthKit workouts with post buttons (iOS)
 * Health Connect Tab: Health Connect workouts (Android)
 *
 * Tabs are displayed in the header row next to the back button.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nostrProfileService } from '../services/nostr/NostrProfileService';
import type { NostrProfile } from '../services/nostr/NostrProfileService';

// UI Components
import { LoadingOverlay } from '../components/ui/LoadingStates';
import { Ionicons } from '@expo/vector-icons';
import { EnhancedSocialShareModal } from '../components/profile/shared/EnhancedSocialShareModal';

// Unified Workout Components
import { WorkoutTabNavigator } from '../components/profile/WorkoutTabNavigator';
import { WorkoutStatsSheet } from '../components/profile/WorkoutStatsSheet';

// Backup modals
import { ExportDataModal } from '../components/backup/ExportDataModal';
import { ImportDataModal } from '../components/backup/ImportDataModal';

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
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBackupMenu, setShowBackupMenu] = useState(false);

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
        activeUserId = activePubkey; // Use pubkey as userId fallback
      }

      setPubkey(activePubkey);
      setUserId(activeUserId);

      // Note: Signer is now loaded fresh at publish time (not cached here)
      // This ensures we always use current auth state after sign out/sign in
      console.log('[WorkoutHistory] ✅ User data loaded (signer loaded at publish time)');
    } catch (error) {
      console.error('[WorkoutHistory] ❌ Failed to load user data:', error);
    } finally {
      setIsInitializing(false);
    }
  };

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

  if (!pubkey) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={theme.colors.error}
          />
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
      {/* Header with back button, cloud backup, and stats button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        <View style={styles.cloudButtonContainer}>
          <TouchableOpacity
            onPress={() => setShowBackupMenu(!showBackupMenu)}
            style={styles.cloudButton}
          >
            <Ionicons name="cloud-outline" size={22} color="#CC7A33" />
          </TouchableOpacity>
          {showBackupMenu && (
            <View style={styles.backupMenu}>
              <TouchableOpacity
                style={styles.backupMenuItem}
                onPress={() => { setShowBackupMenu(false); setShowExportModal(true); }}
              >
                <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
                <Text style={styles.backupMenuText}>Backup</Text>
              </TouchableOpacity>
              <View style={styles.backupMenuDivider} />
              <TouchableOpacity
                style={styles.backupMenuItem}
                onPress={() => { setShowBackupMenu(false); setShowImportModal(true); }}
              >
                <Ionicons name="cloud-download-outline" size={18} color={theme.colors.text} />
                <Text style={styles.backupMenuText}>Restore</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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

      {/* Backup modals */}
      <ExportDataModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
      <ImportDataModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
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
    zIndex: 10,
  },

  backButton: {
    padding: 8,
  },

  headerSpacer: {
    flex: 1,
  },

  cloudButtonContainer: {
    position: 'relative',
  },

  cloudButton: {
    padding: 8,
  },

  backupMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    zIndex: 100,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 140,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  backupMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  backupMenuText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },

  backupMenuDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },

  statsButton: {
    padding: 8,
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
