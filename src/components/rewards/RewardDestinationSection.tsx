/**
 * RewardDestinationSection - Compact card showing current reward destination
 *
 * Displays on the Rewards screen as a summary of where workout rewards go.
 * Tapping "Change" opens the full RewardDestinationPicker modal.
 * Tapping the zap icon opens an alert with the charity's Lightning address.
 *
 * Handles four destination types:
 * - Self: "Rewards go to your Lightning address"
 * - PPQ.AI: "Rewards converted to AI credits"
 * - Charity/Project/Service: "Rewards go to [Name]"
 * - Community Team: "Rewards go to [Team Name]" (fetched from Supabase)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  getCharityById,
  isSelfTeam,
  isPPQTeam,
  isCommunityTeam,
  extractCommunityTeamUUID,
  Charity,
} from '../../constants/charities';
import { UserTeamService } from '../../services/backend/UserTeamService';
import { useAuth } from '../../contexts/AuthContext';

interface RewardDestinationSectionProps {
  selectedTeamId: string | null;
  onChangePress: () => void;
  onZapPress?: (charityId: string) => void;
  onPPQTopupPress?: () => void;
}

export const RewardDestinationSection: React.FC<RewardDestinationSectionProps> = ({
  selectedTeamId,
  onChangePress,
  onZapPress,
  onPPQTopupPress,
}) => {
  const { currentUser } = useAuth();
  const isSelf = isSelfTeam(selectedTeamId ?? undefined);
  const isPPQ = isPPQTeam(selectedTeamId ?? undefined);
  const isCommunity = isCommunityTeam(selectedTeamId ?? undefined);
  const charity: Charity | undefined = selectedTeamId
    ? getCharityById(selectedTeamId)
    : undefined;

  // Community team state (fetched from Supabase)
  const [communityTeam, setCommunityTeam] = useState<{
    name: string;
    lightningAddress?: string;
  } | null>(null);

  // Fetch community team data when selectedTeamId changes
  useEffect(() => {
    if (!isCommunity || !selectedTeamId) {
      setCommunityTeam(null);
      return;
    }

    const uuid = extractCommunityTeamUUID(selectedTeamId);
    UserTeamService.getTeamById(uuid)
      .then((team) => {
        if (team) {
          setCommunityTeam({
            name: team.name,
            lightningAddress: team.lightning_address || undefined,
          });
        } else {
          setCommunityTeam(null);
        }
      })
      .catch(() => setCommunityTeam(null));
  }, [selectedTeamId, isCommunity]);

  // Determine display values based on destination type
  const getDisplayName = (): string => {
    if (isSelf) return currentUser?.displayName || currentUser?.name || 'You';
    if (isCommunity && communityTeam) return communityTeam.name;
    if (charity) return charity.name;
    return 'Not selected';
  };

  const getSubtitle = (): string => {
    if (isSelf) return 'Rewards go to your Lightning address';
    if (isPPQ) return 'AI credits';
    if (isCommunity && communityTeam) return `Rewards go to ${communityTeam.name}`;
    if (charity) return `Rewards go to ${charity.name}`;
    return 'Tap Change to select a destination';
  };

  const communityHasLightningAddress = isCommunity && communityTeam?.lightningAddress;
  const showZapButton = !isSelf && (charity?.lightningAddress || communityHasLightningAddress);

  const renderAvatar = () => {
    if (isSelf) {
      if (currentUser?.picture) {
        return <Image source={{ uri: currentUser.picture }} style={styles.avatarImage} />;
      }
      return (
        <View style={styles.selfAvatar}>
          <Ionicons name="person-outline" size={20} color={theme.colors.orangeDeep} />
        </View>
      );
    }

    if (charity?.image) {
      return <Image source={charity.image} style={styles.avatarImage} />;
    }

    return (
      <View style={styles.fallbackAvatar}>
        <Ionicons name="globe-outline" size={20} color={theme.colors.textMuted} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>REWARD DESTINATION</Text>

      <View style={styles.card}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>{renderAvatar()}</View>

        {/* Destination Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.destinationName} numberOfLines={1}>
            {getDisplayName()}
          </Text>
          <Text style={styles.destinationSubtitle} numberOfLines={1}>
            {getSubtitle()}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.changeButton}
            onPress={onChangePress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>

          {isPPQ && onPPQTopupPress && (
            <TouchableOpacity
              style={styles.zapButton}
              onPress={onPPQTopupPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="sparkles" size={18} color={theme.colors.orangeDeep} />
            </TouchableOpacity>
          )}

          {showZapButton && onZapPress && (
            <TouchableOpacity
              style={styles.zapButton}
              onPress={() => {
                const zapTarget = charity?.id || (isCommunity && selectedTeamId ? selectedTeamId : undefined);
                if (zapTarget) onZapPress(zapTarget);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="flash-outline" size={18} color={theme.colors.orangeDeep} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: '#CC7A33',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
  },

  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
  },

  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  selfAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 123, 28, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fallbackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoContainer: {
    flex: 1,
    marginRight: 8,
  },

  destinationName: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FFB366',
    marginBottom: 2,
  },

  destinationSubtitle: {
    fontSize: 13,
    color: '#CC7A33',
    lineHeight: 18,
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 123, 28, 0.1)',
  },

  changeButtonText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FF7B1C',
  },

  zapButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 123, 28, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
