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
  longestRunKm: number;
  mostStepsInDay: number;
  mostPushups: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({ userPubkey }) => {
  const [todaySteps, setTodaySteps] = useState<number>(0);
  const [records, setRecords] = useState<PersonalRecords>({
    longestRunKm: 0,
    mostStepsInDay: 0,
    mostPushups: 0,
  });

  useEffect(() => {
    loadData();
  }, [userPubkey]);

  const loadData = async () => {
    // Today's steps
    try {
      const stepData = await DailyStepCounterService.getInstance().getTodaySteps();
      if (stepData) setTodaySteps(stepData.steps);
    } catch (e) {
      console.warn('[StatsCard] Failed to get today steps:', e);
    }

    // Personal records from Supabase
    if (!isSupabaseConfigured() || !supabase || !userPubkey) return;
    try {
      const npub = userPubkey.startsWith('npub')
        ? userPubkey
        : nip19.npubEncode(userPubkey);

      const { data: runData } = await supabase
        .from('workouts')
        .select('distance_meters')
        .eq('npub', npub)
        .eq('activity_type', 'running')
        .order('distance_meters', { ascending: false })
        .limit(1);

      const { data: stepData } = await supabase
        .from('workouts')
        .select('step_count')
        .eq('npub', npub)
        .not('step_count', 'is', null)
        .order('step_count', { ascending: false })
        .limit(1);

      const { data: pushupData } = await supabase
        .from('workouts')
        .select('rep_count')
        .eq('npub', npub)
        .eq('activity_type', 'pushups')
        .order('rep_count', { ascending: false })
        .limit(1);

      setRecords({
        longestRunKm: runData?.[0]?.distance_meters
          ? runData[0].distance_meters / 1000
          : 0,
        mostStepsInDay: stepData?.[0]?.step_count || 0,
        mostPushups: pushupData?.[0]?.rep_count || 0,
      });
    } catch (e) {
      console.warn('[StatsCard] Failed to load personal records:', e);
    }
  };

  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <Card style={styles.container}>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatNumber(todaySteps)}</Text>
          <Text style={styles.statLabel}>Steps Today</Text>
        </View>
        {records.longestRunKm > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {records.longestRunKm.toFixed(1)} km
            </Text>
            <Text style={styles.statLabel}>Longest Run</Text>
          </View>
        )}
        {records.mostStepsInDay > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatNumber(records.mostStepsInDay)}
            </Text>
            <Text style={styles.statLabel}>Most Steps</Text>
          </View>
        )}
        {records.mostPushups > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatNumber(records.mostPushups)}
            </Text>
            <Text style={styles.statLabel}>Most Pushups</Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginBottom: 12, padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: { alignItems: 'center', minWidth: 70 },
  statValue: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: theme.typography.weights.bold as any,
  },
  statLabel: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
});
