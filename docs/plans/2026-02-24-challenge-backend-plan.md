# 1v1 Challenge Backend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the existing challenge UI to the competitions infrastructure so challenges actually create competitions, accept/decline works, workouts count, and winners are determined.

**Architecture:** Challenges are 2-person competitions (template: 'challenge') in the existing `competitions` table. New actions on the `manage-competition` edge function handle create/accept/decline/complete. A client-side `ChallengeService` wraps these calls. Chat components fetch live challenge status from the competition record (30s cache) and pass it to ChatMessageBubble.

**Tech Stack:** Supabase Edge Functions (Deno), React Native, TypeScript, `callEdgeFunction` utility

---

## Task 1: Fix types and colors

**Files:**
- Modify: `src/services/backend/ClubChatService.ts`
- Modify: `src/components/club/ChatMessageBubble.tsx`

**Step 1: Fix SendMessageOptions metadata type**

In `src/services/backend/ClubChatService.ts`, update the import and interface:

```typescript
// Line 16: Update import
import type { ClubMessage, ClubMessageType, WorkoutMessageMetadata, ChallengeMessageMetadata } from '../../types/club';

// Lines 36-40: Update interface
export interface SendMessageOptions {
  replyToId?: string;
  messageType?: ClubMessageType;
  metadata?: WorkoutMessageMetadata | ChallengeMessageMetadata;
}
```

**Step 2: Replace #FFD700 with theme.colors.accent in ChatMessageBubble**

In `src/components/club/ChatMessageBubble.tsx`, replace every occurrence of `'#FFD700'` with `theme.colors.accent`:

- Line 282: `color: '#FFD700'` → `color: theme.colors.accent`
- Line 283: `{ color: '#FFD700' }` → `{ color: theme.colors.accent }`
- Line 318: `color: '#FFD700'` → `color: theme.colors.accent`
- Line 418: `borderLeftColor: '#FFD700'` → `borderLeftColor: theme.colors.accent`
- Line 440: `color: '#FFD700'` → `color: theme.colors.accent`

**Step 3: Run typecheck**

Run: `npm run typecheck`

**Step 4: Commit**

```bash
git add src/services/backend/ClubChatService.ts src/components/club/ChatMessageBubble.tsx
git commit -m "Fix: Challenge metadata type and replace gold with theme accent"
```

---

## Task 2: Add challenge actions to manage-competition edge function

**Files:**
- Modify: `supabase/functions/manage-competition/index.ts`

**Step 1: Add challenge handler functions**

Add these 3 functions after `handleAutoJoinMembers` (before the Main Handler section):

