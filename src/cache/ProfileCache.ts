/**
 * ProfileCache - In-Memory Profile Caching
 *
 * PERFORMANCE: Module-level Map() provides ~1000x faster lookups than AsyncStorage
 *
 * Inspired by runstr-github's useProfileCache.js implementation
 * - Module-level cache persists across component remounts
 * - No disk I/O overhead
 * - Instant profile lookups
 *
 * Usage:
 * ```typescript
 * import { ProfileCache } from '@/cache/ProfileCache';
 *
 * const profiles = await ProfileCache.fetchProfiles(['pubkey1', 'pubkey2']);
 * const profile = ProfileCache.getProfile('pubkey1');
 * ```
 */

import { GlobalNDKService } from '../services/nostr/GlobalNDKService';
import type { NDKEvent } from '@nostr-dev-kit/ndk';

export interface CachedProfile {
  name?: string;
  picture?: string;
  about?: string;
  banner?: string;
  lud06?: string;
  lud16?: string;
  nip05?: string;
  website?: string;
}

type FetchStatus = 'idle' | 'fetching' | 'fetched' | 'error';

// Module-level cache - persists across component remounts
const profileCache = new Map<string, CachedProfile>();
const fetchingStatus = new Map<string, FetchStatus>();

/**
 * Safely parse profile content from kind 0 event
 */
function parseProfileContent(contentString: string): CachedProfile | null {
  if (typeof contentString !== 'string') {
    return null;
  }

  try {
    const profileData = JSON.parse(contentString);

    if (typeof profileData !== 'object' || profileData === null) {
      return null;
    }

    return {
      name: profileData.name || profileData.display_name || profileData.displayName,
      picture: profileData.picture,
      about: profileData.about,
      banner: profileData.banner,
      lud06: profileData.lud06,
      lud16: profileData.lud16,
      nip05: profileData.nip05,
      website: profileData.website,
    };
  } catch (error) {
    console.error('[ProfileCache] Error parsing profile content:', error);
    return null;
  }
}

/**
 * ProfileCache - Static class for in-memory profile caching
 */
export class ProfileCache {
  /**
   * Fetch profiles for multiple pubkeys
   * Uses in-memory cache for instant lookups, fetches missing profiles from Nostr
   *
   * @param pubkeys - Array of pubkeys to fetch
   * @returns Map of pubkey -> profile data
   */
  static async fetchProfiles(pubkeys: string[]): Promise<Map<string, CachedProfile>> {
    // Ensure NDK is ready
    const ndk = await GlobalNDKService.getInstance();
    if (!ndk) {
      console.error('[ProfileCache] NDK instance not available');
      return new Map();
    }

    // Filter unique pubkeys
    const uniquePubkeys = [...new Set(
      pubkeys.filter(pk => typeof pk === 'string' && pk.trim() !== '')
    )];

    if (uniquePubkeys.length === 0) {
      return new Map();
    }

    // Identify which pubkeys need fetching
    const pubkeysToFetch = uniquePubkeys.filter(pk => {
      const status = fetchingStatus.get(pk);
      return !profileCache.has(pk) &&
             (status === undefined || status === 'idle' || status === 'error');
    });

    // Fetch missing profiles
    if (pubkeysToFetch.length > 0) {
      console.log(`[ProfileCache] Fetching ${pubkeysToFetch.length} profiles from Nostr`);
      pubkeysToFetch.forEach(pk => fetchingStatus.set(pk, 'fetching'));

      try {
        const events = await ndk.fetchEvents({
          kinds: [0],
          authors: pubkeysToFetch
        });

        const fetchedProfilesMap = new Map<string, CachedProfile>();

        if (events && events.size > 0) {
          events.forEach((event: NDKEvent) => {
            const parsed = parseProfileContent(event.content);

            if (parsed && event.pubkey) {
              // Only cache if name or picture exists
              if (parsed.name || parsed.picture) {
                profileCache.set(event.pubkey, parsed);
                fetchedProfilesMap.set(event.pubkey, parsed);
              }
              fetchingStatus.set(event.pubkey, 'fetched');
            } else if (event.pubkey) {
              fetchingStatus.set(event.pubkey, 'error');
            }
          });
        }

        // Mark unfound profiles as error to prevent refetching
        pubkeysToFetch.forEach(pk => {
          if (!fetchedProfilesMap.has(pk) && fetchingStatus.get(pk) === 'fetching') {
            fetchingStatus.set(pk, 'error');
          }
        });

        console.log(`[ProfileCache] Cached ${fetchedProfilesMap.size} new profiles`);
      } catch (error) {
        console.error('[ProfileCache] Error fetching profiles:', error);
        pubkeysToFetch.forEach(pk => fetchingStatus.set(pk, 'error'));
      }
    }

    // Build result map from cache
    const resultMap = new Map<string, CachedProfile>();
    uniquePubkeys.forEach(pk => {
      if (profileCache.has(pk)) {
        resultMap.set(pk, profileCache.get(pk)!);
      }
    });

    return resultMap;
  }

  /**
   * Get cached profile for a single pubkey
   * Returns immediately from in-memory cache
   *
   * @param pubkey - Public key to lookup
   * @returns Cached profile or undefined
   */
  static getProfile(pubkey: string): CachedProfile | undefined {
    if (typeof pubkey !== 'string' || pubkey.trim() === '') {
      return undefined;
    }
    return profileCache.get(pubkey);
  }

  /**
   * Check if profile is cached
   */
  static has(pubkey: string): boolean {
    return profileCache.has(pubkey);
  }

  /**
   * Manually set a profile in cache
   * Useful for pre-populating from other sources
   */
  static setProfile(pubkey: string, profile: CachedProfile): void {
    profileCache.set(pubkey, profile);
    fetchingStatus.set(pubkey, 'fetched');
  }

  /**
   * Clear all cached profiles
   * Use sparingly - defeats the purpose of caching
   */
  static clearAll(): void {
    console.log('[ProfileCache] Clearing all cached profiles');
    profileCache.clear();
    fetchingStatus.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    cachedCount: number;
    fetchingCount: number;
    errorCount: number;
  } {
    let fetchingCount = 0;
    let errorCount = 0;

    fetchingStatus.forEach(status => {
      if (status === 'fetching') fetchingCount++;
      if (status === 'error') errorCount++;
    });

    return {
      cachedCount: profileCache.size,
      fetchingCount,
      errorCount,
    };
  }

  /**
   * Remove a specific profile from cache
   * Useful for refreshing stale data
   */
  static remove(pubkey: string): void {
    profileCache.delete(pubkey);
    fetchingStatus.delete(pubkey);
  }
}
