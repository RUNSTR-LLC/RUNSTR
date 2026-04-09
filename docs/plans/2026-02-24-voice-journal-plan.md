# Voice Journal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add voice-to-text recording to the journal editor so users can dictate entries via a mic button, with on-device transcription.

**Architecture:** `@jamsch/expo-speech-recognition` handles both recording and on-device transcription in one step (no separate audio file needed). A new `VoiceRecordButton` component manages the recording UX with hold-to-record and tap-to-toggle interactions. Transcribed text is appended to the existing text editor for review before saving.

**Tech Stack:** `@jamsch/expo-speech-recognition` (Expo-native, iOS SFSpeechRecognizer + Android SpeechRecognizer), React Native Animated API for pulse animation.

**Design doc:** `docs/plans/2026-02-24-voice-journal-design.md`

---

### Task 1: Install `@jamsch/expo-speech-recognition` and configure plugin

**Files:**
- Modify: `package.json` (dependency)
- Modify: `app.json:206` (add plugin after expo-android-pedometer)

**Step 1: Install the package**

Run:
```bash
npx expo install @jamsch/expo-speech-recognition
```

**Step 2: Add config plugin to app.json**

Add after the `expo-android-pedometer` plugin entry (line 206 in `app.json`):

```json
[
  "@jamsch/expo-speech-recognition",
  {
    "microphonePermission": "RUNSTR needs microphone access for voice journal entries.",
    "speechRecognitionPermission": "RUNSTR needs speech recognition to transcribe your voice journal entries."
  }
]
```

**Step 3: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "Chore: Add @jamsch/expo-speech-recognition dependency and plugin"
```

Note: `expo prebuild --clean` needed before building, but not required for Metro dev.

---

### Task 2: Create VoiceTranscriptionService

**Files:**
- Create: `src/services/voice/VoiceTranscriptionService.ts`

**Step 1: Write the service**

This service wraps `@jamsch/expo-speech-recognition` with:
- Permission checking/requesting
- Start/stop recording
- 5-minute auto-stop timer
- Result callback with transcribed text

```typescript
/**
 * VoiceTranscriptionService
 *
 * Wraps @jamsch/expo-speech-recognition for on-device speech-to-text.
 * Records audio and transcribes via iOS SFSpeechRecognizer / Android SpeechRecognizer.
 * Audio is not stored — only the transcribed text is returned.
 */

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from '@jamsch/expo-speech-recognition';

const MAX_RECORDING_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if speech recognition is available on this device
 */
export async function isSpeechRecognitionAvailable(): Promise<boolean> {
  try {
    const status = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    // If we can even ask for permission, the device supports it
    return status.canAskAgain || status.granted;
  } catch {
    return false;
  }
}

/**
 * Request microphone + speech recognition permissions.
 * Returns true if both are granted.
 */
export async function requestPermissions(): Promise<boolean> {
  try {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  } catch (error) {
    console.error('[VoiceTranscription] Permission request failed:', error);
    return false;
  }
}

/**
 * Check if permissions are already granted (no prompt).
 */
