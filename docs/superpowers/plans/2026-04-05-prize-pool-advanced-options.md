# Prize Pool & Advanced Event Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add collapsible Advanced section to event creation (charity picker + prize pool + distribution), and implement automatic multi-recipient NWC payouts when competitions end.

**Architecture:** Prize pool config stored in existing `config` JSONB on competitions table. Charity Event template removed — charity/prize options are available on any event type via Advanced section. Finalization uses `payLightningAddress` to pay recipients sequentially. Lightning addresses resolved from `workout_submissions.raw_event` tags via updated RPC.

**Tech Stack:** React Native, TypeScript, Supabase (RPC update), NWC via @getalby/sdk

**Spec:** `docs/superpowers/specs/2026-04-05-prize-pool-advanced-options-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/utils/supabase.ts` | Modify | Add prize pool fields to `CompetitionConfig` |
| `src/components/creation/SimpleEventCreationModal.tsx` | Modify | Remove charity template, add Advanced section with charity + prize pool + distribution |
| `src/services/events/EventFinalizationService.ts` | Modify | Extend for multi-recipient payouts with prize splits |
| `src/screens/events/DynamicEventDetailScreen.tsx` | Modify | Wire auto-payout on finalize, show prize pool info and results |
| `supabase/migrations/167_finishers_with_lightning.sql` | Create | New RPC returning finishers with resolved `zap_to_address` |

---

### Task 1: Add prize pool fields to CompetitionConfig

**Files:**
- Modify: `src/utils/supabase.ts:60-85`

- [ ] **Step 1: Add prize pool fields**

In `src/utils/supabase.ts`, add these fields to the `CompetitionConfig` interface after the charity event fields (after line 84, before the closing `}`):

```typescript
  // Prize pool fields
  prize_pool_sats?: number;                     // 100, 500, 1000, or 5000
  prize_distribution?: 'top3' | 'all_participants';
  payout_results?: Array<{
    npub: string;
    name?: string;
    amount_sats: number;
    address: string;
    success: boolean;
    error?: string;
  }>;
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/utils/supabase.ts
git commit -m "Feature: Add prize pool fields to CompetitionConfig type"
```

---

### Task 2: Restructure event creation modal — remove charity template, add Advanced section

**Files:**
- Modify: `src/components/creation/SimpleEventCreationModal.tsx`

This is the largest task. The modal currently has:
- 5 templates (including Charity Event)
- Charity picker + NWC donation (only show for charity template)
- Duration, Recurring pickers

After this task:
- 4 templates (Charity Event removed)
- Duration, Recurring pickers (unchanged)
- Collapsible "Advanced" section containing: charity picker, NWC donation, prize pool presets, distribution toggle

- [ ] **Step 1: Remove Charity Event template**

In `src/components/creation/SimpleEventCreationModal.tsx`, remove the charity template entry from `EVENT_TEMPLATES` (lines 104-113):

```typescript
  // DELETE this entire entry:
  {
    key: 'charity',
    label: 'Charity Event',
    subtitle: 'Rally for a cause',
    icon: 'heart-outline',
    distanceKm: 0,
    templateId: 'charity_event',
    activityType: 'running',
    scoringMethod: 'workout_count',
  },
```

Update the file header comment (lines 1-11) to remove "Charity Event" from the template list.

- [ ] **Step 2: Add prize pool state and constants**

Add these constants after the `RECURRING_OPTIONS` array (after line 127):

```typescript
const PRIZE_POOL_OPTIONS = [
  { label: '100', sats: 100 },
  { label: '500', sats: 500 },
  { label: '1K', sats: 1000 },
  { label: '5K', sats: 5000 },
];

const DISTRIBUTION_OPTIONS: { label: string; value: 'top3' | 'all_participants' }[] = [
  { label: 'Top 3', value: 'top3' },
  { label: 'All', value: 'all_participants' },
];
```

Add these state variables in the component (after existing `hasNWC` state around line 143):

```typescript
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [prizePoolSats, setPrizePoolSats] = useState<number | null>(null);
  const [prizeDistribution, setPrizeDistribution] = useState<'top3' | 'all_participants'>('top3');
```

