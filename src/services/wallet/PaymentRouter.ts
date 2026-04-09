/**
 * PaymentRouter - Routes payments via NWC
 *
 * ARCHITECTURE:
 * - Checks FEATURES.ENABLE_NWC_WALLET flag to determine payment method
 * - Routes to NWCWalletService (user's Lightning wallet)
 * - Provides unified interface for all payment operations
 *
 * USAGE:
 * Replace direct wallet calls with PaymentRouter in:
 * - LightningZapService
 * - nutzapService
 * - Any other payment flows
 */

import { FEATURES } from '../../config/features';
import { NWCWalletService } from './NWCWalletService';

export interface PaymentResult {
  success: boolean;
  fee?: number;
  error?: string;
  preimage?: string;
}

export interface InvoiceResult {
  success: boolean;
  invoice?: string;
  paymentHash?: string;
  error?: string;
}

export interface BalanceResult {
  balance: number;
  error?: string;
}

/**
 * Payment Router Service
 * Routes payments via NWC wallet based on feature flags
 */
export class PaymentRouter {
  /**
   * Pay Lightning invoice via NWC
   */
  static async payInvoice(
    invoice: string,
    amount?: number
  ): Promise<PaymentResult> {
    try {
      console.log('[PaymentRouter] Routing payment...', {
        nwcEnabled: FEATURES.ENABLE_NWC_WALLET,
      });

      if (FEATURES.ENABLE_NWC_WALLET) {
        // Route to NWC wallet (user's Lightning wallet)
        console.log('[PaymentRouter] → Using NWC wallet');
        const result = await NWCWalletService.sendPayment(invoice, amount);

        return {
          success: result.success,
          fee: result.fee,
          error: result.error,
          preimage: result.preimage,
        };
      } else {
        // No wallet enabled
        console.log('[PaymentRouter] No wallet enabled');
        return {
          success: false,
          error: 'No wallet enabled. Please configure a wallet in settings.',
        };
      }
    } catch (error) {
      console.error('[PaymentRouter] Payment routing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  /**
   * Create Lightning invoice for receiving payment via NWC
   */
  static async createInvoice(
    amountSats: number,
    description?: string,
    metadata?: any
  ): Promise<InvoiceResult> {
    try {
      console.log('[PaymentRouter] Creating invoice...', {
        amount: amountSats,
        nwcEnabled: FEATURES.ENABLE_NWC_WALLET,
      });

      if (FEATURES.ENABLE_NWC_WALLET) {
        // Route to NWC wallet
        console.log('[PaymentRouter] → Using NWC wallet for invoice');
        const result = await NWCWalletService.createInvoice(
          amountSats,
          description
        );

        return {
          success: result.success,
          invoice: result.invoice,
          paymentHash: result.paymentHash,
          error: result.error,
        };
      } else {
        return {
          success: false,
          error: 'No wallet enabled',
        };
      }
    } catch (error) {
      console.error('[PaymentRouter] Invoice creation error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Invoice creation failed',
      };
    }
  }

  /**
   * Get wallet balance via NWC
   */
  static async getBalance(): Promise<BalanceResult> {
    try {
      if (FEATURES.ENABLE_NWC_WALLET) {
        const result = await NWCWalletService.getBalance();
        return {
          balance: result.balance,
          error: result.error,
        };
      } else {
        return {
          balance: 0,
          error: 'No wallet enabled',
        };
      }
    } catch (error) {
      console.error('[PaymentRouter] Balance check error:', error);
      return {
        balance: 0,
        error: error instanceof Error ? error.message : 'Balance check failed',
      };
    }
  }

  /**
   * Check if wallet is available and configured
   */
  static async isWalletAvailable(): Promise<boolean> {
    try {
      if (FEATURES.ENABLE_NWC_WALLET) {
        return await NWCWalletService.isAvailable();
      }
      return false;
    } catch (error) {
      console.error('[PaymentRouter] Wallet availability check error:', error);
      return false;
    }
  }

  /**
   * Get active wallet type
   * Useful for UI to show which wallet is being used
   */
  static getActiveWalletType(): 'nwc' | 'none' {
    if (FEATURES.ENABLE_NWC_WALLET) {
      return 'nwc';
    }
    return 'none';
  }
}

export default PaymentRouter;
