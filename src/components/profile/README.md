# Profile Components Directory

User profile screen components and profile-related functionality.

## Architecture Overview

The profile section uses a **Public/All tab architecture** with enhanced workout management:

- **Public Tab** - Shows published Nostr kind 1301 workout events
- **All Tab** - Unified view merging HealthKit, Garmin, Google Fit, and Nostr workouts
- **Sync Dropdown** - Manual import control for various fitness data sources
- **Post/Compete Actions** - Buttons to share workouts socially or enter competitions
- **Monthly Organization** - Workouts grouped by month for better navigation

This architecture provides a clear distinction between public (shared) and private (local) workouts with seamless posting capabilities.

## Files

- **AccountTab.tsx** - Account settings and profile management tab content
- **NotificationsTab.tsx** - Notification preferences and settings tab
- **PerformanceDashboard.tsx** - Workout analytics and performance metrics display
- **ProfileHeader.tsx** - Profile screen header with user information and avatar
- **TabNavigation.tsx** - Tab navigation for profile screen sections
- **TeamManagementSection.tsx** - Team membership and management section in profile
- **WalletSection.tsx** - Bitcoin wallet section for profile screen
- **WorkoutsTab.tsx** - Public/All tab navigation with sync dropdown (151 lines)

## Subdirectories

- **shared/** - Reusable workout display and action components
- **tabs/** - Public and All workout tab implementations