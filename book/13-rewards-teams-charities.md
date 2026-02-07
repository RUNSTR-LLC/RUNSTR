# Chapter 13: Teams & Charities

## Summary

In RUNSTR, selecting a team means choosing a charity to support with your fitness activities. The Teams tab presents 17+ organizations—from Bitcoin Bay building circular economies in the Bay Area to the ALS Network honoring Hal Finney's legacy. Each organization has a Lightning address ready to receive donations, and your workout efforts can directly fund their missions.

Teams and charities are part of the Rewards ecosystem. When you select a team, your reward routing can direct payments to that charity. Beyond automatic routing, you can zap charities directly using the lightning bolt button on any team card—tap to open a donation modal with preset amounts (21, 100, 500, or 1,000 sats), or long-press for a quick 21-sat zap if you have NWC configured.

---

## Teams = Charities

In RUNSTR, **"Teams" and "Charities" are the same thing**. The Teams tab shows organizations you can support through your fitness activities.

When you select a team:
- Your workouts contribute to that charity's fitness totals
- Reward routing can direct payments to that charity
- You become part of a community supporting that cause

---

## How Reward Routing Works

### Binary Routing

Rewards are routed using simple binary logic:

| User Has Lightning Address? | Reward Destination |
|----------------------------|-------------------|
| Yes | User's Lightning address |
| No | Selected charity's Lightning address |

### How It Works

When you earn a daily reward:
1. External service checks if user has configured Lightning address
2. If yes → Payment sent to user's Lightning address
3. If no → Payment sent to selected charity's Lightning address

**Why Binary?** This simple model is fraud-resistant and easy to understand. Users who want to support charity simply don't configure a Lightning address.

---

## Supported Charities

All 17+ charities are hardcoded in `src/constants/charities.ts`. There is no Nostr-based team discovery -- all organizations are preset constants.

| Charity | Lightning Address | Focus |
|---------|-------------------|-------|
| PPQ.AI | *(bolt11 invoices)* | AI credits for Coach RUNSTR |
| ALS Network | `RunningBTC@primal.net` | ALS research (Hal Finney) |
| Ashigaru | `ashigarufund@geyser.fund` | Privacy wallet development |
| Bitcoin Bay | `sats@donate.bitcoinbay.foundation` | Bay Area Bitcoin economy |
| Bitcoin Ekasi | `bitcoinekasi@primal.net` | South Africa |
| Bitcoin Isla | `BTCIsla@primal.net` | Isla Mujeres, Mexico |
| Bitcoin District | `bdi@strike.me` | Washington DC |
| Bitcoin Yucatan | `bitcoinyucatancommunity@geyser.fund` | Mexico |
| Bitcoin Veterans | `opbitcoin@strike.me` | US Veterans support |
| Bitcoin Makueni | `rosechicken19@primal.net` | Kenya |
| Bitcoin House Bali | `btchousebali@walletofsatoshi.com` | Bali, Indonesia |
| Human Rights Foundation | `nostr@btcpay.hrf.org` | Human rights |
| RUNSTR | `thewildhustle@strike.me` | RUNSTR project support |
| Afribit Kibera | `afribit@blink.sv` | Kenya |
| Bitcoin Basin | `plasticbowl87@walletofsatoshi.com` | New Zealand |
| BuhoGO | `buho@lnbits.de` | NWC-ready wallet app |
| Central PA Bitcoiners | `businesscat@getalby.com` | Pennsylvania |
| WeSatoshi | `thefirstbitcointerminalhardware@geyser.fund` | Bitcoin terminal hardware |

**Note:** PPQ.AI is a special team -- rewards go to AI credits for Coach RUNSTR instead of sats to a Lightning address.

---

## Selecting a Team

### Selection Flow

1. Navigate to Teams tab
2. Scroll through "ALL TEAMS" list
3. Tap on desired team
4. Team moves to "YOUR TEAM" section
5. Checkmark appears on selected team

### One Team at a Time

Users can only have **one active team**:
- Simplifies reward routing
- Clear focus on single cause
- Can change team anytime

---

## Teams Tab

The Teams tab shows:

