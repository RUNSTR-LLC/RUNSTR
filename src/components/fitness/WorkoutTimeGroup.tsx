/**
 * WorkoutTimeGroup Component
 * Collapsible section for grouped workouts with aggregated stats
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform
} from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import type { WorkoutGroup } from '../../utils/workoutGrouping';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WorkoutTimeGroupProps {
  group: WorkoutGroup;
  onToggle: (groupKey: string) => void;
  renderWorkout: (workout: any) => React.ReactElement;
}

export const WorkoutTimeGroup: React.FC<WorkoutTimeGroupProps> = ({
  group,
  onToggle,
  renderWorkout
}) => {
  const [rotation] = useState(new Animated.Value(group.isExpanded ? 1 : 0));

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    Animated.timing(rotation, {
      toValue: group.isExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true
    }).start();

    onToggle(group.key);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters.toFixed(0)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPace = (secondsPerKm: number): string => {
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  };

  const getActivityIcon = (type: string): string => {
    const icons: Record<string, string> = {
      running: '🏃',
      cycling: '🚴',
      walking: '🚶',
      hiking: '🥾',
      gym: '💪',
      strength_training: '🏋️',
      yoga: '🧘',
      other: '⚡'
    };
    return icons[type] || '⚡';
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg']
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
        <Card style={styles.header}>
          <View style={styles.headerLeft}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Text style={styles.chevron}>›</Text>
            </Animated.View>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{group.title}</Text>
              <Text style={styles.workoutCount}>{group.stats.totalWorkouts} workouts</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            {group.stats.totalDistance > 0 && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatDistance(group.stats.totalDistance)}</Text>
                <Text style={styles.statLabel}>distance</Text>
              </View>
            )}

            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDuration(group.stats.totalDuration)}</Text>
              <Text style={styles.statLabel}>time</Text>
            </View>

            {group.stats.totalCalories > 0 && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{group.stats.totalCalories.toFixed(0)}</Text>
                <Text style={styles.statLabel}>cal</Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>

      {group.isExpanded && (
        <View style={styles.content}>
          {/* Activity breakdown */}
          {Object.keys(group.stats.activityBreakdown).length > 1 && (
            <View style={styles.activityBreakdown}>
              {Object.entries(group.stats.activityBreakdown).map(([type, count]) => (
                <View key={type} style={styles.activityTag}>
                  <Text style={styles.activityIcon}>{getActivityIcon(type)}</Text>
                  <Text style={styles.activityCount}>{count}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Average pace if available */}
          {group.stats.averagePace && (
            <View style={styles.paceContainer}>
              <Text style={styles.paceLabel}>Avg Pace: </Text>
              <Text style={styles.paceValue}>{formatPace(group.stats.averagePace)}</Text>
            </View>
          )}

          {/* Render workouts */}
          <View style={styles.workoutsList}>
            {group.workouts.map(workout => (
              <View key={workout.id} style={styles.workoutItem}>
                {renderWorkout(workout)}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  chevron: {
    fontSize: 24,
    color: theme.colors.textSecondary,
    marginRight: 12,
    fontWeight: '600'
  },
  titleContainer: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2
  },
  workoutCount: {
    fontSize: 12,
    color: theme.colors.textMuted
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16
  },
  stat: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2
  },
  content: {
    marginTop: 8,
    paddingHorizontal: 4
  },
  activityBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12
  },
  activityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  activityIcon: {
    fontSize: 14,
    marginRight: 4
  },
  activityCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500'
  },
  paceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8
  },
  paceLabel: {
    fontSize: 12,
    color: theme.colors.textMuted
  },
  paceValue: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '600'
  },
  workoutsList: {
    gap: 8
  },
  workoutItem: {
    marginBottom: 0
  }
});