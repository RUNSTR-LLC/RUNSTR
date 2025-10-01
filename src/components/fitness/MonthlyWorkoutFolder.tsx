/**
 * MonthlyWorkoutFolder Component
 * Clean, minimalist folder UI for displaying monthly workout groups
 * Black and white theme with no emojis or colors
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { WorkoutGroup } from '../../utils/workoutGrouping';
import type { UnifiedWorkout } from '../../services/fitness/workoutMergeService';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MonthlyWorkoutFolderProps {
  group: WorkoutGroup;
  isExpanded: boolean;
  onToggle: (groupKey: string) => void;
  renderWorkout: (workout: UnifiedWorkout) => React.ReactNode;
}

export const MonthlyWorkoutFolder: React.FC<MonthlyWorkoutFolderProps> = ({
  group,
  isExpanded,
  onToggle,
  renderWorkout,
}) => {
  const handleToggle = () => {
    // Smooth animation for expand/collapse
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle(group.key);
  };

  return (
    <View style={styles.folderContainer}>
      {/* Folder Header - Clean, minimal design */}
      <TouchableOpacity
        style={styles.folderHeader}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={styles.folderHeaderLeft}>
          {/* Chevron icon for expand/collapse */}
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={theme.colors.text}
            style={styles.chevronIcon}
          />

          {/* Month name - e.g., "January 2025" */}
          <Text style={styles.monthTitle}>{group.title}</Text>
        </View>

        {/* Workout count - e.g., "23 workouts" */}
        <Text style={styles.workoutCount}>
          {group.workouts.length} {group.workouts.length === 1 ? 'workout' : 'workouts'}
        </Text>
      </TouchableOpacity>

      {/* Expanded content - workout cards */}
      {isExpanded && (
        <View style={styles.folderContent}>
          {group.workouts.map((workout) => (
            <View key={workout.id}>
              {renderWorkout(workout)}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  folderContainer: {
    marginBottom: 8,
  },

  folderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0a0a0a', // Dark card background
    borderWidth: 1,
    borderColor: '#1a1a1a', // Subtle border
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  folderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  chevronIcon: {
    marginRight: 12,
  },

  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text, // White
    letterSpacing: 0.3,
  },

  workoutCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999', // Gray for secondary info
  },

  folderContent: {
    marginTop: 8,
    paddingLeft: 0, // No indentation for clean look
  },
});
