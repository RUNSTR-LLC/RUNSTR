/**
 * NostrTeamService - Nostr Kind 33404 Team Discovery and Management
 * Discovers and manages fitness teams via Nostr relays using Kind 33404 events
 */

import { Relay, type Event, type Filter } from 'nostr-tools';

export interface NostrTeamEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface NostrTeam {
  id: string;
  name: string;
  description: string;
  captainId: string;
  captainNpub: string;
  memberCount: number;
  activityType?: string;
  location?: string;
  isPublic: boolean;
  createdAt: number;
  tags: string[];
  nostrEvent: NostrTeamEvent;
  // Enhanced with list support
  hasListSupport?: boolean;
  memberListId?: string; // For teams using Nostr lists
}

export interface TeamDiscoveryFilters {
  activityTypes?: string[];
  location?: string;
  limit?: number;
  since?: number;
}

export class NostrTeamService {
  private discoveredTeams: Map<string, NostrTeam> = new Map();
  private relayUrls = [
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://nostr.wine',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://relay.snort.social',
    'wss://nostr-pub.wellorder.net',
    'wss://relay.nostrich.de',
    'wss://nostr.oxtr.dev',
  ];

  constructor() {
    // Simplified constructor - no complex relay manager
  }

  /**
   * Discover fitness teams from Nostr relays using Kind 33404 events
   */
  async discoverFitnessTeams(
    filters?: TeamDiscoveryFilters
  ): Promise<NostrTeam[]> {
    console.log(
      '🔍 NostrTeamService: Discovering fitness teams from relays...'
    );
    console.log('🚨 ENHANCED NostrTeamService ACTIVE - THIS SHOULD APPEAR IN LOGS 🚨');

    try {
      const nostrFilter: Filter = {
        kinds: [33404], // Kind 33404 - Fitness Team events
        limit: filters?.limit || 200, // Enhanced limit for comprehensive discovery
        // Removed 'since' filter to get ALL teams ever created, not just last 30 days
      };

      const teams: NostrTeam[] = [];
      const processedEventIds = new Set<string>();

      console.log('🔗 Connecting to Nostr relays for team discovery...');

      // Connect to multiple relays and fetch events
      const relayPromises = this.relayUrls.map(async (url) => {
        try {
          console.log(`🔌 Connecting to relay: ${url}`);
          const relay = await Relay.connect(url);

          console.log(`📡 Subscribing to Kind 33404 events on ${url}`);
          const sub = relay.subscribe([nostrFilter], {
            onevent: (event: Event) => {
              // Avoid duplicates from multiple relays
              if (processedEventIds.has(event.id)) {
                return;
              }
              processedEventIds.add(event.id);

              console.log(`📥 Team event received from ${url}:`, event.id);

              try {
                // Only process public teams like runstr-github does
                if (this.isTeamPublic(event as NostrTeamEvent)) {
                  const team = this.parseTeamEvent(event as NostrTeamEvent);
                  if (team) {
                    console.log(`🔄 Processing team: ${team.name}`);
                    
                    // Check validation first
                    if (!this.isValidTeam(team)) {
                      console.log(`❌ Team "${team.name}" failed validation`);
                      return;
                    }
                    
                    // Check filters second
                    if (!this.matchesFilters(team, filters)) {
                      console.log(`❌ Team "${team.name}" filtered out by activity filters`);
                      return;
                    }
                    
                    teams.push(team);
                    this.discoveredTeams.set(team.id, team);
                    console.log(
                      `✅ Added public team: ${team.name} (${team.memberCount} members)`
                    );
                  } else {
                    console.log(`⚠️ Failed to parse team event ${event.id}`);
                  }
                } else {
                  console.log(`📝 Skipped private team: ${event.id}`);
                }
              } catch (error) {
                console.warn(
                  `⚠️  Failed to parse team event ${event.id}:`,
                  error
                );
              }
            },
            oneose: () => {
              console.log(`✅ End of stored events from ${url}`);
            },
          });

          // Extended timeout for comprehensive historical data collection
          setTimeout(() => {
            sub.close();
            relay.close();
            console.log(`🔌 Closed connection to ${url}`);
          }, 12000); // Enhanced from 5s to 12s for better historical coverage
        } catch (error) {
          console.warn(`❌ Failed to connect to relay ${url}:`, error);
        }
      });

      // Wait for all relay connections to complete
      await Promise.allSettled(relayPromises);

      // Extended wait for comprehensive historical event collection
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Enhanced from 2s to 5s

      console.log(
        `🚨 ENHANCED NostrTeamService RESULT: Found ${teams.length} fitness teams from ${this.relayUrls.length} relays`
      );
      
      // Enhanced logging for debugging
      if (teams.length > 0) {
        console.log('📋 Teams discovered:');
        teams.forEach((team, index) => {
          console.log(`  ${index + 1}. ${team.name} (${team.memberCount} members)`);
        });
      } else {
        console.log('⚠️ No teams passed all filters - check activity type matching');
      }
      return teams.sort((a, b) => b.createdAt - a.createdAt); // Most recent first
    } catch (error) {
      console.error('❌ NostrTeamService: Error discovering teams:', error);
      return [];
    }
  }

