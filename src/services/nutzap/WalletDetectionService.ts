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
   *
   * ✅ BACKWARDS COMPATIBLE: Falls back to ANY wallet if standard d-tag not found
   */
  async findRunstrWallet(hexPubkey: string): Promise<WalletDetectionResult> {
    try {
      console.log('[WalletDetection] Searching for RUNSTR wallet...');
      console.log('[WalletDetection] User pubkey:', hexPubkey.slice(0, 16) + '...');
      console.log('[WalletDetection] Looking for d-tag:', RUNSTR_WALLET_DTAG);

      const ndk = await GlobalNDKService.getInstance();

      // STEP 1: Try to find wallet with standard d-tag (preferred)
      const standardFilter = {
        kinds: [37375 as NDKKind],
        authors: [hexPubkey],
        '#d': [RUNSTR_WALLET_DTAG], // Deterministic - only 0 or 1 result
        limit: 1
      };

      console.log('[WalletDetection] Querying for standard wallet...');

      // Query with 10s timeout (reasonable for Nostr)
      const standardEvents = await Promise.race([
        ndk.fetchEvents(standardFilter),
        new Promise<Set<NDKEvent>>((resolve) =>
          setTimeout(() => {
            console.warn('[WalletDetection] Query timeout (10s)');
            resolve(new Set());
          }, 10000)
        )
      ]);

      if (standardEvents.size > 0) {
        // Found wallet with standard d-tag!
        const event = Array.from(standardEvents)[0];
        const walletInfo = this.parseWalletEvent(event);

        console.log('[WalletDetection] ✅ Standard RUNSTR wallet found!');
        console.log('[WalletDetection] Event ID:', walletInfo.eventId.slice(0, 16) + '...');
        console.log('[WalletDetection] Balance:', walletInfo.balance, 'sats');
        console.log('[WalletDetection] Mint:', walletInfo.mint);
        console.log('[WalletDetection] Created:', new Date(walletInfo.createdAt * 1000).toLocaleString());

        return {
          found: true,
          walletInfo,
          error: null
        };
      }

      // STEP 2: Fallback - find ANY wallet for this user (backwards compatibility)
      console.log('[WalletDetection] No standard wallet found, searching for legacy wallets...');

      const legacyFilter = {
        kinds: [37375 as NDKKind],
        authors: [hexPubkey],
        limit: 10  // Get multiple wallets, we'll pick the most recent
      };

      const legacyEvents = await Promise.race([
        ndk.fetchEvents(legacyFilter),
        new Promise<Set<NDKEvent>>((resolve) =>
          setTimeout(() => {
            console.warn('[WalletDetection] Legacy query timeout (10s)');
            resolve(new Set());
          }, 10000)
        )
      ]);

      if (legacyEvents.size === 0) {
        console.log('[WalletDetection] ❌ No wallets found (neither standard nor legacy)');
        console.log('[WalletDetection] User needs to create wallet');
        return {
          found: false,
          walletInfo: null,
          error: null
        };
      }

      // Pick most recent legacy wallet
      const sortedEvents = Array.from(legacyEvents).sort(
        (a, b) => (b.created_at || 0) - (a.created_at || 0)
      );
      const mostRecentEvent = sortedEvents[0];
      const walletInfo = this.parseWalletEvent(mostRecentEvent);

      console.log('[WalletDetection] ✅ Legacy wallet found (backwards compatibility)');
      console.log('[WalletDetection] Found', legacyEvents.size, 'legacy wallet(s), using most recent');
      console.log('[WalletDetection] Event ID:', walletInfo.eventId.slice(0, 16) + '...');
      console.log('[WalletDetection] d-tag:', walletInfo.dTag);
      console.log('[WalletDetection] Balance:', walletInfo.balance, 'sats');
      console.log('[WalletDetection] Mint:', walletInfo.mint);
      console.log('[WalletDetection] Created:', new Date(walletInfo.createdAt * 1000).toLocaleString());
      console.log('[WalletDetection] ⚠️  Recommend creating new wallet with standard d-tag for consistency');

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
