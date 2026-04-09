# Challenge Mini Leaderboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a live 2-person mini leaderboard inside active (and completed) challenge chat cards so participants can see who's winning.

**Architecture:** Add `getChallengeScores()` to ChallengeService (Supabase query, 30s cache). Extract the challenge card into its own component to stay under the 500-line limit. Render a 2-row leaderboard inside the card. Wire scores through from parent chat components.

**Tech Stack:** React Native, TypeScript, Supabase client SDK, existing ChallengeService pattern.

---

## Context

**500-line budget is critical.** These files are near the limit:
- `ChatMessageBubble.tsx`: 481 lines (19 remaining)
- `ClubChatSection.tsx`: 489 lines (11 remaining)
- `ClubChatScreen.tsx`: 478 lines (22 remaining)
- `ChallengeService.ts`: 171 lines (329 remaining)

Task 2 extracts the challenge card into its own file, freeing ~70 lines from ChatMessageBubble to keep everything under 500.

**Scoring data already exists** in `workout_submissions` table: `time_5k_seconds`, `time_10k_seconds`, `distance_meters`, `step_count`, `profile_name`. No new tables or migrations needed.

**Two parent components render challenge cards** identically: `ClubChatSection.tsx` (embedded chat) and `ClubChatScreen.tsx` (full-screen chat). Both must be updated.

---

### Task 1: Add getChallengeScores to ChallengeService

**Files:**
- Modify: `src/services/challenge/ChallengeService.ts`

**What this does:** Adds a new method that queries `workout_submissions` for both participants' scores during the challenge period, aggregates per scoring method, and caches for 30 seconds.

**Step 1: Extend ChallengeStatus interface**

Add `activity_type` and `scoring_method` fields so score fetching can use them without a separate query. In `src/services/challenge/ChallengeService.ts`, add two fields to the `ChallengeStatus` interface (after line 17):

```typescript
export interface ChallengeStatus {
  challenge_status: 'pending' | 'declined' | 'active' | 'completed';
  challenger_npub: string;
  challenged_npub: string;
  challenge_type: string;
  duration_days: number;
  winner_npub?: string | null;
  start_date?: string;
  end_date?: string;
  activity_type?: string;      // ADD
  scoring_method?: string;     // ADD
}
```

Update the `getChallengeStatus` select query (line 123) to include these columns:

```typescript
.select('config, start_date, end_date, activity_type, scoring_method')
```

And populate them in the status object (after line 141):

```typescript
activity_type: data.activity_type,
scoring_method: data.scoring_method,
```

**Step 2: Add ChallengeScores types and score cache**

After the existing `statusCache` declaration (line 26), add:

```typescript
export interface ChallengeScoreEntry {
  npub: string;
  profileName?: string;
  value: number | null; // null = no qualifying workout yet
}

export interface ChallengeScores {
  challengeType: string;
  entries: ChallengeScoreEntry[];
}

const scoresCache = new Map<string, { scores: ChallengeScores; fetchedAt: number }>();
```

**Step 3: Add getChallengeScores method**

Add this method to the `ChallengeService` class (before `clearCache` at line 167):

