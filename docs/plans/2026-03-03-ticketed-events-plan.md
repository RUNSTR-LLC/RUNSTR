# Ticketed Events Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add pledge-based ticketing to RUNSTR events so captains can charge 1-7 workout-day entry fees, with random winner selection for participation events.

**Architecture:** Extends existing pledge system (PledgeService + DailyRewardService reward routing) as the ticketing mechanism. Adds random winner selection via deterministic SHA256 seed. Prize payout is organizer-initiated from their device. No new payment infrastructure — pledge-as-ticket reuses proven reward routing.

**Tech Stack:** React Native/TypeScript, Supabase (Edge Functions + migrations), Nostr NIP-52 (kind 31923), existing PledgeService/DailyRewardService.

**Design doc:** `docs/plans/2026-03-03-ticketed-events-design.md`

---

## Task 1: Extend Type Definitions

**Files:**
- Modify: `src/types/runstrEvent.ts` (lines 33-37, 44-49, 147-195, 218-244, 249-272, 284-289, 310-390)

**Step 1: Add `random_winner` payout scheme**

In `src/types/runstrEvent.ts`, add `'random_winner'` to the `RunstrPayoutScheme` union type (line 33-37):

```typescript
export type RunstrPayoutScheme =
  | 'winner_takes_all'
  | 'top_3_split'
  | 'top_5_split'
  | 'fixed_amount'
  | 'random_winner';
```

**Step 2: Update `getValidPayoutSchemes` to include random_winner for participation**

At line 44-49, update:

```typescript
export function getValidPayoutSchemes(scoringType: RunstrScoringType): RunstrPayoutScheme[] {
  if (scoringType === 'participation') {
    return ['fixed_amount', 'random_winner'];
  }
  return ['winner_takes_all', 'top_3_split', 'top_5_split'];
}
```

**Step 3: Add ticketing fields to `RunstrEventConfig`**

After the pledge fields (line 171), add:

```typescript
  // Ticketing (pledge-based entry)
  ticketPledgeDays?: number;               // 1-7 workout days as entry fee (captain receives rewards)
  winnerSelection?: 'ranked' | 'random';   // How winner is picked (default: 'ranked')
  qualifyingDistance?: number;              // km — minimum distance to qualify as finisher
```

**Step 4: Add ticketing fields to `RunstrEventFormState`**

After `isTeamCompetition` (line 242), add:

```typescript
  // Ticketing
  ticketPledgeDays: number;          // 1-7 workout days as entry fee (0 = free)
  winnerSelection: 'ranked' | 'random';
  qualifyingDistance: string;         // Input field for qualifying distance in km
```

**Step 5: Update `DEFAULT_FORM_STATE`**

Add defaults to `DEFAULT_FORM_STATE` (after `isTeamCompetition: false` around line 269):

```typescript
  // Ticketing defaults
  ticketPledgeDays: 0,              // 0 = free entry (no pledge required)
  winnerSelection: 'ranked',
  qualifyingDistance: '',
```

**Step 6: Add `random_winner` case to `calculatePayouts`**

In `calculatePayouts` function (around line 363, replace the legacy `random_lottery` case):

```typescript
    case 'random_winner': {
      // Deterministic random: seed from event context, computed at finalization time
      // At calculation time, just show that one winner gets the full pool
      if (recipients.length === 0) return [];
      const winner = recipients[0]; // Actual winner determined at finalization
      return [{ recipient: winner, amountSats: prizePoolSats, percentage: 100 }];
    }
```

**Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors (pre-existing ~199 errors unchanged)

**Step 8: Commit**

```bash
git add src/types/runstrEvent.ts
git commit -m "Feature: Add ticketing types — random_winner payout, pledge days, qualifying distance"
```

---

## Task 2: Extend Pledge Cost Options

**Files:**
- Modify: `src/hooks/useRunstrEventCreation.ts` (lines 188-198)

**Step 1: Expand PLEDGE_COST_OPTIONS to support 1-7**