Update `resetForm` to clear the new state:

```typescript
  const resetForm = useCallback(() => {
    setSelectedTemplate(null);
    setDurationDays(7);
    setRecurringInterval(null);
    setSelectedCharity(null);
    setCaptainDonationSats('');
    setShowAdvanced(false);
    setPrizePoolSats(null);
    setPrizeDistribution('top3');
  }, []);
```

- [ ] **Step 3: Update validation — remove isCharityTemplate dependency**

Replace the validation block (lines 176-181) with:

```typescript
  const isValid = isEditMode
    ? true
    : selectedTemplate !== null;
```

The charity picker is now optional (in Advanced), so it no longer gates form validity.

- [ ] **Step 4: Replace charity-conditional UI with Advanced section**

Remove the charity-conditional rendering blocks:
- Remove the "Charity Picker (charity template only)" section (lines 399-429)
- Remove the "Captain NWC Donation (charity template + NWC available)" section (lines 431-447)

In their place, after the Recurring section (after line 489) and before `<View style={{ height: 100 }} />`, add the Advanced section:

```typescript
            {/* Advanced Options (create mode only) */}
            {!isEditMode && (
              <View style={s.formGroup}>
                <TouchableOpacity
                  style={s.advancedToggle}
                  onPress={() => setShowAdvanced(!showAdvanced)}
                  activeOpacity={0.7}
                >
                  <Text style={s.advancedToggleText}>Advanced</Text>
                  <Ionicons
                    name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>

                {showAdvanced && (
                  <View style={s.advancedContent}>
                    {/* Charity Picker */}
                    <View style={s.advancedGroup}>
                      <Text style={s.label}>Charity (optional)</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginHorizontal: -16 }}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                      >
                        {CHARITIES.filter(c => c.category !== 'service' && !c.isSelf && !c.isPPQ).map((charity) => {
                          const sel = selectedCharity?.id === charity.id;
                          return (
                            <TouchableOpacity
                              key={charity.id}
                              style={[s.charityCard, sel && s.charityCardSelected]}
                              onPress={() => setSelectedCharity(sel ? null : charity)}
                              activeOpacity={0.7}
                            >
                              {charity.image && (
                                <Image source={charity.image} style={s.charityImage} />
                              )}
                              <Text style={[s.charityName, sel && s.charityNameSelected]} numberOfLines={2}>
                                {charity.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>

                    {/* Captain NWC Donation (only if charity selected + NWC available) */}
                    {selectedCharity && hasNWC && (
                      <View style={s.advancedGroup}>
                        <Text style={s.label}>Charity Donation (optional)</Text>
                        <View style={s.donationRow}>
                          <TextInput
                            style={s.donationInput}
                            placeholder="0"
                            placeholderTextColor={theme.colors.textDark}
                            keyboardType="number-pad"
                            value={captainDonationSats}
                            onChangeText={setCaptainDonationSats}
                          />
                          <Text style={s.donationUnit}>sats</Text>
                        </View>
                      </View>
                    )}

                    {/* Prize Pool (only if NWC available) */}
                    {hasNWC && (
                      <View style={s.advancedGroup}>
                        <Text style={s.label}>Prize Pool (optional)</Text>
                        <View style={s.pillRow}>
                          {PRIZE_POOL_OPTIONS.map((opt) => {
                            const sel = prizePoolSats === opt.sats;
                            return (
                              <TouchableOpacity
                                key={opt.label}
                                style={[s.pill, sel && s.pillSelected]}
                                onPress={() => setPrizePoolSats(sel ? null : opt.sats)}
                                activeOpacity={0.7}
                              >
                                <Text style={[s.pillText, sel && s.pillTextSelected]}>{opt.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Distribution (only if prize pool selected) */}
                    {prizePoolSats && (
                      <View style={s.advancedGroup}>
                        <Text style={s.label}>Distribution</Text>
                        <View style={s.pillRow}>
                          {DISTRIBUTION_OPTIONS.map((opt) => {
                            const sel = prizeDistribution === opt.value;
                            return (
                              <TouchableOpacity
                                key={opt.value}
                                style={[s.pill, sel && s.pillSelected]}
                                onPress={() => setPrizeDistribution(opt.value)}
                                activeOpacity={0.7}
                              >
                                <Text style={[s.pillText, sel && s.pillTextSelected]}>{opt.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
```

