/**
 * BlossomMetadataService - Persist user-edited track metadata
 *
 * Handles:
 * - Saving custom title, artist, and artwork for Blossom tracks
 * - Loading saved metadata to merge with fetched tracks
 * - Artwork upload to Blossom servers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BlossomTrack, BlossomTrackMetadata } from '../../types/blossom';

const STORAGE_KEY = '@runstr:blossom_track_metadata';

class BlossomMetadataServiceClass {
  private metadataCache: Record<string, BlossomTrackMetadata> | null = null;

  /**
   * Load all saved metadata from storage
   */
  async getAllMetadata(): Promise<Record<string, BlossomTrackMetadata>> {
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
      console.error('[BlossomMetadataService] Error loading metadata:', error);
    }

    return {};
  }

  /**
   * Get metadata for a specific track
   */
  async getMetadata(trackId: string): Promise<BlossomTrackMetadata | null> {
    const allMetadata = await this.getAllMetadata();
    return allMetadata[trackId] || null;
  }

  /**
   * Save metadata for a track
   */
  async saveMetadata(
    trackId: string,
    metadata: Partial<BlossomTrackMetadata>
  ): Promise<void> {
    try {
      const allMetadata = await this.getAllMetadata();

      // Merge with existing metadata
      allMetadata[trackId] = {
        ...allMetadata[trackId],
        ...metadata,
        updatedAt: Date.now(),
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allMetadata));
      this.metadataCache = allMetadata;

      console.log('[BlossomMetadataService] Saved metadata for track:', trackId);
    } catch (error) {
      console.error('[BlossomMetadataService] Error saving metadata:', error);
      throw error;
    }
  }

  /**
   * Delete metadata for a track
   */
  async deleteMetadata(trackId: string): Promise<void> {
    try {
      const allMetadata = await this.getAllMetadata();
      delete allMetadata[trackId];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allMetadata));
      this.metadataCache = allMetadata;

      console.log('[BlossomMetadataService] Deleted metadata for track:', trackId);
    } catch (error) {
      console.error('[BlossomMetadataService] Error deleting metadata:', error);
      throw error;
    }
  }

  /**
   * Apply saved metadata to a list of tracks
   * Returns tracks with customTitle, customArtist, customArtworkUrl set
   */
  async applyMetadataToTracks(tracks: BlossomTrack[]): Promise<BlossomTrack[]> {
    const allMetadata = await this.getAllMetadata();

    return tracks.map((track) => {
      const metadata = allMetadata[track.id];
      if (metadata) {
        return {
          ...track,
          customTitle: metadata.customTitle,
          customArtist: metadata.customArtist,
          customArtworkUrl: metadata.customArtworkUrl,
        };
      }
      return track;
    });
  }

  /**
   * Apply saved metadata to tracks grouped by server
   */
  async applyMetadataToTracksByServer(
    tracksByServer: Record<string, BlossomTrack[]>
  ): Promise<Record<string, BlossomTrack[]>> {
    const allMetadata = await this.getAllMetadata();
    const result: Record<string, BlossomTrack[]> = {};

    for (const [serverUrl, tracks] of Object.entries(tracksByServer)) {
      result[serverUrl] = tracks.map((track) => {
        const metadata = allMetadata[track.id];
        if (metadata) {
          return {
            ...track,
            customTitle: metadata.customTitle,
            customArtist: metadata.customArtist,
            customArtworkUrl: metadata.customArtworkUrl,
          };
        }
        return track;
      });
    }

    return result;
  }

  /**
   * Clear the in-memory cache (useful for testing or force refresh)
   */
  clearCache(): void {
    this.metadataCache = null;
  }

  /**
   * Get count of tracks with custom metadata
   */
  async getCustomizedTrackCount(): Promise<number> {
    const allMetadata = await this.getAllMetadata();
    return Object.keys(allMetadata).length;
  }
}

// Export singleton instance
export const BlossomMetadataService = new BlossomMetadataServiceClass();
export default BlossomMetadataService;
