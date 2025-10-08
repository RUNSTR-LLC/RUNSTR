/**
 * TeamMemberCache Service - Efficient caching for kind 30000 team member lists
 * Provides fast member lookups for competitions with real-time sync
 * Handles offline/online transitions gracefully
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NostrListService } from '../nostr/NostrListService';
import type { NostrList } from '../nostr/NostrListService';
import { npubToHex } from '../../utils/ndkConversion';

export interface CachedTeamMembers {
  teamId: string;
  captainPubkey: string;
  members: string[]; // Array of npubs/hex pubkeys
  lastUpdated: number;
  listEventId?: string;
}

export interface MemberCacheStats {
  cacheSize: number;
  teamsCount: number;
  totalMembers: number;
  oldestCache: number;
  newestCache: number;
}

export class TeamMemberCache {
  private static instance: TeamMemberCache;
  private listService: NostrListService;
  private memoryCache: Map<string, CachedTeamMembers> = new Map();
  private subscriptions: Map<string, string> = new Map(); // teamId -> subscriptionId

  // Cache configuration
  private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'runstr:teamMemberCache';
  private readonly MAX_CACHE_SIZE = 50; // Maximum teams to cache

  private constructor() {
    this.listService = NostrListService.getInstance();
    this.loadPersistedCache();
  }

  static getInstance(): TeamMemberCache {
    if (!TeamMemberCache.instance) {
      TeamMemberCache.instance = new TeamMemberCache();
    }
    return TeamMemberCache.instance;
  }

  /**
   * Load persisted cache from AsyncStorage on startup
   */
  private async loadPersistedCache() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const cache = JSON.parse(stored) as CachedTeamMembers[];
        cache.forEach(team => {
          const cacheKey = this.getCacheKey(team.teamId, team.captainPubkey);
          this.memoryCache.set(cacheKey, team);
        });
        console.log(`📦 Loaded ${cache.length} team member caches from storage`);
      }
    } catch (error) {
      console.error('Failed to load persisted cache:', error);
    }
  }

  /**
   * Persist cache to AsyncStorage
   */
  private async persistCache() {
    try {
      const cache = Array.from(this.memoryCache.values());
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  }

  /**
   * Get team members with caching
   */
  async getTeamMembers(teamId: string, captainPubkey: string): Promise<string[]> {
    // Normalize captain pubkey to hex for consistent caching
    let hexCaptainPubkey = captainPubkey;
    if (captainPubkey.startsWith('npub')) {
      const converted = npubToHex(captainPubkey);
      if (converted) {
        hexCaptainPubkey = converted;
        console.log(`🔄 TeamMemberCache: Converted captain npub to hex for caching`);
      } else {
        console.error(`❌ TeamMemberCache: Failed to convert npub to hex, using original`);
        // Continue with original key if conversion fails
      }
    }

    const cacheKey = this.getCacheKey(teamId, hexCaptainPubkey);

    // Check memory cache first
    const cached = this.memoryCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      console.log(`✅ Returning cached members for team ${teamId}`);
      return cached.members;
    }

    // Fetch from Nostr (pass original captainPubkey as NostrListService handles conversion)
    console.log(`🔄 Fetching fresh member list for team ${teamId}`);
    const members = await this.fetchAndCacheMembers(teamId, captainPubkey);

    // Subscribe to updates if not already subscribed
    if (!this.subscriptions.has(teamId)) {
      await this.subscribeToTeamUpdates(teamId, captainPubkey);
    }

    return members;
  }

  /**
   * Fetch members from Nostr and update cache
   */
  private async fetchAndCacheMembers(teamId: string, captainPubkey: string): Promise<string[]> {
    try {
      const memberListDTag = `${teamId}-members`;
      const list = await this.listService.getList(captainPubkey, memberListDTag);

      if (!list) {
        console.log(`⚠️ No member list found for team ${teamId}`);
        return [];
      }

      // Update cache
      const cacheEntry: CachedTeamMembers = {
        teamId,
        captainPubkey,
        members: list.members,
        lastUpdated: Date.now(),
        listEventId: list.nostrEvent.id,
      };

      const cacheKey = this.getCacheKey(teamId, captainPubkey);
      this.memoryCache.set(cacheKey, cacheEntry);

      // Enforce cache size limit
      this.enforceMaxCacheSize();

      // Persist to storage
      await this.persistCache();

      console.log(`✅ Cached ${list.members.length} members for team ${teamId}`);
      return list.members;

    } catch (error) {
      console.error(`Failed to fetch members for team ${teamId}:`, error);
      return [];
    }
  }

  /**
   * Subscribe to real-time team member updates
   */
  private async subscribeToTeamUpdates(teamId: string, captainPubkey: string) {
    try {
      const memberListDTag = `${teamId}-members`;

      const subscriptionId = await this.listService.subscribeToList(
        captainPubkey,
        memberListDTag,
        (updatedList: NostrList) => {
          console.log(`📥 Received member list update for team ${teamId}`);

          // Update cache with new data
          const cacheKey = this.getCacheKey(teamId, captainPubkey);
          const cacheEntry: CachedTeamMembers = {
            teamId,
            captainPubkey,
            members: updatedList.members,
            lastUpdated: Date.now(),
            listEventId: updatedList.nostrEvent.id,
          };

          this.memoryCache.set(cacheKey, cacheEntry);
          this.persistCache();

          console.log(`✅ Updated cache with ${updatedList.members.length} members`);
        }
      );

      this.subscriptions.set(teamId, subscriptionId);
      console.log(`🔔 Subscribed to member updates for team ${teamId}`);

    } catch (error) {
      console.error(`Failed to subscribe to team ${teamId} updates:`, error);
    }
  }

  /**
   * Invalidate cache for a specific team
   */
  invalidateTeam(teamId: string, captainPubkey: string) {
    const cacheKey = this.getCacheKey(teamId, captainPubkey);
    this.memoryCache.delete(cacheKey);
    console.log(`🗑️ Invalidated cache for team ${teamId}`);
  }

  /**
   * Check if a user is a member of a team
   */
  async isMember(teamId: string, captainPubkey: string, userPubkey: string): Promise<boolean> {
    const members = await this.getTeamMembers(teamId, captainPubkey);
    return members.includes(userPubkey);
  }

  /**
   * Manually set team members in cache (used when creating new member lists)
   */
  async setTeamMembers(
    teamId: string,
    captainPubkey: string,
    members: Array<{pubkey: string, npub: string}>
  ): Promise<void> {
    try {
      // Extract just the pubkeys from the member objects
      const memberPubkeys = members.map(m => m.pubkey);

      // Create cache entry
      const cacheEntry: CachedTeamMembers = {
        teamId,
        captainPubkey,
        members: memberPubkeys,
        lastUpdated: Date.now(),
      };

      // Store in memory cache
      const cacheKey = this.getCacheKey(teamId, captainPubkey);
      this.memoryCache.set(cacheKey, cacheEntry);

      // Enforce cache size limit
      this.enforceMaxCacheSize();

      // Persist to storage
      await this.persistCache();

      console.log(`✅ Manually cached ${memberPubkeys.length} members for team ${teamId}`);
    } catch (error) {
      console.error(`Failed to set team members for ${teamId}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): MemberCacheStats {
    const caches = Array.from(this.memoryCache.values());
    const totalMembers = caches.reduce((sum, cache) => sum + cache.members.length, 0);
    const timestamps = caches.map(c => c.lastUpdated);

    return {
      cacheSize: this.memoryCache.size,
      teamsCount: this.memoryCache.size,
      totalMembers,
      oldestCache: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestCache: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }

  /**
   * Clear all caches
   */
  async clearCache() {
    // Unsubscribe from all teams
    for (const [teamId, subscriptionId] of this.subscriptions) {
      this.listService.unsubscribeFromList(subscriptionId);
    }

    this.memoryCache.clear();
    this.subscriptions.clear();
    await AsyncStorage.removeItem(this.STORAGE_KEY);

    console.log('🧹 Cleared all team member caches');
  }

  /**
   * Helper: Generate cache key
   */
  private getCacheKey(teamId: string, captainPubkey: string): string {
    return `${teamId}:${captainPubkey}`;
  }

  /**
   * Helper: Check if cache is still valid
   */
  private isCacheValid(cache: CachedTeamMembers): boolean {
    return Date.now() - cache.lastUpdated < this.CACHE_EXPIRY;
  }

  /**
   * Helper: Enforce maximum cache size by removing oldest entries
   */
  private enforceMaxCacheSize() {
    if (this.memoryCache.size <= this.MAX_CACHE_SIZE) return;

    // Sort by lastUpdated and remove oldest
    const sorted = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);

    const toRemove = sorted.slice(0, this.memoryCache.size - this.MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => {
      this.memoryCache.delete(key);
      console.log(`🗑️ Evicted old cache: ${key}`);
    });
  }

  /**
   * Cleanup (call on app shutdown)
   */
  cleanup() {
    // Unsubscribe from all teams
    for (const subscriptionId of this.subscriptions.values()) {
      this.listService.unsubscribeFromList(subscriptionId);
    }

    this.subscriptions.clear();
    console.log('🧹 Cleaned up all team subscriptions');
  }
}

// Export class as default (not instance) to prevent blocking module initialization
// Also keep named export for compatibility
export default TeamMemberCache;
export { TeamMemberCache };