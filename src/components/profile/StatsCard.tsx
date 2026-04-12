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
  longestRunKm: number;
  mostPushups: number;
  mostPullups: number;
}

const M_5K = 5000;
const M_10K = 10000;
const M_HALF = 21097;
const M_MARATHON = 42195;
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
    longestRunKm: 0,
    mostPushups: 0,
    mostPullups: 0,
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPubkey]);

  const loadData = async () => {
    try {
      const stepData = await DailyStepCounterService.getInstance().getTodaySteps();
      if (stepData) setTodaySteps(stepData.steps);
    } catch (e) {
      console.warn('[StatsCard] Failed to get today steps:', e);
    }

    if (!isSupabaseConfigured() || !supabase || !userPubkey) return;
    try {
      const npub = userPubkey.startsWith('npub')
        ? userPubkey
        : nip19.npubEncode(userPubkey);

      const raceDistances = [M_5K, M_10K, M_HALF, M_MARATHON];
      const raceResults = await Promise.all(
        raceDistances.map(async (minMeters) => {
          const { data } = await supabase!
            .from('workouts')
            .select('duration_seconds')
            .eq('npub', npub)
            .eq('activity_type', 'running')
            .gte('distance_meters', minMeters)
            .order('duration_seconds', { ascending: true })
            .limit(1);
          return data?.[0]?.duration_seconds || 0;
        })
      );

      const { data: longestRun } = await supabase
        .from('workouts')
        .select('distance_meters')
        .eq('npub', npub)
        .eq('activity_type', 'running')
        .order('distance_meters', { ascending: false })
        .limit(1);

      const { data: pushupData } = await supabase
        .from('workouts')
        .select('rep_count')
        .eq('npub', npub)
        .eq('activity_type', 'pushups')
        .order('rep_count', { ascending: false })
        .limit(1);

      const { data: pullupData } = await supabase
        .from('workouts')
        .select('rep_count')
        .eq('npub', npub)
        .eq('activity_type', 'pullups')
        .order('rep_count', { ascending: false })
        .limit(1);

      setRecords({
        fastest5kSeconds: raceResults[0],
        fastest10kSeconds: raceResults[1],
        fastestHalfSeconds: raceResults[2],
        fastestMarathonSeconds: raceResults[3],
        longestRunKm: longestRun?.[0]?.distance_meters
          ? longestRun[0].distance_meters / 1000
          : 0,
        mostPushups: pushupData?.[0]?.rep_count || 0,
        mostPullups: pullupData?.[0]?.rep_count || 0,
      });
    } catch (e) {
      console.warn('[StatsCard] Failed to load personal records:', e);
    }
  };

  const stepProgress = Math.min(todaySteps / DAILY_STEP_GOAL, 1);
  const stepProgressPercent = Math.round(stepProgress * 100);

  const raceStats = [
    { label: '5K', value: formatDuration(records.fastest5kSeconds) },
    { label: '10K', value: formatDuration(records.fastest10kSeconds) },
    { label: 'HALF', value: formatDuration(records.fastestHalfSeconds) },
    { label: 'MARATHON', value: formatDuration(records.fastestMarathonSeconds) },
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

      <View style={styles.divider} />

      {/* Race PRs */}
      <Text style={styles.sectionTitle}>RACE PERSONAL RECORDS</Text>
      <View style={styles.raceRow}>
        {raceStats.map((stat) => (
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

      {/* Personal Bests */}
      <Text style={styles.sectionTitle}>PERSONAL BESTS</Text>
      <View style={styles.bestList}>
        <BestRow
          label="Longest Run"
          value={
            records.longestRunKm > 0
              ? `${records.longestRunKm.toFixed(1)} km`
              : '—'
          }
        />
        <BestRow
          label="Most Pushups"
          value={formatCount(records.mostPushups)}
        />
        <BestRow
          label="Most Pull-ups"
          value={formatCount(records.mostPullups)}
        />
      </View>
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
