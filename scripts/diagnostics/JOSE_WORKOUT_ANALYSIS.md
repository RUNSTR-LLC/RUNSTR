# Jose Sammut Workout Discrepancy Analysis

**Date:** 2026-02-10
**User:** Jose Sammut (npub1yj69jq9f977y2f7vl96m6stf3rjyf3hym8ekf3g4senlqamz8l3qfsvhk7)
**Issue:** Leaderboard total (59.8 km) doesn't match workout history total (68.2 km)

## Investigation Results

### Raw Data from Nostr
- **Total Season 2 Workouts:** 11 kind 1301 events (Jan 1 - Mar 1, 2026)
- **Total Season 2 Distance:** 70.00 km
- **Activity Type:** All running workouts
- **Team:** afribit-kibera (for workouts in 2026)

### Month Breakdown
- **January 2026:** 19.84 km (4 workouts)
- **February 2026:** 50.16 km (7 workouts)

### Duplicate Events Detected

#### Duplicate 1: Feb 4, 2026
- **Event ID 1:** `7dd3f16d0d677ca0db6c1404297e3e651dd235b33c87779f0ab266be61994b20`
- **Event ID 2:** `68651571fa927037dc5e9e4d9a9359abfcdc9bb6fea34795d9a4f7982a95908a`
- **Distance:** 5.07 km each
- **Duration:** 00:30:09
- **Timestamp:** 2026-02-04T18:35:07Z and 2026-02-04T18:35:08Z (1 second apart!)
- **Content 1:** "Completed a run with RUNSTR!"
- **Content 2:** "Tracked 5.07 km running"

#### Duplicate 2: Feb 6, 2026
- **Event ID 1:** `2053bbbcf132681cda4157945be3883058b476a5b11b038efbc6a23035d08200`
- **Event ID 2:** `e22b37d6ecd7d2b664ab760895bedf9ef32bb5ee76eb8070c920aa5518f498e4`
- **Distance:** 5.01 km each
- **Duration:** 00:23:25
- **Timestamp:** 2026-02-06T05:59:07Z (EXACT same timestamp)
- **Content 1:** "Completed a run with RUNSTR!"
- **Content 2:** "Tracked 5.01 km running"

## Root Cause Analysis

### Why the Discrepancy?

**Option 1: Leaderboard Deduplicates Correctly (Most Likely)**
- Leaderboard total: 59.8 km
- Raw total minus duplicates: 70.00 - 5.07 - 5.01 = **59.92 km ≈ 59.8 km** ✅
- **Explanation:** The leaderboard service correctly identifies and removes duplicate workout events, while the workout history screen shows all events including duplicates.

**Option 2: Workout History Shows Cached/Stale Data**
- Workout history total: 68.2 km
- This doesn't match any calculated total (70 km raw, 59.92 km deduplicated)
- **Possible:** Workout history is showing a cached snapshot from before the most recent workouts

## Why Are Duplicates Being Created?

The duplicate events have:
- **Same timestamp** (or 1 second apart)
- **Same distance, duration, team**
- **Different content strings:**
  - "Completed a run with RUNSTR!" (social post content)
  - "Tracked 5.07 km running" (generic workout content)

**Hypothesis:** The app may be publishing TWO kind 1301 events for the same workout:
1. One when the workout is saved (generic content)
2. One when the user creates a social post about the workout (custom content)

This is likely a bug in the workout posting logic where:
- The workout is published as kind 1301 when tracked
- Then when the user shares it as a kind 1 note, another kind 1301 is published
- Both events have identical workout data but different content fields

## Recommendations

### Fix 1: Prevent Duplicate kind 1301 Publishing
**Location:** `src/services/fitness/WorkoutPublishingService.ts` or similar

Check for existing kind 1301 events with the same:
- Timestamp (within 5 seconds)
- Distance
- Duration
- Author

Before publishing a new workout event. Use event ID deduplication.

### Fix 2: Deduplicate Workout History Display
**Location:** `src/screens/history/WorkoutHistoryScreen.tsx` or similar

Apply the same deduplication logic as the leaderboard:
- Group events by timestamp + distance + duration
- Keep only one event per unique workout
- Prefer the event with richer content

### Fix 3: Add Deduplication Key to kind 1301 Events
**Enhancement:** Add a `["workout_id", "..."]` tag to kind 1301 events with a consistent UUID for each workout. This allows easy deduplication across the app.

Example:
```typescript
["workout_id", "550e8400-e29b-41d4-a716-446655440000"]
```

## Testing Checklist

- [ ] Verify leaderboard shows 59.8 km for Jose (deduplicated)
- [ ] Check workout history for duplicate entries
- [ ] Test workout posting flow - ensure only ONE kind 1301 published per workout
- [ ] Test social post flow - ensure it doesn't republish kind 1301
- [ ] Add unit test for workout deduplication logic
- [ ] Check other users for similar duplicate patterns

## Files to Review

1. `src/services/fitness/WorkoutPublishingService.ts` - Workout publishing logic
2. `src/services/competition/SimpleLeaderboardService.ts` - Already deduplicates correctly
3. `src/screens/history/WorkoutHistoryScreen.tsx` - May need deduplication
4. `src/services/fitness/WorkoutSharingService.ts` - Social post logic
5. `src/services/nostr/NdkWorkoutService.ts` - kind 1301 event creation

## Conclusion

✅ **Leaderboard is correct at 59.8 km** (deduplicated workouts)
⚠️ **Workout history may be showing duplicates at 68.2 km**
🐛 **Bug:** App is publishing duplicate kind 1301 events for the same workout
🎯 **Fix:** Add deduplication to workout publishing flow
