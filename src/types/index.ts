/**
 * RUNSTR Core Types - Main Export File
 * Re-exports all TypeScript definitions from focused modules
 */

// Re-export User and Authentication Types
export * from './user';

// Re-export Team and Competition Types
export * from './team';

// Re-export Workout and Fitness Types
export * from './workout';

// Re-export Bitcoin and Wallet Types
export * from './bitcoin';

// Re-export Notification Types
export * from './notifications';

// Re-export Wizard Types
export * from './wizards';

// Re-export Team Matching Algorithm Types (from utils/teamMatching)
export type {
  TeamMatch,
  UserPreferences,
  UserFitnessProfile,
} from '../utils/teamMatching';

// Navigation Types (for React Navigation)
export interface RootStackParamList extends Record<string, object | undefined> {
  Home: undefined;
  Team: undefined;
  Profile: undefined;
  Wallet: undefined;
  ChallengeDetail: { challengeId: string };
  EventDetail: { eventId: string; eventData?: any };
  EventCaptainDashboard: { eventId: string; eventData: any };
  LeagueDetail: { leagueId: string; leagueData?: any };
  TeamDiscovery: undefined;
  CaptainDashboard: undefined;
}
