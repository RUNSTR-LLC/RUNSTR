/**
 * ChatMessageBubble - Chat message with replies, reactions, announcements, workout/challenge cards.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, ActionSheetIOS, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import type { ClubMessage, ReplyContext, WorkoutMessageMetadata, ChallengeMessageMetadata } from '../../types/club';

function isWorkoutMetadata(meta: unknown): meta is WorkoutMessageMetadata {
  return meta != null && typeof meta === 'object' && 'duration_seconds' in meta;
}
function isChallengeMetadata(meta: unknown): meta is ChallengeMessageMetadata {
  return meta != null && typeof meta === 'object' && 'challenge_type' in meta;
}
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

const REACTION_ICONS: Record<string, { name: string; label: string }> = {
  flame: { name: 'flame-outline', label: 'Fire' },
  fitness: { name: 'fitness-outline', label: 'Strong' },
  thumbs: { name: 'thumbs-up-outline', label: 'Nice' },
  heart: { name: 'heart-outline', label: 'Love' },
  happy: { name: 'happy-outline', label: 'Haha' },
};
const ALLOWED_REACTIONS = Object.keys(REACTION_ICONS) as (keyof typeof REACTION_ICONS)[];

export interface SenderProfile {
  name?: string;
  display_name?: string;
  picture?: string;
}

interface ChatMessageBubbleProps {
  message: ClubMessage;
  isCaptain: boolean;
  isOwnMessage: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onReply?: () => void;
  onPin?: () => void;
  onChallenge?: () => void;
  onReact?: (emoji: string) => void;
  onAcceptChallenge?: () => void;
  onDeclineChallenge?: () => void;
  liveChallengeStatus?: {
    challenge_status: string;
    winner_npub?: string | null;
    end_date?: string;
  } | null;
  winnerName?: string;
  replyContext?: ReplyContext;
  userNpub?: string;
  senderProfile?: SenderProfile;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  const years = Math.floor(months / 12);
  return `${years}y`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getActivityIcon(exerciseType: string): string {
  switch (exerciseType) {
    case 'running': return 'walk-outline';
    case 'walking': return 'footsteps-outline';
    case 'cycling': return 'bicycle-outline';
    case 'hiking': return 'trail-sign-outline';
    case 'swimming': return 'water-outline';
    case 'strength': return 'barbell-outline';
    case 'yoga': return 'body-outline';
    case 'meditation': return 'leaf-outline';
    default: return 'fitness-outline';
  }
}

const ChatMessageBubbleComponent: React.FC<ChatMessageBubbleProps> = ({
  message,
  isCaptain,
  isOwnMessage,
  canDelete,
  onDelete,
  onReply,
  onPin,
  onChallenge,
  onReact,
  onAcceptChallenge,
  onDeclineChallenge,
  liveChallengeStatus,
  winnerName,
  replyContext,
  userNpub,
  senderProfile,
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const displayName =
    senderProfile?.display_name ||
    senderProfile?.name ||
    message.sender_npub.slice(0, 12) + '...';
  const relativeTime = formatRelativeTime(message.created_at);
  const isAnnouncement = message.message_type === 'announcement';
  const isWorkout = message.message_type === 'workout';
  const isChallenge = message.message_type === 'challenge';
  const workoutMeta = isWorkout && isWorkoutMetadata(message.metadata) ? message.metadata : null;
  const challengeMeta = isChallenge && isChallengeMetadata(message.metadata) ? message.metadata : null;
  const liveStatus = liveChallengeStatus?.challenge_status || challengeMeta?.challenge_status;
  const liveWinner = liveChallengeStatus?.winner_npub || challengeMeta?.winner_npub;
  const isChallenged = isChallenge && challengeMeta?.challenged_npub === userNpub;
  const challengeIsPending = liveStatus === 'pending';
  const reactions = message.reactions || {};

  const handleLongPress = useCallback(() => {
    const options: string[] = [];
    const actions: (() => void)[] = [];

    if (onReply) {
      options.push('Reply');
      actions.push(onReply);
    }

    if (onPin) {
      options.push('Pin');
      actions.push(onPin);
    }

    if (onChallenge && !isOwnMessage) {
      options.push('Challenge');
      actions.push(onChallenge);
    }

    if (canDelete) {
      options.push('Delete');
      actions.push(() => {
        Alert.alert(
          'Delete this message?',
          'This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ]
        );
      });
    }

    if (options.length === 0) return;

    options.push('Cancel');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: options.indexOf('Delete'),
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex < actions.length) {
            actions[buttonIndex]();
          }
        }
      );
    } else {
      // Android fallback: use Alert with buttons
      const buttons = actions.map((action, i) => ({
        text: options[i],
        onPress: action,
        style: (options[i] === 'Delete' ? 'destructive' : 'default') as 'destructive' | 'default',
      }));
      buttons.push({ text: 'Cancel', onPress: () => {}, style: 'default' as const });
      Alert.alert('Message Options', undefined, buttons);
    }
  }, [canDelete, onDelete, onReply, onPin, onChallenge, isOwnMessage]);

  const handleTap = useCallback(() => {
    if (onReact) {
      setShowReactionPicker((prev) => !prev);
    }
  }, [onReact]);

  const handleReactionSelect = useCallback((emoji: string) => {
    setShowReactionPicker(false);
    onReact?.(emoji);
  }, [onReact]);

  const handleReactionPillPress = useCallback((emoji: string) => {
    onReact?.(emoji);
  }, [onReact]);

  return (
    <View>
      <Pressable
        onPress={handleTap}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [
          styles.container,
          isCaptain && styles.captainContainer,
          isOwnMessage && styles.ownContainer,
          isAnnouncement && styles.announcementContainer,
          isChallenge && styles.challengeContainer,
          pressed && (canDelete || !!onReply) && styles.pressedContainer,
        ]}
      >
        {/* Avatar */}
        {!isWorkout && !isChallenge && (
          <Avatar
            name={displayName}
            imageUrl={senderProfile?.picture}
            size={32}
            style={styles.avatar}
          />
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Reply quote block */}
          {replyContext && (
            <View style={styles.replyQuote}>
              <Text style={styles.replyName} numberOfLines={1}>
                {replyContext.sender_name || replyContext.sender_npub.slice(0, 12) + '...'}
              </Text>
              <Text style={styles.replyContent} numberOfLines={1}>
                {replyContext.content}
              </Text>
            </View>
          )}

          {/* Header row: name + timestamp + announcement icon */}
          <View style={styles.headerRow}>
            {isAnnouncement && (
              <Ionicons
                name="megaphone"
                size={14}
                color={theme.colors.accent}
                style={styles.announcementIcon}
              />
            )}
            {isWorkout ? (
              <View style={styles.workoutHeader}>
                <Ionicons
                  name={getActivityIcon(workoutMeta?.exercise_type || '') as any}
                  size={16}
                  color={theme.colors.accent}
                  style={styles.workoutIcon}
                />
                <Text style={styles.workoutLabel}>Workout</Text>
              </View>
            ) : isChallenge ? (
              <View style={styles.workoutHeader}>
                <Ionicons name="flash" size={16} color={theme.colors.accent} style={styles.workoutIcon} />
                <Text style={[styles.workoutLabel, { color: theme.colors.accent }]}>Challenge</Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.senderName,
                  isCaptain && styles.captainName,
                  isAnnouncement && styles.announcementName,
                ]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
            )}
            <Text style={styles.timestamp}>{relativeTime}</Text>
          </View>

          {/* Message body — workout card, challenge card, or text */}
          {isWorkout && workoutMeta ? (
            <View style={styles.workoutCard}>
              <Text style={styles.messageText}>{message.content}</Text>
              <View style={styles.workoutStats}>
                <Text style={styles.workoutStat}>
                  {formatDuration(workoutMeta.duration_seconds)}
                </Text>
                {workoutMeta.distance_meters != null && workoutMeta.distance_meters > 0 && (
                  <Text style={styles.workoutStat}>
                    {(workoutMeta.distance_meters / 1000).toFixed(2)} km
                  </Text>
                )}
              </View>
            </View>
          ) : isChallenge && challengeMeta ? (
            <View style={styles.challengeCard}>
              <View style={styles.challengeInfoRow}>
                <Ionicons name="flash" size={14} color={theme.colors.accent} />
                <Text style={styles.challengeType}>
                  {getChallengeLabel(challengeMeta.challenge_type)}
                </Text>
                <Text style={styles.challengeDuration}>
                  {getDurationLabel(challengeMeta.duration_days)}
                </Text>
              </View>
              <Text style={styles.messageText}>{message.content}</Text>
              {isChallenged && challengeIsPending && (
                <View style={styles.challengeActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={onAcceptChallenge}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={onDeclineChallenge}
                  >
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
              {liveStatus === 'active' && (
                <Text style={styles.challengeStatusText}>
                  Challenge Active{liveChallengeStatus?.end_date ? ` — ${formatTimeRemaining(liveChallengeStatus.end_date)}` : ''}
                </Text>
              )}
              {liveStatus === 'completed' && (
                <Text style={styles.challengeStatusText}>
                  Winner: {liveWinner === userNpub ? 'You!' : (winnerName || 'Unknown')}
                </Text>
              )}
              {liveStatus === 'declined' && (
                <Text style={[styles.challengeStatusText, { color: theme.colors.textDark }]}>
                  Declined
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.messageText}>{message.content}</Text>
          )}

          {/* Reaction pills */}
          {Object.keys(reactions).length > 0 && (
            <View style={styles.reactionRow}>
              {Object.entries(reactions).map(([key, users]) => {
                const hasOwn = userNpub ? users.includes(userNpub) : false;
                const icon = REACTION_ICONS[key];
                if (!icon) return null;
                return (
                  <Pressable
                    key={key}
                    onPress={() => handleReactionPillPress(key)}
                    style={[styles.reactionPill, hasOwn && styles.reactionPillOwn]}
                  >
                    <Ionicons
                      name={icon.name as any}
                      size={14}
                      color={hasOwn ? theme.colors.accent : theme.colors.textMuted}
                      style={styles.reactionIcon}
                    />
                    <Text style={[styles.reactionCount, hasOwn && styles.reactionCountOwn]}>
                      {users.length}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </Pressable>

      {/* Reaction picker (shown on tap) */}
      {showReactionPicker && (
        <View style={styles.reactionPicker}>
          {ALLOWED_REACTIONS.map((key) => (
            <Pressable
              key={key}
              onPress={() => handleReactionSelect(key)}
              style={styles.reactionPickerButton}
            >
              <Ionicons
                name={REACTION_ICONS[key].name as any}
                size={22}
                color={theme.colors.textMuted}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.colors.cardBackground, borderRadius: 8, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: theme.colors.border },
  captainContainer: { borderLeftWidth: 3, borderLeftColor: theme.colors.accent },
  ownContainer: { backgroundColor: 'rgba(204, 122, 51, 0.05)', borderRightWidth: 3, borderRightColor: theme.colors.accent },
  announcementContainer: { backgroundColor: 'rgba(204, 122, 51, 0.08)', borderColor: 'rgba(204, 122, 51, 0.25)' },
  challengeContainer: { borderLeftWidth: 3, borderLeftColor: theme.colors.accent },
  pressedContainer: { opacity: 0.7 },
  avatar: { marginRight: 10, marginTop: 2 },
  content: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  announcementIcon: { marginRight: 4 },
  announcementName: { color: theme.colors.accent },
  senderName: { fontSize: 13, fontWeight: theme.typography.weights.semiBold, color: theme.colors.textMuted, flex: 1, marginRight: 8 },
  captainName: { color: theme.colors.accent },
  timestamp: { fontSize: 11, color: theme.colors.textDark },
  messageText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  replyQuote: { borderLeftWidth: 2, borderLeftColor: theme.colors.accent, paddingLeft: 8, marginBottom: 6, paddingVertical: 2 },
  replyName: { fontSize: 11, fontWeight: theme.typography.weights.semiBold, color: theme.colors.textMuted },
  replyContent: { fontSize: 12, color: theme.colors.textDark },
  workoutHeader: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  workoutIcon: { marginRight: 4 },
  workoutLabel: { fontSize: 11, fontWeight: theme.typography.weights.semiBold, color: theme.colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  workoutCard: { marginTop: 2 },
  workoutStats: { flexDirection: 'row', gap: 12, marginTop: 4 },
  workoutStat: { fontSize: 12, color: theme.colors.textMuted, fontWeight: theme.typography.weights.semiBold },
  challengeCard: { marginTop: 2 },
  challengeInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  challengeType: { fontSize: 13, fontWeight: theme.typography.weights.semiBold, color: theme.colors.accent },
  challengeDuration: { fontSize: 11, color: theme.colors.textMuted, marginLeft: 'auto' as any },
  challengeActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  acceptButton: { flex: 1, backgroundColor: theme.colors.accent, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  acceptButtonText: { fontSize: 13, fontWeight: theme.typography.weights.semiBold, color: '#FFFFFF' },
  declineButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  declineButtonText: { fontSize: 13, fontWeight: theme.typography.weights.semiBold, color: theme.colors.textMuted },
  challengeStatusText: { fontSize: 12, color: theme.colors.accent, fontWeight: theme.typography.weights.semiBold, marginTop: 6 },
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  reactionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.colors.border },
  reactionPillOwn: { backgroundColor: 'rgba(204, 122, 51, 0.12)', borderColor: 'rgba(204, 122, 51, 0.3)' },
  reactionIcon: { marginRight: 3 },
  reactionCount: { fontSize: 12, color: theme.colors.textMuted },
  reactionCountOwn: { color: theme.colors.accent },
  reactionPicker: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 6, marginBottom: 4, backgroundColor: theme.colors.cardBackground, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, marginHorizontal: 40 },
  reactionPickerButton: { padding: 6 },
});

export const ChatMessageBubble = React.memo(ChatMessageBubbleComponent);
export default ChatMessageBubble;
