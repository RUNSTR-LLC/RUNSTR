import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { DropdownMenu } from '../ui/DropdownMenu';

interface TeamHeaderProps {
  teamName: string;
  onMenuPress: () => void;
  onLeaveTeam?: () => void;
  onJoinTeam?: () => void;
  onTeamDiscovery: () => void;
  userIsMember?: boolean;
}

export const TeamHeader: React.FC<TeamHeaderProps> = ({
  teamName,
  onMenuPress,
  onLeaveTeam,
  onJoinTeam,
  onTeamDiscovery,
  userIsMember = true,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleMenuPress = () => {
    setShowDropdown(true);
    onMenuPress();
  };

  const menuItems = [
    {
      id: 'team-discovery',
      label: 'Team Discovery',
      onPress: onTeamDiscovery,
    },
    ...(userIsMember && onLeaveTeam
      ? [
          {
            id: 'leave-team',
            label: 'Leave Team',
            onPress: onLeaveTeam,
            destructive: true,
          },
        ]
      : []),
    ...(!userIsMember && onJoinTeam
      ? [
          {
            id: 'join-team',
            label: 'Join Team',
            onPress: onJoinTeam,
          },
        ]
      : []),
  ];
  return (
    <View style={styles.header}>
      <Text style={styles.teamName}>{teamName}</Text>
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={handleMenuPress}
        activeOpacity={0.7}
      >
        <Text style={styles.menuIcon}>⋯</Text>
      </TouchableOpacity>

      <DropdownMenu
        visible={showDropdown}
        onClose={() => setShowDropdown(false)}
        items={menuItems}
        anchorPosition={{ top: 60, right: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    position: 'relative',
  },
  teamName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: theme.colors.text,
  },
  menuBtn: {
    position: 'absolute',
    right: 20,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.gray,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  menuIcon: {
    fontSize: 16,
    color: theme.colors.text,
  },
});
