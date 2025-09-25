/**
 * AmberNDKSigner - NDK Signer implementation for Amber
 * Handles secure key management through Amber app on Android
 * Private keys never leave Amber - all signing done externally
 */

import { NDKSigner, NDKUser, NostrEvent } from '@nostr-dev-kit/ndk';
import * as Linking from 'expo-linking';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AmberRequest {
  id: string;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout?: NodeJS.Timeout;
}

export class AmberNDKSigner implements NDKSigner {
  private _pubkey: string | null = null;
  private pendingRequests = new Map<string, AmberRequest>();
  private isReady = false;
  private linkingSubscription: any = null;

  constructor() {
    console.log('[Amber] Initializing NDK Signer');
    this.setupLinkingListener();

    // Debug: Log any deep links received
    Linking.addEventListener('url', (event) => {
      console.log('[DEBUG] Deep link received:', event.url);
    });
  }

  async blockUntilReady(): Promise<NDKUser> {
    if (this.isReady && this._pubkey) {
      return new NDKUser({ pubkey: this._pubkey });
    }

    try {
      // Check if we have a stored pubkey from previous session
      const storedPubkey = await AsyncStorage.getItem('@runstr:amber_pubkey');
      if (storedPubkey) {
        this._pubkey = storedPubkey;
        this.isReady = true;
        return new NDKUser({ pubkey: storedPubkey });
      }

      // Request pubkey from Amber
      const pubkey = await this.requestPublicKey();
      this._pubkey = pubkey;
      this.isReady = true;

      // Store for future sessions
      await AsyncStorage.setItem('@runstr:amber_pubkey', pubkey);
      return new NDKUser({ pubkey: pubkey });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Could not open Amber')) {
        throw new Error(errorMessage);
      }
      throw new Error(`Failed to connect to Amber: ${errorMessage}`);
    }
  }

  async user(): Promise<NDKUser> {
    await this.blockUntilReady();
    if (!this._pubkey) {
      throw new Error('Amber signer not initialized');
    }
    return new NDKUser({ pubkey: this._pubkey });
  }

  get pubkey(): string {
    if (!this._pubkey) {
      throw new Error('Amber signer not initialized. Call blockUntilReady() first');
    }
    return this._pubkey;
  }

  private setupLinkingListener(): void {
    // Set up deep linking listener for Amber callbacks
    this.linkingSubscription = Linking.addEventListener('url', (event) => {
      this.handleAmberCallback(event.url);
    });
  }

  private handleAmberCallback(url: string): void {
    console.log('[DEBUG] Amber callback received:', url);
    if (!url) return;

    try {
      const parsedUrl = new URL(url);

      // Check if this is an Amber callback
      if (!parsedUrl.pathname.includes('amber-callback')) {
        console.log('[DEBUG] Not an Amber callback, ignoring');
        return;
      }

      const params = new URLSearchParams(parsedUrl.search);
      const requestId = params.get('id');
      const event = params.get('event');
      const signature = params.get('signature');
      const pubkey = params.get('pubkey');
      const error = params.get('error');

      console.log('[DEBUG] Callback params:', {
        requestId,
        hasEvent: !!event,
        hasSignature: !!signature,
        hasPubkey: !!pubkey,
        error
      });

      if (!requestId || !this.pendingRequests.has(requestId)) {
        console.log('[DEBUG] No pending request for ID:', requestId);
        return;
      }

      const request = this.pendingRequests.get(requestId)!;
      this.pendingRequests.delete(requestId);

      // Clear timeout
      if (request.timeout) {
        clearTimeout(request.timeout);
      }

      if (error) {
        console.log('[DEBUG] Amber returned error:', error);
        request.reject(new Error(error));
        return;
      }

      // Handle different response types
      if (pubkey) {
        // Public key response
        console.log('[DEBUG] Received public key from Amber');
        request.resolve(pubkey);
      } else if (signature) {
        // Signature response
        console.log('[DEBUG] Received signature from Amber');
        request.resolve(signature);
      } else if (event) {
        // Signed event response
        console.log('[DEBUG] Received signed event from Amber');
        const signedEvent = JSON.parse(decodeURIComponent(event));
        request.resolve(signedEvent);
      } else {
        console.log('[DEBUG] Unexpected callback format - no data received');
      }
    } catch (error) {
      console.error('[AmberSigner] Error handling callback:', error);
    }
  }

  // Removed checkAmberInstalled - Amber cannot be reliably detected by design
  // The security model prevents apps from querying its presence
  // We must attempt launch and handle outcomes gracefully

  private generateRequestId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async requestPublicKey(): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('Amber is only available on Android');
    }

    const requestId = this.generateRequestId();
    console.log('[Amber] Requesting public key with ID:', requestId);

    return new Promise((resolve, reject) => {
      // Store the request with timeout
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          console.log('[Amber] Request timeout - user may have canceled or denied permissions');
          reject(new Error(
            'Amber request timed out. Please make sure to:\n' +
            '1. Approve the request when Amber opens\n' +
            '2. Grant all requested permissions\n' +
            '3. Try again if you accidentally closed Amber'
          ));
        }
      }, 60000); // 60 second timeout

      this.pendingRequests.set(requestId, {
        id: requestId,
        resolve,
        reject,
        timeout
      });

      // Build Amber URI for public key request with all needed permissions
      const params = new URLSearchParams({
        type: 'get_public_key',
        callbackUrl: `runstrproject://amber-callback`,
        id: requestId,
        permissions: JSON.stringify([
          { type: 'sign_event', kind: 0 },      // Profile metadata
          { type: 'sign_event', kind: 1 },      // Text notes
          { type: 'sign_event', kind: 1301 },   // Workout events
          { type: 'sign_event', kind: 30000 },  // Team member lists
          { type: 'sign_event', kind: 30001 },  // Additional lists
          { type: 'sign_event', kind: 33404 },  // Team events
          { type: 'nip04_encrypt' },
          { type: 'nip04_decrypt' },
          { type: 'nip44_encrypt' },
          { type: 'nip44_decrypt' }
        ])
      });

      const amberUri = `nostrsigner:?${params.toString()}`;
      console.log('[Amber] Launching with get_public_key request');

      // Launch and handle potential errors
      this.launchAmber(amberUri).catch(launchError => {
        // Clean up on launch failure
        this.pendingRequests.delete(requestId);
        clearTimeout(timeout);
        reject(launchError);
      });
    });
  }

  async sign(event: NostrEvent): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('Amber is only available on Android');
    }

    await this.blockUntilReady();

    const requestId = this.generateRequestId();

    // Prepare unsigned event
    const unsignedEvent: NostrEvent = {
      pubkey: this._pubkey!,
      created_at: event.created_at || Math.floor(Date.now() / 1000),
      kind: event.kind!,
      tags: event.tags || [],
      content: event.content || '',
      id: '',
      sig: ''
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Signing timeout'));
        }
      }, 30000);

      this.pendingRequests.set(requestId, {
        id: requestId,
        resolve,
        reject,
        timeout
      });

      const params = new URLSearchParams({
        type: 'sign_event',
        event: JSON.stringify(unsignedEvent),
        callbackUrl: `runstrproject://amber-callback`,
        id: requestId
      });

      const amberUri = `nostrsigner:?${params.toString()}`;
      this.launchAmber(amberUri);
    });
  }

  async encrypt(recipient: NDKUser | string, value: string): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('Amber is only available on Android');
    }

    await this.blockUntilReady();

    const requestId = this.generateRequestId();
    const recipientPubkey = typeof recipient === 'string' ? recipient : recipient.pubkey;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Encryption timeout'));
        }
      }, 30000);

      this.pendingRequests.set(requestId, {
        id: requestId,
        resolve,
        reject,
        timeout
      });

      const params = new URLSearchParams({
        type: 'nip04_encrypt',
        pubkey: recipientPubkey,
        plaintext: value,
        callbackUrl: `runstrproject://amber-callback`,
        id: requestId
      });

      const amberUri = `nostrsigner:?${params.toString()}`;
      this.launchAmber(amberUri);
    });
  }

  async decrypt(sender: NDKUser | string, value: string): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('Amber is only available on Android');
    }

    await this.blockUntilReady();

    const requestId = this.generateRequestId();
    const senderPubkey = typeof sender === 'string' ? sender : sender.pubkey;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Decryption timeout'));
        }
      }, 30000);

      this.pendingRequests.set(requestId, {
        id: requestId,
        resolve,
        reject,
        timeout
      });

      const params = new URLSearchParams({
        type: 'nip04_decrypt',
        pubkey: senderPubkey,
        ciphertext: value,
        callbackUrl: `runstrproject://amber-callback`,
        id: requestId
      });

      const amberUri = `nostrsigner:?${params.toString()}`;
      this.launchAmber(amberUri);
    });
  }

  private async launchAmber(uri: string): Promise<void> {
    console.log('[Amber] Attempting launch with URI scheme');

    try {
      // Try primary launch method
      await Linking.openURL(uri);
      console.log('[Amber] Launch successful via Linking.openURL');
    } catch (primaryError) {
      console.log('[Amber] Primary launch failed, trying Intent fallback');

      // Try alternative launch method with explicit package targeting
      try {
        await IntentLauncher.startActivityAsync(
          'android.intent.action.VIEW',
          {
            data: uri,
            flags: 1, // FLAG_ACTIVITY_NEW_TASK
            // Note: packageName might not work if Amber uses different package ID
            // but worth trying for better targeting
          }
        );
        console.log('[Amber] Launch successful via IntentLauncher');
      } catch (fallbackError) {
        // Both methods failed - provide specific error guidance
        console.error('[Amber] Both launch methods failed:', fallbackError);

        const errorString = fallbackError?.toString() || '';
        if (errorString.includes('ActivityNotFoundException') ||
            errorString.includes('No Activity found')) {
          throw new Error(
            'Amber not installed. Get it from:\n' +
            'F-Droid: https://f-droid.org/packages/com.greenart7c3.nostrsigner/\n' +
            'GitHub: https://github.com/greenart7c3/Amber/releases'
          );
        } else if (errorString.includes('SecurityException')) {
          throw new Error('Security error launching Amber. Please check app permissions.');
        } else {
          throw new Error(
            'Could not open Amber. Make sure:\n' +
            '1. Amber is installed\n' +
            '2. You have created or imported a key in Amber\n' +
            '3. Amber is not restricted by any device policies'
          );
        }
      }
    }
  }

  /**
   * Get user synchronously - required by NDKSigner interface
   */
  get userSync(): NDKUser {
    if (!this._pubkey) {
      throw new Error('Amber signer not ready. Call blockUntilReady() first');
    }
    return new NDKUser({ pubkey: this._pubkey });
  }

  /**
   * Serialize to payload for transport/storage
   */
  toPayload(): string {
    return JSON.stringify({
      type: 'amber',
      pubkey: this._pubkey || null
    });
  }

  cleanup(): void {
    // Clean up resources
    if (this.linkingSubscription) {
      this.linkingSubscription.remove();
    }
    this.pendingRequests.clear();
  }
}