/**
 * ClubPageScreen - Full club detail page
 *
 * Stack screen pushed from ClubsScreen. Shows club info, join/leave button,
 * chat, and members sections. Uses route params for instant
 * header render while club details load from Supabase.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { ClubService } from '../services/backend/ClubService';
import { ClubMembershipService } from '../services/backend/ClubMembershipService';
import { ClubBannerHeader } from '../components/club/ClubBannerHeader';
import { ClubInfoSection } from '../components/club/ClubInfoSection';
import { ClubChatSection } from '../components/club/ClubChatSection';
import { ClubEventsSection } from '../components/club/ClubEventsSection';
import { CaptainSettingsModal } from '../components/club/CaptainSettingsModal';
import { SimpleEventCreationModal } from '../components/creation/SimpleEventCreationModal';
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
  const insets = useSafeAreaInsets();

  // State
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<'member' | 'captain' | null>(null);
  const [userNpub, setUserNpub] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showCaptainSettings, setShowCaptainSettings] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
  }>({ visible: false, title: '', buttons: [] });

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

        } else {
          setUserRole(null);
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


  // -------------------------------------------------------------------------
  // Share
  // -------------------------------------------------------------------------


  // -------------------------------------------------------------------------
  // Ellipsis Menu
  // -------------------------------------------------------------------------

  const handleEllipsisMenu = () => {
    if (isCaptain) {
      showAlert(club?.name || clubName, undefined, [
        { text: 'Create Event', onPress: () => setTimeout(() => setShowCreateEvent(true), 400) },
        { text: 'Club Settings', onPress: () => setTimeout(() => setShowCaptainSettings(true), 400) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else if (isMember) {
      showAlert(club?.name || clubName, undefined, [
        { text: 'Leave Club', style: 'destructive', onPress: handleLeaveConfirm },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleClubUpdated = async () => {
    await ClubService.clearCache();
    await loadClubData();
  };

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
        <KeyboardAvoidingView
          style={styles.mainContent}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 56}
        >
          <ScrollView
            style={styles.mainContent}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Club info, join/leave, invite */}
            <ClubInfoSection
              club={club}
              clubId={clubId}
              isMember={isMember}
              userNpub={userNpub}
              isJoining={isJoining}
              onJoin={handleJoin}
            />

            {/* Events created by this club's captain (scoped to club_id) */}
            <ClubEventsSection
              clubId={clubId}
              isCaptain={isCaptain}
              clubName={displayName}
              clubBannerUrl={club.banner_url ?? undefined}
            />

            <ClubChatSection
              clubId={clubId}
              clubName={displayName}
              captainNpub={club.created_by_npub || ''}
              isMember={isMember}
              pinnedMessageId={club.pinned_message_id}
            />
          </ScrollView>
        </KeyboardAvoidingView>
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

      {/* Event Creation Modal (captain only) */}
      <SimpleEventCreationModal
        visible={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onEventCreated={(eventId) => {
          setShowCreateEvent(false);
          navigation.navigate('DynamicEventDetail', { eventId });
        }}
        clubId={clubId}
        clubName={club?.name || clubName}
        clubBannerUrl={club?.banner_url ?? undefined}
      />

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
  mainContent: {
    flex: 1,
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
});

export default ClubPageScreen;
