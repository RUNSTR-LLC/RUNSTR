import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private memoryCache = new Map<string, CacheEntry<any>>();

  // Default 5 minutes TTL
  private DEFAULT_TTL = 5 * 60 * 1000;

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry && Date.now() - memEntry.timestamp < memEntry.ttl) {
      return memEntry.data;
    }

    // Check AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (Date.now() - entry.timestamp < entry.ttl) {
          // Update memory cache
          this.memoryCache.set(key, entry);
          return entry.data;
        }
        // Expired, clean up
        await AsyncStorage.removeItem(`cache_${key}`);
      }
    } catch {
      // Silent fail, return null
    }

    return null;
  }

  async set<T>(key: string, data: T, ttlMs?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs || this.DEFAULT_TTL
    };

    // Update memory cache
    this.memoryCache.set(key, entry);

    // Persist to AsyncStorage (non-blocking)
    AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry)).catch(() => {
      // Silent fail for cache writes
    });
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.memoryCache.clear();
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } else {
      // Clear specific pattern
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
          await AsyncStorage.removeItem(`cache_${key}`);
        }
      }
    }
  }
}

export const appCache = new SimpleCache();