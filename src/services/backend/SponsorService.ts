/**
 * SponsorService
 *
 * Fetches the active reward sponsor from Supabase with AsyncStorage caching.
 * Falls back to a hardcoded RUNSTR default when Supabase is unavailable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';

const CACHE_KEY = '@runstr:reward_sponsor';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export interface RewardSponsor {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  displayText: string;
}

interface CachedSponsor {
  sponsor: RewardSponsor;
  cachedAt: number;
}

const DEFAULT_FALLBACK: RewardSponsor = {
  id: 'als-network-default',
  name: 'ALS Network',
  logoUrl: 'https://secure.alsnetwork.org/images/content/pagebuilder/ALS-Network-Logo.svg',
  websiteUrl: 'https://secure.alsnetwork.org/site/TR?fr_id=1510&pg=entry',
  displayText: 'Rewards brought to you by',
};

export class SponsorService {
  /**
   * Get the active reward sponsor (cache-first, falls back to Supabase).
   * Returns a hardcoded RUNSTR fallback if Supabase fails or returns nothing.
   */
  static async getActiveSponsor(): Promise<RewardSponsor> {
    // Try cache first
    const cached = await this.getCachedSponsor();
    if (cached !== null) {
      return cached;
    }

    // Fall back to Supabase
    return this.fetchFromSupabase();
  }

  /**
   * Clear the cached sponsor data.
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {
      // Non-critical
    }
  }

  /**
   * Read cached sponsor (no network call).
   * Returns null if cache is missing or expired.
   */
  private static async getCachedSponsor(): Promise<RewardSponsor | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return null;

      const cached: CachedSponsor = JSON.parse(raw);
      if (Date.now() - cached.cachedAt > CACHE_TTL) {
        return null; // Expired
      }

      return cached.sponsor;
    } catch {
      return null;
    }
  }

  /**
   * Fetch active sponsor from Supabase and update cache.
   * Returns RUNSTR fallback on any failure.
   */
  private static async fetchFromSupabase(): Promise<RewardSponsor> {
    if (!isSupabaseConfigured()) {
      console.warn('[SponsorService] Supabase not configured, using fallback');
      return DEFAULT_FALLBACK;
    }

    try {
      const { data, error } = await supabase!
        .from('reward_sponsors')
        .select('id, name, logo_url, website_url, display_text')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST205') {
          console.log('[SponsorService] reward_sponsors table not found -- using fallback');
        } else {
          console.warn('[SponsorService] Query error:', error);
        }
        await this.saveCache(DEFAULT_FALLBACK);
        return DEFAULT_FALLBACK;
      }

      if (!data) {
        console.log('[SponsorService] No active sponsor found, using fallback');
        await this.saveCache(DEFAULT_FALLBACK);
        return DEFAULT_FALLBACK;
      }

      const sponsor: RewardSponsor = {
        id: data.id,
        name: data.name,
        logoUrl: data.logo_url ?? null,
        websiteUrl: data.website_url ?? null,
        displayText: data.display_text ?? 'Rewards brought to you by',
      };

      await this.saveCache(sponsor);
      console.log(`[SponsorService] Active sponsor: ${sponsor.name}`);
      return sponsor;
    } catch (err) {
      console.error('[SponsorService] Exception:', err);
      return DEFAULT_FALLBACK;
    }
  }

  private static async saveCache(sponsor: RewardSponsor): Promise<void> {
    try {
      const cached: CachedSponsor = {
        sponsor,
        cachedAt: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch {
      // Non-critical
    }
  }
}

export default SponsorService;