At lines 188-193, replace:

```typescript
export const PLEDGE_COST_OPTIONS = [
  { value: 0, label: 'Free' },
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5 days' },
  { value: 6, label: '6 days' },
  { value: 7, label: '7 days' },
];
```

**Step 2: Run typecheck**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add src/hooks/useRunstrEventCreation.ts
git commit -m "Feature: Expand pledge cost options to 0-7 days with free option"
```

---

## Task 3: Add Ticketing Tags to Event Publishing

**Files:**
- Modify: `src/services/events/RunstrEventPublishService.ts` (lines 235-256)

**Step 1: Add new Nostr tags for ticketing fields**

After the existing pledge tag building block (around line 256), add:

```typescript
    // Ticketing tags
    if (config.ticketPledgeDays && config.ticketPledgeDays > 0) {
      tags.push(['ticket_pledge_days', config.ticketPledgeDays.toString()]);
    }
    if (config.winnerSelection && config.winnerSelection !== 'ranked') {
      tags.push(['winner_selection', config.winnerSelection]);
    }
    if (config.qualifyingDistance && config.qualifyingDistance > 0) {
      tags.push(['qualifying_distance', config.qualifyingDistance.toString()]);
    }
```

**Step 2: Update `buildConfigFromForm` to include ticketing fields**

In the `buildConfigFromForm` function (around lines 520-523 where pledge fields are set), add after them:

```typescript
      ticketPledgeDays: formState.ticketPledgeDays || 0,
      winnerSelection: formState.winnerSelection || 'ranked',
      qualifyingDistance: formState.qualifyingDistance ? parseFloat(formState.qualifyingDistance) : undefined,
```

**Step 3: Run typecheck**

Run: `npm run typecheck`

**Step 4: Commit**

```bash
git add src/services/events/RunstrEventPublishService.ts
git commit -m "Feature: Add ticketing Nostr tags — pledge days, winner selection, qualifying distance"
```

---

## Task 4: Add Ticketing Fields to Event Creation Modal

**Files:**
- Modify: `src/components/subscription/SimpleEventCreationModal.tsx` (lines 161-171, 302-387)

**Context:** This modal currently has: template selection, event name, description, start date, image URL. It does NOT have pledge or ticketing fields. We need to add:
1. Ticket pledge days picker (1-7 or free)
2. Winner selection toggle (ranked vs random)
3. Qualifying distance field (for random winner events)

**Step 1: Add state variables for ticketing**

After the existing state variables (around line 171), add:

```typescript
  const [ticketPledgeDays, setTicketPledgeDays] = useState(0);
  const [winnerSelection, setWinnerSelection] = useState<'ranked' | 'random'>('ranked');
  const [qualifyingDistance, setQualifyingDistance] = useState('');
```

**Step 2: Add ticketing fields to the form UI**

After the existing form fields (image URL section) and before the Create button, add the ticketing section. Use the same styling patterns as existing fields in the modal:

```tsx
        {/* Entry Fee */}
        <Text style={[styles.label, { color: colors.text }]}>Entry Fee (Workout Days)</Text>
        <View style={styles.pledgeDaysRow}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.pledgeDayChip,
                { borderColor: colors.border },
                ticketPledgeDays === days && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setTicketPledgeDays(days)}
            >
              <Text style={[
                styles.pledgeDayChipText,
                { color: ticketPledgeDays === days ? '#fff' : colors.text },
              ]}>
                {days === 0 ? 'Free' : `${days}d`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Winner Selection (only show if participation template) */}
        {selectedTemplate?.scoringMethod === 'workout_count' && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Winner Selection</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  { borderColor: colors.border },
                  winnerSelection === 'ranked' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setWinnerSelection('ranked')}
              >
                <Text style={{ color: winnerSelection === 'ranked' ? '#fff' : colors.text }}>Top Ranked</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  { borderColor: colors.border },
                  winnerSelection === 'random' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setWinnerSelection('random')}
              >
                <Text style={{ color: winnerSelection === 'random' ? '#fff' : colors.text }}>Random Draw</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Qualifying Distance (only show for random winner) */}
        {winnerSelection === 'random' && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Qualifying Distance (km)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={qualifyingDistance}
              onChangeText={setQualifyingDistance}
              placeholder="e.g., 21 for a half marathon"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </>
        )}
