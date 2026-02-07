/**
 * Journal System Types
 *
 * Data models for the journal/notes feature that allows users to
 * log reflections, mood, and free-form notes for AI synthesis.
 */

/**
 * Mood options for journal entries
 */
export type JournalMood = 'great' | 'good' | 'neutral' | 'low' | 'bad';

/**
 * Energy level (1-5 scale)
 */
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * A single journal entry
 */
export interface JournalEntry {
  /** Unique identifier (UUID) */
  id: string;

  /** Date of the entry (YYYY-MM-DD format) */
  date: string;

  /** ISO timestamp when entry was created */
  createdAt: string;

  /** ISO timestamp when entry was last updated */
  updatedAt: string;

  /** Free-form text content of the journal entry */
  content: string;

  /** Optional mood indicator */
  mood?: JournalMood;

  /** Optional energy level (1-5) */
  energy?: EnergyLevel;

  /** Optional tags for categorization */
  tags?: string[];
}

/**
 * Mood metadata for UI display
 */
export interface MoodOption {
  value: JournalMood;
  icon: string;
  label: string;
  color: string;
}

/**
 * All mood options with display metadata (using Ionicon names)
 */
export const MOOD_OPTIONS: MoodOption[] = [
  { value: 'great', icon: 'happy', label: 'Great', color: '#FFB366' },
  { value: 'good', icon: 'happy-outline', label: 'Good', color: '#FF9D42' },
  { value: 'neutral', icon: 'ellipse-outline', label: 'Neutral', color: '#FF8800' },
  { value: 'low', icon: 'sad-outline', label: 'Low', color: '#FF7B1C' },
  { value: 'bad', icon: 'sad', label: 'Bad', color: '#E65100' },
];

/**
 * Energy level metadata for UI display
 */
export interface EnergyOption {
  value: EnergyLevel;
  icon: string;
  label: string;
}

/**
 * All energy level options (using Ionicon names)
 */
export const ENERGY_OPTIONS: EnergyOption[] = [
  { value: 1, icon: 'battery-dead', label: 'Very Low' },
  { value: 2, icon: 'battery-half', label: 'Low' },
  { value: 3, icon: 'flash', label: 'Normal' },
  { value: 4, icon: 'fitness', label: 'High' },
  { value: 5, icon: 'rocket', label: 'Very High' },
];

/**
 * Summary statistics for journal entries
 */
export interface JournalStats {
  /** Total number of entries */
  totalEntries: number;

  /** Current streak of consecutive days with entries */
  currentStreak: number;

  /** Longest streak ever */
  longestStreak: number;

  /** Average mood (1-5 scale, mapped from mood values) */
  averageMood?: number;

  /** Average energy level */
  averageEnergy?: number;

  /** Most used tags */
  topTags: string[];
}

/**
 * Map mood to numeric value for averaging
 */
export const MOOD_TO_NUMBER: Record<JournalMood, number> = {
  great: 5,
  good: 4,
  neutral: 3,
  low: 2,
  bad: 1,
};

/**
 * Get mood option by value
 */
export function getMoodOption(mood: JournalMood): MoodOption | undefined {
  return MOOD_OPTIONS.find((m) => m.value === mood);
}

/**
 * Get energy option by value
 */
export function getEnergyOption(energy: EnergyLevel): EnergyOption | undefined {
  return ENERGY_OPTIONS.find((e) => e.value === energy);
}
