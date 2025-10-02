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

export class AmberNDKSigner implements NDKSigner {
  private _pubkey: string | null = null;
  private isReady = false;

  constructor() {
    console.log('[Amber] Initializing NDK Signer for Activity Result communication');
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


  async requestPublicKey(): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('Amber is only available on Android');
    }

    console.log('[Amber] Requesting public key via Activity Result');

    try {
      // Prepare permissions for Amber
      const permissions = [
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
      ];

      const intentExtras = {
        'type': 'get_public_key',
        'permissions': JSON.stringify(permissions)
      };

      console.log('[Amber DEBUG] Launching Intent with extras:', intentExtras);

      // Use IntentLauncher and wait for Activity Result (proper Android NIP-55 way)
      const result = await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: 'nostrsigner:',
        extra: intentExtras
      });

      console.log('[Amber DEBUG] Activity result received:', {
        resultCode: result.resultCode,
        hasData: !!result.data
      });

      // Check if user approved the request
      if (result.resultCode === IntentLauncher.ResultCode.Success && result.data) {
        // Extract public key from Activity Result extras
        const pubkey = result.data.result || result.data.pubkey;

        console.log('[Amber DEBUG] Extracted pubkey:', pubkey ? pubkey.substring(0, 20) + '...' : 'NONE');

        if (pubkey) {
          // Store for future sessions
          await AsyncStorage.setItem('@runstr:amber_pubkey', pubkey);
          this._pubkey = pubkey;
          this.isReady = true;
          return pubkey;
        } else {
          throw new Error('No pubkey in Amber response');
        }
      } else {
        throw new Error('User rejected Amber request or request failed');
      }
    } catch (error) {
      console.error('[Amber] Failed to get public key:', error);
      throw new Error('Could not get public key from Amber: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  async sign(event: NostrEvent): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('Amber is only available on Android');
    }

    await this.blockUntilReady();

    console.log('[Amber] Signing event kind', event.kind, 'via Activity Result');

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

    try {
      const intentExtras = {
        'type': 'sign_event',
        'event': JSON.stringify(unsignedEvent)
      };

      console.log('[Amber DEBUG] Sign event Intent extras:', {
        type: 'sign_event',
        eventKind: unsignedEvent.kind
      });

      // Use IntentLauncher and wait for Activity Result
      const result = await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: 'nostrsigner:',
        extra: intentExtras
      });

      console.log('[Amber DEBUG] Sign result received:', {
        resultCode: result.resultCode,
        hasData: !!result.data
      });

      if (result.resultCode === IntentLauncher.ResultCode.Success && result.data) {
        // Extract signature from Activity Result
        // Result could be: 'signature' field or 'result' field, or signed 'event' with 'sig'
        const signature = result.data.signature || result.data.result;
        const signedEvent = result.data.event ? JSON.parse(result.data.event) : null;

        const sig = signature || signedEvent?.sig;

        console.log('[Amber DEBUG] Extracted signature:', sig ? sig.substring(0, 20) + '...' : 'NONE');

        if (sig) {
          return sig;
        } else {
          throw new Error('No signature in Amber response');
        }
      } else {
        throw new Error('User rejected signing request or request failed');
      }
    } catch (error) {
      console.error('[Amber] Failed to sign event:', error);
      throw new Error('Could not sign event with Amber: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  async encrypt(recipient: NDKUser | string, value: string): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('Amber is only available on Android');
    }

    await this.blockUntilReady();

    const recipientPubkey = typeof recipient === 'string' ? recipient : recipient.pubkey;
    console.log('[Amber] Encrypting message via Activity Result');

    try {
      const result = await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: 'nostrsigner:',
        extra: {
          'type': 'nip04_encrypt',
          'pubkey': recipientPubkey,
          'plaintext': value
        }
      });

      console.log('[Amber DEBUG] Encrypt result received:', {
        resultCode: result.resultCode,
        hasData: !!result.data
      });

      if (result.resultCode === IntentLauncher.ResultCode.Success && result.data) {
        const encrypted = result.data.result;
        if (encrypted) {
          return encrypted;
        } else {
          throw new Error('No encrypted content in Amber response');
        }
      } else {
        throw new Error('User rejected encryption request or request failed');
      }
    } catch (error) {
      console.error('[Amber] Failed to encrypt:', error);
      throw new Error('Could not encrypt with Amber: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  async decrypt(sender: NDKUser | string, value: string): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('Amber is only available on Android');
    }

    await this.blockUntilReady();

    const senderPubkey = typeof sender === 'string' ? sender : sender.pubkey;
    console.log('[Amber] Decrypting message via Activity Result');

    try {
      const result = await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: 'nostrsigner:',
        extra: {
          'type': 'nip04_decrypt',
          'pubkey': senderPubkey,
          'ciphertext': value
        }
      });

      console.log('[Amber DEBUG] Decrypt result received:', {
        resultCode: result.resultCode,
        hasData: !!result.data
      });

      if (result.resultCode === IntentLauncher.ResultCode.Success && result.data) {
        const decrypted = result.data.result;
        if (decrypted) {
          return decrypted;
        } else {
          throw new Error('No decrypted content in Amber response');
        }
      } else {
        throw new Error('User rejected decryption request or request failed');
      }
    } catch (error) {
      console.error('[Amber] Failed to decrypt:', error);
      throw new Error('Could not decrypt with Amber: ' + (error instanceof Error ? error.message : String(error)));
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
    // No cleanup needed for Activity Result-based communication
  }
}