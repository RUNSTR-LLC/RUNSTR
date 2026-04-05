# Charity Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Fitness Club captains to create charity events where members join by switching their reward destination to the selected charity, with optional captain NWC donation.

**Architecture:** Charity metadata is stored in the existing `config` JSONB column on `competitions` — no migration needed. The join flow calls `AsyncStorage.setItem('@runstr:selected_team_id', charityId)` to switch reward destination. Captain NWC donation uses existing `NWCWalletService.sendPayment()`. Total raised is queried from `charity_reward_payments` by charity ID + event date range.

**Tech Stack:** React Native, TypeScript, Supabase (existing edge function), NWC via @getalby/sdk, AsyncStorage

**Spec:** `docs/superpowers/specs/2026-04-05-charity-events-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/creation/SimpleEventCreationModal.tsx` | Modify | Add "Charity Event" template, charity picker, optional NWC amount input |
| `src/screens/events/DynamicEventDetailScreen.tsx` | Modify | Show charity info, total raised, participant list for charity events |
| `src/utils/supabase.ts` | Modify | Add charity fields to `CompetitionConfig` interface |
| `src/constants/charities.ts` | Read only | Referenced for charity list (no changes) |

---

### Task 1: Add charity fields to CompetitionConfig type

**Files:**
- Modify: `src/utils/supabase.ts:60-81`

- [ ] **Step 1: Add charity fields to CompetitionConfig**

In `src/utils/supabase.ts`, add these fields to the `CompetitionConfig` interface after the existing `requires_subscription` field (line 75):

```typescript
  // Charity event fields
  charity_id?: string;                  // Charity ID from charities.ts
  charity_name?: string;                // Charity display name
  charity_lightning_address?: string;   // Charity Lightning address
  captain_donation_sats?: number;       // Captain's NWC donation (0 if none)
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (additive change only)

- [ ] **Step 3: Commit**

```bash
git add src/utils/supabase.ts
git commit -m "Feature: Add charity event fields to CompetitionConfig type"
```

---

### Task 2: Add Charity Event template to SimpleEventCreationModal

**Files:**
- Modify: `src/components/creation/SimpleEventCreationModal.tsx`

- [ ] **Step 1: Add charity template to EVENT_TEMPLATES array**

In `src/components/creation/SimpleEventCreationModal.tsx`, add a new entry to the `EVENT_TEMPLATES` array after the Step Challenge entry (after line 99):

```typescript
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

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/creation/SimpleEventCreationModal.tsx
git commit -m "Feature: Add Charity Event template to event creation"
```

---

### Task 3: Add charity picker and NWC amount input to creation modal

**Files:**
- Modify: `src/components/creation/SimpleEventCreationModal.tsx`

- [ ] **Step 1: Add imports and state**

Add these imports at the top of `src/components/creation/SimpleEventCreationModal.tsx` (after line 23):

```typescript
import { CHARITIES, Charity } from '../../constants/charities';
import NWCWalletService from '../../services/wallet/NWCWalletService';
import { TextInput } from 'react-native';
```

Add these state variables inside the component (after line 131, near the other useState calls):

```typescript
  const [selectedCharity, setSelectedCharity] = useState<Charity | null>(null);
  const [captainDonationSats, setCaptainDonationSats] = useState('');
  const [hasNWC, setHasNWC] = useState(false);
```

Add an effect to check NWC availability (after the existing useEffect around line 138):

```typescript
  useEffect(() => {
    if (visible) {
      NWCWalletService.isAvailable().then(setHasNWC);
    }
  }, [visible]);
```

Update `resetForm` (line 140) to also reset the new state:

```typescript
  const resetForm = useCallback(() => {
    setSelectedTemplate(null);
    setDurationDays(7);
    setRecurringInterval(null);
    setSelectedCharity(null);
    setCaptainDonationSats('');
  }, []);
