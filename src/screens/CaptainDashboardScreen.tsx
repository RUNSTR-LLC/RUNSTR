/**
 * CaptainDashboardScreen - Team Captain Management Dashboard
 * Displays team overview, member management, quick actions, and activity feed
 * Integrates Event and League creation wizards
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { theme } from '../styles/theme';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { QuickActionsSection } from '../components/team/QuickActionsSection';
import { ActivityFeedSection } from '../components/team/ActivityFeedSection';
import { JoinRequestsSection } from '../components/team/JoinRequestsSection';
import { EventCreationWizard } from '../components/wizards/EventCreationWizard';
import { LeagueCreationWizard } from '../components/wizards/LeagueCreationWizard';
import { NostrListService } from '../services/nostr/NostrListService';
import { NostrProtocolHandler } from '../services/nostr/NostrProtocolHandler';
import { NostrRelayManager } from '../services/nostr/NostrRelayManager';
import { getNsecFromStorage, nsecToPrivateKey } from '../utils/nostr';
import { TeamMemberCache } from '../services/team/TeamMemberCache';
import { getTeamListDetector } from '../utils/teamListDetector';
import NostrTeamCreationService from '../services/nostr/NostrTeamCreationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';

// Type definitions for captain dashboard data
export interface CaptainDashboardData {
  team: {
    id: string;
    name: string;
    memberCount: number;
    activeEvents: number;
    activeChallenges: number;
    prizePool: number;
  };
  members: {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    eventCount: number;
    inactiveDays?: number;
  }[];
  recentActivity: {
    id: string;
    type: 'join' | 'complete' | 'win' | 'fund' | 'announce';
    message: string;
    timestamp: string;
  }[];
}

interface CaptainDashboardScreenProps {
  data: CaptainDashboardData;
  captainId: string; // For member management
  teamId: string; // For member management
  userNpub?: string; // User's npub passed from navigation for fallback
  onNavigateToTeam: () => void;
  onNavigateToProfile: () => void;
  onSettingsPress: () => void;
  onKickMember: (memberId: string) => void;
  onViewAllActivity: () => void;
  // Wizard callbacks
  onEventCreated?: (eventData: any) => void;
  onLeagueCreated?: (leagueData: any) => void;
}

export const CaptainDashboardScreen: React.FC<CaptainDashboardScreenProps> = ({
  data,
  captainId,
  teamId,
  userNpub,
  onNavigateToTeam,
  onNavigateToProfile,
  onSettingsPress,
  onKickMember,
  onViewAllActivity,
  onEventCreated,
  onLeagueCreated,
}) => {
  // Wizard modal state
  const [eventWizardVisible, setEventWizardVisible] = useState(false);
  const [leagueWizardVisible, setLeagueWizardVisible] = useState(false);

  // Kind 30000 list state
  const [hasKind30000List, setHasKind30000List] = useState<boolean | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Check if team has kind 30000 list on mount
  React.useEffect(() => {
    checkForKind30000List();
  }, [teamId, captainId]);

  const checkForKind30000List = async () => {
    try {
      const detector = getTeamListDetector();
      const haslist = await detector.hasKind30000List(teamId, captainId);
      setHasKind30000List(haslist);
      console.log(`Team ${teamId} has kind 30000 list: ${haslist}`);
    } catch (error) {
      console.error('Error checking for kind 30000 list:', error);
      setHasKind30000List(false);
    }
  };

  // Wizard handlers
  const handleShowEventWizard = () => {
    // Check if team has kind 30000 list before allowing competition creation
    if (hasKind30000List === false) {
      Alert.alert(
        'Setup Required',
        'Create a team member list before starting competitions',
        [{ text: 'OK' }]
      );
      return;
    }
    setEventWizardVisible(true);
  };

  const handleShowLeagueWizard = () => {
    // Check if team has kind 30000 list before allowing competition creation
    if (hasKind30000List === false) {
      Alert.alert(
        'Setup Required',
        'Create a team member list before starting competitions',
        [{ text: 'OK' }]
      );
      return;
    }
    setLeagueWizardVisible(true);
  };

  const handleEventCreated = (eventData: any) => {
    setEventWizardVisible(false);
    onEventCreated?.(eventData);
  };

  const handleLeagueCreated = (leagueData: any) => {
    setLeagueWizardVisible(false);
    onLeagueCreated?.(leagueData);
  };

  const handleCloseEventWizard = () => {
    setEventWizardVisible(false);
  };

  const handleCloseLeagueWizard = () => {
    setLeagueWizardVisible(false);
  };

  // Handle creating kind 30000 list for existing team
  const handleCreateMemberList = async () => {
    setIsCreatingList(true);

    try {
      // Get user's private key from storage with fallback mechanism
      console.log('Attempting to retrieve nsec from @runstr:user_nsec...');
      let nsec = await AsyncStorage.getItem('@runstr:user_nsec');
      console.log('Retrieved from @runstr:user_nsec:', nsec ? `${nsec.slice(0, 10)}...${nsec.slice(-5)}` : 'null');

      // Fallback: If plain nsec not found, try to get from encrypted storage
      if (!nsec) {
        console.log('Plain nsec not found, trying encrypted storage fallback...');

        // Get the user's npub for decryption - try multiple sources
        let npub = userNpub; // First try the prop

        if (!npub) {
          // Try storage
          npub = await AsyncStorage.getItem('@runstr:npub');
          console.log('Retrieved npub from storage:', npub?.slice(0, 20) + '...');
        }

        if (!npub) {
          // Try getting from captain ID if it's an npub
          if (captainId?.startsWith('npub')) {
            npub = captainId;
            console.log('Using captainId as npub:', npub?.slice(0, 20) + '...');
          }
        }

        // Store the npub for future use if we have it
        if (npub && !userNpub) {
          await AsyncStorage.setItem('@runstr:npub', npub);
          console.log('Stored npub for future use');
        }

        if (npub) {
          // Try to get and decrypt the encrypted nsec
          nsec = await getNsecFromStorage(npub);

          // Store the plain nsec for future use if we retrieved it
          if (nsec) {
            console.log('Retrieved nsec from encrypted storage, saving plain version...');
            await AsyncStorage.setItem('@runstr:user_nsec', nsec);
          }
        } else {
          console.log('No npub available for decryption - all sources exhausted');
        }
      }

      if (!nsec) {
        console.error('Authentication retrieval failed - npub:', userNpub?.slice(0, 20), 'captainId:', captainId?.slice(0, 20));
        Alert.alert('Error', 'Unable to retrieve authentication. Please log in again.');
        setIsCreatingList(false);
        return;
      }

      // Log nsec format for debugging (only first/last few chars for security)
      console.log('Retrieved nsec format check:', {
        startsWithNsec: nsec?.startsWith('nsec1'),
        length: nsec?.length,
        preview: nsec ? `${nsec.slice(0, 10)}...${nsec.slice(-5)}` : 'null'
      });

      // Validate nsec format
      if (!nsec.startsWith('nsec1')) {
        console.error('Invalid nsec format - does not start with nsec1');
        Alert.alert('Error', 'Invalid authentication format. Please log in again.');
        setIsCreatingList(false);
        return;
      }

      // Use NDK to handle the private key (following CLAUDE.md architecture)
      let privateKey: string;
      try {
        // NDK expects the nsec directly and handles decoding internally
        const signer = new NDKPrivateKeySigner(nsec);
        // Get the private key hex from the signer
        privateKey = await signer.privateKey();

        if (!privateKey) {
          throw new Error('Failed to extract private key from signer');
        }

        console.log('Successfully extracted private key using NDK');
      } catch (e) {
        console.error('Failed to process nsec with NDK:', e);
        Alert.alert('Error', 'Invalid authentication key. Please log in again.');
        setIsCreatingList(false);
        return;
      }

      // Create kind 30000 list for this team
      const result = await NostrTeamCreationService.createMemberListForExistingTeam(
        teamId,
        data.team.name,
        captainId, // Captain's hex pubkey
        privateKey
      );

      if (result.success) {
        setHasKind30000List(true);
        Alert.alert(
          'Success',
          'Team member list created! You can now run competitions and manage members.'
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create member list');
      }
    } catch (error) {
      console.error('Error creating member list:', error);
      Alert.alert('Error', 'Failed to create member list. Please try again.');
    } finally {
      setIsCreatingList(false);
    }
  };

  // Handle member removal
  const handleRemoveMember = async (memberPubkey: string) => {
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get current member list
              const listService = NostrListService.getInstance();
              const memberListDTag = `${teamId}-members`;
              const currentList = await listService.getList(captainId, memberListDTag);

              if (!currentList) {
                throw new Error('Team member list not found');
              }

              // Prepare the updated list event
              const eventTemplate = listService.prepareRemoveMember(
                captainId,
                memberListDTag,
                memberPubkey,
                currentList
              );

              if (!eventTemplate) {
                console.log('Member not in list');
                return;
              }

              // Get captain's private key for signing with fallback mechanism
              let nsec = await AsyncStorage.getItem('@runstr:user_nsec');

              // Fallback: If plain nsec not found, try to get from encrypted storage
              if (!nsec) {
                console.log('Plain nsec not found for member removal, trying encrypted storage...');

                // Get the user's npub for decryption - try multiple sources
                let npub = userNpub; // First try the prop

                if (!npub) {
                  // Try storage
                  npub = await AsyncStorage.getItem('@runstr:npub');
                  console.log('Retrieved npub from storage for member removal:', npub?.slice(0, 20) + '...');
                }

                if (!npub) {
                  // Try getting from captain ID if it's an npub
                  if (captainId?.startsWith('npub')) {
                    npub = captainId;
                    console.log('Using captainId as npub for member removal:', npub?.slice(0, 20) + '...');
                  }
                }

                // Store the npub for future use if we have it
                if (npub && !userNpub) {
                  await AsyncStorage.setItem('@runstr:npub', npub);
                  console.log('Stored npub for future use');
                }

                if (npub) {
                  nsec = await getNsecFromStorage(npub);

                  // Store the plain nsec for future use if we retrieved it
                  if (nsec) {
                    console.log('Retrieved nsec from encrypted storage for member removal...');
                    await AsyncStorage.setItem('@runstr:user_nsec', nsec);
                  }
                }
              }

              if (!nsec) {
                throw new Error('Captain credentials not found');
              }

              // Use NDK for consistent key handling
              let privateKey: string;
              try {
                const signer = new NDKPrivateKeySigner(nsec);
                privateKey = await signer.privateKey();
                if (!privateKey) {
                  throw new Error('Failed to extract private key');
                }
              } catch (e) {
                console.error('Failed to process nsec for member removal:', e);
                throw new Error('Invalid authentication key');
              }

              // Sign and publish the updated list
              const protocolHandler = new NostrProtocolHandler();
              const relayManager = new NostrRelayManager();

              const signedEvent = await protocolHandler.signEvent(eventTemplate, privateKey);
              const publishResult = await relayManager.publishEvent(signedEvent);

              if (publishResult.successful && publishResult.successful.length > 0) {
                console.log(`✅ Removed member from team list: ${memberPubkey}`);

                // Update cache
                const listId = `${captainId}:${memberListDTag}`;
                const updatedMembers = currentList.members.filter(m => m !== memberPubkey);
                listService.updateCachedList(listId, updatedMembers);

                // Invalidate team member cache to force refresh
                const memberCache = TeamMemberCache.getInstance();
                memberCache.invalidateTeam(teamId, captainId);

                Alert.alert('Success', 'Member has been removed from the team');
              } else {
                throw new Error('Failed to publish updated member list');
              }
            } catch (error) {
              console.error('Failed to remove member:', error);
              Alert.alert('Error', 'Failed to remove member. Please try again.');
            }
          },
        },
      ]
    );
  };
  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar */}

      {/* Show banner if team doesn't have kind 30000 list */}
      {hasKind30000List === false && (
        <View style={styles.listWarningBanner}>
          <Text style={styles.listWarningTitle}>⚠️ Team Setup Required</Text>
          <Text style={styles.listWarningText}>
            Your team needs a member list to run competitions
          </Text>
          <TouchableOpacity
            style={[styles.createListButton, isCreatingList && styles.createListButtonDisabled]}
            onPress={handleCreateMemberList}
            disabled={isCreatingList}
          >
            <Text style={styles.createListButtonText}>
              {isCreatingList ? 'Creating...' : 'Create Member List'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onNavigateToTeam}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <View style={styles.captainBadge}>
            <Text style={styles.captainBadgeText}>CAPTAIN</Text>
          </View>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View style={styles.statsOverview}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{data.team.memberCount}</Text>
            <Text style={styles.statLabel}>MEMBERS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{data.team.activeEvents}</Text>
            <Text style={styles.statLabel}>ACTIVE EVENTS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{data.team.activeChallenges}</Text>
            <Text style={styles.statLabel}>CHALLENGES</Text>
          </View>
        </View>

        {/* Team Management Section */}
        <View style={styles.managementSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team Members</Text>
          </View>

          <ScrollView
            style={styles.membersList}
            showsVerticalScrollIndicator={false}
          >
            {data.members && data.members.length > 0 ? data.members.slice(0, 4).map((member) => (
              <View key={member.id} style={styles.memberItem}>
                <View style={styles.memberInfo}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberStatus}>
                      {member.status === 'active'
                        ? `Active • ${member.eventCount} events`
                        : `Inactive • ${member.inactiveDays} days`}
                    </Text>
                  </View>
                </View>
                <View style={styles.memberActions}>
                  <TouchableOpacity
                    style={styles.miniBtn}
                    onPress={() => handleRemoveMember(member.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.miniBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No team members yet</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <QuickActionsSection
          onCreateEvent={handleShowEventWizard}
          onCreateLeague={handleShowLeagueWizard}
        />

        {/* Join Requests */}
        <JoinRequestsSection
          teamId={data.team.id}
          captainPubkey={captainId}
          onMemberApproved={(requesterPubkey) => {
            // Handle member approval - could refresh member list
            console.log('Member approved:', requesterPubkey);
          }}
        />


        {/* Recent Activity */}
        <ActivityFeedSection
          activities={data.recentActivity}
          onViewAllActivity={onViewAllActivity}
        />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeScreen="team"
        onNavigateToTeam={onNavigateToTeam}
        onNavigateToProfile={onNavigateToProfile}
      />

      {/* Wizard Modals */}
      <EventCreationWizard
        visible={eventWizardVisible}
        teamId={data.team.id}
        captainPubkey={captainId}
        onClose={handleCloseEventWizard}
        onEventCreated={handleEventCreated}
      />

      <LeagueCreationWizard
        visible={leagueWizardVisible}
        teamId={data.team.id}
        captainPubkey={captainId}
        onClose={handleCloseLeagueWizard}
        onLeagueCreated={handleLeagueCreated}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header styles - exact match to mockup
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  backButtonText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  captainBadge: {
    backgroundColor: theme.colors.text,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },

  captainBadgeText: {
    color: theme.colors.background,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: -0.5,
    color: theme.colors.text,
  },


  // Content styles
  content: {
    flex: 1,
    padding: 16,
  },

  // Stats overview - exact match to mockup
  statsOverview: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 18,
    fontWeight: theme.typography.weights.extraBold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Management section styles
  managementSection: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: 16,
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  actionBtn: {
    backgroundColor: theme.colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },

  actionBtnIcon: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },

  actionBtnText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },

  // Members list styles
  membersList: {
    maxHeight: 120,
  },

  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },

  memberAvatar: {
    width: 28,
    height: 28,
    backgroundColor: theme.colors.gray,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  memberAvatarText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  memberDetails: {
    flex: 1,
  },

  memberName: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  memberStatus: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },

  memberActions: {
    flexDirection: 'row',
    gap: 4,
  },

  miniBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.gray,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },

  miniBtnText: {
    fontSize: 9,
    color: theme.colors.text,
  },

  emptyState: {
    padding: 20,
    alignItems: 'center',
  },

  emptyStateText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },

  // Kind 30000 List Warning Banner
  listWarningBanner: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  listWarningTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  listWarningText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },

  createListButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  createListButtonDisabled: {
    opacity: 0.5,
  },

  createListButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  // Component styles removed - now handled by individual components
});