export async function hasPermissions(): Promise<boolean> {
  try {
    const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

/**
 * Start speech recognition.
 * The hook-based API (useSpeechRecognitionEvent) handles events in the component.
 * This function just starts the recognition engine.
 */
export function startRecognition(locale?: string): void {
  ExpoSpeechRecognitionModule.start({
    lang: locale || 'en-US',
    interimResults: false,    // We want final results only (post-recording)
    maxAlternatives: 1,
    continuous: true,         // Keep listening until manually stopped
    requiresOnDeviceRecognition: false, // Prefer on-device but allow cloud fallback
    addsPunctuation: true,    // Auto-punctuate transcription
  });
}

/**
 * Stop speech recognition. Triggers the 'result' event with final transcript.
 */
export function stopRecognition(): void {
  ExpoSpeechRecognitionModule.stop();
}

/**
 * Abort speech recognition without returning results.
 */
export function abortRecognition(): void {
  ExpoSpeechRecognitionModule.abort();
}

export { useSpeechRecognitionEvent, MAX_RECORDING_MS };
```

**Step 2: Verify typecheck**

Run: `npm run typecheck 2>&1 | grep VoiceTranscription`
Expected: no errors from this file (may show "cannot find module" if package not installed yet — that's OK)

**Step 3: Commit**

```bash
git add src/services/voice/VoiceTranscriptionService.ts
git commit -m "Feature: Add VoiceTranscriptionService for on-device speech-to-text"
```

---

### Task 3: Create VoiceRecordButton component

**Files:**
- Create: `src/components/journal/VoiceRecordButton.tsx`

**Step 1: Write the component**

The button has three visual states:
- **Idle**: mic icon, neutral style
- **Recording**: pulsing orange animation, timer counting up
- **Processing**: spinner/loading indicator

Interactions:
- Tap: toggle start/stop
- Long press: record while held, stop on release
- 5-minute auto-stop

```typescript
/**
 * VoiceRecordButton
 *
 * Mic button for voice-to-text in the journal editor.
 * - Tap to start/stop recording
 * - Long press to record while held (release to stop)
 * - Pulsing animation while recording
 * - Timer display with 5-minute limit
 * - Auto-stops at 5 minutes and returns transcript
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  requestPermissions,
  hasPermissions,
  startRecognition,
  stopRecognition,
  abortRecognition,
  useSpeechRecognitionEvent,
  MAX_RECORDING_MS,
} from '../../services/voice/VoiceTranscriptionService';

interface VoiceRecordButtonProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export const VoiceRecordButton: React.FC<VoiceRecordButtonProps> = ({
  onTranscriptionComplete,
  disabled = false,
}) => {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const isHoldingRef = useRef(false);

  // Pulse animation loop while recording
  useEffect(() => {
    if (state === 'recording') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  // Timer tick
  useEffect(() => {
    if (state === 'recording') {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setElapsedMs(elapsed);
        // Auto-stop at 5 minutes
        if (elapsed >= MAX_RECORDING_MS) {
          handleStop();
        }
      }, 200);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setElapsedMs(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [state]);

  // Speech recognition result event
  useSpeechRecognitionEvent('result', (event) => {
    if (event.isFinal && event.results?.[0]?.transcript) {
      const transcript = event.results[0].transcript.trim();
      setState('idle');
      if (transcript) {
        onTranscriptionComplete(transcript);
      }
    }
  });

  // Speech recognition error event
  useSpeechRecognitionEvent('error', (event) => {
    console.warn('[VoiceRecord] Speech recognition error:', event.error);
    setState('idle');
    if (event.error === 'no-speech') {
      Alert.alert('No Speech Detected', 'Try speaking louder or closer to your device.');
    } else if (event.error !== 'aborted') {
      Alert.alert('Transcription Error', 'Could not transcribe your speech. Please try again.');
    }
  });

  // Speech recognition end event (fallback)
  useSpeechRecognitionEvent('end', () => {
    if (state === 'processing') {
      // If we're still processing and end fires without result, reset
      setState('idle');
    }
  });

  const handleStart = useCallback(async () => {
    if (state !== 'idle' || disabled) return;

    // Check/request permissions
    let granted = await hasPermissions();
    if (!granted) {
      granted = await requestPermissions();
    }
    if (!granted) {
      Alert.alert(
        'Microphone Access Required',
        'RUNSTR needs microphone and speech recognition access to transcribe your voice journal entries.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    setState('recording');
    startRecognition();
  }, [state, disabled]);

  const handleStop = useCallback(() => {
    if (state !== 'recording') return;
    setState('processing');
    stopRecognition();
  }, [state]);

  const handleTap = useCallback(() => {
    if (isHoldingRef.current) return; // Ignore tap if it was a hold release
    if (state === 'idle') {
      handleStart();
    } else if (state === 'recording') {
      handleStop();
    }
  }, [state, handleStart, handleStop]);

  const handleLongPressIn = useCallback(() => {
    isHoldingRef.current = true;
    handleStart();
  }, [handleStart]);

  const handleLongPressOut = useCallback(() => {
    if (isHoldingRef.current && state === 'recording') {
      handleStop();
    }
    // Reset hold flag after a short delay so tap handler doesn't fire
    setTimeout(() => { isHoldingRef.current = false; }, 100);
  }, [state, handleStop]);

  // Format elapsed time as M:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const remainingMs = MAX_RECORDING_MS - elapsedMs;
  const isWarning = remainingMs <= 30000 && state === 'recording'; // Last 30s

  return (
    <View style={styles.container}>
      {/* Timer (visible during recording) */}
      {state === 'recording' && (
        <Text style={[styles.timer, isWarning && styles.timerWarning]}>
          {formatTime(elapsedMs)} / 5:00
        </Text>
      )}

      {/* Processing indicator */}
      {state === 'processing' && (
        <View style={styles.processingRow}>
          <ActivityIndicator size="small" color={theme.colors.orangeBright} />
          <Text style={styles.processingText}>Transcribing...</Text>
        </View>
      )}

      {/* Mic button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.micButton,
            state === 'recording' && styles.micButtonRecording,
            (disabled || state === 'processing') && styles.micButtonDisabled,
          ]}
          onPress={handleTap}
          onPressIn={handleLongPressIn}
          onPressOut={handleLongPressOut}
          delayLongPress={300}
          disabled={disabled || state === 'processing'}
          activeOpacity={0.7}
        >
          <Ionicons
            name={state === 'recording' ? 'stop' : 'mic'}
            size={24}
            color={state === 'recording' ? '#fff' : theme.colors.orangeBright}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Hint text */}
      {state === 'idle' && (
        <Text style={styles.hint}>Hold or tap to record</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 157, 66, 0.12)',
    borderWidth: 2,
    borderColor: theme.colors.orangeBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonRecording: {
    backgroundColor: theme.colors.orangeBright,
    borderColor: theme.colors.orangeBright,
  },
  micButtonDisabled: {
    opacity: 0.4,
  },
  timer: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  timerWarning: {
    color: theme.colors.orangeBright,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  processingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
});
```

**Step 2: Verify typecheck**

Run: `npm run typecheck 2>&1 | grep VoiceRecordButton`
Expected: no errors from this file

**Step 3: Commit**

```bash
git add src/components/journal/VoiceRecordButton.tsx
git commit -m "Feature: Add VoiceRecordButton component with hold-to-record UX"
```

---

### Task 4: Integrate VoiceRecordButton into JournalEditorModal

**Files:**
- Modify: `src/components/journal/JournalEditorModal.tsx`

**Step 1: Add import**

At the top of `JournalEditorModal.tsx`, add after the existing imports:

```typescript
import { VoiceRecordButton } from './VoiceRecordButton';
```

**Step 2: Add transcription handler**

Inside the component, after the `handleRemoveTag` callback (around line 79), add:

```typescript
const handleTranscription = useCallback((text: string) => {
  setContent((prev) => {
    if (prev.trim()) {
      return prev.trimEnd() + '\n\n' + text;
    }
    return text;
  });
}, []);
```

**Step 3: Add VoiceRecordButton to JSX**

In the render, between the `editorContainer` View and the `tagsSection` View, add:

```tsx
{/* Voice Recording */}
<VoiceRecordButton
  onTranscriptionComplete={handleTranscription}
  disabled={isSaving}
/>
```

This goes after the closing `</View>` of `styles.editorContainer` and before the opening `<View style={styles.tagsSection}>`.

**Step 4: Verify typecheck**

Run: `npm run typecheck 2>&1 | grep JournalEditorModal`
Expected: no new errors

**Step 5: Commit**

```bash
git add src/components/journal/JournalEditorModal.tsx
git commit -m "Feature: Wire VoiceRecordButton into journal editor"
```

---

### Task 5: Add speech recognition plugin to app.json

**Files:**
- Modify: `app.json:206`

**Step 1: Add plugin entry**

In `app.json`, add after the `expo-android-pedometer` plugin block (after line 206, before the closing `]` of the plugins array):

```json
,
[
  "@jamsch/expo-speech-recognition",
  {
    "microphonePermission": "RUNSTR needs microphone access for voice journal entries.",
    "speechRecognitionPermission": "RUNSTR needs speech recognition to transcribe your voice journal entries."
  }
]
```

**Step 2: Commit**

```bash
git add app.json
git commit -m "Chore: Add expo-speech-recognition config plugin"
```

---

### Task 6: Typecheck, manual test, and final commit

**Step 1: Install dependency**

Run:
```bash
npx expo install @jamsch/expo-speech-recognition
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no new errors from voice journal files

**Step 3: Rebuild native app**

Run:
```bash
npx expo prebuild --clean
```

Then build and test on device/simulator. Voice features require a real device for microphone access (simulator has limited mic support).

**Step 4: Manual test checklist**

- [ ] Open journal editor, mic button visible below text area
- [ ] Tap mic → permission prompt appears (first time)
- [ ] Grant permission → recording starts, button pulses orange, timer counts up
- [ ] Tap again → recording stops, "Transcribing..." appears briefly
- [ ] Transcribed text appears in the text editor
- [ ] Text is editable — can fix typos, add more text
- [ ] Hold mic → records while held, release → stops and transcribes
- [ ] Type some text first, then record → transcription appended with double newline
- [ ] Record for 5 minutes → auto-stops and transcribes
- [ ] Timer turns orange in last 30 seconds
- [ ] Save entry → works normally, entry appears in journal list
- [ ] Reward triggers for new journal entries (verify in Supabase logs)

**Step 5: Final commit**

```bash
git add package.json package-lock.json
git commit -m "Feature: Voice journal — record and transcribe journal entries"
```
