/**
 * WavlakeService - API integration for Wavlake music streaming
 * Handles fetching tracks, playlists, and stream URLs
 */

import type {
  WavlakeTrack,
  WavlakePlaylist,
  WavlakeGenre,
  UserPlaylist,
  LikeResponse,
  PlaylistResponse,
} from '../../types/music';
import {
  WAVLAKE_API_BASE,
  WAVLAKE_CATALOG_BASE,
  WAVLAKE_APP_ID,
  CACHE_TTL,
  API_LIMITS,
} from '../../constants/music';
import { WavlakeAuthService } from './WavlakeAuthService';

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class WavlakeServiceClass {
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

  /**
   * Transform API response to WavlakeTrack
   * Note: API returns albumArtUrl for track artwork and artistArtUrl for artist avatar
   *
   * IMPORTANT: Wavlake API may not return artist's lightning address directly.
   * The lud16 (lightning address) is stored in the artist's Nostr profile (kind 0).
   * We capture npub here so ExternalZapModal can resolve the lightning address.
   */
  private transformTrack(data: any): WavlakeTrack {
    // Extract artist npub with multiple field name fallbacks
    const artistNpub =
      data.artistNpub ||
      data.artist_npub ||
      data.npub ||
      data.artistPubkey ||
      data.artist_pubkey ||
      '';

    // Extract lightning address with multiple fallbacks
    // Note: Wavlake may not return this - often requires Nostr profile lookup
    const lightningAddress =
      data.artistLightningAddress ||
      data.artist_lightning_address ||
      data.lud16 ||
      data.artistLud16 ||
      data.artist_lud16 ||
      '';

    return {
      id: data.id,
      title: data.title,
      artist: {
        id: data.artistId || data.artist_id || '',
        name: data.artist || data.artistName || 'Unknown Artist',
        // API uses artistArtUrl for artist avatar
        artworkUrl:
          data.artistArtUrl || data.artistAvatarUrl || data.artist_avatar_url,
        verified: data.artistVerified || data.artist_verified || false,
        npub: artistNpub,
        lightningAddress: lightningAddress,
      },
      albumTitle: data.albumTitle || data.album_title,
      // API uses albumArtUrl for track artwork
      artworkUrl: data.albumArtUrl || data.artworkUrl || data.artwork_url || '',
      duration: data.duration || 0,
      // API provides mediaUrl directly - use it for streaming
      streamUrl: data.mediaUrl || data.stream_url,
      msatTotal: data.msatTotal || data.msat_total || 0,
      playCount: data.playCount || data.play_count || 0,
      isExplicit: data.isExplicit || data.is_explicit || false,
    };
  }

  /**
   * Transform API response to WavlakePlaylist
   */
  private transformPlaylist(data: any): WavlakePlaylist {
    return {
      id: data.id,
      title: data.title || data.name,
      description: data.description,
      artworkUrl: data.artworkUrl || data.artwork_url,
      trackCount: data.trackCount || data.tracks?.length || 0,
      tracks: data.tracks?.map((t: any) => this.transformTrack(t)),
      creatorNpub: data.userId || data.user_id,
      isPublic: data.isPublic ?? data.is_public ?? true,
    };
  }

  /**
   * Fetch Top 40 tracks by sats received
   */
  async getTopTracks(limit = API_LIMITS.TOP_TRACKS): Promise<WavlakeTrack[]> {
    const cacheKey = `top_tracks_${limit}`;
    const cached = this.getCached<WavlakeTrack[]>(cacheKey, CACHE_TTL.RANKINGS);
    if (cached) {
      console.log('[WavlakeService] Returning cached top tracks');
      return cached;
    }

    try {
      const url = `${WAVLAKE_API_BASE}/content/rankings?sort=sats&days=7&limit=${limit}`;
      console.log('[WavlakeService] Fetching top tracks (by sats):', url);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': `RUNSTR/${WAVLAKE_APP_ID}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();

      const tracks = (json.data || json || []).map((t: any) =>
        this.transformTrack(t)
      );

      this.setCache(cacheKey, tracks);
      console.log(`[WavlakeService] Fetched ${tracks.length} top tracks`);
      return tracks;
    } catch (error) {
      console.error('[WavlakeService] Failed to fetch top tracks:', error);
      throw error;
    }
  }

  /**
   * Fetch tracks by genre
   * Returns empty array on error (genre endpoint can be unreliable)
   */
  async getTracksByGenre(
    genre: WavlakeGenre,
    limit = API_LIMITS.GENRE_TRACKS
  ): Promise<WavlakeTrack[]> {
    const cacheKey = `genre_${genre}_${limit}`;
    const cached = this.getCached<WavlakeTrack[]>(cacheKey, CACHE_TTL.RANKINGS);
    if (cached) {
      return cached;
    }

    try {
      const url = `${WAVLAKE_API_BASE}/content/rankings?sort=sats&days=7&genre=${encodeURIComponent(genre)}&limit=${limit}`;
      console.log('[WavlakeService] Fetching genre tracks:', genre);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': `RUNSTR/${WAVLAKE_APP_ID}`,
        },
      });

      if (!response.ok) {
        // Genre endpoint can return 500 errors - gracefully return empty array
        console.warn(
          `[WavlakeService] Genre ${genre} returned HTTP ${response.status}, returning empty array`
        );
        return [];
      }

      const json = await response.json();
      const tracks = (json.data || json || []).map((t: any) =>
        this.transformTrack(t)
      );

      this.setCache(cacheKey, tracks);
      return tracks;
    } catch (error) {
      // Return empty array instead of throwing - allows UI to gracefully degrade
      console.error(`[WavlakeService] Failed to fetch ${genre} tracks:`, error);
      return [];
    }
  }

  /**
   * Fetch a specific playlist by ID
   */
  async getPlaylist(playlistId: string): Promise<WavlakePlaylist> {
    const cacheKey = `playlist_${playlistId}`;
    const cached = this.getCached<WavlakePlaylist>(
      cacheKey,
      CACHE_TTL.PLAYLIST
    );
    if (cached) {
      return cached;
    }

    try {
      const url = `${WAVLAKE_API_BASE}/content/playlist/${playlistId}`;
      console.log('[WavlakeService] Fetching playlist:', playlistId);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': `RUNSTR/${WAVLAKE_APP_ID}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const playlist = this.transformPlaylist(json.data || json);

      this.setCache(cacheKey, playlist);
      return playlist;
    } catch (error) {
      console.error('[WavlakeService] Failed to fetch playlist:', error);
      throw error;
    }
  }

  /**
   * Fetch playlists for a user (by npub hex)
   */
  async getUserPlaylists(pubkeyHex: string): Promise<WavlakePlaylist[]> {
    const cacheKey = `user_playlists_${pubkeyHex}`;
    const cached = this.getCached<WavlakePlaylist[]>(
      cacheKey,
      CACHE_TTL.USER_PLAYLISTS
    );
    if (cached) {
      return cached;
    }

    try {
      const url = `${WAVLAKE_CATALOG_BASE}/playlists/user/${pubkeyHex}`;
      console.log('[WavlakeService] Fetching user playlists');

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': `RUNSTR/${WAVLAKE_APP_ID}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const playlists = (json.data || json || []).map((p: any) =>
        this.transformPlaylist(p)
      );

      this.setCache(cacheKey, playlists);
      return playlists;
    } catch (error) {
      console.error('[WavlakeService] Failed to fetch user playlists:', error);
      throw error;
    }
  }

  /**
   * Fetch user's liked/favorite tracks
   * Uses Wavlake catalog API with user's npub hex
   * Returns empty array on error for graceful degradation
   */
  async getLikedSongs(pubkeyHex: string): Promise<WavlakeTrack[]> {
    const cacheKey = `liked_songs_${pubkeyHex}`;
    const cached = this.getCached<WavlakeTrack[]>(
      cacheKey,
      CACHE_TTL.LIKED_SONGS
    );
    if (cached) {
      console.log('[WavlakeService] Returning cached liked songs');
      return cached;
    }

    try {
      // Note: Wavlake API endpoint for user likes
      const url = `${WAVLAKE_CATALOG_BASE}/likes/user/${pubkeyHex}`;
      console.log('[WavlakeService] Fetching liked songs');

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': `RUNSTR/${WAVLAKE_APP_ID}`,
        },
      });

      if (!response.ok) {
        // Likes endpoint may not be available or user has no likes
        console.warn(
          `[WavlakeService] Liked songs returned HTTP ${response.status}`
        );
        return []; // Graceful degradation
      }

      const json = await response.json();
      const tracks = (json.data || json || []).map((t: any) =>
        this.transformTrack(t)
      );

      this.setCache(cacheKey, tracks);
      console.log(`[WavlakeService] Fetched ${tracks.length} liked songs`);
      return tracks;
    } catch (error) {
      console.error('[WavlakeService] Failed to fetch liked songs:', error);
      return []; // Return empty array on error
    }
  }

  // ============================================
  // AUTHENTICATED ENDPOINTS (NIP-98)
  // ============================================

  /**
   * Fetch user's liked songs with NIP-98 authentication
   * Uses the Wavlake library endpoint that requires auth
   */
  async getLikedSongsWithAuth(): Promise<WavlakeTrack[]> {
    const cacheKey = 'liked_songs_auth';
    const cached = this.getCached<WavlakeTrack[]>(cacheKey, CACHE_TTL.LIKED_SONGS);
    if (cached) {
      console.log('[WavlakeService] Returning cached liked songs (auth)');
      return cached;
    }

    try {
      const url = `${WAVLAKE_CATALOG_BASE}/library/tracks`;
      console.log('[WavlakeService] Fetching liked songs with NIP-98 auth');

      const response = await WavlakeAuthService.authenticatedFetch(url);

      console.log('[WavlakeService] Liked songs response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[WavlakeService] Liked songs (auth) returned HTTP ${response.status}:`, errorText);
        // Fall back to unauthenticated endpoint if auth fails
        return [];
      }

      const text = await response.text();
      console.log('[WavlakeService] Liked songs raw response:', text.slice(0, 200));

      // Handle empty response
      if (!text || text.trim() === '') {
        console.log('[WavlakeService] Empty response - no liked songs');
        return [];
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error('[WavlakeService] Failed to parse liked songs response:', parseError);
        return [];
      }

      // Handle various response formats
      let tracksData: any[] = [];
      if (Array.isArray(json)) {
        tracksData = json;
      } else if (json.data && Array.isArray(json.data)) {
        tracksData = json.data;
      } else if (json.tracks && Array.isArray(json.tracks)) {
        tracksData = json.tracks;
      } else {
        console.warn('[WavlakeService] Unexpected liked songs response format:', Object.keys(json));
        return [];
      }

      const tracks = tracksData.map((t: any) => this.transformTrack(t));

      this.setCache(cacheKey, tracks);
      console.log(`[WavlakeService] Fetched ${tracks.length} liked songs (auth)`);
      return tracks;
    } catch (error) {
      console.error('[WavlakeService] Failed to fetch liked songs (auth):', error);
      return [];
    }
  }

  /**
   * Like a track on Wavlake
   * Requires NIP-98 authentication
   */
  async likeTrack(trackId: string): Promise<LikeResponse> {
    try {
      const url = `${WAVLAKE_CATALOG_BASE}/library/tracks/${trackId}`;
      console.log('[WavlakeService] Liking track:', trackId);

      const response = await WavlakeAuthService.authenticatedFetch(url, {
        method: 'PUT',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WavlakeService] Like track failed:', response.status, errorText);
        return {
          success: false,
          trackId,
          isLiked: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      // Invalidate liked songs cache
      this.invalidateCache('liked_songs_auth');

      console.log('[WavlakeService] Track liked successfully:', trackId);
      return {
        success: true,
        trackId,
        isLiked: true,
      };
    } catch (error) {
      console.error('[WavlakeService] Failed to like track:', error);
      return {
        success: false,
        trackId,
        isLiked: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Unlike a track on Wavlake
   * Requires NIP-98 authentication
   */
  async unlikeTrack(trackId: string): Promise<LikeResponse> {
    try {
      const url = `${WAVLAKE_CATALOG_BASE}/library/tracks/${trackId}`;
      console.log('[WavlakeService] Unliking track:', trackId);

      const response = await WavlakeAuthService.authenticatedFetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WavlakeService] Unlike track failed:', response.status, errorText);
        return {
          success: false,
          trackId,
          isLiked: true,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      // Invalidate liked songs cache
      this.invalidateCache('liked_songs_auth');

      console.log('[WavlakeService] Track unliked successfully:', trackId);
      return {
        success: true,
        trackId,
        isLiked: false,
      };
    } catch (error) {
      console.error('[WavlakeService] Failed to unlike track:', error);
      return {
        success: false,
        trackId,
        isLiked: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if a track is liked (from cached liked songs)
   * Note: This checks the local cache, not the server
   */
  isTrackLikedSync(trackId: string): boolean {
    const cached = this.getCached<WavlakeTrack[]>('liked_songs_auth', CACHE_TTL.LIKED_SONGS);
    if (!cached) return false;
    return cached.some((track) => track.id === trackId);
  }

  /**
   * Get set of liked track IDs for efficient lookup
   */
  getLikedTrackIds(): Set<string> {
    const cached = this.getCached<WavlakeTrack[]>('liked_songs_auth', CACHE_TTL.LIKED_SONGS);
    if (!cached) return new Set();
    return new Set(cached.map((track) => track.id));
  }

  /**
   * Fetch user's playlists from Wavlake
   * Requires NIP-98 authentication
   *
   * NOTE: This endpoint may not be available in Wavlake's public API yet.
   */
  async getMyPlaylists(): Promise<UserPlaylist[]> {
    const cacheKey = 'my_playlists';
    const cached = this.getCached<UserPlaylist[]>(cacheKey, CACHE_TTL.USER_PLAYLISTS);
    if (cached) {
      console.log('[WavlakeService] Returning cached user playlists');
      return cached;
    }

    try {
      const url = `${WAVLAKE_CATALOG_BASE}/playlists`;
      console.log('[WavlakeService] Fetching user playlists with NIP-98 auth');

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await WavlakeAuthService.authenticatedFetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('[WavlakeService] User playlists response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[WavlakeService] User playlists returned HTTP ${response.status}:`, errorText);
          return [];
        }

        const text = await response.text();
        console.log('[WavlakeService] User playlists raw response:', text.slice(0, 200));

        if (!text || text.trim() === '') {
          console.log('[WavlakeService] Empty response - no user playlists');
          return [];
        }

        let json;
        try {
          json = JSON.parse(text);
        } catch (parseError) {
          console.error('[WavlakeService] Failed to parse playlists response:', parseError);
          return [];
        }

        // Handle various response formats
        let playlistsData: any[] = [];
        if (Array.isArray(json)) {
          playlistsData = json;
        } else if (json.data && Array.isArray(json.data)) {
          playlistsData = json.data;
        } else if (json.playlists && Array.isArray(json.playlists)) {
          playlistsData = json.playlists;
        } else {
          console.warn('[WavlakeService] Unexpected playlists response format:', Object.keys(json));
          return [];
        }

        const playlists = playlistsData.map((p: any) => this.transformUserPlaylist(p));

        this.setCache(cacheKey, playlists);
        console.log(`[WavlakeService] Fetched ${playlists.length} user playlists`);
        return playlists;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn('[WavlakeService] User playlists request timed out');
          return [];
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('[WavlakeService] Failed to fetch user playlists:', error);
      return [];
    }
  }

  /**
   * Create a new playlist on Wavlake
   * Requires NIP-98 authentication
   *
   * NOTE: This endpoint may not be available in Wavlake's public API yet.
   * The feature is implemented for when the API becomes available.
   */
  async createPlaylist(
    title: string,
    description?: string,
    isPublic = true
  ): Promise<PlaylistResponse> {
    try {
      const url = `${WAVLAKE_CATALOG_BASE}/playlists`;
      const body = JSON.stringify({
        title,
        description: description || '',
        isPublic,
      });

      console.log('[WavlakeService] Creating playlist:', title);
      console.log('[WavlakeService] Request URL:', url);
      console.log('[WavlakeService] Request body:', body);

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        const response = await WavlakeAuthService.authenticatedFetch(url, {
          method: 'POST',
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('[WavlakeService] Create playlist response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[WavlakeService] Create playlist failed:', response.status, errorText);

          // Check if endpoint doesn't exist (404)
          if (response.status === 404) {
            return {
              success: false,
              error: 'Playlist creation is not yet available. Coming soon!',
            };
          }

          return {
            success: false,
            error: `HTTP ${response.status}: ${errorText || 'Unknown error'}`,
          };
        }

        const text = await response.text();
        console.log('[WavlakeService] Create playlist response:', text.slice(0, 200));

        if (!text || text.trim() === '') {
          // Some APIs return empty 200/201 for successful creation
          console.log('[WavlakeService] Playlist created (empty response)');
          return {
            success: true,
            playlist: {
              id: `local_${Date.now()}`,
              title,
              description,
              trackCount: 0,
              isPublic,
            },
          };
        }

        let json;
        try {
          json = JSON.parse(text);
        } catch (parseError) {
          console.warn('[WavlakeService] Could not parse playlist response:', parseError);
          return {
            success: true,
            playlist: {
              id: `local_${Date.now()}`,
              title,
              description,
              trackCount: 0,
              isPublic,
            },
          };
        }

        const playlist = this.transformUserPlaylist(json.data || json);

        // Invalidate playlists cache
        this.invalidateCache('my_playlists');

        console.log('[WavlakeService] Playlist created:', playlist.id);
        return {
          success: true,
          playlist,
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          console.error('[WavlakeService] Create playlist timed out');
          return {
            success: false,
            error: 'Request timed out. Playlist creation may not be available yet.',
          };
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('[WavlakeService] Failed to create playlist:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add a track to a playlist
   * Requires NIP-98 authentication
   */
  async addToPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    try {
      const url = `${WAVLAKE_CATALOG_BASE}/playlists/${playlistId}/tracks`;
      const body = JSON.stringify({ trackId });

      console.log('[WavlakeService] Adding track to playlist:', { playlistId, trackId });

      const response = await WavlakeAuthService.authenticatedFetch(url, {
        method: 'POST',
        body,
      });

      if (!response.ok) {
        console.error('[WavlakeService] Add to playlist failed:', response.status);
        return false;
      }

      // Invalidate playlist cache
      this.invalidateCache(`playlist_${playlistId}`);
      this.invalidateCache('my_playlists');

      console.log('[WavlakeService] Track added to playlist successfully');
      return true;
    } catch (error) {
      console.error('[WavlakeService] Failed to add track to playlist:', error);
      return false;
    }
  }

  /**
   * Remove a track from a playlist
   * Requires NIP-98 authentication
   */
  async removeFromPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    try {
      const url = `${WAVLAKE_CATALOG_BASE}/playlists/${playlistId}/tracks/${trackId}`;

      console.log('[WavlakeService] Removing track from playlist:', { playlistId, trackId });

      const response = await WavlakeAuthService.authenticatedFetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('[WavlakeService] Remove from playlist failed:', response.status);
        return false;
      }

      // Invalidate playlist cache
      this.invalidateCache(`playlist_${playlistId}`);
      this.invalidateCache('my_playlists');

      console.log('[WavlakeService] Track removed from playlist successfully');
      return true;
    } catch (error) {
      console.error('[WavlakeService] Failed to remove track from playlist:', error);
      return false;
    }
  }

  /**
   * Delete a playlist
   * Requires NIP-98 authentication
   */
  async deletePlaylist(playlistId: string): Promise<boolean> {
    try {
      const url = `${WAVLAKE_CATALOG_BASE}/playlists/${playlistId}`;

      console.log('[WavlakeService] Deleting playlist:', playlistId);

      const response = await WavlakeAuthService.authenticatedFetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('[WavlakeService] Delete playlist failed:', response.status);
        return false;
      }

      // Invalidate playlists cache
      this.invalidateCache(`playlist_${playlistId}`);
      this.invalidateCache('my_playlists');

      console.log('[WavlakeService] Playlist deleted successfully');
      return true;
    } catch (error) {
      console.error('[WavlakeService] Failed to delete playlist:', error);
      return false;
    }
  }

  /**
   * Transform API response to UserPlaylist
   */
  private transformUserPlaylist(data: any): UserPlaylist {
    return {
      id: data.id,
      title: data.title || data.name || 'Untitled',
      description: data.description,
      trackCount: data.trackCount || data.tracks?.length || 0,
      artworkUrl: data.artworkUrl || data.artwork_url,
      isPublic: data.isPublic ?? data.is_public ?? true,
      tracks: data.tracks?.map((t: any) => this.transformTrack(t)),
      createdAt: data.createdAt || data.created_at,
      updatedAt: data.updatedAt || data.updated_at,
    };
  }

  // ============================================
  // PUBLIC ENDPOINTS (No Auth Required)
  // ============================================

  /**
   * Get stream URL for a track
   */
  async getStreamUrl(trackId: string): Promise<string> {
    const cacheKey = `stream_${trackId}`;
    const cached = this.getCached<string>(cacheKey, CACHE_TTL.STREAM_URL);
    if (cached) {
      return cached;
    }

    try {
      const url = `${WAVLAKE_API_BASE}/stream/track/${trackId}`;
      console.log('[WavlakeService] Fetching stream URL for:', trackId);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': `RUNSTR/${WAVLAKE_APP_ID}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const streamUrl = json.url || json.streamUrl || json.data?.url;

      if (!streamUrl) {
        throw new Error('No stream URL in response');
      }

      this.setCache(cacheKey, streamUrl);
      return streamUrl;
    } catch (error) {
      console.error('[WavlakeService] Failed to fetch stream URL:', error);
      throw error;
    }
  }

  /**
   * Get LNURL for zapping a track
   */
  async getLnurl(trackId: string): Promise<string> {
    try {
      const url = `${WAVLAKE_API_BASE}/lnurl?contentId=${trackId}&appId=${WAVLAKE_APP_ID}`;
      console.log('[WavlakeService] Fetching LNURL for:', trackId);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': `RUNSTR/${WAVLAKE_APP_ID}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const lnurl = json.lnurl || json.data?.lnurl;

      if (!lnurl) {
        throw new Error('No LNURL in response');
      }

      return lnurl;
    } catch (error) {
      console.error('[WavlakeService] Failed to fetch LNURL:', error);
      throw error;
    }
  }

  /**
   * Search tracks by query
   */
  async searchTracks(query: string): Promise<WavlakeTrack[]> {
    if (!query.trim()) return [];

    try {
      const url = `${WAVLAKE_API_BASE}/content/search?q=${encodeURIComponent(
        query
      )}&limit=${API_LIMITS.SEARCH_RESULTS}`;
      console.log('[WavlakeService] Searching tracks:', query);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': `RUNSTR/${WAVLAKE_APP_ID}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      return (json.data || json || []).map((t: any) => this.transformTrack(t));
    } catch (error) {
      console.error('[WavlakeService] Search failed:', error);
      throw error;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[WavlakeService] Cache cleared');
  }

  /**
   * Clear specific cache key
   */
  invalidateCache(key: string): void {
    this.cache.delete(key);
  }
}

// Export singleton instance
export const WavlakeService = new WavlakeServiceClass();
export default WavlakeService;
