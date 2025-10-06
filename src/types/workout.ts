/**
 * Workout and Fitness Types
 * TypeScript definitions for workouts, fitness data, and activity tracking
 */

// Workout Core Types
export type WorkoutType =
  | 'running'
  | 'cycling'
  | 'walking'
  | 'gym'
  | 'other'
  | 'hiking'
  | 'yoga'
  | 'strength_training';
export type WorkoutSource = 'healthkit' | 'googlefit' | 'nostr' | 'manual';
export type FitnessProvider = 'healthkit' | 'googlefit' | 'nostr';

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

// Challenge Detail Screen Types
export interface ChallengeCompetitor {
  id: string;
  name: string;
  avatar: string; // Single letter or URL
  status: 'completed' | 'in_progress' | 'pending';
  progress: {
    value: number; // Current progress value
    percentage: number; // 0-100 for progress bar
    unit: string; // "km", "minutes", etc.
  };
}

export interface ChallengeProgress {
  isParticipating: boolean;
  isWatching: boolean;
  status: 'active' | 'completed' | 'expired';
  isCompleted: boolean;
  winner?: {
    id: string;
    name: string;
    avatar: string;
    status: 'completed' | 'in_progress' | 'pending';
    progress: {
      value: number;
      percentage: number;
      unit: string;
    };
  };
  currentLeader?: {
    id: string;
    name: string;
    progress: number;
  };
}

export interface ChallengeTimer {
  timeRemaining: string; // Formatted like "1d 5h 30m"
  isExpired: boolean;
}

export interface ChallengeRule {
  id: string;
  text: string;
}

export interface ChallengeDetailData {
  id: string;
  name: string;
  description: string;
  prizePool: number;
  competitors: ChallengeCompetitor[];
  progress: ChallengeProgress;
  timer: ChallengeTimer;
  rules: ChallengeRule[];
  status: 'pending' | 'accepted' | 'active' | 'completed' | 'disputed';
  formattedPrize: string; // Formatted like "1,000 sats"
  formattedDeadline: string; // Formatted like "Ends Dec 22"
}

// Challenge Creation Wizard Types
export type ChallengeCreationStep =
  | 'choose_opponent'
  | 'challenge_type'
  | 'wager_amount'
  | 'review_confirm'
  | 'success';

export type ChallengeCategory = 'race' | 'distance' | 'activity';

export interface ChallengeType {
  id: string;
  name: string;
  description: string;
  category: ChallengeCategory;
  metric: 'time' | 'distance' | 'steps' | 'consistency';
}

export interface TeammateInfo {
  id: string;
  name: string;
  avatar: string;
  stats: {
    challengesCount: number;
    winsCount: number;
  };
}

export interface ChallengeCreationData {
  // Step 1: Choose Opponent
  opponentId?: string;
  opponentInfo?: TeammateInfo;

  // Step 2: Challenge Type
  challengeType?: ChallengeType;

  // Step 3: Wager Amount
  wagerAmount: number; // satoshis

  // Step 4: Review & Confirm
  duration: number; // days - default 7
  expiresAt?: string; // calculated deadline
}
