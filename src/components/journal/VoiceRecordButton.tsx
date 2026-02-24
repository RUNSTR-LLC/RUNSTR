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
  MAX_RECORDING_MS,
} from '../../services/voice/VoiceTranscriptionService';

// Import the hook directly — this file only loads on iOS (lazy-loaded in JournalEditorModal)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useSpeechRecognitionEvent } = require('expo-speech-recognition');

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
  useSpeechRecognitionEvent('result', (event: { isFinal: boolean; results?: { transcript: string }[] }) => {
    if (event.isFinal && event.results?.[0]?.transcript) {
      const transcript = event.results[0].transcript.trim();
      setState('idle');
      if (transcript) {
        onTranscriptionComplete(transcript);
      }
    }
  });

  // Speech recognition error event
  useSpeechRecognitionEvent('error', (event: { error: string }) => {
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
