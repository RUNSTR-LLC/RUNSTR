/**
 * ClubPageScreen - Full club detail page
 *
 * Stack screen pushed from ClubsScreen. Shows club info, join/leave button,
 * leaderboard, chat, and members sections. Uses route params for instant
 * header render while club details load from Supabase.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { ClubService } from '../services/backend/ClubService';
import { ClubMembershipService } from '../services/backend/ClubMembershipService';
import { ClubLeaderboardSection } from '../components/club/ClubLeaderboardSection';
import { ClubChatSection } from '../components/club/ClubChatSection';
import { ClubMembersSection } from '../components/club/ClubMembersSection';
import { ClubEarningsCard } from '../components/club/ClubEarningsCard';
import { CaptainSettingsModal } from '../components/club/CaptainSettingsModal';
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
  const [showCaptainSettings, setShowCaptainSettings] = useState(false);

  // -------------------------------------------------------------------------
  // Data Loading
  // -------------------------------------------------------------------------

  const loadClubData = useCallback(async () => {
    try {
      // Get user npub from AsyncStorage
      const npub = await AsyncStorage.getItem('@runstr:npub');
      setUserNpub(npub);

      // Fetch club details
      const clubData = await ClubService.getClubById(clubId);
      setClub(clubData);

      // Check membership and role
      if (npub) {
        const memberStatus = await ClubMembershipService.isMember(clubId, npub);
        setIsMember(memberStatus);

        if (memberStatus) {
          // Fetch membership role (source of truth for captain status)
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
        // Refresh club data to get updated member count
        const updated = await ClubService.getClubById(clubId);
        if (updated) setClub(updated);
      } else {
        Alert.alert('Could not join', result.error || 'Please try again.');
      }
    } catch (err) {
      console.error('[ClubPageScreen] Join error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoin = async () => {
    if (!userNpub || isJoining) return;

    // Check if user is already in another club -- offer switch dialog
    const currentClubId = await ClubMembershipService.getCurrentClub(userNpub);
    if (currentClubId && currentClubId !== clubId) {
      Alert.alert(
        'Switch Clubs?',
        `You're already in a club. Leave it and join ${club?.name || clubName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave & Join',
            onPress: () => performJoin(true),
          },
        ]
      );
    } else {
      performJoin(false);
    }
  };

  const handleLeaveConfirm = () => {
    Alert.alert(
      'Leave Club',
      `Are you sure you want to leave ${club?.name || clubName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: handleLeave,
        },
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
        // Refresh club data to get updated member count
        const updated = await ClubService.getClubById(clubId);
        if (updated) setClub(updated);
      } else {
        Alert.alert('Could not leave', result.error || 'Please try again.');
      }
    } catch (err) {
      console.error('[ClubPageScreen] Leave error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLeaving(false);
    }
  };

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
      // User cancelled or share failed silently
      console.log('[ClubPageScreen] Share dismissed or failed:', err);
    }
  };

  // -------------------------------------------------------------------------
  // Ellipsis Menu
  // -------------------------------------------------------------------------

  const handleEllipsisMenu = () => {
    if (isCaptain) {
      // Captains get the full settings modal
      setShowCaptainSettings(true);
    } else if (isMember) {
      // Regular members get a simple menu
      Alert.alert(
        club?.name || clubName,
        undefined,
        [
          { text: 'Share Club', onPress: handleShareClub },
          {
            text: 'Leave Club',
            style: 'destructive',
            onPress: handleLeaveConfirm,
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      // Non-members just get share
      Alert.alert(
        club?.name || clubName,
        undefined,
        [
          { text: 'Share Club', onPress: handleShareClub },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleCaptainSettingsClose = () => {
    setShowCaptainSettings(false);
  };

  const handleClubUpdated = async () => {
    // Clear cache and reload club data after captain makes changes
    await ClubService.clearCache();
    await loadClubData();
  };

  // -------------------------------------------------------------------------
  // Pull-to-refresh
  // -------------------------------------------------------------------------

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
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
  const memberCountText =
    club?.member_count === 1 ? '1 member' : `${club?.member_count ?? 0} members`;
  // Membership role is the source of truth for captain status (survives transferCaptainship).
  // Fall back to created_by_npub if role lookup hasn't completed yet.
  const isCaptain = userRole === 'captain' || (
    userRole === null && Boolean(userNpub && club?.created_by_npub && userNpub === club.created_by_npub)
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {displayName}
        </Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleEllipsisMenu}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={20}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      </View>

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
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.accent}
            />
          }
        >
          {/* Club info card */}
          <View style={styles.infoCard}>
            <Text style={styles.clubTitle}>{club.name}</Text>

            {club.description ? (
              <Text style={styles.clubDescription}>{club.description}</Text>
            ) : null}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.statText}>{memberCountText}</Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons
                  name="fitness-outline"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.statText}>Active this week</Text>
              </View>
            </View>
          </View>

          {/* Join / Leave button */}
          {userNpub && (
            <View style={styles.actionContainer}>
              {isMember ? (
                <TouchableOpacity
                  style={styles.leaveButton}
                  onPress={handleLeaveConfirm}
                  disabled={isLeaving}
                  activeOpacity={0.7}
                >
                  {isLeaving ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textMuted}
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="log-out-outline"
                        size={20}
                        color={theme.colors.textMuted}
                      />
                      <Text style={styles.leaveButtonText}>Leave Club</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={handleJoin}
                  disabled={isJoining}
                  activeOpacity={0.7}
                >
                  {isJoining ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.accentText}
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="enter-outline"
                        size={20}
                        color={theme.colors.accentText}
                      />
                      <Text style={styles.joinButtonText}>Join Club</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Invite Members section (captain only) */}
          {isCaptain && (
            <View style={styles.inviteCard}>
              <Text style={styles.inviteTitle}>Invite Members</Text>
              <Text style={styles.inviteDescription}>
                Share your club with friends to grow your crew.
              </Text>

              <View style={styles.inviteStatsRow}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={theme.colors.accent}
                />
                <Text style={styles.inviteStatsText}>{memberCountText}</Text>
              </View>

              <TouchableOpacity
                style={styles.inviteShareButton}
                onPress={handleShareClub}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="share-outline"
                  size={20}
                  color={theme.colors.accentText}
                />
                <Text style={styles.inviteShareButtonText}>Share Club</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Earnings card (captain only) */}
          {isCaptain && (
            <ClubEarningsCard
              clubId={clubId}
              lightningAddress={club.lightning_address}
            />
          )}

          {/* Leaderboard section */}
          <ClubLeaderboardSection clubId={clubId} />

          {/* Chat section */}
          <ClubChatSection
            clubId={clubId}
            clubName={displayName}
            captainNpub={club.created_by_npub || ''}
            isMember={isMember}
          />

          {/* Members section */}
          <ClubMembersSection clubId={clubId} />

          {/* Bottom spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* Captain Settings Modal */}
      {club && userNpub && (
        <CaptainSettingsModal
          visible={showCaptainSettings}
          onClose={handleCaptainSettingsClose}
          club={club}
          userNpub={userNpub}
          onClubUpdated={handleClubUpdated}
        />
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
    marginHorizontal: 8,
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
    borderColor: theme.colors.accent,
    borderRadius: 12,
  },
  goBackText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },

  // Club info card
  infoCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  clubTitle: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 6,
  },
  clubDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  // Join / Leave button
  actionContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentText,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    gap: 8,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },

  // Invite Members card (captain)
  inviteCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  inviteDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  inviteStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  inviteStatsText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },
  inviteShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  inviteShareButtonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentText,
  },

  bottomSpacer: {
    height: 40,
  },
});

export default ClubPageScreen;
