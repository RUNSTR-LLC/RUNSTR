/**
 * NostrProfileService - Fetches and manages user profiles from Nostr kind 0 events
 * Handles profile caching, automatic refresh, and data parsing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalNDKService } from './GlobalNDKService';
import type { NDKFilter, NDKEvent } from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';
import type { Event } from 'nostr-tools';

export interface NostrProfile {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string; // Lightning address
  lud06?: string; // Legacy lightning URL
  website?: string;
  pubkey: string;
  npub: string;
  lastUpdated: Date;
  source: string; // Which relay provided this data
}

export interface ProfileCacheEntry {
  profile: NostrProfile;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class NostrProfileService {
  private cache: Map<string, ProfileCacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<NostrProfile | null>> =
    new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly STORAGE_KEY = '@runstr:nostr_profiles';

  constructor() {
    this.loadCacheFromStorage();
  }

  /**
   * Load profile cache from async storage
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const storedCache = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedCache) {
        const parsed = JSON.parse(storedCache);
        const now = Date.now();

        // Filter out expired entries
        Object.entries(parsed).forEach(([pubkey, entry]: [string, any]) => {
          if (now - entry.timestamp < entry.ttl) {
            this.cache.set(pubkey, {
              profile: {
                ...entry.profile,
                lastUpdated: new Date(entry.profile.lastUpdated),
              },
              timestamp: entry.timestamp,
              ttl: entry.ttl,
            });
          }
        });

        console.log(`📄 Loaded ${this.cache.size} profiles from cache`);
      }
    } catch (error) {
      console.error('❌ Failed to load profile cache:', error);
    }
  }

  /**
   * Save profile cache to async storage
   */
  private async saveCacheToStorage(): Promise<void> {
    try {
      const cacheObject: { [key: string]: ProfileCacheEntry } = {};

      this.cache.forEach((entry, pubkey) => {
        cacheObject[pubkey] = entry;
      });

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('❌ Failed to save profile cache:', error);
    }
  }

  /**
   * Convert npub to hex pubkey
   */
  private npubToHex(npub: string): string {
    try {
      // If already hex, return as is
      if (npub.length === 64 && /^[a-f0-9]+$/i.test(npub)) {
        return npub;
      }

      // If npub format, decode to hex
      if (npub.startsWith('npub1')) {
        const decoded = nip19.decode(npub);
        if (decoded.type === 'npub') {
          return decoded.data;
        }
      }

      throw new Error('Invalid npub format');
    } catch (error) {
      console.error('Failed to convert npub to hex:', error);
      return npub; // Fallback to input
    }
  }

  /**
   * Convert hex pubkey to npub
   */
  private hexToNpub(hex: string): string {
    try {
      // If already npub format, return as is
      if (hex.startsWith('npub1')) {
        return hex;
      }

      // Convert hex to npub
      if (hex.length === 64 && /^[a-f0-9]+$/i.test(hex)) {
        return nip19.npubEncode(hex);
      }

      throw new Error('Invalid hex pubkey format');
    } catch (error) {
      console.error('Failed to convert hex to npub:', error);
      return hex; // Fallback to input
    }
  }

  /**
   * Parse profile metadata from kind 0 event content
   */
  private parseProfileContent(content: string): Partial<NostrProfile> {
    try {
      const parsed = JSON.parse(content);

      // Extract and clean profile fields
      const profile: Partial<NostrProfile> = {};

      if (parsed.name) profile.name = parsed.name.trim();
      if (parsed.display_name)
        profile.display_name = parsed.display_name.trim();
      if (parsed.displayName) profile.display_name = parsed.displayName.trim(); // Alternative field name
      if (parsed.about) profile.about = parsed.about.trim();
      if (parsed.picture) profile.picture = parsed.picture.trim();
      if (parsed.banner) profile.banner = parsed.banner.trim();
      if (parsed.nip05) profile.nip05 = parsed.nip05.trim();
      if (parsed.lud16) profile.lud16 = parsed.lud16.trim();
      if (parsed.lud06) profile.lud06 = parsed.lud06.trim();
      if (parsed.website) profile.website = parsed.website.trim();

      return profile;
    } catch (error) {
      console.error('❌ Failed to parse profile content:', error);
      return {};
    }
  }

  /**
   * Get profile from cache
   */
  private getCachedProfile(pubkey: string): NostrProfile | null {
    const cacheEntry = this.cache.get(pubkey);

    if (!cacheEntry) return null;

    const now = Date.now();
    const isExpired = now - cacheEntry.timestamp > cacheEntry.ttl;

    if (isExpired) {
      this.cache.delete(pubkey);
      return null;
    }

    return cacheEntry.profile;
  }

  /**
   * Cache profile data
   */
  private cacheProfile(profile: NostrProfile): void {
    const cacheEntry: ProfileCacheEntry = {
      profile,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
    };

    this.cache.set(profile.pubkey, cacheEntry);

    // Save to storage (fire and forget)
    this.saveCacheToStorage().catch((error) => {
      console.error('❌ Failed to save profile to storage:', error);
    });
  }

  /**
   * Fetch profile from Nostr relays
   */
  private async fetchProfileFromRelays(
    pubkey: string
  ): Promise<NostrProfile | null> {
    console.log(`🔍 Fetching profile for pubkey: ${pubkey.slice(0, 20)}...`);

    try {
      // Get GlobalNDK instance
      const ndk = await GlobalNDKService.getInstance();

      // Check if NDK is connected
      if (!GlobalNDKService.isConnected()) {
        console.warn('⚠️ No connected relays available for profile fetch');
        return null;
      }

      // Query profile events (kind 0) from relays
      const filter: NDKFilter = {
        kinds: [0],
        authors: [pubkey],
        limit: 10,
      };

      const profileEvents: Event[] = [];
      const subscription = ndk.subscribe(filter, { closeOnEose: false });

      subscription.on('event', (event: NDKEvent) => {
        profileEvents.push({
          id: event.id || '',
          pubkey: event.pubkey || '',
          created_at: event.created_at || Math.floor(Date.now() / 1000),
          kind: event.kind,
          tags: event.tags || [],
          content: event.content || '',
          sig: event.sig || '',
        });
      });

      // Wait for events
      await new Promise((resolve) => setTimeout(resolve, 1500));
      subscription.stop();

      if (profileEvents.length === 0) {
        console.log(
          `⚠️ No profile events found for pubkey: ${pubkey.slice(0, 20)}...`
        );
        return null;
      }

      // Get the most recent profile event
      const latestProfile = profileEvents.reduce((latest, current) => {
        return current.created_at > latest.created_at ? current : latest;
      });

      console.log(
        `📄 Found profile event from ${new Date(
          latestProfile.created_at * 1000
        ).toISOString()}`
      );

      // Parse profile content
      const parsedContent = this.parseProfileContent(latestProfile.content);

      const profile: NostrProfile = {
        ...parsedContent,
        pubkey: latestProfile.pubkey,
        npub: this.hexToNpub(latestProfile.pubkey),
        lastUpdated: new Date(latestProfile.created_at * 1000),
        source: 'live-relay',
      };

      console.log(
        `✅ Profile fetched for: ${
          profile.display_name || profile.name || 'Unknown'
        }`
      );
      return profile;
    } catch (error) {
      console.error('❌ Error fetching profile from relays:', error);

      // Return a basic profile if we can't fetch from relays
      const fallbackProfile: NostrProfile = {
        name: pubkey.slice(0, 8),
        display_name: `User ${pubkey.slice(0, 8)}`,
        about: 'Profile could not be fetched from Nostr relays',
        picture: `https://robohash.org/${pubkey.slice(0, 8)}.png`,
        pubkey: pubkey,
        npub: this.hexToNpub(pubkey),
        lastUpdated: new Date(),
        source: 'fallback',
      };

      console.log(
        `🔄 Returning fallback profile for: ${pubkey.slice(0, 20)}...`
      );
      return fallbackProfile;
    }
  }

  /**
   * Get user profile by npub or hex pubkey
   */
  async getProfile(
    identifier: string,
    forceRefresh = false
  ): Promise<NostrProfile | null> {
    try {
      const pubkey = this.npubToHex(identifier);

      console.log(`🔍 Fetching profile for: ${identifier.slice(0, 20)}...`);

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = this.getCachedProfile(pubkey);
        if (cached) {
          console.log(
            `✅ Profile found in cache for: ${identifier.slice(0, 20)}...`
          );
          return cached;
        }
      }

      // Check if request is already pending
      const pendingRequest = this.pendingRequests.get(pubkey);
      if (pendingRequest) {
        console.log(
          `⏳ Profile request already pending for: ${identifier.slice(
            0,
            20
          )}...`
        );
        return await pendingRequest;
      }

      // Create new request
      const request = this.fetchProfileFromRelays(pubkey);
      this.pendingRequests.set(pubkey, request);

      try {
        const profile = await request;

        if (profile) {
          this.cacheProfile(profile);
          console.log(
            `✅ Profile fetched and cached for: ${
              profile.display_name || profile.name || 'Unknown'
            }`
          );
        } else {
          console.log(`⚠️ No profile found for: ${identifier.slice(0, 20)}...`);
        }

        return profile;
      } finally {
        this.pendingRequests.delete(pubkey);
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      return null;
    }
  }

  /**
   * Get multiple profiles efficiently
   */
  async getProfiles(identifiers: string[]): Promise<Map<string, NostrProfile>> {
    const results = new Map<string, NostrProfile>();

    const fetchPromises = identifiers.map(async (identifier) => {
      try {
        const profile = await this.getProfile(identifier);
        if (profile) {
          results.set(identifier, profile);
        }
      } catch (error) {
        console.error(`❌ Failed to fetch profile for ${identifier}:`, error);
      }
    });

    await Promise.allSettled(fetchPromises);

    console.log(`📊 Fetched ${results.size}/${identifiers.length} profiles`);
    return results;
  }

  /**
   * Refresh profile cache for a specific user
   */
  async refreshProfile(identifier: string): Promise<NostrProfile | null> {
    return await this.getProfile(identifier, true);
  }

  /**
   * Clear profile cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    this.pendingRequests.clear();

    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('✅ Profile cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear profile cache from storage:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalProfiles: number;
    expiredProfiles: number;
    pendingRequests: number;
  } {
    const now = Date.now();
    let expiredCount = 0;

    this.cache.forEach((entry) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      }
    });

    return {
      totalProfiles: this.cache.size,
      expiredProfiles: expiredCount,
      pendingRequests: this.pendingRequests.size,
    };
  }
}

// Singleton instance for app-wide usage
export const nostrProfileService = new NostrProfileService();
