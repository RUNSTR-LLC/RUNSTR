/**
 * ActivityGridService - Manages 2D grid navigation for activities
 *
 * Categories (rows): Cardio, Strength
 * Activities (columns): Vary per category
 *
 * Swipe Left/Right: Navigate within category
 * Swipe Up/Down: Navigate between categories
 *
 * Note: Diet category removed from swipe grid due to ScrollView conflicts
 * Note: Wellness category removed — unused by user base
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Category row definition
export interface CategoryRow {
  name: string;
  key: 'cardio' | 'strength';
  activities: string[];
}

// Grid position
export interface GridPosition {
  row: number;
  column: number;
}

// Activity grid configuration (Diet removed - has ScrollView conflicts)
// Wellness removed — unused by user base
export const ACTIVITY_GRID: CategoryRow[] = [
  {
    name: 'Cardio',
    key: 'cardio',
    activities: ['run', 'walk', 'cycle', 'hiking'],
  },
  {
    name: 'Strength',
    key: 'strength',
    activities: ['pushups', 'pullups', 'situps', 'curls', 'bench'],
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
  curls: 'Curls',
  bench: 'Bench',
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
    const safePosition = this.isPositionValid(position)
      ? position
      : { row: 0, column: 0 };
    const row = Math.max(0, Math.min(safePosition.row, ACTIVITY_GRID.length - 1));
    const category = ACTIVITY_GRID[row];
    const column = Math.max(0, Math.min(safePosition.column, category.activities.length - 1));
    return {
      category,
      activity: category.activities[column],
    };
  }

  /**
   * Resolve an activity key to its grid coordinates
   */
  getPositionForActivity(activity: string): GridPosition | null {
    if (typeof activity !== 'string') {
      return null;
    }
    for (let row = 0; row < ACTIVITY_GRID.length; row++) {
      const column = ACTIVITY_GRID[row].activities.indexOf(activity);
      if (column !== -1) {
        return { row, column };
      }
    }
    return null;
  }

  /**
   * Validate whether a grid position exists within the current activity matrix
   */
  isPositionValid(position: unknown): position is GridPosition {
    if (!position || typeof position !== 'object') {
      return false;
    }
    const candidate = position as Partial<GridPosition>;
    if (
      typeof candidate.row !== 'number' ||
      typeof candidate.column !== 'number' ||
      !Number.isInteger(candidate.row) ||
      !Number.isInteger(candidate.column)
    ) {
      return false;
    }

    const inRowBounds = candidate.row >= 0 && candidate.row < ACTIVITY_GRID.length;
    if (!inRowBounds) {
      return false;
    }
    const rowActivities = ACTIVITY_GRID[candidate.row].activities;
    return candidate.column >= 0 && candidate.column < rowActivities.length;
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
    const safePosition = this.isPositionValid(position)
      ? position
      : { row: 0, column: 0 };
    const { row, column } = safePosition;
    const category = ACTIVITY_GRID[row];
    const newColumn = (column + 1) % category.activities.length;
    return { row, column: newColumn };
  }

  /**
   * Navigate right (previous activity in row, with wrap)
   */
  navigateRight(position: GridPosition): GridPosition {
    const safePosition = this.isPositionValid(position)
      ? position
      : { row: 0, column: 0 };
    const { row, column } = safePosition;
    const category = ACTIVITY_GRID[row];
    const newColumn =
      (column - 1 + category.activities.length) % category.activities.length;
    return { row, column: newColumn };
  }

  /**
   * Navigate up (next category, reset to first activity)
   * Returns null if already at bottom category
   */
  navigateUp(position: GridPosition): GridPosition | null {
    if (!this.isPositionValid(position)) {
      return { row: 0, column: 0 };
    }
    if (position.row >= ACTIVITY_GRID.length - 1) {
      return null; // Already at bottom category (Strength)
    }
    return { row: position.row + 1, column: 0 };
  }

  /**
   * Navigate down (previous category, reset to first activity)
   * Returns null if already at top category
   */
  navigateDown(position: GridPosition): GridPosition | null {
    if (!this.isPositionValid(position)) {
      return { row: 0, column: 0 };
    }
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
        if (this.isPositionValid(position)) {
          console.log('[ActivityGridService] Loaded position:', position);
          return position;
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
