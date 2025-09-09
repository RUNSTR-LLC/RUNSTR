/**
 * TeamCard Component - Exact match to HTML mockup team card
 * Shows team info, stats, activities and join option
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { theme } from '../../styles/theme';
import { DiscoveryTeam } from '../../types';
import { PrizeDisplay } from '../ui/PrizeDisplay';
import { DifficultyIndicator } from '../ui/DifficultyIndicator';

interface TeamCardProps {
  team: DiscoveryTeam;
  onPress?: (team: DiscoveryTeam) => void;
  onJoinPress: (team: DiscoveryTeam) => void;
  style?: any;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  team,
  onPress,
  onJoinPress,
  style,
}) => {
  const handleCardPress = () => {
    if (onPress) {
      onPress(team);
    }
  };

  const handleJoinPress = () => {
    onJoinPress(team);
  };

  return (
    <Pressable
      style={[styles.card, team.isFeatured && styles.featuredCard, style]}
      onPress={handleCardPress}
      android_ripple={{ color: theme.colors.buttonHover }}
    >
      {/* Team Header */}
      <View style={styles.teamHeader}>
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.teamAbout}>{team.about}</Text>
        </View>
        {team.isFeatured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
        )}
      </View>

      {/* Prize Section */}
      <PrizeDisplay
        prizePool={team.prizePool}
        recentPayout={team.recentPayout}
      />

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Members</Text>
          <Text style={styles.statValue}>{team.stats.memberCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Avg Pace</Text>
          <Text style={styles.statValue}>{team.stats.avgPace}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Active Events</Text>
          <Text style={styles.statValue}>{team.stats.activeEvents}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Challenges</Text>
          <Text style={styles.statValue}>{team.stats.activeChallenges}</Text>
        </View>
      </View>

      {/* Difficulty Indicator */}
      <DifficultyIndicator level={team.difficulty} />

      {/* Activity Section */}
      <View style={styles.activitySection}>
        <Text style={styles.activityTitle}>Recent Activity</Text>
        <View style={styles.activityItems}>
          {team.recentActivities.slice(0, 3).map((activity) => (
            <Text key={activity.id} style={styles.activityItem}>
              • {activity.description}
            </Text>
          ))}
        </View>
      </View>

      {/* Join Button */}
      <TouchableOpacity
        style={styles.joinBtn}
        onPress={handleJoinPress}
        activeOpacity={0.8}
      >
        <Text style={styles.joinBtnText}>Join Team</Text>
      </TouchableOpacity>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    // Exact CSS: background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 16px; padding: 20px;
    backgroundColor: theme.colors.cardBackground, // #0a0a0a
    borderWidth: 1,
    borderColor: theme.colors.border, // #1a1a1a
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  featuredCard: {
    // Exact CSS: border-color: #fff; background: #0f0f0f;
    borderColor: theme.colors.text, // #fff
    backgroundColor: '#0f0f0f', // Slightly lighter than cardBackground
  },

  teamHeader: {
    // Exact CSS: display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  teamInfo: {
    // Exact CSS: flex: 1;
    flex: 1,
  },

  teamName: {
    // Exact CSS: font-size: 18px; font-weight: 700; margin-bottom: 4px;
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  teamAbout: {
    // Exact CSS: font-size: 13px; color: #999; line-height: 1.3;
    fontSize: 13,
    color: theme.colors.textTertiary, // #999
    lineHeight: 16.9, // 13 * 1.3
  },

  featuredBadge: {
    // Exact CSS: background: #fff; color: #000; padding: 2px 8px; border-radius: 8px;
    backgroundColor: theme.colors.text, // #fff
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  featuredBadgeText: {
    // Exact CSS: font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.colors.accentText, // #000
  },

  statsGrid: {
    // Exact CSS: display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  statItem: {
    // Each stat takes roughly half width with some gap
    width: '48%',
    marginBottom: 8,
  },

  statLabel: {
    // Exact CSS: font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;
    fontSize: 11,
    color: theme.colors.textMuted, // #666
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  statValue: {
    // Exact CSS: font-size: 15px; font-weight: 600; color: #fff;
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  activitySection: {
    // Exact CSS: border-top: 1px solid #1a1a1a; padding-top: 12px;
    borderTopWidth: 1,
    borderTopColor: theme.colors.border, // #1a1a1a
    paddingTop: 12,
    marginTop: 12,
  },

  activityTitle: {
    // Exact CSS: font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
    fontSize: 12,
    color: theme.colors.textMuted, // #666
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  activityItems: {
    gap: 4,
  },

  activityItem: {
    // Exact CSS: font-size: 12px; color: #ccc;
    fontSize: 12,
    color: theme.colors.textSecondary, // #ccc
  },

  joinBtn: {
    // Exact CSS: background: #fff; color: #000; border: none; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600;
    backgroundColor: theme.colors.text, // #fff
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  joinBtnText: {
    // Exact CSS: font-size: 14px; font-weight: 600;
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText, // #000
  },
});
