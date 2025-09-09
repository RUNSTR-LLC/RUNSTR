/**
 * TeamMemberItem Component - Individual team member row for captain dashboard
 * Matches captain dashboard mockup exactly
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { MemberAvatar } from '../ui/MemberAvatar';

interface TeamMember {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  activityCount?: number;
  lastActivity?: string;
  imageUrl?: string;
}

interface TeamMemberItemProps {
  member: TeamMember;
  onEdit?: (memberId: string) => void;
  onKick?: (memberId: string) => void;
  style?: any;
}

export const TeamMemberItem: React.FC<TeamMemberItemProps> = ({
  member,
  onEdit,
  onKick,
  style,
}) => {
  const getStatusText = (): string => {
    if (member.status === 'active') {
      const eventCount = member.activityCount || 0;
      return `Active • ${eventCount} event${eventCount !== 1 ? 's' : ''}`;
    } else {
      const lastActivity = member.lastActivity || '7 days';
      return `Inactive • ${lastActivity}`;
    }
  };

  const handleActionPress = () => {
    if (member.status === 'active' && onEdit) {
      onEdit(member.id);
    } else if (member.status === 'inactive' && onKick) {
      onKick(member.id);
    }
  };

  const getActionButtonText = (): string => {
    return member.status === 'active' ? 'Edit' : 'Kick';
  };

  return (
    <View style={[styles.memberItem, style]}>
      <View style={styles.memberInfo}>
        <MemberAvatar name={member.name} imageUrl={member.imageUrl} />
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberStatus}>{getStatusText()}</Text>
        </View>
      </View>
      <View style={styles.memberActions}>
        <TouchableOpacity
          style={styles.miniBtn}
          onPress={handleActionPress}
          activeOpacity={0.7}
        >
          <Text style={styles.miniBtnText}>{getActionButtonText()}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // CSS: display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1a1a1a;
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  // CSS: display: flex; align-items: center; gap: 8px;
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },

  // CSS: display: flex; flex-direction: column;
  memberDetails: {
    flexDirection: 'column',
    flex: 1,
  },

  // CSS: font-size: 13px; font-weight: 500;
  memberName: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  // CSS: font-size: 10px; color: #666;
  memberStatus: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },

  // CSS: display: flex; gap: 4px;
  memberActions: {
    flexDirection: 'row',
    gap: 4,
  },

  // CSS: background: transparent; border: 1px solid #333; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 9px;
  miniBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },

  miniBtnText: {
    color: theme.colors.text,
    fontSize: 9,
    fontWeight: theme.typography.weights.regular,
  },
});

// Export the interface for use by parent components
export type { TeamMember };
