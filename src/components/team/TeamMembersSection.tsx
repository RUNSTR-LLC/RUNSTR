/**
 * TeamMembersSection Component - Team member management for captain dashboard
 * Matches captain dashboard mockup exactly with scrollable member list
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { theme } from '../../styles/theme';
import { TeamMemberItem, TeamMember } from './TeamMemberItem';
import { ZappableUserRow } from '../ui/ZappableUserRow';
import { ZapModal } from '../ui/ZapModal';
import { useNutzap } from '../../hooks/useNutzap';

interface TeamMembersSectionProps {
  members?: TeamMember[];
  onInvite?: () => void;
  onEditMember?: (memberId: string) => void;
  onKickMember?: (memberId: string) => void;
  style?: any;
  showZapButtons?: boolean; // Enable zapping for non-captain users
  userIsCaptain?: boolean; // Determines if edit/kick buttons should show
}

// Real data should be passed via props - no mock data allowed

export const TeamMembersSection: React.FC<TeamMembersSectionProps> = ({
  members = [],
  onInvite,
  onEditMember,
  onKickMember,
  style,
  showZapButtons = true,
  userIsCaptain = false,
}) => {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [zapModalVisible, setZapModalVisible] = useState(false);
  const handleInvitePress = () => {
    if (onInvite) {
      onInvite();
    }
    // Default behavior - could open invite modal, share link, etc.
    console.log('Invite new member');
  };

  const handleZapMember = (member: TeamMember) => {
    setSelectedMember(member);
    setZapModalVisible(true);
  };

  const handleEditMember = (memberId: string) => {
    if (onEditMember) {
      onEditMember(memberId);
    }
    // Default behavior - could open edit modal
    console.log('Edit member:', memberId);
  };

  const handleKickMember = (memberId: string) => {
    if (onKickMember) {
      onKickMember(memberId);
    }
    // Default behavior - could show confirmation dialog
    console.log('Kick member:', memberId);
  };

  return (
    <View style={[styles.managementSection, style]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Team Members</Text>
        {/* Invite button hidden per requirements
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleInvitePress}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnIcon}>+</Text>
          <Text style={styles.actionBtnText}>Invite</Text>
        </TouchableOpacity>
        */}
      </View>

      <ScrollView
        style={styles.membersList}
        showsVerticalScrollIndicator={true}
        indicatorStyle="#FF9D42"
      >
        {members.map((member, index) => {
          // If member has npub property, use ZappableUserRow for better display
          const memberNpub = (member as any).npub;

          if (showZapButtons && memberNpub && !userIsCaptain) {
            // Non-captain view with zapping
            return (
              <View
                key={member.id}
                style={[
                  styles.zappableMemberRow,
                  index === members.length - 1 ? styles.lastMemberItem : undefined
                ]}
              >
                <ZappableUserRow
                  npub={memberNpub}
                  fallbackName={member.name}
                  additionalContent={
                    <Text style={styles.memberStatus}>
                      {member.status === 'active'
                        ? `Active • ${member.activityCount || 0} events`
                        : `Inactive • ${member.lastActivity || '7 days'}`}
                    </Text>
                  }
                />
              </View>
            );
          } else if (userIsCaptain) {
            // Captain view with edit/kick actions
            return (
              <TeamMemberItem
                key={member.id}
                member={member}
                onEdit={handleEditMember}
                onKick={handleKickMember}
                style={
                  index === members.length - 1 ? styles.lastMemberItem : undefined
                }
              />
            );
          } else {
            // Fallback to original TeamMemberItem without actions
            return (
              <TeamMemberItem
                key={member.id}
                member={member}
                onEdit={undefined}
                onKick={undefined}
                style={
                  index === members.length - 1 ? styles.lastMemberItem : undefined
                }
              />
            );
          }
        })}
      </ScrollView>

      {/* Zap Modal */}
      {selectedMember && (
        <ZapModal
          visible={zapModalVisible}
          onClose={() => {
            setZapModalVisible(false);
            setSelectedMember(null);
          }}
          recipientNpub={(selectedMember as any).npub || ''}
          recipientName={selectedMember.name}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // CSS: background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; padding: 16px;
  managementSection: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
  },

  // CSS: display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  // CSS: font-size: 16px; font-weight: 600;
  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  // CSS: background: #fff; color: #000; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;
  actionBtn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  actionBtnIcon: {
    color: theme.colors.accentText,
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
  },

  actionBtnText: {
    color: theme.colors.accentText,
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
  },

  // CSS: max-height: 120px; overflow-y: auto;
  membersList: {
    maxHeight: 120,
  },

  // Remove border from last member item
  lastMemberItem: {
    borderBottomWidth: 0,
  },

  zappableMemberRow: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  memberStatus: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
});

// Export the interface for external use
export type { TeamMember } from './TeamMemberItem';
