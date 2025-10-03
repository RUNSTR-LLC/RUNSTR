# Activity Services

Services for managing live workout tracking, location services, and text-to-speech announcements.

## Files

### Core Activity Tracking

**ActivityMetricsService.ts** - Calculates real-time workout metrics (pace, speed, calories)
**ActivityStateMachine.ts** - Manages workout session state (idle, active, paused, stopped)
**SessionRecoveryService.ts** - Handles workout session recovery after app crashes or restarts
**SplitTrackingService.ts** - Tracks kilometer splits and pace analysis for running workouts

### Location Tracking

**EnhancedLocationTrackingService.ts** - Advanced GPS tracking with filtering and accuracy validation (~400 lines)
**LocationTrackingService.ts** - Basic location tracking for workout activities
**LocationValidator.ts** - Validates GPS coordinates and filters out bad data points
**LocationPermissionService.ts** - Manages location permissions for iOS/Android
**StreamingLocationStorage.ts** - Efficient storage and retrieval of location data streams

### Background Services

**BackgroundLocationTask.ts** - Background location tracking when app is minimized
**BatteryOptimizationService.ts** - Battery-aware location tracking optimization

### Text-to-Speech (NEW)

**TTSAnnouncementService.ts** - Voice announcements for workout summaries with audio ducking (~350 lines)
- Announces workout stats when summary modal appears
- Platform-specific audio ducking (lowers background music during announcements)
- Speech queue management to prevent overlapping announcements
- Configurable speech rate (0.5x - 2x speed)
- Natural language formatting for stats

**TTSPreferencesService.ts** - User preferences for TTS features (~200 lines)
- Enable/disable voice announcements
- Speech rate control
- Summary announcement toggle
- Include split details option
- AsyncStorage persistence

## Key Features

### Split Tracking
- Automatic kilometer split detection during runs
- Pace analysis and comparison (faster/slower/average)
- Negative split detection
- Consistency metrics

### TTS Announcements
- Workout summary announcements on completion
- Audio ducking for background music (Spotify, Apple Music)
- Customizable speech speed
- Optional split details in announcements
- Sample announcement formats:
  - **Running**: "You completed a 5.2 kilometer run in 30 minutes and 45 seconds at an average pace of 5 minutes 54 seconds per kilometer. You burned 312 calories. Great work!"
  - **Cycling**: "You completed a 15 kilometer cycling ride in 45 minutes at an average speed of 20 kilometers per hour. You burned 280 calories."

### Location Tracking
- High-accuracy GPS tracking
- Kalman filtering for smooth routes
- Background tracking support
- Battery optimization
- Session recovery

## Usage

### TTS Announcements

```typescript
import TTSAnnouncementService from '@/services/activity/TTSAnnouncementService';

// Initialize (called automatically on first use)
await TTSAnnouncementService.initialize();

// Announce workout summary
await TTSAnnouncementService.announceSummary({
  type: 'running',
  distance: 5200,  // meters
  duration: 1845,  // seconds
  calories: 312,
  pace: 5.9,       // min/km
});

// Stop current speech
await TTSAnnouncementService.stopSpeaking();

// Test with sample data
await TTSAnnouncementService.testSpeech();
```

### TTS Preferences

```typescript
import { TTSPreferencesService } from '@/services/activity/TTSPreferencesService';

// Get current settings
const settings = await TTSPreferencesService.getTTSSettings();

// Update specific setting
await TTSPreferencesService.updateTTSSetting('speechRate', 1.2);

// Check if announcements should play
const shouldAnnounce = await TTSPreferencesService.shouldAnnounceSummary();
```

### Split Tracking

```typescript
import { splitTrackingService } from '@/services/activity/SplitTrackingService';

// Start tracking
splitTrackingService.start(Date.now());

// Update during workout (returns Split if milestone reached)
const newSplit = splitTrackingService.update(
  currentDistanceMeters,
  elapsedSeconds,
  pausedDurationMs
);

// Get all splits
const splits = splitTrackingService.getSplits();

// Get statistics
const stats = splitTrackingService.getStatistics();
```

## Dependencies

- **expo-speech** - Text-to-speech synthesis
- **expo-av** - Audio session management for ducking
- **expo-location** - GPS and location tracking
- **expo-task-manager** - Background task execution
- **@react-native-async-storage/async-storage** - Settings persistence

## Architecture Notes

### File Size Compliance
All files under 500 lines per project requirements:
- TTSAnnouncementService.ts: ~350 lines ✅
- TTSPreferencesService.ts: ~200 lines ✅
- EnhancedLocationTrackingService.ts: ~400 lines ✅

### Audio Ducking
Uses platform-specific audio session configuration:
- **iOS**: `InterruptionModeIOS.DuckOthers` via AVAudioSession
- **Android**: `shouldDuckAndroid: true` with AudioFocus API
- Other apps' audio automatically lowers by ~30% during speech
- Audio focus released after speech completes

### Settings Integration
TTS settings accessible from SettingsScreen:
- Voice Announcements section
- Toggle switches for enable/disable
- Speech speed slider (0.5x - 2x)
- Test announcement button
- Settings persist across app restarts