Note: The charity picker now toggles on/off (tap again to deselect) since it's optional.

- [ ] **Step 5: Update handleCreate to use new state**

In `handleCreate`, update the logic:

1. Replace the `isCharityTemplate` check for captain donation (lines 244-261) with a check based on `selectedCharity`:

```typescript
      // Captain NWC donation — pay charity directly via Lightning address
      const donationAmount = parseInt(captainDonationSats, 10) || 0;
      if (donationAmount > 0 && selectedCharity) {
        if (!selectedCharity.lightningAddress) {
          showAlert('Error', 'Selected charity does not have a payment address.');
          return;
        }

        const payResult = await NWCWalletService.payLightningAddress(
          selectedCharity.lightningAddress,
          donationAmount,
        );
        if (!payResult.success) {
          showAlert('Payment Failed', payResult.error || 'Could not send donation. Event not created.');
          return;
        }
        console.log(`[SimpleEventCreation] Captain donated ${donationAmount} sats to ${selectedCharity.name}`);
      }
```

2. Replace the event name logic (lines 263-266):

```typescript
      const displayClubName = clubName || 'RUNSTR Club';
      let autoName = `${displayClubName} ${selectedTemplate.label}`;
      if (selectedCharity) {
        autoName = `${displayClubName} x ${selectedCharity.name}`;
      }
```

3. Update the charityConfig and add prizeConfig (replace lines 271-276):

```typescript
      const charityConfig = selectedCharity ? {
        charity_id: selectedCharity.id,
        charity_name: selectedCharity.name,
        charity_lightning_address: selectedCharity.lightningAddress || '',
        captain_donation_sats: donationAmount,
      } : {};

      const prizeConfig = prizePoolSats ? {
        prize_pool_sats: prizePoolSats,
        prize_distribution: prizeDistribution,
      } : {};
```

4. Spread `prizeConfig` into the config object (add after `...charityConfig` on line 304):

```typescript
          ...charityConfig,
          ...prizeConfig,
```

5. Update the success message (replace lines 325-331):

```typescript
      let successMsg = clubId
        ? autoJoinCount > 0
          ? `Event is live. ${autoJoinCount} club member${autoJoinCount === 1 ? '' : 's'} enrolled automatically.`
          : 'Event is live. No club members found to auto-enroll.'
        : 'Event is live and you have been joined automatically.';

      if (selectedCharity && donationAmount > 0) {
        successMsg += ` Your ${donationAmount} sat donation to ${selectedCharity.name} has been sent.`;
      }
      if (prizePoolSats) {
        successMsg += ` Prize pool: ${prizePoolSats} sats.`;
      }
```

6. Update the dependency array to include new state:

```typescript
  }, [isValid, selectedTemplate, durationDays, recurringInterval, clubId, clubName, clubBannerUrl, onEventCreated, showAlert, selectedCharity, captainDonationSats, prizePoolSats, prizeDistribution]);
```

- [ ] **Step 6: Add styles for Advanced section**

Add these styles to the StyleSheet (after existing styles, before the closing `});`):