```typescript
// =============================================
// Challenge Actions
// =============================================

const CHALLENGE_SCORING: Record<string, { scoring_method: string; activity_type: string; config_extras?: Record<string, unknown> }> = {
  fastest_5k: { scoring_method: 'fastest_time', activity_type: 'running', config_extras: { target_distance_km: 5, distance_tolerance_km: 0.5 } },
  fastest_10k: { scoring_method: 'fastest_time', activity_type: 'running', config_extras: { target_distance_km: 10, distance_tolerance_km: 1.0 } },
  daily_streak: { scoring_method: 'workout_count', activity_type: 'running' },
  most_distance: { scoring_method: 'total_distance', activity_type: 'running' },
  most_steps: { scoring_method: 'total_steps', activity_type: 'walking' },
}

async function handleCreateChallenge(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { npub, challenged_npub, challenge_type, duration_days, club_id, name: profileName, picture: profilePicture } = params as {
    npub?: string
    challenged_npub?: string
    challenge_type?: string
    duration_days?: number
    club_id?: string
    name?: string
    picture?: string
  }

  if (!npub || !challenged_npub || !challenge_type || !duration_days) {
    return errorResponse('Missing required fields: npub, challenged_npub, challenge_type, duration_days')
  }

  if (npub === challenged_npub) {
    return errorResponse('Cannot challenge yourself')
  }

  const scoring = CHALLENGE_SCORING[challenge_type]
  if (!scoring) {
    return errorResponse(`Invalid challenge_type: ${challenge_type}`)
  }

  if (![1, 3, 7].includes(duration_days)) {
    return errorResponse('duration_days must be 1, 3, or 7')
  }

  // Far-future start_date (set properly on accept)
  const farFuture = new Date('2099-01-01T00:00:00Z').toISOString()

  const config = {
    challenger_npub: npub,
    challenged_npub,
    challenge_type,
    challenge_status: 'pending',
    duration_days,
    ...(scoring.config_extras || {}),
  }

  const external_id = `challenge-${randomHex(8)}`

  const { data: comp, error: insertErr } = await supabase
    .from('competitions')
    .insert({
      created_by_npub: npub,
      name: `Challenge: ${challenge_type}`,
      activity_type: scoring.activity_type,
      scoring_method: scoring.scoring_method,
      start_date: farFuture,
      end_date: farFuture,
      template: 'challenge',
      club_id: club_id || null,
      config,
      is_open: false,
      prize_pool_sats: 0,
      external_id,
    })
    .select('id, external_id')
    .single()

  if (insertErr) {
    console.error('Create challenge error:', insertErr)
    return errorResponse(insertErr.message, 500)
  }

  // Auto-join challenger
  await supabase
    .from('competition_participants')
    .upsert(
      { competition_id: comp.id, npub, name: profileName || null, picture: profilePicture || null },
      { onConflict: 'competition_id,npub' },
    )

  console.log(`Challenge created: ${comp.id} by ${npub.slice(0, 12)}... vs ${challenged_npub.slice(0, 12)}...`)
  return jsonResponse({ success: true, data: { id: comp.id, external_id: comp.external_id } })
}

async function handleAcceptChallenge(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id, npub, name: profileName, picture: profilePicture } = params as {
    competition_id?: string
    npub?: string
    name?: string
    picture?: string
  }

  if (!competition_id || !npub) {
    return errorResponse('Missing required fields: competition_id, npub')
  }

  // Fetch competition and verify challenge
  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('id, config, template')
    .eq('id', competition_id)
    .single()

  if (compErr || !comp) {
    return errorResponse('Competition not found', 404)
  }
  if (comp.template !== 'challenge') {
    return errorResponse('Not a challenge competition', 400)
  }

  const config = comp.config as Record<string, unknown>
  if (config.challenged_npub !== npub) {
    return errorResponse('You are not the challenged user', 403)
  }
  if (config.challenge_status !== 'pending') {
    return errorResponse(`Challenge is already ${config.challenge_status}`, 400)
  }

  // Set dates
  const now = new Date()
  const endDate = new Date(now.getTime() + (config.duration_days as number) * 24 * 60 * 60 * 1000)

  const updatedConfig = { ...config, challenge_status: 'active' }

  const { error: updateErr } = await supabase
    .from('competitions')
    .update({
      config: updatedConfig,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
    })
    .eq('id', competition_id)

  if (updateErr) {
    console.error('Accept challenge error:', updateErr)
    return errorResponse(updateErr.message, 500)
  }

  // Join challenged user as participant
  await supabase
    .from('competition_participants')
    .upsert(
      { competition_id, npub, name: profileName || null, picture: profilePicture || null },
      { onConflict: 'competition_id,npub' },
    )

  console.log(`Challenge accepted: ${competition_id} by ${npub.slice(0, 12)}...`)
  return jsonResponse({ success: true, data: { challenge_status: 'active', start_date: now.toISOString(), end_date: endDate.toISOString() } })
}

async function handleDeclineChallenge(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id, npub } = params as {
    competition_id?: string
    npub?: string
  }

  if (!competition_id || !npub) {
    return errorResponse('Missing required fields: competition_id, npub')
  }

  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('id, config, template')
    .eq('id', competition_id)
    .single()

  if (compErr || !comp) {
    return errorResponse('Competition not found', 404)
  }
  if (comp.template !== 'challenge') {
    return errorResponse('Not a challenge competition', 400)
  }

  const config = comp.config as Record<string, unknown>
  if (config.challenged_npub !== npub) {
    return errorResponse('You are not the challenged user', 403)
  }
  if (config.challenge_status !== 'pending') {
    return errorResponse(`Challenge is already ${config.challenge_status}`, 400)
  }

  const updatedConfig = { ...config, challenge_status: 'declined' }

  const { error: updateErr } = await supabase
    .from('competitions')
    .update({ config: updatedConfig })
    .eq('id', competition_id)

  if (updateErr) {
    console.error('Decline challenge error:', updateErr)
    return errorResponse(updateErr.message, 500)
  }

  console.log(`Challenge declined: ${competition_id} by ${npub.slice(0, 12)}...`)
  return jsonResponse({ success: true, data: { challenge_status: 'declined' } })
}

async function handleCompleteChallenge(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
): Promise<Response> {
  const { competition_id } = params as { competition_id?: string }

  if (!competition_id) {
    return errorResponse('Missing required field: competition_id')
  }

  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('id, config, template, end_date, scoring_method')
    .eq('id', competition_id)
    .single()

  if (compErr || !comp) {
    return errorResponse('Competition not found', 404)
  }
  if (comp.template !== 'challenge') {
    return errorResponse('Not a challenge competition', 400)
  }

  const config = comp.config as Record<string, unknown>
  if (config.challenge_status !== 'active') {
    return errorResponse(`Challenge is not active (status: ${config.challenge_status})`, 400)
  }

  // Check if challenge has ended
  const now = new Date()
  const endDate = new Date(comp.end_date)
  if (now < endDate) {
    return errorResponse('Challenge has not ended yet', 400)
  }

  // Get participants
  const { data: participants } = await supabase
    .from('competition_participants')
    .select('npub')
    .eq('competition_id', competition_id)

  if (!participants || participants.length < 2) {
    // Not enough participants, mark completed with no winner
    const updatedConfig = { ...config, challenge_status: 'completed', winner_npub: null }
    await supabase.from('competitions').update({ config: updatedConfig }).eq('id', competition_id)
    return jsonResponse({ success: true, data: { challenge_status: 'completed', winner_npub: null } })
  }

  const npubs = participants.map((p: { npub: string }) => p.npub)

  // Query workout scores for the challenge window
  let winnerNpub: string | null = null

  if (comp.scoring_method === 'fastest_time') {
    const targetKm = (config.target_distance_km as number) || 5
    const timeCol = targetKm <= 5 ? 'time_5k_seconds' : 'time_10k_seconds'

    const { data: workouts } = await supabase
      .from('workout_submissions')
      .select(`npub, ${timeCol}`)
      .in('npub', npubs)
      .gte('created_at', comp.config && (comp as any).start_date ? (comp as any).start_date : comp.end_date)
      .lte('created_at', comp.end_date)
      .not(timeCol, 'is', null)
      .gt(timeCol, 0)
      .order(timeCol, { ascending: true })
      .limit(1)

    winnerNpub = workouts?.[0]?.npub || null
  } else if (comp.scoring_method === 'total_distance') {
    // Sum distance per participant
    const { data: workouts } = await supabase
      .from('workout_submissions')
      .select('npub, distance_meters')
      .in('npub', npubs)
      .gte('created_at', comp.end_date) // placeholder, refined below
      .lte('created_at', comp.end_date)

    // Actually query with start_date from competition
    const { data: compFull } = await supabase
      .from('competitions')
      .select('start_date')
      .eq('id', competition_id)
      .single()

    const { data: distWorkouts } = await supabase
      .from('workout_submissions')
      .select('npub, distance_meters')
      .in('npub', npubs)
      .gte('created_at', compFull?.start_date || comp.end_date)
      .lte('created_at', comp.end_date)

    if (distWorkouts) {
      const totals: Record<string, number> = {}
      for (const w of distWorkouts) {
        totals[w.npub] = (totals[w.npub] || 0) + (w.distance_meters || 0)
      }
      const sorted = Object.entries(totals).sort(([, a], [, b]) => b - a)
      winnerNpub = sorted[0]?.[0] || null
    }
  } else if (comp.scoring_method === 'workout_count') {
    const { data: compFull } = await supabase
      .from('competitions')
      .select('start_date')
      .eq('id', competition_id)
      .single()

    const { data: workouts } = await supabase
      .from('workout_submissions')
      .select('npub')
      .in('npub', npubs)
      .gte('created_at', compFull?.start_date || comp.end_date)
      .lte('created_at', comp.end_date)

    if (workouts) {
      const counts: Record<string, number> = {}
      for (const w of workouts) {
        counts[w.npub] = (counts[w.npub] || 0) + 1
      }
      const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
      winnerNpub = sorted[0]?.[0] || null
    }
  } else if (comp.scoring_method === 'total_steps') {
    const { data: compFull } = await supabase
      .from('competitions')
      .select('start_date')
      .eq('id', competition_id)
      .single()

    const { data: workouts } = await supabase
      .from('workout_submissions')
      .select('npub, step_count')
      .in('npub', npubs)
      .gte('created_at', compFull?.start_date || comp.end_date)
      .lte('created_at', comp.end_date)

    if (workouts) {
      const totals: Record<string, number> = {}
      for (const w of workouts) {
        totals[w.npub] = (totals[w.npub] || 0) + ((w as any).step_count || 0)
      }
      const sorted = Object.entries(totals).sort(([, a], [, b]) => b - a)
      winnerNpub = sorted[0]?.[0] || null
    }
  }

  const updatedConfig = { ...config, challenge_status: 'completed', winner_npub: winnerNpub }
  await supabase.from('competitions').update({ config: updatedConfig }).eq('id', competition_id)

  console.log(`Challenge completed: ${competition_id}, winner: ${winnerNpub?.slice(0, 12) || 'none'}`)
  return jsonResponse({ success: true, data: { challenge_status: 'completed', winner_npub: winnerNpub } })
}
```

