# Pinned Messages & 1v1 Challenges Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add captain-pinned messages to club chat and a 1v1 challenge system initiated from chat long-press.

**Architecture:** Pinned messages use a `pinned_message_id` column on the clubs table, updated via the existing `manage-club` edge function. Challenges reuse the `competitions` table with `template: 'challenge'` and challenge-specific fields in `config` JSONB. A new `challenge` message type in club chat renders accept/decline cards. Both features build on existing infrastructure with minimal new tables.

**Tech Stack:** React Native, TypeScript, Supabase (Edge Functions, Realtime), Ionicons

---

## SQL Migrations (apply via Supabase dashboard)

### Migration 1: Pinned messages

```sql
ALTER TABLE user_teams
  ADD COLUMN pinned_message_id UUID REFERENCES club_messages(id) DEFAULT NULL;
```

### Migration 2: Challenge message type

```sql
ALTER TABLE club_messages
  DROP CONSTRAINT IF EXISTS club_messages_message_type_check;

ALTER TABLE club_messages
  ADD CONSTRAINT club_messages_message_type_check
  CHECK (message_type IN ('message', 'announcement', 'workout', 'challenge'));
```

---

## Task 1: Update TypeScript types for pinned messages and challenges

**Files:**
- Modify: `src/types/club.ts`

**Step 1: Add pinned_message_id to Club, challenge to ClubMessageType, ChallengeMetadata interface**

Add `pinned_message_id` to Club interface:
```typescript
export interface Club {
  id: string;
  name: string;
  description: string | null;
  lightning_address: string | null;
  created_by_npub: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
  banner_url: string | null;
  leaderboard_metric: 'distance' | 'steps';
  pinned_message_id: string | null;
}
```

Update ClubMessageType:
```typescript
export type ClubMessageType = 'message' | 'announcement' | 'workout' | 'challenge';
```

Update ClubMessage metadata field to support both types:
```typescript
export interface ClubMessage {
  id: string;
  club_id: string;
  sender_npub: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  reply_to_id: string | null;
  message_type: ClubMessageType;
  metadata: WorkoutMessageMetadata | ChallengeMessageMetadata | null;
  reactions: Record<string, string[]>;
}
```

Add ChallengeMessageMetadata:
```typescript
export interface ChallengeMessageMetadata {
  competition_id: string;
  challenge_type: 'fastest_5k' | 'fastest_10k' | 'daily_streak' | 'most_distance' | 'most_steps';
  duration_days: 1 | 3 | 7;
  challenged_npub: string;
  challenger_npub: string;
  challenge_status: 'pending' | 'accepted' | 'declined' | 'active' | 'completed';
  winner_npub?: string;
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: May show errors in files using Club type that don't expect pinned_message_id — these are fine since it's nullable.

**Step 3: Commit**

```bash
git add src/types/club.ts
git commit -m "Feature: Add pinned message and challenge types"
```

---

## Task 2: Update edge function for pin/unpin and challenge message type

**Files:**
- Modify: `supabase/functions/manage-club-chat/index.ts`

**Step 1: Add `pin` and `unpin` actions, update ALLOWED_MESSAGE_TYPES**

Update the ALLOWED_MESSAGE_TYPES constant:
```typescript
const ALLOWED_MESSAGE_TYPES = ['message', 'announcement', 'workout', 'challenge'] as const
```

Add handlePin function after handleReact:
```typescript
async function handlePin(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, unknown>,
) {
  const { club_id, caller_npub, message_id } = params as {
    club_id?: string
    caller_npub?: string
    message_id?: string
  }

  if (!club_id || !caller_npub || !message_id) {
    return errorResponse('Missing required fields: club_id, caller_npub, message_id')
  }

  // Auth: caller must be captain
  const { data: membership, error: memErr } = await supabase
    .from('club_memberships')
    .select('id, role')
    .eq('club_id', club_id)
    .eq('member_npub', caller_npub)
    .single()

  if (memErr || !membership || membership.role !== 'captain') {
    return errorResponse('Only the club captain can pin messages', 403)
  }

  // Verify message exists in this club
  const { data: msg, error: msgErr } = await supabase
    .from('club_messages')
    .select('id')
    .eq('id', message_id)
    .eq('club_id', club_id)
    .is('deleted_at', null)
    .single()

  if (msgErr || !msg) {
    return errorResponse('Message not found in this club', 404)
  }

  // Update club's pinned_message_id
  const { error: updateErr } = await supabase
    .from('user_teams')
    .update({ pinned_message_id: message_id })
    .eq('id', club_id)

  if (updateErr) {
    console.error('Pin message error:', updateErr)
    return errorResponse(updateErr.message, 500)
  }

  console.log(`Message ${message_id} pinned in club ${club_id} by ${caller_npub.slice(0, 12)}...`)
  return jsonResponse({ success: true, data: { pinned_message_id: message_id } })
}

