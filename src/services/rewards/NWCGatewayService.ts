/**
 * @deprecated - This service is DEPRECATED as of v3 architecture migration
 *
 * NWCGatewayService (DEPRECATED)
 *
 * NWC operations have been moved to a separate external reward service.
 * NWC credentials are NO LONGER stored in Supabase (security risk).
 *
 * NEW ARCHITECTURE (v3):
 * - External service monitors kind 1301 events
 * - External service holds NWC credentials (isolated, not in Supabase)
 * - External service sends 50 sats based on reward_destination tag
 * - App never interacts with NWC directly
 *
 * MIGRATION:
 * - Remove all direct calls to NWCGatewayService
 * - Hide in-app zap buttons (direct donations)
 * - Users can still zap via external wallets using lightning addresses in profiles
 *
 * This file is kept for reference but should not be imported.
 *
 * === ORIGINAL DOCUMENTATION (for reference) ===
 * Wrapped Supabase edge function calls for NWC operations.
 * Operations: pay_invoice, create_invoice, lookup_invoice, get_balance
 */

import { supabase } from '../../utils/supabase';

// ============================================
// Response Types
// ============================================

export interface PayInvoiceResult {
  success: boolean;
  preimage?: string;
  error?: string;
}

export interface CreateInvoiceResult {
  success: boolean;
  invoice?: string;
  payment_hash?: string;
  error?: string;
}

export interface LookupInvoiceResult {
  success: boolean;
  settled?: boolean;
  settled_at?: number;
  amount?: number;
  error?: string;
}

export interface GetBalanceResult {
  success: boolean;
  balance?: number;
  error?: string;
}

export interface RegisterDonationResult {
  success: boolean;
  donation_id?: string;
  payment_hash?: string;
  error?: string;
}

// ============================================
// NWC Gateway Service
// ============================================

class NWCGatewayServiceClass {
  private static instance: NWCGatewayServiceClass;

  private constructor() {
    console.log('[NWCGateway] Service initialized');
  }

  static getInstance(): NWCGatewayServiceClass {
    if (!NWCGatewayServiceClass.instance) {
      NWCGatewayServiceClass.instance = new NWCGatewayServiceClass();
    }
    return NWCGatewayServiceClass.instance;
  }

  /**
   * Pay a Lightning invoice
   * Used for: donation splits, season payouts, challenge rewards
   */
  async payInvoice(invoice: string): Promise<PayInvoiceResult> {
    try {
      if (!supabase) {
        console.error('[NWCGateway] Supabase not configured');
        return { success: false, error: 'Supabase not configured' };
      }

      console.log('[NWCGateway] Paying invoice...');

      const { data, error } = await supabase.functions.invoke('claim-reward', {
        body: {
          operation: 'pay_invoice',
          invoice,
        },
      });

      if (error) {
        console.error('[NWCGateway] Pay invoice error:', error);
        return { success: false, error: error.message };
      }

      console.log('[NWCGateway] Pay invoice result:', data?.success);
      return {
        success: data?.success ?? false,
        preimage: data?.preimage,
        error: data?.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[NWCGateway] Pay invoice exception:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Create an invoice for receiving payments
   * Used for: charity donations (user pays into app wallet)
   */
  async createInvoice(
    amountSats: number,
    description?: string
  ): Promise<CreateInvoiceResult> {
    try {
      if (!supabase) {
        console.error('[NWCGateway] Supabase not configured');
        return { success: false, error: 'Supabase not configured' };
      }

      console.log('[NWCGateway] Creating invoice for', amountSats, 'sats');

      const { data, error } = await supabase.functions.invoke('claim-reward', {
        body: {
          operation: 'create_invoice',
          amount_sats: amountSats,
          description: description || 'RUNSTR Payment',
        },
      });

      if (error) {
        console.error('[NWCGateway] Create invoice error:', error);
        return { success: false, error: error.message };
      }

      console.log('[NWCGateway] Invoice created:', data?.success);
      return {
        success: data?.success ?? false,
        invoice: data?.invoice,
        payment_hash: data?.payment_hash,
        error: data?.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[NWCGateway] Create invoice exception:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Look up an invoice by payment hash to check if it's been paid
   * Used for: verifying charity donations
   */
  async lookupInvoice(paymentHash: string): Promise<LookupInvoiceResult> {
    try {
      if (!supabase) {
        console.error('[NWCGateway] Supabase not configured');
        return { success: false, error: 'Supabase not configured' };
      }

      console.log('[NWCGateway] Looking up invoice:', paymentHash.slice(0, 16) + '...');

      const { data, error } = await supabase.functions.invoke('claim-reward', {
        body: {
          operation: 'lookup_invoice',
          payment_hash: paymentHash,
        },
      });

      if (error) {
        console.error('[NWCGateway] Lookup invoice error:', error);
        return { success: false, error: error.message };
      }

      return {
        success: data?.success ?? false,
        settled: data?.settled,
        settled_at: data?.settled_at,
        amount: data?.amount,
        error: data?.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[NWCGateway] Lookup invoice exception:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Get the wallet balance
   * Used for: monitoring prize pool balance
   */
  async getBalance(): Promise<GetBalanceResult> {
    try {
      if (!supabase) {
        console.error('[NWCGateway] Supabase not configured');
        return { success: false, error: 'Supabase not configured' };
      }

      console.log('[NWCGateway] Getting balance...');

      const { data, error } = await supabase.functions.invoke('claim-reward', {
        body: {
          operation: 'get_balance',
        },
      });

      if (error) {
        console.error('[NWCGateway] Get balance error:', error);
        return { success: false, error: error.message };
      }

      console.log('[NWCGateway] Balance:', data?.balance);
      return {
        success: data?.success ?? false,
        balance: data?.balance,
        error: data?.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[NWCGateway] Get balance exception:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Register a pending donation for server-side auto-forwarding
   * Used for: tracking charity donations that need to be forwarded
   * The process-donations cron will check for settlements and forward to charity
   */
  async registerDonation(params: {
    paymentHash: string;
    charityId: string;
    charityLightningAddress: string;
    amountSats: number;
    description?: string;
  }): Promise<RegisterDonationResult> {
    try {
      if (!supabase) {
        console.error('[NWCGateway] Supabase not configured');
        return { success: false, error: 'Supabase not configured' };
      }

      console.log(
        '[NWCGateway] Registering donation:',
        params.amountSats,
        'sats to',
        params.charityId
      );

      const { data, error } = await supabase.functions.invoke('claim-reward', {
        body: {
          operation: 'register_donation',
          payment_hash: params.paymentHash,
          charity_id: params.charityId,
          charity_lightning_address: params.charityLightningAddress,
          amount_sats: params.amountSats,
          description: params.description,
        },
      });

      if (error) {
        console.error('[NWCGateway] Register donation error:', error);
        return { success: false, error: error.message };
      }

      console.log('[NWCGateway] Donation registered:', data?.success);
      return {
        success: data?.success ?? false,
        donation_id: data?.donation_id,
        payment_hash: data?.payment_hash,
        error: data?.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[NWCGateway] Register donation exception:', error);
      return { success: false, error: errorMsg };
    }
  }
}

// Export singleton instance
export const NWCGatewayService = NWCGatewayServiceClass.getInstance();
export default NWCGatewayService;
