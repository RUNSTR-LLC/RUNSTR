/**
 * NWCWalletService - Simplified Nostr Wallet Connect implementation
 *
 * Design principles:
 * - One attempt, one timeout - no retry logic
 * - Fail fast - 5 second timeout on most operations
 * - Never block UI - all operations async with short timeouts
 * - User controls retry - show error, user clicks to retry
 */

import { NWCClient } from '@getalby/sdk';
import { NWCStorageService } from './NWCStorageService';

// Timeouts (in milliseconds) - increased from v1.0.0 investigation
// Some relays (like Coinos) are slow but reliable
const TIMEOUT = {
  CONNECT: 15000,    // 15s for connection (was 5s)
  BALANCE: 15000,    // 15s for balance (was 5s)
  PAYMENT: 30000,    // 30s for payments (was 15s)
  INVOICE: 15000,    // 15s for invoice creation (was 5s)
  LOOKUP: 10000,     // 10s for invoice lookup (was 5s)
  TRANSACTIONS: 15000, // 15s for transaction list
};

/**
 * Retry wrapper with exponential backoff
 * Retries failed operations up to maxRetries times
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 2000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.log(`[NWC] Retry ${attempt}/${maxRetries} failed:`, lastError.message);

      // Don't delay after last attempt
      if (attempt < maxRetries) {
        const delay = delayMs * attempt; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

// Result types
export interface SendPaymentResult {
  success: boolean;
  preimage?: string;
  fee?: number;
  error?: string;
}

export interface CreateInvoiceResult {
  success: boolean;
  invoice?: string;
  paymentHash?: string;
  error?: string;
}

export interface WalletBalance {
  balance: number;
  error?: string;
}

/**
 * Simple NWC Wallet - fail fast, no complexity
 */
class SimpleNWCWallet {
  private client: NWCClient | null = null;

