/**
 * ImageUploadService - Upload images to multiple Nostr media hosts
 * Races uploads to nostr.build, Primal Blossom, and nostr.build Blossom
 * Uses fastest responding host for optimal performance
 */

import type { NDKSigner } from '@nostr-dev-kit/ndk';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { GlobalNDKService } from '../nostr/GlobalNDKService';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  blurhash?: string;
  dimensions?: { width: number; height: number };
  error?: string;
  host?: string; // Which host succeeded
}

// Blossom servers to race
const BLOSSOM_SERVERS = [
  'https://blossom.primal.net',
  'https://blossom.nostr.build',
];

export class ImageUploadService {
  private static instance: ImageUploadService;
  private readonly UPLOAD_TIMEOUT = 15000; // 15 seconds per host

  private constructor() {}

  static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService();
    }
    return ImageUploadService.instance;
  }

  /**
   * Upload image by racing multiple hosts - first success wins
   * @param imageUri - Local file URI or base64 data URI
   * @param filename - Optional filename (defaults to workout-card.png)
   * @param signer - NDK signer for NIP-98 authentication
   */
  async uploadImage(
    imageUri: string,
    filename: string = 'workout-card.png',
    signer?: NDKSigner
  ): Promise<ImageUploadResult> {
    if (!signer) {
      return {
        success: false,
        error: 'NIP-98 authentication required - please provide a signer',
      };
    }

    console.log('🏁 Racing image upload to multiple hosts...');

    // Create upload promises for all hosts
    const uploadPromises: Promise<ImageUploadResult>[] = [
      this.uploadToNostrBuild(imageUri, filename, signer),
      ...BLOSSOM_SERVERS.map((server) =>
        this.uploadToBlossom(server, imageUri, filename, signer)
      ),
    ];

    try {
      // Promise.any() resolves with first success, ignores failures
      const result = await Promise.any(uploadPromises);
      console.log(`✅ Upload won by: ${result.host}`);
      return result;
    } catch (aggregateError) {
      // All uploads failed
      console.error('❌ All image hosts failed:', aggregateError);
      return {
        success: false,
        error: 'All image hosts failed - please try again',
      };
    }
  }

  /**
   * Upload to nostr.build (NIP-96 style)
   */
  private async uploadToNostrBuild(
    imageUri: string,
    filename: string,
    signer: NDKSigner
  ): Promise<ImageUploadResult> {
    const host = 'nostr.build';
    const uploadUrl = 'https://nostr.build/api/v2/upload/files';

    try {
      console.log(`📤 [${host}] Starting upload...`);

      // Create NIP-98 authorization event
      const authEvent = await this.createNIP98AuthEvent('POST', uploadUrl, signer);

      // Create FormData
      const formData = new FormData();
      formData.append('fileToUpload', {
        uri: imageUri,
        type: 'image/png',
        name: filename,
      } as any);

      // Upload with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.UPLOAD_TIMEOUT);

      // Encode auth event with error handling
      let authHeader: string;
      try {
        authHeader = `Nostr ${btoa(JSON.stringify(authEvent))}`;
      } catch (encodingError) {
        console.error(`❌ [${host}] Failed to encode auth event:`, encodingError);
        throw new Error('Authentication encoding failed');
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        clearTimeout(timeoutId);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // JSON parsing is still covered by the timeout (clearTimeout moved after parse)
      const data = await response.json();
      clearTimeout(timeoutId);

      if (data.status === 'success' && data.data?.[0]?.url) {
        const uploadedFile = data.data[0];
        console.log(`✅ [${host}] Upload successful: ${uploadedFile.url}`);

        return {
          success: true,
          url: uploadedFile.url,
          blurhash: uploadedFile.blurhash,
          dimensions: uploadedFile.dimensions,
          host,
        };
      }

      throw new Error('Invalid response format');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ [${host}] Upload failed: ${message}`);
      throw error; // Re-throw for Promise.any() to handle
    }
  }

  /**
   * Upload to Blossom server (BUD-01 style)
   */
  private async uploadToBlossom(
    serverUrl: string,
    imageUri: string,
    filename: string,
    signer: NDKSigner
  ): Promise<ImageUploadResult> {
    const host = new URL(serverUrl).hostname;
    const uploadUrl = `${serverUrl}/upload`;

    try {
      console.log(`📤 [${host}] Starting Blossom upload...`);

      // Create Blossom authorization event (similar to NIP-98)
      const authEvent = await this.createBlossomAuthEvent(uploadUrl, signer);

      // Create FormData
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/png',
        name: filename,
      } as any);

      // Upload with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.UPLOAD_TIMEOUT);

      // Encode auth event with error handling
      let authHeader: string;
      try {
        authHeader = `Nostr ${btoa(JSON.stringify(authEvent))}`;
      } catch (encodingError) {
        console.error(`❌ [${host}] Failed to encode Blossom auth event:`, encodingError);
        throw new Error('Authentication encoding failed');
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        clearTimeout(timeoutId);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // JSON parsing is still covered by the timeout (clearTimeout moved after parse)
      const data = await response.json();
      clearTimeout(timeoutId);

      // Blossom returns { url, sha256, size, type, uploaded }
      if (data.url) {
        console.log(`✅ [${host}] Blossom upload successful: ${data.url}`);

        return {
          success: true,
          url: data.url,
          blurhash: data.blurhash,
          dimensions: data.nip94?.dim
            ? {
                width: parseInt(data.nip94.dim.split('x')[0]),
                height: parseInt(data.nip94.dim.split('x')[1]),
              }
            : undefined,
          host,
        };
      }

      throw new Error('Invalid Blossom response format');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ [${host}] Blossom upload failed: ${message}`);
      throw error; // Re-throw for Promise.any() to handle
    }
  }

  /**
   * Create NIP-98 HTTP authorization event
   */
  private async createNIP98AuthEvent(
    method: string,
    url: string,
    signer: NDKSigner
  ): Promise<any> {
    const ndk = await GlobalNDKService.getInstance();
    const user = await signer.user();

    const authEvent = new NDKEvent(ndk);
    authEvent.kind = 27235;
    authEvent.content = '';
    authEvent.tags = [
      ['u', url],
      ['method', method],
    ];
    authEvent.created_at = Math.floor(Date.now() / 1000);
    authEvent.pubkey = user.pubkey;

    await authEvent.sign(signer);

    return {
      id: authEvent.id,
      pubkey: authEvent.pubkey,
      created_at: authEvent.created_at,
      kind: authEvent.kind,
      tags: authEvent.tags,
      content: authEvent.content,
      sig: authEvent.sig,
    };
  }

  /**
   * Create Blossom authorization event (BUD-01)
   * Similar to NIP-98 but uses kind 24242 and 't' tag for upload type
   */
  private async createBlossomAuthEvent(
    url: string,
    signer: NDKSigner
  ): Promise<any> {
    const ndk = await GlobalNDKService.getInstance();
    const user = await signer.user();

    const authEvent = new NDKEvent(ndk);
    authEvent.kind = 24242; // Blossom auth kind
    authEvent.content = 'Upload image';
    authEvent.tags = [
      ['t', 'upload'], // Blossom action type
      ['expiration', String(Math.floor(Date.now() / 1000) + 300)], // 5 min expiry
    ];
    authEvent.created_at = Math.floor(Date.now() / 1000);
    authEvent.pubkey = user.pubkey;

    await authEvent.sign(signer);

    return {
      id: authEvent.id,
      pubkey: authEvent.pubkey,
      created_at: authEvent.created_at,
      kind: authEvent.kind,
      tags: authEvent.tags,
      content: authEvent.content,
      sig: authEvent.sig,
    };
  }

  /**
   * Upload multiple images in batch
   */
  async uploadBatch(
    imageUris: string[],
    signer?: NDKSigner,
    onProgress?: (completed: number, total: number) => void
  ): Promise<ImageUploadResult[]> {
    const results: ImageUploadResult[] = [];

    for (let i = 0; i < imageUris.length; i++) {
      const result = await this.uploadImage(
        imageUris[i],
        `workout-card-${i}.png`,
        signer
      );
      results.push(result);
      onProgress?.(i + 1, imageUris.length);

      // Small delay between uploads to avoid rate limiting
      if (i < imageUris.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Validate image URI before upload
   */
  validateImageUri(uri: string): boolean {
    return uri.startsWith('file://') || uri.startsWith('data:image/');
  }

  /**
   * Get estimated upload size from URI
   */
  async getImageSize(uri: string): Promise<number> {
    if (uri.startsWith('data:image/')) {
      const base64Data = uri.split(',')[1];
      return Math.ceil((base64Data.length * 3) / 4);
    }
    return 0;
  }
}

export default ImageUploadService.getInstance();
