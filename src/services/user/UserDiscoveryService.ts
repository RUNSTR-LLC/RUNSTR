/**
 * UserDiscoveryService - Global Nostr user discovery for 1v1 challenges
 * Searches any Nostr user by name, npub, or NIP-05 identifier across all relays
 * Implements caching and activity filtering for optimal performance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { nostrRelayManager } from '../nostr/NostrRelayManager';
import { nostrProfileService, type NostrProfile } from '../nostr/NostrProfileService';
import { nip19 } from 'nostr-tools';
import type { Event } from 'nostr-tools';

export interface DiscoveredNostrUser {
  pubkey: string;
  npub: string;
  name?: string;
  displayName?: string;
  nip05?: string;
  picture?: string;
  about?: string;
  lastActivity?: Date;
  activityStatus: 'active' | 'inactive' | 'new';
}

export interface UserSearchResult {
  users: DiscoveredNostrUser[];
  query: string;
  totalFound: number;
  searchTime: number;
}

interface RecentChallenger {
  pubkey: string;
  npub: string;
  lastChallengedAt: number;
  challengeCount: number;
}

interface SearchCacheEntry {
  query: string;
  results: DiscoveredNostrUser[];
  timestamp: number;
  ttl: number;
}

export class UserDiscoveryService {
  private searchCache: Map<string, SearchCacheEntry> = new Map();
  private recentChallengers: RecentChallenger[] = [];
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly SEARCH_TIMEOUT = 10000; // 10 seconds
  private readonly ACTIVITY_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly STORAGE_KEY_RECENT = '@runstr:recent_challengers';
  private pendingSearches: Map<string, Promise<UserSearchResult>> = new Map();

  constructor() {
    this.loadRecentChallengers();
  }

  /**
   * Load recent challengers from AsyncStorage
   */
  private async loadRecentChallengers(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY_RECENT);
      if (stored) {
        this.recentChallengers = JSON.parse(stored);
        console.log(`Loaded ${this.recentChallengers.length} recent challengers`);
      }
    } catch (error) {
      console.error('Failed to load recent challengers:', error);
    }
  }

  /**
   * Save recent challengers to AsyncStorage
   */
  private async saveRecentChallengers(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY_RECENT,
        JSON.stringify(this.recentChallengers)
      );
    } catch (error) {
      console.error('Failed to save recent challengers:', error);
    }
  }

  /**
   * Convert npub to hex pubkey
   */
  private npubToHex(npub: string): string {
    try {
      if (npub.length === 64 && /^[a-f0-9]+$/i.test(npub)) {
        return npub;
      }

      if (npub.startsWith('npub1')) {
        const decoded = nip19.decode(npub);
        if (decoded.type === 'npub') {
          return decoded.data;
        }
      }

      throw new Error('Invalid npub format');
    } catch (error) {
      console.error('Failed to convert npub to hex:', error);
      return npub;
    }
  }

  /**
   * Convert hex pubkey to npub
   */
  private hexToNpub(hex: string): string {
    try {
      if (hex.startsWith('npub1')) {
        return hex;
      }

      if (hex.length === 64 && /^[a-f0-9]+$/i.test(hex)) {
        return nip19.npubEncode(hex);
      }

      throw new Error('Invalid hex pubkey format');
    } catch (error) {
      console.error('Failed to convert hex to npub:', error);
      return hex;
    }
  }

  /**
   * Check if user is active based on recent activity
   */
  private async checkUserActivity(pubkey: string): Promise<'active' | 'inactive' | 'new'> {
    try {
      const recentEvents = await nostrRelayManager.queryWorkoutEvents(pubkey, {
        since: Math.floor((Date.now() - this.ACTIVITY_THRESHOLD) / 1000),
        limit: 1,
      });

      if (recentEvents.length > 0) {
        return 'active';
      }

      const anyEvents = await nostrRelayManager.queryWorkoutEvents(pubkey, {
        limit: 1,
      });

      return anyEvents.length > 0 ? 'inactive' : 'new';
    } catch (error) {
      console.error('Failed to check user activity:', error);
      return 'new';
    }
  }

  /**
   * Convert NostrProfile to DiscoveredNostrUser
   */
  private async profileToDiscoveredUser(
    profile: NostrProfile
  ): Promise<DiscoveredNostrUser> {
    const activityStatus = await this.checkUserActivity(profile.pubkey);

    return {
      pubkey: profile.pubkey,
      npub: profile.npub,
      name: profile.name,
      displayName: profile.display_name,
      nip05: profile.nip05,
      picture: profile.picture,
      about: profile.about,
      lastActivity: profile.lastUpdated,
      activityStatus,
    };
  }

  /**
   * Search users by display name or name
   */
  private async searchByName(query: string): Promise<DiscoveredNostrUser[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const discoveredUsers: DiscoveredNostrUser[] = [];
    const seenPubkeys = new Set<string>();

    try {
      if (!nostrRelayManager.hasConnectedRelays()) {
        console.warn('No connected relays available for user search');
        return [];
      }

      const filter = {
        kinds: [0],
        limit: 50,
      };

      const events: Event[] = [];
      const searchPromise = new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), this.SEARCH_TIMEOUT);

        nostrRelayManager
          .subscribeToEvents([filter], (event: Event) => {
            if (!events.some((e) => e.id === event.id)) {
              events.push(event);
            }
          })
          .then((subId) => {
            setTimeout(() => {
              clearTimeout(timeout);
              nostrRelayManager.unsubscribe(subId);
              resolve();
            }, 5000);
          })
          .catch(() => resolve());
      });

      await searchPromise;

      for (const event of events) {
        if (seenPubkeys.has(event.pubkey)) continue;

        try {
          const profile = await nostrProfileService.getProfile(event.pubkey);
          if (!profile) continue;

          const nameMatch =
            profile.name?.toLowerCase().includes(normalizedQuery) ||
            profile.display_name?.toLowerCase().includes(normalizedQuery) ||
            profile.nip05?.toLowerCase().includes(normalizedQuery);

          if (nameMatch) {
            seenPubkeys.add(event.pubkey);
            const discoveredUser = await this.profileToDiscoveredUser(profile);
            discoveredUsers.push(discoveredUser);
          }
        } catch (error) {
          console.error('Failed to process profile event:', error);
        }
      }
    } catch (error) {
      console.error('Error searching by name:', error);
    }

    return discoveredUsers;
  }

  /**
   * Search user by npub or hex pubkey
   */
  private async searchByPubkey(identifier: string): Promise<DiscoveredNostrUser | null> {
    try {
      const pubkey = this.npubToHex(identifier);
      const profile = await nostrProfileService.getProfile(pubkey);

      if (!profile) {
        return null;
      }

      return await this.profileToDiscoveredUser(profile);
    } catch (error) {
      console.error('Error searching by pubkey:', error);
      return null;
    }
  }

  /**
   * Get cached search results
   */
  private getCachedSearch(query: string): DiscoveredNostrUser[] | null {
    const cacheEntry = this.searchCache.get(query.toLowerCase());

    if (!cacheEntry) return null;

    const now = Date.now();
    const isExpired = now - cacheEntry.timestamp > cacheEntry.ttl;

    if (isExpired) {
      this.searchCache.delete(query.toLowerCase());
      return null;
    }

    return cacheEntry.results;
  }

  /**
   * Cache search results
   */
  private cacheSearch(query: string, results: DiscoveredNostrUser[]): void {
    const cacheEntry: SearchCacheEntry = {
      query: query.toLowerCase(),
      results,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
    };

    this.searchCache.set(query.toLowerCase(), cacheEntry);
  }

  /**
   * Search for Nostr users globally
   */
  async searchUsers(query: string): Promise<UserSearchResult> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || trimmedQuery.length < 2) {
      return {
        users: [],
        query: trimmedQuery,
        totalFound: 0,
        searchTime: 0,
      };
    }

    const pendingSearch = this.pendingSearches.get(trimmedQuery.toLowerCase());
    if (pendingSearch) {
      console.log('Search already in progress, returning pending result');
      return await pendingSearch;
    }

    const cached = this.getCachedSearch(trimmedQuery);
    if (cached) {
      console.log(`Returning ${cached.length} cached search results`);
      return {
        users: cached,
        query: trimmedQuery,
        totalFound: cached.length,
        searchTime: 0,
      };
    }

    const searchPromise = this.performSearch(trimmedQuery);
    this.pendingSearches.set(trimmedQuery.toLowerCase(), searchPromise);

    try {
      const result = await searchPromise;
      this.cacheSearch(trimmedQuery, result.users);
      return result;
    } finally {
      this.pendingSearches.delete(trimmedQuery.toLowerCase());
    }
  }

  /**
   * Perform actual search
   */
  private async performSearch(query: string): Promise<UserSearchResult> {
    const startTime = Date.now();
    const users: DiscoveredNostrUser[] = [];
    const seenPubkeys = new Set<string>();

    if (query.startsWith('npub1') || (query.length === 64 && /^[a-f0-9]+$/i.test(query))) {
      const user = await this.searchByPubkey(query);
      if (user) {
        users.push(user);
        seenPubkeys.add(user.pubkey);
      }
    } else {
      const nameResults = await this.searchByName(query);
      for (const user of nameResults) {
        if (!seenPubkeys.has(user.pubkey)) {
          users.push(user);
          seenPubkeys.add(user.pubkey);
        }
      }
    }

    const searchTime = Date.now() - startTime;

    console.log(`Search completed in ${searchTime}ms, found ${users.length} users`);

    return {
      users,
      query,
      totalFound: users.length,
      searchTime,
    };
  }

  /**
   * Get recent challengers list
   */
  async getRecentChallengers(): Promise<DiscoveredNostrUser[]> {
    const users: DiscoveredNostrUser[] = [];

    for (const challenger of this.recentChallengers.slice(0, 10)) {
      try {
        const profile = await nostrProfileService.getProfile(challenger.pubkey);
        if (profile) {
          const user = await this.profileToDiscoveredUser(profile);
          users.push(user);
        }
      } catch (error) {
        console.error('Failed to load recent challenger:', error);
      }
    }

    return users;
  }

  /**
   * Add user to recent challengers
   */
  async addRecentChallenger(pubkey: string): Promise<void> {
    const npub = this.hexToNpub(pubkey);
    const existingIndex = this.recentChallengers.findIndex((c) => c.pubkey === pubkey);

    if (existingIndex >= 0) {
      const existing = this.recentChallengers[existingIndex];
      existing.lastChallengedAt = Date.now();
      existing.challengeCount++;
      this.recentChallengers.splice(existingIndex, 1);
      this.recentChallengers.unshift(existing);
    } else {
      this.recentChallengers.unshift({
        pubkey,
        npub,
        lastChallengedAt: Date.now(),
        challengeCount: 1,
      });
    }

    this.recentChallengers = this.recentChallengers.slice(0, 20);

    await this.saveRecentChallengers();
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    this.pendingSearches.clear();
    console.log('User discovery cache cleared');
  }
}

export const userDiscoveryService = new UserDiscoveryService();
