/**
 * NutZap Service - Simplified facade over WalletCore + WalletSync
 * Offline-first, single wallet per user, no blocking Nostr dependencies
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateNsec } from '../../utils/nostr';
import { decryptNsec } from '../../utils/nostrAuth';
import WalletCore, { Transaction } from './WalletCore';
import WalletSync from './WalletSync';
import { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import UnifiedSigningService from '../auth/UnifiedSigningService';

const STORAGE_KEYS = {
  USER_NSEC: '@runstr:user_nsec',
} as const;

interface WalletState {
  balance: number;
  mint: string;
  proofs: any[];
  pubkey: string;
  created: boolean;
}

/**
 * Simplified NutZap Service - Delegates to WalletCore and WalletSync
 */
class NutzapService {
  private static instance: NutzapService;
  private userPubkey: string = '';
  private isInitialized = false;

  private constructor() {}

  static getInstance(): NutzapService {
    if (!NutzapService.instance) {
      NutzapService.instance = new NutzapService();
    }
    return NutzapService.instance;
  }

  /**
   * Initialize wallet - with Nostr restoration
   * ✅ FIXED: Now restores from Nostr instead of creating duplicates
   * Supports both nsec and Amber authentication
   */
  async initialize(nsec?: string, quickResume: boolean = false): Promise<WalletState> {
    try {
      console.log('[NutZap] ========================================');
      console.log('[NutZap] Initializing wallet with Nostr fallback');
      console.log('[NutZap] ========================================');

      // Check authentication method
      const authMethod = await UnifiedSigningService.getAuthMethod();

      if (authMethod === 'amber') {
        console.log('[NutZap] Detected Amber authentication - using receive-only mode');
        return await this.initializeAmberMode();
      }

      // Continue with nsec flow for direct authentication
      // Get nsec from parameter or storage
      let userNsec = nsec;
      if (!userNsec) {
        userNsec = (await this.getUserNsec()) || undefined;
        if (!userNsec) {
          console.log('[NutZap] No nsec found - user must authenticate');
          return {
            balance: 0,
            mint: 'https://mint.coinos.io',
            proofs: [],
            pubkey: 'unknown',
            created: false
          };
        }
      }

      // Validate nsec
      if (!validateNsec(userNsec)) {
        console.error('[NutZap] Invalid nsec format');
        return {
          balance: 0,
          mint: 'https://mint.coinos.io',
          proofs: [],
          pubkey: 'unknown',
          created: false
        };
      }

      // Get pubkey from nsec
      const signer = new NDKPrivateKeySigner(userNsec);
      this.userPubkey = await signer.user().then(u => u.pubkey);

      console.log('[NutZap] User pubkey:', this.userPubkey.slice(0, 16) + '...');

      // ✅ CRITICAL: Initialize WalletCore - will restore from Nostr if no local wallet
      console.log('[NutZap] Calling WalletCore.initialize()...');
      const walletState = await WalletCore.initialize(this.userPubkey);

      console.log('[NutZap] WalletCore initialized:', {
        balance: walletState.balance,
        proofs: walletState.proofs.length,
        mint: walletState.mint
      });

      // Check if wallet was restored or is new
      const wasRestored = walletState.proofs.length > 0;

      if (wasRestored) {
        console.log('[NutZap] ✅ EXISTING WALLET FOUND');
        console.log('[NutZap] ✅ Balance:', walletState.balance, 'sats');
        console.log('[NutZap] ✅ Proofs:', walletState.proofs.length);
        console.log('[NutZap] ✅ NO NEW WALLET CREATED');
      } else {
        console.log('[NutZap] ℹ️  No existing wallet found');
        console.log('[NutZap] ℹ️  Empty wallet state returned');
        console.log('[NutZap] ⚠️  If you see this but expected a wallet, check Nostr connection');
      }

      // Initialize WalletSync in background (non-blocking)
      // WalletSync now uses UnifiedSigningService internally
      WalletSync.initialize(this.userPubkey).catch(err =>
        console.warn('[NutZap] Background sync init failed:', err)
      );

      this.isInitialized = true;
      console.log('[NutZap] ========================================');

      return {
        balance: walletState.balance,
        mint: walletState.mint,
        proofs: walletState.proofs,
        pubkey: walletState.pubkey,
        created: false
      };

    } catch (error) {
      console.error('[NutZap] Initialization error:', error);
      return {
        balance: 0,
        mint: 'https://mint.coinos.io',
        proofs: [],
        pubkey: this.userPubkey || 'unknown',
        created: false
      };
    }
  }

  /**
   * Initialize in Amber mode (receive-only)
   * Amber users cannot send zaps due to private key requirements
   */
  private async initializeAmberMode(): Promise<WalletState> {
    try {
      console.log('[NutZap] Initializing in Amber mode (receive-only)...');

      // Get pubkey from UnifiedSigningService
      const hexPubkey = await UnifiedSigningService.getUserPubkey();
      if (!hexPubkey) {
        throw new Error('Failed to get pubkey from Amber');
      }

      this.userPubkey = hexPubkey;

      // Initialize WalletCore (offline-first)
      const walletState = await WalletCore.initialize(hexPubkey);

      // Initialize WalletSync WITHOUT nsec (uses UnifiedSigningService)
      WalletSync.initialize(hexPubkey).catch(err =>
        console.warn('[NutZap] Background sync init failed:', err)
      );

      this.isInitialized = true;
      console.log('[NutZap] Amber wallet initialized (receive-only)');

      return {
        balance: walletState.balance,
        mint: walletState.mint,
        proofs: walletState.proofs,
        pubkey: walletState.pubkey,
        created: false
      };
    } catch (error) {
      console.error('[NutZap] Amber initialization error:', error);
      throw error;
    }
  }

