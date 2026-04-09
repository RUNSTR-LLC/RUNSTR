/**
 * MatchupCard — Displays a single Season III matchup
 *
 * Shows two clubs head-to-head with step counts.
 * Live matchups show animated step counters.
 * Completed matchups show final scores with winner highlighted.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import type { MatchupWithClubs, LiveScore } from '../../types/season3';
import { Season3BracketService } from '../../services/season/Season3BracketService';

interface MatchupCardProps {
  matchup: MatchupWithClubs;
  liveScores?: LiveScore | null;
  isHero?: boolean;
}

function formatSteps(steps: number): string {
  if (steps >= 1_000_000) return `${(steps / 1_000_000).toFixed(1)}M`;
  if (steps >= 1_000) return `${(steps / 1_000).toFixed(1)}K`;
  return steps.toLocaleString();
}

export const MatchupCard: React.FC<MatchupCardProps> = ({ matchup, liveScores, isHero = false }) => {
  const isLive = matchup.status === 'live';
  const isCompleted = matchup.status === 'completed';

  const clubASteps = isLive ? (liveScores?.club_a_steps ?? 0) : matchup.club_a_steps;
  const clubBSteps = isLive ? (liveScores?.club_b_steps ?? 0) : matchup.club_b_steps;

  const clubAName = matchup.club_a_name ?? 'TBD';
  const clubBName = matchup.club_b_name ?? 'TBD';

  const roundLabel = Season3BracketService.getRoundLabel(matchup.bracket, matchup.round);

  const isClubAWinner = isCompleted && matchup.winner_id === matchup.club_a_id;
  const isClubBWinner = isCompleted && matchup.winner_id === matchup.club_b_id;

  return (
    <View style={[styles.card, isHero && styles.heroCard, isLive && styles.liveCard]}>
      {/* Round label */}
      <View style={styles.header}>
        <Text style={styles.roundLabel}>{roundLabel}</Text>
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        {matchup.match_date && !isLive && (
          <Text style={styles.dateText}>{matchup.match_date}</Text>
        )}
      </View>

      {/* Head-to-head */}
      <View style={styles.versus}>
        {/* Club A */}
        <View style={[styles.club, isClubAWinner && styles.winnerClub]}>
          <Text style={[styles.clubName, isClubAWinner && styles.winnerText]} numberOfLines={1}>
            {clubAName}
          </Text>
          {(isLive || isCompleted) && (
            <Text style={[styles.steps, isHero && styles.heroSteps]}>
              {formatSteps(clubASteps)}
            </Text>
          )}
        </View>

        <Text style={styles.vsText}>VS</Text>

        {/* Club B */}
        <View style={[styles.club, isClubBWinner && styles.winnerClub]}>
          <Text style={[styles.clubName, isClubBWinner && styles.winnerText]} numberOfLines={1}>
            {clubBName}
          </Text>
          {(isLive || isCompleted) && (
            <Text style={[styles.steps, isHero && styles.heroSteps]}>
              {formatSteps(clubBSteps)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  heroCard: {
    padding: 20,
    borderColor: theme.colors.accent,
  },
  liveCard: {
    borderColor: theme.colors.accent,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roundLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  liveText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 1,
  },
  dateText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  versus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  club: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  winnerClub: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  clubName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  winnerText: {
    color: theme.colors.accent,
  },
  vsText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  steps: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  heroSteps: {
    fontSize: 28,
  },
});
