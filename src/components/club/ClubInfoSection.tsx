/**
 * ClubInfoSection - Club info card, join/leave button, and captain invite card
 *
 * Extracted from ClubPageScreen to keep files under 500 lines.
 * Includes 7-day cooldown UI for the leave button.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { ClubMembershipService } from '../../services/backend/ClubMembershipService';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';
import { Avatar } from '../ui/Avatar';
import type { Club, ClubMembership } from '../../types/club';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CooldownState {
  canLeave: boolean;
  remainingText: string;
}

interface ClubInfoSectionProps {
  club: Club;
  clubId: string;
  isMember: boolean;
  userNpub: string | null;
  isJoining: boolean;
  onJoin: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ClubInfoSection: React.FC<ClubInfoSectionProps> = ({
  club,
  clubId,
  isMember,
  userNpub,
  isJoining,
  onJoin,
}) => {
  const memberCountText =
    club.member_count === 1 ? '1 member' : `${club.member_count} members`;

  // Member avatars state
  const [members, setMembers] = useState<ClubMembership[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Map<string, NostrProfile>>(new Map());
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await ClubMembershipService.getClubMembers(clubId);
        if (cancelled) return;
        setMembers(data);
        if (data.length > 0) {
          const npubs = data.map((m) => m.member_npub);
          const fetched = await nostrProfileService.getProfiles(npubs);
          if (!cancelled) setMemberProfiles(fetched);
        }
      } catch (err) {
        console.error('[ClubInfoSection] Error loading members:', err);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [clubId]);


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
              size={14}
              color={theme.colors.textMuted}
            />
            <Text style={styles.statText}>{memberCountText}</Text>
          </View>
        </View>

        {/* Member avatars */}
        {!membersLoading && members.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersScroll}
            style={styles.membersContainer}
          >
            {members.map((member) => {
              const memberIsCaptain = member.role === 'captain';
              const profile = memberProfiles.get(member.member_npub);
              const name = profile?.display_name || profile?.name || member.member_npub.slice(0, 8) + '...';
              return (
                <View key={member.id} style={styles.memberItem}>
                  <View style={styles.avatarWrapper}>
                    <Avatar name={name} size={32} imageUrl={profile?.picture} />
                    {memberIsCaptain && (
                      <View style={styles.captainBadge}>
                        <Ionicons name="star-outline" size={10} color={theme.colors.accent} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Join button (only shown when NOT a member) */}
      {userNpub && !isMember && (
        <View style={styles.actionContainer}>
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
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  clubTitle: {
    fontSize: 22,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  clubDescription: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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


  // Member avatars
  membersContainer: {
    marginTop: 10,
  },
  membersScroll: {
    gap: 10,
  },
  memberItem: {
    alignItems: 'center',
    width: 48,
  },
  avatarWrapper: {
    position: 'relative',
  },
  captainBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.text,
  },
  memberName: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ClubInfoSection;
