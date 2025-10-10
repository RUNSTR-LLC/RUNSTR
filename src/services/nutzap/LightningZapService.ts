/**
 * LightningZapService - NIP-57 Lightning Zaps
 * Sends Bitcoin to recipient's Lightning address (lud16)
 * Simple implementation with fallback to nutzaps
 */

import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { NostrProfileService } from '../nostr/NostrProfileService';
import { UnifiedSigningService } from '../auth/UnifiedSigningService';
import { WalletCore } from './WalletCore';
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LightningZapResult {
  success: boolean;
  method: 'lightning' | 'nutzap' | 'none';
  error?: string;
  invoice?: string;
  fee?: number;
}

interface LnurlPayDetails {
  callback: string;
  minSendable: number;
  maxSendable: number;
  metadata: string;
  tag: string;
  allowsNostr?: boolean;
}

/**
 * Lightning Zap Service
 * Implements NIP-57 Lightning zaps to recipient's Lightning address
 */
class LightningZapService {
  private static instance: LightningZapService;
  private profileService: NostrProfileService;

  private constructor() {
    this.profileService = new NostrProfileService();
  }

  static getInstance(): LightningZapService {
    if (!LightningZapService.instance) {
      LightningZapService.instance = new LightningZapService();
    }
    return LightningZapService.instance;
  }

