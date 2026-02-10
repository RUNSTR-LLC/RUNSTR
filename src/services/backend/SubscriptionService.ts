/**
 * SubscriptionService
 *
 * Checks subscriber status from Supabase with AsyncStorage caching.
 * Used to gate team and event creation features.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';

const CACHE_KEY = '@runstr:subscriber_status';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CachedStatus {
  isSubscriber: boolean;
  checkedAt: number;
}

export class SubscriptionService {
  /**
   * Check if user is a subscriber (cache-first, falls back to Supabase)
   */
  static async isSubscriber(npub: string): Promise<boolean> {
    // Try cache first
    const cached = await this.getCachedSubscriberStatus();
    if (cached !== null) {
      return cached;
    }

    // Fall back to Supabase
    return this.refreshSubscriberStatus(npub);
  }

  /**
   * Force-fetch subscriber status from Supabase and update cache
   * Called during app initialization
   */
  static async refreshSubscriberStatus(npub: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('[SubscriptionService] Supabase not configured');
      return false;
    }

    try {
      const { data, error } = await supabase!
        .from('subscribers')
        .select('status, expires_at')
        .eq('npub', npub)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('[SubscriptionService] Query error:', error);
        return false;
      }

      const isActive = !!data;

      // Check expiry if set
      if (isActive && data.expires_at) {
        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
          console.log('[SubscriptionService] Subscription expired');
          await this.saveCache(false);
          return false;
        }
      }

      await this.saveCache(isActive);
      console.log(`[SubscriptionService] Status: ${isActive ? 'subscriber' : 'free'}`);
      return isActive;
    } catch (err) {
      console.error('[SubscriptionService] Exception:', err);
      return false;
    }
  }

  /**
   * Read cached subscriber status (no network call)
   * Returns null if cache is missing or expired
   */
  static async getCachedSubscriberStatus(): Promise<boolean | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return null;

      const cached: CachedStatus = JSON.parse(raw);
      if (Date.now() - cached.checkedAt > CACHE_TTL) {
        return null; // Expired
      }

      return cached.isSubscriber;
    } catch {
      return null;
    }
  }

  /**
   * Clear cached subscriber status (call on logout)
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {
      // Non-critical
    }
  }

  private static async saveCache(isSubscriber: boolean): Promise<void> {
    try {
      const cached: CachedStatus = {
        isSubscriber,
        checkedAt: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch {
      // Non-critical
    }
  }
}

export default SubscriptionService;
