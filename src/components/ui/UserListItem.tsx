/**
 * UserListItem - Reusable user list item with integrated challenge button
 * Used across leaderboards, team lists, and competition screens
 * Features isolated touch zones for profile navigation vs challenge creation
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { theme } from '../../styles/theme';
import { ChallengeIconButton } from './ChallengeIconButton';

export interface UserListItemProps {
  pubkey: string;
  name: string;
  avatar?: string;
  subtitle?: string;
  showChallengeButton?: boolean;
  onChallengePress?: (pubkey: string, name: string) => void;
  onPress?: () => void;
}

export const UserListItem: React.FC<UserListItemProps> = ({
  pubkey,
  name,
  avatar,
  subtitle,
  showChallengeButton = true,
  onChallengePress,
  onPress,
}) => {
  const handleChallengePress = () => {
    if (onChallengePress) {
      onChallengePress(pubkey, name);
    }
  };

  const handleRowPress = () => {
    if (onPress) {
      onPress();
    }
  };

  // Avatar display: Show image if available, otherwise show initial
  const avatarInitial = name ? name.charAt(0).toUpperCase() : '?';

  const content = (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{avatarInitial}</Text>
            </View>
          )}
        </View>

        {/* Name and Subtitle */}
        <View style={styles.textContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {/* Challenge Button - Isolated touch zone */}
      {showChallengeButton && onChallengePress && (
        <View style={styles.rightSection}>
          <ChallengeIconButton
            userPubkey={pubkey}
            userName={name}
            onPress={handleChallengePress}
          />
        </View>
      )}
    </View>
  );

  // Wrap in TouchableOpacity if onPress is provided
  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.wrapper}
        onPress={handleRowPress}
        activeOpacity={0.7}
        accessibilityLabel={`View ${name}'s profile`}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  // Otherwise return unwrapped
  return <View style={styles.wrapper}>{content}</View>;
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.syncBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  rightSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
