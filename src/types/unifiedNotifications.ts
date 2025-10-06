/**
 * Unified Notification System Types
 * Central type definitions for all notification types across the app
 */

/**
 * All possible notification types in the app
 */
export type UnifiedNotificationType =
  | 'challenge_request'        // Kind 1105: Someone challenges you
  | 'challenge_accepted'       // Kind 1106: Your challenge was accepted
  | 'challenge_declined'       // Kind 1107: Your challenge was declined
  | 'competition_announcement' // Kind 1101: New competition created
  | 'competition_reminder'     // Kind 1103: Competition starting soon
  | 'competition_results'      // Kind 1102: Competition results posted
  | 'incoming_zap'             // Kind 9735: Received Bitcoin zap
  | 'team_join_request'        // Custom: User wants to join your team (captain only)
  | 'event_join_request'       // Kind 1105: User wants to join your event (captain only)
  | 'workout_comment'          // Kind 1: Comment on your workout post
  | 'workout_zap';             // Kind 9735: Zap on your workout post

/**
 * Action types that can be taken from notifications
 */
export type NotificationActionType =
  | 'accept_challenge'
  | 'decline_challenge'
  | 'view_challenge'
  | 'view_competition'
  | 'join_competition'
  | 'view_results'
  | 'view_wallet'
  | 'approve_join_request'
  | 'deny_join_request'
  | 'view_event_requests'
  | 'view_workout'
  | 'reply_comment';

/**
 * Action that can be performed from a notification
 */
export interface NotificationAction {
  id: string;
  type: NotificationActionType;
  label: string;
  isPrimary?: boolean; // Primary actions styled differently
}

/**
 * Challenge-specific notification metadata
 */
export interface ChallengeNotificationMetadata {
  challengeId: string;
  challengerPubkey: string;
  challengerName?: string;
  challengerPicture?: string;
  activityType: string;
  metric: string;
  duration: number;
  wagerAmount: number;
  opponentPubkey?: string; // For challenge responses
  opponentName?: string;
}

/**
 * Competition-specific notification metadata
 */
export interface CompetitionNotificationMetadata {
  competitionId: string;
  competitionName: string;
  competitionType: 'event' | 'league' | 'challenge';
  activityType?: string;
  startDate?: number;
  endDate?: number;
  teamId?: string;
  teamName?: string;
  captainPubkey?: string;
  captainName?: string;
  // For results
  userPosition?: number;
  totalParticipants?: number;
  prizeAmount?: number;
}

/**
 * Zap-specific notification metadata
 */
export interface ZapNotificationMetadata {
  amount: number;
  senderPubkey: string;
  senderName?: string;
  senderPicture?: string;
  comment?: string;
  workoutEventId?: string; // If zap was for a workout post
  bolt11?: string;
}

/**
 * Team-specific notification metadata
 */
export interface TeamNotificationMetadata {
  teamId: string;
  teamName: string;
  requesterPubkey: string;
  requesterName?: string;
  requesterPicture?: string;
  requesterNpub?: string;
}

/**
 * Event join request notification metadata
 */
export interface EventJoinNotificationMetadata {
  requestId: string;
  eventId: string;
  eventName: string;
  teamId: string;
  requesterId: string;
  requesterName?: string;
  requesterPicture?: string;
  message?: string;
}

/**
 * Workout interaction notification metadata
 */
export interface WorkoutNotificationMetadata {
  workoutEventId: string;
  workoutType: string;
  commenterPubkey: string;
  commenterName?: string;
  commenterPicture?: string;
  commentText?: string;
  commentEventId?: string;
}

/**
 * Union type for all metadata types
 */
export type NotificationMetadata =
  | ChallengeNotificationMetadata
  | CompetitionNotificationMetadata
  | ZapNotificationMetadata
  | TeamNotificationMetadata
  | EventJoinNotificationMetadata
  | WorkoutNotificationMetadata;

/**
 * Core unified notification structure
 */
export interface UnifiedNotification {
  id: string;
  type: UnifiedNotificationType;
  timestamp: number; // Unix timestamp in milliseconds
  isRead: boolean;
  title: string;
  body: string;
  icon: string; // Ionicon name
  metadata: NotificationMetadata;
  actions?: NotificationAction[];
  // Optional Nostr event ID for reference
  nostrEventId?: string;
}

/**
 * Notification storage structure
 */
export interface NotificationStorage {
  notifications: UnifiedNotification[];
  lastCleanup: number; // Timestamp of last cleanup
  version: number; // Schema version for migrations
}

/**
 * Notification subscriber callback
 */
export type NotificationSubscriber = (notifications: UnifiedNotification[], unreadCount: number) => void;

/**
 * Notification filter options
 */
export interface NotificationFilter {
  types?: UnifiedNotificationType[];
  unreadOnly?: boolean;
  startDate?: number;
  endDate?: number;
  limit?: number;
}

/**
 * Grouped notifications by date
 */
export interface GroupedNotifications {
  today: UnifiedNotification[];
  yesterday: UnifiedNotification[];
  thisWeek: UnifiedNotification[];
  older: UnifiedNotification[];
}