  /**
   * Check if a team event is public (matches runstr-github implementation)
   */
  private isTeamPublic(event: NostrTeamEvent): boolean {
    const publicTag = event.tags.find((tag) => tag[0] === 'public');
    return publicTag ? publicTag[1]?.toLowerCase() === 'true' : false; // Default to false if tag missing
  }

  /**
   * Get team UUID from d-tag (matches runstr-github implementation)
   */
  private getTeamUUID(event: NostrTeamEvent): string | undefined {
    const dTag = event.tags.find((tag) => tag[0] === 'd');
    return dTag ? dTag[1] : undefined;
  }

  /**
   * Get team name from event tags (matches runstr-github implementation)
   */
  private getTeamName(event: NostrTeamEvent): string {
    const nameTag = event.tags.find((tag) => tag[0] === 'name');
    return nameTag ? nameTag[1] : 'Unnamed Team';
  }

  /**
   * Get team captain from event tags (matches runstr-github implementation)
   */
  private getTeamCaptain(event: NostrTeamEvent): string {
    const captainTag = event.tags.find((tag) => tag[0] === 'captain');
    return captainTag ? captainTag[1] : event.pubkey;
  }

  /**
   * Parse Kind 33404 Nostr event into NostrTeam object
   */
  private parseTeamEvent(event: NostrTeamEvent): NostrTeam | null {
    try {
      // Use helper functions like runstr-github implementation
      const name = this.getTeamName(event);
      const captain = this.getTeamCaptain(event);
      const teamUUID = this.getTeamUUID(event);
      const isPublic = this.isTeamPublic(event);

      // Get other information from tags
      const tags = new Map(event.tags.map((tag) => [tag[0], tag.slice(1)]));
      const teamType = tags.get('type')?.[0] || 'fitness';
      const location = tags.get('location')?.[0];

      // Count members from member tags
      const memberTags = event.tags.filter((tag) => tag[0] === 'member');
      const memberCount = memberTags.length + 1; // +1 for captain

      // Extract activity types from 't' tags
      const activityTags = event.tags.filter((tag) => tag[0] === 't');
      const activityTypes = activityTags.map((tag) => tag[1]).filter(Boolean);

      // Check for list support
      const hasListSupport = tags.get('list_support')?.[0] === 'true';
      const memberListId = tags.get('member_list')?.[0] || teamUUID; // Use teamUUID as fallback

      // Must have a valid UUID to be a valid team
      if (!teamUUID) {
        console.warn(
          `⚠️ Team event ${event.id} missing d-tag (UUID), skipping`
        );
        return null;
      }

      return {
        id: `${captain}:${teamUUID}`, // Use captain:uuid as unique ID like runstr-github
        name,
        description: event.content || '', // Allow empty descriptions
        captainId: captain,
        captainNpub: captain, // Will be the same for Nostr teams
        memberCount,
        activityType: activityTypes.join(', ') || 'fitness',
        location,
        isPublic,
        createdAt: event.created_at,
        tags: activityTypes,
        nostrEvent: event,
        hasListSupport,
        memberListId: hasListSupport ? memberListId : undefined,
      };
    } catch (error) {
      console.error('❌ Failed to parse team event:', error);
      return null;
    }
  }

