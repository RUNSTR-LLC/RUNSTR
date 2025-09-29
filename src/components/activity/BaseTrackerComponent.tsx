/**
 * BaseTrackerComponent - Shared tracking UI for different activity types
 * Reusable component for walking, cycling, and other activities
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface MetricCardProps {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon }) => (
  <View style={styles.metricCard}>
    {icon && (
      <Ionicons name={icon} size={20} color={theme.colors.textMuted} style={styles.metricIcon} />
    )}
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

interface BaseTrackerProps {
  metrics: {
    primary: { label: string; value: string; icon?: keyof typeof Ionicons.glyphMap };
    secondary: { label: string; value: string; icon?: keyof typeof Ionicons.glyphMap };
    tertiary: { label: string; value: string; icon?: keyof typeof Ionicons.glyphMap };
    quaternary: { label: string; value: string; icon?: keyof typeof Ionicons.glyphMap };
  };
  isTracking: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  startButtonText: string;
}

export const BaseTrackerComponent: React.FC<BaseTrackerProps> = ({
  metrics,
  isTracking,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
  startButtonText,
}) => {
  return (
    <View style={styles.container}>
      {/* Metrics Display */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricsRow}>
          <MetricCard {...metrics.primary} />
          <MetricCard {...metrics.secondary} />
        </View>
        <View style={styles.metricsRow}>
          <MetricCard {...metrics.tertiary} />
          <MetricCard {...metrics.quaternary} />
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {!isTracking ? (
          <TouchableOpacity style={styles.startButton} onPress={onStart}>
            <Ionicons name="play" size={40} color={theme.colors.background} />
            <Text style={styles.startButtonText}>{startButtonText}</Text>
          </TouchableOpacity>
        ) : (
          <>
            {!isPaused ? (
              <TouchableOpacity style={styles.pauseButton} onPress={onPause}>
                <Ionicons name="pause" size={30} color={theme.colors.text} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.resumeButton} onPress={onResume}>
                <Ionicons name="play" size={30} color={theme.colors.background} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.stopButton} onPress={onStop}>
              <Ionicons name="stop" size={30} color={theme.colors.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Status Indicator */}
      {isTracking && (
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, isPaused && styles.statusDotPaused]} />
          <Text style={styles.statusText}>
            {isPaused ? 'Paused' : 'Recording'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  metricsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricIcon: {
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 40,
    gap: 20,
  },
  startButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 40,
    width: 160,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonText: {
    color: theme.colors.background,
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
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
    backgroundColor: theme.colors.text,
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
    borderColor: theme.colors.text,
  },
  statusContainer: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.text,
    marginRight: 8,
  },
  statusDotPaused: {
    backgroundColor: theme.colors.textMuted,
  },
  statusText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
});