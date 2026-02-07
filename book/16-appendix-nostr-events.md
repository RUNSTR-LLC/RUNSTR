# Chapter 16: Appendix - Nostr Events

## Nostr Events Used in RUNSTR

RUNSTR uses Nostr for user identity, social posting, and encrypted backup. This appendix documents the event kinds and formats.

---

## Kind 1301: Workout Events

The Nostr event format used for fitness data.

> **Important:** Kind 1301 events are created locally for structure and validation, but are **NOT published to Nostr relays**. Supabase is the single source of truth for workout data. The kind 1301 format is used locally to maintain compatibility with the Nostr fitness standard.

### Event Structure

```json
{
  "kind": 1301,
  "pubkey": "hex_pubkey",
  "created_at": 1704067200,
  "content": "Plain text description of workout",
  "tags": [
    ["d", "unique_workout_id"],
    ["title", "Morning Run"],
    ["exercise", "running"],
    ["distance", "5.2", "km"],
    ["duration", "00:30:45"],
    ["calories", "312"],
    ["elevation_gain", "45", "m"],
    ["avg_pace", "05:54", "min/km"],
    ["split", "1", "00:05:42"],
    ["split", "2", "00:11:28"],
    ["split", "3", "00:17:15"],
    ["split", "4", "00:23:02"],
    ["split", "5", "00:28:50"],
    ["source", "RUNSTR"],
    ["client", "RUNSTR", "1.4.4"],
    ["t", "Running"],
    ["charity", "bitcoin-bay", "Bitcoin Bay", "sats@donate.bitcoinbay.foundation"]
  ],
  "id": "event_id_hash",
  "sig": "signature"
}
```

### Required Tags

| Tag | Format | Description |
|-----|--------|-------------|
| `d` | `["d", "unique_id"]` | Unique workout identifier |
| `exercise` | `["exercise", "running"]` | Activity type (lowercase) |
| `duration` | `["duration", "HH:MM:SS"]` | Workout duration |

### Optional Tags

| Tag | Format | Description |
|-----|--------|-------------|
| `title` | `["title", "Morning Run"]` | Workout name |
| `distance` | `["distance", "5.2", "km"]` | Distance with unit |
| `calories` | `["calories", "312"]` | Calories burned |
| `elevation_gain` | `["elevation_gain", "45", "m"]` | Elevation gained |
| `avg_pace` | `["avg_pace", "05:54", "min/km"]` | Average pace |
| `avg_heart_rate` | `["avg_heart_rate", "142"]` | Heart rate |
| `split` | `["split", "1", "00:05:42"]` | Km split times |
| `source` | `["source", "RUNSTR"]` | Data source |
| `client` | `["client", "RUNSTR", "1.4.4"]` | Client app |
| `t` | `["t", "Running"]` | Hashtag |
| `charity` | `["charity", "id", "name", "address"]` | Charity info |

### Exercise Types

| Type | Tag Value |
|------|-----------|
| Running | `running` |
| Walking | `walking` |
| Cycling | `cycling` |
| Hiking | `hiking` |
| Swimming | `swimming` |
| Strength | `strength` |
| Yoga | `yoga` |
| Meditation | `meditation` |
| Diet | `diet` |

### Format Rules

1. **Content**: Plain text only, NOT JSON
2. **Exercise**: Lowercase full words (`running` not `run`)
3. **Distance**: Separate elements `["distance", "5.2", "km"]`
4. **Duration**: HH:MM:SS format `["duration", "00:30:45"]`

---

## Kind 0: Profile Metadata

User profile information. **This IS published to Nostr relays** when users update their profile.

### Event Structure

```json
{
  "kind": 0,
  "pubkey": "hex_pubkey",
  "created_at": 1704067200,
  "content": "{\"name\":\"runner\",\"picture\":\"https://...\",\"about\":\"...\",\"lud16\":\"runner@getalby.com\"}",
  "tags": [],
  "id": "event_id_hash",
  "sig": "signature"
}
```

### Content Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name |
| `picture` | string | Profile image URL |
| `about` | string | Bio/description |
| `lud16` | string | Lightning address |
| `nip05` | string | NIP-05 verification |

---

## Relay Configuration

RUNSTR uses 4 relays via GlobalNDKService:

| Relay | URL |
|-------|-----|
| Damus | `wss://relay.damus.io` |
| Primal | `wss://relay.primal.net` |
| Nos.lol | `wss://nos.lol` |
| Nostr.band | `wss://relay.nostr.band` |

### Connection Settings

| Setting | Value |
|---------|-------|
| Connection timeout | 2 seconds |
| Auto-reconnect | Enabled |
| Minimum relays | 2 of 4 |

### What Gets Published

| Event Kind | Published to Relays? | Purpose |
|------------|---------------------|---------|
| Kind 0 | Yes | Profile metadata (name, picture, Lightning address) |
| Kind 1 | Yes (WoT-gated) | Social posts for workout sharing |
| Kind 5 | Yes | Deletion requests |
| Kind 1301 | **No** | Created locally only for structure (submitted to Supabase) |
| Kind 30078 | Yes | Encrypted backup (NIP-44 self-encryption, gzip compressed) |

