/**
 * ClubsScreen - Main screen for the Clubs tab (Tab 2)
 * Shows "Your Club" section + searchable "Browse Clubs" list.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { Club } from '../types/club';
import { ClubService } from '../services/backend/ClubService';
import { ClubMembershipService } from '../services/backend/ClubMembershipService';
import { ClubCard } from '../components/club/ClubCard';
import { SubscriptionService } from '../services/backend/SubscriptionService';
import { SubscriptionInfoModal } from '../components/subscription/SubscriptionInfoModal';
import { SimpleTeamCreationModal } from '../components/subscription/SimpleTeamCreationModal';

const ClubsScreenComponent: React.FC = () => {
  const navigation = useNavigation<any>();

  const [myClub, setMyClub] = useState<Club | null>(null);
  const [myRole, setMyRole] = useState<'member' | 'captain' | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [userNpub, setUserNpub] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [showSubscriptionInfo, setShowSubscriptionInfo] = useState(false);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  /** Load all clubs and the user's current club. */
  const loadData = useCallback(async () => {
    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      setUserNpub(npub);

      // Fetch all clubs
      const allClubs = await ClubService.fetchActiveClubs();
      setClubs(allClubs);

      // Get user's current club ID
      if (npub) {
        const currentClubId = await ClubMembershipService.getCurrentClub(npub);
        if (currentClubId) {
          const currentClub = allClubs.find((c) => c.id === currentClubId);
          setMyClub(currentClub || null);

          // Determine role: if user created the club, they're captain
          if (currentClub && currentClub.created_by_npub === npub) {
            setMyRole('captain');
          } else {
            // Check members list for role (fallback)
            const members = await ClubMembershipService.getClubMembers(currentClubId);
            const myMembership = members.find((m) => m.member_npub === npub);
            setMyRole(myMembership?.role || 'member');
          }
        } else {
          setMyClub(null);
          setMyRole(null);
        }

        // Check subscriber status
        const cachedStatus = await SubscriptionService.getCachedSubscriberStatus();
        if (cachedStatus !== null) {
          setIsSubscriber(cachedStatus);
        } else {
          const fresh = await SubscriptionService.isSubscriber(npub);
          setIsSubscriber(fresh);
        }
      } else {
        setMyClub(null);
        setMyRole(null);
      }
    } catch (error) {
      console.error('[ClubsScreen] Error loading data:', error);
    } finally {
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
          Alert.alert('Error', result.error || `Failed to ${label}.`);
        }
      } catch (error) {
        console.error(`[ClubsScreen] ${label} error:`, error);
        Alert.alert('Error', 'Something went wrong. Try again.');
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
        Alert.alert('Switch Clubs?', `Leave ${myClub.name} and join ${club.name}?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave & Join',
            onPress: () => performClubAction(
              () => ClubMembershipService.switchClub(club.id, userNpub), 'switch clubs'
            ),
          },
        ]);
      } else {
        Alert.alert(`Join ${club.name}?`, "You'll appear on their leaderboard.", [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Join',
            onPress: () => performClubAction(
              () => ClubMembershipService.joinClub(club.id, userNpub), 'join club'
            ),
          },
        ]);
      }
    },
    [myClub, userNpub, performClubAction]
  );

  const handleLeavePress = useCallback(() => {
    if (!myClub || !userNpub) return;
    Alert.alert(`Leave ${myClub.name}?`, "You'll be removed from the leaderboard.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await performClubAction(
            () => ClubMembershipService.leaveClub(userNpub), 'leave club'
          );
          setMyClub(null);
          setMyRole(null);
        },
      },
    ]);
  }, [myClub, userNpub, performClubAction]);

  const handleCreatePress = useCallback(() => {
    if (isSubscriber) {
      setShowCreateClub(true);
    } else {
      setShowSubscriptionInfo(true);
    }
  }, [isSubscriber]);

  const handleClubCreated = useCallback(async () => {
    setShowCreateClub(false);
    await ClubService.clearCache();
    await loadData();
  }, [loadData]);

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
          style={styles.createButton}
          onPress={handleCreatePress}
          activeOpacity={0.7}
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

              return (
                <ClubCard
                  key={club.id}
                  club={club}
                  isMember={isMyClub}
                  isCaptain={isCaptain}
                  isCurrentClub={isMyClub}
                  onPress={() => handleClubPress(club)}
                  onJoinPress={() => handleJoinPress(club)}
                  disabled={!!myClub && !isMyClub}
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

      <SubscriptionInfoModal
        visible={showSubscriptionInfo}
        onClose={() => setShowSubscriptionInfo(false)}
        feature="team"
      />

      <SimpleTeamCreationModal
        visible={showCreateClub}
        onClose={() => setShowCreateClub(false)}
        onTeamCreated={handleClubCreated}
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
