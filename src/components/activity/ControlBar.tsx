/**
 * ControlBar - Fixed bottom control buttons for cardio tracking
 * Shows HoldToStart in idle, Pause/Stop during tracking, Resume/Stop when paused
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import { HoldToStartButton } from './HoldToStartButton';

type ControlBarState = 'idle' | 'tracking' | 'paused';

interface ControlBarProps {
  state: ControlBarState;
  startLabel: string; // "Start Run", "Start Walk", "Start Ride"
  onHoldComplete: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  state,
  startLabel,
  onHoldComplete,
  onPause,
  onResume,
  onStop,
  disabled = false,
}) => {
  const insets = useSafeAreaInsets();
  // Ensure buttons are visible above system UI (nav bar on Android, home indicator on iOS)
  const bottomPadding = Math.max(insets.bottom, 24) + 8;

  if (state === 'idle') {
    return (
      <View style={[styles.container, { paddingBottom: bottomPadding }]}>
        <HoldToStartButton
          label={startLabel}
          onHoldComplete={onHoldComplete}
          disabled={disabled}
          holdDuration={2000}
        />
      </View>
    );
  }

  // Tracking or Paused state
  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.buttonRow}>
        {state === 'tracking' ? (
          <TouchableOpacity
            style={styles.pauseButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPause();
            }}
            activeOpacity={0.7}
            accessibilityLabel="Pause workout"
            accessibilityRole="button"
          >
            <Ionicons name="pause" size={32} color={theme.colors.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.resumeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onResume();
            }}
            activeOpacity={0.7}
            accessibilityLabel="Resume workout"
            accessibilityRole="button"
          >
            <Ionicons name="play" size={32} color={theme.colors.background} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.stopButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onStop();
          }}
          activeOpacity={0.7}
          accessibilityLabel="Stop workout"
          accessibilityRole="button"
        >
          <Ionicons name="stop" size={32} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  pauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  resumeButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
});
