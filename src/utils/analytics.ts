/**
 * Analytics Tracking System for RUNSTR App
 * Tracks user behavior, team selection, and key conversion events
 */

import { DiscoveryTeam, Team } from '../types';

// Analytics event types
export type AnalyticsEvent =
  // Onboarding Events
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_abandoned'
  | 'onboarding_completed'
  | 'onboarding_skipped'

  // Team Discovery Events
  | 'team_discovery_opened'
  | 'team_discovery_closed'
  | 'team_card_viewed'
  | 'team_card_selected'
  | 'team_preview_viewed'
  | 'team_join_initiated'
  | 'team_join_completed'
  | 'team_join_failed'

  // Team Management Events
  | 'team_change_initiated'
  | 'team_leave_initiated'
  | 'team_leave_completed'

  // Notification Events
  | 'notification_scheduled'
  | 'notification_triggered'
  | 'team_management_viewed'

  // Conversion Events
  | 'user_first_team_join'
  | 'user_team_switch'
  | 'team_discovery_conversion'

  // Engagement Events
  | 'profile_team_section_viewed'
  | 'team_stats_viewed'
  | 'team_activity_viewed';

// Analytics properties for different event types
export interface BaseAnalyticsProperties {
  userId?: string;
  timestamp: string;
  sessionId?: string;
  platform: 'ios' | 'android';
  appVersion?: string;
}

export interface TeamAnalyticsProperties extends BaseAnalyticsProperties {
  teamId?: string;
  teamName?: string;
  teamDifficulty?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  teamPrizePool?: number;
  teamMemberCount?: number;
  isTeamFeatured?: boolean;
}

export interface OnboardingAnalyticsProperties extends BaseAnalyticsProperties {
  stepNumber?: number;
  stepName?: string;
  selectedTeamId?: string;
  abandonmentReason?: 'user_action' | 'app_background' | 'error';
}

export interface ConversionAnalyticsProperties extends BaseAnalyticsProperties {
  previousTeamId?: string;
  newTeamId?: string;
  conversionTime?: number; // Time from discovery open to join completion
  viewedTeamsCount?: number;
  selectedTeamsCount?: number;
}

