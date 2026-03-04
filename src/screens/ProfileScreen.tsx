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
import { ProfileBadgesRow } from '../components/profile/ProfileBadgesRow';
import { ProfileStatsGrid } from '../components/profile/ProfileStatsGrid';
import { PersonalRecordsSection } from '../components/profile/PersonalRecordsSection';
import { ActiveCompetitionsSection } from '../components/profile/ActiveCompetitionsSection';
import { RecentWorkoutsSection } from '../components/profile/RecentWorkoutsSection';
import { ClubAffiliationsSection } from '../components/profile/ClubAffiliationsSection';
import { NotificationBadge } from '../components/profile/NotificationBadge';
import { NotificationModal } from '../components/profile/NotificationModal';
import { ProfileDataService } from '../services/backend/ProfileDataService';
import type { ProfileStats, PersonalRecord, ActiveCompetition, RecentWorkout, ClubAffiliation } from '../services/backend/ProfileDataService';
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
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [competitions, setCompetitions] = useState<ActiveCompetition[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [clubs, setClubs] = useState<ClubAffiliation[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(true);
  const [rewardDestination, setRewardDestination] = useState<string | null>(null);

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
  useEffect(() => {
    if (!isOwner) { setRewardDestination(null); return; }
    (async () => {
      try {
        const teamId = await AsyncStorage.getItem('@runstr:selected_team_id');
        if (!teamId) { setRewardDestination(null); return; }
        if (isSelfTeam(teamId)) { setRewardDestination('You'); return; }
        if (isPPQTeam(teamId)) { setRewardDestination('PPQ.AI'); return; }
        if (isCommunityTeam(teamId)) {
          const uuid = extractCommunityTeamUUID(teamId);
          const team = await UserTeamService.getTeamById(uuid);
          setRewardDestination(team?.name || 'Community Team');
          return;
        }
        const charity = getCharityById(teamId);
        setRewardDestination(charity?.name || null);
      } catch {
        setRewardDestination(null);
      }
    })();
  }, [isOwner]);

  // Load profile sections via ProfileDataService
  const loadProfileSections = useCallback(async (npub: string) => {
    setIsLoadingSections(true);
    try {
      const [s, p, c, w, cl] = await Promise.all([
        ProfileDataService.getUserStats(npub),
        ProfileDataService.getUserPRs(npub),
        ProfileDataService.getUserActiveCompetitions(npub),
        ProfileDataService.getUserRecentWorkouts(npub, 5),
        ProfileDataService.getUserClubs(npub),
      ]);
      if (!isMountedRef.current) return;
      setStats(s); setPrs(p); setCompetitions(c); setRecentWorkouts(w); setClubs(cl);
    } catch (err) {
      console.error('[ProfileScreen] Failed to load profile sections:', err);
    } finally {
      if (isMountedRef.current) setIsLoadingSections(false);
    }
  }, []);

  useEffect(() => { if (targetNpub) loadProfileSections(targetNpub); }, [targetNpub, loadProfileSections]);

  // Music player header — refresh on focus
  useFocusEffect(useCallback(() => {
    MusicPlayerPreferencesService.isMusicPlayerHeaderEnabled().then(setMusicPlayerHeaderEnabled);
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

  const handleCompetitionPress = useCallback((id: string) => {
    navigation.navigate('DynamicEventDetail', { eventId: id });
  }, [navigation]);

  const handleClubPress = useCallback((id: string) => {
    navigation.navigate('EnhancedTeamScreen', { team: { id }, userIsMember: true });
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

  const subscriptionTier: 'free' | 'supporter' | 'pro' = (() => {
    if (!data.subscription || data.subscription.status !== 'active') return 'free';
    return data.subscription.type === 'captain' ? 'pro' : 'supporter';
  })();

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

        {isOwner && (
          <View style={styles.sectionGap}>
            <TouchableOpacity style={styles.startWorkoutBtn} onPress={handleStartWorkout} activeOpacity={0.7}>
              <Text style={styles.startWorkoutText}>Start Workout</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionGap}>
          <ProfileBadgesRow subscriptionTier={subscriptionTier} clubs={clubs}
            isOwner={isOwner} onClubPress={handleClubPress}
            rewardDestination={isOwner ? rewardDestination : null}
            onDestinationPress={isOwner ? handleDestinationPress : undefined} />
        </View>

        <View style={styles.sectionGap}>
          <ProfileStatsGrid stats={stats} isLoading={isLoadingSections} />
        </View>

        <View style={styles.sectionGap}><PersonalRecordsSection records={prs} /></View>

        <View style={styles.sectionGap}>
          <ActiveCompetitionsSection competitions={competitions} onCompetitionPress={handleCompetitionPress} />
        </View>

        <View style={styles.sectionGap}>
          <RecentWorkoutsSection workouts={recentWorkouts} isOwner={isOwner}
            onViewAllPress={() => navigation.navigate('WorkoutHistory', { userId: targetNpub, pubkey: targetNpub })} />
        </View>

        <View style={styles.sectionGap}>
          <ClubAffiliationsSection clubs={clubs} onClubPress={handleClubPress} />
        </View>
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
    backgroundColor: theme.colors.cardBackground, borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.accent,
    paddingVertical: 14,
  },
  startWorkoutText: {
    fontSize: 16, fontWeight: theme.typography.weights.semiBold as any,
    color: theme.colors.accent,
  },
});

export const ProfileScreen = React.memo(ProfileScreenComponent);
