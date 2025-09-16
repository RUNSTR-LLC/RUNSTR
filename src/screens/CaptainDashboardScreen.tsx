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
  onNavigateToTeam: () => void;
  onNavigateToProfile: () => void;
  onSettingsPress: () => void;
  onInviteMember: () => void;
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
  onNavigateToTeam,
  onNavigateToProfile,
  onSettingsPress,
  onInviteMember,
  onKickMember,
  onViewAllActivity,
  onEventCreated,
  onLeagueCreated,
}) => {
  // Wizard modal state
  const [eventWizardVisible, setEventWizardVisible] = useState(false);
  const [leagueWizardVisible, setLeagueWizardVisible] = useState(false);

  // Wizard handlers
  const handleShowEventWizard = () => {
    setEventWizardVisible(true);
  };

  const handleShowLeagueWizard = () => {
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

              // Get captain's private key for signing
              const nsec = await getNsecFromStorage();
              if (!nsec) {
                throw new Error('Captain credentials not found');
              }
              const privateKey = await nsecToPrivateKey(nsec);

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

      {/* Header */}
      <View style={styles.header}>
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
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onInviteMember}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnIcon}>+</Text>
              <Text style={styles.actionBtnText}>Invite</Text>
            </TouchableOpacity>
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

  // Component styles removed - now handled by individual components
});
