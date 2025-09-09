/**
 * TeamJoinModal - Confirmation modal for team joining with user preferences
 * Shows team details and handles join/leave team flow with cooldown periods
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { theme } from '../../styles/theme';
import { useTeamJoin } from '../../store/teamStore';
import type { DiscoveryTeam } from '../../types';
import { DifficultyIndicator } from '../ui/DifficultyIndicator';
import { PrizeDisplay } from '../ui/PrizeDisplay';

interface TeamJoinModalProps {
  visible: boolean;
  team: DiscoveryTeam | null;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const TeamJoinModal: React.FC<TeamJoinModalProps> = ({
  visible,
  team,
  userId,
  onClose,
  onSuccess,
}) => {
  const { joinTeam, leaveTeam, isJoining, hasTeam, currentTeam, error } =
    useTeamJoin();
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [userPreferences, setUserPreferences] = useState({
    receiveNotifications: true,
    autoJoinEvents: false,
    privacyLevel: 'public' as 'public' | 'team' | 'private',
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setShowLeaveConfirmation(false);
    }
  }, [visible]);

  const handleJoinTeam = async () => {
    if (!team) return;

    try {
      const result = await joinTeam(team.id, userId);

      if (result.success) {
        Alert.alert(
          'Welcome to the Team!',
          `You've successfully joined ${team.name}. Start competing in challenges and events to earn bitcoin rewards!`,
          [
            {
              text: 'Start Competing',
              onPress: () => {
                onSuccess();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('Join Failed', result.error || 'Failed to join team');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleLeaveCurrentTeam = async () => {
    if (!currentTeam) return;

    try {
      const result = await leaveTeam(userId);

      if (result.success) {
        setShowLeaveConfirmation(false);
        Alert.alert(
          'Left Team',
          `You've left ${currentTeam.name}. You can now join a new team.`,
          [{ text: 'Continue', onPress: () => {} }]
        );
      } else {
        Alert.alert('Leave Failed', result.error || 'Failed to leave team');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffHours = Math.floor(
      (now.getTime() - past.getTime()) / (1000 * 60 * 60)
    );

    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffHours < 48) return '1 day ago';
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  const formatSats = (sats: number): string => {
    return sats.toLocaleString();
  };

  if (!team) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {hasTeam ? 'Switch Teams' : 'Join Team'}
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Team Warning */}
          {hasTeam && currentTeam && !showLeaveConfirmation && (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>
                ⚠️ You&apos;re already on a team
              </Text>
              <Text style={styles.warningText}>
                You&apos;re currently a member of{' '}
                <Text style={styles.bold}>{currentTeam.name}</Text>
              </Text>
              <Text style={styles.warningSubtext}>
                To join {team.name}, you need to leave your current team first.
                This may include exit fees and cooldown periods.
              </Text>
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={() => setShowLeaveConfirmation(true)}
              >
                <Text style={styles.leaveButtonText}>Leave Current Team</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Leave Confirmation */}
          {showLeaveConfirmation && currentTeam && (
            <View style={styles.confirmationCard}>
              <Text style={styles.confirmationTitle}>
                Leave {currentTeam.name}?
              </Text>
              <Text style={styles.confirmationText}>
                • Exit fee: {formatSats(currentTeam.exitFee)} sats
              </Text>
              <Text style={styles.confirmationText}>
                • 24-hour cooldown before joining a new team
              </Text>
              <Text style={styles.confirmationText}>
                • You&apos;ll lose access to current challenges and events
              </Text>

              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowLeaveConfirmation(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleLeaveCurrentTeam}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Leave Team</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Team Details */}
          {(!hasTeam || showLeaveConfirmation) && (
            <View style={styles.teamCard}>
              <View style={styles.teamHeader}>
                <View>
                  <Text style={styles.teamName}>{team.name}</Text>
                  <Text style={styles.teamAbout}>{team.about}</Text>
                </View>
                {team.isFeatured && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredText}>FEATURED</Text>
                  </View>
                )}
              </View>

              <PrizeDisplay
                prizePool={team.prizePool}
                recentPayout={team.recentPayout}
              />

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>MEMBERS</Text>
                  <Text style={styles.statValue}>{team.stats.memberCount}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>AVG PACE</Text>
                  <Text style={styles.statValue}>{team.stats.avgPace}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>ACTIVE EVENTS</Text>
                  <Text style={styles.statValue}>
                    {team.stats.activeEvents}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>CHALLENGES</Text>
                  <Text style={styles.statValue}>
                    {team.stats.activeChallenges}
                  </Text>
                </View>
              </View>

              <DifficultyIndicator level={team.difficulty} />

              {/* Recent Activities */}
              <View style={styles.activitiesSection}>
                <Text style={styles.activitiesTitle}>RECENT ACTIVITY</Text>
                {team.recentActivities.slice(0, 3).map((activity, index) => (
                  <Text key={activity.id} style={styles.activityItem}>
                    • {activity.description}
                  </Text>
                ))}
              </View>

              {/* Team Benefits */}
              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsTitle}>What you get:</Text>
                <Text style={styles.benefitItem}>
                  ✓ Access to team events and challenges
                </Text>
                <Text style={styles.benefitItem}>
                  ✓ Earn bitcoin rewards for participation
                </Text>
                <Text style={styles.benefitItem}>
                  ✓ Team leaderboard rankings
                </Text>
                {team.joinReward && (
                  <Text style={styles.benefitItem}>
                    ✓ {formatSats(team.joinReward)} sats welcome bonus
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Join Button */}
          {(!hasTeam || (hasTeam && showLeaveConfirmation && !currentTeam)) && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoinTeam}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.joinButtonText}>Join {team.name}</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Error Display */}
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '300',
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  warningCard: {
    backgroundColor: '#1a1a00',
    borderWidth: 1,
    borderColor: '#333300',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  warningTitle: {
    color: '#ffcc00',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  warningText: {
    color: '#cccccc',
    fontSize: 14,
    marginBottom: 4,
  },
  warningSubtext: {
    color: '#999999',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  bold: {
    fontWeight: '700',
  },
  leaveButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmationCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  confirmationTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  confirmationText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  teamCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  teamName: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  teamAbout: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    maxWidth: 250,
  },
  featuredBadge: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featuredText: {
    color: theme.colors.background,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    width: '48%',
    marginBottom: 12,
  },
  statLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  activitiesSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  activitiesTitle: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  activityItem: {
    color: theme.colors.text,
    fontSize: 12,
    marginBottom: 4,
  },
  benefitsSection: {
    marginTop: 16,
  },
  benefitsTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  benefitItem: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  joinButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  joinButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#1a0000',
    borderWidth: 1,
    borderColor: '#330000',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#ff6666',
    fontSize: 14,
    textAlign: 'center',
  },
});
