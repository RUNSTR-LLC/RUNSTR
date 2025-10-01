/**
 * NostrCompetitionDiscoveryService
 * Discovers all competitions (teams, leagues, events, challenges) a user is participating in
 * by querying kind 30000 lists containing their pubkey
 */

import { nostrRelayManager } from '../nostr/NostrRelayManager';
import type { NostrRelayManager } from '../nostr/NostrRelayManager';
import type { NostrFilter } from '../nostr/NostrProtocolHandler';
import type { NostrList, Event } from '../nostr/NostrListService';
import type { UserCompetition } from '../../types/challenge';
import { npubToHex } from '../../utils/ndkConversion';
import { appCache } from '../../utils/cache';

export class NostrCompetitionDiscoveryService {
  private relayManager: NostrRelayManager;
  private static instance: NostrCompetitionDiscoveryService;
  private discoveryCache: Map<string, UserCompetition[]> = new Map();

  constructor(relayManager?: NostrRelayManager) {
    this.relayManager = relayManager || nostrRelayManager;
  }

  static getInstance(): NostrCompetitionDiscoveryService {
    if (!NostrCompetitionDiscoveryService.instance) {
      NostrCompetitionDiscoveryService.instance = new NostrCompetitionDiscoveryService();
    }
    return NostrCompetitionDiscoveryService.instance;
  }

