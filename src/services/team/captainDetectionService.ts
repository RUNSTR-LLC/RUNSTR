/**
 * CaptainDetectionService - Determines if user is captain of teams
 * Uses local CaptainCache (no Nostr relay queries)
 */

import { CaptainCache } from '../../utils/captainCache';

export interface CaptainStatus {
  isCaptain: boolean;
  captainOfTeams: string[];
  lastChecked: number;
}

export class CaptainDetectionService {
  private captainStatusCache: Map<string, CaptainStatus> = new Map();
  private cacheExpiryMs = 5 * 60 * 1000; // 5 minutes cache
  private static instance: CaptainDetectionService;

  constructor() {}

  static getInstance(): CaptainDetectionService {
    if (!CaptainDetectionService.instance) {
      CaptainDetectionService.instance = new CaptainDetectionService();
    }
    return CaptainDetectionService.instance;
  }

  async isCaptainOfAnyTeam(userPubkey: string): Promise<boolean> {
    const status = await this.getCaptainStatus(userPubkey);
    return status.isCaptain;
  }

  async isCaptainOfTeam(userPubkey: string, teamId: string): Promise<boolean> {
    const status = await this.getCaptainStatus(userPubkey);
    return status.captainOfTeams.includes(teamId);
  }

  async getCaptainStatus(userPubkey: string): Promise<CaptainStatus> {
    const cached = this.captainStatusCache.get(userPubkey);
    if (cached && this.isCacheValid(cached.lastChecked)) {
      return cached;
    }

    try {
      const captainTeams = await CaptainCache.getCaptainTeams();
      const status: CaptainStatus = {
        isCaptain: captainTeams.length > 0,
        captainOfTeams: captainTeams,
        lastChecked: Date.now(),
      };
      this.captainStatusCache.set(userPubkey, status);
      return status;
    } catch (error) {
      console.error('Failed to check captain status:', error);
      if (cached) return cached;
      return { isCaptain: false, captainOfTeams: [], lastChecked: Date.now() };
    }
  }

  async getCaptainTeams(_userPubkey: string): Promise<any[]> {
    try {
      const teamIds = await CaptainCache.getCaptainTeams();
      return teamIds.map((id) => ({ id, name: 'Team' }));
    } catch (error) {
      console.error('Failed to get captain teams:', error);
      return [];
    }
  }

  async getPrimaryCaptainTeam(userPubkey: string): Promise<any | null> {
    const captainTeams = await this.getCaptainTeams(userPubkey);
    return captainTeams[0] || null;
  }

  async refreshCaptainStatus(userPubkey: string): Promise<CaptainStatus> {
    this.captainStatusCache.delete(userPubkey);
    return await this.getCaptainStatus(userPubkey);
  }

  private isCacheValid(lastChecked: number): boolean {
    return Date.now() - lastChecked < this.cacheExpiryMs;
  }

  clearCache(): void {
    this.captainStatusCache.clear();
  }
}
