// src/types/activityMenu.ts

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface ActivityIconConfig {
  key: string;
  label: string;
  icon: IoniconName;
}

export interface CategoryConfig {
  key: string;
  label: string;
  activities: ActivityIconConfig[];
}

export const CATEGORY_MENU: CategoryConfig[] = [
  {
    key: 'cardio',
    label: 'Cardio',
    activities: [
      { key: 'run', label: 'Run', icon: 'fitness-outline' },
      { key: 'walk', label: 'Walk', icon: 'walk-outline' },
      { key: 'cycle', label: 'Cycle', icon: 'bicycle-outline' },
      { key: 'hiking', label: 'Hike', icon: 'compass-outline' },
    ],
  },
  {
    key: 'strength',
    label: 'Strength',
    activities: [
      { key: 'pushups', label: 'Pushups', icon: 'fitness-outline' },
      { key: 'pullups', label: 'Pull-ups', icon: 'barbell-outline' },
      { key: 'situps', label: 'Sit-ups', icon: 'body-outline' },
      { key: 'squats', label: 'Squats', icon: 'walk-outline' },
      { key: 'curls', label: 'Curls', icon: 'fitness-outline' },
      { key: 'bench', label: 'Bench', icon: 'barbell-outline' },
    ],
  },
  {
    key: 'wellness',
    label: 'Wellness',
    activities: [
      { key: 'guided', label: 'Guided', icon: 'headset-outline' },
      { key: 'unguided', label: 'Unguided', icon: 'leaf-outline' },
      { key: 'breathwork', label: 'Breathwork', icon: 'water-outline' },
      { key: 'body_scan', label: 'Body Scan', icon: 'body-outline' },
      { key: 'gratitude', label: 'Gratitude', icon: 'heart-outline' },
      { key: 'journal', label: 'Journal', icon: 'book-outline' },
      { key: 'habits', label: 'Habits', icon: 'checkmark-circle-outline' },
    ],
  },
];