  /**
   * Get all competitions (teams, leagues, events, challenges) for a user
   */
  async getUserCompetitions(userPubkey: string): Promise<UserCompetition[]> {
    console.log(`🔍 Discovering competitions for user: ${userPubkey.slice(0, 20)}...`);

    // Convert npub to hex if needed
    let hexPubkey = userPubkey;
    if (userPubkey.startsWith('npub')) {
      const converted = npubToHex(userPubkey);
      if (!converted) {
        console.error('Failed to convert npub to hex');
        return [];
      }
      hexPubkey = converted;
    }

    // Check cache first
    const cacheKey = `competitions_${hexPubkey}`;
    const cached = await appCache.get<UserCompetition[]>(cacheKey);
    if (cached) {
      console.log(`💾 Found ${cached.length} cached competitions`);
      return cached;
    }

    try {
      // Query all kind 30000 lists where user is a member
      const filters: NostrFilter[] = [
        {
          kinds: [30000],
          '#p': [hexPubkey],
          limit: 500
        }
      ];

      const competitions: UserCompetition[] = [];
      const processedIds = new Set<string>();

      const subscriptionId = await this.relayManager.subscribeToEvents(
        filters,
        (event: Event, relayUrl: string) => {
          try {
            const competition = this.parseListToCompetition(event, hexPubkey);
            if (competition && !processedIds.has(competition.id)) {
              processedIds.add(competition.id);
              competitions.push(competition);
              console.log(`✅ Found competition: ${competition.name} (${competition.type})`);
            }
          } catch (error) {
            console.warn(`Failed to parse competition from event ${event.id}:`, error);
          }
        }
      );

      // Wait for results
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Unsubscribe
      this.relayManager.unsubscribe(subscriptionId);

      // Sort competitions by status and start date
      competitions.sort((a, b) => {
        const statusOrder = { active: 0, upcoming: 1, completed: 2 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;

        // Sort by start date within same status
        return (b.startsAt || 0) - (a.startsAt || 0);
      });

      // Cache for 5 minutes
      await appCache.set(cacheKey, competitions, 5 * 60 * 1000);
      this.discoveryCache.set(hexPubkey, competitions);

      console.log(`📊 Discovered ${competitions.length} total competitions`);
      return competitions;
    } catch (error) {
      console.error('Error discovering competitions:', error);
      return [];
    }
  }

  /**
   * Parse a kind 30000 list event into a UserCompetition if it's fitness-related
   */
  private parseListToCompetition(event: Event, userHexPubkey: string): UserCompetition | null {
    if (!event.tags) return null;

    // Extract tags
    const tags = new Map(event.tags.map(t => [t[0], t[1]]));
    const dTag = tags.get('d') || '';
    const name = tags.get('name') || 'Unnamed Competition';
    const tTags = event.tags.filter(t => t[0] === 't').map(t => t[1]);

    // Determine competition type from d-tag prefix or t-tags
    let type: UserCompetition['type'] | null = null;

    if (dTag.startsWith('team-') || dTag.startsWith('team_')) {
      type = 'team';
    } else if (dTag.startsWith('league-') || dTag.startsWith('league_')) {
      type = 'league';
    } else if (dTag.startsWith('event-') || dTag.startsWith('event_')) {
      type = 'event';
    } else if (dTag.startsWith('challenge-') || dTag.startsWith('challenge_')) {
      type = 'challenge';
    } else if (tTags.includes('team')) {
      type = 'team';
    } else if (tTags.includes('league')) {
      type = 'league';
    } else if (tTags.includes('event')) {
      type = 'event';
    } else if (tTags.includes('challenge')) {
      type = 'challenge';
    }

    // Skip if not a recognized competition type
    if (!type) return null;

    // Skip if not fitness-related (check for fitness tags)
    const isFitness = tTags.some(tag =>
      ['fitness', 'running', 'cycling', 'walking', 'hiking', 'swimming', 'rowing', 'workout', 'competition'].includes(tag)
    );
    if (!isFitness && !dTag.includes('team')) return null; // Teams might not have fitness tags

    // Get participant count
    const participants = event.tags.filter(t => t[0] === 'p').map(t => t[1]);
    const participantCount = participants.length;

    // Determine user's role
    let yourRole: UserCompetition['yourRole'] = 'member';
    if (event.pubkey === userHexPubkey) {
      yourRole = 'captain'; // User created this competition
    } else if (type === 'challenge') {
      // For challenges, check if user is challenger or challenged
      if (participants[0] === userHexPubkey) {
        yourRole = 'challenger';
      } else {
        yourRole = 'challenged';
      }
    }

    // Get status
    const statusTag = tags.get('status');
    const now = Date.now() / 1000;
    const startsAt = parseInt(tags.get('starts') || '0');
    const expiresAt = parseInt(tags.get('expires') || tags.get('ends') || '0');

    let status: UserCompetition['status'] = 'active';
    if (statusTag === 'completed' || (expiresAt && expiresAt < now)) {
      status = 'completed';
    } else if (statusTag === 'upcoming' || (startsAt && startsAt > now)) {
      status = 'upcoming';
    } else if (statusTag === 'pending' && type === 'challenge') {
      status = 'upcoming'; // Pending challenges show as upcoming
    }

    // Get financial info
    const wager = type === 'challenge' ? parseInt(tags.get('wager') || '0') : undefined;
    const prizePool = ['league', 'event'].includes(type) ? parseInt(tags.get('prize_pool') || '0') : undefined;

    return {
      id: event.id || dTag,
      name,
      type,
      status,
      participantCount,
      yourRole,
      startsAt: startsAt || event.created_at,
      endsAt: expiresAt,
      wager,
      prizePool
    };
  }

  /**
   * Get competitions by type
   */
  async getUserCompetitionsByType(
    userPubkey: string,
    type: UserCompetition['type']
  ): Promise<UserCompetition[]> {
    const allCompetitions = await this.getUserCompetitions(userPubkey);
    return allCompetitions.filter(c => c.type === type);
  }

  /**
   * Get active competitions only
   */
  async getActiveCompetitions(userPubkey: string): Promise<UserCompetition[]> {
    const allCompetitions = await this.getUserCompetitions(userPubkey);
    return allCompetitions.filter(c => c.status === 'active');
  }

  /**
   * Get competition count for quick display
   */
  async getCompetitionCount(userPubkey: string): Promise<number> {
    const competitions = await this.getUserCompetitions(userPubkey);
    return competitions.filter(c => c.status !== 'completed').length;
  }

  /**
   * Clear cache
   */
  clearCache(userPubkey?: string): void {
    if (userPubkey) {
      let hexPubkey = userPubkey;
      if (userPubkey.startsWith('npub')) {
        const converted = npubToHex(userPubkey);
        if (converted) hexPubkey = converted;
      }
      this.discoveryCache.delete(hexPubkey);
      appCache.remove(`competitions_${hexPubkey}`);
    } else {
      this.discoveryCache.clear();
    }
    console.log('🧹 Cleared competition discovery cache');
  }
}

export default NostrCompetitionDiscoveryService.getInstance();