async function handleUnpin(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, unknown>,
) {
  const { club_id, caller_npub } = params as {
    club_id?: string
    caller_npub?: string
  }

  if (!club_id || !caller_npub) {
    return errorResponse('Missing required fields: club_id, caller_npub')
  }

  // Auth: caller must be captain
  const { data: membership, error: memErr } = await supabase
    .from('club_memberships')
    .select('id, role')
    .eq('club_id', club_id)
    .eq('member_npub', caller_npub)
    .single()

  if (memErr || !membership || membership.role !== 'captain') {
    return errorResponse('Only the club captain can unpin messages', 403)
  }

  const { error: updateErr } = await supabase
    .from('user_teams')
    .update({ pinned_message_id: null })
    .eq('id', club_id)

  if (updateErr) {
    console.error('Unpin message error:', updateErr)
    return errorResponse(updateErr.message, 500)
  }

  console.log(`Message unpinned in club ${club_id} by ${caller_npub.slice(0, 12)}...`)
  return jsonResponse({ success: true, data: { pinned_message_id: null } })
}
```

Add cases to the switch dispatcher:
```typescript
case 'pin':
  return await handlePin(supabase, params)
case 'unpin':
  return await handleUnpin(supabase, params)
```

**Step 2: Commit**

```bash
git add supabase/functions/manage-club-chat/index.ts
git commit -m "Feature: Add pin/unpin actions to chat edge function"
```

**Note:** Deploy with `supabase functions deploy manage-club-chat` after committing.

---

## Task 3: Add pin/unpin to ClubChatService

**Files:**
- Modify: `src/services/backend/ClubChatService.ts`

**Step 1: Add pinMessage and unpinMessage methods**

Add after the `toggleReaction` method:

```typescript
  /**
   * Pin a message in a club (captain only).
   */
  static async pinMessage(clubId: string, messageId: string, callerNpub: string): Promise<boolean> {
    const result = await callEdgeFunction('manage-club-chat', {
      action: 'pin',
      club_id: clubId,
      message_id: messageId,
      caller_npub: callerNpub,
    });

    if (!result.success) {
      console.error('[ClubChatService] pinMessage error:', result.error);
      return false;
    }

    console.log(`[ClubChatService] Message pinned: ${messageId}`);
    return true;
  }

  /**
   * Unpin the pinned message in a club (captain only).
   */
  static async unpinMessage(clubId: string, callerNpub: string): Promise<boolean> {
    const result = await callEdgeFunction('manage-club-chat', {
      action: 'unpin',
      club_id: clubId,
      caller_npub: callerNpub,
    });

    if (!result.success) {
      console.error('[ClubChatService] unpinMessage error:', result.error);
      return false;
    }

    console.log(`[ClubChatService] Message unpinned in club ${clubId}`);
    return true;
  }
```

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add src/services/backend/ClubChatService.ts
git commit -m "Feature: Add pin/unpin methods to ClubChatService"
```

---

## Task 4: Add "Pin" to ChatMessageBubble long-press action sheet

**Files:**
- Modify: `src/components/club/ChatMessageBubble.tsx`

**Step 1: Add onPin and onChallenge props**

Update the props interface:
```typescript
interface ChatMessageBubbleProps {
  message: ClubMessage;
  isCaptain: boolean;
  isOwnMessage: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onPin?: () => void;
  onChallenge?: () => void;
  replyContext?: ReplyContext;
  userNpub?: string;
  senderProfile?: SenderProfile;
}
```

Destructure the new props in the component and add to handleLongPress:
```typescript
// After the Reply option:
if (onPin) {
  options.push('Pin');
  actions.push(onPin);
}

// After the Pin option (only for other people's messages):
if (onChallenge && !isOwnMessage) {
  options.push('Challenge');
  actions.push(onChallenge);
}
```

