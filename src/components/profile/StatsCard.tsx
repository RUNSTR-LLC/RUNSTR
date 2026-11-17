import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { DailyStepCounterService } from '../../services/activity/DailyStepCounterService';
import localWorkoutStorage, { type LocalWorkout } from '../../services/fitness/LocalWorkoutStorageService';
import { isRunningWorkout } from '../../utils/isRunningWorkout';
import { FEATURES } from '../../config/features';
import { useUnitPreference } from '../../hooks/useUnitPreference';

interface StatsCardProps {
  userPubkey: string;
  /**
   * Bumping this prop forces the card to re-fetch step count and PRs.
   * Used by the History tab's pull-to-refresh to keep the card in sync
   * with the rest of the screen.
   */
  refreshKey?: number;
}

interface PersonalRecords {
  fastest5kSeconds: number;
  fastest10kSeconds: number;
  fastestHalfSeconds: number;
  fastestMarathonSeconds: number;
  longestRunMeters: number;
}

const M_5K = 5000;
const M_10K = 10000;
const M_HALF = 21097;
const M_MARATHON = 42195;
const DAILY_STEP_GOAL = 10000;

const EMPTY_RECORDS: PersonalRecords = {
  fastest5kSeconds: 0,
  fastest10kSeconds: 0,
  fastestHalfSeconds: 0,
  fastestMarathonSeconds: 0,
  longestRunMeters: 0,
};

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const StatsCard: React.FC<StatsCardProps> = ({ userPubkey, refreshKey = 0 }) => {
  const { isMetric } = useUnitPreference();
  const [todaySteps, setTodaySteps] = useState<number>(0);
  const [records, setRecords] = useState<PersonalRecords>(EMPTY_RECORDS);

  useEffect(() => {
    let cancelled = false;
    loadData(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPubkey, refreshKey]);

  const loadData = async (isCancelled: () => boolean) => {
    if (FEATURES.stepTracking) {
      try {
        // Bypass the 5s service-level cache so a pull-to-refresh on the parent
        // tab actually re-queries HealthKit instead of returning the stale value.
        const stepService = DailyStepCounterService.getInstance();
        if (refreshKey > 0) {
          stepService.clearCache();
        }
        const stepData = await stepService.getTodaySteps();
        if (!isCancelled() && stepData) setTodaySteps(stepData.steps);
      } catch (e) {
        console.warn('[StatsCard] Failed to get today steps:', e);
      }
    }

    try {
      const workouts = await localWorkoutStorage.getAllWorkouts();
      const runs = workouts.filter(isRunningWorkout);

      const fastestTimeAtDistance = (minMeters: number): number =>
        runs.reduce((best, w) => {
          if ((w.distance || 0) < minMeters || !(w.duration > 0)) return best;
          return best === 0 || w.duration < best ? w.duration : best;
        }, 0);

      const longestRunMeters = runs.reduce(
        (max, w) => Math.max(max, w.distance || 0),
        0
      );

      if (isCancelled()) return;
      setRecords({
        fastest5kSeconds: fastestTimeAtDistance(M_5K),
        fastest10kSeconds: fastestTimeAtDistance(M_10K),
        fastestHalfSeconds: fastestTimeAtDistance(M_HALF),
        fastestMarathonSeconds: fastestTimeAtDistance(M_MARATHON),
        longestRunMeters,
      });
    } catch (e) {
      console.warn('[StatsCard] Failed to load personal records:', e);
    }
  };

  const stepProgress = Math.min(todaySteps / DAILY_STEP_GOAL, 1);
  const stepProgressPercent = Math.round(stepProgress * 100);

  const hasRunning = records.longestRunMeters > 0;
  const longestRun = isMetric
    ? `${(records.longestRunMeters / 1000).toFixed(1)} km`
    : `${(records.longestRunMeters * 0.000621371).toFixed(1)} mi`;

  const runningRaceStats = [
    { label: '5K', value: formatDuration(records.fastest5kSeconds) },
    { label: '10K', value: formatDuration(records.fastest10kSeconds) },
    { label: 'HALF', value: formatDuration(records.fastestHalfSeconds) },
    { label: 'MARATHON', value: formatDuration(records.fastestMarathonSeconds) },
  ];

  if (!hasRunning && !FEATURES.stepTracking) return null;

  return (
    <Card style={styles.container}>
      {/* Hero: Today's Steps */}
      {FEATURES.stepTracking && (
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>STEPS TODAY</Text>
          </View>
          <AnimatedNumber value={todaySteps} style={styles.heroValue} />
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${stepProgressPercent}%` }]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {stepProgressPercent}% of {DAILY_STEP_GOAL.toLocaleString()} goal
          </Text>
        </View>
      )}

      {hasRunning && (
        <>
          {FEATURES.stepTracking && <View style={styles.divider} />}
          <Text style={styles.sectionTitle}>PERSONAL RECORDS</Text>
          <View style={styles.raceRow}>
            {runningRaceStats.map((stat) => (
              <View key={stat.label} style={styles.raceCell}>
                <Text
                  style={styles.raceValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {stat.value}
                </Text>
                <Text style={styles.raceLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.divider} />
          <View style={styles.bestList}>
            <BestRow label="Longest Run" value={longestRun} />
          </View>
        </>
      )}
    </Card>
  );
};

const BestRow: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <View style={styles.bestRow}>
    <Text style={styles.bestLabel}>{label}</Text>
    <Text style={styles.bestValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  hero: {
    alignItems: 'center',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  heroLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: theme.typography.weights.semiBold as any,
  },
  heroValue: {
    color: theme.colors.accent,
    fontSize: 44,
    fontWeight: theme.typography.weights.bold as any,
    letterSpacing: -1,
    marginBottom: 10,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  progressLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: theme.typography.weights.semiBold as any,
    marginBottom: 12,
  },
  raceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  raceCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  raceValue: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: theme.typography.weights.bold as any,
    marginBottom: 4,
  },
  raceLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: theme.typography.weights.semiBold as any,
  },
  bestList: {
    gap: 4,
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  bestLabel: {
    color: theme.colors.text,
    fontSize: 14,
  },
  bestValue: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: theme.typography.weights.bold as any,
  },
});
