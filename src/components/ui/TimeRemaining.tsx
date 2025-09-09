import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../../styles/theme';

interface TimeRemainingProps {
  timeRemaining: string;
  label?: string;
  variant?: 'event' | 'challenge' | 'simple';
  style?: ViewStyle;
  labelStyle?: TextStyle;
  timeStyle?: TextStyle;
  isExpired?: boolean;
  isCompleted?: boolean;
}

export const TimeRemaining: React.FC<TimeRemainingProps> = ({
  timeRemaining,
  label,
  isExpired,
  isCompleted,
  variant = 'simple',
  style,
  labelStyle,
  timeStyle,
}) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'challenge':
        return styles.challengeContainer;
      case 'event':
        return styles.eventContainer;
      default:
        return styles.simpleContainer;
    }
  };

  const getLabelStyle = () => {
    switch (variant) {
      case 'challenge':
        return styles.challengeLabel;
      case 'event':
        return styles.eventLabel;
      default:
        return styles.simpleLabel;
    }
  };

  const getTimeStyle = () => {
    switch (variant) {
      case 'challenge':
        return styles.challengeTime;
      case 'event':
        return styles.eventTime;
      default:
        return styles.simpleTime;
    }
  };

  return (
    <View style={[getContainerStyle(), style]}>
      {label && <Text style={[getLabelStyle(), labelStyle]}>{label}</Text>}
      <Text style={[getTimeStyle(), timeStyle]}>{timeRemaining}</Text>
    </View>
  );
};

interface ProgressTimerProps {
  timeRemaining: string;
  style?: ViewStyle;
}

export const ProgressTimer: React.FC<ProgressTimerProps> = ({
  timeRemaining,
  style,
}) => {
  return (
    <View style={[styles.progressTimerContainer, style]}>
      <Text style={styles.progressTimerText}>{timeRemaining}</Text>
    </View>
  );
};

interface ChallengeTimerProps {
  timeRemaining: string;
  isExpired?: boolean;
  style?: ViewStyle;
}

export const ChallengeTimer: React.FC<ChallengeTimerProps> = ({
  timeRemaining,
  isExpired = false,
  style,
}) => {
  return (
    <View style={[styles.challengeTimerContainer, style]}>
      <Text style={styles.challengeTimerLabel}>Time Remaining</Text>
      <Text
        style={[
          styles.challengeTimerValue,
          isExpired && styles.challengeTimerExpired,
        ]}
      >
        {isExpired ? 'Expired' : timeRemaining}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Simple variant (default)
  simpleContainer: {
    alignItems: 'center',
  },

  simpleLabel: {
    fontSize: theme.typography.eventDetails,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },

  simpleTime: {
    fontSize: theme.typography.aboutText,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },

  // Event variant (matches HTML mockup progress text)
  eventContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },

  eventLabel: {
    fontSize: theme.typography.eventDetails,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },

  eventTime: {
    fontSize: theme.typography.eventDetails,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  // Challenge variant (matches HTML mockup timer section)
  challengeContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },

  challengeLabel: {
    fontSize: theme.typography.prizeCurrency,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },

  challengeTime: {
    fontSize: 28,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.extraBold,
    letterSpacing: -1,
  },

  // Progress timer for event details
  progressTimerContainer: {
    alignItems: 'center',
  },

  progressTimerText: {
    fontSize: theme.typography.eventDetails,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  // Challenge timer section (matches HTML mockup exactly)
  challengeTimerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },

  challengeTimerLabel: {
    fontSize: theme.typography.prizeCurrency,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },

  challengeTimerValue: {
    fontSize: 28,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.extraBold,
    letterSpacing: -1,
  },

  challengeTimerExpired: {
    color: theme.colors.textDark,
  },
});
