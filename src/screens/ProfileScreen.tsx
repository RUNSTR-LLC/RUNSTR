/**
 * ProfileScreen - Unified profile page
 *
 * The signed-in user's home: profile hero and the running tracker.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OstrichRefreshScrollView } from '../components/ui/OstrichRefreshScrollView';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { ProfileScreenData } from '../types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { NostrFetchLogger } from '../utils/NostrFetchLogger';
import { MusicPlayerPreferencesService } from '../services/music/MusicPlayerPreferencesService';
import { HeaderMusicControls } from '../components/music/HeaderMusicControls';
import { ProfileHero } from '../components/profile/ProfileHero';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { TopBar } from '../components/ui/TopBar';
import { NotificationBadge } from '../components/profile/NotificationBadge';
import { NotificationModal } from '../components/profile/NotificationModal';
import LocalWorkoutStorageService from '../services/fitness/LocalWorkoutStorageService';
import { ActivityCategoryBar } from '../components/activity/ActivityCategoryBar';
import { activityGridService, type GridPosition } from '../services/activity/ActivityGridService';
import { appPermissionService } from '../services/initialization/AppPermissionService';
import { PermissionRequestModal } from '../components/permissions/PermissionRequestModal';
import { FEATURES } from '../config/features';
import { RunningTrackerScreen } from './activity/RunningTrackerScreen';

const GRACE_PERIOD_DAYS = 3;

function computeCurrentStreak(workouts: { startTime: string; source: string }[]): number {
  const qualifying = workouts.filter((w) => w.source !== 'daily_steps');
  const uniqueDates = [
    ...new Set(qualifying.map((w) => w.startTime?.slice(0, 10)).filter(Boolean)),
  ].sort((a, b) => (b > a ? 1 : -1));

  if (uniqueDates.length === 0) return 0;

  const dates = [...uniqueDates].reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mostRecent = new Date(dates[dates.length - 1]);
  mostRecent.setHours(0, 0, 0, 0);
  const daysSinceLast = Math.round(
    (today.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (daysSinceLast >= GRACE_PERIOD_DAYS) return 0;

  let streak = 1;
  for (let i = dates.length - 2; i >= 0; i--) {
    const curr = new Date(dates[i + 1]);
    const prev = new Date(dates[i]);
    const gap = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    if (gap <= GRACE_PERIOD_DAYS) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

interface ProfileScreenProps {
  data: ProfileScreenData;
  isLoadingTeam?: boolean;
  isLoadingProfile?: boolean;
  onNavigateToTeam: () => void;
  onNavigateToTeamDiscovery?: () => void;
  onViewCurrentTeam?: () => void;
  onEditProfile?: () => void;
  onSend?: () => void;
  onReceive?: () => void;
  onWalletHistory?: () => void;
  onSyncSourcePress?: (provider: string) => void;
  onHelp?: () => void;
  onContactSupport?: () => void;
  onPrivacyPolicy?: () => void;
  onSignOut?: () => void;
  onRefresh?: () => void;
}

const ProfileScreenComponent: React.FC<ProfileScreenProps> = ({
  data, onNavigateToTeamDiscovery, onViewCurrentTeam,
  onHelp, onContactSupport, onPrivacyPolicy, onSignOut, onRefresh,
}) => {
  const navigation = useNavigation<any>();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [musicPlayerHeaderEnabled, setMusicPlayerHeaderEnabled] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Activity launcher state
  const [gridPosition, setGridPosition] = useState<GridPosition>({ row: 0, column: 0 });
  const [positionLoaded, setPositionLoaded] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

  // Permission state (deferred to hold-start for cardio)
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Refresh streak + music header on focus
  useFocusEffect(useCallback(() => {
    MusicPlayerPreferencesService.isMusicPlayerHeaderEnabled().then(setMusicPlayerHeaderEnabled);
    LocalWorkoutStorageService.getAllWorkouts()
      .then((w) => setCurrentStreak(computeCurrentStreak(w)))
      .catch(() => {});
  }, []));


  // Load saved activity grid position on mount
  useEffect(() => {
    let isMounted = true;
    const loadPosition = async () => {
      const saved = await activityGridService.loadPosition();
      if (isMounted) {
        setGridPosition(saved);
        setPositionLoaded(true);
      }
    };
    loadPosition();
    return () => { isMounted = false; };
  }, []);

  // Save position when it changes
  useEffect(() => {
    if (!positionLoaded) return;
    activityGridService.savePosition(gridPosition);
  }, [gridPosition, positionLoaded]);

  // Safety: reset workout state when activity changes (prevents stuck-in-workout state)
  useEffect(() => {
    setIsWorkoutActive(false);
  }, [gridPosition]);

  // Silent permission check — re-runs on focus so revoking in Settings re-gates the UI
  useFocusEffect(useCallback(() => {
    let isMounted = true;
    appPermissionService.checkAllPermissions().then((status) => {
      if (isMounted) setPermissionsReady(!!status.location);
    });
    return () => { isMounted = false; };
  }, []));

  const handleActivitySelect = useCallback((row: number, column: number) => {
    setGridPosition({ row, column });
  }, []);

  const handleSettingsPress = useCallback(() => {
    navigation.navigate('Settings', {
      currentTeam: data.currentTeam, onNavigateToTeamDiscovery,
      onViewCurrentTeam, onHelp, onContactSupport, onPrivacyPolicy, onSignOut,
    });
  }, [navigation, data.currentTeam, onNavigateToTeamDiscovery, onViewCurrentTeam, onHelp, onContactSupport, onPrivacyPolicy, onSignOut]);

  const handleRefresh = useCallback(async () => {
    NostrFetchLogger.start('ProfileScreen.pullToRefresh');
    setIsRefreshing(true);
    try {
      const { GlobalNDKService: NDK } = require('../services/nostr/GlobalNDKService');
      const { DirectNostrProfileService: DPS } = require('../services/user/directNostrProfileService');

      // Kick off NDK reconnect, then fan out all independent fetches in
      // parallel. NDK internally queues subscriptions if connection isn't
      // ready yet, so the profile + section fetches won't miss events.
      await NDK.reconnect().catch(() => {});
      await Promise.all([
        DPS.getCurrentUserProfile(true).catch(() => {}),
        onRefresh?.() ?? Promise.resolve(),
      ]);
      NostrFetchLogger.end('ProfileScreen.pullToRefresh', 1, 'success');
    } catch (error) {
      NostrFetchLogger.error('ProfileScreen.pullToRefresh', error as Error);
      Toast.show({ type: 'error', text1: 'Refresh failed', text2: 'Check your connection and try again', position: 'bottom', visibilityTime: 3000 });
    } finally { setIsRefreshing(false); }
  }, [onRefresh]);

  const handleTeamPress = useCallback(() => {
    if (!FEATURES.teams) return;
    const team = data?.currentTeam;
    if (!team) return;
    navigation.navigate('ClubChat', {
      clubId: team.id,
      clubName: team.name,
      captainNpub: '',
    });
  }, [navigation, data?.currentTeam]);

  const handleEditPress = useCallback(() => {
    const parent = navigation.getParent();
    (parent || navigation).navigate('ProfileEdit' as any);
  }, [navigation]);

  const renderTracker = () => {
    if (!positionLoaded) return null;

    const { category } = activityGridService.getActivityAt(gridPosition);
    const isCardio = category.key === 'cardio';

    // For cardio, check permissions before rendering tracker
    if (isCardio && !permissionsReady) {
      return (
        <View style={styles.permissionGate}>
          <TouchableOpacity
            style={styles.permissionCircle}
            onPress={() => setShowPermissionModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.permissionCircleText}>ENABLE{'\n'}LOCATION</Text>
            <Text style={styles.permissionCircleHint}>tap to start</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // The app tracks running only. A render-time crash inside an active tracker
    // used to white-screen the whole app (and lose the workout). The in-progress
    // session lives in the simpleRunTracker singleton, so "Retry" re-mounts the
    // tracker and resumes it.
    return (
      <ScreenErrorBoundary screenName="Workout Tracker">
        <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />
      </ScreenErrorBoundary>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* edges={[]} — the SafeAreaView above already applies the top inset.
          TexturedBackground defaults to edges={['top']}, which would double the
          inset and push the TopBar lower than on the Social/Leaderboard tabs. */}
      <TexturedBackground edges={[]}>
        {/* Header — hidden during active workout */}
      {!isWorkoutActive && (
        musicPlayerHeaderEnabled ? (
          <View style={styles.header}>
            <HeaderMusicControls onSettingsPress={handleSettingsPress} />
          </View>
        ) : (
          <TopBar onMenuPress={handleSettingsPress} />
        )
      )}

      {/* Owner view — same container + scroll wrapper whether workout is active
          or not, so the tracker component below keeps a stable position in the
          tree and React does not unmount it when isWorkoutActive flips.
          scrollEnabled toggles pull-to-refresh off during a workout. */}
      <View style={isWorkoutActive ? styles.fullScreenTracker : styles.ownerContent}>
          <OstrichRefreshScrollView
            style={styles.ownerScroll}
            contentContainerStyle={styles.ownerScrollContent}
            refreshing={!isWorkoutActive && isRefreshing}
            onRefresh={handleRefresh}
            scrollEnabled={!isWorkoutActive}
            showsVerticalScrollIndicator={false}
          >
            {!isWorkoutActive && (
              <View style={styles.sectionGap}>
                <ProfileHero user={data.user} isOwner={true}
                  streak={FEATURES.level ? currentStreak : undefined}
                  currentTeam={data.currentTeam ? {
                    id: data.currentTeam.id,
                    name: data.currentTeam.name,
                    avatarUrl: null,
                  } : null}
                  onTeamPress={handleTeamPress}
                  onEditPress={handleEditPress}
                  onSettingsPress={undefined} />
              </View>
            )}

            {!isWorkoutActive && (
              <View style={styles.sectionGap}>
                <NotificationBadge onPress={() => setShowNotificationModal(true)} />
              </View>
            )}

            {!isWorkoutActive && FEATURES.activitySelector && (
              <View style={styles.sectionGap}>
                <ActivityCategoryBar
                  gridPosition={gridPosition}
                  onActivitySelect={handleActivitySelect}
                  isWorkoutActive={false}
                />
              </View>
            )}

            <View style={styles.trackerContainer}>
              {renderTracker()}
            </View>
          </OstrichRefreshScrollView>
        </View>

      {/* Permission modal — shown when user taps "enable location" for cardio */}
      {showPermissionModal && (
        <PermissionRequestModal
          visible={true}
          onComplete={async () => {
            setShowPermissionModal(false);
            // Re-verify actual OS status — user may have denied in the system dialog
            const status = await appPermissionService.checkAllPermissions();
            if (status.location) {
              setPermissionsReady(true);
            }
          }}
        />
      )}

      <NotificationModal visible={showNotificationModal} onClose={() => setShowNotificationModal(false)} />
      </TexturedBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border, zIndex: 10,
  },
  headerSpacer: { flex: 1 },
  headerButton: { padding: 4 },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 32 },
  ownerContent: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  ownerScroll: { flex: 1 },
  ownerScrollContent: { flexGrow: 1, paddingTop: 8 },
  sectionGap: { marginBottom: 12 },
  trackerContainer: {
    flex: 1,
  },
  fullScreenTracker: {
    flex: 1,
  },
  permissionGate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 260,
  },
  permissionCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(255, 123, 28, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCircleText: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  permissionCircleHint: {
    fontSize: 14,
    color: theme.colors.accent,
    marginTop: 4,
    fontWeight: theme.typography.weights.semiBold as any,
  },
});

export const ProfileScreen = React.memo(ProfileScreenComponent);
