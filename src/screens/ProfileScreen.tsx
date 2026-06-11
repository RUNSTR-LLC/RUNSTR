/**
 * ProfileScreen - Unified profile page
 *
 * Composes section components for both the current user (tab root)
 * and other users (navigated via pubkey route param).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OstrichRefreshScrollView } from '../components/ui/OstrichRefreshScrollView';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { ProfileScreenData } from '../types';
import type { User } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { npubEncode } from '../utils/nostrEncoding';
import Toast from 'react-native-toast-message';
import { NostrFetchLogger } from '../utils/NostrFetchLogger';
import { MusicPlayerPreferencesService } from '../services/music/MusicPlayerPreferencesService';
import { HeaderMusicControls } from '../components/music/HeaderMusicControls';
import { ProfileHero } from '../components/profile/ProfileHero';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { LevelCard } from '../components/profile/LevelCard';
import { ActivityBreakdown } from '../components/profile/ActivityBreakdown';
import { ClubAffiliationsSection } from '../components/profile/ClubAffiliationsSection';
import { NotificationBadge } from '../components/profile/NotificationBadge';
import { NotificationModal } from '../components/profile/NotificationModal';
import { ProfileDataService } from '../services/backend/ProfileDataService';
import { ClubChatService } from '../services/backend/ClubChatService';
import type { RecentWorkout, ClubAffiliation, ProfileLevelData, ActivityBreakdownData } from '../services/backend/ProfileDataService';
import { useNostrProfile } from '../hooks/useCachedData';
import LocalWorkoutStorageService from '../services/fitness/LocalWorkoutStorageService';
import { SupabaseRewardService } from '../services/rewards/SupabaseRewardService';
import { navigate } from '../navigation/navigationRef';
import { ActivityCategoryBar } from '../components/activity/ActivityCategoryBar';
import { activityGridService, type GridPosition } from '../services/activity/ActivityGridService';
import { appPermissionService } from '../services/initialization/AppPermissionService';
import { PermissionRequestModal } from '../components/permissions/PermissionRequestModal';
import { FEATURES } from '../config/features';
import { RunningTrackerScreen } from './activity/RunningTrackerScreen';
import { WalkingTrackerScreen } from './activity/WalkingTrackerScreen';
import { CyclingTrackerScreen } from './activity/CyclingTrackerScreen';
import { HikingTrackerScreen } from './activity/HikingTrackerScreen';

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
  const route = useRoute<any>();
  const pubkey: string | undefined = route?.params?.pubkey;

  const [userNpub, setUserNpub] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [musicPlayerHeaderEnabled, setMusicPlayerHeaderEnabled] = useState(false);
  const isMountedRef = useRef(true);
  const [levelData, setLevelData] = useState<ProfileLevelData | null>(null);
  const [activityBreakdown, setActivityBreakdown] = useState<ActivityBreakdownData | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [clubs, setClubs] = useState<ClubAffiliation[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // Activity launcher state
  const [gridPosition, setGridPosition] = useState<GridPosition>({ row: 0, column: 0 });
  const [positionLoaded, setPositionLoaded] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

  // Permission state (deferred to hold-start for cardio)
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const isOwner = !pubkey || pubkey === userNpub || (pubkey.length === 64 && !pubkey.startsWith('npub1') && npubEncode(pubkey) === userNpub);
  const targetNpub = pubkey || userNpub;

  // Fetch Nostr profile for other users
  const { profile: otherProfile } = useNostrProfile(pubkey && !isOwner ? pubkey : null);
  const otherUser: User | null = otherProfile ? {
    id: pubkey!, name: otherProfile.name || otherProfile.display_name || '',
    npub: otherProfile.npub || pubkey!, role: 'member' as const, createdAt: '',
    bio: otherProfile.about, picture: otherProfile.picture, banner: otherProfile.banner,
    lud16: otherProfile.lud16, displayName: otherProfile.display_name || otherProfile.name,
    website: otherProfile.website,
  } : null;

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  // Load user npub on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const id = data.user.id;
        if (!id) return;
        if (id.startsWith('npub')) { if (isMounted) setUserNpub(id); return; }
        if (id.length === 64) { if (isMounted) setUserNpub(npubEncode(id)); return; }
        const stored = await AsyncStorage.getItem('@runstr:npub');
        if (stored && isMounted) setUserNpub(stored);
      } catch {
        try { const s = await AsyncStorage.getItem('@runstr:npub'); if (s && isMounted) setUserNpub(s); } catch {}
      }
    })();
    return () => { isMounted = false; };
  }, [data.user.id]);

  // Load profile sections via ProfileDataService
  const loadProfileSections = useCallback(async (npub: string) => {
    setIsLoadingSections(true);
    try {
      // Use allSettled so one failing query doesn't block others
      const [ldR, abR, wR, clR] = await Promise.allSettled([
        ProfileDataService.getLevelData(npub),
        ProfileDataService.getActivityBreakdown(npub),
        ProfileDataService.getUserRecentWorkouts(npub, 5),
        ProfileDataService.getUserClubs(npub),
      ]);
      if (!isMountedRef.current) return;
      if (ldR.status === 'fulfilled') setLevelData(ldR.value);
      if (abR.status === 'fulfilled') setActivityBreakdown(abR.value);
      if (wR.status === 'fulfilled') setRecentWorkouts(wR.value);
      if (clR.status === 'fulfilled') setClubs(clR.value);
    } catch (err) {
      console.error('[ProfileScreen] Failed to load profile sections:', err);
    } finally {
      if (isMountedRef.current) setIsLoadingSections(false);
    }
  }, []);

  // Load sections when targetNpub is available; if empty, stop loading
  useEffect(() => {
    if (targetNpub) { loadProfileSections(targetNpub); }
    else { setIsLoadingSections(false); }
  }, [targetNpub, loadProfileSections]);

  // Refresh clubs + streak + music header on focus
  useFocusEffect(useCallback(() => {
    MusicPlayerPreferencesService.isMusicPlayerHeaderEnabled().then(setMusicPlayerHeaderEnabled);
    if (isOwner) {
      LocalWorkoutStorageService.getAllWorkouts()
        .then((w) => setCurrentStreak(computeCurrentStreak(w)))
        .catch(() => {});

      // Load total earnings for the ProfileHero earnings badge
      (async () => {
        try {
          const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
          if (!pubkey) return;
          const data = await SupabaseRewardService.getEarningsByDestination(pubkey);
          setTotalEarnings(data.reduce((sum, d) => sum + d.totalSats, 0));
        } catch (err) {
          console.warn('[ProfileScreen] Failed to load earnings:', err);
        }
      })();
    }
    if (targetNpub) {
      ProfileDataService.clearProfileCache(targetNpub);
      ProfileDataService.getUserClubs(targetNpub).then(setClubs).catch(() => {});
    }
  }, [targetNpub, isOwner]));

  // Refresh unread chat count for the user's current team on focus
  useFocusEffect(
    useCallback(() => {
      const teamId = data?.currentTeam?.id;
      if (!teamId) {
        setUnreadChatCount(0);
        return;
      }
      let cancelled = false;
      ClubChatService.getUnreadCount(teamId)
        .then((count) => {
          if (!cancelled) setUnreadChatCount(count);
        })
        .catch(() => {
          if (!cancelled) setUnreadChatCount(0);
        });
      return () => {
        cancelled = true;
      };
    }, [data?.currentTeam?.id]),
  );

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
        targetNpub ? loadProfileSections(targetNpub) : Promise.resolve(),
      ]);
      NostrFetchLogger.end('ProfileScreen.pullToRefresh', 1, 'success');
    } catch (error) {
      NostrFetchLogger.error('ProfileScreen.pullToRefresh', error as Error);
      Toast.show({ type: 'error', text1: 'Refresh failed', text2: 'Check your connection and try again', position: 'bottom', visibilityTime: 3000 });
    } finally { setIsRefreshing(false); }
  }, [onRefresh, targetNpub, loadProfileSections]);

  const handleClubPress = useCallback((id: string, name: string) => {
    const parent = navigation.getParent();
    (parent || navigation).navigate('ClubPage' as any, { clubId: id, clubName: name });
  }, [navigation]);

  const handleTeamPress = useCallback(() => {
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

    const { category, activity } = activityGridService.getActivityAt(gridPosition);
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

    let tracker: React.ReactNode;
    switch (category.key) {
      case 'cardio':
        switch (activity) {
          case 'run':
            tracker = <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
            break;
          case 'walk':
            tracker = <WalkingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
            break;
          case 'cycle':
            tracker = <CyclingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
            break;
          case 'hiking':
            tracker = <HikingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
            break;
          default:
            tracker = <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
        }
        break;
      default:
        tracker = <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
    }

    // A render-time crash inside an active tracker used to white-screen the whole
    // app (and lose the workout). The in-progress session lives in the
    // simpleRunTracker singleton, so "Retry" re-mounts the tracker and resumes it.
    return (
      <ScreenErrorBoundary screenName="Workout Tracker">
        {tracker}
      </ScreenErrorBoundary>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <TexturedBackground>
        {/* Header — hidden during active workout */}
      {isOwner && !isWorkoutActive && (
        <View style={styles.header}>
          {musicPlayerHeaderEnabled ? (
            <HeaderMusicControls onSettingsPress={handleSettingsPress} />
          ) : (
            <>
              <View style={styles.headerSpacer} />
              <TouchableOpacity style={styles.headerButton} onPress={handleSettingsPress}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="menu-outline" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Owner view — same container + scroll wrapper whether workout is active
          or not, so the tracker component below keeps a stable position in the
          tree and React does not unmount it when isWorkoutActive flips.
          scrollEnabled toggles pull-to-refresh off during a workout. */}
      {isOwner ? (
        <View style={isWorkoutActive ? styles.fullScreenTracker : styles.ownerContent}>
          <OstrichRefreshScrollView
            style={styles.ownerScroll}
            contentContainerStyle={styles.ownerScrollContent}
            refreshing={!isWorkoutActive && isRefreshing}
            onRefresh={handleRefresh}
            scrollEnabled={!isWorkoutActive}
          >
            {!isWorkoutActive && (
              <View style={styles.sectionGap}>
                <ProfileHero user={data.user} isOwner={true}
                  isLoading={isLoadingSections}
                  level={levelData?.level ?? 0}
                  streak={currentStreak}
                  earnings={totalEarnings}
                  currentTeam={data.currentTeam ? {
                    id: data.currentTeam.id,
                    name: data.currentTeam.name,
                    avatarUrl: null,
                  } : null}
                  unreadChatCount={unreadChatCount}
                  onTeamPress={handleTeamPress}
                  onEditPress={handleEditPress}
                  onSettingsPress={undefined}
                  onLevelPress={() => {
                    const parent = navigation.getParent();
                    (parent || navigation).navigate('LevelDetail' as any);
                  }}
                  onEarningsPress={() => navigate('Rewards')} />
              </View>
            )}

            {!isWorkoutActive && (
              <View style={styles.sectionGap}>
                <NotificationBadge onPress={() => setShowNotificationModal(true)} />
              </View>
            )}

            {!isWorkoutActive && (
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
      ) : (
        <OstrichRefreshScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        >
          <View style={styles.sectionGap}>
            <ProfileHero user={otherUser} isOwner={false}
              isLoading={!otherUser}
              level={levelData?.level ?? 0}
              onBackPress={() => navigation.goBack()}
              onSettingsPress={undefined}
              onLevelPress={() => {
                const parent = navigation.getParent();
                (parent || navigation).navigate('LevelDetail' as any);
              }}
              onEarningsPress={() => navigate('Rewards')} />
          </View>

          <View style={styles.sectionGap}>
            <LevelCard levelData={levelData} isLoading={isLoadingSections} />
          </View>
          <View style={styles.sectionGap}>
            <ActivityBreakdown breakdown={activityBreakdown} isLoading={isLoadingSections} />
          </View>
          {FEATURES.teams && (
          <View style={styles.sectionGap}>
            <ClubAffiliationsSection clubs={clubs} onClubPress={(id) => {
              const club = clubs.find(c => c.id === id);
              handleClubPress(id, club?.name || '');
            }} />
          </View>
          )}
        </OstrichRefreshScrollView>
      )}

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

      {isOwner && (
        <NotificationModal visible={showNotificationModal} onClose={() => setShowNotificationModal(false)} />
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
  ownerScrollContent: { flexGrow: 1 },
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
