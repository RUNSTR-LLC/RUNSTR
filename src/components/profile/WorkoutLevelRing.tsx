/**
 * WorkoutLevelRing Component
 * Circular progress ring displaying user's workout level and XP
 * Tappable to show XP calculation explainer modal
 * Matches RUNSTR orange/gold theme with dark background
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { LevelStats } from '../../types/workoutLevel';
import WorkoutLevelService from '../../services/fitness/WorkoutLevelService';

// Generic workout interface compatible with both LocalWorkout and NostrWorkout
interface GenericWorkout {
  id: string;
  type: string;
  distance?: number;
  duration?: number;
  startTime: string;
}

interface WorkoutLevelRingProps {
  workouts: GenericWorkout[];
  pubkey: string;
}

export const WorkoutLevelRing: React.FC<WorkoutLevelRingProps> = ({
  workouts,
  pubkey,
}) => {
  const [stats, setStats] = useState<LevelStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation<any>();

  const levelService = WorkoutLevelService;

  useEffect(() => {
    loadLevelStats();
  }, [workouts, pubkey]);

  const loadLevelStats = async () => {
    try {
      setIsLoading(true);
      const levelStats = await levelService.getLevelStats(pubkey, workouts);
      setStats(levelStats);
    } catch (error) {
      console.error('[WorkoutLevelRing] Failed to load level stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // SVG circle parameters
  const size = 120;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke dash offset for progress
  const progress = stats?.level.progress || 0;
  const strokeDashoffset = circumference * (1 - progress);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Tappable ring to show XP explainer */}
      <TouchableOpacity
        style={styles.ringContainer}
        onPress={() => navigation.navigate('LevelDetail')}
        activeOpacity={0.8}
      >
        {/* SVG Progress Ring */}
        <Svg width={size} height={size}>
          <Defs>
            {/* Orange gradient for progress ring */}
            <LinearGradient
              id="ringGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#FF7B1C" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FF9D42" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Background circle (gray) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#1a1a1a"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress circle (orange gradient) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#ringGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        </Svg>

        {/* Level number in center */}
        <View style={styles.centerContent}>
          <Text style={styles.levelNumber}>{stats.level.level}</Text>
          <Text style={styles.levelLabel}>LEVEL</Text>
        </View>

        {/* Tap hint */}
        <View style={styles.tapHint}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
        </View>
      </TouchableOpacity>

      {/* Stats below ring */}
      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {levelService.formatXP(stats.level.currentXP)} /{' '}
              {levelService.formatXP(stats.level.xpForNextLevel)}
            </Text>
            <Text style={styles.statLabel}>XP Progress</Text>
          </View>
        </View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
  },

  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },

  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },

  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  levelNumber: {
    fontSize: 36,
    fontWeight: theme.typography.weights.extraBold,
    color: '#FFB366',
    lineHeight: 40,
  },

  levelLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FF9D42',
    letterSpacing: 1,
    marginTop: 2,
  },

  tapHint: {
    position: 'absolute',
    bottom: -4,
    right: '50%',
    marginRight: -60,
  },

  statsContainer: {
    marginTop: 8,
  },

  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FFB366',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: '#CC7A33',
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#1a1a1a',
  },

});
