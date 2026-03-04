# Profile Components Directory

User profile screen components and profile-related functionality.

## Architecture Overview

The profile section uses a unified workout view with enhanced workout management:

- **Unified View** - Chronological timeline merging local, HealthKit, Garmin, and Health Connect workouts
- **Sync Dropdown** - Manual import control for various fitness data sources
- **Post/Compete Actions** - Buttons to share workouts socially or enter competitions
- **Monthly Organization** - Workouts grouped by month for better navigation

## Files

- **CompactTeamCard.tsx** - 72px compact team card for multi-team display with avatar, badges, and rank.
- **DebugAuthBanner.tsx** - Shows current auth state for debugging, only visible in debug builds to help diagnose signing issues.
- **MonthlyStatsPanel.tsx** - Monthly statistics panel.
- **NotificationBadge.tsx** - Red notification badge with unread count.
- **NotificationItem.tsx** - Individual notification card component.
- **NotificationModal.tsx** - Full-screen notification feed modal.
- **PersonalWalletSection.tsx** - Personal wallet management section.
- **ProfileHeader.tsx** - Profile screen header with user information and avatar.
- **WalletSection.tsx** - Bitcoin wallet section for profile screen.
- **WatchSyncSection.tsx** - Apple Watch sync section.
- **WorkoutLevelRing.tsx** - Workout level progress ring.
- **WorkoutsTab.tsx** - Public/All tab navigation with sync dropdown.
- **WorkoutStatsSheet.tsx** - Bottom sheet displaying workout statistics with This Week/Month summaries and Personal Records.
- **WorkoutTabNavigator.tsx** - Unified workout view that shows all workouts from all sources via UnifiedWorkoutsTab.

## Subdirectories

- **shared/** - Reusable workout display and action components
- **tabs/** - Workout source tab implementations (Public, Private, Unified, Apple Health, Garmin, Health Connect)