// Main analytics class
class Analytics {
  private isEnabled: boolean = true;
  private userId?: string;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    // TODO: Initialize analytics providers (Firebase, Mixpanel, etc.)
  }

  // Initialize analytics with user context
  initialize(userId: string) {
    this.userId = userId;
    console.log('Analytics initialized for user:', userId);
  }

  // Enable/disable analytics
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get base properties for all events
  private getBaseProperties(): BaseAnalyticsProperties {
    return {
      userId: this.userId,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      platform: 'ios', // TODO: Get from Platform.OS
      appVersion: '1.0.0', // TODO: Get from package.json or config
    };
  }

  // Track generic event
  track(event: AnalyticsEvent, properties?: Record<string, any>) {
    if (!this.isEnabled) return;

    const eventData = {
      event,
      properties: {
        ...this.getBaseProperties(),
        ...properties,
      },
    };

    // Log to console in development
    console.log('📊 Analytics Event:', eventData);

    // TODO: Send to analytics providers
    // this.sendToFirebaseAnalytics(eventData);
    // this.sendToMixpanel(eventData);
    // this.sendToCustomAnalytics(eventData);
  }

  // Onboarding tracking methods
  trackOnboardingStarted() {
    this.track('onboarding_started');
  }

  trackOnboardingStepCompleted(stepNumber: number, stepName: string) {
    this.track('onboarding_step_completed', {
      stepNumber,
      stepName,
    });
  }

  trackOnboardingAbandoned(stepNumber: number, reason?: string) {
    this.track('onboarding_abandoned', {
      stepNumber,
      abandonmentReason: reason || 'user_action',
    });
  }

  trackOnboardingCompleted(selectedTeam?: DiscoveryTeam) {
    this.track('onboarding_completed', {
      selectedTeamId: selectedTeam?.id,
      selectedTeamName: selectedTeam?.name,
      hasJoinedTeam: !!selectedTeam,
    });
  }

  trackOnboardingSkipped() {
    this.track('onboarding_skipped');
  }

  // Team discovery tracking methods
  trackTeamDiscoveryOpened(
    context: 'onboarding' | 'profile' | 'direct' = 'direct'
  ) {
    this.track('team_discovery_opened', {
      context,
      openTime: Date.now(),
    });
  }

  trackTeamDiscoveryClosed(viewedTeamsCount: number, interactionTime: number) {
    this.track('team_discovery_closed', {
      viewedTeamsCount,
      interactionTime,
    });
  }

  trackTeamCardViewed(team: DiscoveryTeam) {
    this.track('team_card_viewed', {
      teamId: team.id,
      teamName: team.name,
      teamDifficulty: team.difficulty,
      teamPrizePool: team.prizePool,
      teamMemberCount: team.stats.memberCount,
      isTeamFeatured: team.isFeatured || false,
    });
  }

  trackTeamCardSelected(team: DiscoveryTeam) {
    this.track('team_card_selected', {
      teamId: team.id,
      teamName: team.name,
      teamDifficulty: team.difficulty,
      teamPrizePool: team.prizePool,
      isTeamFeatured: team.isFeatured || false,
    });
  }

  trackTeamJoinInitiated(team: DiscoveryTeam) {
    this.track('team_join_initiated', {
      teamId: team.id,
      teamName: team.name,
      teamDifficulty: team.difficulty,
      teamPrizePool: team.prizePool,
      teamMemberCount: team.stats.memberCount,
    });
  }

  trackTeamJoinCompleted(team: DiscoveryTeam, isFirstTeam: boolean = false) {
    this.track('team_join_completed', {
      teamId: team.id,
      teamName: team.name,
      teamDifficulty: team.difficulty,
      teamPrizePool: team.prizePool,
      isFirstTeam,
    });

    // Track conversion event for first team join
    if (isFirstTeam) {
      this.track('user_first_team_join', {
        teamId: team.id,
        teamName: team.name,
      });
    }
  }

  trackTeamJoinFailed(team: DiscoveryTeam, error: string) {
    this.track('team_join_failed', {
      teamId: team.id,
      teamName: team.name,
      error,
    });
  }

  // Team management tracking
  trackTeamChangeInitiated(currentTeam?: Team) {
    this.track('team_change_initiated', {
      currentTeamId: currentTeam?.id,
      currentTeamName: currentTeam?.name,
    });
  }

  trackTeamSwitch(previousTeam: Team, newTeam: DiscoveryTeam) {
    this.track('user_team_switch', {
      previousTeamId: previousTeam.id,
      previousTeamName: previousTeam.name,
      newTeamId: newTeam.id,
      newTeamName: newTeam.name,
    });
  }

  trackProfileTeamSectionViewed(hasTeam: boolean) {
    this.track('profile_team_section_viewed', {
      hasTeam,
    });
  }

  // Conversion funnel tracking
  trackTeamDiscoveryConversion(
    viewedTeamsCount: number,
    selectedTeamsCount: number,
    conversionTime: number,
    joinedTeam: DiscoveryTeam
  ) {
    this.track('team_discovery_conversion', {
      viewedTeamsCount,
      selectedTeamsCount,
      conversionTime,
      joinedTeamId: joinedTeam.id,
      joinedTeamName: joinedTeam.name,
      conversionRate: selectedTeamsCount / viewedTeamsCount,
    });
  }

  // Performance and engagement tracking
  trackTeamStatsViewed(team: Team | DiscoveryTeam) {
    this.track('team_stats_viewed', {
      teamId: team.id,
      teamName: team.name,
    });
  }

  trackTeamActivityViewed(team: Team | DiscoveryTeam) {
    this.track('team_activity_viewed', {
      teamId: team.id,
      teamName: team.name,
    });
  }

  // Utility methods for tracking complex flows
  startTeamDiscoverySession() {
    const sessionStart = Date.now();
    const sessionData = {
      startTime: sessionStart,
      viewedTeams: [] as string[],
      selectedTeams: [] as string[],

      trackTeamViewed: (teamId: string) => {
        // Track unique team views
        if (!sessionData.viewedTeams.includes(teamId)) {
          sessionData.viewedTeams.push(teamId);
        }
      },

      trackTeamSelected: (teamId: string) => {
        if (!sessionData.selectedTeams.includes(teamId)) {
          sessionData.selectedTeams.push(teamId);
        }
      },

      complete: (joinedTeam?: DiscoveryTeam) => {
        const duration = Date.now() - sessionData.startTime;

        if (joinedTeam) {
          this.trackTeamDiscoveryConversion(
            sessionData.viewedTeams.length,
            sessionData.selectedTeams.length,
            duration,
            joinedTeam
          );
        }

        this.trackTeamDiscoveryClosed(sessionData.viewedTeams.length, duration);
      },
    };
    return sessionData;
  }

  // Notification tracking
  trackNotificationScheduled(type: string, scheduled: boolean) {
    this.track('notification_scheduled', {
      type,
      scheduled,
    });
  }

  trackNotificationTriggered(type: string, successful: boolean) {
    this.track('notification_triggered', {
      type,
      successful,
    });
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Types are already exported above with 'export interface'
