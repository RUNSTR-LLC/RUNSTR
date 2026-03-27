/**
 * Level System Type Definitions
 * Simplified flat XP per action, linear level curve
 */

export interface WorkoutLevel {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  totalXP: number;
  progress: number; // 0-1
  title: string;
}

export interface LevelStats {
  totalWorkouts: number;
  totalDistance: number; // in meters
  level: WorkoutLevel;
}

export interface LevelMilestone {
  level: number;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

// Flat XP values per action
export const XP_VALUES = {
  WORKOUT_SUBMITTED: 300,
  DAILY_STEPS_GOAL: 100,
  ZAP_RECEIVED: 50,
  REPOST_RECEIVED: 25,
  LIKE_RECEIVED: 10,
  LIKE_GIVEN: 5,
  DAILY_LOGIN: 25,
} as const;

export const DAILY_STEPS_GOAL_THRESHOLD = 5000;
export const XP_PER_LEVEL = 500;
export const MAX_LEVEL = 50;

export const LEVEL_MILESTONES: LevelMilestone[] = [
  { level: 1, title: 'Beginner', description: 'Just getting started', icon: 'walk-outline' },
  { level: 5, title: 'Active', description: 'Building a habit', icon: 'footsteps-outline' },
  { level: 10, title: 'Athlete', description: 'Dedicated and consistent', icon: 'fitness-outline' },
  { level: 20, title: 'Veteran', description: 'Experienced competitor', icon: 'barbell-outline' },
  { level: 30, title: 'Champion', description: 'Rising to the top', icon: 'trophy-outline' },
  { level: 50, title: 'Legend', description: 'Peak achievement', icon: 'flame-outline' },
];