**Step 2: Add cases to the switch dispatcher**

In the `switch (action)` block, add before the `default:` case:

```typescript
      case 'create-challenge':
        return await handleCreateChallenge(supabase, params)
      case 'accept-challenge':
        return await handleAcceptChallenge(supabase, params)
      case 'decline-challenge':
        return await handleDeclineChallenge(supabase, params)
      case 'complete-challenge':
        return await handleCompleteChallenge(supabase, params)
```

**Step 3: Commit**

```bash
git add supabase/functions/manage-competition/index.ts
git commit -m "Feature: Add challenge create/accept/decline/complete to manage-competition"
```

**Note:** Deploy after committing: `supabase functions deploy manage-competition`

---

## Task 3: Create ChallengeService

**Files:**
- Create: `src/services/challenge/ChallengeService.ts`

**Step 1: Create the service**

```typescript
/**
 * ChallengeService - Client-side service for 1v1 challenges.
 * Wraps manage-competition edge function calls for challenge lifecycle.
 * Caches challenge status (30s TTL) to avoid re-fetching on every render.
 */
import { callEdgeFunction } from '../../utils/edgeFunctions';
import { supabase } from '../../utils/supabase';

export interface ChallengeStatus {
  challenge_status: 'pending' | 'accepted' | 'declined' | 'active' | 'completed';
  challenger_npub: string;
  challenged_npub: string;
  challenge_type: string;
  duration_days: number;
  winner_npub?: string | null;
  start_date?: string;
  end_date?: string;
}

interface CachedStatus {
  status: ChallengeStatus;
  fetchedAt: number;
}

const CACHE_TTL = 30_000; // 30 seconds
const statusCache = new Map<string, CachedStatus>();

export class ChallengeService {
  /**
   * Create a challenge competition. Returns the competition ID.
   */
  static async createChallenge(params: {
    challengerNpub: string;
    challengedNpub: string;
    challengeType: string;
    durationDays: 1 | 3 | 7;
    clubId?: string;
    name?: string;
    picture?: string;
  }): Promise<{ competitionId: string } | null> {
    const result = await callEdgeFunction<{ id: string; external_id: string }>('manage-competition', {
      action: 'create-challenge',
      npub: params.challengerNpub,
      challenged_npub: params.challengedNpub,
      challenge_type: params.challengeType,
      duration_days: params.durationDays,
      club_id: params.clubId,
      name: params.name,
      picture: params.picture,
    });

    if (!result.success || !result.data) {
      console.error('[ChallengeService] createChallenge error:', result.error);
      return null;
    }

    const data = result.data as any;
    const id = data.id || data.data?.id;
    console.log(`[ChallengeService] Challenge created: ${id}`);
    return { competitionId: id };
  }

  /**
   * Accept a challenge. Sets start/end dates and joins the challenged user.
   */
  static async acceptChallenge(competitionId: string, npub: string, profile?: { name?: string; picture?: string }): Promise<boolean> {
    const result = await callEdgeFunction('manage-competition', {
      action: 'accept-challenge',
      competition_id: competitionId,
      npub,
      name: profile?.name,
      picture: profile?.picture,
    });

    if (!result.success) {
      console.error('[ChallengeService] acceptChallenge error:', result.error);
      return false;
    }

    // Invalidate cache
    statusCache.delete(competitionId);
    console.log(`[ChallengeService] Challenge accepted: ${competitionId}`);
    return true;
  }

  /**
   * Decline a challenge.
   */
  static async declineChallenge(competitionId: string, npub: string): Promise<boolean> {
    const result = await callEdgeFunction('manage-competition', {
      action: 'decline-challenge',
      competition_id: competitionId,
      npub,
    });

    if (!result.success) {
      console.error('[ChallengeService] declineChallenge error:', result.error);
      return false;
    }

    statusCache.delete(competitionId);
    console.log(`[ChallengeService] Challenge declined: ${competitionId}`);
    return true;
  }

  /**
   * Fetch live challenge status from the competition record.
   * Cached for 30 seconds.
   */
  static async getChallengeStatus(competitionId: string): Promise<ChallengeStatus | null> {
    if (!competitionId) return null;

    // Check cache
    const cached = statusCache.get(competitionId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.status;
    }

    const { data, error } = await supabase
      .from('competitions')
      .select('config, start_date, end_date')
      .eq('id', competitionId)
      .single();

    if (error || !data) {
      console.warn('[ChallengeService] getChallengeStatus error:', error?.message);
      return null;
    }

    const config = data.config as Record<string, unknown>;
    const status: ChallengeStatus = {
      challenge_status: (config.challenge_status as ChallengeStatus['challenge_status']) || 'pending',
      challenger_npub: (config.challenger_npub as string) || '',
      challenged_npub: (config.challenged_npub as string) || '',
      challenge_type: (config.challenge_type as string) || '',
      duration_days: (config.duration_days as number) || 1,
      winner_npub: (config.winner_npub as string) || null,
      start_date: data.start_date,
      end_date: data.end_date,
    };

    statusCache.set(competitionId, { status, fetchedAt: Date.now() });
    return status;
  }

  /**
   * Check if a challenge has ended and determine the winner (on-demand).
   * Only calls the edge function if the challenge is active and past end_date.
   */
  static async checkAndComplete(competitionId: string): Promise<ChallengeStatus | null> {
    const result = await callEdgeFunction('manage-competition', {
      action: 'complete-challenge',
      competition_id: competitionId,
    });

    if (!result.success) {
      console.warn('[ChallengeService] completeChallenge error:', result.error);
      return null;
    }

    statusCache.delete(competitionId);
    return this.getChallengeStatus(competitionId);
  }

  /** Clear the status cache (useful after accept/decline). */
  static clearCache(): void {
    statusCache.clear();
  }
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add src/services/challenge/ChallengeService.ts
git commit -m "Feature: Add ChallengeService for challenge lifecycle"
```

