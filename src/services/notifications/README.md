# Notifications Services Directory

Team-branded push notification system with Nostr event integration for RUNSTR.

## Files

- **ChallengeNotificationHandler.ts** - Challenge request notification processing (kinds 1105/1106/1107)
- **ExpoNotificationProvider.ts** - Expo push notification provider and device token management
- **index.ts** - Central export file for notification services
- **NotificationPreferencesService.ts** - User notification preference management and granular controls
- **NotificationScheduler.ts** - Notification scheduling and delivery timing management
- **NotificationService.ts** - Main notification service coordinating all notification functionality
- **NostrNotificationEventHandler.ts** - Real-time processing of Nostr competition events (kinds 1101, 1102, 1103)
- **TeamContextService.ts** - Single source of truth for team membership and context in notifications
- **TeamNotificationFormatter.ts** - Team-branded notification formatting and rich content generation