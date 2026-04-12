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

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
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

      // Fetch fastest time at each race distance (running workouts meeting distance)
      const raceDistances: Array<[number, keyof PersonalRecords]> = [
        [M_5K, 'fastest5kSeconds'],
        [M_10K, 'fastest10kSeconds'],
        [M_HALF, 'fastestHalfSeconds'],
        [M_MARATHON, 'fastestMarathonSeconds'],
      ];

      const raceResults = await Promise.all(
        raceDistances.map(async ([minMeters]) => {
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

      // Longest run (any running workout)
      const { data: longestRun } = await supabase
        .from('workouts')
        .select('distance_meters')
        .eq('npub', npub)
        .eq('activity_type', 'running')
        .order('distance_meters', { ascending: false })
        .limit(1);

      // Most pushups (single session)
      const { data: pushupData } = await supabase
        .from('workouts')
        .select('rep_count')
        .eq('npub', npub)
        .eq('activity_type', 'pushups')
        .order('rep_count', { ascending: false })
        .limit(1);

      // Most pull-ups (single session)
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

  const stats = [
    { label: 'Steps Today', value: todaySteps.toLocaleString() },
    { label: 'Fastest 5K', value: formatDuration(records.fastest5kSeconds) },
    { label: 'Fastest 10K', value: formatDuration(records.fastest10kSeconds) },
    { label: 'Fastest Half', value: formatDuration(records.fastestHalfSeconds) },
    { label: 'Fastest Marathon', value: formatDuration(records.fastestMarathonSeconds) },
    {
      label: 'Longest Run',
      value: records.longestRunKm > 0 ? `${records.longestRunKm.toFixed(1)} km` : '0',
    },
    { label: 'Most Pushups', value: records.mostPushups.toLocaleString() },
    { label: 'Most Pull-ups', value: records.mostPullups.toLocaleString() },
  ];

  return (
    <Card style={styles.container}>
      <View style={styles.grid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {stat.value}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stat: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statValue: {
    color: theme.colors.accent,
    fontSize: 17,
    fontWeight: theme.typography.weights.bold as any,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});