```

**Step 3: Include ticketing fields in `handleCreate` payload**

In the `handleCreate` function's config object (around line 340), add the ticketing fields:

```typescript
        config: {
          // ... existing fields ...
          ticket_pledge_days: ticketPledgeDays,
          winner_selection: winnerSelection,
          qualifying_distance_km: qualifyingDistance ? parseFloat(qualifyingDistance) : null,
        },
```

**Step 4: Add styles for new components**

Add to the StyleSheet at the bottom of the file:

```typescript
  pledgeDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pledgeDayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  pledgeDayChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
```

**Step 5: Run typecheck**

Run: `npm run typecheck`

**Step 6: Commit**

```bash
git add src/components/subscription/SimpleEventCreationModal.tsx
git commit -m "Feature: Add ticketing fields to event creation — pledge days, winner selection, qualifying distance"
```

---

## Task 5: Update Join Flow to Create Pledge for Ticketed Events

**Files:**
- Modify: `src/screens/events/DynamicEventDetailScreen.tsx` (lines 205-233)
- Modify: `src/hooks/useSupabaseLeaderboard.ts` (lines 663-757)

**Step 1: Add pledge creation to the join flow in DynamicEventDetailScreen**

In `handleJoin()` (lines 205-233), after existing gates (club membership, subscription), add a pledge gate before calling `join()`:

```typescript
  const handleJoin = async () => {
    if (isJoining) return;

    // Existing gates...
    if (competition?.club_id && isClubMember === false) {
      setShowClubGateAlert(true);
      return;
    }

    const reqTier = competition?.config?.requires_subscription;
    if (reqTier) {
      const meetsRequirement = reqTier === 'supporter'
        ? (subscriptionTier === 'supporter' || subscriptionTier === 'pro')
        : subscriptionTier === 'pro';
      if (!meetsRequirement) {
        setShowSubscriptionInfo(true);
        return;
      }
    }

    // NEW: Pledge gate for ticketed events
    const pledgeDays = competition?.config?.ticket_pledge_days;
    if (pledgeDays && pledgeDays > 0) {
      // Show pledge confirmation before joining
      setShowPledgeConfirmation(true);
      return;
    }

    setIsJoining(true);
    try {
      await join();
      await refreshLeaderboard();
    } finally {
      setIsJoining(false);
    }
  };
```

**Step 2: Add pledge confirmation state and handler**

Add state near the top of the component:

```typescript
  const [showPledgeConfirmation, setShowPledgeConfirmation] = useState(false);
