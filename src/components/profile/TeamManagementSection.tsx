/**
 * TeamManagementSection - Profile component for managing team membership
 * Shows current team info and provides options to change teams
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import { Team } from '../../types';
import { Card } from '../ui/Card';

interface TeamManagementSectionProps {
  currentTeam?: Team;
  onChangeTeam: () => void;
  onJoinTeam: () => void;
  onViewTeam?: () => void;
}

export const TeamManagementSection: React.FC<TeamManagementSectionProps> = ({
  currentTeam,
  onChangeTeam,
  onJoinTeam,
  onViewTeam,
}) => {
  if (!currentTeam) {
    return (
      <Card style={styles.card}>
        <View style={styles.noTeamContainer}>
          <Text style={styles.noTeamTitle}>No Team Joined</Text>
          <Text style={styles.noTeamDescription}>
            Join a team to compete in challenges and earn Bitcoin rewards
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onJoinTeam}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Find Teams</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.teamContainer}>
        {/* Team Header */}
        <View style={styles.teamHeader}>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{currentTeam.name}</Text>
            <Text style={styles.teamDescription} numberOfLines={2}>
              {currentTeam.description}
            </Text>
          </View>
          {onViewTeam && (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={onViewTeam}
              activeOpacity={0.8}
            >
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Team Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {currentTeam.prizePool.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Sat Prize Pool</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{currentTeam.memberCount}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {currentTeam.isActive ? 'Active' : 'Inactive'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {/* Team Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onChangeTeam}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Change Team</Text>
          </TouchableOpacity>
        </View>

        {/* Team Management Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            💡 You can switch teams once every 7 days. Leaving a team may
            require paying an exit fee.
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },

  // No Team State
  noTeamContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  noTeamTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  noTeamDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },

  // Team Present State
  teamContainer: {
    paddingVertical: 4,
  },

  teamHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  teamInfo: {
    flex: 1,
    marginRight: 12,
  },

  teamName: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  teamDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  viewButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  viewButtonText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  // Team Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  // Actions
  actionsContainer: {
    marginBottom: 12,
  },

  primaryButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.background,
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  // Info Section
  infoContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 6,
    padding: 12,
  },

  infoText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
});
