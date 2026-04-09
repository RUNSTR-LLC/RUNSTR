/**
 * Workout and Fitness Types
 * TypeScript definitions for workouts, fitness data, and activity tracking
 */

import type { VerificationReceipt } from './verification';

// Workout Core Types
export type WorkoutType =
  | 'running'
  | 'cycling'
  | 'walking'
  | 'gym'
  | 'other'
  | 'hiking'
  | 'strength_training'
  | 'strength' // For imported Nostr workouts
  | 'meditation'
  | 'yoga'
  | 'diet'
  | 'fasting';
export type WorkoutSource =
  | 'healthkit'
  | 'health_connect'
  | 'garmin'
  | 'googlefit'
  | 'nostr'
  | 'manual'
  | 'gps_tracker'
  | 'manual_entry';
export type FitnessProvider = 'healthkit' | 'health_connect' | 'garmin' | 'googlefit' | 'nostr';

export interface Workout {
  id: string;
  userId: string;
  type: WorkoutType;
  source: WorkoutSource;
  distance?: number; // meters
  duration: number; // seconds
  calories?: number;
  startTime: string;
  endTime: string;
  heartRate?: {
    avg: number;
    max: number;
  };
  pace?: number; // seconds per mile
  syncedAt: string;
  // Strength training fields
  sets?: number;
  reps?: number;
  weight?: number; // Average weight in lbs (for single-weight workouts or average of per-set weights)
  weightsPerSet?: number[]; // Weight per set in lbs (for varying weights across sets)
  exerciseType?: string; // Specific exercise (pushups, bench, curls, etc.)
  repsBreakdown?: number[]; // Array of reps per set
  // Meditation fields
  meditationType?:
    | 'guided'
    | 'unguided'
    | 'breathwork'
    | 'body_scan'
    | 'gratitude'
    | string;
  // Diet fields
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | string;
  mealSize?: 'small' | 'medium' | 'large' | string;
  // Notes field (for food description, workout notes, etc.)
  notes?: string;
  // Weather context
  weather?: {
    temp: number; // Temperature in Celsius
    feelsLike: number;
    description: string;
    icon: string;
    humidity?: number;
    windSpeed?: number;
  };
  // GPS tracking fields (from local workout storage)
  // Splits use the Split interface from SplitTrackingService
  splits?: Array<{
    number: number;
    distanceKm: number;
    elapsedTime: number;
    splitTime: number;
    pace: number;
    timestamp: number;
  }>;
  elevation?: number; // meters
  speed?: number; // km/h
  raceDistance?: string; // Race preset (e.g., '5k', '10k', 'half', 'marathon')
  steps?: number; // Step count
  // Route fields
  routeId?: string; // Reference to saved route
  routeLabel?: string; // Route name for display
  // Saved card for sharing
  savedCard?: {
    templateId: 'achievement' | 'progress' | 'minimal' | 'stats' | 'elegant' | 'custom_photo' | 'vertical';
    customPhotoUri?: string; // Local file path if user took photo
    generatedAt: string; // ISO timestamp
  };
  // Fitness test fields
  fitnessTestScore?: number;
  fitnessTestGrade?: string;
  fitnessTestComponents?: {
    pushups: { reps: number; score: number };
    situps: { reps: number; score: number };
    run5k: { timeSeconds: number; score: number };
  };
  // Verification (camera-verified workouts)
  verificationReceipt?: VerificationReceipt;
  metadata?: Record<string, any>; // Additional data from source
}

// Enhanced workout data interface for fitness services
export interface WorkoutData {
  id: string;
  userId: string;
  teamId?: string;
  type: WorkoutType;
  source: FitnessProvider;
  distance?: number; // meters
  duration: number; // seconds
  calories?: number;
  startTime: string;
  endTime: string;
  syncedAt: string;
  metadata?: Record<string, any>;
}

// Workout statistics interface
export interface WorkoutStats {
  totalWorkouts: number;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  totalScore: number;
  averageScore: number;
  weeklyAverage: number;
  currentStreak: number;
  favoriteWorkoutType: WorkoutType;
}

// Workout-specific leaderboard entry with detailed stats
export interface WorkoutLeaderboardEntry {
  userId: string;
  userName: string;
  rank: number;
  score: number;
  avatar: string;
  stats?: {
    totalWorkouts?: number;
    totalDistance?: number;
    lastWorkout?: string;
  };
}

// Workout-focused team statistics
export interface WorkoutTeamStats {
  memberCount: number;
  totalWorkouts: number;
  totalDistance: number;
  totalScore: number;
  averageScore: number;
  recentActivity: number;
  avgPace: string;
}

// Event Detail Screen Types
export interface EventParticipant {
  id: string;
  name: string;
  avatar: string; // Single letter or URL
  status: 'completed' | 'pending';
}

export interface EventStats {
  participantCount: number;
  completedCount: number;
}

export interface EventProgress {
  isJoined: boolean;
  timeRemaining: {
    hours: number;
    minutes: number;
  };
  status: 'upcoming' | 'active' | 'completed';
  daysRemaining?: number;
}

export interface EventDetailData {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  prizePool: number;
  participants: EventParticipant[];
  participantDetails: EventParticipant[];
  stats: EventStats;
  progress: EventProgress & { percentage: number; daysRemaining?: number };
  status: 'upcoming' | 'active' | 'completed';
  formattedPrize: string; // Formatted like "5,000 sats"
  formattedTimeRemaining: string; // Formatted like "2h 15m left"
  details: {
    distance: string;
    duration: string;
    activityType: string;
    createdBy: string;
    startDate: string;
    endDate: string;
  };
}