```typescript
  // Advanced section
  advancedToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 4,
  },
  advancedToggleText: {
    fontSize: 13, fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted, letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  advancedContent: {
    marginTop: 8,
  },
  advancedGroup: {
    marginBottom: 16,
  },
```

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/creation/SimpleEventCreationModal.tsx
git commit -m "Feature: Replace charity template with Advanced section, add prize pool options"
```

---

### Task 3: Create migration for finishers RPC with Lightning address resolution

**Files:**
- Create: `supabase/migrations/167_finishers_with_lightning.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/167_finishers_with_lightning.sql`:

```sql
-- Updated RPC to get competition finishers with resolved zap_to_address
-- Extracts lightning address from workout_submissions.raw_event tags
-- using the same logic as the daily_rewards view

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
  workout_count BIGINT,
  lightning_address TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH finisher_stats AS (
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
  ),
  -- Get the most recent workout per finisher to resolve their lightning address
  latest_workouts AS (
    SELECT DISTINCT ON (ws.npub)
      ws.npub,
      -- Resolve zap_to_address: charity address if reward_destination='charity', else user address
      CASE
        WHEN (
          SELECT elem.value ->> 1
          FROM jsonb_array_elements(ws.raw_event -> 'tags') elem(value)
          WHERE (elem.value ->> 0) = 'reward_destination'
          LIMIT 1
        ) = 'charity' THEN (
          SELECT elem.value ->> 3
          FROM jsonb_array_elements(ws.raw_event -> 'tags') elem(value)
          WHERE (elem.value ->> 0) = 'charity'
            AND jsonb_array_length(elem.value) > 3
          LIMIT 1
        )
        ELSE (
          SELECT elem.value ->> 1
          FROM jsonb_array_elements(ws.raw_event -> 'tags') elem(value)
          WHERE (elem.value ->> 0) = 'lightning'
          LIMIT 1
        )
      END as resolved_address
    FROM workout_submissions ws
    WHERE ws.npub = ANY(p_npubs)
      AND ws.created_at >= p_start_date
      AND ws.created_at <= p_end_date
    ORDER BY ws.npub, ws.created_at DESC
  )
  SELECT
    fs.npub,
    fs.total_distance_meters,
    fs.workout_count,
    lw.resolved_address as lightning_address
  FROM finisher_stats fs
  LEFT JOIN latest_workouts lw ON lw.npub = fs.npub
  ORDER BY fs.total_distance_meters DESC;
$$;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/167_finishers_with_lightning.sql
git commit -m "Feature: Update finishers RPC to resolve lightning addresses from workout tags"
```

---

### Task 4: Extend EventFinalizationService for multi-recipient payouts

**Files:**
- Modify: `src/services/events/EventFinalizationService.ts`

- [ ] **Step 1: Add payout types and imports**

Replace the entire file `src/services/events/EventFinalizationService.ts` with:

```typescript
/**
 * EventFinalizationService
 *
 * Handles event completion: query finishers, select winners,
 * calculate prize splits, and execute payouts via NWC.
 *
 * Winner selection modes:
 * - ranked: Top finisher by total distance wins
 * - random: Deterministic random selection using SHA256 hash
 *
 * Prize distribution modes:
 * - top3: 50% / 30% / 20% (adjusts for fewer participants)
 * - all_participants: Equal split (remainder to 1st place)
 */

import CryptoJS from 'crypto-js';
import { callEdgeFunction } from '../../utils/edgeFunctions';
import NWCWalletService from '../wallet/NWCWalletService';

export interface Finisher {
  npub: string;
  totalDistanceKm: number;
  name?: string;
  lightningAddress?: string;
}

export interface PayoutRecipient {
  npub: string;
  name?: string;
  amount_sats: number;
  address: string;
  success: boolean;
  error?: string;
}

export interface FinalizationResult {
  eventId: string;
  finishers: Finisher[];
  winner?: Finisher;
  winnerSelection: 'ranked' | 'random';
  prizePoolSats: number;
  payoutResults?: PayoutRecipient[];
}

class EventFinalizationServiceClass {

  /**
   * Finalize a competition — query finishers, select winner(s), and optionally pay out
   */
  async finalizeEvent(
    eventId: string,
    winnerSelection: 'ranked' | 'random',
    qualifyingDistanceKm: number,
    prizePoolSats: number,
  ): Promise<FinalizationResult> {
    const finishers = await this.getFinishers(eventId, qualifyingDistanceKm);

    if (finishers.length === 0) {
      return { eventId, finishers: [], winnerSelection, prizePoolSats };
    }

    let winner: Finisher | undefined;

    if (winnerSelection === 'random') {
      winner = this.selectRandomWinner(eventId, finishers);
    } else {
      winner = [...finishers].sort((a, b) => b.totalDistanceKm - a.totalDistanceKm)[0];
    }

    return { eventId, finishers, winner, winnerSelection, prizePoolSats };
  }

