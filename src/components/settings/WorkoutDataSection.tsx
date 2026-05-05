/**
 * WorkoutDataSection — Settings row group for the multi-source workout
 * history view. Sits in SettingsScreen alongside AppleHealthSection,
 * DataBackupSection, etc.
 *
 * Currently exposes one row: "All Workouts" → WorkoutHistoryScreen.
 * Future entries (e.g. workout export, source-specific filters) can
 * be added inside the same accordion.
 */

import React from 'react';
import { View } from 'react-native';
import { Card } from '../ui/Card';
import { SettingsAccordion } from '../ui/SettingsAccordion';
import { SettingItem } from './SettingItem';
import { settingsStyles as styles } from '../../screens/settingsStyles';

interface WorkoutDataSectionProps {
  onAllWorkoutsPress: () => void;
}

export const WorkoutDataSection: React.FC<WorkoutDataSectionProps> = ({
  onAllWorkoutsPress,
}) => (
  <View style={styles.section}>
    <SettingsAccordion title="Workout Data" defaultExpanded={false}>
      <Card style={styles.accordionCard}>
        <SettingItem
          title="All Workouts"
          subtitle="See your full workout history across all sources"
          onPress={onAllWorkoutsPress}
        />
      </Card>
    </SettingsAccordion>
  </View>
);
