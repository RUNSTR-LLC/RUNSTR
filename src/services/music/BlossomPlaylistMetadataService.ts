/**
 * BlossomPlaylistMetadataService - Persist user-edited playlist metadata
 *
 * Handles:
 * - Saving custom name and cover image for Blossom playlists
 * - Loading saved metadata to display custom playlist info
 * - Per-server playlist metadata storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BlossomPlaylistMetadata } from '../../types/blossom';

const STORAGE_KEY = '@runstr:blossom_playlist_metadata';

class BlossomPlaylistMetadataServiceClass {
  private metadataCache: Record<string, BlossomPlaylistMetadata> | null = null;

  /**
   * Load all saved playlist metadata from storage
   * Returns a map of serverUrl -> metadata
   */
  async getAllMetadata(): Promise<Record<string, BlossomPlaylistMetadata>> {
    if (this.metadataCache) {
      return this.metadataCache;
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.metadataCache = JSON.parse(stored);
        return this.metadataCache || {};
      }
    } catch (error) {
      console.error('[BlossomPlaylistMetadataService] Error loading metadata:', error);
    }

    return {};
  }

  /**
   * Get metadata for a specific playlist (by server URL)
   */
  async getMetadata(serverUrl: string): Promise<BlossomPlaylistMetadata | null> {
    const normalizedUrl = this.normalizeUrl(serverUrl);
    const allMetadata = await this.getAllMetadata();
    return allMetadata[normalizedUrl] || null;
  }

  /**
   * Save metadata for a playlist (by server URL)
   */
  async saveMetadata(
    serverUrl: string,
    metadata: Partial<BlossomPlaylistMetadata>
  ): Promise<void> {
    const normalizedUrl = this.normalizeUrl(serverUrl);

    try {
      const allMetadata = await this.getAllMetadata();

      // Merge with existing metadata
      allMetadata[normalizedUrl] = {
        ...allMetadata[normalizedUrl],
        ...metadata,
        updatedAt: Date.now(),
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allMetadata));
      this.metadataCache = allMetadata;

      console.log('[BlossomPlaylistMetadataService] Saved metadata for playlist:', normalizedUrl);
    } catch (error) {
      console.error('[BlossomPlaylistMetadataService] Error saving metadata:', error);
      throw error;
    }
  }

  /**
   * Delete metadata for a playlist (by server URL)
   */
  async deleteMetadata(serverUrl: string): Promise<void> {
    const normalizedUrl = this.normalizeUrl(serverUrl);

    try {
      const allMetadata = await this.getAllMetadata();
      delete allMetadata[normalizedUrl];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allMetadata));
      this.metadataCache = allMetadata;

      console.log('[BlossomPlaylistMetadataService] Deleted metadata for playlist:', normalizedUrl);
    } catch (error) {
      console.error('[BlossomPlaylistMetadataService] Error deleting metadata:', error);
      throw error;
    }
  }

  /**
   * Clear the in-memory cache (useful for testing or force refresh)
   */
  clearCache(): void {
    this.metadataCache = null;
  }

  /**
   * Get count of playlists with custom metadata
   */
  async getCustomizedPlaylistCount(): Promise<number> {
    const allMetadata = await this.getAllMetadata();
    return Object.keys(allMetadata).length;
  }

  /**
   * Normalize server URL for consistent storage keys
   * Removes trailing slashes for consistent lookups
   */
  private normalizeUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }
}

// Export singleton instance
export const BlossomPlaylistMetadataService = new BlossomPlaylistMetadataServiceClass();
export default BlossomPlaylistMetadataService;
