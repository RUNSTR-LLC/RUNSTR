// src/screens/LevelDetailScreen.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { LotteryWheel } from '../components/lottery/LotteryWheel';
import type { LotteryWheelRef } from '../components/lottery/LotteryWheel';
import { LotteryResult } from '../components/lottery/LotteryResult';
import { SpinButton } from '../components/lottery/SpinButton';
import { XPExplainer } from '../components/lottery/XPExplainer';
import LotteryService from '../services/lottery/LotteryService';
import { WorkoutLevelService } from '../services/fitness/WorkoutLevelService';
import { RewardDestinationService } from '../services/rewards/RewardDestinationService';
import { calculateLotteryMultiplier, DEFAULT_SEGMENTS } from '../types/lottery';
import type { LotterySpin } from '../types/lottery';
import type { LevelStats } from '../types/workoutLevel';
import { LEVEL_MILESTONES } from '../types/workoutLevel';
import { useUserStore } from '../store/userStore';

// Lazy import for NetInfo to avoid a missing-types error at compile time
// when the package types are not present in the project.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const NetInfo = require('@react-native-community/netinfo').default;

export const LevelDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = useUserStore((state: any) => state.user);
  const npub = user?.npub || '';

  // userStore does not expose workouts directly; WorkoutLevelService uses its
  // own AsyncStorage cache so passing an empty array falls through to cache.
  const EMPTY_WORKOUTS: never[] = [];

  const wheelRef = useRef<LotteryWheelRef>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const [stats, setStats] = useState<LevelStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [canSpin, setCanSpin] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<LotterySpin | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [todaySpin, setTodaySpin] = useState<LotterySpin | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [hasDestination, setHasDestination] = useState(true);

  const level = stats?.level.level || 1;
  const multiplier = calculateLotteryMultiplier(level);

  useEffect(() => {
    loadData();
  }, [npub]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(
      (state: { isConnected: boolean | null }) => {
        setIsConnected(state.isConnected ?? true);
      }
    );
    return () => unsub();
  }, []);

  const loadData = async () => {
    setIsLoadingStats(true);
    try {
      // WorkoutLevelService is a singleton with instance methods
      const levelStats = await WorkoutLevelService.getInstance().getLevelStats(
        npub,
        EMPTY_WORKOUTS
      );
      setStats(levelStats);

      // getDestinationAddress always returns a RewardDestination (never null).
      // A destination is "set" when address is non-empty OR it routes via PPQ (bolt11).
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
      console.error('[LevelDetail] Failed to load data:', error);
    } finally {
      setIsLoadingStats(false);
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

  const handleSpinResult = (result: LotterySpin) => {
    cleanup();
    setSpinResult(result);

    const segmentIndex = DEFAULT_SEGMENTS.findIndex(
      (s) => s.baseValue === result.segment_value
    );

    if (segmentIndex >= 0) {
      setWinningIndex(segmentIndex);
      wheelRef.current?.spinToSegment(segmentIndex);
    }
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
    setCanSpin(false);
    setShowResult(true);
    if (spinResult) {
      setTodaySpin(spinResult);
    }
  };

  if (isLoadingStats) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TexturedBackground edges={[]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        </TexturedBackground>
      </SafeAreaView>
    );
  }

  const currentStreak = stats?.currentStreak || 0;
  const milestone = LEVEL_MILESTONES.slice()
    .reverse()
    .find((m) => level >= m.level);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TexturedBackground edges={[]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Level</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.levelHeader}>
            <Text style={styles.levelNumber}>{level}</Text>
            <Text style={styles.levelTitle}>
              {milestone?.title || 'Beginner'}
            </Text>
            <View style={styles.xpBar}>
              <View
                style={[
                  styles.xpBarFill,
                  { width: `${(stats?.level.progress || 0) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.xpText}>
              {stats?.level.currentXP || 0} /{' '}
              {stats?.level.xpForNextLevel || 100} XP
            </Text>
            {currentStreak > 0 && (
              <Text style={styles.streakText}>{currentStreak} day streak</Text>
            )}
          </View>

          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierLabel}>Level {level} Bonus</Text>
            <Text style={styles.multiplierValue}>{multiplier.toFixed(1)}x</Text>
          </View>

          <View style={styles.wheelSection}>
            <LotteryWheel
              ref={wheelRef}
              dimmed={true}
              winningIndex={null}
              onSpinComplete={handleSpinComplete}
            />
          </View>

          <Text style={styles.comingSoonText}>Coming Soon</Text>

          <SpinButton
            canSpin={false}
            isSpinning={false}
            onSpin={handleSpin}
            hasNoConnection={!isConnected}
            hasNoDestination={!hasDestination}
          />

          <XPExplainer currentLevel={level} />
        </ScrollView>
      </TexturedBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  levelHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  levelNumber: {
    color: theme.colors.text,
    fontSize: 48,
    fontWeight: theme.typography.weights.extraBold,
  },
  levelTitle: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    marginBottom: 12,
  },
  xpBar: {
    width: '80%',
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: theme.colors.orangeDeep,
    borderRadius: 3,
  },
  xpText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    marginTop: 6,
  },
  streakText: {
    color: theme.colors.orangeBright,
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    marginTop: 4,
  },
  multiplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  multiplierLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  multiplierValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  wheelSection: {
    marginVertical: 16,
  },
  todayResult: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  todayLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
  },
  todayValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
  },
  comingSoonText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    marginBottom: 16,
    letterSpacing: 2,
  },
  errorText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
});