  /**
   * Calculate prize splits based on distribution mode
   */
  calculateSplits(
    finishers: Finisher[],
    prizePoolSats: number,
    distribution: 'top3' | 'all_participants',
  ): PayoutRecipient[] {
    if (finishers.length === 0 || prizePoolSats <= 0) return [];

    if (distribution === 'all_participants') {
      const perPerson = Math.floor(prizePoolSats / finishers.length);
      const remainder = prizePoolSats - (perPerson * finishers.length);

      return finishers.map((f, i) => ({
        npub: f.npub,
        name: f.name,
        amount_sats: perPerson + (i === 0 ? remainder : 0),
        address: f.lightningAddress || '',
        success: false,
        error: undefined,
      }));
    }

    // top3 distribution: 50/30/20 (adjusts for fewer)
    const ranked = [...finishers].sort((a, b) => b.totalDistanceKm - a.totalDistanceKm);
    const top = ranked.slice(0, 3);

    let percentages: number[];
    if (top.length === 1) {
      percentages = [100];
    } else if (top.length === 2) {
      percentages = [60, 40];
    } else {
      percentages = [50, 30, 20];
    }

    let allocated = 0;
    return top.map((f, i) => {
      const isLast = i === top.length - 1;
      const amount = isLast
        ? prizePoolSats - allocated
        : Math.floor(prizePoolSats * percentages[i] / 100);
      allocated += amount;

      return {
        npub: f.npub,
        name: f.name,
        amount_sats: amount,
        address: f.lightningAddress || '',
        success: false,
        error: undefined,
      };
    });
  }

