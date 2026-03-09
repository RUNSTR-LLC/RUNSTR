/**
 * ProfileScreen - Unified profile page
 *
 * Composes section components for both the current user (tab root)
 * and other users (navigated via pubkey route param).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { ProfileScreenData } from '../types';
import type { User } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { npubEncode } from '../utils/nostrEncoding';
import Toast from 'react-native-toast-message';
import {
  getCharityById,
  isSelfTeam,
  isPPQTeam,
  isCommunityTeam,
  extractCommunityTeamUUID,
} from '../constants/charities';
import { UserTeamService } from '../services/backend/UserTeamService';
import { NostrFetchLogger } from '../utils/NostrFetchLogger';
import { MusicPlayerPreferencesService } from '../services/music/MusicPlayerPreferencesService';
import { HeaderMusicControls } from '../components/music/HeaderMusicControls';
import { ProfileHero } from '../components/profile/ProfileHero';
import { ProfileDashboardGrid } from '../components/profile/ProfileDashboardGrid';
import { LevelCard } from '../components/profile/LevelCard';
import { ActivityBreakdown } from '../components/profile/ActivityBreakdown';
import { ClubAffiliationsSection } from '../components/profile/ClubAffiliationsSection';
import { NotificationBadge } from '../components/profile/NotificationBadge';
import { NotificationModal } from '../components/profile/NotificationModal';
import { ProfileDataService } from '../services/backend/ProfileDataService';
import type { RecentWorkout, ClubAffiliation, ProfileLevelData, ActivityBreakdownData } from '../services/backend/ProfileDataService';
import { useNostrProfile } from '../hooks/useCachedData';

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
  onManageSubscription?: () => void;
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
  const [rewardDestination, setRewardDestination] = useState<string | null>(null);
  const [rewardDestinationImage, setRewardDestinationImage] = useState<number | undefined>(undefined);

  const isOwner = !pubkey || pubkey === userNpub;
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
    (async () => {
      try {
        const id = data.user.id;
        if (!id) return;
        if (id.startsWith('npub')) { setUserNpub(id); return; }
        if (id.length === 64) { setUserNpub(npubEncode(id)); return; }
        const stored = await AsyncStorage.getItem('@runstr:npub');
        if (stored) setUserNpub(stored);
      } catch {
        try { const s = await AsyncStorage.getItem('@runstr:npub'); if (s) setUserNpub(s); } catch {}
      }
    })();
  }, [data.user.id]);

  // Load reward destination (owner only)
  const loadRewardDestination = useCallback(async () => {
    if (!isOwner) { setRewardDestination(null); setRewardDestinationImage(undefined); return; }
    try {
      const teamId = await AsyncStorage.getItem('@runstr:selected_team_id');
      if (!teamId) {
        const defaultCharity = getCharityById('als-foundation');
        setRewardDestination(defaultCharity?.name || 'ALS Foundation');
        setRewardDestinationImage(defaultCharity?.image);
        return;
      }
      if (isSelfTeam(teamId)) { setRewardDestination('You'); setRewardDestinationImage(undefined); return; }
      if (isPPQTeam(teamId)) {
        const ppq = getCharityById('ppq-ai');
        setRewardDestination('PPQ.AI');
        setRewardDestinationImage(ppq?.image);
        return;
      }
      if (isCommunityTeam(teamId)) {
        const uuid = extractCommunityTeamUUID(teamId);
        const team = await UserTeamService.getTeamById(uuid);
        setRewardDestination(team?.name || 'Community Team');
        setRewardDestinationImage(undefined);
        return;
      }
      const charity = getCharityById(teamId);
      setRewardDestination(charity?.name || null);
      setRewardDestinationImage(charity?.image);
    } catch {
      setRewardDestination(null);
      setRewardDestinationImage(undefined);
    }
  }, [isOwner]);

  useEffect(() => { loadRewardDestination(); }, [loadRewardDestination]);

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

  // Refresh reward destination + clubs + music header on focus
  useFocusEffect(useCallback(() => {
    MusicPlayerPreferencesService.isMusicPlayerHeaderEnabled().then(setMusicPlayerHeaderEnabled);
    loadRewardDestination();
    if (targetNpub) {
      ProfileDataService.clearProfileCache(targetNpub);
      ProfileDataService.getUserClubs(targetNpub).then(setClubs).catch(() => {});
    }
  }, [loadRewardDestination, targetNpub]));

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
      await NDK.reconnect().catch(() => {});
      const { DirectNostrProfileService: DPS } = require('../services/user/directNostrProfileService');
      await DPS.getCurrentUserProfile(true).catch(() => {});
      await onRefresh?.();
      if (targetNpub) await loadProfileSections(targetNpub);
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

  const handleEditPress = useCallback(() => {
    const parent = navigation.getParent();
    (parent || navigation).navigate('ProfileEdit' as any);
  }, [navigation]);

  const handleStartWorkout = useCallback(() => {
    const parent = navigation.getParent();
    (parent || navigation).navigate('Exercise');
  }, [navigation]);

  const handleDestinationPress = useCallback(() => {
    const parent = navigation.getParent();
    (parent || navigation).navigate('Rewards');
  }, [navigation]);

  const handleStatsPress = useCallback(() => {
    const parent = navigation.getParent();
    (parent || navigation).navigate('StatsDetail' as any, { npub: targetNpub });
  }, [navigation, targetNpub]);

  return (
    <TexturedBackground>
      {isOwner && (
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

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}
        refreshControl={isOwner ? <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.colors.text} /> : undefined}>
        <View style={styles.sectionGap}>
          <ProfileHero user={isOwner ? data.user : otherUser} isOwner={isOwner}
            isLoading={isOwner ? isLoadingSections : !otherUser}
            onEditPress={isOwner ? handleEditPress : undefined}
            onBackPress={!isOwner ? () => navigation.goBack() : undefined}
            onSettingsPress={undefined} />
        </View>

        {isOwner && (
          <View style={styles.sectionGap}>
            <NotificationBadge onPress={() => setShowNotificationModal(true)} />
          </View>
        )}

        {isOwner ? (
          <>
            <View style={styles.sectionGap}>
              <TouchableOpacity style={styles.startWorkoutBtn} onPress={handleStartWorkout} activeOpacity={0.7}>
                <Text style={styles.startWorkoutText}>Start Workout</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gridContainer}>
              <ProfileDashboardGrid
                levelData={levelData}
                clubs={clubs}
                recentWorkouts={recentWorkouts}
                rewardDestination={rewardDestination}
                rewardDestinationImage={rewardDestinationImage}
                isLoading={isLoadingSections}
                onLevelPress={handleStatsPress}
                onClubPress={handleClubPress}
                onEmptyClubPress={undefined}
                onRewardsPress={handleDestinationPress}
                onWorkoutsPress={() => navigation.navigate('WorkoutHistory', { userId: targetNpub, pubkey: targetNpub })}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionGap}>
              <LevelCard levelData={levelData} isLoading={isLoadingSections} />
            </View>

            <View style={styles.sectionGap}>
              <ActivityBreakdown breakdown={activityBreakdown} isLoading={isLoadingSections} />
            </View>

            <View style={styles.sectionGap}>
              <ClubAffiliationsSection clubs={clubs} onClubPress={(id) => {
                const club = clubs.find(c => c.id === id);
                handleClubPress(id, club?.name || '');
              }} />
            </View>
          </>
        )}
      </ScrollView>

      {isOwner && (
        <NotificationModal visible={showNotificationModal} onClose={() => setShowNotificationModal(false)} />
      )}
    </TexturedBackground>
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
  sectionGap: { marginBottom: 16 },
  startWorkoutBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, borderWidth: 1,
    borderColor: theme.colors.text,
    backgroundColor: 'transparent',
    paddingVertical: 13,
  },
  startWorkoutText: {
    fontSize: 16, fontWeight: theme.typography.weights.semiBold as any,
    color: theme.colors.text,
  },
  gridContainer: {
    marginBottom: 16,
  },
});

export const ProfileScreen = React.memo(ProfileScreenComponent);
