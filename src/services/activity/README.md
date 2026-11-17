# Activity Services

Running tracker and the services it uses.

- **SimpleRunTracker.ts** - GPS run tracking (memory-only distance, pause/resume, splits).
- **SimpleRunTrackerTask.ts** - Background location task that feeds GPS points to the tracker.
- **SplitTrackingService.ts** - Per-km/mi split detection.
- **ActivityMetricsService.ts** - Pace, distance, and duration formatting/math.
- **GPSHealthMonitor.ts** - GPS signal quality and recovery.
- **LocationPermissionService.ts** - Foreground/background location permissions.
- **BatteryOptimizationService.ts** - Android battery-optimization prompts and the tracking notification.
- **WorkoutRecovery.ts** / **WorkoutSessionBridge.ts** - Resume an interrupted run.
- **TTSAnnouncementService.ts** / **TTSPreferencesService.ts** - Voice announcements and their settings.
- **NostrPostingPreferencesService.ts** - Auto-publish to Nostr on/off.
