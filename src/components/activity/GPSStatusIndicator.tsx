/**
 * GPSStatusIndicator - Visual indicator for GPS signal quality
 * Shows signal strength and provides feedback during signal loss
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

export type GPSSignalStrength = 'strong' | 'medium' | 'weak' | 'none' | 'searching';

interface GPSStatusIndicatorProps {
  signalStrength: GPSSignalStrength;
  accuracy?: number; // GPS accuracy in meters
  lastUpdateTime?: number; // Timestamp of last GPS update
  isBackgroundTracking?: boolean;
}

export const GPSStatusIndicator: React.FC<GPSStatusIndicatorProps> = ({
  signalStrength,
  accuracy,
  lastUpdateTime,
  isBackgroundTracking,
}) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');

  // Pulse animation for searching state
  useEffect(() => {
    if (signalStrength === 'searching') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [signalStrength]);

  // Update time since last GPS update
  useEffect(() => {
    if (!lastUpdateTime) return;

    const updateTimer = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastUpdateTime) / 1000);
      if (seconds < 60) {
        setTimeSinceUpdate(`${seconds}s ago`);
      } else {
        const minutes = Math.floor(seconds / 60);
        setTimeSinceUpdate(`${minutes}m ago`);
      }
    }, 1000);

    return () => clearInterval(updateTimer);
  }, [lastUpdateTime]);

  const getSignalIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (signalStrength) {
      case 'strong':
        return 'cellular';
      case 'medium':
        return 'cellular-outline';
      case 'weak':
        return 'cellular-outline';
      case 'searching':
        return 'search';
      case 'none':
      default:
        return 'alert-circle';
    }
  };

  const getSignalColor = (): string => {
    switch (signalStrength) {
      case 'strong':
        return theme.colors.success;
      case 'medium':
        return theme.colors.warning;
      case 'weak':
        return '#ff9500'; // Orange
      case 'none':
        return theme.colors.error;
      case 'searching':
      default:
        return theme.colors.textMuted;
    }
  };

  const getStatusText = (): string => {
    switch (signalStrength) {
      case 'strong':
        return 'GPS Signal Strong';
      case 'medium':
        return 'GPS Signal OK';
      case 'weak':
        return 'GPS Signal Weak';
      case 'none':
        return 'GPS Signal Lost';
      case 'searching':
        return 'Searching for GPS...';
    }
  };

  const getAccuracyText = (): string | null => {
    if (!accuracy) return null;

    if (accuracy < 5) {
      return 'Excellent accuracy';
    } else if (accuracy < 10) {
      return 'Good accuracy';
    } else if (accuracy < 20) {
      return 'Fair accuracy';
    } else {
      return 'Poor accuracy';
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          signalStrength === 'searching' && {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Ionicons
          name={getSignalIcon()}
          size={24}
          color={getSignalColor()}
        />
      </Animated.View>

      <View style={styles.textContainer}>
        <Text style={[styles.statusText, { color: getSignalColor() }]}>
          {getStatusText()}
        </Text>

        {accuracy && (
          <Text style={styles.accuracyText}>
            {getAccuracyText()} ({Math.round(accuracy)}m)
          </Text>
        )}

        {timeSinceUpdate && signalStrength !== 'searching' && (
          <Text style={styles.updateTimeText}>
            Updated {timeSinceUpdate}
          </Text>
        )}

        {isBackgroundTracking && (
          <View style={styles.backgroundBadge}>
            <Text style={styles.backgroundText}>Background</Text>
          </View>
        )}
      </View>

      {/* Signal bars visualization */}
      <View style={styles.signalBars}>
        <View
          style={[
            styles.signalBar,
            styles.signalBar1,
            signalStrength !== 'none' && styles.signalBarActive,
          ]}
        />
        <View
          style={[
            styles.signalBar,
            styles.signalBar2,
            (signalStrength === 'medium' || signalStrength === 'strong') &&
              styles.signalBarActive,
          ]}
        />
        <View
          style={[
            styles.signalBar,
            styles.signalBar3,
            signalStrength === 'strong' && styles.signalBarActive,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    marginBottom: 2,
  },
  accuracyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  updateTimeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  backgroundBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  backgroundText: {
    fontSize: 10,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 3,
    backgroundColor: theme.colors.border,
    borderRadius: 1,
  },
  signalBar1: {
    height: 8,
  },
  signalBar2: {
    height: 12,
  },
  signalBar3: {
    height: 16,
  },
  signalBarActive: {
    backgroundColor: theme.colors.success,
  },
});