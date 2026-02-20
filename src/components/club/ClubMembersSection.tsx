/**
 * ClubMembersSection - Horizontal scrollable member list
 *
 * Shows club members as avatar circles with names below.
 * Captains get a star-outline badge. Fetches from ClubMembershipService.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { ClubMembershipService } from '../../services/backend/ClubMembershipService';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';
import { Avatar } from '../ui/Avatar';
import type { ClubMembership } from '../../types/club';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClubMembersSectionProps {
  clubId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ClubMembersSectionComponent: React.FC<ClubMembersSectionProps> = ({
  clubId,
}) => {
  const [members, setMembers] = useState<ClubMembership[]>([]);
  const [profiles, setProfiles] = useState<Map<string, NostrProfile>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    try {
      const data = await ClubMembershipService.getClubMembers(clubId);
      setMembers(data);

      // Fetch Nostr profiles for all members
      if (data.length > 0) {
        const npubs = data.map((m) => m.member_npub);
        const fetchedProfiles = await nostrProfileService.getProfiles(npubs);
        setProfiles(fetchedProfiles);
      }
    } catch (err) {
      console.error('[ClubMembersSection] Error loading members:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>MEMBERS</Text>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : members.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="person-outline"
            size={36}
            color={theme.colors.textMuted}
          />
          <Text style={styles.emptyText}>Be the first to invite friends!</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {members.map((member) => {
            const isCaptain = member.role === 'captain';
            const profile = profiles.get(member.member_npub);
            const displayName = profile?.display_name || profile?.name || member.member_npub.slice(0, 8) + '...';
            const avatarUrl = profile?.picture;

            return (
              <View key={member.id} style={styles.memberItem}>
                <View style={styles.avatarWrapper}>
                  <Avatar
                    name={displayName}
                    size={48}
                    imageUrl={avatarUrl}
                  />
                  {isCaptain && (
                    <View style={styles.captainBadge}>
                      <Ionicons
                        name="star-outline"
                        size={12}
                        color={theme.colors.accent}
                      />
                    </View>
                  )}
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {displayName}
                </Text>
                {isCaptain && (
                  <Text style={styles.captainLabel}>Captain</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  scrollContent: {
    paddingRight: 16,
    gap: 16,
  },
  memberItem: {
    alignItems: 'center',
    width: 64,
  },
  avatarWrapper: {
    position: 'relative',
  },
  captainBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.text,
  },
  memberName: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  captainLabel: {
    fontSize: 10,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.semiBold,
    marginTop: 2,
  },
});

export const ClubMembersSection = React.memo(ClubMembersSectionComponent);
export default ClubMembersSection;
