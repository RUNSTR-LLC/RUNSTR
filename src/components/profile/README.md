# Profile Components Directory

User profile screen components and profile-related functionality.

## Architecture Overview

The profile section now uses a **tab-based workout architecture** that separates different workout sources for simplicity and scalability:

- **Nostr Tab** - Shows published Nostr kind 1301 workout events
- **Apple Health Tab** - Displays HealthKit workouts with "Post to Nostr" functionality  
- **Garmin Tab** - Placeholder for Garmin Connect integration (Coming Soon)
- **Google Fit Tab** - Placeholder for Google Fit integration (Coming Soon)

This replaces the previous complex merged workout system with simple, isolated components for each data source.

## Files

- **AccountTab.tsx** - Account settings and profile management tab content
- **NotificationsTab.tsx** - Notification preferences and settings tab
- **PerformanceDashboard.tsx** - Workout analytics and performance metrics display
- **ProfileHeader.tsx** - Profile screen header with user information and avatar
- **TabNavigation.tsx** - Tab navigation for profile screen sections
- **TeamManagementSection.tsx** - Team membership and management section in profile
- **WalletSection.tsx** - Bitcoin wallet section for profile screen
- **WorkoutsTab.tsx** - **NEW ARCHITECTURE**: Simple tab navigation between workout sources (208 lines vs 939 lines previously)

## Subdirectories

- **shared/** - Reusable workout display components
- **tabs/** - Individual workout source tab components