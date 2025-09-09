/**
 * TeamNotificationFormatter - Team branding integration for notifications
 * Adds team context and branding to all notifications via Nostr
 */

import { TeamContextService } from './TeamContextService';
import { RichNotificationData } from '../../types';
import { analytics } from '../../utils/analytics';

export interface TeamInfo {
  id: string;
  name: string;
  avatar?: string;
  memberCount?: number;
  captainId?: string;
  activityType?: string;
  location?: string;
}

export interface TeamBrandedNotification extends RichNotificationData {
  teamId?: string;
  teamName?: string;
  originalTitle: string;
}

export class TeamNotificationFormatter {
  private static instance: TeamNotificationFormatter;
  private teamCache: Map<string, TeamInfo> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private teamContextService: TeamContextService;

  private constructor() {
    this.teamContextService = TeamContextService.getInstance();
  }

  static getInstance(): TeamNotificationFormatter {
    if (!TeamNotificationFormatter.instance) {
      TeamNotificationFormatter.instance = new TeamNotificationFormatter();
    }
    return TeamNotificationFormatter.instance;
  }

  // Add team branding to notification
  async addTeamBranding(
    teamId: string,
    notification: RichNotificationData
  ): Promise<TeamBrandedNotification> {
    try {
      const teamInfo = await this.getTeamInfo(teamId);

      if (!teamInfo) {
        // Return original notification if team not found
        analytics.track('notification_scheduled', {
          teamBrandingFailed: true,
          teamId,
          reason: 'team_not_found',
        });
        return {
          ...notification,
          originalTitle: notification.title,
        };
      }

      // Format team-branded title
      const teamBrandedTitle = this.formatTeamBrandedTitle(
        teamInfo,
        notification.title
      );

      // Create team-branded notification
      const teamBrandedNotification: TeamBrandedNotification = {
        ...notification,
        title: teamBrandedTitle,
        teamId: teamInfo.id,
        teamName: teamInfo.name,
        originalTitle: notification.title,
      };

      analytics.track('notification_scheduled', {
        teamBranded: true,
        teamId: teamInfo.id,
        teamName: teamInfo.name,
        type: notification.type,
      });

      return teamBrandedNotification;
    } catch (error) {
      console.error('Failed to add team branding:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      analytics.track('notification_scheduled', {
        teamBrandingFailed: true,
        teamId,
        error: errorMessage,
      });

      // Return original notification on error
      return {
        ...notification,
        originalTitle: notification.title,
      };
    }
  }

  // Add team branding for user's current team
  async addUserTeamBranding(
    userId: string,
    notification: RichNotificationData
  ): Promise<TeamBrandedNotification> {
    try {
      const userTeamId = await this.getUserCurrentTeam(userId);

      if (!userTeamId) {
        // User not in a team - return original notification
        return {
          ...notification,
          originalTitle: notification.title,
        };
      }

      return await this.addTeamBranding(userTeamId, notification);
    } catch (error) {
      console.error('Failed to get user team for branding:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      analytics.track('notification_scheduled', {
        userTeamBrandingFailed: true,
        userId,
        error: errorMessage,
      });

      return {
        ...notification,
        originalTitle: notification.title,
      };
    }
  }

  // Format team-branded title
  private formatTeamBrandedTitle(
    teamInfo: TeamInfo,
    originalTitle: string
  ): string {
    // Format: "Team Name: Original Title"
    return `${teamInfo.name}: ${originalTitle}`;
  }

  // Get team information from Nostr
  private async getTeamInfo(teamId: string): Promise<TeamInfo | null> {
    // Check cache first
    const cached = this.getCachedTeam(teamId);
    if (cached) {
      return cached;
    }

    try {
      const teamContext = await this.teamContextService.getTeamContext(teamId);

      if (!teamContext) {
        console.warn(`Team not found: ${teamId}`);
        return null;
      }

      const teamInfo: TeamInfo = {
        id: teamContext.team.id,
        name: teamContext.team.name,
        avatar: undefined, // Nostr teams don't have avatars yet
        memberCount: teamContext.memberCount,
        captainId: teamContext.team.captainId,
        activityType: teamContext.team.activityType,
        location: teamContext.team.location,
      };

      // Cache the result
      this.cacheTeam(teamId, teamInfo);

      return teamInfo;
    } catch (error) {
      console.error('Failed to fetch team info:', error);
      return null;
    }
  }

  // Get user's current team ID
  private async getUserCurrentTeam(userId: string): Promise<string | null> {
    try {
      const membership = await this.teamContextService.getCurrentUserTeam(
        userId
      );

      if (!membership || !membership.hasTeam) {
        return null;
      }

      return membership.teamId || null;
    } catch (error) {
      console.error('Failed to fetch user current team:', error);
      return null;
    }
  }

  // Cache management
  private getCachedTeam(teamId: string): TeamInfo | null {
    const cached = this.teamCache.get(teamId);
    const expiry = this.cacheExpiry.get(teamId);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // Remove expired entry
    if (cached) {
      this.teamCache.delete(teamId);
      this.cacheExpiry.delete(teamId);
    }

    return null;
  }

  private cacheTeam(teamId: string, teamInfo: TeamInfo): void {
    this.teamCache.set(teamId, teamInfo);
    this.cacheExpiry.set(teamId, Date.now() + this.CACHE_DURATION);
  }

  // Clear team cache (useful for testing or when team data changes)
  clearCache(teamId?: string): void {
    if (teamId) {
      this.teamCache.delete(teamId);
      this.cacheExpiry.delete(teamId);
    } else {
      this.teamCache.clear();
      this.cacheExpiry.clear();
    }
  }

  // Bulk team branding for multiple notifications
  async addBulkTeamBranding(
    notifications: Array<{ teamId: string; notification: RichNotificationData }>
  ): Promise<TeamBrandedNotification[]> {
    const results: TeamBrandedNotification[] = [];

    // Process in parallel for efficiency
    const promises = notifications.map(async ({ teamId, notification }) => {
      return await this.addTeamBranding(teamId, notification);
    });

    try {
      const brandedNotifications = await Promise.all(promises);
      results.push(...brandedNotifications);

      analytics.track('notification_scheduled', {
        bulkTeamBranding: true,
        count: notifications.length,
      });
    } catch (error) {
      console.error('Failed to process bulk team branding:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      analytics.track('notification_scheduled', {
        bulkTeamBrandingFailed: true,
        error: errorMessage,
      });

      // Return original notifications on error
      notifications.forEach(({ notification }) => {
        results.push({
          ...notification,
          originalTitle: notification.title,
        });
      });
    }

    return results;
  }

  // Get team branding preview (for UI/testing)
  async getTeamBrandingPreview(
    teamId: string,
    sampleTitle: string
  ): Promise<string> {
    const teamInfo = await this.getTeamInfo(teamId);

    if (!teamInfo) {
      return sampleTitle;
    }

    return this.formatTeamBrandedTitle(teamInfo, sampleTitle);
  }

  // Team statistics for notifications
  async getTeamNotificationStats(teamId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    teamName: string;
  } | null> {
    try {
      const teamInfo = await this.getTeamInfo(teamId);

      if (!teamInfo) {
        return null;
      }

      // For Nostr teams, we'll use total member count as active count
      // In the future, this could be enhanced with activity tracking
      const totalMembers = teamInfo.memberCount || 0;

      return {
        totalMembers,
        activeMembers: totalMembers, // Assume all members are active for now
        teamName: teamInfo.name,
      };
    } catch (error) {
      console.error('Failed to get team notification stats:', error);
      return null;
    }
  }

  // Cleanup method
  cleanup(): void {
    this.teamCache.clear();
    this.cacheExpiry.clear();
    this.teamContextService.cleanup();
  }
}
