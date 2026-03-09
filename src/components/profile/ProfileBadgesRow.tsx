/**
 * ProfileBadgesRow Component - Horizontal scroll of compact chips
 * Shows reward destination, subscription tier, and club affiliations.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../styles/theme';
import type { ClubAffiliation } from '../../services/backend/ProfileDataService';

interface ProfileBadgesRowProps {
  rewardDestination?: string | null;
  clubs?: ClubAffiliation[];
  isOwner: boolean;
  onDestinationPress?: () => void;
  onClubPress?: (clubId: string) => void;
}

export const ProfileBadgesRow: React.FC<ProfileBadgesRowProps> = ({
  rewardDestination,
  clubs,
  isOwner,
  onDestinationPress,
  onClubPress,
}) => {
  const hasDestination = !!rewardDestination;
  const hasClubs = clubs && clubs.length > 0;

  // Owner always sees at least a destination badge
  if (!isOwner && !hasDestination && !hasClubs) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
    >
      {/* Reward destination badge — always visible for owner */}
      {(hasDestination || isOwner) && (
        <BadgeChip
          label={hasDestination ? `Supporting ${rewardDestination}` : 'Set Destination'}
          onPress={isOwner ? onDestinationPress : undefined}
        />
      )}

      {/* Club badges */}
      {hasClubs &&
        clubs!.map((club) => (
          <BadgeChip
            key={club.id}
            label={club.name}
            suffix={club.role === 'captain' ? 'Capt' : undefined}
            onPress={onClubPress ? () => onClubPress(club.id) : undefined}
          />
        ))}
    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Internal chip component
// ---------------------------------------------------------------------------

interface BadgeChipProps {
  label: string;
  suffix?: string;
  accent?: boolean;
  onPress?: () => void;
}

const BadgeChip: React.FC<BadgeChipProps> = ({
  label,
  suffix,
  accent = false,
  onPress,
}) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress } : {};

  return (
    <Wrapper
      style={[styles.chip, accent && styles.chipAccent]}
      {...wrapperProps}
    >
      <Text style={[styles.chipText, accent && styles.chipTextAccent]} numberOfLines={1}>
        {label}
      </Text>
      {suffix && (
        <View style={styles.suffixContainer}>
          <Text style={styles.suffixText}>{suffix}</Text>
        </View>
      )}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Chip
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipAccent: {
    borderColor: theme.colors.accent,
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  chipTextAccent: {
    color: theme.colors.accent,
  },

  // Captain suffix
  suffixContainer: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  suffixText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.semiBold,
  },
});
