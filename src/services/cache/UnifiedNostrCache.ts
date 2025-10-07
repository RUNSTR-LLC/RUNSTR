/**
 * UnifiedNostrCache - Single source of truth for all Nostr data
 *
 * Features:
 * - In-memory caching with AsyncStorage persistence
 * - Fetch deduplication (prevents multiple simultaneous fetches)
 * - TTL-based expiration
 * - Background refresh capability
 * - Subscriber pattern for reactive updates
 * - Offline support via persistent storage
 *
 * Usage:
 * ```typescript
 * const cache = UnifiedNostrCache.getInstance();
 *
 * // Fetch with cache
 * const teams = await cache.get('user_teams',
 *   () => fetchTeamsFromNostr(),
 *   { ttl: 30 * 60 * 1000 }
 * );
 *
 * // Read cached only (no fetch)
 * const cachedTeams = cache.getCached('user_teams');
 *
 * // Subscribe to updates
 * const unsubscribe = cache.subscribe('user_teams', (teams) => {
 *   console.log('Teams updated:', teams);
 * });
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache entry interface
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

// Cache options
interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  forceRefresh?: boolean; // Bypass cache and fetch fresh
  backgroundRefresh?: boolean; // Return cached but refresh in background
  persist?: boolean; // Save to AsyncStorage for offline support (default: true)
}

// Subscriber callback type
type SubscriberCallback<T = any> = (data: T) => void;

const STORAGE_PREFIX = '@runstr:unified_cache:';

/**
 * UnifiedNostrCache - Centralized cache for all Nostr data
 */
export class UnifiedNostrCache {
  private static instance: UnifiedNostrCache;

  // In-memory cache for fast access
  private cache: Map<string, CacheEntry> = new Map();

  // Track pending fetches to prevent duplicates
  private pendingFetches: Map<string, Promise<any>> = new Map();

  // Subscribers for reactive updates
  private subscribers: Map<string, Set<SubscriberCallback>> = new Map();

  // Track initialization state
  private initialized: boolean = true; // ✅ ANDROID FIX: Mark as initialized immediately (lazy loading)
  private hydrationStarted: boolean = false;

  private constructor() {
    // Private constructor for singleton
    // ✅ ANDROID FIX: No blocking operations in constructor
  }

  /**
   * Get singleton instance
   */
  static getInstance(): UnifiedNostrCache {
    if (!UnifiedNostrCache.instance) {
      UnifiedNostrCache.instance = new UnifiedNostrCache();
    }
    return UnifiedNostrCache.instance;
  }

  /**
   * ✅ ANDROID FIX: Instant, non-blocking initialization
   * Cache is ready immediately, AsyncStorage loads happen on-demand
   */
  async initialize(): Promise<void> {
    // Already initialized - cache works instantly
    if (this.hydrationStarted) {
      return;
    }

    this.hydrationStarted = true;
    console.log('[UnifiedCache] ✅ Cache ready (lazy-loading mode)');

    // ✅ ANDROID FIX: Hydrate in background WITHOUT blocking
    this.hydrateInBackground();
  }

