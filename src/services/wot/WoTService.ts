/**
 * WoTService - Web of Trust Service
 *
 * Fetches and caches RUNSTR Rank (WoT scores) from Brainstorm's NIP-85 Trusted Assertions.
 *
 * How it works:
 * 1. RUNSTR signed up with Brainstorm as a "customer"
 * 2. Brainstorm calculates WoT from RUNSTR's perspective for all pubkeys
 * 3. Brainstorm publishes kind 30382 events (one per user) with their score
 * 4. We query these events to get a user's "RUNSTR Rank"
 *
 * The user does NOT publish anything - we just query what Brainstorm published ABOUT them.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NDK, { NDKFilter, NDKEvent } from '@nostr-dev-kit/ndk';
import type { CachedWoTScore } from '../../types/wot';

// Set to true to bypass Brainstorm relay (relay down/unreliable)
// When true, all WoT checks return a default passing score
const WOT_BYPASS_ENABLED = true;
const WOT_BYPASS_SCORE = 0.001; // "Known" tier

// Timeout for fetch operations (10 seconds)
const FETCH_TIMEOUT_MS = 10000;

// Connection establishment wait time
const CONNECTION_WAIT_MS = 500;

// Cache time-to-live (24 hours) - expired entries trigger re-fetch
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export class WoTService {
  private static instance: WoTService;

  // Brainstorm configuration
  private static readonly BRAINSTORM_PUBKEY =
    '3eaeb02c4f94a0aabf016527c35222a2ede49b3981df32aa9096f5db2dad58e2';
  private static readonly BRAINSTORM_RELAY = 'wss://nip85.brainstorm.world';
  private static readonly CACHE_KEY_PREFIX = '@runstr:wot_score:';

  // Kind 30382 = NIP-85 Trusted Assertions
  private static readonly KIND_TRUSTED_ASSERTION = 30382;

  private ndk: NDK | null = null;

  private constructor() {}

  static getInstance(): WoTService {
    if (!WoTService.instance) {
      WoTService.instance = new WoTService();
    }
    return WoTService.instance;
  }

  /**
   * Initialize NDK connection to Brainstorm relay
   */
  private async ensureConnected(): Promise<NDK> {
    if (this.ndk) {
      return this.ndk;
    }

    console.log('[WoTService] Connecting to Brainstorm relay...');
    this.ndk = new NDK({
      explicitRelayUrls: [WoTService.BRAINSTORM_RELAY],
    });

    await this.ndk.connect();

    // Wait for connection to establish
    await new Promise((resolve) => setTimeout(resolve, CONNECTION_WAIT_MS));

    console.log('[WoTService] Connected to Brainstorm relay');
    return this.ndk;
  }

  /**
   * Fetch events with a timeout to prevent hanging
   */
  private async fetchWithTimeout(
    ndk: NDK,
    filter: NDKFilter
  ): Promise<Set<NDKEvent>> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('[WoTService] Fetch timed out after', FETCH_TIMEOUT_MS, 'ms');
        reject(new Error('Fetch timeout'));
      }, FETCH_TIMEOUT_MS);

      ndk
        .fetchEvents(filter)
        .then((events) => {
          clearTimeout(timeout);
          resolve(events);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Get the AsyncStorage cache key for a pubkey
   */
  private getCacheKey(hexPubkey: string): string {
    return `${WoTService.CACHE_KEY_PREFIX}${hexPubkey}`;
  }

  /**
   * Fetch user's RUNSTR Rank from Brainstorm and cache it.
   * This is the main method to call when user visits Stats screen.
   *
   * @param userHexPubkey - The user's hex-encoded public key
   * @returns The WoT score (float) or null if not found
   */
  async fetchAndCacheScore(userHexPubkey: string): Promise<number | null> {
    if (WOT_BYPASS_ENABLED) {
      console.log('[WoTService] Bypass enabled, returning default score:', WOT_BYPASS_SCORE);
      return WOT_BYPASS_SCORE;
    }

    try {
      console.log('[WoTService] Fetching RUNSTR Rank for:', userHexPubkey);

      const ndk = await this.ensureConnected();

      // Query for kind 30382 events authored by Brainstorm, about this user
      // Note: 30382 is NIP-85 Trusted Assertions, not a built-in NDKKind
      const filter: NDKFilter = {
        kinds: [WoTService.KIND_TRUSTED_ASSERTION as number],
        authors: [WoTService.BRAINSTORM_PUBKEY],
        '#d': [userHexPubkey],
      };

      console.log('[WoTService] Querying with filter:', JSON.stringify(filter));

      const events = await this.fetchWithTimeout(ndk, filter);
      const eventsArray = Array.from(events);

      console.log('[WoTService] Found', eventsArray.length, 'events');

      if (eventsArray.length === 0) {
        console.log('[WoTService] No WoT score found for user');
        // Cache null result so we don't keep querying
        await this.cacheScore(userHexPubkey, null);
        return null;
      }

      // Get the most recent event (in case there are multiple)
      const latestEvent = eventsArray.reduce((latest, current) => {
        return current.created_at! > latest.created_at! ? current : latest;
      });

      // Extract the rank from tags
      const rankTag = latestEvent.tags.find((tag) => tag[0] === 'rank');
      if (!rankTag || !rankTag[1]) {
        console.log('[WoTService] No rank tag found in event');
        await this.cacheScore(userHexPubkey, null);
        return null;
      }

      const score = parseFloat(rankTag[1]);
      console.log('[WoTService] Found RUNSTR Rank:', score);

      // Cache the score
      await this.cacheScore(userHexPubkey, score);

      return score;
    } catch (error) {
      console.error('[WoTService] Error fetching WoT score:', error);
      throw error;
    }
  }

  /**
   * Cache a WoT score in AsyncStorage
   */
  private async cacheScore(
    hexPubkey: string,
    score: number | null
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(hexPubkey);
      const cacheData: CachedWoTScore = {
        score: score,
        fetchedAt: Date.now(),
        pubkey: hexPubkey,
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('[WoTService] Cached score:', score);
    } catch (error) {
      console.error('[WoTService] Error caching score:', error);
    }
  }

  /**
   * Get cached WoT score from AsyncStorage (no network call)
   *
   * @param userHexPubkey - The user's hex-encoded public key
   * @returns Cached score or null if not cached
   */
  async getCachedScore(userHexPubkey: string): Promise<number | null> {
    if (WOT_BYPASS_ENABLED) {
      return WOT_BYPASS_SCORE;
    }

    try {
      const cacheKey = this.getCacheKey(userHexPubkey);
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) {
        return null;
      }

      const data: CachedWoTScore = JSON.parse(cached);

      // Expire stale cache entries so unranked users get re-checked
      if (Date.now() - data.fetchedAt > CACHE_TTL_MS) {
        console.log('[WoTService] Cache expired for', userHexPubkey);
        return null;
      }

      return data.score;
    } catch (error) {
      console.error('[WoTService] Error reading cached score:', error);
      return null;
    }
  }

  /**
   * Get cached score with metadata (includes fetch timestamp)
   */
  async getCachedScoreWithMeta(
    userHexPubkey: string
  ): Promise<CachedWoTScore | null> {
    try {
      const cacheKey = this.getCacheKey(userHexPubkey);
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached);
    } catch (error) {
      console.error('[WoTService] Error reading cached score:', error);
      return null;
    }
  }

  /**
   * Force refresh the score from network (called when user presses Refresh)
   */
  async refreshScore(userHexPubkey: string): Promise<number | null> {
    // Clear any existing cache first
    try {
      const cacheKey = this.getCacheKey(userHexPubkey);
      await AsyncStorage.removeItem(cacheKey);
    } catch {
      // Ignore cache clear errors
    }

    // Fetch fresh from network
    return this.fetchAndCacheScore(userHexPubkey);
  }

  /**
   * Format a WoT score for display
   * Scores are typically very small floats like 0.000168
   */
  formatScore(score: number | null): string {
    if (score === null || score === 0) {
      return 'Not Ranked';
    }

    // For very small numbers, use scientific notation or multiplied form
    if (score < 0.0001) {
      // Show as "0.00001" style
      return score.toFixed(6);
    } else if (score < 0.01) {
      return score.toFixed(5);
    } else if (score < 1) {
      return score.toFixed(4);
    } else {
      return score.toFixed(2);
    }
  }

  /**
   * Get a human-readable rank tier based on score
   */
  getRankTier(score: number | null): string {
    if (score === null || score === 0) {
      return 'Unranked';
    }

    // These thresholds are approximate and may need tuning
    if (score >= 0.01) return 'Elite';
    if (score >= 0.001) return 'Trusted';
    if (score >= 0.0001) return 'Known';
    if (score >= 0.00001) return 'New';
    return 'Emerging';
  }

  /**
   * Disconnect from Brainstorm relay
   */
  disconnect(): void {
    if (this.ndk) {
      // NDK doesn't have a disconnect method, but we can null the reference
      this.ndk = null;
    }
  }
}
