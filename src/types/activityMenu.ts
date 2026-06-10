// src/types/activityMenu.ts

import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

type MaterialCommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface ActivityIconConfig {
  key: string;
  label: string;
  icon: MaterialCommunityIconName;
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
      { key: 'run', label: 'Run', icon: 'run' },
      { key: 'walk', label: 'Walk', icon: 'walk' },
      { key: 'cycle', label: 'Cycle', icon: 'bike' },
      { key: 'hiking', label: 'Hike', icon: 'hiking' },
    ],
  },
];
