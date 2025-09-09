/**
 * Wizard and Onboarding Types
 * TypeScript definitions for wizard flows, onboarding, and multi-step forms
 */

// General Wizard Types
export type WizardStep =
  | 'login'
  | 'profile_setup'
  | 'role_selection'
  | 'team_selection'
  | 'sync_setup'
  | 'wallet_creation'
  | 'team_creation'
  | 'league_setup'
  | 'first_event';

// Onboarding-specific step types
export type OnboardingStep =
  | 'welcome'
  | 'authentication'
  | 'role_selection'
  | 'permissions'
  | 'team_selection'
  | 'setup_complete';

export interface WizardState {
  currentStep: WizardStep;
  isComplete: boolean;
  data: Record<string, any>;
}

// Real-time Update Types (used across wizards)
export type TeamUpdateType =
  | 'member_joined'
  | 'activity_added'
  | 'stats_updated'
  | 'payout_made';

export interface TeamUpdate {
  type: TeamUpdateType;
  teamId: string;
  timestamp: string;
  data?: any;
}

// League Settings Form Data (for team creation wizard)
export interface LeagueSettingsFormData {
  competitionType: 'streaks' | 'distance' | 'speed' | null;
  duration: 'weekly' | 'monthly' | null;
  payoutStructure: 'top3' | 'top5' | 'top10' | null;
  prizePool: 5000 | 21000 | 50000 | null;
}

// Challenge Creation Wizard Props
export interface ChallengeCreationWizardProps {
  onComplete: (challengeData: any) => Promise<void>; // Reference from workout.ts
  onCancel: () => void;
  teammates?: any[]; // Reference TeammateInfo from workout.ts
  currentUser?: any; // Reference User from user.ts
  teamId?: string;
}

// Onboarding Wizard Props
export interface OnboardingWizardProps {
  onComplete: (data: OnboardingCompleteData) => void;
  onSkip?: () => void;
  initialStep?: OnboardingStep;
}

export interface OnboardingCompleteData {
  selectedRole?: 'member' | 'captain';
  selectedTeam?: any; // Reference DiscoveryTeam from team.ts
  walletCreated?: boolean;
  permissionsGranted?: boolean;
}

// Role Selection Props
export interface RoleSelectionStepProps {
  onNext: (role: 'member' | 'captain') => void;
  onSkip?: () => void;
  selectedRole?: 'member' | 'captain';
}
