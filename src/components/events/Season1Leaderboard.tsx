/**
 * Season1Leaderboard - Displays leaderboard for RUNSTR Season 1
 * Shows ranked participants with distances and prizes for top 3
 * Includes challenge icons for tap-to-challenge functionality
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Modal } from 'react-native';
import { theme } from '../../styles/theme';
import type { Season1Leaderboard, SeasonActivityType } from '../../types/season';
import { calculatePrize } from '../../types/season';
import { ChallengeIconButton } from '../ui/ChallengeIconButton';
import { QuickChallengeWizard } from '../wizards/QuickChallengeWizard';
import { getUserNostrIdentifiers } from '../../utils/nostr';

interface Season1LeaderboardProps {
  leaderboard: Season1Leaderboard | null;
  activityType: SeasonActivityType;
  isLoading: boolean;
}

export const Season1LeaderboardComponent: React.FC<Season1LeaderboardProps> = ({
  leaderboard,
  activityType,
  isLoading,
}) => {
  const [currentUserPubkey, setCurrentUserPubkey] = useState<string | null>(null);
  const [challengeWizardVisible, setChallengeWizardVisible] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<{ pubkey: string; name: string; picture?: string } | null>(null);

  // Get current user's pubkey
  useEffect(() => {
    const loadUserPubkey = async () => {
      const identifiers = await getUserNostrIdentifiers();
      if (identifiers?.hexPubkey) {
        setCurrentUserPubkey(identifiers.hexPubkey);
      }
    };
    loadUserPubkey();
  }, []);

  const getMedal = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}.`;
    }
  };

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return km >= 1 ? `${km.toFixed(1)} km` : `${meters.toFixed(0)} m`;
  };

  const formatName = (name?: string, pubkey?: string): string => {
    if (name) return name;
    if (pubkey) return pubkey.slice(0, 8) + '...';
    return 'Anonymous';
  };

  const handleChallengePress = (pubkey: string, name?: string, picture?: string) => {
    setSelectedOpponent({
      pubkey,
      name: name || pubkey.slice(0, 8) + '...',
      picture,
    });
    setChallengeWizardVisible(true);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {activityType.charAt(0).toUpperCase() + activityType.slice(1)} Leaderboard
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text} />
        </View>
      </View>
    );
  }

  if (!leaderboard || leaderboard.participants.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {activityType.charAt(0).toUpperCase() + activityType.slice(1)} Leaderboard
        </Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No participants yet</Text>
          <Text style={styles.emptySubtext}>
            Be the first to join the competition!
          </Text>
        </View>
      </View>
    );
  }

  // Only show top 10 participants
  const topParticipants = leaderboard.participants.slice(0, 10);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {activityType.charAt(0).toUpperCase() + activityType.slice(1)} Leaderboard
        </Text>
        <Text style={styles.subtitle}>
          {leaderboard.totalParticipants} participants
        </Text>
      </View>

      <View style={styles.entries}>
        {topParticipants.map((participant, index) => {
          const rank = index + 1;
          const prize = calculatePrize(rank);

          return (
            <View key={participant.pubkey} style={styles.entry}>
              <Text style={styles.rank}>{getMedal(rank)}</Text>

              {/* Avatar */}
              <View style={styles.avatarContainer}>
                {participant.picture ? (
                  <Image
                    source={{ uri: participant.picture }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarFallbackText}>
                      {(participant.name || participant.pubkey).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.nameContainer}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {formatName(participant.name, participant.pubkey)}
                  </Text>

                  {/* Challenge Icon - Right next to username */}
                  {currentUserPubkey && participant.pubkey !== currentUserPubkey && (
                    <View style={styles.challengeButtonContainer}>
                      <ChallengeIconButton
                        userPubkey={participant.pubkey}
                        userName={formatName(participant.name, participant.pubkey)}
                        onPress={() => handleChallengePress(
                          participant.pubkey,
                          participant.name,
                          participant.picture
                        )}
                      />
                    </View>
                  )}
                </View>

                {participant.workoutCount > 0 && (
                  <Text style={styles.workoutCount}>
                    {participant.workoutCount} workout{participant.workoutCount !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>

              <View style={styles.statsContainer}>
                <Text style={styles.distance}>
                  {formatDistance(participant.totalDistance)}
                </Text>
                {prize > 0 && (
                  <Text style={styles.prize}>
                    {prize.toLocaleString()} sats
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {leaderboard.totalParticipants > 10 && (
        <Text style={styles.moreText}>
          +{leaderboard.totalParticipants - 10} more participants
        </Text>
      )}

      {/* Challenge Wizard Modal */}
      {selectedOpponent && (
        <Modal
          visible={challengeWizardVisible}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <QuickChallengeWizard
            opponent={selectedOpponent}
            onComplete={() => {
              setChallengeWizardVisible(false);
              setSelectedOpponent(null);
            }}
            onCancel={() => {
              setChallengeWizardVisible(false);
              setSelectedOpponent(null);
            }}
          />
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },

  header: {
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  entries: {
    gap: 0,
  },

  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  rank: {
    width: 40,
    fontSize: 16,
    color: theme.colors.text,
  },

  avatarContainer: {
    marginRight: 12,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
  },

  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  avatarFallbackText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },

  nameContainer: {
    flex: 1,
    marginRight: 12,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  name: {
    fontSize: 16,
    color: theme.colors.text,
  },

  workoutCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },

  statsContainer: {
    alignItems: 'flex-end',
  },

  distance: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  prize: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  moreText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },

  challengeButtonContainer: {
    // Gap handled by nameRow
  },
});