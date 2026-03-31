/**
 * ClubsScreen - Main screen for the Clubs tab (Tab 2)
 * Shows "Your Club" section + searchable "Browse Clubs" list.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { CustomAlert } from '../components/ui/CustomAlert';
import { Club } from '../types/club';
import { ClubService } from '../services/backend/ClubService';
import { ClubMembershipService } from '../services/backend/ClubMembershipService';
import { ClubCard } from '../components/club/ClubCard';
import { SimpleTeamCreationModal } from '../components/subscription/SimpleTeamCreationModal';
import { nostrProfileService, NostrProfile } from '../services/nostr/NostrProfileService';

const ClubsScreenComponent: React.FC = () => {
  const navigation = useNavigation<any>();

  const [myClub, setMyClub] = useState<Club | null>(null);
  const [myRole, setMyRole] = useState<'member' | 'captain' | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [userNpub, setUserNpub] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Club creation is available to all users
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [captainProfiles, setCaptainProfiles] = useState<Map<string, NostrProfile>>(new Map());
  const [alertConfig, setAlertConfig] = useState<{visible: boolean; title: string; message: string; buttons: any[]}>({
    visible: false, title: '', message: '', buttons: []
  });

  /** Load all clubs and the user's current club. */
  const loadData = useCallback(async () => {
    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      setUserNpub(npub);

      // Fetch all clubs — clear loading spinner as soon as clubs arrive
      const allClubs = await ClubService.fetchActiveClubs();
      setClubs(allClubs);
      setIsLoading(false);

      // Everything below runs after the list is already visible

      // Batch-fetch captain Nostr profiles (non-blocking)
      const captainNpubs = [...new Set(allClubs.map((c) => c.created_by_npub).filter(Boolean))];
      if (captainNpubs.length > 0) {
        nostrProfileService.getProfiles(captainNpubs).then((profiles) => {
          setCaptainProfiles(profiles);
        }).catch((err) => {
          console.warn('[ClubsScreen] Failed to fetch captain profiles:', err);
        });
      }

      // Get user's current club ID
      if (npub) {
        const currentClubId = await ClubMembershipService.getCurrentClub(npub);
        if (currentClubId) {
          const currentClub = allClubs.find((c) => c.id === currentClubId);
          setMyClub(currentClub || null);

          // Determine role: membership role is source of truth (survives transferCaptainship),
          // fall back to created_by_npub if membership lookup fails
          const members = await ClubMembershipService.getClubMembers(currentClubId);
          const myMembership = members.find((m) => m.member_npub === npub);
          if (myMembership) {
            setMyRole(myMembership.role as 'member' | 'captain');
          } else if (currentClub && currentClub.created_by_npub === npub) {
            setMyRole('captain');
          } else {
            setMyRole('member');
          }
        } else {
          setMyClub(null);
          setMyRole(null);
        }

      } else {
        setMyClub(null);
        setMyRole(null);
      }
    } catch (error) {
      console.error('[ClubsScreen] Error loading data:', error);
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await ClubService.clearCache();
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const handleClubPress = useCallback(
    (club: Club) => {
      navigation.navigate('ClubPage', { clubId: club.id, clubName: club.name });
    },
    [navigation]
  );

  /** Shared helper for join/leave/switch operations with loading state */
  const performClubAction = useCallback(
    async (action: () => Promise<{ success: boolean; error?: string }>, label: string) => {
      setIsJoining(true);
      try {
        const result = await action();
        if (result.success) {
          await ClubService.clearCache();
          await ClubMembershipService.clearCache();
          await loadData();
        } else {
          setAlertConfig({
            visible: true,
            title: 'Error',
            message: result.error || `Failed to ${label}.`,
            buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({...prev, visible: false})) }]
          });
        }
      } catch (error) {
        console.error(`[ClubsScreen] ${label} error:`, error);
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: 'Something went wrong. Try again.',
          buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({...prev, visible: false})) }]
        });
      } finally {
        setIsJoining(false);
      }
    },
    [loadData]
  );

  const handleJoinPress = useCallback(
    (club: Club) => {
      if (!userNpub) return;
      if (myClub) {
        setAlertConfig({
          visible: true,
          title: 'Switch Clubs?',
          message: `Leave ${myClub.name} and join ${club.name}?`,
          buttons: [
            { text: 'Cancel', style: 'cancel', onPress: () => setAlertConfig(prev => ({...prev, visible: false})) },
            {
              text: 'Leave & Join',
              onPress: () => {
                setAlertConfig(prev => ({...prev, visible: false}));
                performClubAction(
                  () => ClubMembershipService.switchClub(club.id, userNpub), 'switch clubs'
                );
              },
            },
          ]
        });
      } else {
        setAlertConfig({
          visible: true,
          title: `Join ${club.name}?`,
          message: "You'll appear on their leaderboard.",
          buttons: [
            { text: 'Cancel', style: 'cancel', onPress: () => setAlertConfig(prev => ({...prev, visible: false})) },
            {
              text: 'Join',
              onPress: () => {
                setAlertConfig(prev => ({...prev, visible: false}));
                performClubAction(
                  () => ClubMembershipService.joinClub(club.id, userNpub), 'join club'
                );
              },
            },
          ]
        });
      }
    },
    [myClub, userNpub, performClubAction]
  );

  const handleLeavePress = useCallback(() => {
    if (!myClub || !userNpub) return;
    setAlertConfig({
      visible: true,
      title: `Leave ${myClub.name}?`,
      message: "You'll be removed from the leaderboard.",
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setAlertConfig(prev => ({...prev, visible: false})) },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setAlertConfig(prev => ({...prev, visible: false}));
            await performClubAction(
              () => ClubMembershipService.leaveClub(userNpub), 'leave club'
            );
            setMyClub(null);
            setMyRole(null);
          },
        },
      ]
    });
  }, [myClub, userNpub, performClubAction]);

  const handleCreatePress = useCallback(() => {
    setShowCreateClub(true);
  }, []);

  const handleClubCreated = useCallback(async () => {
    setShowCreateClub(false);
    await ClubService.clearCache();
    await loadData();
  }, [loadData]);

  // Helper to get captain display name and picture from fetched profiles
  const getCaptainInfo = useCallback((npub: string) => {
    const profile = captainProfiles.get(npub);
    return {
      name: profile?.display_name || profile?.name || undefined,
      picture: profile?.picture || undefined,
    };
  }, [captainProfiles]);

  const filteredClubs = searchQuery.trim()
    ? clubs.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : clubs;

  const isCaptainOfMyClub = myRole === 'captain';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clubs</Text>
        <TouchableOpacity
          style={[styles.createButton, isJoining && { opacity: 0.5 }]}
          onPress={handleCreatePress}
          activeOpacity={0.7}
          disabled={isJoining}
        >
          <Ionicons
            name="add-circle-outline"
            size={22}
            color={theme.colors.accent}
          />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.orangeBright}
          />
        }
      >
        {/* YOUR CLUB section */}
        {myClub ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>YOUR CLUB</Text>
            <ClubCard
              club={myClub}
              isMember={true}
              isCaptain={isCaptainOfMyClub}
              isCurrentClub={true}
              onPress={() => handleClubPress(myClub)}
              onJoinPress={() => {}}
              captainName={getCaptainInfo(myClub.created_by_npub).name}
              captainPictureUrl={getCaptainInfo(myClub.created_by_npub).picture}
            />
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleLeavePress}
              activeOpacity={0.7}
              disabled={isJoining}
            >
              <Ionicons
                name="log-out-outline"
                size={16}
                color={theme.colors.textMuted}
              />
              <Text style={styles.leaveButtonText}>Leave</Text>
            </TouchableOpacity>
          </View>
        ) : (
          !isLoading && (
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={48}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyTitle}>No Club Yet</Text>
              <Text style={styles.emptySubtitle}>
                Join a club to compete with others
              </Text>
            </View>
          )
        )}

        {/* BROWSE CLUBS section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BROWSE CLUBS</Text>

          {/* Search input */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={18}
              color={theme.colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clubs..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="small"
                color={theme.colors.accent}
              />
            </View>
          )}

          {/* Club list */}
          {!isLoading && filteredClubs.length === 0 && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>
                {searchQuery.trim()
                  ? 'No clubs match your search'
                  : 'No clubs available yet'}
              </Text>
            </View>
          )}

          {!isLoading &&
            filteredClubs.map((club) => {
              const isMyClub = myClub?.id === club.id;
              const isCaptain =
                isMyClub && myRole === 'captain';
              const captainInfo = getCaptainInfo(club.created_by_npub);

              return (
                <ClubCard
                  key={club.id}
                  club={club}
                  isMember={isMyClub}
                  isCaptain={isCaptain}
                  isCurrentClub={isMyClub}
                  onPress={() => handleClubPress(club)}
                  onJoinPress={() => handleJoinPress(club)}
                  captainName={captainInfo.name}
                  captainPictureUrl={captainInfo.picture}
                />
              );
            })}
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {isJoining && (
        <View style={styles.joiningOverlay}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      )}

      <SimpleTeamCreationModal
        visible={showCreateClub}
        onClose={() => setShowCreateClub(false)}
        onTeamCreated={handleClubCreated}
      />

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({...prev, visible: false}))}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
    gap: 6,
  },
  leaveButtonText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    height: 42,
    padding: 0,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noResults: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noResultsText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  joiningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const ClubsScreen = React.memo(ClubsScreenComponent);
export default ClubsScreen;
