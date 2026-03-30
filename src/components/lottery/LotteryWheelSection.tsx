/**
 * LotteryWheelSection — Self-contained daily spin experience.
 * Renders the wheel, spin button, result display, and multiplier badge.
 * Designed to be dropped into any screen (currently RewardsScreen).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { LotteryWheel } from './LotteryWheel';
import type { LotteryWheelRef } from './LotteryWheel';
import { LotteryResult } from './LotteryResult';
import { SpinButton } from './SpinButton';
import LotteryService from '../../services/lottery/LotteryService';
import { WorkoutLevelService } from '../../services/fitness/WorkoutLevelService';
import { RewardDestinationService } from '../../services/rewards/RewardDestinationService';
import { calculateLotteryMultiplier, DEFAULT_SEGMENTS } from '../../types/lottery';
import type { LotterySpin } from '../../types/lottery';

export const LotteryWheelSection: React.FC = () => {
  const [npub, setNpub] = useState('');

  const wheelRef = useRef<LotteryWheelRef>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const [level, setLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [canSpin, setCanSpin] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<LotterySpin | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [todaySpin, setTodaySpin] = useState<LotterySpin | null>(null);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [hasDestination, setHasDestination] = useState(true);

  const multiplier = calculateLotteryMultiplier(level);

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem('@runstr:npub');
      if (stored) {
        setNpub(stored);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (npub) loadData();
  }, [npub]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const levelStats = await WorkoutLevelService.getInstance().getLevelStats(
        npub,
        []
      );
      setLevel(levelStats?.level.level || 1);

      const destination = await RewardDestinationService.getDestinationAddress();
      setHasDestination(destination.address !== '' || destination.isPPQ);

      const existing = await LotteryService.getTodaySpin(npub);
      if (existing && existing.status !== 'pending') {
        setTodaySpin(existing);
        setCanSpin(false);
      } else {
        const eligible = await LotteryService.canSpinToday();
        setCanSpin(eligible);
      }
    } catch (error) {
      console.error('[LotteryWheelSection] Failed to load:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleSpinResult = useCallback((result: LotterySpin) => {
    cleanup();
    setSpinResult(result);

    const segmentIndex = DEFAULT_SEGMENTS.findIndex(
      (s) => s.baseValue === result.segment_value
    );

    if (segmentIndex >= 0) {
      setWinningIndex(segmentIndex);
      wheelRef.current?.spinToSegment(segmentIndex);
    }
  }, [cleanup]);

  const handleSpin = async () => {
    if (!npub || isSpinning || !canSpin) return;

    setSpinError(null);
    setIsSpinning(true);
    setShowResult(false);
    setSpinResult(null);
    setWinningIndex(null);

    wheelRef.current?.startSpinning();

    const spin = await LotteryService.submitSpin(npub, level);

    if (!spin) {
      wheelRef.current?.stopWithError();
      setIsSpinning(false);
      setSpinError('Spin failed, try again');
      return;
    }

    unsubscribeRef.current = LotteryService.subscribeToSpinResult(
      spin.id,
      handleSpinResult
    );

    pollTimerRef.current = setInterval(async () => {
      const result = await LotteryService.fetchSpinResult(spin.id);
      if (result && result.status !== 'pending') {
        handleSpinResult(result);
      }
    }, 2000);

    timeoutRef.current = setTimeout(() => {
      cleanup();
      wheelRef.current?.stopWithError();
      setIsSpinning(false);
      setSpinError('Taking longer than expected. Pull down to refresh.');
    }, 10000);
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
    setCanSpin(false);
    setShowResult(true);
    if (spinResult) {
      setTodaySpin(spinResult);
    }
  };

  if (!npub) return null;

  const hasSpunToday = !!todaySpin && !canSpin;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>DAILY SPIN</Text>

      {/* Multiplier badge */}
      <View style={styles.multiplierRow}>
        <Text style={styles.multiplierLabel}>Level {level} Bonus</Text>
        <Text style={styles.multiplierValue}>{multiplier.toFixed(1)}x</Text>
      </View>

      {/* Wheel */}
      <View style={styles.wheelContainer}>
        <LotteryWheel
          ref={wheelRef}
          size={200}
          dimmed={hasSpunToday && !isSpinning}
          winningIndex={winningIndex}
          onSpinComplete={handleSpinComplete}
        />
      </View>

      {/* Result display */}
      {showResult && spinResult && (
        <LotteryResult
          segmentValue={spinResult.segment_value || 0}
          multiplier={spinResult.multiplier}
          finalPayout={spinResult.final_payout || 0}
          visible={showResult}
        />
      )}

      {/* Today's result (if already spun) */}
      {hasSpunToday && !showResult && todaySpin && (
        <View style={styles.todayResult}>
          <Text style={styles.todayResultText}>
            Today: {todaySpin.final_payout} rewards
          </Text>
        </View>
      )}

      {/* Error */}
      {spinError && <Text style={styles.errorText}>{spinError}</Text>}

      {/* Spin button / countdown */}
      <SpinButton
        canSpin={canSpin}
        isSpinning={isSpinning}
        onSpin={handleSpin}
        hasNoDestination={!hasDestination}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  multiplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  multiplierLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  multiplierValue: {
    fontSize: 16,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.bold,
  },
  wheelContainer: {
    marginBottom: 10,
  },
  todayResult: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  todayResultText: {
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.accent,
    marginBottom: 8,
  },
});