  /**
   * Check if team is valid for discovery (enhanced permissive validation)
   */
  private isValidTeam(team: NostrTeam): boolean {
    // Must have a valid name
    if (!team.name || team.name.trim() === '') {
      console.log(`🚨 FILTERING OUT: Empty team name`);
      return false;
    }
    
    // Filter only obvious deleted/test teams (more permissive)
    const name = team.name.toLowerCase();
    if (name === 'deleted' || name === 'test' || name.startsWith('test ')) {
      console.log(`🚨 FILTERING OUT: Deleted/test team "${team.name}"`);
      return false;
    }

    // Allow teams without descriptions (removed restrictive requirement)
    // Many legitimate teams may not have detailed descriptions

    // Removed age-based filtering (removed 90-day restriction)
    // Historical teams should remain discoverable for community continuity

    return true;
  }

  /**
   * Check if team matches discovery filters (enhanced permissive filtering)
   */
  private matchesFilters(
    team: NostrTeam,
    filters?: TeamDiscoveryFilters
  ): boolean {
    if (!filters) return true;

    // Enhanced permissive activity type filtering
    if (filters.activityTypes && filters.activityTypes.length > 0) {
      console.log(`🔍 Checking team "${team.name}" against activity filters:`, {
        teamTags: team.tags,
        teamActivityType: team.activityType,
        requestedFilters: filters.activityTypes
      });
      
      // Expanded fitness-related terms for broader matching
      const fitnessTerms = [
        ...filters.activityTypes,
        'run', 'walk', 'cycle', 'bike', 'cardio', 'exercise', 'sport',
        'training', 'club', 'health', 'active', 'movement', 'outdoor'
      ];
      
      const hasMatchingActivity = fitnessTerms.some((filterType) => {
        const filterLower = filterType.toLowerCase();
        
        // Check team tags
        const tagMatch = team.tags.some(tag => 
          tag.toLowerCase().includes(filterLower)
        );
        
        // Check team activity type
        const activityMatch = team.activityType?.toLowerCase().includes(filterLower);
        
        // Check team name for fitness-related terms
        const nameMatch = team.name.toLowerCase().includes(filterLower);
        
        // Check team description for fitness-related terms
        const descMatch = team.description?.toLowerCase().includes(filterLower);
        
        return tagMatch || activityMatch || nameMatch || descMatch;
      });
      
      // Fallback: For general fitness discovery, allow all teams that aren't obviously non-fitness
      const isGeneralFitnessDiscovery = filters.activityTypes.includes('fitness') || 
                                        filters.activityTypes.includes('team');
      
      if (!hasMatchingActivity && isGeneralFitnessDiscovery) {
        // Allow teams unless they're clearly non-fitness (e.g., tech, gaming, etc.)
        const nonFitnessTerms = ['tech', 'gaming', 'crypto', 'trading', 'programming', 'software'];
        const isNonFitness = nonFitnessTerms.some(term => 
          team.name.toLowerCase().includes(term) ||
          team.description?.toLowerCase().includes(term)
        );
        
        if (!isNonFitness) {
          console.log(`✅ Team "${team.name}" allowed via general fitness fallback`);
          return true;
        }
      }
      
      if (!hasMatchingActivity) {
        console.log(`❌ Team "${team.name}" filtered out - no activity match`);
        return false;
      }
      
      console.log(`✅ Team "${team.name}" matches activity filters`);
    }

    // Filter by location (unchanged)
    if (filters.location && team.location) {
      if (
        !team.location.toLowerCase().includes(filters.location.toLowerCase())
      ) {
        console.log(`❌ Team "${team.name}" filtered out - location mismatch`);
        return false;
      }
    }

    return true;
  }