---

## NDK Usage

### Global Instance

```typescript
import { GlobalNDKService } from '../services/nostr/GlobalNDKService';

// Get singleton instance
const ndk = await GlobalNDKService.getInstance();

// Query events
const events = await ndk.fetchEvents(filter);

// Publish event
await ndk.publish(event);
```

### Query Filters

```typescript
// Query kind 1301 from specific user
const filter = {
  kinds: [1301],
  authors: [hexPubkey],
  since: startTimestamp,
  until: endTimestamp,
  limit: 100,
};

// Query kind 0 profile
const profileFilter = {
  kinds: [0],
  authors: [hexPubkey],
};
```

### Publishing Kind 0 (Profile Updates)

```typescript
// Create and sign profile event
const event = new NDKEvent(ndk);
event.kind = 0;
event.content = JSON.stringify({
  name: "runner",
  picture: "https://...",
  lud16: "runner@getalby.com"
});

// Sign with user's key
await event.sign(signer);

// Publish to relays
await event.publish();
```

### Publishing Kind 1 (Social Posts)

```typescript
// Create and sign social post (WoT-gated)
const event = new NDKEvent(ndk);
event.kind = 1;
event.content = "Just completed a 5K morning run! #RUNSTR";
event.tags = [
  ["t", "RUNSTR"],
  ["t", "Running"],
];

await event.sign(signer);
await event.publish();
```

**Note:** Kind 1301 events are created locally but NOT published to relays. Supabase is the single source of truth for workout data.

---

## Kind 5: Deletion Requests

Used to request deletion of previously published events (e.g., social posts).

### Event Structure

```json
{
  "kind": 5,
  "pubkey": "hex_pubkey",
  "created_at": 1704067200,
  "content": "",
  "tags": [
    ["e", "event_id_to_delete"]
  ]
}
```

---

## Kind 30078: Encrypted Backup

Used for encrypted backup and restore of user data. See [Chapter 14: Encrypted Backup](./14-encrypted-backup.md) for full details.

### Event Structure

```json
{
  "kind": 30078,
  "pubkey": "hex_pubkey",
  "created_at": 1706500000,
  "tags": [
    ["d", "runstr-workout-backup"],
    ["client", "RUNSTR", "1.6.3"],
    ["encrypted", "nip44"],
    ["compression", "gzip"],
    ["backup_version", "1"],
    ["workout_count", "47"],
    ["habit_count", "3"],
    ["journal_count", "12"],
    ["date_range", "2025-08-15", "2026-01-28"]
  ],
  "content": "<NIP-44 encrypted + gzipped JSON>"
}
```

### Key Properties
- **Replaceable parameterized event** -- `d` tag ensures only latest backup exists
- **NIP-44 self-encryption** -- Only the user can decrypt their own backup
- **Gzip compression** -- Handles large payloads within NIP-44's 64KB limit
- **Public metadata tags** -- Workout/habit counts visible, content encrypted

---

## Example Events

### Running Workout

```json
{
  "kind": 1301,
  "content": "5K morning run before work",
  "tags": [
    ["d", "run_1704067200_abc123"],
    ["exercise", "running"],
    ["distance", "5.0", "km"],
    ["duration", "00:25:30"],
    ["avg_pace", "05:06", "min/km"],
    ["calories", "320"],
    ["split", "1", "00:05:02"],
    ["split", "2", "00:10:08"],
    ["split", "3", "00:15:15"],
    ["split", "4", "00:20:22"],
    ["split", "5", "00:25:30"],
    ["source", "RUNSTR"],
    ["t", "Running"],
    ["t", "5K"]
  ]
}
```

### Walking Workout

```json
{
  "kind": 1301,
  "content": "Evening walk around the neighborhood",
  "tags": [
    ["d", "walk_1704153600_def456"],
    ["exercise", "walking"],
    ["distance", "3.2", "km"],
    ["duration", "00:45:00"],
    ["avg_pace", "14:03", "min/km"],
    ["calories", "180"],
    ["source", "RUNSTR"],
    ["t", "Walking"]
  ]
}
```

### Strength Training

```json
{
  "kind": 1301,
  "content": "Upper body workout - pushups and pullups",
  "tags": [
    ["d", "strength_1704240000_ghi789"],
    ["exercise", "strength"],
    ["duration", "00:30:00"],
    ["calories", "200"],
    ["source", "RUNSTR"],
    ["t", "Strength"]
  ]
}
```

### Meditation

```json
{
  "kind": 1301,
  "content": "Morning guided meditation session",
  "tags": [
    ["d", "meditation_1704326400_jkl012"],
    ["exercise", "meditation"],
    ["duration", "00:15:00"],
    ["source", "RUNSTR"],
    ["t", "Meditation"],
    ["t", "Mindfulness"]
  ]
}
```

---

## Spec Document

For the complete Kind 1301 specification, see:

**File:** `docs/KIND_1301_SPEC.md`

This document contains:
- Full tag reference
- Edge cases
- Validation rules
- Compatibility notes

---

## Navigation

**Previous:** [Chapter 15: Conclusion](./15-conclusion.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
