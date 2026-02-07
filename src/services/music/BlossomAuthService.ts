/**
 * BlossomAuthService - Kind 24242 Authentication for Blossom servers
 *
 * Creates signed auth headers for Blossom blob list endpoints.
 * Uses kind 24242 events (different from Wavlake's NIP-98 kind 27235).
 *
 * Ref: https://github.com/hzrd149/blossom/blob/master/Blossom.md
 */

import { NDKEvent } from '@nostr-dev-kit/ndk';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { UnifiedSigningService } from '../auth/UnifiedSigningService';
import { Buffer } from 'buffer';
import { BLOSSOM_AUTH_KIND, BLOSSOM_AUTH_EXPIRATION } from '../../constants/blossom';

class BlossomAuthServiceClass {
  /**
   * Create a Blossom Authorization header for listing blobs
   *
   * The header format is: "Nostr <base64-encoded-signed-event>"
   *
   * Kind 24242 event structure:
   * - kind: 24242
   * - content: "List Blobs" (or action description)
   * - tags: [["t", "list"], ["expiration", timestamp]]
   *
   * @param action - Action being performed (default: "list")
   * @returns Authorization header value, or null if authentication fails
   */
  async createAuthHeader(action: string = 'list'): Promise<string | null> {
    try {
      console.log('[BlossomAuth] Creating kind 24242 auth header for action:', action);

      // Get the signer from UnifiedSigningService
      const signingService = UnifiedSigningService.getInstance();
      const signer = await signingService.getSigner();

      if (!signer) {
        console.warn('[BlossomAuth] No signer available - user not authenticated');
        return null;
      }

      // Get user's pubkey
      const user = await signer.user();
      const pubkey = user.pubkey;

      if (!pubkey) {
        console.warn('[BlossomAuth] Could not get user pubkey');
        return null;
      }

      // Get NDK instance for creating the event
      const ndk = await GlobalNDKService.getInstance();

      // Calculate expiration timestamp (current time + expiration period)
      const expiration = Math.floor(Date.now() / 1000) + BLOSSOM_AUTH_EXPIRATION;

      // Build kind 24242 event tags
      const tags: string[][] = [
        ['t', action],
        ['expiration', expiration.toString()],
      ];

      // Create the Blossom auth event
      const event = new NDKEvent(ndk);
      event.kind = BLOSSOM_AUTH_KIND;
      event.content = action === 'list' ? 'List Blobs' : action;
      event.tags = tags;
      event.pubkey = pubkey;
      event.created_at = Math.floor(Date.now() / 1000);

      // Sign the event
      await event.sign(signer);

      // Verify we have a signature
      if (!event.sig) {
        console.error('[BlossomAuth] Event signing failed - no signature');
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

      console.log('[BlossomAuth] Kind 24242 auth header created successfully');

      return `Nostr ${base64Event}`;
    } catch (error) {
      console.error('[BlossomAuth] Failed to create auth header:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated and can use Blossom auth
   */
  async canAuthenticate(): Promise<boolean> {
    try {
      const signingService = UnifiedSigningService.getInstance();
      return await signingService.canSign();
    } catch (error) {
      console.error('[BlossomAuth] Error checking auth status:', error);
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
      console.error('[BlossomAuth] Error getting user pubkey:', error);
      return null;
    }
  }

  /**
   * Make an authenticated fetch request to a Blossom server
   *
   * Adds kind 24242 auth header automatically
   *
   * @param url - Full URL to fetch
   * @param options - Fetch options (method, headers, etc.)
   * @returns Fetch response
   */
  async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    // Create auth header
    const authHeader = await this.createAuthHeader('list');

    // Build headers (auth header is optional - some endpoints work without it)
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (authHeader) {
      headers.Authorization = authHeader;
    }

    // Make the request
    return fetch(url, {
      ...options,
      headers,
    });
  }
}

// Export singleton instance
export const BlossomAuthService = new BlossomAuthServiceClass();
export default BlossomAuthService;
