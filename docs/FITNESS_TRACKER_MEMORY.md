# FITNESS TRACKER MEMORY

**Purpose**: Document known issues, fixes, edge cases, and architecture decisions for RUNSTR's GPS-based fitness tracking system.

**Last Updated**: January 2025

---

## Critical Bugs Fixed (Commit 364a325 - January 2025)

### 1. Distance Freeze Bug ❌ FIXED

**Problem**: Distance would freeze after ~10 seconds while timer continued running.

**Root Cause**: Stale closure in timer interval callback. The `isPaused` state variable was captured when the interval was created, so checking `if (!isPaused)` in the timer callback always read the initial `false` value, never the updated state.

**Solution**:
- Added `isPausedRef` ref to track pause state
- Timer interval now checks `isPausedRef.current` instead of `isPaused` state
- Ref updates immediately when pause/resume is called, preventing stale closure issues

**Code Pattern**:
```typescript
const isPausedRef = useRef<boolean>(false);

// In timer:
timerRef.current = setInterval(() => {
  if (!isPausedRef.current) {  // ✅ Read from ref
    // Update elapsed time
  }
}, 1000);

// On pause:
setIsPaused(true);
isPausedRef.current = true;  // Update ref immediately

// On resume:
setIsPaused(false);
isPausedRef.current = false;  // Update ref immediately
```

**Files Fixed**:
- `RunningTrackerScreen.tsx` (original fix)
- `WalkingTrackerScreen.tsx` (January 2025 quick win)
- `CyclingTrackerScreen.tsx` (January 2025 quick win)

---

### 2. 20-Minute Crash Bug ❌ FIXED

**Problem**: App would crash after ~20 minutes of continuous tracking.

**Root Cause**: Location subscription not cleaned up properly, leading to memory leaks and eventual crash.

**Solution**:
- Added proper cleanup in `useEffect` return function
- Clear both `timerRef` and `metricsUpdateRef` on component unmount
- Service properly stops location subscription when tracking ends

**Code Pattern**:
```typescript
useEffect(() => {
  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (metricsUpdateRef.current) clearInterval(metricsUpdateRef.current);
  };
}, []);
```

---

### 3. Zombie Session Bug ❌ FIXED

**Problem**: Users would get stuck unable to start new activities after app crash or force-quit during active session.

**Root Cause**: Previous session state persisted in service singleton, preventing new session creation.

**Solution**:
- Added zombie session detection on startup
- Auto-cleanup for sessions older than 4 hours
- User-prompted cleanup for recent sessions that might be legitimate
- `forceCleanup` parameter in `startTracking()` to override zombie sessions

**Code Pattern**:
```typescript
const startTracking = async () => {
  const currentState = enhancedLocationTrackingService.getTrackingState();

  if (currentState !== 'idle' && currentState !== 'requesting_permissions') {
    const existingSession = enhancedLocationTrackingService.getCurrentSession();

    if (existingSession) {
      const sessionAge = Date.now() - existingSession.startTime;
      const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

      if (sessionAge > FOUR_HOURS_MS) {
        // Auto-cleanup stale zombie session
        Alert.alert('Cleaning Up', 'Found and removed a stale activity session.');
      } else {
        // Prompt user for cleanup of recent session
        Alert.alert(
          'Active Session Detected',
          'Would you like to clean it up and start fresh?',
          [
            { text: 'Cancel' },
            { text: 'Clean Up', onPress: () => startTracking() }
          ]
        );
        return;
      }
    }
  }

  const started = await enhancedLocationTrackingService.startTracking('running');
  // ...
};
```

**Files Fixed**:
- `RunningTrackerScreen.tsx` (original fix)
- `WalkingTrackerScreen.tsx` (January 2025 quick win)
- `CyclingTrackerScreen.tsx` (January 2025 quick win)

---

## Architecture Decisions

### 1. Kalman Filtering for Distance Smoothing

**Why**: Raw GPS points are noisy and can jump around significantly, especially in urban areas with tall buildings.

**Implementation**: 1D Kalman filter smooths distance calculations while maintaining accuracy.

**Trade-offs**:
- ✅ Pros: Smoother UI, reduced phantom distance
- ⚠️ Cons: Slight processing overhead, requires tuning for different activity types

**File**: `KalmanDistanceFilter.ts`

---

### 2. GPS Recovery System (3-Point Buffer)

**Why**: When GPS signal is lost and regained, the first few points are often inaccurate, causing phantom distance spikes.

**Implementation**:
- After GPS recovery, skip first 3 points for distance calculation
- Use Kalman prediction for UI updates during recovery
- Track "skipped recovery distance" in statistics

