# Kind 1301 Workout Event Specification

This document defines the complete specification for kind 1301 workout events used in RUNSTR and compatible fitness applications.

## Overview

Kind 1301 is a Nostr event kind for publishing fitness tracking data. RUNSTR publishes kind 1301 events supporting all fitness activities for in-app competitions and external leaderboard compatibility.

## Event Structure

### Basic Format

```json
{
  "kind": 1301,
  "content": "Completed a running workout with RUNSTR!",
  "tags": [
    ["d", "workout_uuid_12345"],
    ["title", "Morning Run"],
    ["exercise", "running"],
    ["distance", "5.2", "km"],
    ["duration", "00:30:45"],
    ["source", "RUNSTR"],
    ["client", "RUNSTR", "0.2.6"],
    ["t", "Running"]
  ],
  "pubkey": "user_hex_pubkey",
  "created_at": 1234567890,
  "id": "event_id",
  "sig": "signature"
}
```

## Required Tags

### `d` - Unique Identifier
```typescript
["d", "unique_workout_id"]
```
- **Purpose**: Unique identifier for deduplication
- **Format**: Any unique string (UUID recommended)
- **Example**: `["d", "workout_2024-01-15_123456"]`

### `title` - Human-Readable Title
```typescript
["title", "Morning Run"]
```
- **Purpose**: Display name for the workout
- **Format**: Plain text string
- **Example**: `["title", "Evening Cycling Session"]`

### `exercise` - Activity Type
```typescript
["exercise", "running"]
```
- **Purpose**: Specifies the type of fitness activity
- **Format**: Lowercase full word
- **Valid Values**:
  - **Cardio**: `running`, `walking`, `cycling`, `hiking`, `swimming`, `rowing`
  - **Strength**: `strength` (includes pushups, pullups, situps, weights, gym)
  - **Wellness**: `yoga`, `meditation`
  - **Other**: Any manually-entered workout type

### `distance` - Distance (if applicable)
```typescript
["distance", "5.2", "km"]
```
- **Purpose**: Distance covered during workout
- **Format**: **Three separate array elements** - tag name, value, unit
- **Valid Units**: `km`, `mi`, `m`, `ft`
- **Example**: `["distance", "3.1", "mi"]`
- **Note**: NOT `["distance", "5.2 km"]` - value and unit must be separate

### `duration` - Workout Duration
```typescript
["duration", "00:30:45"]
```
- **Purpose**: Total time spent on workout
- **Format**: `HH:MM:SS` (hours:minutes:seconds)
- **Example**: `["duration", "01:15:30"]` for 1 hour 15 minutes 30 seconds
- **Note**: NOT seconds (e.g., NOT `["duration", "1845"]`)

### `source` - Application Identifier
```typescript
["source", "RUNSTR"]
```
- **Purpose**: Identifies the app that created the workout
- **Format**: Application name
- **Example**: `["source", "Strava"]`, `["source", "Garmin"]`

### `client` - Client Info with Version
```typescript
["client", "RUNSTR", "0.2.6"]
```
- **Purpose**: Client name and version for compatibility tracking
- **Format**: Client name, version number
- **Example**: `["client", "RUNSTR", "0.2.6"]`

### `t` - Hashtag
```typescript
["t", "Running"]
```
- **Purpose**: Hashtag for social discoverability
- **Format**: Capitalized activity type
- **Example**: `["t", "Cycling"]`, `["t", "Strength"]`

## Optional Tags

### `calories` - Calorie Count
```typescript
["calories", "312"]
```
- **Purpose**: Calories burned during workout
- **Format**: Integer as string
- **Example**: `["calories", "450"]`

### `elevation_gain` - Elevation Gain
```typescript
["elevation_gain", "50", "m"]
```
- **Purpose**: Vertical elevation gained
- **Format**: Three elements - tag name, value, unit
- **Valid Units**: `m`, `ft`
- **Example**: `["elevation_gain", "164", "ft"]`

### `avg_heart_rate` - Average Heart Rate
```typescript
["avg_heart_rate", "142"]
```
- **Purpose**: Average heart rate in BPM
- **Format**: Integer as string
- **Example**: `["avg_heart_rate", "155"]`

### `max_heart_rate` - Maximum Heart Rate
```typescript
["max_heart_rate", "175"]
```
- **Purpose**: Peak heart rate in BPM
- **Format**: Integer as string
- **Example**: `["max_heart_rate", "182"]`