  /**
   * ✅ ANDROID FIX: Background hydration (non-blocking)
   * Loads persisted cache entries WITHOUT blocking the main thread
   */
  private hydrateInBackground(): void {
    console.log('[UnifiedCache] 🔄 Starting background hydration...');

    // Run in background - don't await
    (async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(STORAGE_PREFIX));

        if (cacheKeys.length === 0) {
          console.log('[UnifiedCache] No persisted cache to hydrate');
          return;
        }

        // Load entries in background
        const entries = await AsyncStorage.multiGet(cacheKeys);

        let loadedCount = 0;
        for (const [storageKey, value] of entries) {
          if (!value) continue;

          try {
            const cacheKey = storageKey.replace(STORAGE_PREFIX, '');
            const entry: CacheEntry = JSON.parse(value);

            // Only load if not expired
            if (!this.isExpired(entry)) {
              this.cache.set(cacheKey, entry);
              loadedCount++;

              // Notify subscribers of hydrated data
              this.notifySubscribers(cacheKey, entry.data);
            } else {
              // Clean up expired entries (non-blocking)
              AsyncStorage.removeItem(storageKey).catch(() => {});
            }
          } catch (parseError) {
            console.warn('[UnifiedCache] Failed to parse cache entry:', parseError);
          }
        }

        console.log(`[UnifiedCache] ✅ Background hydration complete: ${loadedCount} entries`);
      } catch (error) {
        console.error('[UnifiedCache] Background hydration failed:', error);
      }
    })();
  }

  /**
   * ✅ ANDROID FIX: Load single cache entry on-demand from AsyncStorage
   * Used when memory cache misses but we need to check persistent storage
   */
  private async loadCachedEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`;
      const value = await AsyncStorage.getItem(storageKey);

      if (!value) return null;

      const entry: CacheEntry<T> = JSON.parse(value);

      // Check if expired
      if (this.isExpired(entry)) {
        // Clean up expired entry
        AsyncStorage.removeItem(storageKey).catch(() => {});
        return null;
      }

      // Load into memory cache
      this.cache.set(key, entry);
      console.log(`[UnifiedCache] ⚡ Loaded on-demand: ${key}`);

      return entry;
    } catch (error) {
      console.warn(`[UnifiedCache] Failed to load entry on-demand: ${key}`, error);
      return null;
    }
  }

  /**
   * Get data from cache or fetch if missing/expired
   * ✅ ANDROID FIX: Now checks AsyncStorage on-demand if memory cache misses
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl = 5 * 60 * 1000, // Default 5 minutes
      forceRefresh = false,
      backgroundRefresh = false,
      persist = true
    } = options;

    // ✅ ANDROID FIX: No blocking initialize() call - cache is always ready

    // Check for pending fetch (deduplication)
    if (this.pendingFetches.has(key)) {
      console.log(`[UnifiedCache] Deduplicating fetch for: ${key}`);
      return this.pendingFetches.get(key)!;
    }

    // Check cache if not forcing refresh
    if (!forceRefresh) {
      // Check memory cache first
      let cached = this.cache.get(key);

      // ✅ ANDROID FIX: If not in memory, check AsyncStorage on-demand
      if (!cached) {
        cached = await this.loadCachedEntry<T>(key);
      }

      if (cached && !this.isExpired(cached)) {
        console.log(`[UnifiedCache] Cache hit: ${key} (age: ${Date.now() - cached.timestamp}ms)`);

        // Background refresh if requested
        if (backgroundRefresh) {
          this.backgroundRefresh(key, fetcher, ttl, persist);
        }

        return cached.data;
      } else if (cached) {
        console.log(`[UnifiedCache] Cache expired: ${key} (age: ${Date.now() - cached.timestamp}ms, ttl: ${cached.ttl}ms)`);
      } else {
        console.log(`[UnifiedCache] Cache miss: ${key}`);
      }
    } else {
      console.log(`[UnifiedCache] Force refresh: ${key}`);
    }

    // Fetch and cache
    return this.fetchAndCache(key, fetcher, ttl, persist);
  }

  /**
   * Get cached data only (no fetch, synchronous)
   * Returns null if not cached in memory or expired
   * ✅ ANDROID FIX: Synchronous-only to avoid blocking - use getCachedAsync() to check AsyncStorage
   */
  getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);

    if (!cached || this.isExpired(cached)) {
      return null;
    }

    return cached.data;
  }

  /**
   * ✅ ANDROID FIX: Async version that checks AsyncStorage if memory cache misses
   * Use this when you need to check persistent storage without triggering a fetch
   */
  async getCachedAsync<T>(key: string): Promise<T | null> {
    // Check memory first
    let cached = this.cache.get(key);

    // If not in memory, try loading from AsyncStorage
    if (!cached) {
      cached = await this.loadCachedEntry<T>(key);
    }

    if (!cached || this.isExpired(cached)) {
      return null;
    }

    return cached.data;
  }

  /**
   * Set data in cache
   */
  async set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000, persist: boolean = true): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    // Update in-memory cache
    this.cache.set(key, entry);
    console.log(`[UnifiedCache] Set cache: ${key} (ttl: ${ttl}ms)`);

    // Persist to AsyncStorage if requested
    if (persist) {
      try {
        await AsyncStorage.setItem(
          `${STORAGE_PREFIX}${key}`,
          JSON.stringify(entry)
        );
      } catch (error) {
        console.warn(`[UnifiedCache] Failed to persist cache: ${key}`, error);
      }
    }

    // Notify subscribers
    this.notifySubscribers(key, data);
  }

  /**
   * Invalidate (remove) cache entry
   */
  async invalidate(key: string): Promise<void> {
    console.log(`[UnifiedCache] Invalidating cache: ${key}`);

    // Remove from memory
    this.cache.delete(key);

    // Remove from storage
    try {
      await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.warn(`[UnifiedCache] Failed to remove from storage: ${key}`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    console.log('[UnifiedCache] Clearing all cache...');

    // Clear memory
    this.cache.clear();
    this.pendingFetches.clear();

    // Clear AsyncStorage
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(STORAGE_PREFIX));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`[UnifiedCache] Cleared ${cacheKeys.length} persisted entries`);
      }
    } catch (error) {
      console.error('[UnifiedCache] Failed to clear AsyncStorage:', error);
    }
  }

  /**
   * Subscribe to cache updates for a specific key
   */
  subscribe<T>(key: string, callback: SubscriberCallback<T>): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    this.subscribers.get(key)!.add(callback);
    console.log(`[UnifiedCache] Subscriber added for: ${key} (total: ${this.subscribers.get(key)!.size})`);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(key);
      if (subscribers) {
        subscribers.delete(callback);
        console.log(`[UnifiedCache] Subscriber removed for: ${key} (remaining: ${subscribers.size})`);

        // Clean up empty subscriber sets
        if (subscribers.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    pendingFetches: number;
    subscribers: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      pendingFetches: this.pendingFetches.size,
      subscribers: this.subscribers.size
    };
  }

  // Private helper methods

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age > entry.ttl;
  }

  /**
   * Fetch data and cache it
   */
  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    persist: boolean
  ): Promise<T> {
    const fetchPromise = fetcher()
      .then(async (data) => {
        // Cache the data
        await this.set(key, data, ttl, persist);

        // Clean up pending fetch
        this.pendingFetches.delete(key);

        return data;
      })
      .catch((error) => {
        console.error(`[UnifiedCache] Fetch failed for: ${key}`, error);

        // Clean up pending fetch
        this.pendingFetches.delete(key);

        throw error;
      });

    // Track pending fetch
    this.pendingFetches.set(key, fetchPromise);

    return fetchPromise;
  }

  /**
   * Background refresh (non-blocking)
   */
  private backgroundRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    persist: boolean
  ): void {
    console.log(`[UnifiedCache] Background refresh started: ${key}`);

    this.fetchAndCache(key, fetcher, ttl, persist).catch((error) => {
      console.warn(`[UnifiedCache] Background refresh failed: ${key}`, error);
    });
  }

  /**
   * Notify subscribers of data update
   */
  private notifySubscribers<T>(key: string, data: T): void {
    const subscribers = this.subscribers.get(key);

    if (!subscribers || subscribers.size === 0) {
      return;
    }

    console.log(`[UnifiedCache] Notifying ${subscribers.size} subscribers for: ${key}`);

    subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[UnifiedCache] Subscriber callback error for: ${key}`, error);
      }
    });
  }
}

// Export singleton instance
export default UnifiedNostrCache.getInstance();
