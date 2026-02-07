/**
 * Timeline Types
 * Unified data model for the Health Timeline that combines
 * workouts, journal entries, and habit check-ins into a single feed.
 */

import type { Workout } from './workout';
import type { JournalEntry } from './journal';
import type { Habit } from '../services/habits/HabitTrackerService';

export type TimelineItemType = 'workout' | 'journal' | 'habit_checkin';

export interface TimelineItem {
  type: TimelineItemType;
  /** YYYY-MM-DD for grouping/sorting */
  date: string;
  /** Unix ms for precise ordering within a day */
  timestamp: number;
  /** Unique key for React lists */
  id: string;
  workout?: Workout;
  journalEntry?: JournalEntry;
  habitCheckIn?: { habit: Habit; date: string };
}

export type TimelineFilter = 'all' | 'workouts' | 'journal' | 'habits';

export interface MonthlyTimelineGroup {
  key: string;
  title: string; // e.g., "January 2025"
  items: TimelineItem[];
  stats: {
    totalWorkouts: number;
    totalDuration: number;
    totalDistance?: number;
    totalCalories?: number;
    journalEntries: number;
    habitCheckIns: number;
  };
}
