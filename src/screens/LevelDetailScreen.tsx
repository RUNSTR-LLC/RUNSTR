// src/screens/LevelDetailScreen.tsx

import React, { useState, useEffect } from 'react';
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
import { XPExplainer } from '../components/lottery/XPExplainer';
import { WorkoutLevelService } from '../services/fitness/WorkoutLevelService';
import { calculateLotteryMultiplier } from '../types/lottery';
import type { LevelStats } from '../types/workoutLevel';
import { LEVEL_MILESTONES } from '../types/workoutLevel';
import { useUserStore } from '../store/userStore';

export const LevelDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = useUserStore((state: any) => state.user);
  const npub = user?.npub || '';

  const [stats, setStats] = useState<LevelStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const level = stats?.level.level || 1;
  const multiplier = calculateLotteryMultiplier(level);

  useEffect(() => {
    loadData();
  }, [npub]);

  const loadData = async () => {
    setIsLoadingStats(true);
    try {
      const levelStats = await WorkoutLevelService.getInstance().getLevelStats(
        npub,
        []
      );
      setStats(levelStats);
    } catch (error) {
      console.error('[LevelDetail] Failed to load data:', error);
    } finally {
      setIsLoadingStats(false);
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
          </View>

          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierLabel}>Level {level} Bonus</Text>
            <Text style={styles.multiplierValue}>{multiplier.toFixed(1)}x</Text>
          </View>

          <View style={styles.spinNote}>
            <Text style={styles.spinNoteText}>
              Spin the daily wheel on the Rewards tab
            </Text>
          </View>

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
  spinNote: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  spinNoteText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
});
