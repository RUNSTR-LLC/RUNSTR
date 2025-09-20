import { NostrListService } from '../services/nostr/NostrListService';

export interface NostrEvent {
  id?: string;
  pubkey?: string;
  created_at?: number;
  kind?: number;
  tags?: string[][];
  content?: string;
  sig?: string;
}

/**
 * Utility for detecting and managing kind 30000 member lists for teams
 * Provides simple interface for checking list existence and status
 */
export class TeamListDetector {
  private listService: NostrListService;

  constructor() {
    this.listService = NostrListService.getInstance();
  }

  /**
   * Check if a team has an associated kind 30000 member list
   */
  async hasKind30000List(teamId: string, captainPubkey: string): Promise<boolean> {
    try {
      const dTag = `${teamId}-members`;
      const list = await this.listService.getList(captainPubkey, dTag);
      return !!list;
    } catch (error) {
      console.error(`Error checking kind 30000 list for team ${teamId}:`, error);
      return false;
    }
  }

  /**
   * Get the member list for a team if it exists
   */
  async getTeamMemberList(teamId: string, captainPubkey: string): Promise<NostrEvent | null> {
    try {
      const dTag = `${teamId}-members`;
      return await this.listService.getList(captainPubkey, dTag);
    } catch (error) {
      console.error(`Error fetching member list for team ${teamId}:`, error);
      return null;
    }
  }

  /**
   * Extract member pubkeys from a kind 30000 list
   */
  extractMembers(list: NostrEvent): string[] {
    if (!list || list.kind !== 30000 || !list.tags) {
      return [];
    }

    return list.tags
      .filter((tag: string[]) => tag[0] === 'p')
      .map((tag: string[]) => tag[1])
      .filter(Boolean);
  }

  /**
   * Create the d-tag identifier for a team's member list
   */
  getListDTag(teamId: string): string {
    return `${teamId}-members`;
  }

  /**
   * Prepare tags for a new kind 30000 member list
   */
  prepareListTags(teamId: string, teamName: string, memberPubkeys: string[]): string[][] {
    const tags: string[][] = [
      ['d', this.getListDTag(teamId)],
      ['name', `${teamName} Members`],
      ['description', `Official member list for ${teamName}`],
      ['t', 'team-members'],
      ['t', 'fitness'],
      ['L', 'team-context'],
      ['l', teamId, 'team-context']
    ];

    // Add member pubkeys
    memberPubkeys.forEach(pubkey => {
      if (pubkey) {
        tags.push(['p', pubkey]);
      }
    });

    return tags;
  }
}

// Export singleton instance for consistency
let detectorInstance: TeamListDetector | null = null;

export const getTeamListDetector = (): TeamListDetector => {
  if (!detectorInstance) {
    detectorInstance = new TeamListDetector();
  }
  return detectorInstance;
};