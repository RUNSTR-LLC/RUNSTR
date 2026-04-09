# Sponsor Name in Reward Notifications — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Include the active reward sponsor name in all reward notification paths (push notifications, in-app toasts) so users see messages like "You earned 800 sats from Cash App".

**Architecture:** Three notification paths need the sponsor name: (1) server-side push via `claim-reward` edge function, (2) in-app toasts via `RewardNotificationManager`, and (3) the `RewardPollingService` that bridges Supabase payment records to toast calls. The existing `SponsorService` (client) and `reward_sponsors` table (server) already provide the sponsor — we just wire it in.

**Tech Stack:** Supabase Edge Functions (Deno), React Native, TypeScript, react-native-toast-message

---

### Task 1: Add sponsor lookup helper to claim-reward edge function

**Files:**
- Modify: `supabase/functions/claim-reward/index.ts:1180-1186` (after supabase client init, before destructuring body)

**Step 1: Add a `getActiveSponsorName` helper function**

Add this helper near the top of the file (after the constants around line 28):

```typescript
/**
 * Fetch the active reward sponsor name from the database.
 * Returns 'RUNSTR' as fallback if no active sponsor found.
 */
async function getActiveSponsorName(supabase: any): Promise<string> {
  try {
    const { data } = await supabase
      .from('reward_sponsors')
      .select('name')
      .eq('is_active', true)
      .maybeSingle()
    return data?.name || 'RUNSTR'
  } catch {
    return 'RUNSTR'
  }
}
```

**Step 2: Call the helper inside the `claim_reward` operation block**

At line ~1185 (after `const supabase = createClient(...)`, before the destructuring), add:

```typescript
const sponsorName = await getActiveSponsorName(supabase)
```

**Step 3: Commit**

```bash
git add supabase/functions/claim-reward/index.ts
git commit -m "Feature: Add sponsor name lookup helper to claim-reward edge function"
```

---

### Task 2: Update workout reward push notification copy to include sponsor

**Files:**
- Modify: `supabase/functions/claim-reward/index.ts:1316-1336` (workout reward push notification block)

**Step 1: Update the notification title and body**

Replace the notification block (lines ~1316-1336):

```typescript
          // Fire-and-forget push notification
          if (npub) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')
            if (supabaseUrl) {
              const notificationBody = team_name
                ? `You earned ${rewardAmount} sats from ${sponsorName} for ${team_name}`
                : `You earned ${rewardAmount} sats from ${sponsorName} for your workout`
              fetch(`${supabaseUrl}/functions/v1/notify-user`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  npub,
                  title: `Reward from ${sponsorName}!`,
                  body: notificationBody,
                  data: { type: 'reward_earned', sats: rewardAmount, screen: 'Rewards' },
                  channelId: 'bitcoin_rewards',
                }),
              }).catch(() => {}) // Fire-and-forget
            }
          }
```

**Step 2: Commit**

```bash
git add supabase/functions/claim-reward/index.ts
git commit -m "Feature: Include sponsor name in workout reward push notifications"
```

---

### Task 3: Update step reward push notification copy to include sponsor

**Files:**
- Modify: `supabase/functions/claim-reward/index.ts:1423-1441` (step reward push notification block)

**Step 1: Update the step reward notification**

Replace the step notification block (lines ~1423-1441):

```typescript
          // Fire-and-forget push notification
          if (npub) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')
            if (supabaseUrl) {
              fetch(`${supabaseUrl}/functions/v1/notify-user`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  npub,
                  title: `Steps Rewarded by ${sponsorName}!`,
                  body: `You earned ${amountToPay} sats from ${sponsorName} for your steps today`,
                  data: { type: 'step_reward_earned', sats: amountToPay },
                  channelId: 'bitcoin_rewards',
                }),
              }).catch(() => {}) // Fire-and-forget
            }
          }
```

**Step 2: Commit**

```bash
git add supabase/functions/claim-reward/index.ts
git commit -m "Feature: Include sponsor name in step reward push notifications"
```

---

### Task 4: Add sponsorName parameter to RewardNotificationManager

**Files:**
- Modify: `src/services/rewards/RewardNotificationManager.ts:141-208` (all show* methods)

**Step 1: Update `showRewardConfirmed` to accept and display sponsor name**

```typescript
  showRewardConfirmed(amount: number, sponsorName?: string): void {
    console.log('[RewardNotification] showRewardConfirmed called:', { amount, sponsorName });

    const fromSponsor = sponsorName ? ` from ${sponsorName}` : '';
    Toast.show({
      type: 'rewardConfirmed',
      text1: 'Reward Received!',
      text2: `${amount} sats${fromSponsor} sent to your wallet`,
      position: 'top',
      visibilityTime: 5000,
    });
  }
```

**Step 2: Update `showRewardDonated` to accept and display sponsor name**