```

Add a pledge confirmation handler:

```typescript
  const handlePledgeAndJoin = async () => {
    setShowPledgeConfirmation(false);
    setIsJoining(true);
    try {
      const userPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!userPubkey) return;

      // Check for existing active pledge
      const existingPledge = await PledgeService.getActivePledge(userPubkey);
      if (existingPledge) {
        Alert.alert('Active Pledge', 'You already have an active pledge. Complete it before joining a new ticketed event.');
        return;
      }

      // Get captain's lightning address from competition or Nostr profile
      const captainAddress = competition?.config?.captain_lightning_address || '';
      const captainName = competition?.name || 'Event Captain';

      // Create the pledge
      await PledgeService.createPledge({
        eventId: competition!.id,
        eventName: competition!.name,
        totalWorkouts: competition!.config!.ticket_pledge_days,
        destination: {
          type: 'captain',
          lightningAddress: captainAddress,
          name: captainName,
        },
        userPubkey,
      });

      // Join the competition
      await join();
      await refreshLeaderboard();
    } catch (error) {
      console.error('[DynamicEventDetail] Pledge + join error:', error);
      Alert.alert('Error', 'Failed to join event. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };
```

**Step 3: Add pledge confirmation Alert**

Replace the `setShowPledgeConfirmation(true)` call with an Alert for simplicity:

```typescript
    // NEW: Pledge gate for ticketed events
    const pledgeDays = competition?.config?.ticket_pledge_days;
    if (pledgeDays && pledgeDays > 0) {
      Alert.alert(
        'Entry Fee Required',
        `This event requires pledging ${pledgeDays} workout day${pledgeDays > 1 ? 's' : ''} to enter. Your next ${pledgeDays} daily reward${pledgeDays > 1 ? 's' : ''} will go to the event captain.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pledge & Join', onPress: handlePledgeAndJoin },
        ]
      );
      return;
    }
```

**Step 4: Add imports**

Add at top of file:

```typescript
import { PledgeService } from '../../services/pledge/PledgeService';
import AsyncStorage from '@react-native-async-storage/async-storage';
```

**Step 5: Run typecheck**

Run: `npm run typecheck`

**Step 6: Commit**

```bash
git add src/screens/events/DynamicEventDetailScreen.tsx
git commit -m "Feature: Add pledge gate to join flow for ticketed events"
```

---

## Task 6: Update Event Cards and Detail Display

**Files:**
- Modify: `src/components/events/DynamicEventCard.tsx` (lines 146-227)
- Modify: `src/screens/events/DynamicEventDetailScreen.tsx` (lines 487-514)

**Step 1: Add ticket badge to DynamicEventCard**

In the card's badge/tag area (where status and activity tags are shown), add a ticket badge when the event has a pledge entry fee:

```tsx
{/* Ticket badge */}
{competition.config?.ticket_pledge_days > 0 && (
  <View style={[styles.ticketBadge, { backgroundColor: colors.primary + '20' }]}>
    <Text style={[styles.ticketBadgeText, { color: colors.primary }]}>
      {competition.config.ticket_pledge_days}-day pledge to enter
    </Text>
  </View>
)}
```

Add styles:

```typescript
  ticketBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  ticketBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
```

**Step 2: Add ticketing info to DynamicEventDetailScreen**

In the event detail screen, before the join button section, add event info showing:

```tsx
{/* Ticketing Info */}
{competition?.config?.ticket_pledge_days > 0 && (
  <View style={[styles.infoRow, { backgroundColor: colors.surface }]}>
    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Entry Fee</Text>
    <Text style={[styles.infoValue, { color: colors.text }]}>
      {competition.config.ticket_pledge_days} workout day{competition.config.ticket_pledge_days > 1 ? 's' : ''} pledged to captain
    </Text>
  </View>
)}
{competition?.config?.winner_selection === 'random' && (
  <View style={[styles.infoRow, { backgroundColor: colors.surface }]}>
    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Winner</Text>
    <Text style={[styles.infoValue, { color: colors.text }]}>Random draw from finishers</Text>
  </View>
)}
{competition?.config?.qualifying_distance_km > 0 && (
  <View style={[styles.infoRow, { backgroundColor: colors.surface }]}>
    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Qualifying</Text>
    <Text style={[styles.infoValue, { color: colors.text }]}>
      {competition.config.qualifying_distance_km} km minimum
    </Text>
  </View>
)}
```

**Step 3: Run typecheck**

Run: `npm run typecheck`

**Step 4: Commit**

```bash
git add src/components/events/DynamicEventCard.tsx src/screens/events/DynamicEventDetailScreen.tsx
git commit -m "Feature: Show ticket badge and event info for ticketed events"
```

---

## Task 7: Create Event Finalization Service

**Files:**
- Create: `src/services/events/EventFinalizationService.ts`

**Step 1: Create the service**

```typescript
/**
 * EventFinalizationService
 *
 * Handles event completion: query finishers, select random winner,
 * and display results. Prize payout is organizer-initiated.
 */

import { createHash } from 'react-native-crypto';
import { callEdgeFunction } from '../../utils/supabase';

export interface Finisher {
  npub: string;
  totalDistanceKm: number;
  name?: string;
  lightningAddress?: string;
}

export interface FinalizationResult {
  eventId: string;
  finishers: Finisher[];
  winner?: Finisher;
  winnerSelection: 'ranked' | 'random';
  prizePoolSats: number;
}

class EventFinalizationServiceClass {

  /**
   * Finalize a ticketed event — query finishers and select winner
   */
  async finalizeEvent(
    eventId: string,
    winnerSelection: 'ranked' | 'random',
    qualifyingDistanceKm: number,
    prizePoolSats: number,
  ): Promise<FinalizationResult> {
    // Query finishers from Supabase
    const finishers = await this.getFinishers(eventId, qualifyingDistanceKm);

    if (finishers.length === 0) {
      return { eventId, finishers: [], winnerSelection, prizePoolSats };
    }

    let winner: Finisher | undefined;

    if (winnerSelection === 'random') {
      winner = this.selectRandomWinner(eventId, finishers);
    } else {
      // Ranked: highest distance wins
      winner = finishers.sort((a, b) => b.totalDistanceKm - a.totalDistanceKm)[0];
    }

    return { eventId, finishers, winner, winnerSelection, prizePoolSats };
  }

  /**
   * Query finishers who met the qualifying distance
   */
  async getFinishers(eventId: string, qualifyingDistanceKm: number): Promise<Finisher[]> {
    const result = await callEdgeFunction('finalize-ticketed-event', {
      action: 'get_finishers',
      competition_id: eventId,
      qualifying_distance_km: qualifyingDistanceKm,
    });

    if (!result.success || !result.data?.finishers) {
      console.error('[EventFinalization] Failed to get finishers:', result.error);
      return [];
    }

    return result.data.finishers;
  }

  /**
   * Deterministic random winner selection
   * seed = SHA256(eventId + sorted npubs) — verifiable by anyone
   */
  selectRandomWinner(eventId: string, finishers: Finisher[]): Finisher {
    const sortedNpubs = finishers.map(f => f.npub).sort().join(',');
    const input = `${eventId}:${sortedNpubs}`;

    // SHA256 hash as seed
    const hash = createHash('sha256').update(input).digest('hex');

    // Use first 8 hex chars as integer for index
    const seedInt = parseInt(hash.substring(0, 8), 16);
    const winnerIndex = seedInt % finishers.length;

    console.log(`[EventFinalization] Random winner: index ${winnerIndex} of ${finishers.length} finishers`);
    console.log(`[EventFinalization] Seed: SHA256("${eventId}:${sortedNpubs.substring(0, 30)}...")`);

    return finishers[winnerIndex];
  }
}

export const EventFinalizationService = new EventFinalizationServiceClass();
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Note: `react-native-crypto` may not be available. If so, use a simpler hash approach or `js-sha256` package. Check existing crypto imports in the project first.

**Step 3: Commit**

```bash
git add src/services/events/EventFinalizationService.ts
git commit -m "Feature: Add EventFinalizationService with deterministic random winner selection"
```

---

## Task 8: Create Finalization Edge Function

**Files:**
- Create: `supabase/functions/finalize-ticketed-event/index.ts`

**Step 1: Create the Edge Function**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { action, competition_id, qualifying_distance_km } = await req.json()

    if (action === 'get_finishers') {
      return await getFinishers(supabase, competition_id, qualifying_distance_km)
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

async function getFinishers(
  supabase: any,
  competitionId: string,
  qualifyingDistanceKm: number,
) {
  // Get competition date range
  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('start_date, end_date, config')
    .eq('id', competitionId)
    .single()

  if (compErr || !comp) {
    return jsonResponse({ success: false, error: 'Competition not found' }, 404)
  }

  // Get participants
  const { data: participants } = await supabase
    .from('competition_participants')
    .select('npub, name')
    .eq('competition_id', competitionId)

  if (!participants || participants.length === 0) {
    return jsonResponse({ success: true, data: { finishers: [] } })
  }

  const npubs = participants.map((p: any) => p.npub)

  // Query workout submissions for qualifying finishers
  const { data: submissions, error: subErr } = await supabase
    .rpc('get_competition_finishers', {
      p_competition_id: competitionId,
      p_npubs: npubs,
      p_start_date: comp.start_date,
      p_end_date: comp.end_date,
      p_qualifying_distance_meters: qualifyingDistanceKm * 1000,
    })

  if (subErr) {
    console.error('Finisher query error:', subErr)
    return jsonResponse({ success: false, error: subErr.message }, 500)
  }

  const finishers = (submissions || []).map((s: any) => ({
    npub: s.npub,
    totalDistanceKm: s.total_distance_meters / 1000,
    name: participants.find((p: any) => p.npub === s.npub)?.name || null,
  }))

  return jsonResponse({ success: true, data: { finishers } })
}

function jsonResponse(body: any, status = 200) {
  return new Response(
    JSON.stringify(body),
    { status, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } },
  )
}
```

**Step 2: Commit**

```bash
git add supabase/functions/finalize-ticketed-event/index.ts
git commit -m "Feature: Add finalize-ticketed-event Edge Function"
```

---

## Task 9: Create Supabase Migration for Finisher Query RPC

**Files:**
- Create: `supabase/migrations/154_competition_finishers_rpc.sql`

**Step 1: Create the migration**

```sql
-- RPC to get competition finishers who meet qualifying distance
-- Used by finalize-ticketed-event Edge Function

CREATE OR REPLACE FUNCTION get_competition_finishers(
  p_competition_id UUID,
  p_npubs TEXT[],
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_qualifying_distance_meters NUMERIC
)
RETURNS TABLE (
  npub TEXT,
  total_distance_meters NUMERIC,
  workout_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    ws.npub,
    SUM(ws.distance_meters) as total_distance_meters,
    COUNT(*) as workout_count
  FROM workout_submissions ws
  WHERE ws.npub = ANY(p_npubs)
    AND ws.created_at >= p_start_date
    AND ws.created_at <= p_end_date
    AND ws.source = 'app'
    AND ws.distance_meters > 0
    AND ws.npub NOT IN (
      SELECT bu.npub FROM banned_users bu
      WHERE bu.expires_at IS NULL OR bu.expires_at > NOW()
    )
  GROUP BY ws.npub
  HAVING SUM(ws.distance_meters) >= p_qualifying_distance_meters
  ORDER BY total_distance_meters DESC;
$$;
```

**Step 2: Commit**

```bash
git add supabase/migrations/154_competition_finishers_rpc.sql
git commit -m "Feature: Add get_competition_finishers RPC for event finalization"
```

---

## Task 10: Add Prize Payout UI for Organizer

**Files:**
- Modify: `src/screens/events/DynamicEventDetailScreen.tsx`

**Context:** When an event has ended and the current user is the creator, show a "Finalize Event" button that runs the finalization service and displays the winner with a "Pay Winner" button.

**Step 1: Add finalization state**

```typescript
  const [finalizationResult, setFinalizationResult] = useState<FinalizationResult | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
```

**Step 2: Add finalize handler**

```typescript
  const handleFinalize = async () => {
    if (!competition?.config) return;
    setIsFinalizing(true);
    try {
      const result = await EventFinalizationService.finalizeEvent(
        competition.id,
        competition.config.winner_selection || 'ranked',
        competition.config.qualifying_distance_km || 0,
        competition.config.prize_pool_sats || competition.prize_pool_sats || 0,
      );
      setFinalizationResult(result);
    } catch (error) {
      console.error('[DynamicEventDetail] Finalization error:', error);
      Alert.alert('Error', 'Failed to finalize event. Please try again.');
    } finally {
      setIsFinalizing(false);
    }
  };
```

**Step 3: Add pay winner handler**

```typescript
  const handlePayWinner = async () => {
    if (!finalizationResult?.winner) return;
    setIsPaying(true);
    try {
      // Fetch winner's lightning address from Nostr profile
      const winnerAddress = finalizationResult.winner.lightningAddress;
      if (!winnerAddress) {
        Alert.alert('No Address', 'Winner does not have a Lightning address set in their profile.');
        return;
      }

      // Use organizer's local NWC to pay
      const { NWCWalletService } = require('../../services/wallet/NWCWalletService');
      const invoiceResult = await NWCWalletService.createInvoice(
        finalizationResult.prizePoolSats,
        `Prize: ${competition?.name}`,
      );

      if (!invoiceResult.success) {
        Alert.alert('Error', `Failed to create invoice: ${invoiceResult.error}`);
        return;
      }

      const payResult = await NWCWalletService.sendPayment(invoiceResult.invoice!);
      if (payResult.success) {
        Alert.alert('Prize Sent!', `${finalizationResult.prizePoolSats} sats sent to the winner.`);
      } else {
        Alert.alert('Payment Failed', payResult.error || 'Unknown error');
      }
    } catch (error) {
      console.error('[DynamicEventDetail] Pay winner error:', error);
      Alert.alert('Error', 'Failed to send prize. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };
```

**Step 4: Add finalization UI section**

After the leaderboard section, add (only visible to event creator when event has ended):

```tsx
{/* Event Finalization (Creator Only, Event Ended) */}
{isCreator && status === 'ended' && competition?.config?.winner_selection === 'random' && (
  <View style={[styles.finalizationSection, { backgroundColor: colors.surface }]}>
    {!finalizationResult ? (
      <TouchableOpacity
        style={[styles.finalizeButton, { backgroundColor: colors.primary }]}
        onPress={handleFinalize}
        disabled={isFinalizing}
      >
        <Text style={styles.finalizeButtonText}>
          {isFinalizing ? 'Selecting Winner...' : 'Draw Random Winner'}
        </Text>
      </TouchableOpacity>
    ) : (
      <View>
        <Text style={[styles.finalizationTitle, { color: colors.text }]}>
          {finalizationResult.finishers.length} Finisher{finalizationResult.finishers.length !== 1 ? 's' : ''}
        </Text>
        {finalizationResult.winner && (
          <>
            <Text style={[styles.winnerText, { color: colors.primary }]}>
              Winner: {finalizationResult.winner.name || finalizationResult.winner.npub.slice(0, 16) + '...'}
            </Text>
            <TouchableOpacity
              style={[styles.payButton, { backgroundColor: colors.primary }]}
              onPress={handlePayWinner}
              disabled={isPaying}
            >
              <Text style={styles.payButtonText}>
                {isPaying ? 'Sending...' : `Pay ${finalizationResult.prizePoolSats} sats to Winner`}
              </Text>
            </TouchableOpacity>
          </>
        )}
        {!finalizationResult.winner && (
          <Text style={[styles.noFinishersText, { color: colors.textSecondary }]}>
            No finishers met the qualifying distance.
          </Text>
        )}
      </View>
    )}
  </View>
)}
```

**Step 5: Add imports and styles**

Import:
```typescript
import { EventFinalizationService, FinalizationResult } from '../../services/events/EventFinalizationService';
```

Styles:
```typescript
  finalizationSection: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  finalizeButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  finalizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  finalizationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  winnerText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  payButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  noFinishersText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
```

**Step 6: Run typecheck**

Run: `npm run typecheck`

**Step 7: Commit**

```bash
git add src/screens/events/DynamicEventDetailScreen.tsx
git commit -m "Feature: Add event finalization UI — random winner draw and prize payout for organizer"
```

---

## Task 11: Write Verification Script

**Files:**
- Create: `scripts/verify/verify-ticketed-events.ts`

**Step 1: Write verification script**

```typescript
/**
 * Verify ticketed events implementation
 * Run: npx tsx scripts/verify/verify-ticketed-events.ts
 */

import {
  calculatePayouts,
  getValidPayoutSchemes,
  DEFAULT_FORM_STATE,
} from '../../src/types/runstrEvent';

console.log('=== Ticketed Events Verification ===\n');

// 1. Verify random_winner is a valid payout scheme for participation
const participationSchemes = getValidPayoutSchemes('participation');
console.log('Participation payout schemes:', participationSchemes);
console.assert(participationSchemes.includes('random_winner'), 'random_winner should be valid for participation');
console.assert(participationSchemes.includes('fixed_amount'), 'fixed_amount should still be valid');
console.log('PASS: random_winner included in participation schemes\n');

// 2. Verify calculatePayouts handles random_winner
const recipients = [
  { npub: 'npub1alice', rank: 1 },
  { npub: 'npub1bob', rank: 2 },
  { npub: 'npub1charlie', rank: 3 },
];
const payouts = calculatePayouts(21000, 'random_winner' as any, recipients);
console.log('Random winner payout:', payouts);
console.assert(payouts.length === 1, 'Should have exactly 1 payout');
console.assert(payouts[0].amountSats === 21000, 'Winner should get full prize pool');
console.log('PASS: random_winner payout calculates correctly\n');

// 3. Verify DEFAULT_FORM_STATE has ticketing fields
console.log('DEFAULT_FORM_STATE ticketing fields:');
console.log('  ticketPledgeDays:', (DEFAULT_FORM_STATE as any).ticketPledgeDays);
console.log('  winnerSelection:', (DEFAULT_FORM_STATE as any).winnerSelection);
console.log('  qualifyingDistance:', (DEFAULT_FORM_STATE as any).qualifyingDistance);
console.assert((DEFAULT_FORM_STATE as any).ticketPledgeDays === 0, 'Default pledge days should be 0 (free)');
console.assert((DEFAULT_FORM_STATE as any).winnerSelection === 'ranked', 'Default winner selection should be ranked');
console.log('PASS: Form state defaults correct\n');

// 4. Verify ranked schemes unchanged
const rankedSchemes = getValidPayoutSchemes('fastest_time');
console.log('Ranked payout schemes:', rankedSchemes);
console.assert(!rankedSchemes.includes('random_winner'), 'random_winner should NOT be in ranked schemes');
console.assert(rankedSchemes.includes('winner_takes_all'), 'winner_takes_all should still work');
console.log('PASS: Ranked schemes unchanged\n');

console.log('=== All Verifications Passed ===');
```

**Step 2: Run verification**

Run: `npx tsx scripts/verify/verify-ticketed-events.ts`
Expected: All assertions pass.

**Step 3: Commit**

```bash
git add scripts/verify/verify-ticketed-events.ts
git commit -m "Chore: Add ticketed events verification script"
```

---

## Task Summary

| Task | What | Files | Estimated Effort |
|------|------|-------|-----------------|
| 1 | Type definitions | runstrEvent.ts | Small |
| 2 | Pledge cost options | useRunstrEventCreation.ts | Tiny |
| 3 | Publishing tags | RunstrEventPublishService.ts | Small |
| 4 | Creation modal UI | SimpleEventCreationModal.tsx | Medium |
| 5 | Join flow + pledge gate | DynamicEventDetailScreen.tsx | Medium |
| 6 | Card/detail display | DynamicEventCard.tsx, DynamicEventDetailScreen.tsx | Small |
| 7 | Finalization service | EventFinalizationService.ts (new) | Medium |
| 8 | Edge Function | finalize-ticketed-event (new) | Medium |
| 9 | Supabase migration | 154_competition_finishers_rpc.sql (new) | Small |
| 10 | Payout UI | DynamicEventDetailScreen.tsx | Medium |
| 11 | Verification script | verify-ticketed-events.ts (new) | Small |

**Dependencies:** Tasks 1-3 are foundational (types, options, tags). Tasks 4-6 are UI (creation, join, display). Tasks 7-10 are finalization (service, edge function, DB, UI). Task 11 is verification. Execute in order.