  /**
   * Send Lightning zap to recipient
   * Returns success: false if no lud16 (caller should fallback to nutzap)
   */
  async sendLightningZap(
    recipientPubkey: string,
    amount: number,
    memo: string = ''
  ): Promise<LightningZapResult> {
    try {
      console.log(`[LightningZap] Attempting to send ${amount} sats to ${recipientPubkey.slice(0, 8)}...`);

      // Step 1: Get Lightning address from profile
      const lud16 = await this.getLightningAddress(recipientPubkey);
      if (!lud16) {
        console.log('[LightningZap] No Lightning address found, fallback to nutzap');
        return { success: false, method: 'none', error: 'No Lightning address' };
      }

      console.log(`[LightningZap] Found Lightning address: ${lud16}`);

      // Step 2: Fetch LNURL details
      const lnurlDetails = await this.fetchLnurlDetails(lud16);
      if (!lnurlDetails || !lnurlDetails.callback) {
        console.log('[LightningZap] Failed to fetch LNURL details');
        return { success: false, method: 'none', error: 'LNURL fetch failed' };
      }

      console.log('[LightningZap] LNURL details fetched:', lnurlDetails.callback);

      // Step 3: Create NIP-57 zap request
      const zapRequest = await this.createZapRequest(recipientPubkey, amount, memo);
      if (!zapRequest) {
        console.log('[LightningZap] Failed to create zap request');
        return { success: false, method: 'none', error: 'Zap request creation failed' };
      }

      console.log('[LightningZap] Zap request created:', zapRequest.id?.slice(0, 16) + '...');

      // Step 4: Get Lightning invoice from LNURL callback
      const invoice = await this.getInvoice(lnurlDetails.callback, amount, zapRequest);
      if (!invoice) {
        console.log('[LightningZap] Failed to get invoice');
        return { success: false, method: 'none', error: 'Invoice generation failed' };
      }

      console.log('[LightningZap] Invoice received:', invoice.slice(0, 40) + '...');

      // Step 5: Pay Lightning invoice
      const walletCore = WalletCore.getInstance();
      const paymentResult = await walletCore.payLightningInvoice(invoice);

      if (paymentResult.success) {
        console.log(`[LightningZap] ✅ Successfully sent ${amount} sats via Lightning`);
        return {
          success: true,
          method: 'lightning',
          invoice,
          fee: paymentResult.fee,
        };
      } else {
        console.log('[LightningZap] Payment failed:', paymentResult.error);
        return {
          success: false,
          method: 'none',
          error: paymentResult.error || 'Payment failed',
        };
      }
    } catch (error) {
      console.log('[LightningZap] Error:', error);
      return {
        success: false,
        method: 'none',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get Lightning address (lud16) from recipient's Nostr profile
   */
  private async getLightningAddress(pubkey: string): Promise<string | null> {
    try {
      const profile = await this.profileService.getProfile(pubkey);

      // Try lud16 first (Lightning address format)
      if (profile?.lud16) {
        return profile.lud16.trim();
      }

      // Fallback to lud06 (LNURL format)
      if (profile?.lud06) {
        return profile.lud06.trim();
      }

      return null;
    } catch (error) {
      console.log('[LightningZap] Error fetching profile:', error);
      return null;
    }
  }

  /**
   * Fetch LNURL-Pay details from Lightning address
   * Handles both name@domain format and LNURL bech32 format
   */
  private async fetchLnurlDetails(lud: string): Promise<LnurlPayDetails | null> {
    try {
      let lnurlPayUrl: string;

      // Check if it's Lightning address format (name@domain)
      if (lud.includes('@')) {
        const [name, domain] = lud.split('@');
        lnurlPayUrl = `https://${domain}/.well-known/lnurlp/${name}`;
      } else if (lud.toLowerCase().startsWith('lnurl')) {
        // LNURL bech32 format - decode it
        lnurlPayUrl = this.decodeLnurl(lud);
        if (!lnurlPayUrl) {
          console.log('[LightningZap] Failed to decode LNURL');
          return null;
        }
      } else {
        console.log('[LightningZap] Invalid Lightning address format:', lud);
        return null;
      }

      console.log('[LightningZap] Fetching LNURL from:', lnurlPayUrl);

      // Fetch with 5 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(lnurlPayUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('[LightningZap] LNURL fetch failed:', response.status);
        return null;
      }

      const details = await response.json();
      return details;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[LightningZap] LNURL fetch timeout');
      } else {
        console.log('[LightningZap] Error fetching LNURL:', error);
      }
      return null;
    }
  }

  /**
   * Decode LNURL bech32 to https URL
   */
  private decodeLnurl(lnurl: string): string {
    try {
      // Simple bech32 decode - convert to buffer then to string
      // For production, you might want a proper bech32 library
      // For now, we mainly support lud16 (name@domain) format
      console.warn('[LightningZap] LNURL bech32 decode not fully implemented, use lud16 format');
      return '';
    } catch (error) {
      console.log('[LightningZap] LNURL decode error:', error);
      return '';
    }
  }

  /**
   * Create NIP-57 zap request event (kind 9734)
   */
  private async createZapRequest(
    recipientPubkey: string,
    amount: number,
    memo: string
  ): Promise<NDKEvent | null> {
    try {
      const ndk = await GlobalNDKService.getInstance();
      const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');

      if (!hexPubkey) {
        console.log('[LightningZap] No user pubkey found');
        return null;
      }

      // Create unsigned zap request
      const zapRequest = new NDKEvent(ndk);
      zapRequest.kind = 9734 as NDKKind;
      zapRequest.content = memo;
      zapRequest.tags = [
        ['p', recipientPubkey],
        ['amount', (amount * 1000).toString()], // Convert sats to millisats
        ['relays', 'wss://relay.damus.io', 'wss://nos.lol'],
      ];
      zapRequest.pubkey = hexPubkey;
      zapRequest.created_at = Math.floor(Date.now() / 1000);

      // Sign the zap request
      const signingService = UnifiedSigningService.getInstance();
      const signedEvent = await signingService.signEvent(zapRequest);

      if (!signedEvent) {
        console.log('[LightningZap] Failed to sign zap request');
        return null;
      }

      return signedEvent;
    } catch (error) {
      console.log('[LightningZap] Error creating zap request:', error);
      return null;
    }
  }

  /**
   * Get Lightning invoice from LNURL callback
   */
  private async getInvoice(
    callbackUrl: string,
    amount: number,
    zapRequest: NDKEvent
  ): Promise<string | null> {
    try {
      // Encode zap request to base64
      const zapRequestB64 = this.base64EncodeJson({
        id: zapRequest.id,
        pubkey: zapRequest.pubkey,
        created_at: zapRequest.created_at || Math.floor(Date.now() / 1000),
        kind: zapRequest.kind,
        tags: zapRequest.tags,
        content: zapRequest.content,
        sig: zapRequest.sig,
      });

      // Build callback URL with parameters
      const url = new URL(callbackUrl);
      url.searchParams.set('amount', (amount * 1000).toString()); // millisats
      url.searchParams.set('nostr', zapRequestB64);

      console.log('[LightningZap] Calling LNURL callback...');

      // Fetch invoice with 5 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('[LightningZap] Invoice callback failed:', response.status);
        return null;
      }

      const data = await response.json();

      if (!data.pr) {
        console.log('[LightningZap] No invoice in response');
        return null;
      }

      return data.pr;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[LightningZap] Invoice fetch timeout');
      } else {
        console.log('[LightningZap] Error getting invoice:', error);
      }
      return null;
    }
  }

  /**
   * Base64 encode JSON object
   */
  private base64EncodeJson(obj: any): string {
    const json = JSON.stringify(obj);
    // React Native compatible base64 encoding
    return btoa(unescape(encodeURIComponent(json)));
  }
}

export default LightningZapService.getInstance();
