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
- **ChallengeNotificationsBox.tsx** - Displays incoming challenge requests with accept/decline buttons
- **CompactWallet.tsx** - Compact wallet display with balance and action buttons
- **NotificationBadge.tsx** - Red notification badge with unread count, positioned in bottom-right of profile header
- **NotificationItem.tsx** - Individual notification card component with icon, title, body, actions, and unread indicator
- **NotificationModal.tsx** - Full-screen notification feed modal with date grouping, pull-to-refresh, and action handling
- **NotificationsTab.tsx** - Notification preferences and settings tab
- **PerformanceDashboard.tsx** - Workout analytics and performance metrics display
- **ProfileHeader.tsx** - Profile screen header with user information and avatar
- **TabNavigation.tsx** - Tab navigation for profile screen sections
- **TeamManagementSection.tsx** - Team membership and management section in profile
- **WalletSection.tsx** - Bitcoin wallet section for profile screen
- **WorkoutsTab.tsx** - Public/All tab navigation with sync dropdown (151 lines)
- **YourCompetitionsBox.tsx** - Shows user's active competitions with counts and navigation (175 lines)
- **YourWorkoutsBox.tsx** - Displays user's recent workouts with quick access to workout history

## Subdirectories

- **shared/** - Reusable workout display and action components
- **tabs/** - Public and All workout tab implementations