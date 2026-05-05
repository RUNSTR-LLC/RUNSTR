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
];