```typescript
  showRewardDonated(amount: number, charityName: string, sponsorName?: string): void {
    console.log('[RewardNotification] showRewardDonated called:', { amount, charityName, sponsorName });

    const fromSponsor = sponsorName ? ` from ${sponsorName}` : '';
    Toast.show({
      type: 'rewardDonated',
      text1: 'Reward Sent!',
      text2: `${amount} sats${fromSponsor} sent to ${charityName}`,
      position: 'top',
      visibilityTime: 5000,
    });
  }
```

**Step 3: Update `showBatchRewardsConfirmed` to accept and display sponsor name**

```typescript
  showBatchRewardsConfirmed(count: number, totalAmount: number, sponsorName?: string): void {
    console.log('[RewardNotification] showBatchRewardsConfirmed called:', { count, totalAmount, sponsorName });

    const fromSponsor = sponsorName ? ` from ${sponsorName}` : '';
    Toast.show({
      type: 'rewardConfirmed',
      text1: 'Rewards Received!',
      text2: `${count} payments${fromSponsor} - ${totalAmount} sats total`,
      position: 'top',
      visibilityTime: 6000,
    });
  }
```

**Step 4: Update `showBatchRewardsDonated` to accept and display sponsor name**

```typescript
  showBatchRewardsDonated(count: number, totalAmount: number, sponsorName?: string): void {
    console.log('[RewardNotification] showBatchRewardsDonated called:', { count, totalAmount, sponsorName });

    const fromSponsor = sponsorName ? ` from ${sponsorName}` : '';
    Toast.show({
      type: 'rewardDonated',
      text1: 'Rewards Sent!',
      text2: `${count} payments${fromSponsor} - ${totalAmount} sats to charities`,
      position: 'top',
      visibilityTime: 6000,
    });
  }
```

**Step 5: Commit**

```bash
git add src/services/rewards/RewardNotificationManager.ts
git commit -m "Feature: Add sponsorName parameter to all RewardNotificationManager methods"
```

---

### Task 5: Wire SponsorService into RewardPollingService

**Files:**
- Modify: `src/services/rewards/RewardPollingService.ts:1` (add import)
- Modify: `src/services/rewards/RewardPollingService.ts:190-239` (showNotifications method)

**Step 1: Add SponsorService import**

Add at the top of the file (after existing imports around line 24):

```typescript
import { SponsorService } from '../backend/SponsorService';
```

**Step 2: Make `showNotifications` async and fetch sponsor name**

Change the method signature and add sponsor fetch at the top:

```typescript
  private async showNotifications(payments: PaymentRecord[]): Promise<void> {
    // Fetch active sponsor name (cached with 30min TTL via SponsorService)
    let sponsorName: string | undefined;
    try {
      const sponsor = await SponsorService.getActiveSponsor();
      sponsorName = sponsor.name;
    } catch {
      // Non-critical — notifications will just omit sponsor name
    }
```

**Step 3: Pass sponsorName to all RewardNotificationManager calls**

Update every call inside `showNotifications`:

- `RewardNotificationManager.showBatchRewardsConfirmed(userPayments, userTotal)` becomes `RewardNotificationManager.showBatchRewardsConfirmed(userPayments, userTotal, sponsorName)`
- `RewardNotificationManager.showBatchRewardsDonated(charityPayments.length, charityTotal)` becomes `RewardNotificationManager.showBatchRewardsDonated(charityPayments.length, charityTotal, sponsorName)`
- `RewardNotificationManager.showBatchRewardsConfirmed(payments.length, totalAmount)` becomes `RewardNotificationManager.showBatchRewardsConfirmed(payments.length, totalAmount, sponsorName)`
- `RewardNotificationManager.showRewardDonated(payment.amount_sats, charityName)` becomes `RewardNotificationManager.showRewardDonated(payment.amount_sats, charityName, sponsorName)`
- `RewardNotificationManager.showRewardDonated(payment.amount_sats, charityByAddress.name)` becomes `RewardNotificationManager.showRewardDonated(payment.amount_sats, charityByAddress.name, sponsorName)`
- `RewardNotificationManager.showRewardConfirmed(payment.amount_sats)` becomes `RewardNotificationManager.showRewardConfirmed(payment.amount_sats, sponsorName)`

**Step 4: Update the caller in `checkForNewPayments` (line ~181)**

The call `this.showNotifications(newPayments)` needs `await` since it's now async:

```typescript
      await this.showNotifications(newPayments);
```

**Step 5: Commit**

```bash
git add src/services/rewards/RewardPollingService.ts
git commit -m "Feature: Wire SponsorService into RewardPollingService for sponsor-branded notifications"
```

---

### Task 6: Run typecheck and verify

**Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: No new errors introduced (existing ~199 errors are pre-existing and known).

**Step 2: Commit any fixes if needed**

```bash
git add -A
git commit -m "Fix: Typecheck fixes for sponsor notification wiring"
```
