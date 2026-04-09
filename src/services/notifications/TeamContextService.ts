/**
 * TeamContextService - Single source of truth for team context in notifications
 * Uses Supabase clubs (no Nostr relay queries)
 */

import { useUserStore } from '../../store/userStore';
import { ClubMembershipService } from '../backend/ClubMembershipService';

interface TeamInfo {
  id: string;
  name: string;
  [key: string]: any;
}

export interface TeamContext {
  team: TeamInfo;
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
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  private constructor() {}

  static getInstance(): TeamContextService {
    if (!TeamContextService.instance) {
      TeamContextService.instance = new TeamContextService();
    }
    return TeamContextService.instance;
  }

  async getCurrentUserTeam(userId: string): Promise<UserTeamMembership | null> {
    try {
      const cached = this.userMembershipCache.get(userId);
      if (cached && Date.now() - cached.lastUpdated < this.CACHE_DURATION) {
        return cached;
      }

      const userStore = useUserStore.getState();
      const user = userStore.user;

      if (!user || !user.teamId) {
        const noTeam: UserTeamMembership = { hasTeam: false, lastUpdated: Date.now() };
        this.userMembershipCache.set(userId, noTeam);
        return noTeam;
      }

      const membership: UserTeamMembership = {
        hasTeam: true,
        teamId: user.teamId,
        lastUpdated: Date.now(),
      };
      this.userMembershipCache.set(userId, membership);
      return membership;
    } catch (error) {
      console.error('Failed to get current user team:', error);
      return null;
    }
  }

  async getTeamContext(teamId: string, _userId?: string): Promise<TeamContext | null> {
    const cacheKey = `${teamId}`;
    const cached = this.teamContextCache.get(cacheKey);
    if (cached) return cached;
    // Team context now resolved via Supabase clubs
    return null;
  }

  async isUserTeamMember(teamId: string, userId: string): Promise<boolean> {
    const membership = await this.getCurrentUserTeam(userId);
    return membership?.teamId === teamId;
  }

  async getTeamMembers(teamId: string): Promise<string[]> {
    try {
      const members = await ClubMembershipService.getClubMembers(teamId);
      return members.map((m) => m.member_npub);
    } catch (error) {
      console.error('Failed to get team members:', error);
      return [];
    }
  }

  async refreshTeamContext(teamId: string, userId?: string): Promise<TeamContext | null> {
    this.teamContextCache.delete(teamId);
    if (userId) this.userMembershipCache.delete(userId);
    return this.getTeamContext(teamId, userId);
  }

  clearCache(): void {
    this.teamContextCache.clear();
    this.userMembershipCache.clear();
  }
}
