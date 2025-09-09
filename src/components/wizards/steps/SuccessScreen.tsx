/**
 * SuccessScreen - Final screen of challenge creation wizard
 * Shows animated confirmation that the challenge was created successfully
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { theme } from '../../../styles/theme';
import { ChallengeCreationData } from '../../../types';

interface SuccessScreenProps {
  challengeData: ChallengeCreationData;
  currentUserName?: string;
  onDone: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  challengeData,
  currentUserName = 'Alex',
  onDone,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate the success icon with a pop effect
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]);

  const getChallengeName = () => {
    if (challengeData.opponentInfo && challengeData.challengeType) {
      return `${currentUserName} vs ${challengeData.opponentInfo.name} ${challengeData.challengeType.name}`;
    }
    return 'Challenge Created';
  };

  const getChallengeSummary = () => {
    const wagerText = `${challengeData.wagerAmount.toLocaleString()} sats`;
    const durationText = `${challengeData.duration} days`;
    return `${wagerText} • ${durationText}`;
  };

  return (
    <View style={styles.container}>
      {/* Success Icon */}
      <Animated.View
        style={[
          styles.successIcon,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.successIconText}>✓</Text>
      </Animated.View>

      {/* Success Text */}
      <Text style={styles.successTitle}>Challenge Created!</Text>
      <Text style={styles.successSubtitle}>
        Your challenge has been sent to your opponent
      </Text>

      {/* Challenge Details */}
      <View style={styles.successDetails}>
        <Text style={styles.challengeName}>{getChallengeName()}</Text>
        <Text style={styles.challengeSummary}>{getChallengeSummary()}</Text>
      </View>

      {/* Done Button */}
      <TouchableOpacity
        style={styles.doneButton}
        onPress={onDone}
        activeOpacity={0.8}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successIconText: {
    fontSize: 40,
    color: theme.colors.accentText,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  successDetails: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  challengeName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  challengeSummary: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
});
