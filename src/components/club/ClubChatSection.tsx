/** ClubChatSection - Embedded chat for club page. */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { useClubChat } from '../../hooks/useClubChat';
import { ChatMessageBubble } from './ChatMessageBubble';
import type { SenderProfile } from './ChatMessageBubble';
import { PinnedMessageBanner } from './PinnedMessageBanner';
import type { ClubMessage, ReplyContext, ChallengeMessageMetadata } from '../../types/club';
import { ChallengeWizardModal } from './ChallengeWizardModal';
import type { ChallengeType } from './ChallengeWizardModal';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';
import { ClubChatService } from '../../services/backend/ClubChatService';
import { ChallengeService } from '../../services/challenge/ChallengeService';
import type { ChallengeStatus, ChallengeScores } from '../../services/challenge/ChallengeService';

interface ClubChatSectionProps {
  clubId: string;
  clubName: string;
  captainNpub: string;
  isMember: boolean;
  pinnedMessageId?: string | null;
}

const ClubChatSectionComponent: React.FC<ClubChatSectionProps> = ({
  clubId,
  clubName,
  captainNpub,
  isMember,
  pinnedMessageId,
}) => {
  const [userNpub, setUserNpub] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ClubMessage | null>(null);
  const [isAnnouncementMode, setIsAnnouncementMode] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState<ClubMessage | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [profiles, setProfiles] = useState<Map<string, NostrProfile>>(new Map());
  const [challengeStatuses, setChallengeStatuses] = useState<Map<string, ChallengeStatus>>(new Map());
  const [challengeScoresMap, setChallengeScoresMap] = useState<Map<string, ChallengeScores>>(new Map());
  const fetchedNpubsRef = useRef<Set<string>>(new Set());

  const navigation = useNavigation<any>();
  const isCaptain = userNpub === captainNpub;
  const [pinnedMessage, setPinnedMessage] = useState<ClubMessage | null>(null);

  // Load user npub
  useEffect(() => {
    const load = async () => {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      setUserNpub(npub);
    };
    load();
  }, []);

  // Club chat hook
  const {
    messages,
    isLoading,
    isSending,
    canSend,
    hasMore,
    sendMessage,
    loadMore,
    deleteMessage,
    toggleReaction,
  } = useClubChat(clubId, userNpub);

  // Fetch profiles for message senders
  useEffect(() => {
    if (messages.length === 0) return;

    const newNpubs = messages
      .map((m) => m.sender_npub)
      .filter((npub) => !fetchedNpubsRef.current.has(npub));

    const uniqueNew = [...new Set(newNpubs)];
    if (uniqueNew.length === 0) return;

    uniqueNew.forEach((npub) => fetchedNpubsRef.current.add(npub));

    const fetchProfiles = async () => {
      try {
        const fetched = await nostrProfileService.getProfiles(uniqueNew);
        setProfiles((prev) => {
          const merged = new Map(prev);
          fetched.forEach((profile, npub) => merged.set(npub, profile));
          return merged;
        });
      } catch (err) {
        console.error('[ClubChatSection] Error fetching profiles:', err);
      }
    };

    fetchProfiles();
  }, [messages]);

  // Resolve pinned message from the loaded messages list
  useEffect(() => {
    if (!pinnedMessageId) { setPinnedMessage(null); return; }
    const found = messages.find((m) => m.id === pinnedMessageId);
    if (found) setPinnedMessage(found);
  }, [pinnedMessageId, messages]);

  // Fetch live challenge statuses and scores (parallel)
  useEffect(() => {
    const challengeMessages = messages.filter(
      (m) => m.message_type === 'challenge' && m.metadata && 'competition_id' in m.metadata
    );
    if (challengeMessages.length === 0) return;
    const fetchStatuses = async () => {
      const entries = await Promise.allSettled(
        challengeMessages.map(async (msg) => {
          const meta = msg.metadata as ChallengeMessageMetadata;
          if (!meta.competition_id) return null;
          let status = await ChallengeService.getChallengeStatus(meta.competition_id);
          if (status?.challenge_status === 'active' && status.end_date && new Date(status.end_date) < new Date()) {
            const completed = await ChallengeService.checkAndComplete(meta.competition_id);
            if (completed) status = completed;
          }
          const scores = status ? await ChallengeService.getChallengeScores(meta.competition_id, status) : null;
          return status ? { id: meta.competition_id, status, scores } : null;
        })
      );
      const newStatuses = new Map<string, ChallengeStatus>();
      const newScores = new Map<string, ChallengeScores>();
      for (const entry of entries) {
        if (entry.status === 'fulfilled' && entry.value) {
          newStatuses.set(entry.value.id, entry.value.status);
          if (entry.value.scores) newScores.set(entry.value.id, entry.value.scores);
        }
      }
      if (newStatuses.size > 0) setChallengeStatuses(newStatuses);
      if (newScores.size > 0) setChallengeScoresMap(newScores);
    };
    fetchStatuses();
  }, [messages]);

  const handlePin = useCallback(async (messageId: string) => {
    if (!userNpub) return;
    await ClubChatService.pinMessage(clubId, messageId, userNpub);
  }, [clubId, userNpub]);

  const handleUnpin = useCallback(async () => {
    if (!userNpub) return;
    await ClubChatService.unpinMessage(clubId, userNpub);
    setPinnedMessage(null);
  }, [clubId, userNpub]);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (trimmed.length === 0 || !canSend || isSending) return;
    setInputText('');
    Keyboard.dismiss();
    const options: Parameters<typeof sendMessage>[1] = {};
    if (replyingTo) options.replyToId = replyingTo.id;
    if (isAnnouncementMode && isCaptain) options.messageType = 'announcement';
    const success = await sendMessage(trimmed, Object.keys(options).length > 0 ? options : undefined);
    if (success) { setReplyingTo(null); setIsAnnouncementMode(false); }
    else { setInputText(trimmed); }
  }, [inputText, canSend, isSending, sendMessage, replyingTo, isAnnouncementMode, isCaptain]);

  const handleDelete = useCallback(async (messageId: string) => {
    await deleteMessage(messageId);
  }, [deleteMessage]);

  const handleReply = useCallback((item: ClubMessage) => { setReplyingTo(item); }, []);

  const handleChallenge = useCallback((item: ClubMessage) => { setChallengeTarget(item); }, []);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    toggleReaction(messageId, emoji);
  }, [toggleReaction]);

  const getProfileForNpub = useCallback((npub: string): SenderProfile | undefined => {
    const p = profiles.get(npub);
    if (!p) return undefined;
    return { name: p.name, display_name: p.display_name, picture: p.picture };
  }, [profiles]);

  const handleAcceptChallenge = useCallback(async (competitionId: string) => {
    if (!userNpub) return;
    const myProfile = getProfileForNpub(userNpub);
    const result = await ChallengeService.acceptChallenge(competitionId, userNpub, {
      name: myProfile?.display_name || myProfile?.name, picture: myProfile?.picture,
    });
    if (result.success) {
      const status = await ChallengeService.getChallengeStatus(competitionId);
      if (status) {
        setChallengeStatuses(prev => { const next = new Map(prev); next.set(competitionId, status); return next; });
      }
    } else {
      const detail = result.error?.includes('403') ? 'You may not be the challenged user.'
        : result.error?.includes('timed out') ? 'Request timed out. Check your connection.'
        : result.error || 'Unknown error';
      Alert.alert('Challenge Error', `Could not accept challenge: ${detail}`);
    }
  }, [userNpub, getProfileForNpub]);

  const handleDeclineChallenge = useCallback(async (competitionId: string) => {
    if (!userNpub) return;
    const result = await ChallengeService.declineChallenge(competitionId, userNpub);
    if (result.success) {
      const status = await ChallengeService.getChallengeStatus(competitionId);
      if (status) {
        setChallengeStatuses(prev => { const next = new Map(prev); next.set(competitionId, status); return next; });
      }
    } else {
      const detail = result.error?.includes('403') ? 'You may not be the challenged user.'
        : result.error?.includes('timed out') ? 'Request timed out. Check your connection.'
        : result.error || 'Unknown error';
      Alert.alert('Challenge Error', `Could not decline challenge: ${detail}`);
    }
  }, [userNpub]);

  const handleSendChallenge = useCallback(async (type: ChallengeType, durationDays: 1 | 3 | 7) => {
    if (!challengeTarget || !userNpub) return;
    const challengedNpub = challengeTarget.sender_npub;
    const challengedName = getProfileForNpub(challengedNpub)?.display_name || challengedNpub.slice(0, 12) + '...';
    const myProfile = getProfileForNpub(userNpub);

    // Create competition first
    const result = await ChallengeService.createChallenge({
      challengerNpub: userNpub,
      challengedNpub,
      challengeType: type,
      durationDays,
      clubId: clubId,
      name: myProfile?.display_name || myProfile?.name,
      picture: myProfile?.picture,
    });

    if (!result) {
      console.error('[ClubChatSection] Failed to create challenge competition');
      Alert.alert('Challenge Error', 'Could not create challenge. Please try again.');
      setChallengeTarget(null);
      return;
    }

    // Send chat message with real competition_id
    const typeLabels: Record<string, string> = {
      fastest_5k: 'Fastest 5K', fastest_10k: 'Fastest 10K',
      daily_streak: 'Daily Streak', most_distance: 'Most Distance', most_steps: 'Most Steps',
    };
    const durLabels: Record<number, string> = { 1: '24 hours', 3: '3 days', 7: '1 week' };
    const content = `challenged ${challengedName} to ${typeLabels[type]} for ${durLabels[durationDays]}!`;

    const metadata: ChallengeMessageMetadata = {
      competition_id: result.competitionId,
      challenge_type: type,
      duration_days: durationDays,
      challenged_npub: challengedNpub,
      challenger_npub: userNpub,
      challenge_status: 'pending',
    };

    await sendMessage(content, { messageType: 'challenge', metadata });
    setChallengeTarget(null);
  }, [challengeTarget, userNpub, clubId, sendMessage, getProfileForNpub]);

  const getReplyContext = useCallback((replyToId: string | null): ReplyContext | undefined => {
    if (!replyToId) return undefined;
    const target = messages.find((m) => m.id === replyToId);
    if (!target) return undefined;
    const p = profiles.get(target.sender_npub);
    return { id: target.id, sender_npub: target.sender_npub, content: target.content.slice(0, 80), sender_name: p?.display_name || p?.name };
  }, [messages, profiles]);

  const renderMessage = useCallback((item: ClubMessage) => {
    const isCaptainMsg = item.sender_npub === captainNpub;
    const isOwnMessage = item.sender_npub === userNpub;
    const canDeleteMessage = userNpub === captainNpub || isOwnMessage;
    const isChMsg = item.message_type === 'challenge' && item.metadata && 'competition_id' in item.metadata;
    const compId = isChMsg ? (item.metadata as ChallengeMessageMetadata).competition_id : '';
    const liveStatus = isChMsg ? challengeStatuses.get(compId) : undefined;
    const winnerProfile = liveStatus?.winner_npub ? getProfileForNpub(liveStatus.winner_npub) : undefined;
    const resolvedWinnerName = winnerProfile?.display_name || winnerProfile?.name || liveStatus?.winner_npub?.slice(0, 12);
    const challengeScores = isChMsg ? challengeScoresMap.get(compId) || null : null;
    return (
      <ChatMessageBubble
        message={item}
        isCaptain={isCaptainMsg}
        isOwnMessage={isOwnMessage}
        canDelete={canDeleteMessage}
        onDelete={() => handleDelete(item.id)}
        onReply={() => handleReply(item)}
        onPin={isCaptain ? () => handlePin(item.id) : undefined}
        onReact={(emoji) => handleReact(item.id, emoji)}
        replyContext={getReplyContext(item.reply_to_id)}
        userNpub={userNpub ?? undefined}
        senderProfile={getProfileForNpub(item.sender_npub)}
        onChallenge={!isOwnMessage ? () => handleChallenge(item) : undefined}
        liveChallengeStatus={isChMsg ? liveStatus || null : null}
        winnerName={resolvedWinnerName}
        challengeScores={challengeScores}
        onAcceptChallenge={isChMsg ? () => handleAcceptChallenge(compId) : undefined}
        onDeclineChallenge={isChMsg ? () => handleDeclineChallenge(compId) : undefined}
      />
    );
  }, [captainNpub, userNpub, isCaptain, handleDelete, handleReply, handlePin, handleReact, handleChallenge, getProfileForNpub, getReplyContext, challengeStatuses, challengeScoresMap, handleAcceptChallenge, handleDeclineChallenge]);

  const placeholderText = !canSend
    ? 'Rate limited...'
    : isAnnouncementMode
    ? 'Write an announcement...'
    : `Message ${clubName}`;

  const canSendNow = canSend && !isSending && inputText.trim().length > 0;

  // Reverse messages so oldest appear at top (messages come newest-first from Supabase)
  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Members-only gate
  if (!isMember) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { marginBottom: 6 }]}>CHAT</Text>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={36} color={theme.colors.textDark} />
          <Text style={styles.lockedTitle}>Members Only</Text>
          <Text style={styles.lockedSubtitle}>Join {clubName} to access the club chat</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.chatHeaderRow}>
        <Text style={styles.sectionLabel}>CHAT</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ClubChat', {
            clubId, clubName, captainNpub, pinnedMessageId,
          })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="expand-outline" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {pinnedMessage && (
        <PinnedMessageBanner
          content={pinnedMessage.content}
          senderName={getProfileForNpub(pinnedMessage.sender_npub)?.display_name || pinnedMessage.sender_npub.slice(0, 12) + '...'}
          onUnpin={isCaptain ? handleUnpin : undefined}
        />
      )}

      {/* Messages list */}
      <View style={styles.chatContainer}>
        {isLoading && messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={36} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            onScroll={({ nativeEvent }) => {
              if (nativeEvent.contentOffset.y < 50 && hasMore && !isLoading) {
                loadMore();
              }
            }}
            scrollEventThrottle={400}
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            }}
          >
            {orderedMessages.map((item) => (
              <View key={item.id}>
                {renderMessage(item)}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Reply bar */}
      {replyingTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarLabel}>Replying to:</Text>
            <Text style={styles.replyBarText} numberOfLines={1}>
              {replyingTo.content.slice(0, 60)}
            </Text>
          </View>
          <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      )}

      {/* Input bar */}
      {userNpub && isMember && (
        <View style={[styles.inputBar, isAnnouncementMode && styles.inputBarAnnouncement]}>
          {/* Announcement toggle (captain only) */}
          {isCaptain && (
            <TouchableOpacity
              onPress={() => setIsAnnouncementMode((prev) => !prev)}
              style={[
                styles.announcementButton,
                isAnnouncementMode && styles.announcementButtonActive,
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="megaphone"
                size={18}
                color={isAnnouncementMode ? theme.colors.accent : theme.colors.textDark}
              />
            </TouchableOpacity>
          )}

          <TextInput
            style={[styles.textInput, !canSend && styles.textInputDisabled]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={placeholderText}
            placeholderTextColor={theme.colors.textDark}
            editable={canSend}
            maxLength={1000}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={true}
          />
          <TouchableOpacity
            style={[styles.sendButton, canSendNow && styles.sendButtonActive]}
            onPress={handleSend}
            disabled={!canSendNow}
            activeOpacity={0.7}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Ionicons name="send" size={20} color={canSendNow ? theme.colors.accent : theme.colors.textDark} />
            )}
          </TouchableOpacity>
        </View>
      )}
      {challengeTarget && (
        <ChallengeWizardModal
          visible={!!challengeTarget}
          onClose={() => setChallengeTarget(null)}
          onSend={handleSendChallenge}
          opponentName={
            getProfileForNpub(challengeTarget.sender_npub)?.display_name ||
            challengeTarget.sender_npub.slice(0, 12) + '...'
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { flex: 1, minHeight: 340, paddingHorizontal: 16, marginTop: 12, paddingBottom: 8 },
  chatHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionLabel: { fontSize: 12, fontWeight: theme.typography.weights.bold, color: theme.colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  chatContainer: { flex: 1, backgroundColor: theme.colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  lockedContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: theme.colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
  lockedTitle: { fontSize: 16, fontWeight: theme.typography.weights.semiBold, color: theme.colors.textMuted, marginTop: 10 },
  lockedSubtitle: { fontSize: 14, color: theme.colors.textDark, marginTop: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 8 },
  messageList: { flex: 1 },
  messageListContent: { paddingVertical: 8, paddingHorizontal: 8 },
  replyBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.cardBackground, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 3, borderLeftColor: theme.colors.accent },
  replyBarContent: { flex: 1, marginRight: 8 },
  replyBarLabel: { fontSize: 11, fontWeight: theme.typography.weights.semiBold, color: theme.colors.accent, marginBottom: 1 },
  replyBarText: { fontSize: 13, color: theme.colors.textMuted },
  inputBar: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: theme.colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  inputBarAnnouncement: { borderColor: 'rgba(204, 122, 51, 0.3)' },
  announcementButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  announcementButtonActive: { backgroundColor: 'rgba(204, 122, 51, 0.12)' },
  textInput: { flex: 1, fontSize: 15, color: theme.colors.text, paddingVertical: 8 },
  textInputDisabled: { opacity: 0.5 },
  sendButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  sendButtonActive: { backgroundColor: 'rgba(204, 122, 51, 0.1)' },
});

export const ClubChatSection = React.memo(ClubChatSectionComponent);
export default ClubChatSection;
