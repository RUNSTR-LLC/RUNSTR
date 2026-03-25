/**
 * SubscriptionService
 *
 * Checks subscriber tier from Supabase with AsyncStorage caching.
 * Supports two tiers: Supporter (10k sats/mo) and Pro (15k sats/mo).
 * Used to gate features:
 *   - Supporter+: Premium competitions, boosted rewards (1000 per workout, max 5/week)
 *   - Pro only: Create clubs, create events
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';

export type SubscriptionTier = 'free' | 'supporter' | 'pro';

const CACHE_KEY = '@runstr:subscription_tier';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CachedTier {
  tier: SubscriptionTier;
  checkedAt: number;
}

export class SubscriptionService {
  /**
   * Get user's subscription tier (cache-first, falls back to Supabase)
   */
  static async getSubscriptionTier(npub: string): Promise<SubscriptionTier> {
    // Try cache first
    const cached = await this.getCachedTier();
    if (cached !== null) {
      return cached;
    }

    // Fall back to Supabase
    return this.refreshSubscriptionTier(npub);
  }

  /**
   * Force-fetch subscription tier from Supabase and update cache
   * Called during app initialization
   */
  static async refreshSubscriptionTier(npub: string): Promise<SubscriptionTier> {
    if (!isSupabaseConfigured()) {
      console.warn('[SubscriptionService] Supabase not configured');
      return 'free';
    }

    try {
      const { data, error } = await supabase!
        .from('subscribers')
        .select('status, plan, expires_at')
        .eq('npub', npub)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST205') {
          console.log('[SubscriptionService] subscribers table not found — skipping');
        } else {
          console.warn('[SubscriptionService] Query error:', error);
        }
        return 'free';
      }

      if (!data) {
        await this.saveTierCache('free');
        console.log('[SubscriptionService] Status: free');
        return 'free';
      }

      // Check expiration
      if (data.expires_at) {
        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
          console.log('[SubscriptionService] Subscription expired');
          await this.saveTierCache('free');
          return 'free';
        }
      }

      // Map plan to tier
      const tier: SubscriptionTier = data.plan === 'pro' ? 'pro'
        : data.plan === 'supporter' ? 'supporter'
        : 'pro'; // fallback for legacy 'creator' rows (shouldn't exist after migration)

      await this.saveTierCache(tier);
      console.log(`[SubscriptionService] Status: ${tier}`);
      return tier;
    } catch (err) {
      console.error('[SubscriptionService] Exception:', err);
      return 'free';
    }
  }

  /**
   * Check if user is a Pro subscriber (gates club + event creation)
   */
  static async isProSubscriber(npub: string): Promise<boolean> {
    const tier = await this.getSubscriptionTier(npub);
    return tier === 'pro';
  }

  /**
   * Check if user is Supporter or above (gates Season III, boosted rewards)
   */
  static async isSupporterOrAbove(npub: string): Promise<boolean> {
    const tier = await this.getSubscriptionTier(npub);
    return tier === 'supporter' || tier === 'pro';
  }

  /**
   * Backward-compatible: check if user has any paid subscription
   */
  static async isSubscriber(npub: string): Promise<boolean> {
    const tier = await this.getSubscriptionTier(npub);
    return tier !== 'free';
  }

  /**
   * Read cached subscription tier (no network call)
   * Returns null if cache is missing or expired
   */
  static async getCachedTier(): Promise<SubscriptionTier | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return null;

      const cached: CachedTier = JSON.parse(raw);
      if (Date.now() - cached.checkedAt > CACHE_TTL) {
        return null; // Expired
      }

      return cached.tier;
    } catch {
      return null;
    }
  }

  /**
   * Backward-compatible cached status check
   * Returns null if cache is missing/expired, boolean otherwise
   */
  static async getCachedSubscriberStatus(): Promise<boolean | null> {
    const tier = await this.getCachedTier();
    if (tier === null) return null;
    return tier !== 'free';
  }

  /**
   * Clear cached subscriber status (call on logout)
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      // Also clear old cache key
      await AsyncStorage.removeItem('@runstr:subscriber_status');
    } catch {
      // Non-critical
    }
  }

  private static async saveTierCache(tier: SubscriptionTier): Promise<void> {
    try {
      const cached: CachedTier = {
        tier,
        checkedAt: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch {
      // Non-critical
    }
  }
}

export default SubscriptionService;
