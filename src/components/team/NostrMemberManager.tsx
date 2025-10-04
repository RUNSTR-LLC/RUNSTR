/**
 * NostrMemberManager Component - Enhanced member management with Nostr list integration
 * Builds on existing TeamMembersSection with two-tier membership system
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { theme } from '../../styles/theme';
import { MemberAvatar } from '../ui/MemberAvatar';
import { NostrTeamService } from '../../services/nostr/NostrTeamService';
import { TeamMembershipService } from '../../services/team/teamMembershipService';
import type { NostrTeam } from '../../services/nostr/NostrTeamService';

export interface NostrMember {
  pubkey: string;
  name?: string;
  isLocal: boolean;
  isOfficial: boolean;
  joinedAt?: number;
  lastActivity?: number;
  workoutCount?: number;
}

interface NostrMemberManagerProps {
  team: NostrTeam;
  captainPubkey: string;
  onInvite?: () => void;
  onMemberUpdated?: () => void;
  style?: any;
}

export const NostrMemberManager: React.FC<NostrMemberManagerProps> = ({
  team,
  captainPubkey,
  onInvite,
  onMemberUpdated,
  style,
}) => {
  const [members, setMembers] = useState<NostrMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const teamService = new NostrTeamService();
  const membershipService = TeamMembershipService.getInstance();

  // Load team members with membership status
  const loadTeamMembers = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Get official members from Nostr list
      const officialMembers = await teamService.getTeamMembers(team);

      // TODO: Get local members from TeamMembershipService
      // For now, we'll focus on official members
      const memberData: NostrMember[] = officialMembers.map((pubkey) => ({
        pubkey,
        name: `User ${pubkey.slice(0, 8)}`, // TODO: Resolve from profile service
        isLocal: true, // All official members are also local
        isOfficial: true,
        workoutCount: Math.floor(Math.random() * 10), // TODO: Get from workout service
      }));

      setMembers(memberData);
    } catch (error) {
      console.error('Failed to load team members:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, [team.id]);

  const handleRemoveMember = (member: NostrMember) => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.name || member.pubkey.slice(0, 8)} from the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Remove from Nostr list via NostrListService
              console.log('Removing member:', member.pubkey);

              // Update UI immediately
              setMembers((prev) =>
                prev.filter((m) => m.pubkey !== member.pubkey)
              );

              if (onMemberUpdated) {
                onMemberUpdated();
              }
            } catch (error) {
              console.error('Failed to remove member:', error);
              Alert.alert(
                'Error',
                'Failed to remove member. Please try again.'
              );
              // Reload members on error
              loadTeamMembers();
            }
          },
        },
      ]
    );
  };

  const handleMemberPress = (member: NostrMember) => {
    // Show member details/profile
    console.log('Member pressed:', member.pubkey);
  };

  const getMemberStatusText = (member: NostrMember): string => {
    if (member.isOfficial) {
      return `Official • ${member.workoutCount || 0} workouts`;
    }
    return 'Local only • Pending approval';
  };

  const getMemberStatusColor = (member: NostrMember): string => {
    return member.isOfficial ? theme.colors.text : theme.colors.textMuted;
  };

  const handleInvitePress = () => {
    if (onInvite) {
      onInvite();
    }
    // Default behavior - could open invite modal, share link, etc.
    console.log('Invite new member');
  };

  return (
    <View style={[styles.memberManager, style]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Team Members</Text>
          <View style={styles.memberCount}>
            <Text style={styles.memberCountText}>{members.length}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleInvitePress}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnIcon}>+</Text>
          <Text style={styles.actionBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.membersList}
        showsVerticalScrollIndicator={true}
        indicatorStyle="#FF9D42"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadTeamMembers(true)}
            tintColor={theme.colors.text}
          />
        }
      >
        {members.map((member, index) => (
          <View
            key={member.pubkey}
            style={[
              styles.memberItem,
              index === members.length - 1 ? styles.lastMemberItem : undefined,
            ]}
          >
            <TouchableOpacity
              style={styles.memberInfo}
              onPress={() => handleMemberPress(member)}
              activeOpacity={0.7}
            >
              <MemberAvatar
                name={member.name || member.pubkey.slice(0, 8)}
                size={32}
              />
              <View style={styles.memberDetails}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>
                    {member.name || `User ${member.pubkey.slice(0, 8)}`}
                  </Text>
                  {member.pubkey === captainPubkey && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainBadgeText}>CAPTAIN</Text>
                    </View>
                  )}
                  {!member.isOfficial && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>PENDING</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.memberStatus,
                    { color: getMemberStatusColor(member) },
                  ]}
                >
                  {getMemberStatusText(member)}
                </Text>
              </View>
            </TouchableOpacity>

            {member.pubkey !== captainPubkey && (
              <View style={styles.memberActions}>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveMember(member)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {isLoading && members.length === 0 && (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading team members...</Text>
          </View>
        )}

        {!isLoading && members.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No team members yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Invite members to start building your team
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main container - matches existing patterns
  memberManager: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
  },

  // Section header with title and action
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  memberCount: {
    backgroundColor: theme.colors.gray,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  memberCountText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
  },

  actionBtn: {
    backgroundColor: theme.colors.accent,
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
    color: theme.colors.accentText,
  },

  actionBtnText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  // Members list
  membersList: {
    maxHeight: 240, // Allow more space than original
  },

  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  lastMemberItem: {
    borderBottomWidth: 0,
  },

  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  memberDetails: {
    flex: 1,
  },

  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },

  memberName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  captainBadge: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 3,
  },

  captainBadgeText: {
    color: theme.colors.accentText,
    fontSize: 8,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  pendingBadge: {
    backgroundColor: '#ff6b35',
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 3,
  },

  pendingBadgeText: {
    color: theme.colors.textBright,
    fontSize: 8,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  memberStatus: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  // Member actions
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },

  removeBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff4444',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },

  removeBtnText: {
    color: '#ff4444',
    fontSize: 10,
    fontWeight: theme.typography.weights.medium,
  },

  // Loading and empty states
  loadingState: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },

  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  emptyStateText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },

  emptyStateSubtext: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
