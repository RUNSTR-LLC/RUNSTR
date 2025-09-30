/**
 * User and Authentication Types
 * TypeScript definitions for users, authentication, and profiles
 */

// Authentication Types
export type AuthProvider = 'apple' | 'google' | 'nostr';

export interface User {
  id: string;
  email?: string;
  name: string;
  avatar?: string;
  npub: string; // Nostr public key
  nsec?: string; // Nostr private key (encrypted)
  role: 'member' | 'captain';
  teamId?: string;
  currentTeamId?: string;
  createdAt: string;
  lastSyncAt?: string;

  // Nostr Profile Data (from kind 0 events)
  bio?: string; // about field from Nostr profile
  website?: string; // website field from Nostr profile
  picture?: string; // picture field from Nostr profile (avatar URL)
  banner?: string; // banner field from Nostr profile (banner URL)
  lud16?: string; // Lightning address from Nostr profile
  displayName?: string; // display_name from Nostr profile

  // Hybrid Model Sync Status
  isSupabaseSynced?: boolean; // Whether user data is synced to Supabase for enhanced features
}

// Sync Status Types
export interface SyncSource {
  provider: 'healthkit' | 'googlefit' | 'nostr';
  isConnected: boolean;
  lastSync?: string;
  permissions: string[];
}

// Profile Screen Data Types
export interface ProfileScreenData {
  user: User;
  wallet: any; // Reference wallet types from wallet.ts
  syncSources: SyncSource[];
  recentWorkouts: any[]; // Reference workout types from workout.ts
  notificationSettings: NotificationSettings;
  currentTeam?: any; // User's current team data
  subscription?: {
    type: 'captain' | 'member';
    status: 'active' | 'expired' | 'cancelled';
  };
}

// Profile Tab Types
export type ProfileTab = 'workouts' | 'account' | 'notifications';

// Notification Settings
export interface NotificationSettings {
  eventNotifications: boolean;
  leagueUpdates: boolean;
  teamAnnouncements: boolean;
  bitcoinRewards: boolean;
  challengeUpdates: boolean;
  liveCompetitionUpdates: boolean;
  workoutReminders: boolean;
}

// Enhanced Authentication Types for Phase 1
export interface AuthResult {
  success: boolean;
  user?: User;
  needsOnboarding?: boolean;
  needsRoleSelection?: boolean;
  needsWalletCreation?: boolean;
  error?: string;
  nsec?: string; // Password for onboarding display
}

export interface CreateUserData {
  name: string;
  email?: string;
  npub: string;
  nsec?: string; // Will be stored locally, not in database
  authProvider: AuthProvider;
  role?: 'member' | 'captain';
}

export interface RoleSelectionData {
  role: 'member' | 'captain';
  personalWalletAddress?: string;
}

// Extended User interface with wallet info
export interface UserWithWallet extends User {
  personalWalletAddress?: string;
  lightningAddress?: string;
  walletBalance?: number;
  hasWalletCredentials?: boolean;
}