```typescript
  /**
   * Fetch live scores for both challenge participants.
   * Queries workout_submissions and aggregates per scoring method. Cached 30s.
   */
  static async getChallengeScores(
    competitionId: string,
    status: ChallengeStatus,
  ): Promise<ChallengeScores | null> {
    if (!status.start_date || !status.end_date || !status.activity_type || !status.scoring_method) return null;
    if (status.challenge_status !== 'active' && status.challenge_status !== 'completed') return null;

    const cached = scoresCache.get(competitionId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.scores;

    const npubs = [status.challenger_npub, status.challenged_npub];
    const { data: rows, error } = await supabase
      .from('workout_submissions')
      .select('npub, profile_name, distance_meters, duration_seconds, time_5k_seconds, time_10k_seconds, step_count')
      .in('npub', npubs)
      .eq('activity_type', status.activity_type)
      .gte('created_at', status.start_date)
      .lte('created_at', status.end_date);

    if (error || !rows) {
      console.warn('[ChallengeService] getChallengeScores error:', error?.message);
      return null;
    }

    const entries: ChallengeScoreEntry[] = npubs.map((npub) => {
      const myRows = rows.filter((r: any) => r.npub === npub);
      const profileName = myRows[0]?.profile_name || undefined;
      let value: number | null = null;

      if (status.scoring_method === 'fastest_time') {
        const col = status.challenge_type === 'fastest_5k' ? 'time_5k_seconds' : 'time_10k_seconds';
        const times = myRows.map((r: any) => r[col]).filter((t: any) => t != null && t > 0);
        value = times.length > 0 ? Math.min(...times) : null;
      } else if (status.scoring_method === 'total_distance') {
        const sum = myRows.reduce((acc: number, r: any) => acc + (r.distance_meters || 0), 0);
        value = sum > 0 ? sum : null;
      } else if (status.scoring_method === 'workout_count') {
        value = myRows.length > 0 ? myRows.length : null;
      } else if (status.scoring_method === 'total_steps') {
        const sum = myRows.reduce((acc: number, r: any) => acc + (r.step_count || 0), 0);
        value = sum > 0 ? sum : null;
      }

      return { npub, profileName, value };
    });

    const scores: ChallengeScores = { challengeType: status.challenge_type, entries };
    scoresCache.set(competitionId, { scores, fetchedAt: Date.now() });
    return scores;
  }
```

**Step 4: Update clearCache to also clear scores**

```typescript
static clearCache(): void {
  statusCache.clear();
  scoresCache.clear();
}
```

**Step 5: Verify and commit**

Run: `npm run typecheck`
Expected: No new errors (pre-existing errors are OK).

```bash
git add src/services/challenge/ChallengeService.ts
git commit -m "Feature: Add getChallengeScores to ChallengeService"
```

---

### Task 2: Extract ChallengeCard from ChatMessageBubble

**Files:**
- Create: `src/components/club/ChallengeCard.tsx`
- Modify: `src/components/club/ChatMessageBubble.tsx`

**What this does:** Moves the challenge card JSX, helper functions, and styles out of the 481-line ChatMessageBubble into a dedicated ChallengeCard component. This frees ~70 lines for the mini leaderboard to be added in Task 3.

**Step 1: Create ChallengeCard.tsx**

Create `src/components/club/ChallengeCard.tsx` with the extracted challenge logic:

```typescript
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
        Challenge Active{endDate ? ` — ${formatTimeRemaining(endDate)}` : ''}
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
```

**Step 2: Update ChatMessageBubble to use ChallengeCard**

In `src/components/club/ChatMessageBubble.tsx`:

1. Add import at top (after existing imports, around line 9):
   ```typescript
   import { ChallengeCard } from './ChallengeCard';
   ```

2. Remove these functions (lines 14-41): `isChallengeMetadata`, `getChallengeLabel`, `getDurationLabel`, `formatTimeRemaining`. Keep `isChallengeMetadata` — it's still needed for type narrowing. Remove the other three.

3. Remove the `winnerName` prop from `ChatMessageBubbleProps` (line 75). It moves to ChallengeCard.

4. Remove `winnerName` from destructured props (line 142).

5. Replace the challenge card JSX block (lines 335-378) with:
   ```typescript
          ) : isChallenge && challengeMeta ? (
            <ChallengeCard
              challengeMeta={challengeMeta}
              content={message.content}
              liveStatus={liveStatus}
              liveWinner={liveWinner}
              isChallenged={isChallenged}
              challengeIsPending={challengeIsPending}
              userNpub={userNpub}
              winnerName={winnerName}
              endDate={liveChallengeStatus?.end_date}
              onAcceptChallenge={onAcceptChallenge}
              onDeclineChallenge={onDeclineChallenge}
            />
          ) : (
   ```

   Wait — `winnerName` was removed from props. It needs to stay so the parent can pass it through. **Keep `winnerName` in ChatMessageBubbleProps** and pass it through to ChallengeCard.

