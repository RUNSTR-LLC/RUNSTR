/**
 * Competition Scoring Utilities - Extracted from WorkoutMetricsCalculator
 * Handles scoring logic for different competition types
 */

import { CalculatedMetrics } from './workoutMetricsCalculator';

export type CompetitionType = 
  // Running competitions
  | 'Total Distance'
  | 'Average Pace'
  | 'Longest Run'
  | 'Most Consistent'
  | 'Weekly Streaks'
  // Walking competitions
  | 'Total Steps'
  | 'Daily Average'
  // Cycling competitions
  | 'Total Elevation'
  | 'Average Speed'
  | 'Longest Ride'
  // Strength Training competitions
  | 'Total Workouts'
  | 'Total Duration'
  | 'Personal Records'
  // Meditation competitions
  | 'Session Count'
  | 'Longest Session'
  // Yoga competitions
  | 'Pose Diversity'
  // Diet competitions
  | 'Nutrition Score'
  | 'Calorie Consistency'
  | 'Macro Balance'
  | 'Meal Logging';

/**
 * Calculate score based on competition type
 */
export function calculateCompetitionScore(metrics: CalculatedMetrics, competitionType: CompetitionType): number {
  switch (competitionType) {
    // Running competitions
    case 'Total Distance':
      return metrics.totalDistance;
    
    case 'Average Pace':
      return metrics.avgPace > 0 ? (1 / metrics.avgPace) * 1000000 : 0; // Lower pace = higher score
    
    case 'Longest Run':
      return metrics.longestRun;
    
    case 'Most Consistent':
      return metrics.weeklyConsistency * 100;
    
    case 'Weekly Streaks':
      return metrics.workoutStreak * 7; // Weight streaks heavily
    
    // Walking competitions
    case 'Total Steps':
      return metrics.totalDistance * 1.31; // Rough steps conversion
    
    case 'Daily Average':
      return metrics.dailyAverage;
    
    // Cycling competitions
    case 'Total Elevation':
      return metrics.totalElevation;
    
    case 'Average Speed':
      return metrics.avgPace > 0 ? (1 / metrics.avgPace) * 1000000 : 0;
    
    case 'Longest Ride':
      return metrics.longestRun; // Same as longest distance
    
    // Strength Training competitions
    case 'Total Workouts':
      return metrics.workoutCount;
    
    case 'Total Duration':
      return metrics.totalDuration;
    
    case 'Personal Records':
      return metrics.prCount * 100; // Weight PRs heavily
    
    // Meditation competitions
    case 'Session Count':
      return metrics.workoutCount;
    
    case 'Longest Session':
      return metrics.longestWorkout;
    
    // Yoga competitions
    case 'Pose Diversity':
      return metrics.workoutCount * 10; // Placeholder scoring
    
    // Diet competitions
    case 'Nutrition Score':
      return metrics.workoutCount * 50; // Placeholder scoring
    
    case 'Calorie Consistency':
      return metrics.weeklyConsistency * 100;
    
    case 'Macro Balance':
      return metrics.dailyAverage * 10;
    
    case 'Meal Logging':
      return metrics.workoutCount;
    
    default:
      console.warn(`Unknown competition type: ${competitionType}`);
      return 0;
  }
}

/**
 * Get detailed score breakdown for UI display
 */
export function getScoreBreakdown(metrics: CalculatedMetrics, competitionType: CompetitionType): Record<string, number> {
  const breakdown: Record<string, number> = {};

  switch (competitionType) {
    case 'Total Distance':
      breakdown['Total Distance (m)'] = metrics.totalDistance;
      breakdown['Workouts'] = metrics.workoutCount;
      breakdown['Avg Distance'] = metrics.workoutCount > 0 ? metrics.totalDistance / metrics.workoutCount : 0;
      break;

    case 'Most Consistent':
      breakdown['Weekly Consistency'] = metrics.weeklyConsistency;
      breakdown['Workout Streak'] = metrics.workoutStreak;
      breakdown['Daily Average'] = metrics.dailyAverage;
      break;

    case 'Average Pace':
      breakdown['Average Pace (s/km)'] = metrics.avgPace;
      breakdown['Best 5K Time'] = metrics.best5k;
      breakdown['Total Runs'] = metrics.workoutCount;
      break;

    default:
      breakdown['Score'] = calculateCompetitionScore(metrics, competitionType);
      break;
  }

  return breakdown;
}