### `split` - Kilometer Split Times (Race Replay Data)
```typescript
["split", "1", "00:05:12"]
```
- **Purpose**: Individual kilometer split times for race replay visualization
- **Format**: Three elements - tag name, km number (string), elapsed time (HH:MM:SS)
- **Example**: `["split", "3", "00:16:20"]` (km 3 completed at 16:20 total elapsed)
- **Note**: Multiple split tags allowed (one per kilometer)
- **Used For**: Website race replay animations showing runner progression

### `avg_pace` - Average Pace
```typescript
["avg_pace", "05:24", "min/km"]
```
- **Purpose**: Average pace across entire workout
- **Format**: Three elements - tag name, pace (MM:SS), unit
- **Valid Units**: `min/km`, `min/mi`
- **Example**: `["avg_pace", "08:42", "min/mi"]`
- **Note**: Calculated from total distance / total duration

### `elevation_loss` - Elevation Loss
```typescript
["elevation_loss", "85", "m"]
```
- **Purpose**: Vertical elevation lost during workout
- **Format**: Three elements - tag name, value, unit
- **Valid Units**: `m`, `ft`
- **Example**: `["elevation_loss", "279", "ft"]`

### `split_pace` - Individual Split Pace
```typescript
["split_pace", "1", "360"]
```
- **Purpose**: Pace for individual kilometer/mile splits (in seconds per km/mi)
- **Format**: Three elements - tag name, split number (string), pace in seconds
- **Example**: `["split_pace", "3", "342"]` (5:42/km for split 3)
- **Note**: Multiple split_pace tags allowed (one per split)

### `data_points` - GPS Sample Count
```typescript
["data_points", "457"]
```
- **Purpose**: Number of GPS location samples recorded during workout
- **Format**: Integer as string
- **Example**: `["data_points", "1203"]`
- **Note**: Higher values indicate more detailed GPS tracking

### `recording_pauses` - Pause Count
```typescript
["recording_pauses", "2"]
```
- **Purpose**: Number of times workout tracking was paused
- **Format**: Integer as string
- **Example**: `["recording_pauses", "0"]`

### `workout_start_time` - Workout Start Timestamp
```typescript
["workout_start_time", "1736950800"]
```
- **Purpose**: Unix timestamp (seconds) when workout actually started
- **Format**: Unix timestamp as string
- **Example**: `["workout_start_time", "1736950800"]`
- **Note**: Different from event `created_at` which is publication time

### `charity` - User's Selected Charity
```typescript
["charity", "hrf", "Human Rights Foundation", "hrf@btcpay.hrf.org"]
```
- **Purpose**: Charity the user supports (for donations/zapping)
- **Format**: Four elements - tag name, charity ID, display name, lightning address
- **Example**: `["charity", "opensats", "OpenSats", "opensats@vlt.ge"]`
- **Note**: Enables other clients to display charity info and facilitate donations

### `team` - Competition Team
```typescript
["team", "team_id_here"]
```
- **Purpose**: Team the workout is being submitted for (for leaderboard participation)
- **Format**: Two elements - tag name, team ID
- **Example**: `["team", "bitcoin-runners-nyc"]`
- **Note**: Used for daily leaderboards and competition tracking

### `reward_destination` - Reward Routing
```typescript
["reward_destination", "user"]
```
- **Purpose**: Tells the external reward service where to send the 50 sat reward
- **Format**: Two elements - tag name, destination type
- **Valid Values**: `user`, `charity`
- **Logic**:
  - `user`: User has "Rewards to Me" toggle enabled AND has a Lightning address configured
  - `charity`: User wants rewards to go to their selected team/charity (or has no Lightning address)
- **Note**: External reward service reads this tag to route payments automatically
- **Fallback**: If no Lightning address is configured, rewards always route to charity

### `lightning` - User's Lightning Address
```typescript
["lightning", "user@getalby.com"]
```
- **Purpose**: User's Lightning address for receiving workout rewards
- **Format**: Two elements - tag name, Lightning address
- **Example**: `["lightning", "alice@primal.net"]`
- **Note**: Used by external reward service when `reward_destination` is `user`

### `v` - Verification Code
```typescript
["v", "abc123xyz"]
```
- **Purpose**: Rolling verification code for anti-bot protection
- **Format**: Two elements - tag name, verification code
- **Source**: Obtained from the kind 30150 leaderboard note published by external aggregator
- **Validity**: Codes are valid for 5 minutes (current + 2 previous codes accepted)
- **Note**: External reward service validates this code to ensure workouts were created recently

## Content Field

The `content` field must be **plain text**, NOT JSON.