  /**
   * Execute payouts to all recipients sequentially via NWC
   */
  async executePayout(recipients: PayoutRecipient[]): Promise<PayoutRecipient[]> {
    const results: PayoutRecipient[] = [];

    for (const recipient of recipients) {
      if (!recipient.address) {
        results.push({ ...recipient, success: false, error: 'No rewards address' });
        continue;
      }

      if (recipient.amount_sats <= 0) {
        results.push({ ...recipient, success: false, error: 'Amount is zero' });
        continue;
      }

      try {
        console.log(`[EventFinalization] Paying ${recipient.amount_sats} sats to ${recipient.address}`);
        const payResult = await NWCWalletService.payLightningAddress(
          recipient.address,
          recipient.amount_sats,
        );

        results.push({
          ...recipient,
          success: payResult.success,
          error: payResult.success ? undefined : payResult.error,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Payment failed';
        console.error(`[EventFinalization] Payment error for ${recipient.npub}:`, msg);
        results.push({ ...recipient, success: false, error: msg });
      }
    }

    return results;
  }

  /**
   * Query finishers who met the qualifying distance
   */
  async getFinishers(eventId: string, qualifyingDistanceKm: number): Promise<Finisher[]> {
    const result = await callEdgeFunction<{ finishers: Finisher[] }>('finalize-ticketed-event', {
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

    const hash = CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
    const hashPrefix = hash.substring(0, 8);
    const hashNumber = parseInt(hashPrefix, 16);
    const winnerIndex = hashNumber % finishers.length;

    console.log(`[EventFinalization] Random winner: index ${winnerIndex} of ${finishers.length} finishers`);
    return finishers[winnerIndex];
  }
}

export const EventFinalizationService = new EventFinalizationServiceClass();
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/services/events/EventFinalizationService.ts
git commit -m "Feature: Extend EventFinalizationService with multi-recipient payouts and prize splits"
```

---

### Task 5: Wire auto-payout in DynamicEventDetailScreen

**Files:**
- Modify: `src/screens/events/DynamicEventDetailScreen.tsx`

- [ ] **Step 1: Import PayoutRecipient type**

Update the import from EventFinalizationService (around line 34) to include the new type:

```typescript
import { EventFinalizationService, FinalizationResult, PayoutRecipient } from '../../services/events/EventFinalizationService';
```

- [ ] **Step 2: Replace handleFinalize with auto-payout version**

Replace `handleFinalize` (lines 355-372) and `handlePayWinner` (lines 374-419) with a single function:

```typescript
  const handleFinalize = async () => {
    if (!competition?.config) return;
    setIsFinalizing(true);
    try {
      const config = competition.config;
      const prizePoolSats = config.prize_pool_sats || competition.prize_pool_sats || 0;
      const distribution = config.prize_distribution || 'top3';

      // Step 1: Get finishers
      const result = await EventFinalizationService.finalizeEvent(
        competition.id,
        (config.winner_selection as 'ranked' | 'random') || 'ranked',
        distribution === 'all_participants' ? 0 : (config.qualifying_distance_km || 0),
        prizePoolSats,
      );
      setFinalizationResult(result);

      // Step 2: Auto-payout if prize pool exists
      if (prizePoolSats > 0 && result.finishers.length > 0) {
        setIsPaying(true);

        const recipients = EventFinalizationService.calculateSplits(
          result.finishers,
          prizePoolSats,
          distribution,
        );

        const payoutResults = await EventFinalizationService.executePayout(recipients);

        // Update finalization result with payout info
        setFinalizationResult(prev => prev ? { ...prev, payoutResults } : prev);

        // Store results in competition config
        try {
          await callEdgeFunction('manage-competition', {
            action: 'update',
            competition_id: competition.id,
            npub: await AsyncStorage.getItem('@runstr:npub') || '',
            updates: {
              config: { ...config, payout_results: payoutResults },
            },
          });
        } catch (e) {
          console.warn('[DynamicEventDetail] Failed to persist payout results:', e);
        }

        // Show summary
        const successCount = payoutResults.filter(p => p.success).length;
        const failCount = payoutResults.filter(p => !p.success).length;
        const totalPaid = payoutResults.filter(p => p.success).reduce((sum, p) => sum + p.amount_sats, 0);

        let summary = `Paid ${totalPaid} sats to ${successCount} recipient${successCount !== 1 ? 's' : ''}.`;
        if (failCount > 0) {
          summary += ` ${failCount} payment${failCount !== 1 ? 's' : ''} failed.`;
        }
        Alert.alert('Event Finalized', summary);

        setIsPaying(false);
      } else if (result.finishers.length === 0) {
        Alert.alert('No Finishers', 'No participants met the qualifying criteria.');
      } else {
        Alert.alert('Event Finalized', `${result.finishers.length} finisher${result.finishers.length !== 1 ? 's' : ''}.`);
      }
    } catch (error) {
      console.error('[DynamicEventDetail] Finalization error:', error);
      Alert.alert('Error', 'Failed to finalize event. Please try again.');
    } finally {
      setIsFinalizing(false);
      setIsPaying(false);
    }
  };
```

- [ ] **Step 3: Add prize pool info display**

Find where event metadata is displayed in the render (near the event name/status area). After the charity banner section, add:

```typescript
              {/* Prize Pool Info */}
              {competition?.config?.prize_pool_sats && (
                <View style={styles.prizePoolBanner}>
                  <Ionicons name="trophy-outline" size={20} color={theme.colors.primary} />
                  <View style={styles.prizePoolText}>
                    <Text style={styles.prizePoolAmount}>
                      {competition.config.prize_pool_sats.toLocaleString()} sats prize pool
                    </Text>
                    <Text style={styles.prizePoolDistribution}>
                      {competition.config.prize_distribution === 'all_participants'
                        ? 'Split among all participants'
                        : 'Top 3: 50% / 30% / 20%'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Payout Results (after finalization) */}
              {competition?.config?.payout_results && (
                <View style={styles.payoutResults}>
                  <Text style={s.label}>Payout Results</Text>
                  {competition.config.payout_results.map((p, i) => (
                    <View key={i} style={styles.payoutRow}>
                      <Text style={styles.payoutName} numberOfLines={1}>
                        {p.name || p.npub.slice(0, 12) + '...'}
                      </Text>
                      <Text style={[styles.payoutAmount, !p.success && styles.payoutFailed]}>
                        {p.success ? `${p.amount_sats} sats` : 'Failed'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
```

Note: Reference `s.label` if the detail screen uses `s` for its StyleSheet variable, or `styles.label` if it uses `styles`. Check the file — this screen uses `styles` as its stylesheet variable name.

- [ ] **Step 4: Remove old handlePayWinner references**

Search the render for any buttons/UI that reference `handlePayWinner` or `isPaying` for the old single-winner flow. Remove the old "Pay Winner" button. The finalize button now handles everything automatically.

- [ ] **Step 5: Add styles**

Add these to the StyleSheet:

```typescript
  prizePoolBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, marginHorizontal: 16, marginTop: 8,
    backgroundColor: theme.colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  prizePoolText: {
    flex: 1,
  },
  prizePoolAmount: {
    fontSize: 15, fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  prizePoolDistribution: {
    fontSize: 13, color: theme.colors.textMuted, marginTop: 2,
  },
  payoutResults: {
    paddingHorizontal: 16, marginTop: 12,
  },
  payoutRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  payoutName: {
    fontSize: 14, color: theme.colors.text, flex: 1,
  },
  payoutAmount: {
    fontSize: 14, fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.primary,
  },
  payoutFailed: {
    color: '#ff4444',
  },
```

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/screens/events/DynamicEventDetailScreen.tsx
git commit -m "Feature: Auto-payout on finalize, show prize pool info and results"
```

---

### Task 6: Verification

**Files:**
- Create: `scripts/verify/verify-prize-pool.ts`

- [ ] **Step 1: Write verification script**

Create `scripts/verify/verify-prize-pool.ts`:

```typescript
import * as fs from 'fs';

const errors: string[] = [];

// Check CompetitionConfig has prize pool fields
const supabaseTs = fs.readFileSync('src/utils/supabase.ts', 'utf-8');
for (const field of ['prize_pool_sats', 'prize_distribution', 'payout_results']) {
  if (!supabaseTs.includes(field)) {
    errors.push(`Missing field '${field}' in CompetitionConfig`);
  }
}

// Check SimpleEventCreationModal has Advanced section
const modalTs = fs.readFileSync('src/components/creation/SimpleEventCreationModal.tsx', 'utf-8');
if (modalTs.includes("key: 'charity'")) {
  errors.push('Charity template still exists — should be removed');
}
if (!modalTs.includes('showAdvanced')) {
  errors.push('Missing showAdvanced state');
}
if (!modalTs.includes('PRIZE_POOL_OPTIONS')) {
  errors.push('Missing PRIZE_POOL_OPTIONS constant');
}
if (!modalTs.includes('DISTRIBUTION_OPTIONS')) {
  errors.push('Missing DISTRIBUTION_OPTIONS constant');
}
if (!modalTs.includes('prizePoolSats')) {
  errors.push('Missing prizePoolSats state');
}

// Check EventFinalizationService has payout methods
const finService = fs.readFileSync('src/services/events/EventFinalizationService.ts', 'utf-8');
if (!finService.includes('calculateSplits')) {
  errors.push('Missing calculateSplits method in EventFinalizationService');
}
if (!finService.includes('executePayout')) {
  errors.push('Missing executePayout method in EventFinalizationService');
}
if (!finService.includes('PayoutRecipient')) {
  errors.push('Missing PayoutRecipient interface');
}
if (!finService.includes('payLightningAddress')) {
  errors.push('Missing payLightningAddress usage in EventFinalizationService');
}

// Check DynamicEventDetailScreen has prize pool display
const detailTs = fs.readFileSync('src/screens/events/DynamicEventDetailScreen.tsx', 'utf-8');
if (!detailTs.includes('prizePoolBanner')) {
  errors.push('Missing prizePoolBanner in detail screen');
}
if (!detailTs.includes('payoutResults')) {
  errors.push('Missing payoutResults display in detail screen');
}
if (!detailTs.includes('calculateSplits')) {
  errors.push('Missing calculateSplits call in detail screen');
}

// Check migration exists
if (!fs.existsSync('supabase/migrations/167_finishers_with_lightning.sql')) {
  errors.push('Missing migration 167_finishers_with_lightning.sql');
}

if (errors.length > 0) {
  console.error('VERIFICATION FAILED:');
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log('All prize pool checks passed!');
}
```

- [ ] **Step 2: Run verification**

Run: `npx tsx scripts/verify/verify-prize-pool.ts`
Expected: "All prize pool checks passed!"

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add scripts/verify/verify-prize-pool.ts
git commit -m "Chore: Add prize pool verification script"
```