---

## Task 4: Update challenge send flow to create competition first

**Files:**
- Modify: `src/components/club/ClubChatSection.tsx`
- Modify: `src/screens/ClubChatScreen.tsx`

**Step 1: Update ClubChatSection handleSendChallenge**

Import ChallengeService:
```typescript
import { ChallengeService } from '../../services/challenge/ChallengeService';
```

Replace the existing `handleSendChallenge` callback with:

```typescript
const handleSendChallenge = useCallback(async (type: ChallengeType, durationDays: 1 | 3 | 7) => {
  if (!challengeTarget || !userNpub) return;
  const challengedNpub = challengeTarget.sender_npub;
  const challengedName = getProfileForNpub(challengedNpub)?.display_name || challengedNpub.slice(0, 12) + '...';
  const myProfile = getProfileForNpub(userNpub);

  // 1. Create competition first
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
    setChallengeTarget(null);
    return;
  }

  // 2. Send chat message with real competition_id
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
```

**Step 2: Update ClubChatScreen handleSendChallenge**

Same pattern. Import ChallengeService:
```typescript
import { ChallengeService } from '../services/challenge/ChallengeService';
```

Replace the existing `handleSendChallenge` callback with the same logic as above, but with different import paths. Note: ClubChatScreen gets `clubId` from `route.params`, so use `clubId` directly (it's already destructured from route.params).

**Step 3: Remove `as any` casts on metadata**

Both files currently have `metadata: metadata as any` in the `sendMessage` call. Since Task 1 fixed the type, change to just `metadata`.

**Step 4: Run typecheck**

Run: `npm run typecheck`

**Step 5: Commit**

```bash
git add src/components/club/ClubChatSection.tsx src/screens/ClubChatScreen.tsx
git commit -m "Feature: Create competition before sending challenge message"
```

---

## Task 5: Wire accept/decline and live status to chat UI

This is the largest task. It wires the accept/decline buttons, fetches live challenge status from the competition record, and handles on-demand winner determination.

**Files:**
- Modify: `src/components/club/ChatMessageBubble.tsx`
- Modify: `src/components/club/ClubChatSection.tsx`
- Modify: `src/screens/ClubChatScreen.tsx`

**Step 1: Update ChatMessageBubble to use live status**

Add a new prop for live challenge status that overrides the static metadata:

```typescript
// In ChatMessageBubbleProps, add:
liveChallengeStatus?: {
  challenge_status: string;
  winner_npub?: string | null;
  end_date?: string;
} | null;
```

Inside the component, use the live status when available:

```typescript
// Replace existing challengeMeta-derived status with:
const liveStatus = liveChallengeStatus?.challenge_status || challengeMeta?.challenge_status;
const liveWinner = liveChallengeStatus?.winner_npub || challengeMeta?.winner_npub;
const isChallenged = isChallenge && challengeMeta?.challenged_npub === userNpub;
const challengeIsPending = liveStatus === 'pending';
```

Update the status rendering section to use `liveStatus` and `liveWinner` instead of `challengeMeta.challenge_status` and `challengeMeta.winner_npub`. Also show time remaining for active challenges:

```typescript
{liveStatus === 'active' && liveChallengeStatus?.end_date && (
  <Text style={styles.challengeStatusText}>
    Challenge Active — {formatTimeRemaining(liveChallengeStatus.end_date)}
  </Text>
)}
{liveStatus === 'completed' && (
  <Text style={styles.challengeStatusText}>
    Winner: {liveWinner === userNpub ? 'You!' : displayName}
  </Text>
)}
{liveStatus === 'declined' && (
  <Text style={[styles.challengeStatusText, { color: theme.colors.textDark }]}>
    Declined
  </Text>
)}
```

Add a `formatTimeRemaining` helper:

```typescript
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
```

**Step 2: Add challenge status fetching and handlers to ClubChatSection**

Import:
```typescript
import { ChallengeService } from '../../services/challenge/ChallengeService';
import type { ChallengeStatus } from '../../services/challenge/ChallengeService';
```

Add state:
```typescript
const [challengeStatuses, setChallengeStatuses] = useState<Map<string, ChallengeStatus>>(new Map());
```

Add useEffect to fetch challenge statuses:
```typescript
useEffect(() => {
  const challengeMessages = messages.filter(
    (m) => m.message_type === 'challenge' && m.metadata && 'competition_id' in m.metadata
  );
  if (challengeMessages.length === 0) return;

  const fetchStatuses = async () => {
    const newStatuses = new Map(challengeStatuses);
    let changed = false;
    for (const msg of challengeMessages) {
      const meta = msg.metadata as ChallengeMessageMetadata;
      if (!meta.competition_id) continue;
      const status = await ChallengeService.getChallengeStatus(meta.competition_id);
      if (status) {
        // On-demand completion check
        if (status.challenge_status === 'active' && status.end_date && new Date(status.end_date) < new Date()) {
          const completed = await ChallengeService.checkAndComplete(meta.competition_id);
          if (completed) {
            newStatuses.set(meta.competition_id, completed);
            changed = true;
            continue;
          }
        }
        newStatuses.set(meta.competition_id, status);
        changed = true;
      }
    }
    if (changed) setChallengeStatuses(newStatuses);
  };

  fetchStatuses();
}, [messages]);
```

Add accept/decline handlers:
```typescript
const handleAcceptChallenge = useCallback(async (competitionId: string) => {
  if (!userNpub) return;
  const myProfile = getProfileForNpub(userNpub);
  const success = await ChallengeService.acceptChallenge(competitionId, userNpub, {
    name: myProfile?.display_name || myProfile?.name,
    picture: myProfile?.picture,
  });
  if (success) {
    // Refresh status
    const status = await ChallengeService.getChallengeStatus(competitionId);
    if (status) {
      setChallengeStatuses(prev => {
        const next = new Map(prev);
        next.set(competitionId, status);
        return next;
      });
    }
  }
}, [userNpub, getProfileForNpub]);

const handleDeclineChallenge = useCallback(async (competitionId: string) => {
  if (!userNpub) return;
  const success = await ChallengeService.declineChallenge(competitionId, userNpub);
  if (success) {
    const status = await ChallengeService.getChallengeStatus(competitionId);
    if (status) {
      setChallengeStatuses(prev => {
        const next = new Map(prev);
        next.set(competitionId, status);
        return next;
      });
    }
  }
}, [userNpub]);
```

Update `renderMessage` to pass live status and handlers:
```typescript
// Inside renderMessage, add to ChatMessageBubble props:
liveChallengeStatus={
  item.message_type === 'challenge' && item.metadata && 'competition_id' in item.metadata
    ? challengeStatuses.get((item.metadata as ChallengeMessageMetadata).competition_id) || null
    : null
}
onAcceptChallenge={
  item.message_type === 'challenge' && item.metadata && 'competition_id' in item.metadata
    ? () => handleAcceptChallenge((item.metadata as ChallengeMessageMetadata).competition_id)
    : undefined
}
onDeclineChallenge={
  item.message_type === 'challenge' && item.metadata && 'competition_id' in item.metadata
    ? () => handleDeclineChallenge((item.metadata as ChallengeMessageMetadata).competition_id)
    : undefined
}
```

Add `challengeStatuses`, `handleAcceptChallenge`, `handleDeclineChallenge` to the `renderMessage` dependency array.

**Step 3: Replicate in ClubChatScreen**

Same changes as Step 2 but in `src/screens/ClubChatScreen.tsx`. Import paths differ (`../services/challenge/ChallengeService`, `../types/club`).

**Step 4: Run typecheck**

Run: `npm run typecheck`

**Step 5: Commit**

```bash
git add src/components/club/ChatMessageBubble.tsx src/components/club/ClubChatSection.tsx src/screens/ClubChatScreen.tsx
git commit -m "Feature: Wire accept/decline and live challenge status to chat UI"
```

---

## Verification

1. `npm run typecheck` — must pass after each task
2. Deploy edge functions:
   - `supabase functions deploy manage-competition`
   - `supabase functions deploy manage-club-chat` (if not already deployed)
3. Manual test: Long-press message → Challenge → complete wizard → challenge card appears with correct competition_id
4. Manual test: Challenged user sees Accept/Decline buttons → Accept → card shows "Challenge Active — Xd left"
5. Manual test: Decline → card shows "Declined"
6. Manual test: After duration expires, view card → winner determined on-demand