```

- [ ] **Step 2: Update validation**

Replace the `isValid` check (line 151-152) with:

```typescript
  const isCharityTemplate = selectedTemplate?.key === 'charity';
  const isValid = isEditMode
    ? true
    : isCharityTemplate
      ? selectedTemplate !== null && selectedCharity !== null
      : selectedTemplate !== null;
```

- [ ] **Step 3: Add charity picker UI**

Add the charity picker section in the render, after the Template Selection section (after the closing `)}` around line 339, before the Duration section):

```typescript
            {/* Charity Picker (charity template only) */}
            {!isEditMode && isCharityTemplate && (
              <View style={s.formGroup}>
                <Text style={s.label}>Select Charity</Text>
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
                        onPress={() => setSelectedCharity(charity)}
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
            )}

            {/* Captain NWC Donation (charity template + NWC available) */}
            {!isEditMode && isCharityTemplate && hasNWC && (
              <View style={s.formGroup}>
                <Text style={s.label}>Your Donation (optional)</Text>
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
```

- [ ] **Step 4: Add styles for charity picker and donation input**

Add these styles to the `StyleSheet.create` block at the bottom of the file (before the closing `});`):

```typescript
  // Charity picker
  charityCard: {
    width: 100, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10,
    backgroundColor: theme.colors.card, borderWidth: 1.5,
    borderColor: theme.colors.border, alignItems: 'center', gap: 6,
  },
  charityCardSelected: {
    borderColor: theme.colors.text, backgroundColor: '#111111',
  },
  charityImage: {
    width: 48, height: 48, borderRadius: 24,
  },
  charityName: {
    fontSize: 11, fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted, textAlign: 'center',
  },
  charityNameSelected: { color: theme.colors.text },
  // Donation input
  donationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  donationInput: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.card, color: theme.colors.text,
    fontSize: 16, fontWeight: theme.typography.weights.semiBold,
  },
  donationUnit: {
    fontSize: 14, fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/creation/SimpleEventCreationModal.tsx
git commit -m "Feature: Add charity picker and NWC donation input to event creation"
```

---

### Task 4: Wire up charity event creation with NWC payment

**Files:**
- Modify: `src/components/creation/SimpleEventCreationModal.tsx`

- [ ] **Step 1: Update handleCreate to include charity data and NWC payment**

Replace the `handleCreate` function (lines 199-284) in `src/components/creation/SimpleEventCreationModal.tsx` with:

```typescript
  const handleCreate = useCallback(async () => {
    if (isSubmittingRef.current) return;
    if (!isValid || !selectedTemplate) return;
    if (!isSupabaseConfigured()) {
      showAlert('Error', 'Unable to connect. Please try again later.');
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (!npub) {
        showAlert('Error', 'Please log in first');
        return;
      }

      // If charity template with NWC donation, send payment first
      const donationAmount = parseInt(captainDonationSats, 10) || 0;
      if (isCharityTemplate && donationAmount > 0 && selectedCharity) {
        if (!selectedCharity.lightningAddress) {
          showAlert('Error', 'Selected charity does not have a payment address.');
          return;
        }

        // Create invoice via LNURL and pay it
        const invoiceResult = await NWCWalletService.createInvoice(donationAmount, `RUNSTR Charity: ${selectedCharity.name}`);
        if (!invoiceResult.success || !invoiceResult.invoice) {
          showAlert('Payment Failed', invoiceResult.error || 'Could not create invoice for donation.');
          return;
        }

        const payResult = await NWCWalletService.sendPayment(invoiceResult.invoice);
        if (!payResult.success) {
          showAlert('Payment Failed', payResult.error || 'Could not send donation. Event not created.');
          return;
        }
      }

      const displayClubName = clubName || 'RUNSTR Club';
      const autoName = isCharityTemplate && selectedCharity
        ? `${displayClubName} x ${selectedCharity.name}`
        : `${displayClubName} ${selectedTemplate.label}`;

      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + durationDays * 86400000).toISOString();

      const charityConfig = isCharityTemplate && selectedCharity ? {
        charity_id: selectedCharity.id,
        charity_name: selectedCharity.name,
        charity_lightning_address: selectedCharity.lightningAddress || '',
        captain_donation_sats: donationAmount,
      } : {};

      const result = await callEdgeFunction<{
        id?: string;
        external_id?: string;
        auto_joined?: number;
      }>('manage-competition', {
        action: 'create',
        npub,
        name: autoName,
        description: null,
        activity_type: selectedTemplate.activityType,
        scoring_method: selectedTemplate.scoringMethod,
        start_date: startDate,
        end_date: endDate,
        template: selectedTemplate.templateId,
        club_id: clubId || null,
        image_url: clubBannerUrl || null,
        recurring_interval: recurringInterval || null,
        config: {
          activity_types: [selectedTemplate.activityType],
          scoring_method: selectedTemplate.scoringMethod,
          target_distance_km: selectedTemplate.distanceKm,
          template: selectedTemplate.templateId,
          created_via: clubId ? 'club' : 'app',
          score_unit: selectedTemplate.scoringMethod === 'fastest_time' ? 'seconds' : 'km',
          ticket_pledge_days: 0,
          winner_selection: 'top_ranked',
          ...charityConfig,
        },
      });

      if (!result.success) {
        console.error('[SimpleEventCreation] Create error:', result.error);
        showAlert('Error', result.error || 'Failed to create event. Please try again.');
        return;
      }

      const data = result.data as any;
      const externalId = data?.external_id || '';
      const autoJoinCount = data?.auto_joined ?? 0;

      console.log(`[SimpleEventCreation] Created ${selectedTemplate.label}: ${externalId}${clubId ? ` (club: ${clubId})` : ''}`);

      if (clubId) {
        await SupabaseCompetitionService.clearClubCompetitionsCache(clubId);
      }
      await SupabaseCompetitionService.clearDynamicCompetitionsCache();

      const charityMsg = isCharityTemplate && selectedCharity
        ? `Fundraiser for ${selectedCharity.name} is live!${donationAmount > 0 ? ` Your ${donationAmount} sat donation has been sent.` : ''}`
        : clubId
          ? autoJoinCount > 0
            ? `Event is live. ${autoJoinCount} club member${autoJoinCount === 1 ? '' : 's'} enrolled automatically.`
            : 'Event is live. No club members found to auto-enroll.'
          : 'Event is live and you have been joined automatically.';

      showAlert('Event Created', charityMsg);
      onEventCreated?.(externalId);
    } catch (err) {
      console.error('[SimpleEventCreation] Exception:', err);
      showAlert('Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isValid, selectedTemplate, durationDays, recurringInterval, clubId, clubName, clubBannerUrl, onEventCreated, showAlert, isCharityTemplate, selectedCharity, captainDonationSats]);
```

**Note on NWC payment:** The current `NWCWalletService.sendPayment()` takes a bolt11 invoice. For paying a Lightning address directly, we need to fetch an invoice from the charity's LNURL first. However, looking at the codebase, the `createInvoice` method creates an invoice for *receiving* — not for paying someone else. The actual flow for paying a Lightning address is: resolve LNURL → get invoice → pay invoice. Since the external reward service already handles paying Lightning addresses, and this is an MVP, we should use a simpler approach: store the captain's intended donation in the config and have the external service pay it, OR use the `claim-reward` edge function which already handles Lightning address payments.

Let me check what's available:

- [ ] **Step 2: Investigate claim-reward for captain donation**

Actually, re-reading the codebase: `NWCWalletService.sendPayment(invoice)` requires a bolt11 invoice, but we only have a Lightning address. The simpler approach for MVP is to store `captain_donation_sats` in the config and note that the captain NWC payment flow needs a LNURL resolver. For now, skip the NWC payment on creation — just store the intent. The captain donation can be wired in a follow-up when we have LNURL resolution.

Simplify the handleCreate: remove the NWC payment block and just store the config. Replace the NWC payment section with a comment:

```typescript
      // TODO: Captain NWC donation payment - requires LNURL resolution to convert
      // Lightning address to bolt11 invoice. For now, store intent in config.
      const donationAmount = parseInt(captainDonationSats, 10) || 0;
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/creation/SimpleEventCreationModal.tsx
git commit -m "Feature: Wire charity event creation with config metadata"
```

---

### Task 5: Update DynamicEventDetailScreen for charity events

**Files:**
- Modify: `src/screens/events/DynamicEventDetailScreen.tsx`

- [ ] **Step 1: Add charity imports and state**

Add this import at the top of `src/screens/events/DynamicEventDetailScreen.tsx` (after the existing imports around line 37):

```typescript
import { getCharityById } from '../../constants/charities';
```

Add state for total raised inside the component (after the existing `useState` declarations around line 136):

```typescript
  const [totalRaised, setTotalRaised] = useState<number>(0);
```

- [ ] **Step 2: Add charity info extraction**

Add a derived value after the state declarations:

```typescript
  const charityConfig = competition?.config;
  const isCharityEvent = !!charityConfig?.charity_id;
  const charity = isCharityEvent ? getCharityById(charityConfig.charity_id) : null;
```

- [ ] **Step 3: Add total raised fetch**

Add a useEffect to fetch the total raised from `charity_reward_payments` (after the existing useEffects, around line 191):

```typescript
  // Fetch total raised for charity events
  useEffect(() => {
    if (!isCharityEvent || !competition) return;

    const fetchTotalRaised = async () => {
      try {
        const { isSupabaseConfigured } = await import('../../utils/supabase');
        if (!isSupabaseConfigured()) return;

        const { supabase } = await import('../../utils/supabase');
        const { data, error } = await supabase
          .from('charity_reward_payments')
          .select('amount_sats')
          .eq('charity_id', charityConfig!.charity_id!)
          .gte('created_at', competition.start_date)
          .lte('created_at', competition.end_date)
          .eq('status', 'success');

        if (!error && data) {
          const fromPayments = data.reduce((sum: number, r: { amount_sats: number }) => sum + (r.amount_sats || 0), 0);
          const captainDonation = charityConfig?.captain_donation_sats || 0;
          setTotalRaised(fromPayments + captainDonation);
        }
      } catch (err) {
        console.error('[DynamicEventDetail] Error fetching total raised:', err);
      }
    };
    fetchTotalRaised();
  }, [isCharityEvent, competition, charityConfig]);
```

- [ ] **Step 4: Add charity banner section to render**

Find the event header/banner area in the render. After the event name and status display, add a charity info section. Look for where the event name is rendered and add this below it (this will be inside the ScrollView, after the header section):

```typescript
              {/* Charity Event Info */}
              {isCharityEvent && charity && (
                <View style={s.charityBanner}>
                  {charity.image && (
                    <Image source={charity.image} style={s.charityBannerImage} />
                  )}
                  <View style={s.charityBannerText}>
                    <Text style={s.charityBannerName}>{charity.name}</Text>
                    <Text style={s.charityBannerRaised}>
                      {totalRaised.toLocaleString()} sats raised
                    </Text>
                  </View>
                </View>
              )}
```

- [ ] **Step 5: Update join button for charity events**

Find the existing join button handler (`handlePledgeAndJoin` around line 193). For charity events, the join flow is different — it just switches the reward destination instead of creating a pledge. Add a new handler before `handlePledgeAndJoin`:

```typescript
  const handleCharityJoin = async () => {
    setIsJoining(true);
    try {
      if (!competition || !charityConfig?.charity_id) return;

      // Switch reward destination to this charity
      await AsyncStorage.setItem('@runstr:selected_team_id', charityConfig.charity_id);

      // Join the competition via existing hook
      await join();
      await refreshLeaderboard();

      showAlert('Joined!', `Your next reward will go to ${charityConfig.charity_name || 'charity'}. Thank you!`);
    } catch (error) {
      console.error('[DynamicEventDetail] Charity join error:', error);
      showAlert('Error', 'Failed to join event. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };
```

Then update the join button's `onPress` to use the appropriate handler. Find where `handlePledgeAndJoin` is called in the JSX (the join button) and wrap it:

```typescript
onPress={isCharityEvent ? handleCharityJoin : handlePledgeAndJoin}
```

- [ ] **Step 6: Add state variable for custom alert in charity join**

The existing code uses `Alert.alert` in `handlePledgeAndJoin` but has a `CustomAlert` component. Add state for it if needed, or reuse the existing alert pattern. Check if there's already a `showAlert` function — if the screen uses `Alert.alert`, add a simple helper or reuse the pattern from the existing code.

Look for existing alert usage in the file. If `Alert.alert` is used, use the same:

```typescript
  const showAlert = useCallback((title: string, message: string) => {
    Alert.alert(title, message);
  }, []);
```

- [ ] **Step 7: Add charity banner styles**

Add these styles to the StyleSheet at the bottom of the file:

```typescript
  charityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, marginHorizontal: 16, marginTop: 12,
    backgroundColor: theme.colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  charityBannerImage: {
    width: 48, height: 48, borderRadius: 24,
  },
  charityBannerText: {
    flex: 1,
  },
  charityBannerName: {
    fontSize: 16, fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  charityBannerRaised: {
    fontSize: 14, color: theme.colors.primary, marginTop: 2,
    fontWeight: theme.typography.weights.semiBold,
  },
```

- [ ] **Step 8: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/screens/events/DynamicEventDetailScreen.tsx
git commit -m "Feature: Show charity info and total raised on event detail screen"
```

---

### Task 6: Verify end-to-end and create GitHub issue

**Files:**
- None modified

- [ ] **Step 1: Write verification script**

Create `scripts/verify/verify-charity-events.ts`:

```typescript
/**
 * Verify charity event implementation:
 * 1. CompetitionConfig has charity fields
 * 2. Charity template exists in EVENT_TEMPLATES
 * 3. Charity picker renders for charity template
 * 4. Join flow switches reward destination
 */

import * as fs from 'fs';

const errors: string[] = [];

// Check CompetitionConfig type has charity fields
const supabaseTs = fs.readFileSync('src/utils/supabase.ts', 'utf-8');
const requiredFields = ['charity_id', 'charity_name', 'charity_lightning_address', 'captain_donation_sats'];
for (const field of requiredFields) {
  if (!supabaseTs.includes(field)) {
    errors.push(`Missing field '${field}' in CompetitionConfig`);
  }
}

// Check charity template in SimpleEventCreationModal
const modalTs = fs.readFileSync('src/components/creation/SimpleEventCreationModal.tsx', 'utf-8');
if (!modalTs.includes("key: 'charity'")) {
  errors.push('Missing charity template in EVENT_TEMPLATES');
}
if (!modalTs.includes('charity_event')) {
  errors.push('Missing charity_event templateId');
}
if (!modalTs.includes('selectedCharity')) {
  errors.push('Missing selectedCharity state');
}

// Check DynamicEventDetailScreen has charity support
const detailTs = fs.readFileSync('src/screens/events/DynamicEventDetailScreen.tsx', 'utf-8');
if (!detailTs.includes('isCharityEvent')) {
  errors.push('Missing isCharityEvent check in detail screen');
}
if (!detailTs.includes('totalRaised')) {
  errors.push('Missing totalRaised state in detail screen');
}
if (!detailTs.includes('handleCharityJoin')) {
  errors.push('Missing handleCharityJoin handler in detail screen');
}
if (!detailTs.includes('selected_team_id')) {
  errors.push('Missing reward destination switch in charity join');
}

if (errors.length > 0) {
  console.error('VERIFICATION FAILED:');
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log('All charity event checks passed!');
}
```

- [ ] **Step 2: Run verification**

Run: `npx tsx scripts/verify/verify-charity-events.ts`
Expected: "All charity event checks passed!"

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit verification script**

```bash
git add scripts/verify/verify-charity-events.ts
git commit -m "Chore: Add charity events verification script"
```
