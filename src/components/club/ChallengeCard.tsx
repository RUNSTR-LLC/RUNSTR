/**
 * ChallengeCard - Renders a 1v1 challenge inside a chat message bubble.
 * Extracted from ChatMessageBubble to stay under 500-line limit.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { ChallengeMessageMetadata } from '../../types/club';

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
});

export default ChallengeCard;