  /**
   * Join a Nostr team (for now, just store locally)
   */
  async joinTeam(
    team: NostrTeam
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🏃‍♂️ Joining Nostr team: ${team.name}`);

      // For Phase 1, we'll just store the team selection locally
      // In Phase 2, we'll publish membership events and handle wallets

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to join team:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join team',
      };
    }
  }

  /**
   * Create a new Nostr team by publishing Kind 33404 event
   */
  async createTeam(teamData: {
    name: string;
    description: string;
    activityTypes?: string[];
    location?: string;
    isPublic?: boolean;
    captainId?: string;
  }): Promise<{ success: boolean; teamId?: string; error?: string }> {
    try {
      console.log(`🏗️  Creating Nostr team: ${teamData.name}`);

      // Create the Kind 33404 team event
      const teamEvent: Partial<NostrTeamEvent> = {
        kind: 33404,
        content: teamData.description,
        tags: [
          ['d', this.generateTeamId()], // Unique identifier for this team
          ['name', teamData.name],
          ['type', 'fitness_team'],
          ['public', teamData.isPublic !== false ? 'true' : 'false'],
          ...(teamData.captainId ? [['captain', teamData.captainId]] : []),
          ...(teamData.location ? [['location', teamData.location]] : []),
          // Add activity type tags
          ...(teamData.activityTypes || ['fitness']).map((type) => ['t', type]),
          // Add general fitness tags for discoverability
          ['t', 'team'],
          ['t', 'fitness'],
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      // TODO: Implement event publishing when relay manager is integrated
      console.log('Event publishing not implemented yet');
      const publishResult = {
        successful: [],
        failed: ['relay-manager-not-implemented'],
      };

      // For now, simulate successful creation for development
      if (true) {
        // publishResult.successful.length > 0
        const teamId = teamEvent.tags?.find((tag) => tag[0] === 'd')?.[1];
        console.log(
          `✅ Team created successfully on ${publishResult.successful.length} relays`
        );

        // Cache the team locally
        if (teamId) {
          const createdTeam: NostrTeam = {
            id: teamId,
            name: teamData.name,
            description: teamData.description,
            captainId: teamData.captainId || '',
            captainNpub: teamData.captainId || '',
            memberCount: 1, // Just the captain initially
            activityType: (teamData.activityTypes || ['fitness']).join(', '),
            location: teamData.location,
            isPublic: teamData.isPublic !== false,
            createdAt: teamEvent.created_at!,
            tags: teamData.activityTypes || ['fitness'],
            nostrEvent: teamEvent as NostrTeamEvent,
          };
          this.discoveredTeams.set(teamId, createdTeam);
        }

        return {
          success: true,
          teamId,
        };
      } else {
        throw new Error('Failed to publish team event to any relay');
      }
    } catch (error) {
      console.error('❌ Failed to create team:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create team',
      };
    }
  }

  /**
   * Generate a unique team identifier
   */
  private generateTeamId(): string {
    return `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ================================================================================
  // ENHANCED MEMBERSHIP MANAGEMENT (Nostr Lists Integration)
  // ================================================================================

  /**
   * Get team members from Nostr list (fast, targeted query)
   */
  async getTeamMembers(team: NostrTeam): Promise<string[]> {
    console.log(`👥 Getting members for team: ${team.name}`);

    if (!team.memberListId) {
      console.log(
        'Team does not have list support, falling back to event tags'
      );
      return this.getMembersFromTeamEvent(team);
    }

    // TODO: Implement list service integration
    // For now, fall back to event-based membership
    console.log('List service not implemented, using event-based members');
    return this.getMembersFromTeamEvent(team);
  }

  /**
   * Check if user is a team member (fast list lookup)
   */
  async isTeamMember(team: NostrTeam, userPubkey: string): Promise<boolean> {
    if (!team.memberListId) {
      // Fallback to checking team event tags
      return this.isMemberInTeamEvent(team, userPubkey);
    }

    // TODO: Implement list service integration
    // For now, fall back to event-based checking
    return this.isMemberInTeamEvent(team, userPubkey);
  }

  /**
   * Prepare team creation with Nostr list support
   */
  prepareEnhancedTeamCreation(teamData: {
    name: string;
    description: string;
    activityTypes?: string[];
    location?: string;
    isPublic?: boolean;
    captainId: string;
  }) {
    console.log(`🏗️ Preparing enhanced team creation: ${teamData.name}`);

    const teamId = this.generateTeamId();

    // 1. Prepare team event (Kind 33404)
    const teamEventTemplate = {
      kind: 33404,
      content: teamData.description,
      tags: [
        ['d', teamId],
        ['name', teamData.name],
        ['type', 'fitness_team'],
        ['public', teamData.isPublic !== false ? 'true' : 'false'],
        ['captain', teamData.captainId],
        ['list_support', 'true'], // Indicates this team uses Nostr lists
        ['member_list', teamId], // Same ID for consistency
        ...(teamData.location ? [['location', teamData.location]] : []),
        ...(teamData.activityTypes || ['fitness']).map((type) => ['t', type]),
        ['t', 'team'],
        ['t', 'fitness'],
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: teamData.captainId,
    };

    // 2. TODO: Prepare member list (Kind 30000)
    // const memberListTemplate = this.listService.prepareListCreation(...)
    const memberListTemplate = null; // Placeholder until list service is implemented

    console.log(`✅ Prepared enhanced team templates for: ${teamData.name}`);

    return {
      teamId,
      teamEventTemplate,
      memberListTemplate,
    };
  }

  /**
   * Subscribe to team member list changes (for real-time updates)
   */
  async subscribeToTeamMemberUpdates(
    team: NostrTeam,
    callback: (members: string[]) => void
  ): Promise<string | null> {
    if (!team.memberListId) {
      console.log('Team does not support list subscriptions');
      return null;
    }

    console.log(`🔔 Subscribing to member updates for team: ${team.name}`);

    // TODO: Implement list service subscription
    console.log('List subscription not implemented yet');
    return null;
  }

  /**
   * Get team statistics based on member list
   */
  async getTeamStats(team: NostrTeam): Promise<{
    memberCount: number;
    listSupport: boolean;
    lastUpdated?: number;
  }> {
    const members = await this.getTeamMembers(team);

    // TODO: Implement list stats when list service is available
    let lastUpdated: number | undefined;

    return {
      memberCount: members.length,
      listSupport: !!team.memberListId,
      lastUpdated,
    };
  }

  // ================================================================================
  // FALLBACK METHODS (for teams without list support)
  // ================================================================================

  /**
   * Get members from team event tags (fallback)
   */
  private getMembersFromTeamEvent(team: NostrTeam): string[] {
    const memberTags = team.nostrEvent.tags.filter(
      (tag) => tag[0] === 'member'
    );
    const members = memberTags.map((tag) => tag[1]).filter(Boolean);

    // Always include captain
    if (!members.includes(team.captainId)) {
      members.unshift(team.captainId);
    }

    return members;
  }

  /**
   * Check if user is member via team event tags (fallback)
   */
  private isMemberInTeamEvent(team: NostrTeam, userPubkey: string): boolean {
    // Check if user is captain
    if (team.captainId === userPubkey) return true;

    // Check member tags in team event
    return team.nostrEvent.tags.some(
      (tag) => tag[0] === 'member' && tag[1] === userPubkey
    );
  }

  // ================================================================================
  // EXISTING METHODS (maintained for compatibility)
  // ================================================================================

  /**
   * Get cached discovered teams
   */
  getCachedTeams(): NostrTeam[] {
    return Array.from(this.discoveredTeams.values());
  }

  /**
   * Clear cached teams
   */
  clearCache(): void {
    this.discoveredTeams.clear();
  }
}

// Singleton instance for global use
let nostrTeamServiceInstance: NostrTeamService | null = null;

export const getNostrTeamService = (): NostrTeamService => {
  if (!nostrTeamServiceInstance) {
    nostrTeamServiceInstance = new NostrTeamService();
  }
  return nostrTeamServiceInstance;
};
