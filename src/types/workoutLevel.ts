/**
 * Workout Level System Type Definitions
 * Gamification layer based on kind 1301 workout events
 */

export interface WorkoutLevel {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  totalXP: number;
  progress: number; // 0-1 for UI progress ring
}

export interface XPCalculation {
  baseXP: number; // 10 XP per workout
  distanceBonus: number; // +1 XP per km
  durationBonus: number; // +1 XP per 10 minutes
  calorieBonus: number; // +5 XP per 100 calories
  totalXP: number;
}

export interface LevelStats {
  totalWorkouts: number;
  totalDistance: number; // in meters
  totalDuration: number; // in seconds
  totalCalories: number;
  level: WorkoutLevel;
}

export interface LevelMilestone {
  level: number;
  title: string;
  description: string;
  icon: string; // Ionicons name
  unlockedAt?: Date;
}

// Predefined milestones
export const LEVEL_MILESTONES: LevelMilestone[] = [
  { level: 1, title: 'Beginner', description: 'Just getting started', icon: 'walk-outline' },
  { level: 5, title: 'Rookie', description: '5 levels completed', icon: 'bicycle-outline' },
  { level: 10, title: 'Athlete', description: '10 levels completed', icon: 'bicycle-outline' },
  { level: 20, title: 'Veteran', description: '20 levels completed', icon: 'barbell-outline' },
  { level: 30, title: 'Champion', description: '30 levels completed', icon: 'trophy-outline' },
  { level: 50, title: 'Legend', description: '50 levels completed', icon: 'flame-outline' },
  { level: 75, title: 'Master', description: '75 levels completed', icon: 'star-outline' },
  { level: 100, title: 'Elite', description: '100 levels completed', icon: 'medal-outline' },
];

// XP Constants
export const XP_CONSTANTS = {
  BASE_PER_WORKOUT: 10,
  PER_KM: 1,
  PER_10_MINUTES: 1,
  PER_100_CALORIES: 5,
  XP_PER_LEVEL: 100,
} as const;
