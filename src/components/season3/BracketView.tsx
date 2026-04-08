/**
 * BracketView — Double-elimination bracket visualization
 *
 * Shows winners bracket, losers bracket, and grand finals.
 * Horizontally scrollable. Completed matches show scores,
 * live match is highlighted, upcoming shows "TBD".
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { Season3BracketService } from '../../services/season/Season3BracketService';
import type { MatchupWithClubs } from '../../types/season3';

interface BracketViewProps {
  matchups: MatchupWithClubs[];
}

/** Compact matchup node for the bracket */
function BracketNode({ matchup }: { matchup: MatchupWithClubs }) {
  const isLive = matchup.status === 'live';
  const isCompleted = matchup.status === 'completed';
  const isClubAWinner = isCompleted && matchup.winner_id === matchup.club_a_id;
  const isClubBWinner = isCompleted && matchup.winner_id === matchup.club_b_id;

  return (
    <View style={[styles.node, isLive && styles.liveNode]}>
      {isLive && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>LIVE</Text>
        </View>
      )}
      <View style={[styles.teamRow, isClubAWinner && styles.winnerRow]}>
        <Text style={[styles.teamName, isClubAWinner && styles.winnerName]} numberOfLines={1}>
          {matchup.club_a_name ?? 'TBD'}
        </Text>
        {isCompleted && (
          <Text style={[styles.score, isClubAWinner && styles.winnerName]}>
            {(matchup.club_a_steps / 1000).toFixed(0)}K
          </Text>
        )}
      </View>
      <View style={styles.divider} />
      <View style={[styles.teamRow, isClubBWinner && styles.winnerRow]}>
        <Text style={[styles.teamName, isClubBWinner && styles.winnerName]} numberOfLines={1}>
          {matchup.club_b_name ?? 'TBD'}
        </Text>
        {isCompleted && (
          <Text style={[styles.score, isClubBWinner && styles.winnerName]}>
            {(matchup.club_b_steps / 1000).toFixed(0)}K
          </Text>
        )}
      </View>
    </View>
  );
}

/** Group matchups by bracket section and round */
function groupBySection(matchups: MatchupWithClubs[]): {
  winners: Map<number, MatchupWithClubs[]>;
  losers: Map<number, MatchupWithClubs[]>;
  grandFinals: MatchupWithClubs[];
} {
  const winners = new Map<number, MatchupWithClubs[]>();
  const losers = new Map<number, MatchupWithClubs[]>();
  const grandFinals: MatchupWithClubs[] = [];

  for (const m of matchups) {
    if (m.bracket === 'grand_finals') {
      grandFinals.push(m);
    } else if (m.bracket === 'winners') {
      if (!winners.has(m.round)) winners.set(m.round, []);
      winners.get(m.round)!.push(m);
    } else {
      if (!losers.has(m.round)) losers.set(m.round, []);
      losers.get(m.round)!.push(m);
    }
  }

  return { winners, losers, grandFinals };
}

export const BracketView: React.FC<BracketViewProps> = ({ matchups }) => {
  if (matchups.length === 0) {
    return (
      <View style={styles.emptyBracket}>
        <Text style={styles.emptyText}>Bracket will be revealed on May 15</Text>
      </View>
    );
  }

  const { winners, losers, grandFinals } = groupBySection(matchups);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
      <View style={styles.bracketContainer}>
        {/* Winners Bracket */}
        <Text style={styles.bracketLabel}>WINNERS BRACKET</Text>
        <View style={styles.roundsRow}>
          {Array.from(winners.entries())
            .sort(([a], [b]) => a - b)
            .map(([round, roundMatchups]) => (
              <View key={`w-${round}`} style={styles.roundColumn}>
                <Text style={styles.roundLabel}>
                  {Season3BracketService.getRoundLabel('winners', round)}
                </Text>
                {roundMatchups
                  .sort((a, b) => a.match_number - b.match_number)
                  .map((m) => (
                    <BracketNode key={m.id} matchup={m} />
                  ))}
              </View>
            ))}
        </View>

        {/* Grand Finals */}
        {grandFinals.length > 0 && (
          <>
            <Text style={[styles.bracketLabel, { marginTop: 20 }]}>GRAND FINALS</Text>
            <View style={styles.roundsRow}>
              {grandFinals
                .sort((a, b) => a.round - b.round)
                .map((m) => (
                  <BracketNode key={m.id} matchup={m} />
                ))}
            </View>
          </>
        )}

        {/* Losers Bracket */}
        <Text style={[styles.bracketLabel, { marginTop: 20 }]}>LOSERS BRACKET</Text>
        <View style={styles.roundsRow}>
          {Array.from(losers.entries())
            .sort(([a], [b]) => a - b)
            .map(([round, roundMatchups]) => (
              <View key={`l-${round}`} style={styles.roundColumn}>
                <Text style={styles.roundLabel}>
                  {Season3BracketService.getRoundLabel('losers', round)}
                </Text>
                {roundMatchups
                  .sort((a, b) => a.match_number - b.match_number)
                  .map((m) => (
                    <BracketNode key={m.id} matchup={m} />
                  ))}
              </View>
            ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  bracketContainer: {
    padding: 16,
    minWidth: '100%',
  },
  bracketLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 2,
    marginBottom: 8,
  },
  roundsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roundColumn: {
    gap: 8,
    minWidth: 150,
  },
  roundLabel: {
    fontSize: 10,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  node: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    minWidth: 140,
  },
  liveNode: {
    borderColor: theme.colors.accent,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.accent,
  },
  liveLabel: {
    fontSize: 8,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 1,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  winnerRow: {
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
  },
  teamName: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 1,
  },
  winnerName: {
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.bold,
  },
  score: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  emptyBracket: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
