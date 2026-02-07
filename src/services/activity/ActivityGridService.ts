/**
 * ActivityGridService - Manages 2D grid navigation for activities
 *
 * Categories (rows): Cardio, Strength, Wellness
 * Activities (columns): Vary per category
 *
 * Swipe Left/Right: Navigate within category
 * Swipe Up/Down: Navigate between categories
 *
 * Note: Diet category removed from swipe grid due to ScrollView conflicts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Category row definition
export interface CategoryRow {
  name: string;
  key: 'cardio' | 'strength' | 'wellness';
  activities: string[];
}

// Grid position
export interface GridPosition {
  row: number;
  column: number;
}

// Activity grid configuration (Diet removed - has ScrollView conflicts)
export const ACTIVITY_GRID: CategoryRow[] = [
  {
    name: 'Cardio',
    key: 'cardio',
    activities: ['run', 'walk', 'cycle', 'hiking'],
  },
  {
    name: 'Strength',
    key: 'strength',
    activities: ['pushups', 'pullups', 'situps', 'squats', 'curls', 'bench'],
  },
  {
    name: 'Wellness',
    key: 'wellness',
    activities: ['guided', 'unguided', 'breathwork', 'body_scan', 'gratitude'],
  },
];

// Display names for activities
export const ACTIVITY_DISPLAY_NAMES: Record<string, string> = {
  // Cardio
  run: 'Run',
  walk: 'Walk',
  cycle: 'Cycle',
  hiking: 'Hike',
  // Strength
  pushups: 'Pushups',
  pullups: 'Pull-ups',
  situps: 'Sit-ups',
  squats: 'Squats',
  curls: 'Curls',
  bench: 'Bench',
  // Diet
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  fast: 'Fast',
  water: 'Water',
  // Wellness
  guided: 'Guided',
  unguided: 'Unguided',
  breathwork: 'Breathwork',
  body_scan: 'Body Scan',
  gratitude: 'Gratitude',
};

const STORAGE_KEY = '@runstr:activity_grid_position';

export class ActivityGridService {
  private static instance: ActivityGridService;

  private constructor() {}

  static getInstance(): ActivityGridService {
    if (!ActivityGridService.instance) {
      ActivityGridService.instance = new ActivityGridService();
    }
    return ActivityGridService.instance;
  }

  /**
   * Get current category and activity from grid position
   */
  getActivityAt(position: GridPosition): { category: CategoryRow; activity: string } {
    const row = Math.max(0, Math.min(position.row, ACTIVITY_GRID.length - 1));
    const category = ACTIVITY_GRID[row];
    const column = Math.max(0, Math.min(position.column, category.activities.length - 1));
    return {
      category,
      activity: category.activities[column],
    };
  }

  /**
   * Get display name for an activity
   */
  getDisplayName(activity: string): string {
    return ACTIVITY_DISPLAY_NAMES[activity] || activity;
  }

  /**
   * Navigate left (next activity in row, with wrap)
   */
  navigateLeft(position: GridPosition): GridPosition {
    const category = ACTIVITY_GRID[position.row];
    const newColumn = (position.column + 1) % category.activities.length;
    return { row: position.row, column: newColumn };
  }

  /**
   * Navigate right (previous activity in row, with wrap)
   */
  navigateRight(position: GridPosition): GridPosition {
    const category = ACTIVITY_GRID[position.row];
    const newColumn = (position.column - 1 + category.activities.length) % category.activities.length;
    return { row: position.row, column: newColumn };
  }

  /**
   * Navigate up (next category, reset to first activity)
   * Returns null if already at bottom category
   */
  navigateUp(position: GridPosition): GridPosition | null {
    if (position.row >= ACTIVITY_GRID.length - 1) {
      return null; // Already at bottom category (Wellness)
    }
    return { row: position.row + 1, column: 0 };
  }

  /**
   * Navigate down (previous category, reset to first activity)
   * Returns null if already at top category
   */
  navigateDown(position: GridPosition): GridPosition | null {
    if (position.row <= 0) {
      return null; // Already at top category (Cardio)
    }
    return { row: position.row - 1, column: 0 };
  }

  /**
   * Save grid position to AsyncStorage
   */
  async savePosition(position: GridPosition): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(position));
      console.log('[ActivityGridService] Saved position:', position);
    } catch (error) {
      console.error('[ActivityGridService] Failed to save position:', error);
    }
  }

  /**
   * Load grid position from AsyncStorage
   * Returns default position (0, 0) if none saved
   */
  async loadPosition(): Promise<GridPosition> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const position = JSON.parse(stored) as GridPosition;
        // Validate position is within bounds
        if (
          typeof position.row === 'number' &&
          typeof position.column === 'number' &&
          position.row >= 0 &&
          position.row < ACTIVITY_GRID.length
        ) {
          const category = ACTIVITY_GRID[position.row];
          if (position.column >= 0 && position.column < category.activities.length) {
            console.log('[ActivityGridService] Loaded position:', position);
            return position;
          }
        }
      }
    } catch (error) {
      console.error('[ActivityGridService] Failed to load position:', error);
    }
    return { row: 0, column: 0 };
  }

  /**
   * Get hint text for vertical navigation
   */
  getVerticalHint(position: GridPosition): string | null {
    if (position.row < ACTIVITY_GRID.length - 1) {
      const nextCategory = ACTIVITY_GRID[position.row + 1];
      return `↑ swipe for ${nextCategory.name.toLowerCase()}`;
    }
    return null;
  }

  /**
   * Get total number of activities in current row
   */
  getActivitiesInRow(row: number): number {
    if (row >= 0 && row < ACTIVITY_GRID.length) {
      return ACTIVITY_GRID[row].activities.length;
    }
    return 0;
  }
}

// Export singleton instance
export const activityGridService = ActivityGridService.getInstance();