**Trade-offs**:
- ✅ Pros: Prevents phantom distance spikes after tunnels/buildings
- ⚠️ Cons: Slight distance undercount in edge cases (acceptable)

**File**: `EnhancedLocationTrackingService.ts:412-513`

---

### 3. Distance Freeze Detection

**Why**: GPS can sometimes keep reporting updates but distance stops increasing (stuck in calibration).

**Implementation**:
- Monitor distance updates every 5 seconds
- If distance unchanged for 10+ seconds while GPS active → trigger recovery
- Reset Kalman filter and force exit recovery mode

**Trade-offs**:
- ✅ Pros: Automatically recovers from stuck GPS state
- ⚠️ Cons: Could trigger false positives if user is stationary (mitigated by 10-second threshold)

**File**: `EnhancedLocationTrackingService.ts:665-714`

---

### 4. Platform-Specific GPS Validation

**Why**: Android GPS is 2x less accurate than iOS in real-world testing.

**Implementation**:
- iOS: 10m strong, 20m medium, 50m weak accuracy thresholds
- Android: 20m strong, 40m medium, 100m weak accuracy thresholds
- Android gets relaxed validation to prevent excessive point rejection

**Trade-offs**:
- ✅ Pros: Consistent user experience across platforms
- ⚠️ Cons: Slightly less precise distance on Android (acceptable)

**File**: `LocationValidator.ts:147-188`

---

## Known Edge Cases

### 1. GPS Recovery During Pause

**Scenario**: GPS is lost while activity is paused, then recovered during pause.

**Potential Issue**: Recovery system might try to prevent "phantom distance" on resume even though user was stationary.

**Mitigation**: Recovery system resets on resume, so this should be harmless. Monitor in production.

**Status**: Not yet observed in testing, theoretical concern.

---

### 2. Background Task Expiration (iOS)

**Scenario**: iOS limits background location to ~3 minutes. If user backgrounds app for 10+ minutes, what happens?

**Potential Issue**: Background sync assumes locations are being collected, but iOS may have stopped collection.

**Mitigation**: Background task properly handles expiration and logs warning. Distance may be undercounted for long background sessions.

**Status**: Known limitation, acceptable trade-off for battery life.

---

### 3. Rapid Start/Stop Cycles

**Scenario**: User starts and stops activities quickly (within GPS warmup period).

**Potential Issue**: GPS warmup flag might not reset properly between sessions.

**Mitigation**: Warmup flag is reset in `resetTrackingState()` method, which is called on stop.

**Status**: Handled correctly, verified in testing.

---

### 4. Timezone Changes During Activity

**Scenario**: User crosses timezone during workout (e.g., running across state line).

**Potential Issue**: Timestamp calculations could be affected, causing incorrect elapsed time.

**Mitigation**: All timestamps use `Date.now()` (UTC milliseconds), which is timezone-agnostic.

**Status**: Should work correctly, not yet tested in production.

---

### 5. Battery-Saving Mode Conflicts

**Scenario**: iOS Low Power Mode or Android Battery Saver enabled during tracking.

**Potential Issue**: GPS accuracy degrades significantly. Validator might reject all points.

**Mitigation**: BatteryOptimizationService adjusts accuracy thresholds based on battery mode.

**Status**: Handled correctly, but UX should warn users about accuracy impact.

---

## Performance Optimizations

### 1. Background Sync Timer (January 2025 Quick Win)

**Original**: Background sync timer ran every 5 seconds even when app was in foreground.

**Optimization**: Only run background sync when `AppState === 'background'`.

**Impact**: Reduces battery drain and unnecessary processing when app is active.

**Implementation**: Start timer in `AppState.addEventListener('background')`, stop in `AppState.addEventListener('active')`.

---

### 2. Metrics Update Intervals (January 2025 Quick Win)

**Original**: Walking updated every 3 seconds, Running/Cycling every 1 second (inconsistent).

**Optimization**: Unified all activities to 1-second updates for consistent UX.

**Impact**: Slightly higher battery usage for walking, but better user experience.

---

### 3. Magic Numbers → Named Constants

**Original**: Hardcoded values scattered throughout code (10, 50, 5000, etc.).

**Optimization**: Extracted to named constants with descriptive comments.

**Files**:
- `EnhancedLocationTrackingService.ts`: GPS thresholds, intervals
- `RunningTrackerScreen.tsx`: Timer intervals, min distance

**Impact**: Improved maintainability, easier tuning of parameters.

---

## Testing Recommendations

