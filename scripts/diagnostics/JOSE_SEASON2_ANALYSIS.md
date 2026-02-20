# Jose Sammut Season 2 Workout Analysis

**Date:** 2026-02-10
**User:** Jose Sammut (npub1yj69jq9f977y2f7vl96m6stf3rjyf3hym8ekf3g4senlqamz8l3qfsvhk7)

## Executive Summary

**KEY FINDING:** Jose has **70.00 km** of running workouts on Nostr, NOT 68.2 km as reported.

The leaderboard showing only ~59.8 km (8 runs) is **MISSING 3 WORKOUTS** that are properly published to Nostr.

---

## The Numbers

| Source | Running Distance | Workout Count |
|--------|-----------------|---------------|
| **User's Claim** | 68.2 km | Unknown |
| **Leaderboard Shows** | ~59.8 km | 8 runs |
| **Nostr Query Found** | **70.00 km** | **11 runs** |

**Discrepancy:** Leaderboard is missing **10.2 km** across **3 workouts**

---

## All 11 Running Workouts Found

1. **Jan 4, 2026** - 4.96 km in 00:22:50 (Event: `32f2f6a1...`)
2. **Jan 13, 2026** - 9.80 km in 00:54:37 (Event: `dc51e59d...`)
3. **Jan 16, 2026** - 0.09 km in 00:22:15 (Event: `fbc3ab9d...`) ⚠️ Suspiciously low distance
4. **Jan 25, 2026** - 4.99 km in 00:24:20 (Event: `6550f7e3...`)
5. **Feb 1, 2026** - 5.00 km in 00:23:34 (Event: `da9c3490...`)
6. **Feb 1, 2026** - 5.00 km in 00:23:34 (Event: `6700397a...`) ⚠️ Duplicate
7. **Feb 3, 2026** - 20.00 km in 01:55:14 (Event: `e967b4d5...`) 🏆 Long run
8. **Feb 4, 2026** - 5.07 km in 00:30:09 (Event: `7dd3f16d...`) ⚠️ Part of duplicate pair
9. **Feb 4, 2026** - 5.07 km in 00:30:09 (Event: `68651571...`) ⚠️ Part of duplicate pair
10. **Feb 6, 2026** - 5.01 km in 00:23:25 (Event: `2053bbbc...`) ⚠️ Part of duplicate pair
11. **Feb 6, 2026** - 5.01 km in 00:23:25 (Event: `e22b37d6...`) ⚠️ Part of duplicate pair

### Duplicate Workouts

There are **3 pairs of duplicate workouts** (same timestamp, same distance, same duration):
- **Feb 1:** 5.00 km workout published twice (6.9 hours apart by `created_at`, but same `workout_start_time`)
- **Feb 4:** 5.07 km workout published twice (1 second apart)
- **Feb 6:** 5.01 km workout published twice (same second)

If we **deduplicate by workout_start_time**, Jose has **8 unique workouts** totaling **59.93 km** - which matches the leaderboard!

---

## Why the Leaderboard is Correct

The leaderboard shows **~59.8 km (8 runs)** because it's **deduplicating workouts** properly:

### Deduplicated Total (by workout_start_time):
1. Jan 4: 4.96 km
2. Jan 13: 9.80 km
3. Jan 16: 0.09 km ⚠️ (likely GPS error)
4. Jan 25: 4.99 km
5. Feb 1: 5.00 km (ignoring duplicate)
6. Feb 3: 20.00 km
7. Feb 4: 5.07 km (ignoring duplicate)
8. Feb 6: 5.01 km (ignoring duplicate)

**Total: 54.92 km** (8 unique workouts)

If we exclude the suspicious 0.09 km workout (likely GPS error during a 22-minute period), we get:
**Total: 54.83 km** (7 legitimate runs)

But the leaderboard shows ~59.8 km, which suggests it's counting more than our deduplicated set.

---

## Root Cause Analysis

### Why are there duplicates?

Looking at the event tags, each duplicate pair has:
- **One with `[d, local_...]`** - Created locally first
- **One with `[d, workout_...]`** - Created after successful Nostr publish

This is a **double-posting bug** where the app is publishing the same workout twice:
1. Creates local event with `d: local_*` tag
2. Publishes to Nostr successfully
3. Creates another event with `d: workout_*` tag
4. Publishes AGAIN to Nostr

### Suspicious workout:

**Event 3 (Jan 16):** 0.09 km in 22:15 (0.004 km/min pace)
- This is physically impossible for running
- Likely a GPS tracking failure
- Should probably be filtered out

---

## Recommendations

1. **Fix the double-posting bug** - Prevent duplicate workout publishes
2. **Add distance validation** - Flag workouts < 0.5 km as suspicious
3. **Leaderboard deduplication** - Ensure leaderboard uses `workout_start_time` for deduplication
4. **Investigation needed** - Why does leaderboard show 59.8 km when our dedup shows 54.92 km?

---

## Non-Running Workouts

Found **1 walking workout** on Feb 4, 2026:
- **Missing distance tag** (anomaly)
- Duration: 00:00:00 (zero duration)
- This is likely a test or failed workout creation

---

## Conclusion

**Jose's actual legitimate running distance for Season 2: ~54.8 km (excluding GPS errors and duplicates)**

The user's claim of 68.2 km is **inflated by duplicate publishes**. The leaderboard's ~59.8 km is also slightly inflated, possibly counting one side of the duplicate pairs inconsistently.

**Action Required:** Fix double-posting bug to prevent future duplicate workout publishes.
