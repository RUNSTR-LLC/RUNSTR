# Chapter 12: Lightning Address Delivery

## No NWC or E-Cash Wallets

RUNSTR takes a **simple approach** to reward delivery:
- Users enter their Lightning address
- App sends rewards via LNURL protocol
- Works with ANY Lightning wallet

### Why Not NWC?
- NWC requires complex wallet connection setup
- Many users don't have NWC-compatible wallets
- Lightning addresses are universal

### Why Not E-Cash/Cashu?
- Adds complexity
- Requires token management
- Lightning addresses are simpler

---

## Lightning Address Format

A Lightning address looks like an email:
```
user@walletofsatoshi.com
satoshi@getalby.com
runner@strike.me
```

Behind the scenes, it uses the LNURL-pay protocol to generate invoices.

### Supported Wallets

Any wallet with Lightning address support:

| Wallet | Example Address |
|--------|-----------------|
| Wallet of Satoshi | `user@walletofsatoshi.com` |
| Alby | `user@getalby.com` |
| Strike | `user@strike.me` |
| Cash App | `$cashtag` → Lightning address |
| Phoenix | Self-hosted |
| Breez | Self-hosted |
| Zeus | Self-hosted |
| Blink | `user@blink.sv` |

---

## Setting Rewards Address

### UI Flow

1. Navigate to Rewards screen (from Profile tab)
2. Expand "REWARDS ADDRESS" section
3. Enter Lightning address
4. Tap "Save"

```
┌─────────────────────────────────────┐
│  💳 REWARDS ADDRESS             ▲  │
├─────────────────────────────────────┤
│  Enter your Lightning address to    │
│  receive workout rewards:           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ yourname@walletofsatoshi.com│   │
│  └─────────────────────────────┘   │
│                                     │
│  [Save Address]                     │
└─────────────────────────────────────┘
```

### Validation

```typescript
// Valid format: user@domain.tld
const isValid = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(address);
```

---

## LNURL-Pay Protocol

### How It Works

The LNURL-pay protocol is used by the **external reward service** (not the app) to deliver rewards:

1. **Parse Address**: Extract `user` and `domain` from `user@domain.com`
2. **Fetch Endpoint**: GET `https://domain.com/.well-known/lnurlp/user`
3. **Get Callback**: Response contains callback URL
4. **Request Invoice**: Call callback with amount in millisats
5. **Receive Invoice**: Get BOLT-11 invoice string
6. **Pay Invoice**: External service pays the invoice

### Example Flow

```
Reward Address: runner@getalby.com

1. GET https://getalby.com/.well-known/lnurlp/runner

2. Response:
{
  "callback": "https://getalby.com/lnurlp/runner/callback",
  "minSendable": 1000,
  "maxSendable": 100000000,
  "tag": "payRequest"
}

3. GET https://getalby.com/lnurlp/runner/callback?amount=50000
   (50000 millisats = 50 sats)

4. Response:
{
  "pr": "lnbc500n1pj...",  // BOLT-11 invoice
  "routes": []
}

5. External reward service pays the invoice
```

---

## Technical Section

### RewardLightningAddressService

**File:** `src/services/rewards/RewardLightningAddressService.ts`

```typescript
// Storage
const STORAGE_KEY = '@runstr:reward_lightning_address';

// Key methods
async getRewardLightningAddress(): Promise<string | null>
async setRewardLightningAddress(address: string): Promise<void>
async clearRewardLightningAddress(): Promise<void>
async hasRewardLightningAddress(): Promise<boolean>
function isValidLightningAddress(address: string): boolean
```

### Reward Delivery Flow

**Important:** The app does NOT send rewards directly. The actual reward delivery is handled server-side:

```
1. App submits workout to Supabase (workout_submissions table)
   - Includes reward destination tag (charity/project/service/self)
   - Includes destination address

2. Supabase database trigger fires claim-reward Edge Function

3. Edge Function reads destination from workout tags
   - Resolves the LNURL endpoint for the destination address
   - Requests a BOLT-11 invoice via LNURL-pay
   - Pays the invoice
   - Records payment in reward_payments table with preimage proof

4. App polls for confirmed payments (RewardPollingService)
   - Shows in-app toast notification
   - Updates earnings counters
```

The app's role is limited to:
- Tracking reward eligibility locally (DailyRewardService)
- Submitting workouts with the correct destination tags
- Polling for confirmed payments to display in the UI

---

## Rewards Address Priority

When sending rewards, the app checks for Lightning address in order:

1. **Settings-stored address** - User explicitly configured
2. **Nostr profile lud16** - From user's kind 0 profile (fallback)
3. **No address** - Cannot receive rewards

```typescript
async function getUserLightningAddress(pubkey: string): Promise<string | null> {
  // Priority 1: Explicitly set address
  const settingsAddress = await RewardLightningAddressService.getRewardLightningAddress();
  if (settingsAddress) return settingsAddress;

  // Priority 2: Nostr profile lud16
  const profile = await fetchNostrProfile(pubkey);
  if (profile?.lud16) return profile.lud16;

  // No address available
  return null;
}
```

---

## What Lightning Address Should Be

### Ideal Architecture
1. **Single input field** - Just enter Lightning address
2. **Universal support** - Works with any Lightning wallet
3. **LNURL protocol** - Standard invoice request flow
4. **Fallback to profile** - Use Nostr lud16 if set
5. **Silent failure** - Never block on payment errors

### What to Avoid
- NWC wallet connection requirements
- E-cash/Cashu complexity
- Wallet-specific integrations
- Verbose error handling for payments

---

## Navigation

**Previous:** [Chapter 11: Daily Rewards & Lottery Wheel](./11-rewards-daily-step.md)

**Next:** [Chapter 13: Teams & Charities](./13-rewards-teams-charities.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
