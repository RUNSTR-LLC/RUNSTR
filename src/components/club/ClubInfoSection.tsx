/**
 * ClubInfoSection - Club info card, join/leave button, and captain invite card
 *
 * Extracted from ClubPageScreen to keep files under 500 lines.
 * Includes 7-day cooldown UI for the leave button.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { Club } from '../../types/club';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CooldownState {
  canLeave: boolean;
  remainingText: string;
}

interface ClubInfoSectionProps {
  club: Club;
  isMember: boolean;
  isCaptain: boolean;
  userNpub: string | null;
  isJoining: boolean;
  isLeaving: boolean;
  cooldown: CooldownState | null;
  onJoin: () => void;
  onLeaveConfirm: () => void;
  onCooldownBlocked: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ClubInfoSection: React.FC<ClubInfoSectionProps> = ({
  club,
  isMember,
  isCaptain,
  userNpub,
  isJoining,
  isLeaving,
  cooldown,
  onJoin,
  onLeaveConfirm,
  onCooldownBlocked,
}) => {
  const memberCountText =
    club.member_count === 1 ? '1 member' : `${club.member_count} members`;

  const handleShareClub = async () => {
    try {
      await Share.share({
        message:
          `Join my fitness club "${club.name}" on RUNSTR!\n\n` +
          `Download RUNSTR and search for "${club.name}" in the Clubs tab.\n\n` +
          `https://runstr.club`,
      });
    } catch {
      // User cancelled or share failed silently
    }
  };

  const handleLeavePress = () => {
    // If in cooldown (and not captain), show the blocked message
    if (cooldown && !cooldown.canLeave && !isCaptain) {
      onCooldownBlocked();
    } else {
      onLeaveConfirm();
    }
  };

  // Build leave button label + icon
  const leaveInCooldown = cooldown && !cooldown.canLeave && !isCaptain;

  return (
    <>
      {/* Club info card */}
      <View style={styles.infoCard}>
        <Text style={styles.clubTitle}>{club.name}</Text>

        {club.description ? (
          <Text style={styles.clubDescription}>{club.description}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons
              name="people-outline"
              size={16}
              color={theme.colors.textMuted}
            />
            <Text style={styles.statText}>{memberCountText}</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons
              name="fitness-outline"
              size={16}
              color={theme.colors.textMuted}
            />
            <Text style={styles.statText}>Active this week</Text>
          </View>
        </View>
      </View>

      {/* Join / Leave button */}
      {userNpub && (
        <View style={styles.actionContainer}>
          {isMember ? (
            <TouchableOpacity
              style={[
                styles.leaveButton,
                leaveInCooldown && styles.leaveButtonCooldown,
              ]}
              onPress={handleLeavePress}
              disabled={isLeaving}
              activeOpacity={0.7}
            >
              {isLeaving ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textMuted}
                />
              ) : leaveInCooldown ? (
                <>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={theme.colors.textDark}
                  />
                  <Text style={styles.leaveButtonCooldownText}>
                    Leave in {cooldown.remainingText}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color={theme.colors.textMuted}
                  />
                  <Text style={styles.leaveButtonText}>Leave Club</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={onJoin}
              disabled={isJoining}
              activeOpacity={0.7}
            >
              {isJoining ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.text}
                />
              ) : (
                <>
                  <Ionicons
                    name="enter-outline"
                    size={20}
                    color={theme.colors.text}
                  />
                  <Text style={styles.joinButtonText}>Join Club</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Invite Members card (captain only) */}
      {isCaptain && (
        <View style={styles.inviteCard}>
          <Text style={styles.inviteTitle}>Invite Members</Text>
          <Text style={styles.inviteDescription}>
            Share your club with friends to grow your crew.
          </Text>

          <View style={styles.inviteStatsRow}>
            <Ionicons
              name="people-outline"
              size={16}
              color={theme.colors.textMuted}
            />
            <Text style={styles.inviteStatsText}>{memberCountText}</Text>
          </View>

          <TouchableOpacity
            style={styles.inviteShareButton}
            onPress={handleShareClub}
            activeOpacity={0.7}
          >
            <Ionicons
              name="share-outline"
              size={20}
              color={theme.colors.text}
            />
            <Text style={styles.inviteShareButtonText}>Share Club</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Club info card
  infoCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  clubTitle: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 6,
  },
  clubDescription: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  // Join / Leave button
  actionContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.text,
    paddingVertical: 14,
    gap: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    gap: 8,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
  leaveButtonCooldown: {
    borderColor: theme.colors.border,
    opacity: 0.7,
  },
  leaveButtonCooldownText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textDark,
  },

  // Invite Members card (captain)
  inviteCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  inviteDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  inviteStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  inviteStatsText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  inviteShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.text,
    paddingVertical: 12,
    gap: 8,
  },
  inviteShareButtonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
});

export default ClubInfoSection;
