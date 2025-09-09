/**
 * MiniLeaderboard - Compact leaderboard display for live competition notifications
 * Shows current positions during active competitions
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { MiniLeaderboardEntry } from '../../types';

interface MiniLeaderboardProps {
  entries: MiniLeaderboardEntry[];
  style?: any;
}

export const MiniLeaderboard: React.FC<MiniLeaderboardProps> = ({
  entries,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {entries.map((entry, index) => (
        <View key={index} style={styles.leaderboardRow}>
          <View style={styles.leaderboardPosition}>
            <View
              style={[
                styles.positionNumber,
                entry.isUser && styles.positionNumberHighlight,
              ]}
            >
              <Text
                style={[
                  styles.positionText,
                  entry.isUser && styles.positionTextHighlight,
                ]}
              >
                {entry.position}
              </Text>
            </View>
            <Text style={styles.participantName}>{entry.name}</Text>
            {entry.isGaining && (
              <Text style={styles.positionChange}>↗ gaining</Text>
            )}
          </View>
          <Text style={styles.participantTime}>{entry.time}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },

  leaderboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  leaderboardPosition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },

  positionNumber: {
    width: 18,
    height: 18,
    backgroundColor: theme.colors.buttonBorder, // #333
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  positionNumberHighlight: {
    backgroundColor: theme.colors.text, // #fff
  },

  positionText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text, // #fff
  },

  positionTextHighlight: {
    color: theme.colors.background, // #000
  },

  participantName: {
    fontSize: 12,
    color: theme.colors.textSecondary, // #ccc
    flex: 1,
  },

  positionChange: {
    fontSize: 10,
    color: theme.colors.text, // #fff
    fontWeight: theme.typography.weights.medium,
  },

  participantTime: {
    fontSize: 12,
    color: theme.colors.textSecondary, // #ccc
    fontWeight: theme.typography.weights.medium,
  },
});
