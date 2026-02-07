/**
 * WavlakeAuthService - NIP-98 HTTP Authentication for Wavlake API
 *
 * Creates signed NIP-98 auth headers for authenticated Wavlake endpoints.
 * NIP-98 uses kind 27235 events signed by the user's Nostr key.
 *
 * Used for:
 * - Fetching liked songs (/v1/library/tracks)
 * - Liking/unliking tracks
 * - Creating/managing playlists
 */

import { NDKEvent } from '@nostr-dev-kit/ndk';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { UnifiedSigningService } from '../auth/UnifiedSigningService';
import { Buffer } from 'buffer';

// NIP-98 event kind for HTTP Auth
const NIP98_KIND = 27235;

class WavlakeAuthServiceClass {
  /**
   * Create a NIP-98 Authorization header for Wavlake API requests
   *
   * The header format is: "Nostr <base64-encoded-signed-event>"
   *
   * @param url - Full URL being requested
   * @param method - HTTP method (GET, POST, PUT, DELETE)
   * @param body - Optional request body (for POST/PUT requests)
   * @returns Authorization header value, or null if authentication fails
   */
  async createAuthHeader(
    url: string,
    method: string,
    body?: string
  ): Promise<string | null> {
    try {
      console.log('[WavlakeAuth] Creating NIP-98 auth header for:', method, url);

      // Get the signer from UnifiedSigningService
      const signingService = UnifiedSigningService.getInstance();
      const signer = await signingService.getSigner();

      if (!signer) {
        console.warn('[WavlakeAuth] No signer available - user not authenticated');
        return null;
      }

      // Get user's pubkey
      const user = await signer.user();
      const pubkey = user.pubkey;

      if (!pubkey) {
        console.warn('[WavlakeAuth] Could not get user pubkey');
        return null;
      }

      // Get NDK instance for creating the event
      const ndk = await GlobalNDKService.getInstance();

      // Build NIP-98 event tags
      const tags: string[][] = [
        ['u', url],
        ['method', method.toUpperCase()],
      ];

      // If there's a body, add payload hash
      if (body) {
        const payloadHash = await this.hashPayload(body);
        tags.push(['payload', payloadHash]);
      }

      // Create the NIP-98 event
      const event = new NDKEvent(ndk);
      event.kind = NIP98_KIND;
      event.content = '';
      event.tags = tags;
      event.pubkey = pubkey;
      event.created_at = Math.floor(Date.now() / 1000);

      // Sign the event
      await event.sign(signer);

      // Verify we have a signature
      if (!event.sig) {
        console.error('[WavlakeAuth] Event signing failed - no signature');
        return null;
      }

      // Convert to raw event format for encoding
      const rawEvent = {
        id: event.id,
        pubkey: event.pubkey,
        created_at: event.created_at,
        kind: event.kind,
        tags: event.tags,
        content: event.content,
        sig: event.sig,
      };

      // Base64 encode the signed event
      const eventJson = JSON.stringify(rawEvent);
      const base64Event = Buffer.from(eventJson).toString('base64');

      console.log('[WavlakeAuth] NIP-98 auth header created successfully');

      return `Nostr ${base64Event}`;
    } catch (error) {
      console.error('[WavlakeAuth] Failed to create auth header:', error);
      return null;
    }
  }

  /**
   * Hash the request payload using SHA-256
   * Required by NIP-98 for requests with bodies
   */
  private async hashPayload(payload: string): Promise<string> {
    // Use Web Crypto API for SHA-256 hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if user is authenticated and can use NIP-98
   */
  async canAuthenticate(): Promise<boolean> {
    try {
      const signingService = UnifiedSigningService.getInstance();
      return await signingService.canSign();
    } catch (error) {
      console.error('[WavlakeAuth] Error checking auth status:', error);
      return false;
    }
  }

  /**
   * Get user's pubkey in hex format
   */
  async getUserPubkeyHex(): Promise<string | null> {
    try {
      const signingService = UnifiedSigningService.getInstance();
      return await signingService.getUserPubkey();
    } catch (error) {
      console.error('[WavlakeAuth] Error getting user pubkey:', error);
      return null;
    }
  }

  /**
   * Make an authenticated fetch request to Wavlake API
   *
   * Convenience method that adds NIP-98 auth header automatically
   *
   * @param url - Full URL to fetch
   * @param options - Fetch options (method, body, etc.)
   * @returns Fetch response
   */
  async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const method = options.method || 'GET';
    const body = options.body as string | undefined;

    // Create auth header
    const authHeader = await this.createAuthHeader(url, method, body);

    if (!authHeader) {
      throw new Error('Failed to create NIP-98 auth header - user not authenticated');
    }

    // Build headers with auth
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers as Record<string, string> || {}),
      Authorization: authHeader,
    };

    // Add Content-Type for requests with body
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    // Make the request
    return fetch(url, {
      ...options,
      headers,
    });
  }
}

// Export singleton instance
export const WavlakeAuthService = new WavlakeAuthServiceClass();
export default WavlakeAuthService;
