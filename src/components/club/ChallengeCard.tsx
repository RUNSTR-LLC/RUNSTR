/**
 * ChallengeCard - Renders a 1v1 challenge inside a chat message bubble.
 * Extracted from ChatMessageBubble to stay under 500-line limit.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { ChallengeMessageMetadata } from '../../types/club';
import type { ChallengeScoreEntry } from '../../services/challenge/ChallengeService';

function getChallengeLabel(type: string): string {
  switch (type) {
    case 'fastest_5k': return 'Fastest 5K';
    case 'fastest_10k': return 'Fastest 10K';
    case 'daily_streak': return 'Daily Streak';
    case 'most_distance': return 'Most Distance';
    case 'most_steps': return 'Most Steps';
    default: return 'Challenge';
  }
}

function getDurationLabel(days: number): string {
  if (days === 1) return '24 Hours';
  if (days === 7) return '1 Week';
  return `${days} Days`;
}

function formatTimeRemaining(endDateStr: string): string {
  const now = Date.now();
  const end = new Date(endDateStr).getTime();
  const diffMs = end - now;
  if (diffMs <= 0) return 'Ended';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

function formatScore(value: number | null, challengeType: string): string {
  if (value == null) return '--';
  if (challengeType === 'fastest_5k' || challengeType === 'fastest_10k') {
    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  if (challengeType === 'most_distance') return `${(value / 1000).toFixed(1)} km`;
  if (challengeType === 'most_steps') return value.toLocaleString() + ' steps';
  if (challengeType === 'daily_streak') return value === 1 ? '1 workout' : `${value} workouts`;
  return String(value);
}

function isLowerBetter(challengeType: string): boolean {
  return challengeType === 'fastest_5k' || challengeType === 'fastest_10k';
}

interface ChallengeCardProps {
  challengeMeta: ChallengeMessageMetadata;
  content: string;
  liveStatus: string | undefined;
  liveWinner: string | null | undefined;
  isChallenged: boolean;
  challengeIsPending: boolean;
  userNpub?: string;
  winnerName?: string;
  endDate?: string;
  challengeScores?: { challengeType: string; entries: ChallengeScoreEntry[] } | null;
  onAcceptChallenge?: () => void;
  onDeclineChallenge?: () => void;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challengeMeta,
  content,
  liveStatus,
  liveWinner,
  isChallenged,
  challengeIsPending,
  userNpub,
  winnerName,
  endDate,
  challengeScores,
  onAcceptChallenge,
  onDeclineChallenge,
}) => (
  <View style={styles.challengeCard}>
    <View style={styles.challengeInfoRow}>
      <Ionicons name="flash" size={14} color={theme.colors.accent} />
      <Text style={styles.challengeType}>{getChallengeLabel(challengeMeta.challenge_type)}</Text>
      <Text style={styles.challengeDuration}>{getDurationLabel(challengeMeta.duration_days)}</Text>
    </View>
    <Text style={styles.messageText}>{content}</Text>
    {challengeScores && challengeScores.entries.length === 2 && (liveStatus === 'active' || liveStatus === 'completed') && (
      <View style={styles.miniLeaderboard}>
        {[...challengeScores.entries]
          .sort((a, b) => {
            if (a.value == null && b.value == null) return 0;
            if (a.value == null) return 1;
            if (b.value == null) return -1;
            return isLowerBetter(challengeScores.challengeType) ? a.value - b.value : b.value - a.value;
          })
          .map((entry, idx) => {
            const isYou = entry.npub === userNpub;
            const name = isYou ? 'You' : (entry.profileName || entry.npub.slice(0, 8) + '...');
            const isLeader = idx === 0 && entry.value != null;
            return (
              <View key={entry.npub} style={styles.scoreRow}>
                <Text style={[styles.scoreName, isYou && styles.scoreNameYou]}>
                  {liveStatus === 'completed' && isLeader ? '\u{1F3C6} ' : ''}{name}
                </Text>
                <Text style={[styles.scoreValue, isYou && styles.scoreValueYou]}>
                  {formatScore(entry.value, challengeScores.challengeType)}
                </Text>
              </View>
            );
          })}
      </View>
    )}
    {isChallenged && challengeIsPending && (
      <View style={styles.challengeActions}>
        <TouchableOpacity style={styles.acceptButton} onPress={onAcceptChallenge}>
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={onDeclineChallenge}>
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    )}
    {liveStatus === 'active' && (
      <Text style={styles.challengeStatusText}>
        Challenge Active{endDate ? ` \u2014 ${formatTimeRemaining(endDate)}` : ''}
      </Text>
    )}
    {liveStatus === 'completed' && (
      <Text style={styles.challengeStatusText}>
        Winner: {liveWinner === userNpub ? 'You!' : (winnerName || 'Unknown')}
      </Text>
    )}
    {liveStatus === 'declined' && (
      <Text style={[styles.challengeStatusText, { color: theme.colors.textDark }]}>Declined</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  challengeCard: { marginTop: 2 },
  challengeInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  challengeType: { fontSize: 13, fontWeight: theme.typography.weights.semiBold, color: theme.colors.accent },
  challengeDuration: { fontSize: 11, color: theme.colors.textMuted, marginLeft: 'auto' as any },
  messageText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  challengeActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  acceptButton: { flex: 1, backgroundColor: theme.colors.accent, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  acceptButtonText: { fontSize: 13, fontWeight: theme.typography.weights.semiBold, color: '#FFFFFF' },
  declineButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  declineButtonText: { fontSize: 13, fontWeight: theme.typography.weights.semiBold, color: theme.colors.textMuted },
  challengeStatusText: { fontSize: 12, color: theme.colors.accent, fontWeight: theme.typography.weights.semiBold, marginTop: 6 },
  miniLeaderboard: { marginTop: 8, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  scoreRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingVertical: 3 },
  scoreName: { fontSize: 13, color: theme.colors.textMuted },
  scoreNameYou: { color: theme.colors.text, fontWeight: theme.typography.weights.semiBold },
  scoreValue: { fontSize: 13, color: theme.colors.textMuted, fontFamily: 'monospace' },
  scoreValueYou: { color: theme.colors.accent, fontWeight: theme.typography.weights.semiBold },
});

export default ChallengeCard;
