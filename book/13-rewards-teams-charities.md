# Chapter 13: Reward Destinations

## Summary

In RUNSTR, you choose where your rewards go. The Reward Destination picker presents options across four categories: charities like the ALS Network and Bitcoin Veterans, open source projects like Bitcoin Ekasi and Afribit Kibera, services like PPQ.AI for AI credits, and yourself — rewards sent straight to your wallet. You pick one destination for all your rewards and can change it anytime.

This is central to RUNSTR's identity: **fitness rewards, your way.** The point isn't to pressure anyone into donating — it's to let every user decide what their effort is worth and where it should go. Whether you're funding ALS research, supporting a grassroots initiative, earning AI credits, or growing your own wallet, every qualifying workout sends rewards exactly where you chose.

Beyond automatic reward routing, you can also donate directly to any charity or project using the lightning bolt button on their card — tap to open a donation modal with preset amounts, or long-press for a quick donation if you have NWC configured.

---

## Reward Destination Model

### Single Destination

Users choose ONE destination for all rewards:

| Category | Examples | What Happens |
|----------|----------|-------------|
| **Charities** | ALS Network, Bitcoin Veterans | Reward sent as micro donation |
| **Projects** | Bitcoin Ekasi, Bitcoin Isla, Afribit Kibera | Reward sent to project |
| **Services** | PPQ.AI | Reward converted to AI credits |
| **You** | User's wallet | Reward sent to your address |

### How Routing Works

When you earn a reward:
1. Workout submitted to Supabase with destination tag
2. Database trigger fires claim-reward Edge Function
3. Edge Function reads destination tag from workout
4. Sends reward via LNURL to the destination's address
5. Records payment in `reward_payments` table

**Why single destination?** Simple model, easy to understand. Users who want to support a cause select it. Users who want rewards for themselves select themselves. No splits, no percentages, no complexity.

---

## Supported Destinations

All destinations are defined in `src/constants/charities.ts` and `src/config/charityPayments.ts`.

### Charities

| Destination | Focus |
|-------------|-------|
| ALS Network | ALS research (honoring Hal Finney) |
| Bitcoin Veterans | US Veterans support |

### Projects

| Destination | Focus |
|-------------|-------|
| Bitcoin Bay | Bay Area circular economy |
| Bitcoin Ekasi | South Africa |
| Bitcoin Isla | Isla Mujeres, Mexico |
| Bitcoin District | Washington DC |
| Bitcoin Yucatan | Mexico |
| Bitcoin Makueni | Kenya |
| Bitcoin House Bali | Bali, Indonesia |
| Bitcoin Basin | New Zealand |
| BuhoGO | Wallet app |
| Central PA Bitcoiners | Pennsylvania |
| WeSatoshi | Terminal hardware |

### Services

| Destination | Focus |
|-------------|-------|
| PPQ.AI | AI credits for Coach RUNSTR |

### You (Self)

Rewards sent to the user's own wallet via their configured address.

---

## Selecting a Destination

### Selection Flow

1. Navigate to Rewards screen
2. Tap "Change" on RewardDestinationSection
3. **RewardDestinationPicker** modal opens
4. Four categories displayed: YOU, CHARITIES, PROJECTS, SERVICES
5. Tap to select → saved to AsyncStorage
6. All future rewards route to this destination

### Wallet Setup (If "You" Selected)

- Enter your address manually
- Or connect NWC wallet (scan QR or paste connection string)

### Changing Destination

- Change anytime via the Rewards screen
- No cooldown, no penalty
- New destination applies to all future rewards immediately

---

## Direct Donations

The lightning bolt button on destination cards enables direct donations beyond automatic reward routing:

### Single Tap
Opens donation modal:
- Select amount (21, 100, 500, 1000 preset amounts)
- Generate invoice
- Pay with any wallet

### Long Press (500ms)
Quick donation (21 amount) via NWC if configured:
- Instant payment
- No modal needed
- Visual confirmation

---

## Technical Section

### Core Services

| Service | File | Purpose |
|---------|------|---------|
| CharitySelectionService | `src/services/charity/CharitySelectionService.ts` | Track selected destination |
| DonationTrackingService | `src/services/donation/DonationTrackingService.ts` | Record direct donations |

### Destination Constants

**File:** `src/constants/charities.ts`

Contains all supported destinations with metadata:

```typescript
interface Charity {
  id: string;
  name: string;
  displayName: string;
  lightningAddress: string;
  description: string;
  website?: string;
  image?: number;  // require() reference
}

const CHARITIES: Charity[] = [
  {
    id: 'bitcoin-bay',
    name: 'Bitcoin Bay',
    displayName: 'Bitcoin Bay',
    lightningAddress: 'sats@donate.bitcoinbay.foundation',
    description: 'Bitcoin circular economy in the Bay Area',
  },
  // ... 15+ more destinations
];
```

### Helper Functions

```typescript
// Get destination by ID
function getCharityById(charityId?: string): Charity | undefined

// Get all destinations for picker
function getCharityOptions(): { label: string; value: string }[]
```

### CharitySelectionService

**File:** `src/services/charity/CharitySelectionService.ts`

```typescript
// Get selected destination ID
async getSelectedCharity(): Promise<string | null>

// Set selected destination
async setSelectedCharity(charityId: string): Promise<void>

// Get destination stats (total earned)
async getCharityStats(): Promise<CharityStats>
```

### RewardDestinationPicker Component

**File:** Located in reward/destination components

Renders the destination selection modal with four categories:
- YOU section — rewards to your wallet
- CHARITIES section — micro donations to charities
- PROJECTS section — support open source projects
- SERVICES section — convert to AI credits (PPQ.AI)

### Storage Keys

| Key | Purpose |
|-----|---------|
| `@runstr:selected_team_id` | User's selected reward destination |
| `@runstr:lightning_address` | User's address (if "You" selected) |
| `@runstr:reward_destination` | Destination category |

---

## What Reward Destinations Should Be

### Ideal Architecture
1. **Single destination** — User picks one, no splits
2. **Four categories** — Charities, Projects, Services, You
3. **Change anytime** — No lock-in, no cooldown
4. **Direct donations** — Optional manual donations via zap button
5. **Part of Rewards** — Not a separate system, integrated into the reward flow

### What to Avoid
- Percentage-based splits
- Complex donation tracking dashboards
- Mandatory donations
- Treating destinations as a separate pillar from rewards
- Using "sats", "Bitcoin", or "Lightning" in user-facing destination descriptions

---

## Navigation

**Previous:** [Chapter 12: Lightning Address Delivery](./12-rewards-lightning-address.md)

**Next:** [Chapter 14: Encrypted Backup](./14-encrypted-backup.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
