/**
 * FeedCache - In-Memory Feed Caching with 60-Minute TTL
 *
 * PERFORMANCE: Module-level global state provides 12x fewer network requests
 * compared to 5-minute AsyncStorage cache
 *
 * Inspired by runstr-github's feedCache.js implementation:
 * - 60-minute TTL instead of 5-minute
 * - Module-level persistence across remounts
 * - No disk I/O overhead
 * - Instant feed hydration
 *
 * Usage:
 * ```typescript
 * import { FeedCache } from '@/cache/FeedCache';
 *
 * // Store feed data
 * FeedCache.storeFeed(posts);
 *
 * // Get cached feed
 * const cached = FeedCache.getFeed();
 * if (cached) {
 *   setPosts(cached);
 * }
 * ```
 */

export interface CachedFeedPost {
  id: string;
  pubkey: string;
  created_at: number;
  content: string;
  tags: string[][];
  [key: string]: any; // Allow additional properties
}

interface FeedCacheMetadata {
  timestamp: number;
  expiry: number;
  count: number;
  version: number;
  filterSource?: string | null;
}

// Module-level cache - persists across component remounts
let feedCache: CachedFeedPost[] = [];
let feedMetadata: FeedCacheMetadata | null = null;

const CACHE_VERSION = 1;
const DEFAULT_TTL_MINUTES = 60; // 60 minutes (12x longer than previous 5min)

/**
 * FeedCache - Static class for in-memory feed caching
 */
export class FeedCache {
  /**
   * Store feed data in memory with expiration
   *
   * @param posts - Feed posts to cache
   * @param ttlMinutes - Cache time-to-live in minutes (default: 60)
   * @param filterSource - Optional filter source identifier
   * @returns Success status
   */
  static storeFeed(
    posts: CachedFeedPost[],
    ttlMinutes: number = DEFAULT_TTL_MINUTES,
    filterSource?: string | null
  ): boolean {
    try {
      if (!posts || !Array.isArray(posts) || posts.length === 0) {
        return false;
      }

      const now = Date.now();

      feedCache = posts;
      feedMetadata = {
        timestamp: now,
        expiry: now + (ttlMinutes * 60 * 1000),
        count: posts.length,
        version: CACHE_VERSION,
        filterSource,
      };

      console.log(
        `[FeedCache] Cached ${posts.length} posts in memory ` +
        `(expires in ${ttlMinutes} minutes, filter: ${filterSource || 'none'})`
      );
      return true;
    } catch (error) {
      console.error('[FeedCache] Storage error:', error);
      this.clearAll();
      return false;
    }
  }

  /**
   * Get cached feed data if valid and not expired
   *
   * @param maxAgeMinutes - Maximum age of cache in minutes (default: 60)
   * @param filterSource - Optional filter source to match
   * @returns Cached posts or null if invalid/expired
   */
  static getFeed(
    maxAgeMinutes: number = DEFAULT_TTL_MINUTES,
    filterSource?: string | null
  ): CachedFeedPost[] | null {
    try {
      if (!feedMetadata) return null;

      const now = Date.now();

      // Check if cache is expired
      if (feedMetadata.expiry <= now) {
        console.log('[FeedCache] Cache expired, clearing');
        this.clearAll();
        return null;
      }

      // Check if filter source matches (if provided)
      if (filterSource !== undefined && feedMetadata.filterSource !== filterSource) {
        console.log(
          `[FeedCache] Filter source mismatch (cached: ${feedMetadata.filterSource}, ` +
          `requested: ${filterSource}), clearing cache`
        );
        this.clearAll();
        return null;
      }

      // Check if cache is within max age
      const age = now - feedMetadata.timestamp;
      const maxAge = maxAgeMinutes * 60 * 1000;

      if (age > maxAge) {
        console.log('[FeedCache] Cache too old, clearing');
        this.clearAll();
        return null;
      }

      if (feedCache.length > 0) {
        console.log(
          `[FeedCache] Using ${feedCache.length} cached posts from memory ` +
          `(age: ${Math.round(age / 1000 / 60)}min)`
        );
        return feedCache;
      }

      return null;
    } catch (error) {
      console.error('[FeedCache] Retrieval error:', error);
      return null;
    }
  }

