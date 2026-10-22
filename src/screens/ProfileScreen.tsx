/**
 * ProfileScreen - Unified profile page
 *
 * The signed-in user's home: profile hero and the running tracker.
 */

import React, { useState, useCallback } from 'react';
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
import { appPermissionService } from '../services/initialization/AppPermissionService';
import { PermissionRequestModal } from '../components/permissions/PermissionRequestModal';
import { RunningTrackerScreen } from './activity/RunningTrackerScreen';

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
  const [musicPlayerHeaderEnabled, setMusicPlayerHeaderEnabled] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

  // Location permission: null until the first check resolves, so the location gate never flashes
  const [permissionsReady, setPermissionsReady] = useState<boolean | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Refresh the music header preference on focus
  useFocusEffect(useCallback(() => {
    MusicPlayerPreferencesService.isMusicPlayerHeaderEnabled().then(setMusicPlayerHeaderEnabled);
  }, []));

  // Silent permission check — re-runs on focus so revoking in Settings re-gates the UI
  useFocusEffect(useCallback(() => {
    let isMounted = true;
    appPermissionService.checkAllPermissions().then((status) => {
      if (isMounted) setPermissionsReady(!!status.location);
    });
    return () => { isMounted = false; };
  }, []));

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

  const handleEditPress = useCallback(() => {
    const parent = navigation.getParent();
    (parent || navigation).navigate('ProfileEdit' as any);
  }, [navigation]);

  const renderTracker = () => {
    if (permissionsReady === null) return null;
    // The tracker needs location before it can start
    if (!permissionsReady) {
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
          inset and push the TopBar down. */}
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
                <ProfileHero user={data.user} onEditPress={handleEditPress} />
              </View>
            )}

            <View style={styles.trackerContainer}>
              {renderTracker()}
            </View>
          </OstrichRefreshScrollView>
        </View>

      {/* Permission modal — shown when user taps "enable location" */}
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