```
┌─────────────────────────────────────┐
│  YOUR TEAM                          │
│  ┌─────────────────────────────┐   │
│  │ [Logo] ALS Network       ⚡ ✓│   │
│  │ Honoring Hal Finney -       │   │
│  │ Supporting ALS research     │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  ALL TEAMS                          │
│  Select a team to support with      │
│  your workouts                      │
│                                     │
│  [Logo] Bitcoin Bay            ⚡   │
│  Bitcoin circular economy...        │
│                                     │
│  [Logo] Bitcoin Ekasi          ⚡   │
│  Bitcoin circular economy...        │
│                                     │
│  [Logo] Bitcoin Isla           ⚡   │
│  Bitcoin circular economy...        │
│                                     │
│  ... more teams ...                 │
└─────────────────────────────────────┘
```

### Team Card Elements
- **Logo** - Charity's image
- **Name** - Bitcoin Bay, Bitcoin Ekasi, etc.
- **Description** - Brief about the charity
- **Zap Button (⚡)** - Direct donation button
- **Checkmark (✓)** - Indicates selected team

---

## Zap Button

The lightning bolt (⚡) button enables direct donations:

### Single Tap
Opens donation modal:
- Select amount (21, 100, 500, 1000 sats)
- Generate invoice
- Pay with any Lightning wallet

### Long Press (500ms)
Quick zap (21 sats) via NWC if configured:
- Instant payment
- No modal needed
- Visual confirmation

---

## Technical Section

### Core Services

| Service | File | Purpose |
|---------|------|---------|
| CharitySelectionService | `src/services/charity/CharitySelectionService.ts` | Track selected team |
| DonationTrackingService | `src/services/donation/DonationTrackingService.ts` | Record donations |

### Charity Constants

**File:** `src/constants/charities.ts`

Contains all supported charities with metadata:

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
    displayName: 'Zap Bitcoin Bay',
    lightningAddress: 'sats@donate.bitcoinbay.foundation',
    description: 'Bitcoin circular economy in the Bay Area',
  },
  // ... 12+ more charities
];
```

### Helper Functions

```typescript
// Get charity by ID
function getCharityById(charityId?: string): Charity | undefined

// Get all charities for dropdown
function getCharityOptions(): { label: string; value: string }[]
```

### CharitySelectionService

**File:** `src/services/charity/CharitySelectionService.ts`

```typescript
// Get selected charity ID
async getSelectedCharity(): Promise<string | null>

// Set selected charity
async setSelectedCharity(charityId: string): Promise<void>

// Get charity stats (total earned from wins)
async getCharityStats(): Promise<CharityStats>
```

### CharitySection Component

**File:** `src/components/team/CharitySection.tsx`

Renders the charity card with zap functionality:

```typescript
interface CharitySectionProps {
  charity: Charity;
  isSelected: boolean;
  onSelect: () => void;
  onZap: (amount: number) => void;
}
```

Features:
- Logo image
- Name and description
- Animated zap button
- Selection indicator
- Long-press quick zap

### Teams Screen

**File:** `src/screens/TeamsScreen.tsx`

Main screen showing all teams:

```typescript
// Structure
- "YOUR TEAM" section (selected team)
- "ALL TEAMS" section (all charities)
- Team selection handling
- Zap modal integration
```

### Storage Keys

| Key | Purpose |
|-----|---------|
| `@runstr:selected_charity_id` | User's selected team |
| `@runstr:lightning_address` | User's Lightning address (if configured) |

---

## What Teams & Charities Should Be

### Ideal Architecture
1. **Teams = Charities** - Simple mental model
2. **One selected team** - User picks one to support
3. **Binary routing** - Rewards go to user OR charity (not both)
4. **Direct zaps** - Optional manual donations
5. **Lightning native** - All charities have Lightning addresses
6. **Part of Rewards** - Not a separate pillar

### What to Avoid
- Percentage-based donation splits
- Complex donation tracking
- Donation leaderboards
- Mandatory donations
- Treating donations as a separate pillar from rewards

---

## Navigation

**Previous:** [Chapter 12: Lightning Address Delivery](./12-rewards-lightning-address.md)

**Next:** [Chapter 14: Encrypted Backup](./14-encrypted-backup.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