6. Remove challenge-specific styles from the `styles` object (lines 460-469): `challengeCard`, `challengeInfoRow`, `challengeType`, `challengeDuration`, `challengeActions`, `acceptButton`, `acceptButtonText`, `declineButton`, `declineButtonText`, `challengeStatusText`. Keep `challengeContainer` (it's on the outer bubble wrapper).

**Net result:** ChatMessageBubble drops from ~481 to ~400 lines. ChallengeCard starts at ~105 lines.

**Step 3: Verify and commit**

Run: `npm run typecheck`
Expected: No new errors.

```bash
git add src/components/club/ChallengeCard.tsx src/components/club/ChatMessageBubble.tsx
git commit -m "Refactor: Extract ChallengeCard from ChatMessageBubble"
```

---

### Task 3: Add mini leaderboard to ChallengeCard

**Files:**
- Modify: `src/components/club/ChallengeCard.tsx`

**What this does:** Adds a `challengeScores` prop and renders a compact 2-row leaderboard inside active and completed challenge cards.

**Step 1: Add score formatting helpers**

Add these helpers after the existing helper functions (after `formatTimeRemaining`):

```typescript
function formatScore(value: number | null, challengeType: string): string {
  if (value == null) return '--';
  if (challengeType === 'fastest_5k' || challengeType === 'fastest_10k') {
    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  if (challengeType === 'most_distance') {
    return `${(value / 1000).toFixed(1)} km`;
  }
  if (challengeType === 'most_steps') {
    return value.toLocaleString() + ' steps';
  }
  if (challengeType === 'daily_streak') {
    return value === 1 ? '1 workout' : `${value} workouts`;
  }
  return String(value);
}

function isLowerBetter(challengeType: string): boolean {
  return challengeType === 'fastest_5k' || challengeType === 'fastest_10k';
}
```

**Step 2: Add ChallengeScores import and prop**

Add to the imports at top:
```typescript
import type { ChallengeScoreEntry } from '../../services/challenge/ChallengeService';
```

Add to `ChallengeCardProps`:
```typescript
  challengeScores?: { challengeType: string; entries: ChallengeScoreEntry[] } | null;
```

Add to the destructured props:
```typescript
  challengeScores,
```

**Step 3: Add mini leaderboard rendering**

Insert this block inside the `ChallengeCard` JSX, between the `<Text style={styles.messageText}>` line and the accept/decline buttons block:

```typescript
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
```

**Step 4: Add mini leaderboard styles**

Add to the `styles` object:

```typescript
  miniLeaderboard: { marginTop: 8, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  scoreName: { fontSize: 13, color: theme.colors.textMuted },
  scoreNameYou: { color: theme.colors.text, fontWeight: theme.typography.weights.semiBold },
  scoreValue: { fontSize: 13, color: theme.colors.textMuted, fontFamily: 'monospace' },
  scoreValueYou: { color: theme.colors.accent, fontWeight: theme.typography.weights.semiBold },
```

**Step 5: Verify and commit**

Run: `npm run typecheck`
Expected: No new errors.

```bash
git add src/components/club/ChallengeCard.tsx
git commit -m "Feature: Add mini leaderboard to challenge cards"
```

---

### Task 4: Wire scores into ClubChatSection and ClubChatScreen

**Files:**
- Modify: `src/components/club/ClubChatSection.tsx`
- Modify: `src/screens/ClubChatScreen.tsx`

**What this does:** Fetches challenge scores alongside statuses in the existing useEffect, stores them in state, and passes them through to ChallengeCard via ChatMessageBubble.

**Both files get identical changes.** Apply each change to both files.

**Step 1: Add ChallengeScores import**

In both files, update the ChallengeService import to also import `ChallengeScores`:

```typescript
import { ChallengeService, ChallengeStatus, ChallengeScores } from '../../services/challenge/ChallengeService';
// (ClubChatScreen uses ../services/... instead of ../../services/...)
```

**Step 2: Add challengeScoresMap state**

After the existing `challengeStatuses` state declaration, add:

```typescript
const [challengeScoresMap, setChallengeScoresMap] = useState<Map<string, ChallengeScores>>(new Map());
```

**Step 3: Fetch scores alongside statuses**

In the existing `fetchStatuses` async function (inside the useEffect), after building `newStatuses`, add score fetching. Replace the current useEffect block with:

```typescript
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
```

**Step 4: Pass challengeScores to ChatMessageBubble**

In the `renderMessage` callback, add score lookup and pass it as a prop. After the `resolvedWinnerName` line, add:

```typescript
    const challengeScores = isChMsg ? challengeScoresMap.get(compId) || null : null;
```

Add to the `<ChatMessageBubble>` props:

```typescript
        challengeScores={challengeScores}
```

**Step 5: Add challengeScores prop to ChatMessageBubble**

In `src/components/club/ChatMessageBubble.tsx`, add to `ChatMessageBubbleProps`:

```typescript
  challengeScores?: { challengeType: string; entries: import('../../services/challenge/ChallengeService').ChallengeScoreEntry[] } | null;
```

Actually, simpler — import the type and use it:

Add to imports:
```typescript
import type { ChallengeScoreEntry } from '../../services/challenge/ChallengeService';
```

Add to `ChatMessageBubbleProps`:
```typescript
  challengeScores?: { challengeType: string; entries: ChallengeScoreEntry[] } | null;
```

Add `challengeScores` to the destructured props. Pass it to `<ChallengeCard>`:

```typescript
            <ChallengeCard
              challengeMeta={challengeMeta}
              content={message.content}
              liveStatus={liveStatus}
              liveWinner={liveWinner}
              isChallenged={isChallenged}
              challengeIsPending={challengeIsPending}
              userNpub={userNpub}
              winnerName={winnerName}
              endDate={liveChallengeStatus?.end_date}
              onAcceptChallenge={onAcceptChallenge}
              onDeclineChallenge={onDeclineChallenge}
              challengeScores={challengeScores}
            />
```

**Step 6: Update renderMessage dependency arrays**

In both `ClubChatSection.tsx` and `ClubChatScreen.tsx`, add `challengeScoresMap` to the `renderMessage` useCallback dependency array.

**Step 7: Verify and commit**

Run: `npm run typecheck`
Expected: No new errors.

Check file sizes: all must be under 500 lines.
```bash
wc -l src/components/club/ChatMessageBubble.tsx src/components/club/ClubChatSection.tsx src/screens/ClubChatScreen.tsx src/components/club/ChallengeCard.tsx src/services/challenge/ChallengeService.ts
```

```bash
git add src/components/club/ChatMessageBubble.tsx src/components/club/ClubChatSection.tsx src/screens/ClubChatScreen.tsx src/components/club/ChallengeCard.tsx src/services/challenge/ChallengeService.ts
git commit -m "Feature: Wire challenge scores into chat mini leaderboard"
```

---

## File Summary

| File | Change | Est. Lines |
|------|--------|-----------|
| `src/services/challenge/ChallengeService.ts` | Add getChallengeScores, extend ChallengeStatus | ~240 (from 171) |
| `src/components/club/ChallengeCard.tsx` | **New** — extracted challenge card + mini leaderboard | ~160 |
| `src/components/club/ChatMessageBubble.tsx` | Remove challenge internals, use ChallengeCard | ~400 (from 481) |
| `src/components/club/ClubChatSection.tsx` | Fetch scores, pass prop | ~495 (from 489) |
| `src/screens/ClubChatScreen.tsx` | Fetch scores, pass prop | ~485 (from 478) |

All files stay under the 500-line limit.

## Verification

1. `npm run typecheck` — must pass (no new errors)
2. Manual test: Send a challenge in club chat → accept → complete a workout → reopen chat → verify mini leaderboard shows your score
3. Manual test: Active challenge with no workouts yet → verify both rows show "--"
4. Manual test: Fastest 5K challenge → verify time format (MM:SS), faster person on top
5. Manual test: Most Distance challenge → verify km format, higher on top
6. Manual test: Completed challenge → verify trophy emoji on winner row
