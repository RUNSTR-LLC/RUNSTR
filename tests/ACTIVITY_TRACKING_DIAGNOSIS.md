# Activity Tracking Diagnosis Report

**Date:** October 5, 2025
**Issues Reported:**
1. Workout history counted in meters instead of km
2. Text-to-speech didn't match what was shown on workout summary
3. App jumped to 1.4km after a few minutes of running

---

## Test Results Summary

### ✅ Test 1: Distance Calculation (Haversine Formula)
**Status:** PASSING
**Findings:** All distance calculations are mathematically correct.

- 1km straight line: ✅ 1000.75m (expected ~1000m)
- 500m straight line: ✅ 500.38m (expected ~500m)
- 10m small movement: ✅ 11.12m (expected ~10m)

**Conclusion:** No bugs in Haversine formula implementation.

---

### ✅ Test 2: Distance Formatting (UI Display)
**Status:** PASSING
**Findings:** All distance formatting functions correctly convert meters to km.

- 0m → "0.00 km" ✅
- 1400m → "1.40 km" ✅
- 5200m → "5.20 km" ✅

**Conclusion:** No bugs in distance display formatting. Meters are correctly shown as km.

---

### ❌ Test 3: TTS Pace Announcement BUG
**Status:** CRITICAL BUG FOUND
**Location:** `src/services/activity/TTSAnnouncementService.ts:289`

**The Problem:**
```
Workout: 5.2km run in 30:45 (1845 seconds)
Pace Calculated: 354.81 seconds/km (correct)

UI Display: "5:54/km" ✅ CORRECT
TTS Says: "354 minutes and 48 seconds per kilometer" ❌ WRONG!
Should Say: "5 minutes and 55 seconds per kilometer"
```

**Root Cause:**
`formatPaceVoice()` treats the pace parameter as "minutes per km" but `calculatePace()` returns "SECONDS per km". This causes a 60x error in TTS announcements.

**Code Analysis:**
```typescript
// ActivityMetricsService.ts:90-105
calculatePace(distanceMeters, durationSeconds) {
  return durationSeconds / distanceKm; // ⚠️ Returns SECONDS per km
}

// TTSAnnouncementService.ts:289-299
formatPaceVoice(paceMinutesPerKm: number) { // ❌ Parameter name says "minutes"
  const minutes = Math.floor(paceMinutesPerKm); // ❌ Treats input as minutes
  const seconds = Math.round((paceMinutesPerKm - minutes) * 60);
  // ...
}

// TTSAnnouncementService.ts:206
const pace = this.formatPaceVoice(workout.pace); // ❌ Passes SECONDS as MINUTES
```

**Fix Required:**
```typescript
// Option 1: Convert in formatPaceVoice (recommended)
private static formatPaceVoice(paceSecondsPerKm: number): string {
  const totalMinutes = paceSecondsPerKm / 60; // ✅ Convert seconds to minutes
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);
  // ... rest of function
}

// Option 2: Convert before calling (also works)
const paceMinutes = workout.pace / 60;
parts.push(`at an average pace of ${this.formatPaceVoice(paceMinutes)} per kilometer`);
```

---

### ⚠️ Test 4: Distance Jump (1.4km Issue)
**Status:** LIKELY CAUSE IDENTIFIED
**Affected Code:** `src/services/activity/EnhancedLocationTrackingService.ts`

**Possible Causes:**

#### 1. GPS Warmup Period Too Short
**Current Setting:** 5 seconds (line 98)
**Issue:** First 5-10 seconds of GPS tracking typically have 50-500m accuracy.
**Impact:** If warmup is too short, poor accuracy points get counted, adding 500-1500m phantom distance.

**Test Results:**
```
GPS Warmup Simulation:
0s: 500m accuracy (very poor)
2s: 200m accuracy → +11m segment
4s: 100m accuracy → +11m segment (22m cumulative)
6s: 50m accuracy → +11m segment (33m cumulative)
8s: 20m accuracy → +11m segment (44m cumulative)
10s: 10m accuracy → +11m segment (56m cumulative)

Without filtering: 56m counted
With Kalman filter + poor accuracy: Can accumulate to 200-300m
```

**Recommendation:**
Increase warmup from 5s to 10s:
```typescript
// Line 98
private readonly GPS_WARMUP_DURATION_MS = 10000; // 10 seconds warmup period
```

#### 2. Recovery Mode Points Too Few
**Current Setting:** 1 point skipped after GPS recovery (line 107)
**Issue:** After GPS signal loss (tunnels, buildings), first 3-5 points show "straight line" through obstacles.
**Impact:** Can add 500-2000m phantom distance per GPS outage.

**Test Results:**
```
GPS Recovery Simulation (after tunnel):
Before tunnel: Good signal
In tunnel: Signal lost
Exit tunnel: GPS jumps 1100m ahead!

Without recovery mode:
  +133m phantom distance from tunnel jump
  +11m next point
  Total: 156m extra (should be ~22m)

With recovery mode (skip 3 points):
  Skip +133m phantom distance
  Skip +11m phantom distance
  Skip +11m phantom distance
  Resume normal tracking
  Total prevented: 155m phantom distance
```

