/**
 * TrackerControls - Fixed pause/resume and stop buttons shown during a run
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';

interface TrackerControlsProps {
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const TrackerControls: React.FC<TrackerControlsProps> = ({
  isPaused,
  onPause,
  onResume,
  onStop,
}) => (
  <View style={styles.fixedControlsWrapper}>
    <View style={styles.controlsContainer}>
      {!isPaused ? (
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
          <Ionicons name="pause" size={30} color={theme.colors.text} />
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
          <Ionicons name="play" size={30} color={theme.colors.background} />
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
        <Ionicons name="stop" size={30} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  fixedControlsWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    // Subtle elevation for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  pauseButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  resumeButton: {
    backgroundColor: theme.colors.orangeBright,
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
});
