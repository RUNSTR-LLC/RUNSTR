# Chapter 4: Workout Data Model

## Kind 1301: The Nostr Fitness Standard

RUNSTR creates workouts as **kind 1301** Nostr events. This is the emerging standard for fitness data on Nostr, allowing interoperability between fitness apps.

> **Important:** Kind 1301 events are created locally for validation and structure, but are **NOT published to Nostr relays**. Supabase is the single source of truth for workout data and leaderboards. The kind 1301 format is used locally to maintain compatibility with the Nostr fitness standard.

### Why Kind 1301 Format?

- **Standardized** - Uses the emerging Nostr fitness data format
- **Structured** - Consistent tag format for all workout data
- **Verifiable** - Cryptographically signed by user's private key
- **Future-ready** - Can enable Nostr publishing if desired later

---

## Event Structure

A kind 1301 event follows this structure:

```json
{
  "kind": 1301,
  "pubkey": "user_hex_pubkey",
  "created_at": 1704067200,
  "content": "Morning 5K run in the park. Felt great!",
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
  "id": "event_hash",
  "sig": "signature"
}
```

---

## Critical Format Rules

### Content Field
- **Must be plain text**, NOT JSON
- Can include user notes, descriptions
- Optional - can be empty string

### Exercise Tag
- **Lowercase full words**: `running`, `walking`, `cycling`
- NOT abbreviated: `run`, `walk`, `bike` (wrong)
- One exercise per event

### Distance Tag
- **Separate array elements**: `["distance", "5.2", "km"]`
- NOT combined: `["distance", "5.2 km"]` (wrong)
- Unit always included as third element

### Duration Tag
- **HH:MM:SS format**: `["duration", "00:30:45"]`
- NOT seconds: `["duration", "1845"]` (wrong)
- NOT MM:SS: `["duration", "30:45"]` (wrong)

---

## Tag Reference

### Required Tags

| Tag | Format | Example |
|-----|--------|---------|
| `d` | Unique ID | `["d", "run_1704067200_abc123"]` |
| `exercise` | Activity type | `["exercise", "running"]` |
| `duration` | HH:MM:SS | `["duration", "00:30:45"]` |

### Optional Tags

| Tag | Format | Example |
|-----|--------|---------|
| `title` | String | `["title", "Morning Run"]` |
| `distance` | Value, unit | `["distance", "5.2", "km"]` |
| `calories` | Number | `["calories", "312"]` |
| `elevation_gain` | Value, unit | `["elevation_gain", "45", "m"]` |
| `avg_pace` | MM:SS, unit | `["avg_pace", "05:54", "min/km"]` |
| `avg_heart_rate` | Number | `["avg_heart_rate", "142"]` |
| `split` | km, time | `["split", "1", "00:05:42"]` |
| `source` | String | `["source", "RUNSTR"]` |
| `client` | Name, version | `["client", "RUNSTR", "1.4.4"]` |
| `t` | Hashtag | `["t", "Running"]` |
| `charity` | id, name, address | `["charity", "bitcoin-bay", "Bitcoin Bay", "sats@..."]` |

---

## Supported Activity Types

| Type | Exercise Tag | Category |
|------|--------------|----------|
| Running | `running` | Cardio |
| Walking | `walking` | Cardio |
| Cycling | `cycling` | Cardio |
| Hiking | `hiking` | Cardio |
| Swimming | `swimming` | Cardio |
| Strength | `strength` | Strength |
| Yoga | `yoga` | Wellness |
| Meditation | `meditation` | Wellness |
| Diet | `diet` | Diet |

---

## Split Data

Splits enable accurate leaderboard calculations for race distances:

```
["split", "1", "00:05:42"]  // Time at 1km
["split", "2", "00:11:28"]  // Time at 2km
["split", "5", "00:28:50"]  // Time at 5km
```

### Why Splits Matter
- A 10K runner can compete in the 5K leaderboard
- Time at 5K is extracted from split data
- Without splits, only total time is available

---

## Technical Section

### Parsing Logic

**File:** `src/utils/nostrWorkoutParser.ts`

```typescript
// Parse a kind 1301 event into StoredWorkout
function parseWorkoutEvent(event: NostrEvent): StoredWorkout {
  const tags = event.tags;

  // Extract exercise type
  const exerciseTag = tags.find(t => t[0] === 'exercise');
  const activityType = exerciseTag?.[1] || 'other';

  // Extract distance (convert to meters)
  const distanceTag = tags.find(t => t[0] === 'distance');
  const distance = parseDistance(distanceTag);

  // Extract duration (convert to seconds)
  const durationTag = tags.find(t => t[0] === 'duration');
  const duration = parseDuration(durationTag);

  // Extract splits
  const splitTags = tags.filter(t => t[0] === 'split');
  const splits = parseSplits(splitTags);

  return {
    id: event.id,
    pubkey: event.pubkey,
    activityType,
    distance,
    duration,
    splits,
    createdAt: event.created_at,
  };
}
```

### Distance Parsing

```typescript
function parseDistance(tag: string[]): number {
  if (!tag || tag.length < 2) return 0;

  const value = parseFloat(tag[1]);
  const unit = tag[2]?.toLowerCase() || 'km';

  switch (unit) {
    case 'km': return value * 1000;  // Convert to meters
    case 'mi': return value * 1609.34;
    case 'm': return value;
    default: return value * 1000;
  }
}
```

### Duration Parsing

```typescript
function parseDuration(tag: string[]): number {
  if (!tag || tag.length < 2) return 0;

  const timeStr = tag[1];  // "00:30:45"
  const parts = timeStr.split(':');

  if (parts.length === 3) {
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseInt(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }

  return 0;
}
```

### StoredWorkout Interface

**File:** `src/types/workout.ts`

```typescript
interface StoredWorkout {
  id: string;
  pubkey: string;
  teamId?: string;
  activityType: string;
  distance?: number;     // Always in meters
  duration?: number;     // Always in seconds
  calories?: number;
  pace?: number;         // Seconds per kilometer
  elevation?: number;    // Meters
  createdAt: number;     // Unix timestamp
  splits?: Map<number, number>;  // km -> elapsed seconds
  eventIds?: string[];   // Event participation
}
```

---

## Kind 1301 Specification Document

For the complete specification, see:
**File:** `docs/KIND_1301_SPEC.md`

This document contains:
- Full tag reference
- Example events for each activity type
- Edge cases and validation rules
- Compatibility notes

---

## What the Data Model Should Be

### Ideal Architecture
1. **Strict format adherence** - Always lowercase exercise, HH:MM:SS duration
2. **Consistent units** - Internal storage always in meters/seconds
3. **Complete splits** - Include splits whenever GPS tracking available
4. **Charity tag** - Include user's selected charity when publishing

### What to Avoid
- JSON in content field
- Abbreviated exercise types
- Missing unit specifiers
- Inconsistent duration formats

---

## Navigation

**Previous:** [Chapter 3: Workout Tracking](./03-workouts-tracking.md)

**Next:** [Chapter 5: Workout Storage & Publishing](./05-workouts-storage.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