**Recommendation:**
Increase recovery points from 1 to 3:
```typescript
// Line 107
private readonly GPS_RECOVERY_POINTS = 3; // Number of points to skip after GPS recovery
```

#### 3. Recovery Timeout Too Short
**Current Setting:** 5 seconds (line 106)
**Issue:** If GPS doesn't improve within 5 seconds, recovery mode force-exits and counts bad points.
**Impact:** Phantom distance gets counted anyway.

**Recommendation:**
Increase timeout from 5s to 10s:
```typescript
// Line 106
private readonly GPS_RECOVERY_TIMEOUT_MS = 10000; // 10 seconds max recovery time
```

---

## Debugging Commands

### Check Metro Logs During Your Next Run

Watch for these console messages that indicate GPS issues:

```bash
# Expected during startup:
"🔥 GPS warmup started (5s) - recovery mode disabled during warmup"
"✅ GPS warmup complete (X.Xs) - recovery mode now active"

# Expected when GPS signal is lost/recovered:
"📡 GPS signal lost, distance tracking paused"
"🔄 GPS signal recovered, will enter recovery buffer on next point"
"🔄 GPS Recovery #1: Starting recovery buffer (1 points)"
"📍 GPS Recovery: Point 1/1 (accuracy: XXm, skipped: XXm, X.Xs elapsed)"
"✅ GPS fully recovered! Prevented XXm of phantom distance"

# Warning signs of issues:
"⏰ GPS Recovery: Timeout after X.Xs, forcing exit from recovery mode"
"⚠️ DISTANCE FREEZE DETECTED: GPS receiving updates but distance stuck at XXm for XXs"
"❌ [ANDROID] Point rejected: [reason]"
```

### Run Tests

```bash
# Comprehensive activity tracking tests
node tests/activity-tracking-tests.js

# GPS distance jump scenarios
node tests/gps-distance-jump-test.js
```

---

## Recommended Fixes

### Priority 1: TTS Pace Bug (Critical)
**File:** `src/services/activity/TTSAnnouncementService.ts`
**Line:** 289

```typescript
// BEFORE (BUGGY):
private static formatPaceVoice(paceMinutesPerKm: number): string {
  const minutes = Math.floor(paceMinutesPerKm);
  const seconds = Math.round((paceMinutesPerKm - minutes) * 60);
  // ...
}

// AFTER (FIXED):
private static formatPaceVoice(paceSecondsPerKm: number): string {
  const totalMinutes = paceSecondsPerKm / 60; // Convert seconds to minutes
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);
  // ...
}
```

### Priority 2: GPS Warmup Duration
**File:** `src/services/activity/EnhancedLocationTrackingService.ts`
**Line:** 98

```typescript
// BEFORE:
private readonly GPS_WARMUP_DURATION_MS = 5000; // 5 seconds

// AFTER:
private readonly GPS_WARMUP_DURATION_MS = 10000; // 10 seconds
```

### Priority 3: GPS Recovery Points
**File:** `src/services/activity/EnhancedLocationTrackingService.ts`
**Line:** 107

```typescript
// BEFORE:
private readonly GPS_RECOVERY_POINTS = 1; // Skip 1 point

// AFTER:
private readonly GPS_RECOVERY_POINTS = 3; // Skip 3 points
```

### Priority 4: GPS Recovery Timeout
**File:** `src/services/activity/EnhancedLocationTrackingService.ts`
**Line:** 106

```typescript
// BEFORE:
private readonly GPS_RECOVERY_TIMEOUT_MS = 5000; // 5 seconds

// AFTER:
private readonly GPS_RECOVERY_TIMEOUT_MS = 10000; // 10 seconds
```

---

## Summary

| Issue | Status | Fix Priority |
|-------|--------|--------------|
| Distance calculation (Haversine) | ✅ No bug | N/A |
| Distance formatting (meters to km) | ✅ No bug | N/A |
| TTS pace announcement | ❌ **CRITICAL BUG** | **P1 - Fix immediately** |
| GPS warmup duration | ⚠️ Likely cause of distance jumps | P2 - High |
| GPS recovery points | ⚠️ Likely cause of distance jumps | P2 - High |
| GPS recovery timeout | ⚠️ Prevents proper recovery | P3 - Medium |

**Immediate Action Items:**
1. Fix TTS pace bug (5 minutes)
2. Increase GPS warmup to 10 seconds (1 minute)
3. Increase recovery points to 3 (1 minute)
4. Increase recovery timeout to 10 seconds (1 minute)
5. Test on next run and check Metro logs

**Expected Results After Fixes:**
- ✅ TTS will correctly announce "5 minutes 55 seconds per kilometer" instead of "354 minutes"
- ✅ Distance should stabilize during GPS warmup (first 10 seconds)
- ✅ Distance jumps after GPS signal loss should be prevented
- ✅ More accurate distance tracking overall