**Valid Examples:**
```
"Completed a running workout with RUNSTR!"
"Morning 5K run - felt great!"
"Strength training session at the gym"
```

**Invalid Example:**
```json
"{\"distance\": \"5.2\", \"duration\": \"00:30:45\"}"  // ❌ NO JSON
```

## Supported Activities

### Cardio Activities
- **running** - Road running, trail running, treadmill
- **walking** - Walking, power walking, hiking on flat terrain
- **cycling** - Road cycling, mountain biking, stationary bike
- **hiking** - Trail hiking with elevation
- **swimming** - Pool swimming, open water swimming
- **rowing** - Rowing machine, outdoor rowing

### Strength Activities
- **strength** - Covers all strength training:
  - Weight lifting
  - Bodyweight exercises (pushups, pullups, situps)
  - Gym workouts
  - Resistance training

### Wellness Activities
- **yoga** - Yoga sessions, stretching
- **meditation** - Meditation, mindfulness practice

### Other Activities
- Any manually-entered workout type is valid
- Use lowercase descriptive names

## Validation Rules

### Exercise Type Format
- ✅ **Correct**: `["exercise", "running"]` (lowercase full word)
- ❌ **Incorrect**: `["exercise", "run"]` (shortened)
- ❌ **Incorrect**: `["exercise", "Running"]` (capitalized)

### Distance Format
- ✅ **Correct**: `["distance", "5.2", "km"]` (separate elements)
- ❌ **Incorrect**: `["distance", "5.2 km"]` (combined)
- ❌ **Incorrect**: `["distance", 5.2, "km"]` (number instead of string)

### Duration Format
- ✅ **Correct**: `["duration", "00:30:45"]` (HH:MM:SS)
- ❌ **Incorrect**: `["duration", "1845"]` (seconds)
- ❌ **Incorrect**: `["duration", "30:45"]` (missing hours)

## Competition Compatibility

### RUNSTR In-App Competitions
RUNSTR supports **all activity types** for in-app competitions:
- Running, walking, cycling, hiking, swimming, rowing
- Strength training workouts
- Yoga and meditation sessions

### External RUNSTR Leaderboards
External leaderboards (runstr.app website) currently support **cardio activities only**:
- Running, walking, cycling, hiking, swimming, rowing
- Strength and wellness activities are NOT included in external leaderboards

## Example Events

### Running Workout (with Enhanced Tracking Data)
```json
{
  "kind": 1301,
  "content": "Morning 5K run - beautiful weather!",
  "tags": [
    ["d", "workout_2024-01-15_082345"],
    ["title", "Morning 5K"],
    ["exercise", "running"],
    ["distance", "5.0", "km"],
    ["duration", "00:28:15"],
    ["calories", "285"],
    ["elevation_gain", "45", "m"],
    ["elevation_loss", "38", "m"],
    ["avg_heart_rate", "142"],
    ["split", "1", "00:05:38"],
    ["split", "2", "00:11:22"],
    ["split", "3", "00:17:05"],
    ["split", "4", "00:22:41"],
    ["split", "5", "00:28:15"],
    ["split_pace", "1", "338"],
    ["split_pace", "2", "344"],
    ["split_pace", "3", "343"],
    ["split_pace", "4", "336"],
    ["split_pace", "5", "334"],
    ["avg_pace", "05:39", "min/km"],
    ["data_points", "1687"],
    ["recording_pauses", "1"],
    ["workout_start_time", "1736950800"],
    ["team", "als-foundation"],
    ["charity", "als-foundation", "ALS Network", "RunningBTC@primal.net"],
    ["lightning", "alice@getalby.com"],
    ["reward_destination", "charity"],
    ["source", "gps"],
    ["client", "RUNSTR", "1.6.3"],
    ["t", "Running"]
  ]
}
```

### Strength Training (Bodyweight Exercise)
```json
{
  "kind": 1301,
  "content": "100 pushups in 5 minutes - new PR!",
  "tags": [
    ["d", "workout_2024-01-15_183000"],
    ["title", "Pushup Challenge"],
    ["exercise", "strength"],
    ["exercise_type", "pushups"],
    ["duration", "00:05:00"],
    ["sets", "5"],
    ["reps", "100"],
    ["calories", "45"],
    ["source", "RUNSTR"],
    ["client", "RUNSTR", "0.2.6"],
    ["t", "Strength"]
  ]
}
```