### Unit Tests Needed
- [ ] `KalmanDistanceFilter` - prediction and update cycles
- [ ] `LocationValidator` - platform-specific validation logic
- [ ] `ActivityStateMachine` - state transition guards

### Integration Tests Needed
- [ ] Pause/resume cycles - verify timer accuracy
- [ ] GPS recovery - verify phantom distance prevention
- [ ] Zombie session cleanup - verify auto-cleanup and user prompts
- [ ] Background transitions - verify background sync timing

### Performance Tests Needed
- [ ] 60+ minute workouts - ensure no memory leaks or degradation
- [ ] Rapid start/stop cycles - verify proper cleanup
- [ ] Low battery scenarios - verify graceful degradation

---

## Memory Leak Risks (Potential)

### 1. AppState Subscription Cleanup

**Location**: `EnhancedLocationTrackingService.ts:149`

**Issue**: `appStateSubscription` is created in constructor but never cleaned up in `cleanup()` method.

**Risk**: Low (singleton service, only one instance exists)

**Fix Needed**: Add `this.appStateSubscription?.remove()` to cleanup method.

---

### 2. State Machine Listeners

**Location**: `EnhancedLocationTrackingService.ts:310-313`

**Issue**: State machine listeners can accumulate if screens mount/unmount repeatedly.

**Risk**: Low (singleton service, listeners are replaced not added)

**Fix Needed**: Verify listeners are properly removed on service cleanup.

---

## Debugging Tips

### Enable Verbose GPS Logging

**Location**: `EnhancedLocationTrackingService.ts` (throughout)

**Usage**: Extensive `console.log` statements track GPS state, recovery, distance updates.

**Production**: Wrap in `if (__DEV__)` or use debug flag to disable in production builds.

---

### Metro Logs vs Xcode Logs

**Metro Bundler**: Shows app's `console.log()`, React Native errors, service initializations → **USE THIS FOR DEBUGGING**

**Xcode**: Shows native iOS system events, less useful for JavaScript logic → **USE FOR NATIVE ISSUES ONLY**

**Command**: Start Metro with `npx expo start --ios` and monitor output.

---

### Force Refresh After Changes

**Simulator**: Press `Cmd+R` to reload from Metro

**Clear Cache**: Use `npx expo start --clear` if changes aren't appearing

**Note**: Changes to `src/` files should auto-reload via Fast Refresh.

---

## Future Improvements

### Short-Term (Next Sprint)
- [ ] Add cleanup for `appStateSubscription` to prevent potential memory leak
- [ ] Wrap debug logging in `__DEV__` checks for production builds
- [ ] Test all 5 edge cases identified above (GPS recovery during pause, etc.)
- [ ] Add unit tests for `KalmanDistanceFilter`, `LocationValidator`, `ActivityStateMachine`

### Long-Term (Future Versions)
- [ ] Performance profiling for 60+ minute workouts
- [ ] Consider moving to TypeScript strict mode
- [ ] Extract GPS Recovery logic to separate `GPSRecoveryService.ts` (reduce EnhancedLocationTrackingService to <500 lines)
- [ ] Add telemetry to track real-world GPS accuracy and recovery success rates

---

## Change Log

**January 2025 - Quick Wins Implementation**
- Fixed timer closure bug in Walking/Cycling screens
- Added zombie session cleanup to Walking/Cycling screens
- Extracted magic numbers to named constants
- Unified metrics update intervals to 1 second
- Made background sync conditional on app state

**January 2025 - Commit 364a325**
- Fixed distance freeze bug (stale closure in timer)
- Fixed 20-minute crash bug (memory leak from location subscription)
- Fixed zombie session bug (auto-cleanup + user prompts)
- Added GPS recovery system with 3-point buffer
- Added distance freeze detection and auto-recovery
- Added Kalman filtering for distance smoothing

---

## References

**Related Files**:
- `EnhancedLocationTrackingService.ts` - Core GPS tracking service (1114 lines)
- `RunningTrackerScreen.tsx` - Running activity screen with comprehensive fixes
- `WalkingTrackerScreen.tsx` - Walking activity screen
- `CyclingTrackerScreen.tsx` - Cycling activity screen
- `KalmanDistanceFilter.ts` - Distance smoothing algorithm
- `LocationValidator.ts` - Platform-specific GPS validation
- `ActivityStateMachine.ts` - State management for tracking lifecycle

**Related Docs**:
- `RUNSTR_REWARDS_OVERVIEW.md` - High-level project overview
- `CLAUDE.md` - Project development guidelines and architecture principles
- `LESSONS_LEARNED.md` - General development lessons (non-fitness specific)

---

**Next Review**: Before next major release or when new GPS-related issues are discovered.