  /**
   * Check if the cache is fresh (recently updated)
   *
   * @param freshnessMinutes - How recent the cache should be in minutes (default: 15)
   * @returns Whether cache is fresh
   */
  static isCacheFresh(freshnessMinutes: number = 15): boolean {
    try {
      if (!feedMetadata) return false;

      const now = Date.now();
      const age = now - feedMetadata.timestamp;

      return age < (freshnessMinutes * 60 * 1000);
    } catch (error) {
      console.error('[FeedCache] Freshness check error:', error);
      return false;
    }
  }

  /**
   * Clear the feed cache
   */
  static clearAll(): void {
    console.log('[FeedCache] Clearing all cached feed data');
    feedCache = [];
    feedMetadata = null;
  }

  /**
   * Get cache metadata
   */
  static getMetadata(): FeedCacheMetadata | null {
    return feedMetadata;
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    isCached: boolean;
    count: number;
    ageMinutes: number | null;
    timeUntilExpiry: number | null;
    filterSource: string | null;
  } {
    if (!feedMetadata) {
      return {
        isCached: false,
        count: 0,
        ageMinutes: null,
        timeUntilExpiry: null,
        filterSource: null,
      };
    }

    const now = Date.now();
    const age = now - feedMetadata.timestamp;
    const timeUntilExpiry = feedMetadata.expiry - now;

    return {
      isCached: true,
      count: feedCache.length,
      ageMinutes: Math.round(age / 1000 / 60),
      timeUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60),
      filterSource: feedMetadata.filterSource || null,
    };
  }

  /**
   * Prepend new posts to existing cache
   * Useful for real-time updates
   *
   * @param newPosts - New posts to prepend
   * @param maxPosts - Maximum total posts to keep (default: 100)
   */
  static prependPosts(newPosts: CachedFeedPost[], maxPosts: number = 100): void {
    if (!feedMetadata) {
      // No existing cache, store as new
      this.storeFeed(newPosts);
      return;
    }

    // Remove duplicates
    const existingIds = new Set(feedCache.map(p => p.id));
    const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));

    if (uniqueNewPosts.length === 0) {
      console.log('[FeedCache] No new posts to prepend');
      return;
    }

    // Prepend and trim
    feedCache = [...uniqueNewPosts, ...feedCache].slice(0, maxPosts);
    feedMetadata.count = feedCache.length;

    console.log(
      `[FeedCache] Prepended ${uniqueNewPosts.length} new posts ` +
      `(total: ${feedCache.length})`
    );
  }

  /**
   * Append posts to existing cache
   * Useful for pagination
   *
   * @param morePosts - Posts to append
   * @param maxPosts - Maximum total posts to keep (default: 200)
   */
  static appendPosts(morePosts: CachedFeedPost[], maxPosts: number = 200): void {
    if (!feedMetadata) {
      // No existing cache, store as new
      this.storeFeed(morePosts);
      return;
    }

    // Remove duplicates
    const existingIds = new Set(feedCache.map(p => p.id));
    const uniqueMorePosts = morePosts.filter(p => !existingIds.has(p.id));

    if (uniqueMorePosts.length === 0) {
      console.log('[FeedCache] No new posts to append');
      return;
    }

    // Append and trim
    feedCache = [...feedCache, ...uniqueMorePosts].slice(0, maxPosts);
    feedMetadata.count = feedCache.length;

    console.log(
      `[FeedCache] Appended ${uniqueMorePosts.length} posts ` +
      `(total: ${feedCache.length})`
    );
  }

  /**
   * Update a single post in cache
   * Useful for reaction updates
   */
  static updatePost(postId: string, updater: (post: CachedFeedPost) => CachedFeedPost): void {
    const index = feedCache.findIndex(p => p.id === postId);

    if (index !== -1) {
      feedCache[index] = updater(feedCache[index]);
    }
  }
}
