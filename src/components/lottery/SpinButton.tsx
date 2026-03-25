// src/components/lottery/SpinButton.tsx

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import { theme } from '../../styles/theme';
import LotteryService from '../../services/lottery/LotteryService';

interface SpinButtonProps {
  canSpin: boolean;
  isSpinning: boolean;
  onSpin: () => void;
  hasNoConnection?: boolean;
  hasNoDestination?: boolean;
}

export const SpinButton: React.FC<SpinButtonProps> = ({
  canSpin,
  isSpinning,
  onSpin,
  hasNoConnection,
  hasNoDestination,
}) => {
  const [countdown, setCountdown] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (canSpin || isSpinning) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const ms = LotteryService.getMillisUntilReset();
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      setCountdown(
        `${hours.toString().padStart(2, '0')}h ${minutes
          .toString()
          .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
      );
    };

    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        updateCountdown();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(updateCountdown, 1000);
        }
      } else if (nextState.match(/inactive|background/)) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      appStateRef.current = nextState;
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [canSpin, isSpinning]);

  const disabled = !canSpin || isSpinning || hasNoConnection || hasNoDestination;

  const getStatusText = () => {
    if (hasNoConnection) return 'No connection';
    if (hasNoDestination) return 'Set reward destination first';
    if (isSpinning) return '';
    if (!canSpin && countdown) return `Resets in ${countdown}`;
    return '';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={onSpin}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
          {isSpinning ? 'SPINNING...' : 'SPIN'}
        </Text>
      </TouchableOpacity>
      {getStatusText() ? (
        <Text style={styles.statusText}>{getStatusText()}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  button: {
    backgroundColor: theme.colors.orangeDeep,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 4,
  },
  buttonTextDisabled: {
    color: theme.colors.textMuted,
    letterSpacing: 4,
  },
  statusText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
});