  /**
   * Initialize for receive-only mode (Amber users)
   */
  async initializeForReceiveOnly(hexPubkey: string): Promise<{ created: boolean; address?: string }> {
    try {
      console.log('[NutZap] Initializing for receive-only mode...');

      this.userPubkey = hexPubkey;

      // Initialize core wallet
      await WalletCore.initialize(hexPubkey);

      return {
        created: false,
        address: `${hexPubkey.slice(0, 8)}...@nutzap`
      };
    } catch (error) {
      console.error('[NutZap] Receive-only init error:', error);
      throw error;
    }
  }

  /**
   * Send nutzap
   * Works with both nsec (direct signing) and Amber (external signer)
   * Amber users will be prompted to approve the nutzap event signature
   */
  async sendNutzap(
    recipientPubkey: string,
    amount: number,
    memo: string = ''
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: 'Wallet not initialized' };
      }

      // Verify signing capability (works for both nsec and Amber)
      const canSign = await UnifiedSigningService.canSign();
      if (!canSign) {
        return {
          success: false,
          error: 'No signing capability available. Please ensure you are properly authenticated.'
        };
      }

      // Send via WalletCore (creates token and deducts balance)
      const result = await WalletCore.sendNutzap(recipientPubkey, amount, memo);

      if (result.success && result.token) {
        // Publish nutzap to Nostr (NIP-61)
        try {
          const WalletSync = require('./WalletSync').default;
          await WalletSync.publishNutzap(recipientPubkey, amount, result.token, memo);
          console.log(`[NutZap] Sent ${amount} sats and published to Nostr`);
        } catch (publishError) {
          // Token already created and balance deducted, just log the publish error
          console.warn('[NutZap] Failed to publish to Nostr, but token created:', publishError);
        }
      }

      return result;

    } catch (error: any) {
      console.error('[NutZap] Send error:', error);
      return {
        success: false,
        error: error.message || 'Send failed'
      };
    }
  }

  /**
   * Claim incoming nutzaps
   */
  async claimNutzaps(): Promise<{ claimed: number; total: number }> {
    try {
      if (!this.isInitialized) {
        return { claimed: 0, total: 0 };
      }

      // Claim via WalletSync
      return await WalletSync.claimNutzaps();

    } catch (error: any) {
      console.error('[NutZap] Claim error:', error);
      return { claimed: 0, total: 0 };
    }
  }

  /**
   * Get balance
   */
  async getBalance(): Promise<number> {
    return await WalletCore.getBalance();
  }

  /**
   * Create Lightning invoice
   */
  async createLightningInvoice(amount: number, memo: string = ''): Promise<{ pr: string; hash: string }> {
    try {
      if (!this.isInitialized) {
        throw new Error('Wallet not initialized');
      }

      const result = await WalletCore.createLightningInvoice(amount, memo);

      if (result.error) {
        throw new Error(result.error);
      }

      return { pr: result.pr, hash: result.hash };

    } catch (error: any) {
      console.error('[NutZap] Create invoice error:', error);
      throw error;
    }
  }

  /**
   * Check if invoice was paid
   */
  async checkInvoicePaid(quoteHash: string): Promise<boolean> {
    try {
      return await WalletCore.checkInvoicePaid(quoteHash);
    } catch (error) {
      console.error('[NutZap] Check payment error:', error);
      return false;
    }
  }

  /**
   * Pay Lightning invoice
   */
  async payLightningInvoice(invoice: string): Promise<{ success: boolean; fee?: number; error?: string }> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: 'Wallet not initialized' };
      }

      return await WalletCore.payLightningInvoice(invoice);

    } catch (error: any) {
      console.error('[NutZap] Payment error:', error);
      return { success: false, error: error.message || 'Payment failed' };
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit: number = 50): Promise<Transaction[]> {
    try {
      return await WalletCore.getTransactionHistory(limit);
    } catch (error) {
      console.error('[NutZap] History error:', error);
      return [];
    }
  }

  /**
   * Clear wallet
   */
  async clearWallet(): Promise<void> {
    await WalletCore.clearWallet();
    WalletSync.reset();
    this.isInitialized = false;
  }

  /**
   * Reset service
   */
  reset(): void {
    WalletCore.reset();
    WalletSync.reset();
    this.userPubkey = '';
    this.isInitialized = false;
  }

  /**
   * Get user nsec from storage
   */
  private async getUserNsec(): Promise<string | null> {
    // Try plain nsec first
    const plainNsec = await AsyncStorage.getItem(STORAGE_KEYS.USER_NSEC);
    if (plainNsec && validateNsec(plainNsec)) {
      return plainNsec;
    }

    // Try encrypted nsec
    const encryptedNsec = await AsyncStorage.getItem('@runstr:nsec_encrypted');
    if (encryptedNsec) {
      try {
        const npub = await AsyncStorage.getItem('@runstr:npub');
        if (npub) {
          const nsec = decryptNsec(encryptedNsec, npub);
          if (validateNsec(nsec)) {
            return nsec;
          }
        }
      } catch (error) {
        console.error('[NutZap] Failed to decrypt nsec:', error);
      }
    }

    return null;
  }
}

// Export singleton
export default NutzapService.getInstance();