  /**
   * Simple timeout wrapper
   */
  private timeout<T>(ms: number): Promise<T> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  }

  /**
   * Force cleanup of client
   */
  private cleanup(): void {
    if (this.client) {
      try {
        this.client.close();
      } catch {
        // Ignore close errors
      }
    }
    this.client = null;
  }

  /**
   * Check if wallet is configured
   */
  async isAvailable(): Promise<boolean> {
    return NWCStorageService.hasNWC();
  }

  /**
   * Alias for isAvailable
   */
  async hasNWCConfigured(): Promise<boolean> {
    return this.isAvailable();
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.client !== null;
  }

  /**
   * Connect to wallet - single attempt with timeout
   */
  async initialize(): Promise<void> {
    // Already connected
    if (this.client) {
      return;
    }

    const nwcString = await NWCStorageService.getNWCString();
    if (!nwcString) {
      console.log('[NWC] No wallet configured');
      return;
    }

    console.log('[NWC] Connecting...');

    try {
      this.client = new NWCClient({
        nostrWalletConnectUrl: nwcString,
        // websocketImplementation not in current NWC type defs
      });

      // Test connection with timeout
      await Promise.race([
        this.client.getInfo(),
        this.timeout(TIMEOUT.CONNECT),
      ]);

      console.log('[NWC] Connected successfully');
      await NWCStorageService.resetFailureCount();
    } catch (error) {
      console.error('[NWC] Connection failed:', error);
      this.cleanup();
      await NWCStorageService.incrementFailureCount();
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<WalletBalance> {
    try {
      if (!await this.isAvailable()) {
        return { balance: 0, error: 'No wallet configured' };
      }

      await this.initialize();

      if (!this.client) {
        return { balance: 0, error: 'Not connected' };
      }

      // Use retry for slow relays (like Coinos)
      const result = await withRetry(
        () => Promise.race([
          this.client!.getBalance(),
          this.timeout<{ balance: number }>(TIMEOUT.BALANCE),
        ]),
        2,    // 2 retries
        2000  // 2 second delay between retries
      );

      // SDK returns millisats, convert to sats
      const balanceSats = Math.floor(result.balance / 1000);
      return { balance: balanceSats };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[NWC] Balance error:', msg);
      return { balance: 0, error: msg };
    }
  }

  /**
   * Send payment
   */
  async sendPayment(invoice: string, amount?: number): Promise<SendPaymentResult> {
    try {
      if (!await this.isAvailable()) {
        return { success: false, error: 'No wallet configured' };
      }

      if (!invoice || !invoice.startsWith('lnbc')) {
        return { success: false, error: 'Invalid invoice' };
      }

      await this.initialize();

      if (!this.client) {
        return { success: false, error: 'Not connected' };
      }

      console.log('[NWC] Sending payment...');

      const result = await Promise.race([
        this.client.payInvoice({ invoice, amount: amount || undefined }),
        this.timeout<{ preimage: string; fees_paid?: number }>(TIMEOUT.PAYMENT),
      ]);

      if (result?.preimage) {
        console.log('[NWC] Payment successful');
        return { success: true, preimage: result.preimage, fee: result.fees_paid };
      }

      return { success: false, error: 'No preimage returned' };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Payment failed';
      console.error('[NWC] Payment error:', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Pay a Lightning address by resolving it via LNURL-pay
   *
   * Flow: Lightning address → LNURL endpoint → request invoice → pay invoice
   */
  async payLightningAddress(address: string, amountSats: number): Promise<SendPaymentResult> {
    try {
      if (!await this.isAvailable()) {
        return { success: false, error: 'No wallet configured' };
      }

      if (!address || !address.includes('@')) {
        return { success: false, error: 'Invalid Lightning address' };
      }

      if (!amountSats || amountSats <= 0) {
        return { success: false, error: 'Invalid amount' };
      }

      // Step 1: Resolve Lightning address to LNURL-pay endpoint
      // user@domain.com → https://domain.com/.well-known/lnurlp/user
      const [user, domain] = address.split('@');
      if (!user || !domain) {
        return { success: false, error: 'Invalid Lightning address format' };
      }

      const lnurlpUrl = `https://${domain}/.well-known/lnurlp/${user}`;
      console.log(`[NWC] Resolving Lightning address: ${address}`);

      const metadataResponse = await Promise.race([
        fetch(lnurlpUrl),
        this.timeout<Response>(TIMEOUT.CONNECT),
      ]);

      if (!metadataResponse.ok) {
        return { success: false, error: `Failed to resolve Lightning address (${metadataResponse.status})` };
      }

      const metadata = await metadataResponse.json();

      if (metadata.status === 'ERROR') {
        return { success: false, error: metadata.reason || 'LNURL error' };
      }

      if (!metadata.callback) {
        return { success: false, error: 'Invalid LNURL-pay response: no callback' };
      }

      // Step 2: Check amount is within bounds (LNURL amounts are in millisats)
      const amountMillisats = amountSats * 1000;
      const minSendable = metadata.minSendable || 1000;
      const maxSendable = metadata.maxSendable || 100000000000;

      if (amountMillisats < minSendable || amountMillisats > maxSendable) {
        return {
          success: false,
          error: `Amount out of range: ${Math.ceil(minSendable / 1000)}-${Math.floor(maxSendable / 1000)} sats`,
        };
      }

      // Step 3: Request invoice from callback
      const separator = metadata.callback.includes('?') ? '&' : '?';
      const invoiceUrl = `${metadata.callback}${separator}amount=${amountMillisats}`;

      console.log('[NWC] Requesting invoice from LNURL callback...');

      const invoiceResponse = await Promise.race([
        fetch(invoiceUrl),
        this.timeout<Response>(TIMEOUT.CONNECT),
      ]);

      if (!invoiceResponse.ok) {
        return { success: false, error: `Failed to get invoice (${invoiceResponse.status})` };
      }

      const invoiceData = await invoiceResponse.json();

      if (invoiceData.status === 'ERROR') {
        return { success: false, error: invoiceData.reason || 'Invoice request failed' };
      }

      if (!invoiceData.pr) {
        return { success: false, error: 'No invoice returned from LNURL' };
      }

      // Step 4: Pay the invoice
      console.log('[NWC] Got invoice, sending payment...');
      return await this.sendPayment(invoiceData.pr);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Payment failed';
      console.error('[NWC] Pay Lightning address error:', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Create invoice
   */
  async createInvoice(amountSats: number, description?: string): Promise<CreateInvoiceResult> {
    try {
      if (!await this.isAvailable()) {
        return { success: false, error: 'No wallet configured' };
      }

      if (!amountSats || amountSats <= 0) {
        return { success: false, error: 'Invalid amount' };
      }

      await this.initialize();

      if (!this.client) {
        return { success: false, error: 'Not connected' };
      }

      // SDK expects millisats
      const amountMillisats = amountSats * 1000;

      const result = await Promise.race([
        this.client.makeInvoice({
          amount: amountMillisats,
          description: description || 'RUNSTR payment',
        }),
        this.timeout<{ invoice: string; payment_hash: string }>(TIMEOUT.INVOICE),
      ]);

      if (result?.invoice) {
        return { success: true, invoice: result.invoice, paymentHash: result.payment_hash };
      }

      return { success: false, error: 'Failed to create invoice' };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Invoice creation failed';
      console.error('[NWC] Invoice error:', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Lookup invoice status
   */
  async lookupInvoice(invoiceOrHash: string): Promise<{ paid: boolean; success: boolean; error?: string }> {
    try {
      if (!await this.isAvailable()) {
        return { paid: false, success: false, error: 'No wallet configured' };
      }

      await this.initialize();

      if (!this.client) {
        return { paid: false, success: false, error: 'Not connected' };
      }

      const lookupParam = invoiceOrHash.startsWith('lnbc') || invoiceOrHash.startsWith('lntb')
        ? { invoice: invoiceOrHash }
        : { payment_hash: invoiceOrHash };

      const result = await Promise.race([
        this.client.lookupInvoice(lookupParam),
        this.timeout<{ state: string }>(TIMEOUT.LOOKUP),
      ]);

      return { paid: result?.state === 'settled', success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Lookup failed';
      return { paid: false, success: false, error: msg };
    }
  }

  /**
   * List transactions
   */
  async listTransactions(params?: {
    from?: number;
    until?: number;
    limit?: number;
    offset?: number;
    type?: 'incoming' | 'outgoing';
  }): Promise<{
    success: boolean;
    transactions?: Array<{
      type: 'incoming' | 'outgoing';
      invoice?: string;
      description?: string;
      preimage?: string;
      payment_hash: string;
      amount: number;
      fees_paid?: number;
      created_at: number;
      settled_at?: number;
      metadata?: Record<string, unknown>;
    }>;
    error?: string;
  }> {
    try {
      if (!await this.isAvailable()) {
        return { success: false, error: 'No wallet configured' };
      }

      await this.initialize();

      if (!this.client) {
        return { success: false, error: 'Not connected' };
      }

      const result = await Promise.race([
        this.client.listTransactions(params || {}),
        this.timeout<{ transactions: any[] }>(TIMEOUT.TRANSACTIONS),
      ]);

      return { success: true, transactions: result?.transactions || [] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'List failed';
      return { success: false, error: msg };
    }
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(): Promise<{ connected: boolean; capabilities?: string[]; error?: string }> {
    try {
      if (!await this.isAvailable()) {
        return { connected: false, error: 'No wallet configured' };
      }

      await this.initialize();

      if (!this.client) {
        return { connected: false, error: 'Not connected' };
      }

      const result = await this.client.getInfo();
      return { connected: true, capabilities: result?.methods || [] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Info failed';
      return { connected: false, error: msg };
    }
  }

  /**
   * Disconnect and clear stored NWC
   */
  disconnect(): void {
    console.log('[NWC] Disconnecting...');
    this.cleanup();
    NWCStorageService.clearNWC();
  }

  /**
   * Force reset (alias for cleanup, keeps NWC string)
   */
  forceReset(): void {
    console.log('[NWC] Force reset');
    this.cleanup();
  }

  /**
   * Reconnect (close and reinitialize)
   */
  async reconnect(): Promise<void> {
    this.cleanup();
    await this.initialize();
  }

  /**
   * Cleanup (alias)
   */
  close(): void {
    this.cleanup();
  }
}

// Export singleton instance
export const NWCWalletService = new SimpleNWCWallet();
export default NWCWalletService;
