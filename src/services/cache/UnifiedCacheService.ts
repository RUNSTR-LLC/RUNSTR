/**
 * UnifiedCacheService - Central caching layer for all Nostr data
 * Provides intelligent caching with deduplication, TTL management, and cascade invalidation
 * This service eliminates duplicate Nostr queries across the entire app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  profiles: number;
  teams: number;
  members: number;
  workouts: number;
  leaderboards: number;
  competitions: number;
  computed: number;
}

export class UnifiedCacheService {
  // Centralized TTL configuration (in milliseconds)
  private static readonly TTL: CacheConfig = {
    profiles: 120 * 60 * 1000,      // 2 hours - profiles rarely change
    teams: 60 * 60 * 1000,           // 1 hour - team info is stable
    members: 5 * 60 * 1000,          // 5 minutes - member lists can change
    workouts: 5 * 60 * 1000,         // 5 minutes - new workouts posted frequently
    leaderboards: 5 * 60 * 1000,     // 5 minutes - rankings need freshness
    competitions: 30 * 60 * 1000,    // 30 minutes - competition settings stable
    computed: 5 * 60 * 1000,         // 5 minutes - computed data default
  };

  // Memory cache for instant access
  private static memoryCache = new Map<string, CacheEntry>();

  // Track in-flight requests to prevent duplicate fetches
  private static loading = new Map<string, Promise<any>>();

  // AsyncStorage key prefix
  private static readonly STORAGE_PREFIX = '@runstr:unified_cache:';

  /**
   * Smart fetch with automatic caching and deduplication
   * This is the main entry point for all data fetching
   */
  static async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlKey: keyof CacheConfig = 'computed'
  ): Promise<T> {
    console.log(`🔍 UnifiedCache: Fetching ${key}`);

    // Check if we're already loading this exact data
    if (this.loading.has(key)) {
      console.log(`⏳ UnifiedCache: Already loading ${key}, waiting...`);
      return this.loading.get(key)!;
    }

    // Check memory cache first (instant)
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached && !this.isExpired(memoryCached)) {
      console.log(`⚡ UnifiedCache: Memory cache hit for ${key}`);
      return memoryCached.data;
    }

    // Check persistent cache (fast)
    try {
      const storageCached = await this.getFromStorage<T>(key);
      if (storageCached && !this.isExpired(storageCached)) {
        console.log(`💾 UnifiedCache: Storage cache hit for ${key}`);
        // Promote to memory cache
        this.memoryCache.set(key, storageCached);
        return storageCached.data;
      }
    } catch (error) {
      console.warn(`UnifiedCache: Storage read error for ${key}:`, error);
    }

    // Cache miss - fetch with deduplication
    console.log(`🌐 UnifiedCache: Cache miss for ${key}, fetching...`);
    const ttl = this.TTL[ttlKey];

    const promise = fetcher()
      .then(data => {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl
        };

        // Store in both memory and persistent cache
        this.memoryCache.set(key, entry);
        this.saveToStorage(key, entry).catch(err =>
          console.warn(`UnifiedCache: Failed to persist ${key}:`, err)
        );

        // Clear loading state
        this.loading.delete(key);

        console.log(`✅ UnifiedCache: Cached ${key} with TTL ${ttl}ms`);
        return data;
      })
      .catch(error => {
        // Clear loading state on error
        this.loading.delete(key);
        throw error;
      });

    // Track this in-flight request
    this.loading.set(key, promise);
    return promise;
  }

  /**
   * Force fetch - bypasses cache for manual refresh
   */
  static async forceFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlKey: keyof CacheConfig = 'computed'
  ): Promise<T> {
    console.log(`🔄 UnifiedCache: Force fetching ${key}`);

    // Clear existing cache
    await this.invalidate(key);

    // Fetch fresh data
    return this.fetch(key, fetcher, ttlKey);
  }

  /**
   * Invalidate cache entries by key or pattern
   */
  static async invalidate(pattern: string | string[]): Promise<void> {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];

    for (const p of patterns) {
      if (p.includes('*')) {
        // Pattern matching invalidation
        const regex = new RegExp('^' + p.replace(/\*/g, '.*') + '$');

        // Clear from memory cache
        for (const [key] of this.memoryCache) {
          if (regex.test(key)) {
            console.log(`🗑️ UnifiedCache: Invalidating ${key}`);
            this.memoryCache.delete(key);
            await this.removeFromStorage(key);
          }
        }

        // Clear from storage (check all keys)
        try {
          const allKeys = await AsyncStorage.getAllKeys();
          const cacheKeys = allKeys.filter(k =>
            k.startsWith(this.STORAGE_PREFIX) &&
            regex.test(k.replace(this.STORAGE_PREFIX, ''))
          );

          if (cacheKeys.length > 0) {
            await AsyncStorage.multiRemove(cacheKeys);
            console.log(`🗑️ UnifiedCache: Removed ${cacheKeys.length} storage entries`);
          }
        } catch (error) {
          console.warn('UnifiedCache: Error clearing storage:', error);
        }
      } else {
        // Exact key invalidation
        console.log(`🗑️ UnifiedCache: Invalidating ${p}`);
        this.memoryCache.delete(p);
        await this.removeFromStorage(p);
      }
    }
  }

  /**
   * Get data directly from cache without fetching
   */
  static async get<T>(key: string): Promise<T | null> {
    // Check memory cache
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached && !this.isExpired(memoryCached)) {
      return memoryCached.data;
    }

    // Check persistent cache
    try {
      const storageCached = await this.getFromStorage<T>(key);
      if (storageCached && !this.isExpired(storageCached)) {
        // Promote to memory cache
        this.memoryCache.set(key, storageCached);
        return storageCached.data;
      }
    } catch (error) {
      console.warn(`UnifiedCache: Storage read error for ${key}:`, error);
    }

    return null;
  }

  /**
   * Set data directly in cache
   */
  static async set<T>(
    key: string,
    data: T,
    ttlKey: keyof CacheConfig = 'computed'
  ): Promise<void> {
    const ttl = this.TTL[ttlKey];
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };

    this.memoryCache.set(key, entry);
    await this.saveToStorage(key, entry);
    console.log(`✅ UnifiedCache: Manually cached ${key}`);
  }

  /**
   * Clear all cache data
   */
  static async clearAll(): Promise<void> {
    console.log('🧹 UnifiedCache: Clearing all cache data');

    // Clear memory cache
    this.memoryCache.clear();
    this.loading.clear();

    // Clear persistent cache
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(k => k.startsWith(this.STORAGE_PREFIX));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`✅ UnifiedCache: Removed ${cacheKeys.length} persistent entries`);
      }
    } catch (error) {
      console.warn('UnifiedCache: Error clearing storage:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    memoryEntries: number;
    loadingRequests: number;
    cacheKeys: string[];
  } {
    return {
      memoryEntries: this.memoryCache.size,
      loadingRequests: this.loading.size,
      cacheKeys: Array.from(this.memoryCache.keys())
    };
  }

  /**
   * Helper: Check if cache entry is expired
   */
  private static isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Helper: Get from AsyncStorage
   */
  private static async getFromStorage<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_PREFIX + key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn(`UnifiedCache: Failed to parse storage for ${key}:`, error);
    }
    return null;
  }

  /**
   * Helper: Save to AsyncStorage
   */
  private static async saveToStorage<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_PREFIX + key,
        JSON.stringify(entry)
      );
    } catch (error) {
      console.warn(`UnifiedCache: Failed to save ${key} to storage:`, error);
    }
  }

  /**
   * Helper: Remove from AsyncStorage
   */
  private static async removeFromStorage(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_PREFIX + key);
    } catch (error) {
      console.warn(`UnifiedCache: Failed to remove ${key} from storage:`, error);
    }
  }

  /**
   * Memory management - clear old entries if memory cache gets too large
   */
  static pruneMemoryCache(maxEntries: number = 100): void {
    if (this.memoryCache.size <= maxEntries) return;

    console.log(`🧹 UnifiedCache: Pruning memory cache (${this.memoryCache.size} entries)`);

    // Sort by timestamp and remove oldest
    const sorted = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = sorted.slice(0, this.memoryCache.size - maxEntries);
    toRemove.forEach(([key]) => {
      this.memoryCache.delete(key);
    });

    console.log(`✅ UnifiedCache: Pruned ${toRemove.length} old entries`);
  }
}

export default UnifiedCacheService;