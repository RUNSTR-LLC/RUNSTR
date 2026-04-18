import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { DailyStepCounterService } from '../../services/activity/DailyStepCounterService';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { nip19 } from 'nostr-tools';

interface StatsCardProps {
  userPubkey: string;
}

interface PersonalRecords {
  fastest5kSeconds: number;
  fastest10kSeconds: number;
  fastestHalfSeconds: number;
  fastestMarathonSeconds: number;
  fastestCycling20kSeconds: number;
  fastestCycling40kSeconds: number;
  fastestCycling100kSeconds: number;
  longestRunKm: number;
  longestRideKm: number;
  mostPushups: number;
  mostPullups: number;
}

const M_5K = 5000;
const M_10K = 10000;
const M_HALF = 21097;
const M_MARATHON = 42195;
const M_CYC_20K = 20000;
const M_CYC_40K = 40000;
const M_CYC_100K = 100000;
const DAILY_STEP_GOAL = 10000;

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

function formatCount(n: number): string {
  return n > 0 ? n.toLocaleString() : '—';
}

export const StatsCard: React.FC<StatsCardProps> = ({ userPubkey }) => {
  const [todaySteps, setTodaySteps] = useState<number>(0);
  const [records, setRecords] = useState<PersonalRecords>({
    fastest5kSeconds: 0,
    fastest10kSeconds: 0,
    fastestHalfSeconds: 0,
    fastestMarathonSeconds: 0,
    fastestCycling20kSeconds: 0,
    fastestCycling40kSeconds: 0,
    fastestCycling100kSeconds: 0,
    longestRunKm: 0,
    longestRideKm: 0,
    mostPushups: 0,
    mostPullups: 0,
  });

  useEffect(() => {
    let cancelled = false;
    loadData(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPubkey]);

  const loadData = async (isCancelled: () => boolean) => {
    try {
      const stepData = await DailyStepCounterService.getInstance().getTodaySteps();
      if (!isCancelled() && stepData) setTodaySteps(stepData.steps);
    } catch (e) {
      console.warn('[StatsCard] Failed to get today steps:', e);
    }

    if (!isSupabaseConfigured() || !supabase || !userPubkey) return;
    try {
      const npub = userPubkey.startsWith('npub')
        ? userPubkey
        : nip19.npubEncode(userPubkey);

      const fastestTimeAtDistance = async (
        activityType: string,
        minMeters: number
      ): Promise<number> => {
        const { data } = await supabase!
          .from('workouts')
          .select('duration_seconds')
          .eq('npub', npub)
          .eq('activity_type', activityType)
          .gte('distance_meters', minMeters)
          .order('duration_seconds', { ascending: true })
          .limit(1);
        return data?.[0]?.duration_seconds || 0;
      };

      const maxDistance = async (activityType: string): Promise<number> => {
        const { data } = await supabase!
          .from('workouts')
          .select('distance_meters')
          .eq('npub', npub)
          .eq('activity_type', activityType)
          .order('distance_meters', { ascending: false })
          .limit(1);
        return data?.[0]?.distance_meters || 0;
      };

      const maxReps = async (activityType: string): Promise<number> => {
        const { data } = await supabase!
          .from('workouts')
          .select('rep_count')
          .eq('npub', npub)
          .eq('activity_type', activityType)
          .order('rep_count', { ascending: false })
          .limit(1);
        return data?.[0]?.rep_count || 0;
      };

      const [
        run5k,
        run10k,
        runHalf,
        runMarathon,
        cyc20k,
        cyc40k,
        cyc100k,
        longestRunMeters,
        longestRideMeters,
        pushupMax,
        pullupMax,
      ] = await Promise.all([
        fastestTimeAtDistance('running', M_5K),
        fastestTimeAtDistance('running', M_10K),
        fastestTimeAtDistance('running', M_HALF),
        fastestTimeAtDistance('running', M_MARATHON),
        fastestTimeAtDistance('cycling', M_CYC_20K),
        fastestTimeAtDistance('cycling', M_CYC_40K),
        fastestTimeAtDistance('cycling', M_CYC_100K),
        maxDistance('running'),
        maxDistance('cycling'),
        maxReps('pushups'),
        maxReps('pullups'),
      ]);

      if (isCancelled()) return;
      setRecords({
        fastest5kSeconds: run5k,
        fastest10kSeconds: run10k,
        fastestHalfSeconds: runHalf,
        fastestMarathonSeconds: runMarathon,
        fastestCycling20kSeconds: cyc20k,
        fastestCycling40kSeconds: cyc40k,
        fastestCycling100kSeconds: cyc100k,
        longestRunKm: longestRunMeters / 1000,
        longestRideKm: longestRideMeters / 1000,
        mostPushups: pushupMax,
        mostPullups: pullupMax,
      });
    } catch (e) {
      console.warn('[StatsCard] Failed to load personal records:', e);
    }
  };

  const stepProgress = Math.min(todaySteps / DAILY_STEP_GOAL, 1);
  const stepProgressPercent = Math.round(stepProgress * 100);

  const hasRunning = records.longestRunKm > 0;
  const hasCycling = records.longestRideKm > 0;
  const hasPushups = records.mostPushups > 0;
  const hasPullups = records.mostPullups > 0;
  const hasAnyBest = hasRunning || hasCycling || hasPushups || hasPullups;

  const runningRaceStats = [
    { label: '5K', value: formatDuration(records.fastest5kSeconds) },
    { label: '10K', value: formatDuration(records.fastest10kSeconds) },
    { label: 'HALF', value: formatDuration(records.fastestHalfSeconds) },
    { label: 'MARATHON', value: formatDuration(records.fastestMarathonSeconds) },
  ];

  const cyclingRaceStats = [
    { label: '20K', value: formatDuration(records.fastestCycling20kSeconds) },
    { label: '40K', value: formatDuration(records.fastestCycling40kSeconds) },
    { label: '100K', value: formatDuration(records.fastestCycling100kSeconds) },
    {
      label: 'LONGEST',
      value:
        records.longestRideKm > 0
          ? `${records.longestRideKm.toFixed(1)}km`
          : '—',
    },
  ];

  return (
    <Card style={styles.container}>
      {/* Hero: Today's Steps */}
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroLabel}>STEPS TODAY</Text>
        </View>
        <Text style={styles.heroValue}>{todaySteps.toLocaleString()}</Text>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${stepProgressPercent}%` }]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {stepProgressPercent}% of {DAILY_STEP_GOAL.toLocaleString()} goal
        </Text>
      </View>

      {/* Running Race PRs */}
      {hasRunning && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>RUNNING PERSONAL RECORDS</Text>
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
        </>
      )}

      {/* Cycling Race PRs */}
      {hasCycling && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>CYCLING PERSONAL RECORDS</Text>
          <View style={styles.raceRow}>
            {cyclingRaceStats.map((stat) => (
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
        </>
      )}

      {/* Personal Bests */}
      {hasAnyBest && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>PERSONAL BESTS</Text>
          <View style={styles.bestList}>
            {hasRunning && (
              <BestRow
                label="Longest Run"
                value={`${records.longestRunKm.toFixed(1)} km`}
              />
            )}
            {hasCycling && (
              <BestRow
                label="Longest Ride"
                value={`${records.longestRideKm.toFixed(1)} km`}
              />
            )}
            {hasPushups && (
              <BestRow
                label="Most Pushups"
                value={formatCount(records.mostPushups)}
              />
            )}
            {hasPullups && (
              <BestRow
                label="Most Pull-ups"
                value={formatCount(records.mostPullups)}
              />
            )}
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
