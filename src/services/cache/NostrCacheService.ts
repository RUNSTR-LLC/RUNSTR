/**
 * Nostr Cache Service
 * Multi-level caching system to eliminate slow repeated Nostr queries
 * Memory cache (instant) + AsyncStorage cache (persistent) + background refresh
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class NostrCacheService {
  // Level 1: In-memory cache (instant access)
  private static memoryCache = new Map<string, CacheEntry<any>>();

  // Level 2: Persistent cache keys
  private static readonly CACHE_KEYS = {
    PROFILE: '@runstr:cache:profile:',
    WORKOUTS: '@runstr:cache:workouts:',
    TEAMS: '@runstr:cache:teams',
    RELAY_STATUS: '@runstr:cache:relay_status'
  } as const;

  // Cache TTL settings (milliseconds)
  private static readonly TTL = {
    MEMORY: {
      PROFILE: 30 * 60 * 1000,      // 30 minutes
      WORKOUTS: 30 * 60 * 1000,     // 30 minutes (increased from 5 minutes)
      TEAMS: 30 * 60 * 1000,        // 30 minutes (increased from 10 minutes)
    },
    PERSISTENT: {
      PROFILE: 2 * 60 * 60 * 1000,  // 2 hours
      WORKOUTS: 2 * 60 * 60 * 1000, // 2 hours (increased from 30 minutes)
      TEAMS: 2 * 60 * 60 * 1000,    // 2 hours (increased from 1 hour)
    }
  } as const;

  /**
   * Get cached profile data with fallback chain
   */
  static async getCachedProfile<T>(npub: string): Promise<T | null> {
    console.log('🔍 NostrCache: Getting cached profile for', npub.slice(0, 20) + '...');

    // Level 1: Check memory cache (instant)
    const memoryKey = `profile:${npub}`;
    const memCached = this.memoryCache.get(memoryKey);
    
    if (memCached && !this.isExpired(memCached)) {
      console.log('⚡ NostrCache: Memory cache hit for profile');
      return memCached.data;
    }

    // Level 2: Check persistent cache (fast)
    try {
      const persistentCached = await AsyncStorage.getItem(this.CACHE_KEYS.PROFILE + npub);
      if (persistentCached) {
        const parsed: CacheEntry<T> = JSON.parse(persistentCached);
        
        if (!this.isExpired(parsed)) {
          console.log('💾 NostrCache: Persistent cache hit for profile');
          // Promote to memory cache
          this.memoryCache.set(memoryKey, parsed);
          return parsed.data;
        } else {
          console.log('⏰ NostrCache: Persistent cache expired for profile');
        }
      }
    } catch (error) {
      console.warn('NostrCache: Error reading persistent profile cache:', error);
    }

    console.log('❌ NostrCache: No valid cached profile found');
    return null;
  }

  /**
   * Cache profile data in both memory and persistent storage
   */
  static async setCachedProfile<T>(npub: string, data: T): Promise<void> {
    console.log('💾 NostrCache: Caching profile for', npub.slice(0, 20) + '...');
    
    const now = Date.now();
    const memoryEntry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + this.TTL.MEMORY.PROFILE
    };
    
    const persistentEntry: CacheEntry<T> = {
      data,
      timestamp: now, 
      expiresAt: now + this.TTL.PERSISTENT.PROFILE
    };

    // Set memory cache
    this.memoryCache.set(`profile:${npub}`, memoryEntry);

    // Set persistent cache
    try {
      await AsyncStorage.setItem(
        this.CACHE_KEYS.PROFILE + npub,
        JSON.stringify(persistentEntry)
      );
      console.log('✅ NostrCache: Profile cached successfully');
    } catch (error) {
      console.warn('NostrCache: Error setting persistent profile cache:', error);
    }
  }

  /**
   * Get cached workout data with fallback chain
   */
  static async getCachedWorkouts<T>(npub: string): Promise<T[]> {
    console.log('🔍 NostrCache: Getting cached workouts for', npub.slice(0, 20) + '...');

    // Level 1: Memory cache
    const memoryKey = `workouts:${npub}`;
    const memCached = this.memoryCache.get(memoryKey);
    
    if (memCached && !this.isExpired(memCached)) {
      console.log('⚡ NostrCache: Memory cache hit for workouts');
      return memCached.data;
    }

    // Level 2: Persistent cache
    try {
      const persistentCached = await AsyncStorage.getItem(this.CACHE_KEYS.WORKOUTS + npub);
      if (persistentCached) {
        const parsed: CacheEntry<T[]> = JSON.parse(persistentCached);
        
        if (!this.isExpired(parsed)) {
          console.log('💾 NostrCache: Persistent cache hit for workouts');
          this.memoryCache.set(memoryKey, parsed);
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('NostrCache: Error reading persistent workout cache:', error);
    }

    console.log('❌ NostrCache: No valid cached workouts found');
    return [];
  }

  /**
   * Cache workout data in both memory and persistent storage
   */
  static async setCachedWorkouts<T>(npub: string, data: T[]): Promise<void> {
    console.log('💾 NostrCache: Caching', data.length, 'workouts for', npub.slice(0, 20) + '...');

    const now = Date.now();
    const memoryEntry: CacheEntry<T[]> = {
      data,
      timestamp: now,
      expiresAt: now + this.TTL.MEMORY.WORKOUTS
    };

    const persistentEntry: CacheEntry<T[]> = {
      data,
      timestamp: now,
      expiresAt: now + this.TTL.PERSISTENT.WORKOUTS
    };

    // Set memory cache (always succeeds)
    this.memoryCache.set(`workouts:${npub}`, memoryEntry);
    console.log('✅ NostrCache: Workouts cached in memory');

    // Set persistent cache with circular reference detection
    try {
      const jsonString = JSON.stringify(persistentEntry);
      await AsyncStorage.setItem(
        this.CACHE_KEYS.WORKOUTS + npub,
        jsonString
      );
      console.log('✅ NostrCache: Workouts cached persistently');
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('circular')) {
        console.error('❌ NostrCache: Circular reference detected in workout data - persistent cache skipped');
        console.error('   Memory cache is still available. Check workout objects for NDK event references.');
      } else {
        console.warn('⚠️ NostrCache: Error setting persistent workout cache:', error);
      }
    }
  }

  /**
   * Get cached teams data
   */
  static async getCachedTeams<T>(): Promise<T[]> {
    console.log('🔍 NostrCache: Getting cached teams');

    // Level 1: Memory cache
    const memCached = this.memoryCache.get('teams');
    
    if (memCached && !this.isExpired(memCached)) {
      console.log('⚡ NostrCache: Memory cache hit for teams');
      return memCached.data;
    }

    // Level 2: Persistent cache
    try {
      const persistentCached = await AsyncStorage.getItem(this.CACHE_KEYS.TEAMS);
      if (persistentCached) {
        const parsed: CacheEntry<T[]> = JSON.parse(persistentCached);
        
        if (!this.isExpired(parsed)) {
          console.log('💾 NostrCache: Persistent cache hit for teams');
          this.memoryCache.set('teams', parsed);
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('NostrCache: Error reading persistent teams cache:', error);
    }

    console.log('❌ NostrCache: No valid cached teams found');
    return [];
  }

  /**
   * Cache teams data
   */
  static async setCachedTeams<T>(data: T[]): Promise<void> {
    console.log('💾 NostrCache: Caching', data.length, 'teams');
    
    const now = Date.now();
    const memoryEntry: CacheEntry<T[]> = {
      data,
      timestamp: now,
      expiresAt: now + this.TTL.MEMORY.TEAMS
    };
    
    const persistentEntry: CacheEntry<T[]> = {
      data,
      timestamp: now,
      expiresAt: now + this.TTL.PERSISTENT.TEAMS
    };

    // Set memory cache
    this.memoryCache.set('teams', memoryEntry);

    // Set persistent cache
    try {
      await AsyncStorage.setItem(
        this.CACHE_KEYS.TEAMS,
        JSON.stringify(persistentEntry)
      );
      console.log('✅ NostrCache: Teams cached successfully');
    } catch (error) {
      console.warn('NostrCache: Error setting persistent teams cache:', error);
    }
  }

  /**
   * Check if cache entry is expired
   */
  private static isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Clear memory cache (for memory management)
   */
  static clearMemoryCache(): void {
    console.log('🧹 NostrCache: Clearing memory cache');
    this.memoryCache.clear();
  }

  /**
   * Clear all cache data (for sign out or debugging)
   */
  static async clearAllCache(): Promise<void> {
    console.log('🧹 NostrCache: Clearing all cache data');
    
    // Clear memory cache
    this.memoryCache.clear();

    // Clear persistent cache
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('@runstr:cache:')
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log('✅ NostrCache: Removed', cacheKeys.length, 'persistent cache entries');
      }
    } catch (error) {
      console.warn('NostrCache: Error clearing persistent cache:', error);
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): {
    memoryEntries: number;
    memoryKeys: string[];
  } {
    return {
      memoryEntries: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys())
    };
  }

  /**
   * Force refresh cache entry (delete existing cache)
   */
  static async forceRefreshProfile(npub: string): Promise<void> {
    console.log('🔄 NostrCache: Force refreshing profile cache for', npub.slice(0, 20) + '...');
    
    // Remove from memory
    this.memoryCache.delete(`profile:${npub}`);
    
    // Remove from persistent storage
    try {
      await AsyncStorage.removeItem(this.CACHE_KEYS.PROFILE + npub);
    } catch (error) {
      console.warn('NostrCache: Error removing persistent profile cache:', error);
    }
  }

  /**
   * Force refresh workout cache
   */
  static async forceRefreshWorkouts(npub: string): Promise<void> {
    console.log('🔄 NostrCache: Force refreshing workouts cache for', npub.slice(0, 20) + '...');
    
    // Remove from memory
    this.memoryCache.delete(`workouts:${npub}`);
    
    // Remove from persistent storage
    try {
      await AsyncStorage.removeItem(this.CACHE_KEYS.WORKOUTS + npub);
    } catch (error) {
      console.warn('NostrCache: Error removing persistent workouts cache:', error);
    }
  }
}