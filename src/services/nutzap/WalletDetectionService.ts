/**
 * WalletDetectionService - Deterministic NIP-60 Wallet Detection
 *
 * Queries Nostr for RUNSTR-specific wallet using deterministic d-tag
 * NO auto-creation - only detects existing wallets
 * Works identically for nsec and Amber users (no decryption needed)
 */

import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import { GlobalNDKService } from '../nostr/GlobalNDKService';

// RUNSTR-specific wallet identifier (deterministic per user)
export const RUNSTR_WALLET_DTAG = 'runstr-primary-wallet';
export const RUNSTR_WALLET_NAME = 'RUNSTR Zap Wallet';

export interface WalletInfo {
  exists: boolean;
  balance: number;
  mint: string;
  name: string;
  eventId: string;
  createdAt: number;
  dTag: string;
}

export interface WalletDetectionResult {
  found: boolean;
  walletInfo: WalletInfo | null;
  error: string | null;
}

/**
 * Service for detecting existing RUNSTR wallets on Nostr
 * Uses deterministic d-tag to always find the same wallet
 */
class WalletDetectionService {
  private static instance: WalletDetectionService;

  private constructor() {}

  static getInstance(): WalletDetectionService {
    if (!WalletDetectionService.instance) {
      WalletDetectionService.instance = new WalletDetectionService();
    }
    return WalletDetectionService.instance;
  }

  /**
   * Find RUNSTR wallet for user (deterministic via d-tag)
   * Returns wallet info if found, null if not found
   * NO decryption needed - reads from public tags
   */
  async findRunstrWallet(hexPubkey: string): Promise<WalletDetectionResult> {
    try {
      console.log('[WalletDetection] Searching for RUNSTR wallet...');
      console.log('[WalletDetection] User pubkey:', hexPubkey.slice(0, 16) + '...');
      console.log('[WalletDetection] Looking for d-tag:', RUNSTR_WALLET_DTAG);

      const ndk = await GlobalNDKService.getInstance();

      // Query for RUNSTR-specific wallet (kind 37375 with our d-tag)
      const filter = {
        kinds: [37375 as NDKKind],
        authors: [hexPubkey],
        '#d': [RUNSTR_WALLET_DTAG], // Deterministic - only 0 or 1 result
        limit: 1
      };

      console.log('[WalletDetection] Querying Nostr relays...');

      // Query with 10s timeout (reasonable for Nostr)
      const events = await Promise.race([
        ndk.fetchEvents(filter),
        new Promise<Set<NDKEvent>>((resolve) =>
          setTimeout(() => {
            console.warn('[WalletDetection] Query timeout (10s)');
            resolve(new Set());
          }, 10000)
        )
      ]);

      if (events.size === 0) {
        console.log('[WalletDetection] ❌ No RUNSTR wallet found');
        console.log('[WalletDetection] User needs to create wallet');
        return {
          found: false,
          walletInfo: null,
          error: null
        };
      }

      // Parse wallet info from event
      const event = Array.from(events)[0];
      const walletInfo = this.parseWalletEvent(event);

      console.log('[WalletDetection] ✅ RUNSTR wallet found!');
      console.log('[WalletDetection] Event ID:', walletInfo.eventId.slice(0, 16) + '...');
      console.log('[WalletDetection] Balance:', walletInfo.balance, 'sats');
      console.log('[WalletDetection] Mint:', walletInfo.mint);
      console.log('[WalletDetection] Created:', new Date(walletInfo.createdAt * 1000).toLocaleString());

      return {
        found: true,
        walletInfo,
        error: null
      };

    } catch (error) {
      console.error('[WalletDetection] Query failed:', error);
      return {
        found: false,
        walletInfo: null,
        error: error instanceof Error ? error.message : 'Query failed'
      };
    }
  }

  /**
   * Parse wallet info from kind 37375 event
   * Reads public tags - no decryption needed
   */
  private parseWalletEvent(event: NDKEvent): WalletInfo {
    const dTag = event.tags.find(t => t[0] === 'd')?.[1] || '';
    const nameTag = event.tags.find(t => t[0] === 'name')?.[1] || 'Unknown Wallet';
    const mintTag = event.tags.find(t => t[0] === 'mint')?.[1] || 'https://mint.coinos.io';
    const balanceTag = event.tags.find(t => t[0] === 'balance')?.[1];

    // Parse balance from tag (public, no decryption)
    let balance = 0;
    if (balanceTag) {
      balance = parseInt(balanceTag);
      if (isNaN(balance)) {
        console.warn('[WalletDetection] Invalid balance tag:', balanceTag);
        balance = 0;
      }
    }

    return {
      exists: true,
      balance,
      mint: mintTag,
      name: nameTag,
      eventId: event.id,
      createdAt: event.created_at || 0,
      dTag
    };
  }

  /**
   * Check if RUNSTR wallet exists (quick check)
   * Returns true/false without full wallet info
   */
  async walletExists(hexPubkey: string): Promise<boolean> {
    const result = await this.findRunstrWallet(hexPubkey);
    return result.found;
  }

  /**
   * Get balance from RUNSTR wallet (if exists)
   * Returns balance or 0 if wallet not found
   */
  async getBalance(hexPubkey: string): Promise<number> {
    const result = await this.findRunstrWallet(hexPubkey);
    return result.walletInfo?.balance || 0;
  }
}

export default WalletDetectionService.getInstance();
