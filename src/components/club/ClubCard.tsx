/**
 * ClubCard - Displays a fitness club in the browse/list view
 *
 * Dark card with orange accents. Shows club name, member count, captain name,
 * and a contextual right-side action (Join button, checkmark, or captain badge).
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Club } from '../../types/club';
import { PressableScale } from '../ui/PressableScale';

interface ClubCardProps {
  club: Club;
  isMember: boolean;
  isCaptain: boolean;
  isCurrentClub: boolean;
  onPress: () => void;
  onJoinPress: () => void;
  disabled?: boolean; // when user is in another club
  captainName?: string; // Resolved Nostr display name for captain
  captainPictureUrl?: string; // Captain's Nostr profile picture (fallback for missing banner)
}

const ClubCardComponent: React.FC<ClubCardProps> = ({
  club,
  isMember,
  isCaptain,
  isCurrentClub,
  onPress,
  onJoinPress,
  disabled = false,
  captainName,
  captainPictureUrl,
}) => {
  // Show resolved Nostr name, or "Anonymous" if not available
  const captainDisplay = captainName || 'Anonymous';

  const memberText = club.member_count === 1
    ? '1 member'
    : `${club.member_count} members`;

  return (
    <PressableScale
      style={[
        styles.card,
        isCurrentClub && styles.cardActive,
      ]}
      onPress={onPress}
    >
      {/* Left: Club avatar (banner image, captain picture, or fallback icon) */}
      {club.banner_url ? (
        <Image
          source={{ uri: club.banner_url }}
          style={styles.clubImage}
        />
      ) : captainPictureUrl ? (
        <Image
          source={{ uri: captainPictureUrl }}
          style={styles.clubImage}
        />
      ) : (
        <View style={styles.iconContainer}>
          <Ionicons name="people" size={22} color={theme.colors.textMuted} />
        </View>
      )}

      {/* Center: Club info */}
      <View style={styles.content}>
        <Text style={styles.clubName} numberOfLines={1}>
          {club.name}
        </Text>
        <Text style={styles.memberCount} numberOfLines={1}>
          {memberText}
        </Text>
        <Text style={styles.captain} numberOfLines={1}>
          Captain: {captainDisplay}
        </Text>
      </View>

      {/* Right: Action area */}
      {isCurrentClub ? (
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={theme.colors.accent}
          style={styles.actionIcon}
        />
      ) : isCaptain ? (
        <View style={styles.captainBadge}>
          <Ionicons name="star" size={16} color={theme.colors.accent} />
          <Text style={styles.captainBadgeText}>Captain</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.joinButton,
            disabled && styles.joinButtonDisabled,
          ]}
          onPress={onJoinPress}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Text
            style={[
              styles.joinButtonText,
              disabled && styles.joinButtonTextDisabled,
            ]}
          >
            Join
          </Text>
        </TouchableOpacity>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardActive: {},
  clubImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: theme.colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  clubName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    marginBottom: 2,
  },
  memberCount: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: 1,
  },
  captain: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  actionIcon: {
    marginLeft: 8,
  },
  captainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 123, 28, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  captainBadgeText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
  },
  joinButton: {
    borderWidth: 1,
    borderColor: theme.colors.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginLeft: 8,
  },
  joinButtonDisabled: {
    borderColor: theme.colors.textMuted,
    opacity: 0.4,
  },
  joinButtonText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
  },
  joinButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
});

export const ClubCard = React.memo(ClubCardComponent);
export default ClubCard;
