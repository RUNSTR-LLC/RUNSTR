/**
 * ClubPageScreen - Full club detail page
 *
 * Stack screen pushed from ClubsScreen. Shows club info, join/leave button,
 * leaderboard, chat, and members sections. Uses route params for instant
 * header render while club details load from Supabase.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { ClubService } from '../services/backend/ClubService';
import { ClubMembershipService } from '../services/backend/ClubMembershipService';
import { ClubBannerHeader } from '../components/club/ClubBannerHeader';
import { ClubInfoSection } from '../components/club/ClubInfoSection';
import type { CooldownState } from '../components/club/ClubInfoSection';
import { ClubLeaderboardSection } from '../components/club/ClubLeaderboardSection';
import { ClubEventsSection } from '../components/club/ClubEventsSection';
import { ClubChatSection } from '../components/club/ClubChatSection';
import { ClubMembersSection } from '../components/club/ClubMembersSection';
import { ClubEarningsCard } from '../components/club/ClubEarningsCard';
import { CaptainSettingsModal } from '../components/club/CaptainSettingsModal';
import { CustomAlert } from '../components/ui/CustomAlert';
import type { Club } from '../types/club';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClubPageRouteParams {
  clubId: string;
  clubName: string;
}

interface ClubPageScreenProps {
  navigation: any;
  route: { params: ClubPageRouteParams };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ClubPageScreen: React.FC<ClubPageScreenProps> = ({
  navigation,
  route,
}) => {
  const { clubId, clubName } = route.params;

  // State
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<'member' | 'captain' | null>(null);
  const [userNpub, setUserNpub] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCaptainSettings, setShowCaptainSettings] = useState(false);
  const [cooldown, setCooldown] = useState<CooldownState | null>(null);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
  }>({ visible: false, title: '', buttons: [] });

  // Lazy loading: only render below-fold sections after first scroll
  const [belowFoldVisible, setBelowFoldVisible] = useState(false);
  const belowFoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-reveal after 600ms even without scroll (ensures content appears)
  useEffect(() => {
    if (!isLoading && club && !belowFoldVisible) {
      belowFoldTimer.current = setTimeout(() => setBelowFoldVisible(true), 600);
    }
    return () => { if (belowFoldTimer.current) clearTimeout(belowFoldTimer.current); };
  }, [isLoading, club, belowFoldVisible]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!belowFoldVisible && e.nativeEvent.contentOffset.y > 50) {
      setBelowFoldVisible(true);
    }
  }, [belowFoldVisible]);

  const showAlert = useCallback((title: string, message?: string, buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>) => {
    setAlertConfig({ visible: true, title, message, buttons: buttons || [{ text: 'OK' }] });
  }, []);

  // -------------------------------------------------------------------------
  // Data Loading
  // -------------------------------------------------------------------------

  const loadClubData = useCallback(async () => {
    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      setUserNpub(npub);

      const clubData = await ClubService.getClubById(clubId);
      setClub(clubData);

      if (npub) {
        const memberStatus = await ClubMembershipService.isMember(clubId, npub);
        setIsMember(memberStatus);

        if (memberStatus) {
          const members = await ClubMembershipService.getClubMembers(clubId);
          const myMembership = members.find((m) => m.member_npub === npub);
          setUserRole(myMembership?.role as 'member' | 'captain' || null);

          // Fetch cooldown status
          const cd = await ClubMembershipService.getCooldownRemaining(npub);
          setCooldown(cd);
        } else {
          setUserRole(null);
          setCooldown(null);
        }
      }
    } catch (err) {
      console.error('[ClubPageScreen] Error loading club data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadClubData();
    }, [loadClubData])
  );

  // -------------------------------------------------------------------------
  // Join / Leave
  // -------------------------------------------------------------------------

  const performJoin = async (useSwitchClub: boolean) => {
    if (!userNpub) return;
    setIsJoining(true);

    try {
      const result = useSwitchClub
        ? await ClubMembershipService.switchClub(clubId, userNpub)
        : await ClubMembershipService.joinClub(clubId, userNpub);

      if (result.success) {
        setIsMember(true);
        const updated = await ClubService.getClubById(clubId);
        if (updated) setClub(updated);
        // Refresh cooldown after joining
        const cd = await ClubMembershipService.getCooldownRemaining(userNpub);
        setCooldown(cd);
      } else {
        showAlert('Could not join', result.error || 'Please try again.');
      }
    } catch (err) {
      console.error('[ClubPageScreen] Join error:', err);
      showAlert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoin = async () => {
    if (!userNpub || isJoining) return;

    const currentClubId = await ClubMembershipService.getCurrentClub(userNpub);
    if (currentClubId && currentClubId !== clubId) {
      showAlert(
        'Switch Clubs?',
        `You're already in a club. Leave it and join ${club?.name || clubName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave & Join', onPress: () => performJoin(true) },
        ]
      );
    } else {
      performJoin(false);
    }
  };

  const handleLeaveConfirm = () => {
    showAlert(
      'Leave Club',
      `Are you sure you want to leave ${club?.name || clubName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: handleLeave },
      ]
    );
  };

  const handleLeave = async () => {
    if (!userNpub || isLeaving) return;
    setIsLeaving(true);

    try {
      const result = await ClubMembershipService.leaveClub(userNpub);
      if (result.success) {
        setIsMember(false);
        setCooldown(null);
        const updated = await ClubService.getClubById(clubId);
        if (updated) setClub(updated);
      } else {
        showAlert('Could not leave', result.error || 'Please try again.');
      }
    } catch (err) {
      console.error('[ClubPageScreen] Leave error:', err);
      showAlert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleCooldownBlocked = useCallback(() => {
    showAlert(
      '7-Day Cooldown',
      'Clubs have a 7-day cooldown period after joining to keep teams stable. ' +
        `You can leave in ${cooldown?.remainingText || 'a few days'}.`
    );
  }, [showAlert, cooldown]);

  // -------------------------------------------------------------------------
  // Share
  // -------------------------------------------------------------------------

  const handleShareClub = async () => {
    const name = club?.name || clubName;
    try {
      await Share.share({
        message:
          `Join my fitness club "${name}" on RUNSTR!\n\n` +
          `Download RUNSTR and search for "${name}" in the Clubs tab.\n\n` +
          `https://runstr.club`,
      });
    } catch (err) {
      console.log('[ClubPageScreen] Share dismissed or failed:', err);
    }
  };

  // -------------------------------------------------------------------------
  // Ellipsis Menu
  // -------------------------------------------------------------------------

  const handleEllipsisMenu = () => {
    if (isCaptain) {
      setShowCaptainSettings(true);
    } else if (isMember) {
      showAlert(club?.name || clubName, undefined, [
        { text: 'Share Club', onPress: handleShareClub },
        { text: 'Leave Club', style: 'destructive', onPress: handleLeaveConfirm },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      showAlert(club?.name || clubName, undefined, [
        { text: 'Share Club', onPress: handleShareClub },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleClubUpdated = async () => {
    await ClubService.clearCache();
    await loadClubData();
  };

  // -------------------------------------------------------------------------
  // Pull-to-refresh
  // -------------------------------------------------------------------------

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    try {
      await ClubService.clearCache();
      await loadClubData();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadClubData]);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const displayName = club?.name || clubName;
  const isCaptain = userRole === 'captain' || (
    userRole === null && Boolean(userNpub && club?.created_by_npub && userNpub === club.created_by_npub)
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - banner or plain */}
      <ClubBannerHeader
        clubName={displayName}
        bannerUrl={club?.banner_url}
        onBack={() => navigation.goBack()}
        onEllipsis={handleEllipsisMenu}
      />

      {/* Loading state */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading club...</Text>
        </View>
      ) : !club ? (
        <View style={styles.loadingContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={theme.colors.textMuted}
          />
          <Text style={styles.emptyText}>Club not found</Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.accent}
            />
          }
        >
          {/* Club info, join/leave, invite */}
          <ClubInfoSection
            club={club}
            isMember={isMember}
            isCaptain={isCaptain}
            userNpub={userNpub}
            isJoining={isJoining}
            isLeaving={isLeaving}
            cooldown={cooldown}
            onJoin={handleJoin}
            onLeaveConfirm={handleLeaveConfirm}
            onCooldownBlocked={handleCooldownBlocked}
          />

          {/* Earnings card (captain only) */}
          {isCaptain && (
            <ClubEarningsCard
              clubId={clubId}
              lightningAddress={club.lightning_address}
            />
          )}

          {/* Rewards Pool card — hidden for now (wallet security review) */}

          {/* Events section */}
          <ClubEventsSection clubId={clubId} isCaptain={isCaptain} refreshKey={refreshKey} />

          {/* Below-fold sections: lazy loaded on scroll or after 600ms */}
          {belowFoldVisible ? (
            <>
              <ClubLeaderboardSection clubId={clubId} leaderboardMetric={club.leaderboard_metric || 'distance'} refreshKey={refreshKey} />
              <ClubChatSection
                clubId={clubId}
                clubName={displayName}
                captainNpub={club.created_by_npub || ''}
                isMember={isMember}
              />
              <ClubMembersSection clubId={clubId} />
            </>
          ) : (
            <View style={styles.lazyPlaceholder}>
              <ActivityIndicator color={theme.colors.accent} size="small" />
            </View>
          )}

          {/* Bottom spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* Captain Settings Modal */}
      {club && userNpub && (
        <CaptainSettingsModal
          visible={showCaptainSettings}
          onClose={() => setShowCaptainSettings(false)}
          club={club}
          userNpub={userNpub}
          onClubUpdated={handleClubUpdated}
        />
      )}

      {/* Themed alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  goBackButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.text,
    borderRadius: 12,
  },
  goBackText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
  lazyPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default ClubPageScreen;