**Note**: Bodyweight exercises (pushups, pullups, situps) do not include weight tags, as weight is implicit (user's body weight) and used in calorie calculations.

### Strength Training (Weighted Exercise with Progressive Sets)
```json
{
  "kind": 1301,
  "content": "Bench press workout - increasing weight each set",
  "tags": [
    ["d", "workout_2024-01-15_190000"],
    ["title", "Bench Press"],
    ["exercise", "strength"],
    ["exercise_type", "bench"],
    ["duration", "00:15:30"],
    ["sets", "5"],
    ["reps", "25"],
    ["weight", "165", "lbs"],
    ["weight_set", "1", "135", "lbs"],
    ["weight_set", "2", "155", "lbs"],
    ["weight_set", "3", "175", "lbs"],
    ["weight_set", "4", "185", "lbs"],
    ["weight_set", "5", "155", "lbs"],
    ["calories", "78"],
    ["source", "RUNSTR"],
    ["client", "RUNSTR", "0.2.6"],
    ["t", "Strength"]
  ]
}
```

**Per-Set Weight Tags**:
- `weight`: Average weight across all sets (165 lbs = (135+155+175+185+155)/5)
- `weight_set`: Individual weight per set for volume-based competition scoring
- Format: `["weight_set", "<set_number>", "<weight>", "lbs"]`
- Enables competitions to calculate total volume: sum of (reps_per_set × weight_per_set)
- Example volume calculation: (5×135) + (5×155) + (5×175) + (5×185) + (5×155) = 4,025 lbs total volume

### Cycling with Elevation
```json
{
  "kind": 1301,
  "content": "Hill climbing cycling session",
  "tags": [
    ["d", "workout_2024-01-15_164500"],
    ["title", "Hill Climb"],
    ["exercise", "cycling"],
    ["distance", "25.5", "km"],
    ["duration", "01:22:30"],
    ["calories", "540"],
    ["elevation_gain", "320", "m"],
    ["avg_heart_rate", "158"],
    ["max_heart_rate", "178"],
    ["source", "RUNSTR"],
    ["client", "RUNSTR", "0.2.6"],
    ["t", "Cycling"]
  ]
}
```

## Publishing Workflow

### RUNSTR Two-Button System

Users can publish workouts in two ways:

1. **"Save to Nostr" (kind 1301)**
   - Creates kind 1301 event for competition entry
   - No social card generated
   - Counts toward team leaderboards
   - Used for competition participation

2. **"Post to Nostr" (kind 1)**
   - Creates kind 1 social post with beautiful card
   - Generates Instagram-worthy achievement graphic
   - Appears in social feeds
   - Used for sharing accomplishments

### HealthKit Integration

RUNSTR automatically imports Apple HealthKit workouts and converts them to kind 1301 format:

```typescript
// HealthKit workout → kind 1301 conversion
const workout = await HealthKit.getWorkout(workoutId);

const kind1301Event = {
  kind: 1301,
  content: `Completed a ${workout.activityType} workout with RUNSTR!`,
  tags: [
    ["d", workout.uuid],
    ["title", workout.name],
    ["exercise", mapHealthKitActivity(workout.activityType)],
    ["distance", workout.totalDistance.toString(), "km"],
    ["duration", formatDuration(workout.duration)],
    ["calories", workout.totalEnergyBurned.toString()],
    ["source", "RUNSTR"],
    ["client", "RUNSTR", version],
    ["t", capitalizeActivity(workout.activityType)]
  ]
};
```

## Query Patterns

### Fetch User Workouts
```typescript
const filter = {
  kinds: [1301],
  authors: [userPubkey],
  since: startTimestamp,
  until: endTimestamp
};

const workouts = await ndk.fetchEvents(filter);
```

### Fetch Team Member Workouts
```typescript
const filter = {
  kinds: [1301],
  authors: teamMemberPubkeys,  // Array of pubkeys
  since: competitionStartTime,
  until: competitionEndTime
};

const workouts = await ndk.fetchEvents(filter);
```

### Filter by Activity Type
```typescript
const filter = {
  kinds: [1301],
  authors: [userPubkey],
  '#exercise': ['running']  // Only running workouts
};

const runningWorkouts = await ndk.fetchEvents(filter);
```

## Related Documentation

- 📖 **For competition architecture**: [nostr-native-fitness-competitions.md](./nostr-native-fitness-competitions.md)
- 📖 **For HealthKit integration**: [HEALTHKIT_IMPLEMENTATION_GUIDE.md](./HEALTHKIT_IMPLEMENTATION_GUIDE.md)
- 📖 **For workout publishing**: See main CLAUDE.md App Flow Architecture section
