/**
 * TeamContextService - Single source of truth for team context in notifications
 * Bridges user store, Nostr team services, and notification system
 */

import { getNostrTeamService, type NostrTeam } from '../nostr/NostrTeamService';
import { useUserStore } from '../../store/userStore';
import { analytics } from '../../utils/analytics';

export interface TeamContext {
  team: NostrTeam;
  userRole: 'captain' | 'member';
  memberCount: number;
  isActive: boolean;
}

export interface UserTeamMembership {
  hasTeam: boolean;
  teamId?: string;
  teamContext?: TeamContext;
  lastUpdated: number;
}

export class TeamContextService {
  private static instance: TeamContextService;
  private teamContextCache: Map<string, TeamContext> = new Map();
  private userMembershipCache: Map<string, UserTeamMembership> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly USER_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for user membership

  private constructor() {}

  static getInstance(): TeamContextService {
    if (!TeamContextService.instance) {
      TeamContextService.instance = new TeamContextService();
    }
    return TeamContextService.instance;
  }

  /**
   * Get user's current team membership for notifications
   */
  async getCurrentUserTeam(userId: string): Promise<UserTeamMembership | null> {
    try {
      // Check cache first
      const cached = this.getCachedUserMembership(userId);
      if (cached) {
        return cached;
      }

      // Get user's current team from user store
      const userStore = useUserStore.getState();
      const user = userStore.user;

      if (!user || !user.teamId) {
        const noTeamMembership: UserTeamMembership = {
          hasTeam: false,
          lastUpdated: Date.now(),
        };
        this.cacheUserMembership(userId, noTeamMembership);
        return noTeamMembership;
      }

      // Get team context for the user's current team
      const teamContext = await this.getTeamContext(user.teamId, user.id);

      if (!teamContext) {
        console.warn(`Team context not found for team: ${user.teamId}`);
        const noTeamMembership: UserTeamMembership = {
          hasTeam: false,
          lastUpdated: Date.now(),
        };
        this.cacheUserMembership(userId, noTeamMembership);
        return noTeamMembership;
      }

      const membership: UserTeamMembership = {
        hasTeam: true,
        teamId: user.teamId,
        teamContext,
        lastUpdated: Date.now(),
      };

      // Cache the result
      this.cacheUserMembership(userId, membership);

      analytics.track('notification_scheduled', {
        event: 'team_context_resolved',
        userId,
        teamId: user.teamId,
        teamName: teamContext.team.name,
        userRole: teamContext.userRole,
      });

      return membership;
    } catch (error) {
      console.error('Failed to get current user team:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      analytics.track('notification_scheduled', {
        event: 'team_context_failed',
        userId,
        error: errorMessage,
      });
      return null;
    }
  }

  /**
   * Get team context for notifications
   */
  async getTeamContext(
    teamId: string,
    userId?: string
  ): Promise<TeamContext | null> {
    try {
      // Check cache first
      const cacheKey = `${teamId}:${userId || 'anonymous'}`;
      const cached = this.getCachedTeamContext(cacheKey);
      if (cached) {
        return cached;
      }

      const nostrTeamService = getNostrTeamService();

      // Try to find team in cached discovered teams first
      const cachedTeams = nostrTeamService.getCachedTeams();
      let team = cachedTeams.find((t) => t.id === teamId);

      // If not found in cache, discover fresh teams
      if (!team) {
        console.log(`Team ${teamId} not in cache, discovering teams...`);
        const discoveredTeams = await nostrTeamService.discoverFitnessTeams({
          limit: 100,
        });
        team = discoveredTeams.find((t) => t.id === teamId);
      }

      if (!team) {
        console.warn(`Team not found: ${teamId}`);
        return null;
      }

      // Determine user role in team
      let userRole: 'captain' | 'member' = 'member';
      if (userId && team.captainId === userId) {
        userRole = 'captain';
      }

      // Get current member count
      const memberCount = await this.getTeamMemberCount(team);

      const teamContext: TeamContext = {
        team,
        userRole,
        memberCount,
        isActive: team.isPublic, // Use isPublic as proxy for active status
      };

      // Cache the result
      this.cacheTeamContext(cacheKey, teamContext);

      return teamContext;
    } catch (error) {
      console.error('Failed to get team context:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      analytics.track('notification_scheduled', {
        event: 'team_context_lookup_failed',
        teamId,
        userId,
        error: errorMessage,
      });
      return null;
    }
  }

  /**
   * Get team member count using appropriate method
   */
  private async getTeamMemberCount(team: NostrTeam): Promise<number> {
    try {
      const nostrTeamService = getNostrTeamService();

      if (team.hasListSupport && team.memberListId) {
        // Use Nostr list for accurate count
        const members = await nostrTeamService.getTeamMembers(team);
        return members.length;
      } else {
        // Fallback to event-based count
        return team.memberCount;
      }
    } catch (error) {
      console.warn(
        'Failed to get accurate member count, using fallback:',
        error
      );
      return team.memberCount;
    }
  }

  /**
   * Check if user is member of specific team
   */
  async isUserTeamMember(teamId: string, userId: string): Promise<boolean> {
    try {
      const membership = await this.getCurrentUserTeam(userId);

      if (!membership || !membership.hasTeam) {
        return false;
      }

      return membership.teamId === teamId;
    } catch (error) {
      console.error('Failed to check team membership:', error);
      return false;
    }
  }

  /**
   * Get team members for notification targeting
   */
  async getTeamMembers(teamId: string): Promise<string[]> {
    try {
      const teamContext = await this.getTeamContext(teamId);

      if (!teamContext) {
        return [];
      }

      const nostrTeamService = getNostrTeamService();
      const members = await nostrTeamService.getTeamMembers(teamContext.team);

      analytics.track('notification_scheduled', {
        event: 'team_members_retrieved',
        teamId,
        memberCount: members.length,
        teamName: teamContext.team.name,
      });

      return members;
    } catch (error) {
      console.error('Failed to get team members:', error);
      return [];
    }
  }

  /**
   * Refresh team context (useful after team changes)
   */
  async refreshTeamContext(
    teamId: string,
    userId?: string
  ): Promise<TeamContext | null> {
    const cacheKey = `${teamId}:${userId || 'anonymous'}`;

    // Clear cache entries
    this.teamContextCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);

    if (userId) {
      this.userMembershipCache.delete(userId);
      this.cacheExpiry.delete(`user:${userId}`);
    }

    // Get fresh data
    return await this.getTeamContext(teamId, userId);
  }

  /**
   * Bulk get team contexts for multiple teams (for efficient notification processing)
   */
  async getBulkTeamContexts(
    teamIds: string[]
  ): Promise<Map<string, TeamContext>> {
    const contexts = new Map<string, TeamContext>();

    // Process in parallel for efficiency
    const promises = teamIds.map(async (teamId) => {
      const context = await this.getTeamContext(teamId);
      if (context) {
        contexts.set(teamId, context);
      }
      return { teamId, context };
    });

    try {
      await Promise.all(promises);

      analytics.track('notification_scheduled', {
        event: 'bulk_team_contexts_retrieved',
        requestedCount: teamIds.length,
        resolvedCount: contexts.size,
      });
    } catch (error) {
      console.error('Failed to get bulk team contexts:', error);
    }

    return contexts;
  }

  // Cache Management

  private getCachedUserMembership(userId: string): UserTeamMembership | null {
    const cacheKey = `user:${userId}`;
    const cached = this.userMembershipCache.get(userId);
    const expiry = this.cacheExpiry.get(cacheKey);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // Remove expired entry
    if (cached) {
      this.userMembershipCache.delete(userId);
      this.cacheExpiry.delete(cacheKey);
    }

    return null;
  }

  private cacheUserMembership(
    userId: string,
    membership: UserTeamMembership
  ): void {
    const cacheKey = `user:${userId}`;
    this.userMembershipCache.set(userId, membership);
    this.cacheExpiry.set(cacheKey, Date.now() + this.USER_CACHE_DURATION);
  }

  private getCachedTeamContext(cacheKey: string): TeamContext | null {
    const cached = this.teamContextCache.get(cacheKey);
    const expiry = this.cacheExpiry.get(cacheKey);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // Remove expired entry
    if (cached) {
      this.teamContextCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
    }

    return null;
  }

  private cacheTeamContext(cacheKey: string, context: TeamContext): void {
    this.teamContextCache.set(cacheKey, context);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
  }

  /**
   * Clear cache entries (useful for testing or when team data changes)
   */
  clearCache(userId?: string, teamId?: string): void {
    if (userId && teamId) {
      // Clear specific user-team combination
      const cacheKey = `${teamId}:${userId}`;
      this.teamContextCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);

      const userCacheKey = `user:${userId}`;
      this.userMembershipCache.delete(userId);
      this.cacheExpiry.delete(userCacheKey);
    } else if (userId) {
      // Clear all entries for user
      this.userMembershipCache.delete(userId);
      this.cacheExpiry.delete(`user:${userId}`);

      // Clear team contexts that include this user
      for (const [key] of this.teamContextCache) {
        if (key.endsWith(`:${userId}`)) {
          this.teamContextCache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    } else if (teamId) {
      // Clear all entries for team
      for (const [key] of this.teamContextCache) {
        if (key.startsWith(`${teamId}:`)) {
          this.teamContextCache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    } else {
      // Clear everything
      this.teamContextCache.clear();
      this.userMembershipCache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Get cache statistics (for debugging/monitoring)
   */
  getCacheStats(): {
    teamContextCount: number;
    userMembershipCount: number;
    totalCacheEntries: number;
  } {
    return {
      teamContextCount: this.teamContextCache.size,
      userMembershipCount: this.userMembershipCache.size,
      totalCacheEntries: this.cacheExpiry.size,
    };
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    this.clearCache();
  }
}
