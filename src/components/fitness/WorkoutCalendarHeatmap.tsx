/**
 * WorkoutCalendarHeatmap Component
 * Visual calendar showing workout activity intensity
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import type { UnifiedWorkout } from '../../services/fitness/workoutMergeService';

interface WorkoutCalendarHeatmapProps {
  workouts: UnifiedWorkout[];
  onDayPress?: (date: Date, workouts: UnifiedWorkout[]) => void;
}

interface DayData {
  date: Date;
  workouts: UnifiedWorkout[];
  intensity: 0 | 1 | 2 | 3 | 4; // 0 = no workouts, 4 = high intensity
  totalDuration: number;
}

export const WorkoutCalendarHeatmap: React.FC<WorkoutCalendarHeatmapProps> = ({
  workouts,
  onDayPress
}) => {
  const calendarData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Group workouts by date
    const workoutsByDate = new Map<string, UnifiedWorkout[]>();
    workouts.forEach(workout => {
      const date = new Date(workout.startTime);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!workoutsByDate.has(dateKey)) {
        workoutsByDate.set(dateKey, []);
      }
      workoutsByDate.get(dateKey)!.push(workout);
    });

    // Generate calendar grid for last 12 weeks
    const weeks: DayData[][] = [];
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 84); // 12 weeks ago

    // Adjust to Monday
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);

    for (let week = 0; week < 12; week++) {
      const weekDays: DayData[] = [];

      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (week * 7) + day);

        const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
        const dayWorkouts = workoutsByDate.get(dateKey) || [];

        const totalDuration = dayWorkouts.reduce((sum, w) => sum + w.duration, 0);

        // Calculate intensity based on total duration
        let intensity: 0 | 1 | 2 | 3 | 4 = 0;
        if (totalDuration > 0) {
          if (totalDuration < 1800) intensity = 1; // < 30 min
          else if (totalDuration < 3600) intensity = 2; // 30-60 min
          else if (totalDuration < 5400) intensity = 3; // 60-90 min
          else intensity = 4; // > 90 min
        }

        weekDays.push({
          date: currentDate,
          workouts: dayWorkouts,
          intensity,
          totalDuration
        });
      }

      weeks.push(weekDays);
    }

    return weeks;
  }, [workouts]);

  const getIntensityColor = (intensity: number): string => {
    switch (intensity) {
      case 0: return theme.colors.surface; // #0a0a0a
      case 1: return 'rgba(255, 255, 255, 0.2)'; // Light activity
      case 2: return 'rgba(255, 255, 255, 0.4)'; // Medium activity
      case 3: return 'rgba(255, 255, 255, 0.6)'; // High activity
      case 4: return 'rgba(255, 255, 255, 0.8)'; // Very high activity
      default: return theme.colors.surface;
    }
  };

  const formatMonth = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[date.getMonth()];
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <Card style={styles.container}>
      <Text style={styles.title}>Activity Heatmap</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.calendar}>
          {/* Day labels */}
          <View style={styles.dayLabels}>
            {dayLabels.map((label, i) => (
              <View key={i} style={styles.dayLabelContainer}>
                <Text style={styles.dayLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.weeksContainer}>
            {calendarData.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.week}>
                {/* Month label for first week of month */}
                {week[0].date.getDate() <= 7 && (
                  <Text style={styles.monthLabel}>{formatMonth(week[0].date)}</Text>
                )}

                {week.map((day, dayIndex) => (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.day,
                      { backgroundColor: getIntensityColor(day.intensity) },
                      isToday(day.date) && styles.today
                    ]}
                    onPress={() => onDayPress?.(day.date, day.workouts)}
                    disabled={day.workouts.length === 0}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {[0, 1, 2, 3, 4].map(i => (
          <View
            key={i}
            style={[styles.legendItem, { backgroundColor: getIntensityColor(i) }]}
          />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12
  },
  calendar: {
    flexDirection: 'row'
  },
  dayLabels: {
    marginRight: 8,
    paddingTop: 16
  },
  dayLabelContainer: {
    height: 16,
    justifyContent: 'center',
    marginBottom: 2
  },
  dayLabel: {
    fontSize: 10,
    color: theme.colors.textMuted
  },
  weeksContainer: {
    flexDirection: 'row'
  },
  week: {
    marginRight: 3
  },
  monthLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginBottom: 2,
    height: 12
  },
  day: {
    width: 14,
    height: 14,
    borderRadius: 3,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  today: {
    borderColor: theme.colors.accent,
    borderWidth: 2
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 4
  },
  legendItem: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  legendText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginHorizontal: 4
  }
});