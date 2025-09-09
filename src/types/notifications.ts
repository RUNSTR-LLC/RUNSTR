/**
 * Notification Types
 * TypeScript definitions for push notifications, alerts, and messaging
 */

// Core Notification Types
export type NotificationType =
  | 'challenge_received'
  | 'challenge_completed'
  | 'event_reminder'
  | 'leaderboard_update'
  | 'bitcoin_earned'
  | 'team_announcement'
  | 'team_event'
  | 'challenge_from_user'
  | 'position_change'
  | 'live_position_threat'
  | 'live_position_gained'
  | 'competition_ending_soon'
  | 'challenge_invitation'
  | 'team_member_joined'
  | 'team_join_request' // Captain notification for join requests
  | 'weekly_earnings_summary'
  | 'workout_reminder'
  | 'streak_reminder'
  // Nostr competition events (NIP-101e)
  | 'competition_announcement' // kind 1101
  | 'competition_results' // kind 1102
  | 'competition_starting_soon'; // kind 1103

// Rich Notification Content Types
export interface NotificationAction {
  id: string;
  text: string;
  type: 'primary' | 'secondary';
  action:
    | 'view_race'
    | 'start_run'
    | 'view_wallet'
    | 'join_event'
    | 'accept_challenge'
    | 'decline_challenge'
    | 'approve_join_request'
    | 'deny_join_request'
    | 'view_join_requests';
}

export interface MiniLeaderboardEntry {
  position: number;
  name: string;
  time: string;
  isUser: boolean;
  isGaining?: boolean;
}

export interface RichNotificationData {
  id: string;
  type: NotificationType;
  appName?: string;
  appIcon?: string;
  timestamp: string; // ISO datetime
  title: string;
  subtitle?: string;
  body?: string;
  actions?: NotificationAction[];

  // Specialized content
  bitcoinAmount?: number; // for bitcoin_earned notifications
  miniLeaderboard?: MiniLeaderboardEntry[]; // for live competition updates
  challengerName?: string; // for challenge notifications
  requesterId?: string; // for team join request notifications
  eventName?: string; // for event notifications
  earningsAmount?: string; // formatted earnings like "+2,500 sats"
  eventId?: string; // for linking to events
  teamId?: string; // for team notifications
  prizeAmount?: number; // prize amounts in sats

  // Competition event specific (kinds 1101, 1102, 1103)
  competitionId?: string; // competition identifier
  startTime?: string; // ISO timestamp for competition start
  endTime?: string; // ISO timestamp for competition end
  eventType?: string; // activity type (5k_run, etc.)
  place?: number; // user's final position (for results)
  satsWon?: number; // satoshis won (for results)
  reminderTime?: string; // when notification should be sent (for starting soon)

  // Visual elements
  hasProgressIndicator?: boolean;
  liveIndicator?: {
    text: string;
    color: string;
    isLive?: boolean;
  };
  earningsSection?: {
    amount: number;
    label: string;
  };

  // Interaction state
  isRead?: boolean;
  isPinned?: boolean;
  isNew?: boolean;
}

// Grouped Notifications
export interface GroupedNotification {
  id: string;
  appName: string;
  count: number;
  notifications: RichNotificationData[];
  timestamp: string;
}

// Notification Categories (for display organization)
export type NotificationCategory =
  | 'live_competition'
  | 'bitcoin_rewards'
  | 'team_activity'
  | 'activity_reminders'
  | 'grouped';

export interface CategorizedNotifications {
  liveCompetition: RichNotificationData[];
  bitcoinRewards: RichNotificationData[];
  teamActivity: RichNotificationData[];
  activityReminders: RichNotificationData[];
  grouped: GroupedNotification[];
}

// Basic Notification (for simpler cases)
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string; // ISO datetime
  isRead: boolean;
  metadata?: {
    // Bitcoin earned notifications
    bitcoinAmount?: number; // satoshis
    workoutId?: string;

    // Team event notifications
    eventId?: string;
    eventName?: string;

    // Challenge notifications
    challengeId?: string;
    challengerId?: string;
    challengerName?: string;

    // Position change notifications
    oldPosition?: number;
    newPosition?: number;
    leagueId?: string;
    leagueName?: string;

    // Competition event metadata (kinds 1101, 1102, 1103)
    competitionId?: string;
    startTime?: number; // unix timestamp
    endTime?: number; // unix timestamp
    eventType?: string; // activity type
    prizePool?: number; // total prize in sats
    place?: number; // final position (for results)
    satsWon?: number; // amount won (for results)
    totalParticipants?: number; // number of participants
  };
}

export interface NotificationHistory {
  items: Notification[];
  unreadCount: number;
  lastUpdated: string;
}
