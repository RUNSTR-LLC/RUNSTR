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
  Modal,
  TextInput,
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
import { TeamMemberCache } from '../services/team/TeamMemberCache';
import { getTeamListDetector } from '../utils/teamListDetector';
import NostrTeamCreationService from '../services/nostr/NostrTeamCreationService';
import { getAuthenticationData, migrateAuthenticationStorage } from '../utils/nostrAuth';
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
  navigation?: any; // Navigation prop for re-authentication flow
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
  navigation,
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

  // Member management state
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberNpub, setNewMemberNpub] = useState('');

  // Check if team has kind 30000 list on mount and load members
  React.useEffect(() => {
    checkForKind30000List();
    if (hasKind30000List) {
      loadTeamMembers();
    }
  }, [teamId, captainId, hasKind30000List]);

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

  const loadTeamMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const memberCache = TeamMemberCache.getInstance();
      const members = await memberCache.getTeamMembers(teamId, captainId);
      setTeamMembers(members);
      console.log(`Loaded ${members.length} members for team ${teamId}`);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setIsLoadingMembers(false);
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
      console.log('[Captain] Starting member list creation...');

      // Get authentication data using the new unified system
      let authData = await getAuthenticationData();

      // If retrieval failed, try migration
      if (!authData && (userNpub || captainId)) {
        console.log('[Captain] Auth not found, attempting migration...');

        // Determine the userId for migration
        const userId = captainId?.startsWith('npub') ? captainId : userNpub || captainId;

        // Try to migrate with available data
        const migrated = await migrateAuthenticationStorage(
          userNpub || captainId,
          userId
        );

        if (migrated) {
          console.log('[Captain] Migration successful, retrying auth retrieval...');
          authData = await getAuthenticationData();
        }
      }

      if (!authData) {
        console.error('[Captain] Authentication retrieval failed completely');

        // Provide helpful error with recovery options
        Alert.alert(
          'Authentication Required',
          'Your authentication data could not be retrieved. This can happen if you logged in on a different device or if your session expired.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Re-authenticate',
              onPress: () => {
                // Navigate to login
                if (navigation) {
                  navigation.navigate('Login');
                } else {
                  onNavigateToProfile(); // Fallback to profile if no navigation
                }
              },
            },
          ]
        );

        setIsCreatingList(false);
        return;
      }

      console.log('[Captain] ✅ Authentication retrieved successfully');
      console.log('[Captain] Using npub:', authData.npub.slice(0, 20) + '...');

      console.log('[Captain] Using nsec directly for member list creation');

      // Create kind 30000 list for this team
      // NostrTeamCreationService will create its own NDKPrivateKeySigner internally
      const result = await NostrTeamCreationService.createMemberListForExistingTeam(
        teamId,
        data.team.name,
        authData.hexPubkey, // Use the captain's hex pubkey from auth data
        authData.nsec // Pass nsec directly - the service will handle conversion
      );

      if (result.success) {
        setHasKind30000List(true);
        // Reload members after creating the list
        await loadTeamMembers();
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

              // Get captain's authentication using the unified system
              const authData = await getAuthenticationData();

              if (!authData) {
                console.error('[Captain] No authentication data for member removal');
                throw new Error('Captain credentials not found. Please log in again.');
              }

              console.log('[Captain] Using nsec directly for member removal');

              // Convert nsec to hex private key for signing
              const signer = new NDKPrivateKeySigner(authData.nsec);
              const privateKeyHex = signer.privateKey; // Access as property, not method

              if (!privateKeyHex) {
                throw new Error('Failed to extract private key');
              }

              // Sign and publish the updated list
              const protocolHandler = new NostrProtocolHandler();
              const relayManager = new NostrRelayManager();

              const signedEvent = await protocolHandler.signEvent(eventTemplate, privateKeyHex);
              const publishResult = await relayManager.publishEvent(signedEvent);

              if (publishResult.successful && publishResult.successful.length > 0) {
                console.log(`✅ Removed member from team list: ${memberPubkey}`);

                // Update cache
                const listId = `${captainId}:${memberListDTag}`;
                const updatedMembers = currentList.members.filter(m => m !== memberPubkey);
                listService.updateCachedList(listId, updatedMembers);

                // Update local state
                setTeamMembers(prevMembers => prevMembers.filter(m => m !== memberPubkey));

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

  // Add member to team
  const handleAddMember = async () => {
    if (!newMemberNpub.trim()) {
      Alert.alert('Error', 'Please enter a member npub or hex pubkey');
      return;
    }

    try {
      // Get authentication data
      const authData = await getAuthenticationData();
      if (!authData) {
        Alert.alert('Authentication Required', 'Please re-authenticate to add members.');
        return;
      }

      // Get current members
      const listService = NostrListService.getInstance();
      const memberListDTag = `${teamId}-members`;
      const currentList = await listService.getList(captainId, memberListDTag);

      if (!currentList) {
        Alert.alert('Error', 'Member list not found. Please create a member list first.');
        return;
      }

      // Check if member already exists
      if (currentList.members.includes(newMemberNpub)) {
        Alert.alert('Info', 'This member is already part of the team');
        return;
      }

      // Prepare event template to add member
      const eventTemplate = listService.prepareAddMember(
        captainId,
        memberListDTag,
        newMemberNpub,
        currentList
      );

      if (!eventTemplate) {
        Alert.alert('Info', 'Failed to prepare member addition');
        return;
      }

      // Convert nsec to hex private key for signing
      const signer = new NDKPrivateKeySigner(authData.nsec);
      const privateKeyHex = signer.privateKey; // Access as property, not method

      if (!privateKeyHex) {
        throw new Error('Failed to extract private key');
      }

      // Sign and publish the updated list
      const protocolHandler = new NostrProtocolHandler();
      const relayManager = new NostrRelayManager();

      const signedEvent = await protocolHandler.signEvent(eventTemplate, privateKeyHex);
      const publishResult = await relayManager.publishEvent(signedEvent);

      if (publishResult.successful && publishResult.successful.length > 0) {
        // Update local state
        setTeamMembers([...teamMembers, newMemberNpub]);
        setNewMemberNpub('');
        setShowAddMemberModal(false);

        // Invalidate cache
        const memberCache = TeamMemberCache.getInstance();
        memberCache.invalidateTeam(teamId, captainId);

        Alert.alert('Success', 'Member added to the team successfully');
      } else {
        throw new Error('Failed to publish member list update');
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      Alert.alert('Error', 'Failed to add member. Please try again.');
    }
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
            {hasKind30000List && (
              <TouchableOpacity
                style={styles.addMemberButton}
                onPress={() => setShowAddMemberModal(true)}
              >
                <Text style={styles.addMemberButtonText}>+ Add Member</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.membersList}
            showsVerticalScrollIndicator={false}
          >
            {isLoadingMembers ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Loading members...</Text>
              </View>
            ) : teamMembers.length > 0 ? (
              teamMembers.map((memberPubkey, index) => (
                <View key={memberPubkey} style={styles.memberItem}>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {memberPubkey.startsWith('npub') ? 'N' : 'H'}
                      </Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={styles.memberName}>
                        {memberPubkey.slice(0, 16)}...
                      </Text>
                      <Text style={styles.memberStatus}>
                        {index === 0 ? 'Captain' : 'Member'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.memberActions}>
                    {index !== 0 && ( // Don't allow removing the captain
                      <TouchableOpacity
                        style={styles.miniBtn}
                        onPress={() => handleRemoveMember(memberPubkey)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.miniBtnText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            ) : data.members && data.members.length > 0 ? (
              // Fallback to data.members if teamMembers not loaded
              data.members.slice(0, 4).map((member) => (
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
              ))
            ) : (
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

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Team Member</Text>
            <Text style={styles.modalDescription}>
              Enter the npub or hex pubkey of the member to add
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="npub1... or hex pubkey"
              placeholderTextColor={theme.colors.secondary}
              value={newMemberNpub}
              onChangeText={setNewMemberNpub}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowAddMemberModal(false);
                  setNewMemberNpub('');
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleAddMember}
              >
                <Text style={styles.modalButtonText}>Add Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Add member button
  addMemberButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },

  addMemberButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accentText,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  modalDescription: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginBottom: 20,
  },

  modalInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 20,
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  modalButtonPrimary: {
    backgroundColor: theme.colors.accent,
  },

  modalButtonSecondary: {
    backgroundColor: theme.colors.border,
  },

  modalButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  modalButtonTextSecondary: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  // Component styles removed - now handled by individual components
});