Update the useCallback dependency array to include `onPin` and `onChallenge`.

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add src/components/club/ChatMessageBubble.tsx
git commit -m "Feature: Add Pin and Challenge to message action sheet"
```

---

## Task 5: Add PinnedMessageBanner component

**Files:**
- Create: `src/components/club/PinnedMessageBanner.tsx`

**Step 1: Create the pinned message banner**

```tsx
/**
 * PinnedMessageBanner - Shows the pinned message at the top of club chat
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface PinnedMessageBannerProps {
  content: string;
  senderName: string;
  onUnpin?: () => void;
  onPress?: () => void;
}

const PinnedMessageBannerComponent: React.FC<PinnedMessageBannerProps> = ({
  content,
  senderName,
  onUnpin,
  onPress,
}) => {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Ionicons name="pin" size={14} color={theme.colors.accent} style={styles.icon} />
      <View style={styles.content}>
        <Text style={styles.senderName} numberOfLines={1}>{senderName}</Text>
        <Text style={styles.messageText} numberOfLines={1}>{content}</Text>
      </View>
      {onUnpin && (
        <TouchableOpacity onPress={onUnpin} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 6,
  },
  icon: {
    marginRight: 8,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  senderName: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
    marginBottom: 1,
  },
  messageText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});

export const PinnedMessageBanner = React.memo(PinnedMessageBannerComponent);
export default PinnedMessageBanner;
```

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add src/components/club/PinnedMessageBanner.tsx
git commit -m "Feature: Add PinnedMessageBanner component"
```

---

## Task 6: Wire pinned message into ClubChatSection and ClubChatScreen

**Files:**
- Modify: `src/components/club/ClubChatSection.tsx`
- Modify: `src/screens/ClubChatScreen.tsx`

**Step 1: Add pinned message state and rendering to ClubChatSection**

Add props: the `ClubChatSectionProps` already receives `clubId`. We need the `pinned_message_id` from the parent. Add it as a prop:

```typescript
interface ClubChatSectionProps {
  clubId: string;
  clubName: string;
  captainNpub: string;
  isMember: boolean;
  pinnedMessageId?: string | null;
}
```

Inside the component, add state to fetch and hold the pinned message:
```typescript
const [pinnedMessage, setPinnedMessage] = useState<ClubMessage | null>(null);

useEffect(() => {
  if (!pinnedMessageId) {
    setPinnedMessage(null);
    return;
  }
  // Find pinned message in current messages array
  const found = messages.find((m) => m.id === pinnedMessageId);
  if (found) {
    setPinnedMessage(found);
  }
}, [pinnedMessageId, messages]);
```

Add pin handler:
```typescript
const handlePin = useCallback(async (messageId: string) => {
  if (!userNpub) return;
  await ClubChatService.pinMessage(clubId, messageId, userNpub);
}, [clubId, userNpub]);

const handleUnpin = useCallback(async () => {
  if (!userNpub) return;
  await ClubChatService.unpinMessage(clubId, userNpub);
  setPinnedMessage(null);
}, [clubId, userNpub]);
```

Render the banner above the chat container (after the header row, before the messages list):
```tsx
{pinnedMessage && (
  <PinnedMessageBanner
    content={pinnedMessage.content}
    senderName={getProfileForNpub(pinnedMessage.sender_npub)?.display_name || pinnedMessage.sender_npub.slice(0, 12) + '...'}
    onUnpin={isCaptain ? handleUnpin : undefined}
  />
)}
```

Pass `onPin` to `ChatMessageBubble` in the `renderMessage` function (captain only):
```typescript
onPin={isCaptain ? () => handlePin(item.id) : undefined}
```

Import PinnedMessageBanner and ClubChatService at the top.

**Step 2: Pass pinnedMessageId from ClubPageScreen**

In `src/screens/ClubPageScreen.tsx`, pass the field from the club object:
```tsx
<ClubChatSection
  clubId={clubId}
  clubName={displayName}
  captainNpub={club.created_by_npub || ''}
  isMember={isMember}
  pinnedMessageId={club.pinned_message_id}
/>
```

**Step 3: Do the same for ClubChatScreen**

Add `pinnedMessageId` as an optional route param and implement the same pinned message logic. The full-screen chat receives it via route params. Update the route params in App.tsx:
```typescript
ClubChat: { clubId: string; clubName: string; captainNpub: string; pinnedMessageId?: string };
```

**Step 4: Run typecheck**

Run: `npm run typecheck`

**Step 5: Commit**

```bash
git add src/components/club/ClubChatSection.tsx src/screens/ClubChatScreen.tsx src/screens/ClubPageScreen.tsx src/App.tsx
git commit -m "Feature: Wire pinned message into chat UI"
```

---

## Task 7: Add ChallengeWizardModal component

**Files:**
- Create: `src/components/club/ChallengeWizardModal.tsx`

**Step 1: Create the 3-step wizard modal**

This is a Modal with 3 steps: Type → Duration → Confirm.

```tsx
/**
 * ChallengeWizardModal - 3-step wizard to create a 1v1 challenge
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

export type ChallengeType = 'fastest_5k' | 'fastest_10k' | 'daily_streak' | 'most_distance' | 'most_steps';
type DurationDays = 1 | 3 | 7;

const CHALLENGE_TYPES: { key: ChallengeType; label: string; icon: string; description: string }[] = [
  { key: 'fastest_5k', label: 'Fastest 5K', icon: 'speedometer-outline', description: 'Who runs a faster 5K' },
  { key: 'fastest_10k', label: 'Fastest 10K', icon: 'speedometer-outline', description: 'Who runs a faster 10K' },
  { key: 'daily_streak', label: 'Daily Streak', icon: 'flame-outline', description: 'Most workout days' },
  { key: 'most_distance', label: 'Most Distance', icon: 'map-outline', description: 'Who covers more ground' },
  { key: 'most_steps', label: 'Most Steps', icon: 'footsteps-outline', description: 'Who takes more steps' },
];

const DURATIONS: { days: DurationDays; label: string }[] = [
  { days: 1, label: '24 Hours' },
  { days: 3, label: '3 Days' },
  { days: 7, label: '1 Week' },
];

interface ChallengeWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (type: ChallengeType, durationDays: DurationDays) => void;
  opponentName: string;
}

export const ChallengeWizardModal: React.FC<ChallengeWizardModalProps> = ({
  visible,
  onClose,
  onSend,
  opponentName,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<ChallengeType | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationDays | null>(null);

  const handleClose = useCallback(() => {
    setStep(1);
    setSelectedType(null);
    setSelectedDuration(null);
    onClose();
  }, [onClose]);

  const handleSelectType = useCallback((type: ChallengeType) => {
    setSelectedType(type);
    setStep(2);
  }, []);

  const handleSelectDuration = useCallback((days: DurationDays) => {
    setSelectedDuration(days);
    setStep(3);
  }, []);

  const handleSend = useCallback(() => {
    if (!selectedType || !selectedDuration) return;
    onSend(selectedType, selectedDuration);
    handleClose();
  }, [selectedType, selectedDuration, onSend, handleClose]);

  const typeLabel = CHALLENGE_TYPES.find((t) => t.key === selectedType)?.label || '';
  const durationLabel = DURATIONS.find((d) => d.days === selectedDuration)?.label || '';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {step === 1 ? 'Challenge Type' : step === 2 ? 'Duration' : 'Confirm'}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Step 1: Type */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.subtitle}>Challenge {opponentName} to...</Text>
              {CHALLENGE_TYPES.map((ct) => (
                <TouchableOpacity
                  key={ct.key}
                  style={styles.optionRow}
                  onPress={() => handleSelectType(ct.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={ct.icon as any} size={22} color={theme.colors.accent} />
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>{ct.label}</Text>
                    <Text style={styles.optionDesc}>{ct.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textDark} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Step 2: Duration */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
                <Ionicons name="chevron-back" size={18} color={theme.colors.textMuted} />
                <Text style={styles.backText}>{typeLabel}</Text>
              </TouchableOpacity>
              <Text style={styles.subtitle}>How long?</Text>
              {DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d.days}
                  style={styles.optionRow}
                  onPress={() => handleSelectDuration(d.days)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={22} color={theme.colors.accent} />
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>{d.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textDark} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <TouchableOpacity onPress={() => setStep(2)} style={styles.backButton}>
                <Ionicons name="chevron-back" size={18} color={theme.colors.textMuted} />
                <Text style={styles.backText}>{durationLabel}</Text>
              </TouchableOpacity>
              <View style={styles.confirmCard}>
                <Ionicons name="flash-outline" size={32} color={theme.colors.accent} />
                <Text style={styles.confirmTitle}>{typeLabel}</Text>
                <Text style={styles.confirmDetail}>vs {opponentName}</Text>
                <Text style={styles.confirmDetail}>{durationLabel}</Text>
              </View>
              <TouchableOpacity style={styles.sendButton} onPress={handleSend} activeOpacity={0.7}>
                <Ionicons name="send" size={18} color={theme.colors.text} />
                <Text style={styles.sendButtonText}>Send Challenge</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  stepContent: {
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  optionDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  confirmCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  confirmDetail: {
    fontSize: 15,
    color: theme.colors.textMuted,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
});

export default ChallengeWizardModal;
```

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add src/components/club/ChallengeWizardModal.tsx
git commit -m "Feature: Add ChallengeWizardModal component"
```

---

## Task 8: Add challenge card rendering to ChatMessageBubble

**Files:**
- Modify: `src/components/club/ChatMessageBubble.tsx`

**Step 1: Add challenge card rendering**

Import ChallengeMessageMetadata:
```typescript
import type { ClubMessage, ReplyContext, ChallengeMessageMetadata } from '../../types/club';
```

Add a helper to get challenge type label:
```typescript
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
```

Add new props for challenge accept/decline:
```typescript
onAcceptChallenge?: () => void;
onDeclineChallenge?: () => void;
```

Inside the component, detect challenge messages and render a card. After the workout card rendering block, add:
```typescript
const isChallenge = message.message_type === 'challenge';
const challengeMeta = isChallenge ? (message.metadata as ChallengeMessageMetadata) : null;
const isChallenged = isChallenge && challengeMeta?.challenged_npub === userNpub;
const challengeIsPending = challengeMeta?.challenge_status === 'pending';
```

In the render, replace the message body section to also handle challenges:
```tsx
{/* Message body — workout card, challenge card, or text */}
{isWorkout && message.metadata ? (
  // ... existing workout card ...
) : isChallenge && challengeMeta ? (
  <View style={styles.challengeCard}>
    <View style={styles.challengeRow}>
      <Ionicons name="flash-outline" size={16} color={theme.colors.accent} />
      <Text style={styles.challengeType}>{getChallengeLabel(challengeMeta.challenge_type)}</Text>
      <Text style={styles.challengeDuration}>{getDurationLabel(challengeMeta.duration_days)}</Text>
    </View>
    <Text style={styles.messageText}>{message.content}</Text>
    {isChallenged && challengeIsPending && (
      <View style={styles.challengeActions}>
        <TouchableOpacity style={styles.acceptButton} onPress={onAcceptChallenge} activeOpacity={0.7}>
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={onDeclineChallenge} activeOpacity={0.7}>
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
      </View>
    )}
    {challengeMeta.challenge_status === 'active' && (
      <Text style={styles.challengeStatus}>Challenge Active</Text>
    )}
    {challengeMeta.challenge_status === 'completed' && challengeMeta.winner_npub && (
      <Text style={styles.challengeStatus}>
        Winner: {challengeMeta.winner_npub === userNpub ? 'You!' : displayName}
      </Text>
    )}
    {challengeMeta.challenge_status === 'declined' && (
      <Text style={styles.challengeStatusDeclined}>Declined</Text>
    )}
  </View>
) : (
  <Text style={styles.messageText}>{message.content}</Text>
)}
```

Add styles:
```typescript
// Challenge card
challengeCard: {
  marginTop: 2,
},
challengeRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  marginBottom: 4,
},
challengeType: {
  fontSize: 13,
  fontWeight: theme.typography.weights.semiBold,
  color: theme.colors.accent,
  flex: 1,
},
challengeDuration: {
  fontSize: 11,
  color: theme.colors.textDark,
},
challengeActions: {
  flexDirection: 'row',
  gap: 8,
  marginTop: 8,
},
acceptButton: {
  flex: 1,
  alignItems: 'center',
  paddingVertical: 8,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: theme.colors.accent,
},
acceptText: {
  fontSize: 14,
  fontWeight: theme.typography.weights.semiBold,
  color: theme.colors.accent,
},
declineButton: {
  flex: 1,
  alignItems: 'center',
  paddingVertical: 8,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: theme.colors.border,
},
declineText: {
  fontSize: 14,
  color: theme.colors.textMuted,
},
challengeStatus: {
  fontSize: 12,
  fontWeight: theme.typography.weights.semiBold,
  color: theme.colors.accent,
  marginTop: 6,
},
challengeStatusDeclined: {
  fontSize: 12,
  color: theme.colors.textDark,
  marginTop: 6,
},
```

Also add a challenge-specific container style alongside announcement and own:
```typescript
const isChallenge = message.message_type === 'challenge';
// In the Pressable style array:
isChallenge && styles.challengeContainer,
```

```typescript
challengeContainer: {
  borderLeftWidth: 3,
  borderLeftColor: '#FFD700',
},
```

**Note:** This file will approach 500 lines. If it exceeds, extract the challenge card into a separate `ChallengeMessageCard` component.

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add src/components/club/ChatMessageBubble.tsx
git commit -m "Feature: Add challenge card rendering to ChatMessageBubble"
```

---

## Task 9: Wire challenge flow into ClubChatSection

**Files:**
- Modify: `src/components/club/ClubChatSection.tsx`

**Step 1: Add challenge wizard state and handlers**

Import the wizard and types:
```typescript
import { ChallengeWizardModal } from './ChallengeWizardModal';
import type { ChallengeType } from './ChallengeWizardModal';
import type { ChallengeMessageMetadata } from '../../types/club';
```

Add state:
```typescript
const [challengeTarget, setChallengeTarget] = useState<ClubMessage | null>(null);
```

Add handlers:
```typescript
const handleChallenge = useCallback((item: ClubMessage) => {
  setChallengeTarget(item);
}, []);

const handleSendChallenge = useCallback(async (type: ChallengeType, durationDays: 1 | 3 | 7) => {
  if (!challengeTarget || !userNpub) return;

  const challengedNpub = challengeTarget.sender_npub;
  const challengedName = getProfileForNpub(challengedNpub)?.display_name || challengedNpub.slice(0, 12) + '...';
  const typeLabels: Record<string, string> = {
    fastest_5k: 'Fastest 5K', fastest_10k: 'Fastest 10K',
    daily_streak: 'Daily Streak', most_distance: 'Most Distance', most_steps: 'Most Steps',
  };
  const durLabels: Record<number, string> = { 1: '24 hours', 3: '3 days', 7: '1 week' };

  const content = `challenged ${challengedName} to ${typeLabels[type]} for ${durLabels[durationDays]}!`;

  const metadata: ChallengeMessageMetadata = {
    competition_id: '', // Will be set by server in future, placeholder for now
    challenge_type: type,
    duration_days: durationDays,
    challenged_npub: challengedNpub,
    challenger_npub: userNpub,
    challenge_status: 'pending',
  };

  await sendMessage(content, {
    messageType: 'challenge',
    metadata: metadata as any,
  });

  setChallengeTarget(null);
}, [challengeTarget, userNpub, sendMessage, getProfileForNpub]);
```

Pass `onChallenge` to `ChatMessageBubble` in renderMessage:
```typescript
onChallenge={!isOwnMessage ? () => handleChallenge(item) : undefined}
```

Render the wizard modal at the end of the component:
```tsx
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
```

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add src/components/club/ClubChatSection.tsx
git commit -m "Feature: Wire challenge wizard into ClubChatSection"
```

---

## Task 10: Wire challenge flow into ClubChatScreen (full-screen)

**Files:**
- Modify: `src/screens/ClubChatScreen.tsx`

**Step 1: Replicate the challenge wizard integration from ClubChatSection**

Same pattern as Task 9 but in the full-screen chat. Add the same imports, state, handlers, `onChallenge` prop to renderMessage, and wizard modal rendering.

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add src/screens/ClubChatScreen.tsx
git commit -m "Feature: Wire challenge wizard into ClubChatScreen"
```

---

## Verification

1. `npm run typecheck` — must pass after each task
2. Apply SQL migrations in Supabase dashboard
3. Deploy edge function: `supabase functions deploy manage-club-chat`
4. Manual test: captain long-presses message → "Pin" → pinned banner appears at top of chat
5. Manual test: captain taps "x" on pinned banner → unpins
6. Manual test: long-press another user's message → "Challenge" → wizard opens
7. Manual test: complete wizard → challenge card appears in chat with Accept/Decline
8. Manual test: challenged user taps Accept → status changes to "Challenge Active"
9. Manual test: expand to full-screen chat → pinned message and challenge cards render correctly
