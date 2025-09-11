/**
 * RUNSTR User Service - Main Export
 * Re-exports all user-related services from focused modules
 */

// Re-export Authentication Service  
export { AuthService } from './auth/authService';

// Re-export Profile Service
export { ProfileService, type UserProfile } from './user/profileService';

// Re-export Team Membership Service
export {
  TeamMembershipService,
  type TeamSwitchResult,
} from './user/teamMembershipService';

// Default export for backwards compatibility
export { ProfileService as default } from './user/profileService';
