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
        hasData: !!result.data,
        hasExtra: !!result.extra,
        dataType: typeof result.data,
        extraKeys: result.extra ? Object.keys(result.extra) : []
      });

      // Check if user approved the request
      if (result.resultCode === IntentLauncher.ResultCode.Success) {
        // Extract public key from Activity Result
        // result.data is a STRING (URI), result.extra is an OBJECT with additional data
        const pubkey =
          result.extra?.result ||      // Most likely location in extras object
          result.extra?.pubkey ||      // Alternative field name
          result.data;                 // Fallback: data as plain string

        console.log('[Amber DEBUG] Extracted pubkey from:',
          result.extra?.result ? 'extra.result' :
          result.extra?.pubkey ? 'extra.pubkey' :
          result.data ? 'data string' : 'NONE'
        );
        console.log('[Amber DEBUG] Pubkey value:', pubkey ? pubkey.substring(0, 20) + '...' : 'NONE');

        if (pubkey) {
          // Ensure pubkey is properly formatted (decode npub if needed, pad to 64 chars)
          const hexPubkey = await this.ensureHexPubkey(pubkey);

          // Store for future sessions
          await AsyncStorage.setItem('@runstr:amber_pubkey', hexPubkey);
          this._pubkey = hexPubkey;
          this.isReady = true;
          return hexPubkey;
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
        hasData: !!result.data,
        hasExtra: !!result.extra,
        extraKeys: result.extra ? Object.keys(result.extra) : []
      });

      if (result.resultCode === IntentLauncher.ResultCode.Success) {
        // Extract signature from Activity Result
        // result.extra contains the object with response data
        const signature =
          result.extra?.signature ||   // Direct signature field
          result.extra?.result ||      // Result field
          result.data;                 // Fallback: data as plain string

        // If result.extra.event exists, try to parse it
        let signedEvent = null;
        if (result.extra?.event) {
          try {
            signedEvent = typeof result.extra.event === 'string' ?
              JSON.parse(result.extra.event) : result.extra.event;
          } catch (e) {
            console.warn('[Amber] Failed to parse event:', e);
          }
        }

        const sig = signature || signedEvent?.sig;

        console.log('[Amber DEBUG] Extracted signature from:',
          result.extra?.signature ? 'extra.signature' :
          result.extra?.result ? 'extra.result' :
          signedEvent?.sig ? 'extra.event.sig' :
          result.data ? 'data string' : 'NONE'
        );
        console.log('[Amber DEBUG] Signature value:', sig ? sig.substring(0, 20) + '...' : 'NONE');

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
        hasData: !!result.data,
        hasExtra: !!result.extra,
        extraKeys: result.extra ? Object.keys(result.extra) : []
      });

      if (result.resultCode === IntentLauncher.ResultCode.Success) {
        const encrypted =
          result.extra?.result ||   // Result in extras object
          result.data;              // Fallback: data as plain string

        console.log('[Amber DEBUG] Encrypted content from:',
          result.extra?.result ? 'extra.result' :
          result.data ? 'data string' : 'NONE'
        );

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
        hasData: !!result.data,
        hasExtra: !!result.extra,
        extraKeys: result.extra ? Object.keys(result.extra) : []
      });

      if (result.resultCode === IntentLauncher.ResultCode.Success) {
        const decrypted =
          result.extra?.result ||   // Result in extras object
          result.data;              // Fallback: data as plain string

        console.log('[Amber DEBUG] Decrypted content from:',
          result.extra?.result ? 'extra.result' :
          result.data ? 'data string' : 'NONE'
        );

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

  /**
   * Ensure pubkey is in hex format and properly padded to 64 characters
   * Handles npub decoding and fixes unpadded hex strings from Amber
   */
  private async ensureHexPubkey(pubkey: string): Promise<string> {
    let hexPubkey = pubkey;

    // If it's an npub, decode it to hex
    if (pubkey.startsWith('npub')) {
      try {
        const { nip19 } = await import('nostr-tools');
        const decoded = nip19.decode(pubkey);
        hexPubkey = decoded.data as string;
        console.log('[Amber] Decoded npub to hex');
      } catch (error) {
        console.error('[Amber] Failed to decode npub:', error);
        throw new Error('Invalid npub format');
      }
    }

    // Ensure hex string is exactly 64 characters (32 bytes)
    // Amber sometimes returns 63-character hex strings missing leading zero
    if (hexPubkey.length === 63) {
      hexPubkey = '0' + hexPubkey;
      console.log('[Amber] Padded hex pubkey from 63 to 64 characters');
    } else if (hexPubkey.length < 64) {
      // Pad with leading zeros to reach 64 characters
      hexPubkey = hexPubkey.padStart(64, '0');
      console.log(`[Amber] Padded hex pubkey from ${pubkey.length} to 64 characters`);
    } else if (hexPubkey.length > 64) {
      console.error('[Amber] Invalid pubkey length:', hexPubkey.length);
      throw new Error(`Invalid pubkey length: ${hexPubkey.length}`);
    }

    // Validate it's valid hex
    if (!/^[0-9a-fA-F]{64}$/.test(hexPubkey)) {
      console.error('[Amber] Invalid hex format:', hexPubkey.slice(0, 20) + '...');
      throw new Error('Invalid hex pubkey format');
    }

    return hexPubkey;
  }

  cleanup(): void {
    // No cleanup needed for Activity Result-based communication
  }
}