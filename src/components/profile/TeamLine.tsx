/**
 * TeamLine — One-row display of the user's current club with an
 * unread chat-message badge. Renders inside ProfileHero in place of
 * the bio text when the user has joined a club.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';

interface TeamLineProps {
  teamName: string;
  teamAvatarUrl?: string | null;
  unreadCount: number;
  onPress: () => void;
}

const formatBadge = (count: number): string => {
  if (count <= 0) return '';
  if (count >= 99) return '99+';
  return String(count);
};

export const TeamLine: React.FC<TeamLineProps> = ({
  teamName,
  teamAvatarUrl,
  unreadCount,
  onPress,
}) => {
  const badge = formatBadge(unreadCount);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Avatar
        name={teamName}
        size={24}
        imageUrl={teamAvatarUrl || undefined}
      />
      <Text style={styles.label} numberOfLines={1}>
        Team: {teamName}
      </Text>
      <View style={styles.bellWrapper}>
        <Ionicons
          name="notifications-outline"
          size={18}
          color={theme.colors.text}
        />
        {badge !== '' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.regular,
    marginLeft: 8,
    marginRight: 8,
  },
  bellWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.orangeBright,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: theme.colors.background,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
  },
});
