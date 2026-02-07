/**
 * BlossomService - Fetch audio tracks from Blossom servers
 *
 * Handles:
 * - Server management (add/remove custom servers)
 * - Multi-endpoint fallback for fetching blob lists
 * - Audio file detection and track conversion
 *
 * Ref: https://github.com/hzrd149/blossom
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlossomAuthService } from './BlossomAuthService';
import {
  DEFAULT_BLOSSOM_SERVERS,
  BLOSSOM_STORAGE_KEYS,
  BLOSSOM_CACHE_TTL,
  BLOSSOM_TIMEOUTS,
} from '../../constants/blossom';
import {
  type BlossomServer,
  type BlossomTrack,
  type BlossomBlobDescriptor,
  isAudioFile,
  extractTitleFromFilename,
} from '../../types/blossom';
import { npubEncode } from '../../utils/nostrEncoding';

// In-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class BlossomServiceClass {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get cached data or null if expired/missing
   */
  private getCached<T>(key: string, ttl: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache entry
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // ============================================
  // SERVER MANAGEMENT
  // ============================================

  /**
   * Get all configured Blossom servers (default + custom)
   */
  async getServers(): Promise<BlossomServer[]> {
    try {
      const storedJson = await AsyncStorage.getItem(BLOSSOM_STORAGE_KEYS.SERVERS);
      if (storedJson) {
        const customServers: BlossomServer[] = JSON.parse(storedJson);
        // Merge with defaults, avoiding duplicates
        const allServers = [...DEFAULT_BLOSSOM_SERVERS];
        for (const custom of customServers) {
          const exists = allServers.some(s =>
            s.url.replace(/\/$/, '') === custom.url.replace(/\/$/, '')
          );
          if (!exists) {
            allServers.push(custom);
          }
        }
        return allServers;
      }
    } catch (error) {
      console.error('[BlossomService] Error loading servers:', error);
    }
    return DEFAULT_BLOSSOM_SERVERS;
  }

  /**
   * Add a custom Blossom server
   * @returns true if added successfully, false if already exists
   */
  async addServer(url: string, name?: string): Promise<boolean> {
    try {
      // Normalize URL (remove trailing slash)
      const normalizedUrl = url.replace(/\/$/, '');

      // Check if already exists
      const servers = await this.getServers();
      const exists = servers.some(s =>
        s.url.replace(/\/$/, '') === normalizedUrl
      );

      if (exists) {
        console.log('[BlossomService] Server already exists:', normalizedUrl);
        return false;
      }

      // Test connection before adding
      const isValid = await this.testConnection(normalizedUrl);
      if (!isValid) {
        console.warn('[BlossomService] Failed to connect to server:', normalizedUrl);
        return false;
      }

      // Add to custom servers
      const storedJson = await AsyncStorage.getItem(BLOSSOM_STORAGE_KEYS.SERVERS);
      const customServers: BlossomServer[] = storedJson ? JSON.parse(storedJson) : [];

      customServers.push({
        url: normalizedUrl,
        name: name || new URL(normalizedUrl).hostname,
        isDefault: false,
      });

      await AsyncStorage.setItem(
        BLOSSOM_STORAGE_KEYS.SERVERS,
        JSON.stringify(customServers)
      );

      console.log('[BlossomService] Added custom server:', normalizedUrl);
      return true;
    } catch (error) {
      console.error('[BlossomService] Error adding server:', error);
      return false;
    }
  }

  /**
   * Remove a custom Blossom server
   * Cannot remove default servers
   */
  async removeServer(url: string): Promise<void> {
    try {
      const normalizedUrl = url.replace(/\/$/, '');

      // Check if it's a default server
      const isDefault = DEFAULT_BLOSSOM_SERVERS.some(s =>
        s.url.replace(/\/$/, '') === normalizedUrl
      );

      if (isDefault) {
        console.warn('[BlossomService] Cannot remove default server:', normalizedUrl);
        return;
      }

      const storedJson = await AsyncStorage.getItem(BLOSSOM_STORAGE_KEYS.SERVERS);
      if (!storedJson) return;

      const customServers: BlossomServer[] = JSON.parse(storedJson);
      const filtered = customServers.filter(s =>
        s.url.replace(/\/$/, '') !== normalizedUrl
      );

      await AsyncStorage.setItem(
        BLOSSOM_STORAGE_KEYS.SERVERS,
        JSON.stringify(filtered)
      );

      console.log('[BlossomService] Removed custom server:', normalizedUrl);
    } catch (error) {
      console.error('[BlossomService] Error removing server:', error);
    }
  }

  /**
   * Test connection to a Blossom server
   */
  async testConnection(serverUrl: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        BLOSSOM_TIMEOUTS.CONNECTION_TEST
      );

      // Try to fetch the root or a simple endpoint
      const response = await fetch(serverUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 404; // 404 is OK for root
    } catch (error) {
      console.warn('[BlossomService] Connection test failed:', serverUrl, error);
      return false;
    }
  }

  // ============================================
  // TRACK FETCHING
  // ============================================

  /**
   * Build endpoint URLs for fetching user's blobs from a server
   * Different servers use different endpoint patterns
   */
  private buildEndpoints(serverUrl: string, pubkeyHex: string): string[] {
    const endpoints: string[] = [];
    const npub = npubEncode(pubkeyHex);
    const normalizedUrl = serverUrl.replace(/\/$/, '');

    // Special case for blossom.band which uses subdomain pattern
    if (normalizedUrl.includes('blossom.band')) {
      endpoints.push(`https://${npub}.blossom.band/list/${pubkeyHex}`);
      endpoints.push(`https://blossom.band/list/${pubkeyHex}`);
    }

    // Standard endpoints (most servers)
    endpoints.push(`${normalizedUrl}/list/${pubkeyHex}`);
    endpoints.push(`${normalizedUrl}/list/${npub}`);
    endpoints.push(`${normalizedUrl}/api/list/${pubkeyHex}`);
    endpoints.push(`${normalizedUrl}/files/${pubkeyHex}`);

    return endpoints;
  }

  /**
   * Transform a blob descriptor into a playable track
   */
  private transformBlobToTrack(
    blob: BlossomBlobDescriptor,
    serverUrl: string
  ): BlossomTrack | null {
    // Extract filename from URL
    const urlParts = blob.url.split('/');
    const filename = urlParts[urlParts.length - 1] || blob.sha256;

    // Check if it's an audio file
    if (!isAudioFile(blob.type || null, filename)) {
      return null;
    }

    // Extract title from filename
    const title = extractTitleFromFilename(decodeURIComponent(filename));

    return {
      id: blob.sha256,
      title,
      artist: {
        id: 'unknown',
        name: 'My Blossom Library',
        verified: false,
      },
      mediaUrl: blob.url,
      source: 'blossom',
      duration: 0, // Will be determined by the player
      server: serverUrl,
      hash: blob.sha256,
      size: blob.size,
      mimeType: blob.type,
      uploadedAt: blob.uploaded ? new Date(blob.uploaded * 1000) : undefined,
    };
  }

  /**
   * Fetch audio tracks from a specific Blossom server
   * Uses fallback endpoints for compatibility
   */
  async getTracksFromServer(
    serverUrl: string,
    pubkey: string
  ): Promise<BlossomTrack[]> {
    const cacheKey = `tracks_${serverUrl}_${pubkey}`;
    const cached = this.getCached<BlossomTrack[]>(cacheKey, BLOSSOM_CACHE_TTL.TRACKS);
    if (cached) {
      console.log('[BlossomService] Returning cached tracks for:', serverUrl);
      return cached;
    }

    const endpoints = this.buildEndpoints(serverUrl, pubkey);
    console.log('[BlossomService] Trying endpoints for:', serverUrl);

    for (const endpoint of endpoints) {
      try {
        console.log('[BlossomService] Trying endpoint:', endpoint);

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          BLOSSOM_TIMEOUTS.LIST
        );

        // Use authenticated fetch
        const response = await BlossomAuthService.authenticatedFetch(endpoint, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`[BlossomService] Endpoint ${endpoint} returned ${response.status}`);
          continue;
        }

        const text = await response.text();
        if (!text || text.trim() === '') {
          console.warn('[BlossomService] Empty response from:', endpoint);
          continue;
        }

        let blobs: BlossomBlobDescriptor[];
        try {
          blobs = JSON.parse(text);
        } catch (parseError) {
          console.warn('[BlossomService] Failed to parse response:', parseError);
          continue;
        }

        if (!Array.isArray(blobs)) {
          console.warn('[BlossomService] Response is not an array:', endpoint);
          continue;
        }

        // Transform blobs to tracks (filter for audio only)
        const tracks = blobs
          .map(blob => this.transformBlobToTrack(blob, serverUrl))
          .filter((track): track is BlossomTrack => track !== null);

        console.log(`[BlossomService] Found ${tracks.length} audio tracks from ${serverUrl}`);

        this.setCache(cacheKey, tracks);
        return tracks;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn('[BlossomService] Request timed out:', endpoint);
        } else {
          console.warn('[BlossomService] Error fetching:', endpoint, error.message);
        }
        continue;
      }
    }

    console.log('[BlossomService] No blobs found on:', serverUrl);
    return [];
  }

  /**
   * Fetch audio tracks from all configured Blossom servers
   */
  async getAllTracks(pubkey: string): Promise<BlossomTrack[]> {
    const tracksByServer = await this.getTracksByServer(pubkey);

    // Flatten all tracks from all servers
    const allTracks: BlossomTrack[] = [];
    const seenHashes = new Set<string>();

    for (const tracks of Object.values(tracksByServer)) {
      for (const track of tracks) {
        // Deduplicate by hash
        if (!seenHashes.has(track.hash)) {
          seenHashes.add(track.hash);
          allTracks.push(track);
        }
      }
    }

    // Sort by upload date (newest first)
    allTracks.sort((a, b) => {
      const dateA = a.uploadedAt?.getTime() || 0;
      const dateB = b.uploadedAt?.getTime() || 0;
      return dateB - dateA;
    });

    console.log(`[BlossomService] Total unique audio tracks: ${allTracks.length}`);
    return allTracks;
  }

  /**
   * Fetch audio tracks grouped by server
   * Returns a map of server URL -> tracks for per-server playlists
   */
  async getTracksByServer(pubkey: string): Promise<Record<string, BlossomTrack[]>> {
    const servers = await this.getServers();
    console.log(`[BlossomService] Fetching tracks from ${servers.length} servers`);

    const tracksByServer: Record<string, BlossomTrack[]> = {};

    // Fetch from all servers in parallel
    const results = await Promise.allSettled(
      servers.map(async (server) => ({
        serverUrl: server.url,
        serverName: server.name,
        tracks: await this.getTracksFromServer(server.url, pubkey),
      }))
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.tracks.length > 0) {
        tracksByServer[result.value.serverUrl] = result.value.tracks;
        console.log(
          `[BlossomService] ${result.value.serverName}: ${result.value.tracks.length} tracks`
        );
      }
    }

    return tracksByServer;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[BlossomService] Cache cleared');
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<number | null> {
    try {
      const timestamp = await AsyncStorage.getItem(BLOSSOM_STORAGE_KEYS.LAST_SYNC);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        BLOSSOM_STORAGE_KEYS.LAST_SYNC,
        Date.now().toString()
      );
    } catch (error) {
      console.error('[BlossomService] Error updating last sync time:', error);
    }
  }
}

// Export singleton instance
export const BlossomService = new BlossomServiceClass();
export default BlossomService;
