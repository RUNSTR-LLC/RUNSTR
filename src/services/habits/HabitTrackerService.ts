/**
 * HabitTrackerService - Manage habit tracking with streak calculation
 * Local-only storage using AsyncStorage (no Nostr publishing initially)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const HABITS_STORAGE_KEY = '@runstr:habits_data';

export interface Habit {
  id: string;
  name: string;
  type: 'abstinence' | 'positive'; // abstinence = avoid bad habit, positive = build good habit
  createdAt: string; // ISO timestamp
  currentStreak: number; // days
  longestStreak: number; // days
  lastCheckIn?: string; // ISO timestamp of last check-in
  checkIns: string[]; // Array of ISO date strings (YYYY-MM-DD format) for each successful day
  icon: string; // Ionicon name
  color: string; // Hex color for UI
}

interface HabitsData {
  habits: Habit[];
  lastUpdated: string;
}

/**
 * Get all habits from AsyncStorage
 */
export async function getAllHabits(): Promise<Habit[]> {
  try {
    const data = await AsyncStorage.getItem(HABITS_STORAGE_KEY);
    if (!data) {
      return [];
    }
    const parsed: HabitsData = JSON.parse(data);
    return parsed.habits || [];
  } catch (error) {
    console.error('[HabitTrackerService] Error loading habits:', error);
    return [];
  }
}

/**
 * Create a new habit
 */
export async function createHabit(
  name: string,
  type: 'abstinence' | 'positive',
  icon: string,
  color: string
): Promise<Habit> {
  try {
    const habits = await getAllHabits();

    const newHabit: Habit = {
      id: generateHabitId(),
      name,
      type,
      createdAt: new Date().toISOString(),
      currentStreak: 0,
      longestStreak: 0,
      checkIns: [],
      icon,
      color,
    };

    habits.push(newHabit);
    await saveHabits(habits);

    return newHabit;
  } catch (error) {
    console.error('[HabitTrackerService] Error creating habit:', error);
    throw error;
  }
}

/**
 * Check in for a habit (marks today as successful)
 */
export async function checkInHabit(habitId: string): Promise<Habit> {
  try {
    const habits = await getAllHabits();
    const habitIndex = habits.findIndex((h) => h.id === habitId);

    if (habitIndex === -1) {
      throw new Error(`Habit not found: ${habitId}`);
    }

    const habit = habits[habitIndex];
    const today = getTodayDateString();

    // Check if already checked in today
    if (habit.checkIns.includes(today)) {
      console.log('[HabitTrackerService] Already checked in today');
      return habit;
    }

    // Add today's check-in
    habit.checkIns.push(today);
    habit.lastCheckIn = new Date().toISOString();

    // Recalculate streaks
    const streakData = calculateStreak(habit.checkIns);
    habit.currentStreak = streakData.current;
    habit.longestStreak = Math.max(habit.longestStreak, streakData.current);

    habits[habitIndex] = habit;
    await saveHabits(habits);

    return habit;
  } catch (error) {
    console.error('[HabitTrackerService] Error checking in habit:', error);
    throw error;
  }
}

/**
 * Delete a habit
 */
export async function deleteHabit(habitId: string): Promise<void> {
  try {
    const habits = await getAllHabits();
    const filtered = habits.filter((h) => h.id !== habitId);
    await saveHabits(filtered);
  } catch (error) {
    console.error('[HabitTrackerService] Error deleting habit:', error);
    throw error;
  }
}

/**
 * Check if habit has been checked in today
 */
export function isCheckedInToday(habit: Habit): boolean {
  const today = getTodayDateString();
  return habit.checkIns.includes(today);
}

/**
 * Calculate current streak from check-in array
 * Returns both current streak and longest streak
 */
export function calculateStreak(checkIns: string[]): {
  current: number;
  longest: number;
} {
  if (checkIns.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Sort check-ins in descending order (most recent first)
  const sorted = [...checkIns].sort((a, b) => b.localeCompare(a));

  const today = getTodayDateString();
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Check if most recent check-in is today or yesterday (streak still active)
  const mostRecent = sorted[0];
  const yesterday = getYesterdayDateString();

  if (mostRecent !== today && mostRecent !== yesterday) {
    // Streak broken (last check-in was before yesterday)
    currentStreak = 0;
  } else {
    // Calculate current streak (consecutive days from today/yesterday backwards)
    let expectedDate = mostRecent === today ? today : yesterday;

    for (const checkInDate of sorted) {
      if (checkInDate === expectedDate) {
        currentStreak++;
        tempStreak++;
        expectedDate = getPreviousDateString(expectedDate);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak in history
  tempStreak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentDate = sorted[i];
    const nextDate = sorted[i + 1];

    // Check if consecutive days
    if (getPreviousDateString(currentDate) === nextDate) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { current: currentStreak, longest: longestStreak };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Save habits to AsyncStorage
 */
async function saveHabits(habits: Habit[]): Promise<void> {
  const data: HabitsData = {
    habits,
    lastUpdated: new Date().toISOString(),
  };
  await AsyncStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Generate unique habit ID
 */
function generateHabitId(): string {
  return `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get today's date as YYYY-MM-DD string (local timezone)
 */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get yesterday's date as YYYY-MM-DD string (local timezone)
 */
function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get previous day's date string from given date string (local timezone)
 */
function getPreviousDateString(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  const prevYear = date.getFullYear();
  const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
  const prevDay = String(date.getDate()).padStart(2, '0');
  return `${prevYear}-${prevMonth}-${prevDay}`;
}

/**
 * Predefined habit templates with icons and colors
 */
export const HABIT_TEMPLATES = [
  {
    name: 'No Smoking',
    icon: 'ban-outline',
    color: '#FF9D42',
    type: 'abstinence' as const,
  },
  {
    name: 'No Drinking',
    icon: 'wine-outline',
    color: '#FF9D42',
    type: 'abstinence' as const,
  },
  {
    name: 'No Sugar',
    icon: 'ice-cream-outline',
    color: '#FF9D42',
    type: 'abstinence' as const,
  },
  {
    name: 'No Caffeine',
    icon: 'cafe-outline',
    color: '#8B7355',
    type: 'abstinence' as const,
  },
  {
    name: 'Daily Meditation',
    icon: 'body-outline',
    color: '#FF9D42',
    type: 'positive' as const,
  },
  {
    name: 'Read Daily',
    icon: 'book-outline',
    color: '#FF9D42',
    type: 'positive' as const,
  },
  {
    name: 'Journal',
    icon: 'pencil-outline',
    color: '#FF9D42',
    type: 'positive' as const,
  },
  {
    name: 'Exercise',
    icon: 'barbell-outline',
    color: '#FF9D42',
    type: 'positive' as const,
  },
];
