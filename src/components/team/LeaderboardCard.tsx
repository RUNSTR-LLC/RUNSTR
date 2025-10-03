import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { NutzapLightningButton } from '../nutzap/NutzapLightningButton';
import { ChallengeButton } from '../profile/ChallengeButton';
import { FormattedLeaderboardEntry } from '../../types';
import { theme } from '../../styles/theme';

interface LeaderboardCardProps {
  leaderboard: FormattedLeaderboardEntry[];
  title?: string;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  leaderboard,
  title = 'League',
}) => {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>

      {leaderboard.slice(0, 5).map((entry) => (
        <View key={entry.userId} style={styles.item}>
          <View style={[styles.rank, entry.isTopThree && styles.rankTopThree]}>
            <Text
              style={[
                styles.rankText,
                entry.isTopThree && styles.rankTopThreeText,
              ]}
            >
              {entry.rank}
            </Text>
          </View>

          <Avatar
            name={entry.avatar}
            size={theme.layout.avatarSize}
            style={styles.avatar}
            showIcon={true}
          />

          <View style={styles.info}>
            <Text style={styles.name}>{entry.name}</Text>
          </View>

          {entry.npub && (
            <View style={styles.actions}>
              <ChallengeButton
                targetUser={{
                  pubkey: entry.npub,
                  npub: entry.npub,
                  name: entry.name,
                }}
                size="small"
                variant="icon"
              />
              <NutzapLightningButton
                recipientNpub={entry.npub}
                recipientName={entry.name}
                size="small"
                style={styles.zapButton}
              />
            </View>
          )}
        </View>
      ))}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flexShrink: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rank: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankTopThree: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  rankTopThreeText: {
    color: theme.colors.background,
  },
  avatar: {
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  zapButton: {
    marginLeft: 8,
  },
});
