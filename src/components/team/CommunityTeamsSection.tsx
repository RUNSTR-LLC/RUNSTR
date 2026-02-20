/**
 * CommunityTeamsSection - Displays user-created teams from Supabase
 *
 * Fetches teams from the user_teams table and renders them in a style
 * matching the existing team cards in TeamsScreen.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import { UserTeamService, UserTeam } from '../../services/backend/UserTeamService';

interface CommunityTeamsSectionProps {
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  onZapPress: (team: { id: string; name: string; lightningAddress?: string }) => void;
  onZapLongPress: (team: { id: string; name: string; lightningAddress?: string }) => void;
  zappingTeamId: string | null;
  refreshTrigger?: number; // Increment to force refresh
}

interface CommunityTeamCardProps {
  team: UserTeam;
  isSelected: boolean;
  onSelect: () => void;
  onZapPress: () => void;
  onZapLongPress: () => void;
  isZapping: boolean;
}

const CommunityTeamCardComponent: React.FC<CommunityTeamCardProps> = ({
  team,
  isSelected,
  onSelect,
  onZapPress,
  onZapLongPress,
  isZapping,
}) => {
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1.0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleZapPress = () => {
    animatePress();
    onZapPress();
  };

  const handleZapLongPress = () => {
    animatePress();
    onZapLongPress();
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.cardImagePlaceholder}>
        <Ionicons name="people" size={24} color={theme.colors.textMuted} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {team.name}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {team.description || 'Community team'}
        </Text>
      </View>

      {/* Zap Button - only if team has a lightning address */}
      {team.lightning_address && (
        <Animated.View style={{ transform: [{ scale: scaleAnimation }] }}>
          <TouchableOpacity
            onPress={handleZapPress}
            onLongPress={handleZapLongPress}
            style={[
              styles.zapButton,
              isZapping && styles.zappingButton,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            delayLongPress={500}
            disabled={isZapping}
          >
            <Ionicons
              name="flash-outline"
              size={16}
              color={theme.colors.orangeBright}
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Selection Checkmark */}
      {isSelected && (
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={theme.colors.success}
          style={styles.checkmark}
        />
      )}
    </TouchableOpacity>
  );
};

const CommunityTeamCard = React.memo(CommunityTeamCardComponent);

export const CommunityTeamsSection: React.FC<CommunityTeamsSectionProps> = ({
  selectedTeamId,
  onSelectTeam,
  onZapPress,
  onZapLongPress,
  zappingTeamId,
  refreshTrigger,
}) => {
  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reload when screen gains focus or refreshTrigger changes
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadTeams = async () => {
        setIsLoading(true);
        try {
          const fetchedTeams = await UserTeamService.fetchActiveTeams();
          if (!cancelled) setTeams(fetchedTeams);
        } catch (error) {
          console.error('[CommunityTeamsSection] Error loading teams:', error);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      };
      loadTeams();
      return () => { cancelled = true; };
    }, [refreshTrigger])
  );

  // Don't render the section if there are no community teams and not loading
  if (!isLoading && teams.length === 0) {
    return null;
  }

  const handleZapPress = (team: UserTeam) => {
    if (!team.lightning_address) return;
    onZapPress({
      id: `community-${team.id}`,
      name: team.name,
      lightningAddress: team.lightning_address,
    });
  };

  const handleZapLongPress = (team: UserTeam) => {
    if (!team.lightning_address) return;
    onZapLongPress({
      id: `community-${team.id}`,
      name: team.name,
      lightningAddress: team.lightning_address,
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>COMMUNITY TEAMS</Text>
      <Text style={styles.sectionSubtitle}>
        Created by RUNSTR subscribers
      </Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.orangeBright} />
        </View>
      ) : (
        teams.map((team) => (
          <CommunityTeamCard
            key={team.id}
            team={team}
            isSelected={selectedTeamId === `community-${team.id}`}
            onSelect={() => onSelectTeam(`community-${team.id}`)}
            onZapPress={() => handleZapPress(team)}
            onZapLongPress={() => handleZapLongPress(team)}
            isZapping={zappingTeamId === `community-${team.id}`}
          />
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    marginBottom: 2,
  },
  cardDescription: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  zapButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  zappingButton: {
    opacity: 0.7,
  },
  checkmark: {
    marginLeft: 8,
  },
});

export default CommunityTeamsSection;
