# Debug Components

Debug components for diagnosing issues in RUNSTR. These are typically only enabled in debug/testing builds.

## Files

### ActivityDebugOverlay.tsx
Real-time diagnostic overlay for GPS death diagnosis during workouts. Shows:
- GPS subscription status (is expo-location reporting active?)
- Watchdog health (is the JS timer still running?)
- TaskManager heartbeat (when did background task last execute?)
- Recovery stats (success/failure counts)
- Distance tracking metrics

Used in RunningTrackerScreen when `DEBUG_MODE = true`.

### StepDebugOverlay.tsx
Android-only diagnostic overlay for step counting. Shows a small floating bug icon in the top-right corner of tracker screens. Tapping expands a panel with real-time step diagnostic data:
- Active step source (native / health_connect / none)
- Native sensor and background tracking status
- Today's step count and session start time
- Health Connect SDK availability and permission status
- ROM type detection (stock, GrapheneOS, CalyxOS, etc.)
- Android version

Always available (no DEBUG_MODE flag needed). Returns `null` on iOS. Used in all tracker screens: Walking, Running, Cycling, Hiking.

## Usage

The debug overlay is controlled by the `DEBUG_MODE` constant in the tracker screens:

```typescript
// In RunningTrackerScreen.tsx
const DEBUG_MODE = true; // Set to false for production

// Renders the overlay when tracking is active
{DEBUG_MODE && isTracking && <ActivityDebugOverlay />}
```

## Debug Log Format

Users can tap "Copy Debug Log" to copy diagnostic data to clipboard for DMs:

```
RUNSTR Debug Log - 2025-01-15T12:00:00.000Z

=== DEVICE ===
Manufacturer: Samsung
Model: Galaxy S21
Android: 14

=== GPS SUBSCRIPTION ===
Reports Active: YES
TaskManager Heartbeat: 3000ms ago

=== WATCHDOG ===
Running: YES
Last Check: 5000ms ago

=== RECOVERY ===
Restart Attempts: 0
Successes: 0
Failures: 0
Last Error: none

=== TRACKING ===
Distance: 1.234 km
Points Received: 45
Last Accuracy: 12.5m
Cached Points: 45
```
