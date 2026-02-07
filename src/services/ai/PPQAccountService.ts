/**
 * PPQAccountService - PPQ.AI Account Management
 *
 * Handles PPQ.AI account creation, balance checking, and topup invoice generation.
 * All credentials are stored locally - only bolt11 invoices leave the device.
 *
 * Used when user selects PPQ.AI as their "team" to earn AI credits instead of sats.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWithTimeout } from '../../utils/networkUtils';

// Storage keys (API key stays local, never sent to backend)
const PPQ_API_KEY = '@runstr:ppq_api_key';
const PPQ_CREDIT_ID = '@runstr:ppq_credit_id';

// PPQ.AI API endpoints
const PPQ_API_BASE = 'https://api.ppq.ai';
const PPQ_API_TIMEOUT = 15000; // 15 seconds

interface PPQAccount {
  apiKey: string;
  creditId: string;
}

interface PPQBalance {
  balance: number; // In USD (e.g., 2.45)
  currency: string;
}

interface PPQTopupInvoice {
  invoiceId: string;
  bolt11: string;
  amountSats: number;
  expiresAt: number; // Unix timestamp
}

export class PPQAccountService {
  /**
   * Check if user has a PPQ.AI account configured locally
   */
  static async hasAccount(): Promise<boolean> {
    try {
      const [apiKey, creditId] = await AsyncStorage.multiGet([
        PPQ_API_KEY,
        PPQ_CREDIT_ID,
      ]);
      return !!(apiKey[1] && creditId[1]);
    } catch (error) {
      console.error('[PPQAccount] Error checking account:', error);
      return false;
    }
  }

  /**
   * Get stored account credentials (for internal use)
   */
  static async getAccount(): Promise<PPQAccount | null> {
    try {
      const [apiKey, creditId] = await AsyncStorage.multiGet([
        PPQ_API_KEY,
        PPQ_CREDIT_ID,
      ]);
      if (apiKey[1] && creditId[1]) {
        return { apiKey: apiKey[1], creditId: creditId[1] };
      }
      return null;
    } catch (error) {
      console.error('[PPQAccount] Error getting account:', error);
      return null;
    }
  }

  /**
   * Create a new PPQ.AI account
   * Returns the API key and credit ID for local storage
   */
  static async createAccount(): Promise<{
    success: boolean;
    apiKey?: string;
    creditId?: string;
    error?: string;
  }> {
    try {
      console.log('[PPQAccount] Creating new PPQ.AI account...');

      const response = await fetchWithTimeout(
        `${PPQ_API_BASE}/accounts/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        PPQ_API_TIMEOUT
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PPQAccount] Account creation failed:', response.status, errorText);
        return {
          success: false,
          error: `Failed to create account: ${response.status}`,
        };
      }

      const data = await response.json();

      if (!data.credit_id || !data.api_key) {
        console.error('[PPQAccount] Invalid response:', data);
        return {
          success: false,
          error: 'Invalid response from PPQ.AI',
        };
      }

      // Store credentials locally
      await AsyncStorage.multiSet([
        [PPQ_API_KEY, data.api_key],
        [PPQ_CREDIT_ID, data.credit_id],
      ]);

      console.log('[PPQAccount] Account created successfully');
      return {
        success: true,
        apiKey: data.api_key,
        creditId: data.credit_id,
      };
    } catch (error) {
      console.error('[PPQAccount] Error creating account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Set account credentials manually (for users with existing PPQ.AI keys)
   */
  static async setAccount(apiKey: string, creditId: string): Promise<boolean> {
    try {
      await AsyncStorage.multiSet([
        [PPQ_API_KEY, apiKey],
        [PPQ_CREDIT_ID, creditId],
      ]);
      console.log('[PPQAccount] Account credentials saved');
      return true;
    } catch (error) {
      console.error('[PPQAccount] Error saving account:', error);
      return false;
    }
  }

  /**
   * Get current PPQ.AI credit balance
   */
  static async getBalance(): Promise<{
    success: boolean;
    balance?: number;
    currency?: string;
    error?: string;
  }> {
    try {
      const account = await this.getAccount();
      if (!account) {
        return { success: false, error: 'No PPQ.AI account configured' };
      }

      console.log('[PPQAccount] Fetching balance...');

      const response = await fetchWithTimeout(
        `${PPQ_API_BASE}/credits/balance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credit_id: account.creditId,
          }),
        },
        PPQ_API_TIMEOUT
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PPQAccount] Balance fetch failed:', response.status, errorText);
        return {
          success: false,
          error: `Failed to fetch balance: ${response.status}`,
        };
      }

      const data = await response.json();

      // Handle different response formats
      const balance = data.balance ?? data.credits ?? 0;
      const currency = data.currency ?? 'USD';

      console.log(`[PPQAccount] Balance: $${balance} ${currency}`);
      return {
        success: true,
        balance,
        currency,
      };
    } catch (error) {
      console.error('[PPQAccount] Error fetching balance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a Lightning invoice for topping up PPQ.AI credits
   * This invoice can be paid by anyone (including the RUNSTR rewards system)
   */
  static async createTopupInvoice(sats: number): Promise<{
    success: boolean;
    bolt11?: string;
    invoiceId?: string;
    expiresAt?: number;
    error?: string;
  }> {
    try {
      const account = await this.getAccount();
      if (!account) {
        return { success: false, error: 'No PPQ.AI account configured' };
      }

      console.log(`[PPQAccount] Creating topup invoice for ${sats} sats...`);

      const response = await fetchWithTimeout(
        `${PPQ_API_BASE}/topup/create/btc-lightning`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${account.apiKey}`,
          },
          body: JSON.stringify({
            amount: sats,
            currency: 'SATS',
          }),
        },
        PPQ_API_TIMEOUT
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PPQAccount] Invoice creation failed:', response.status, errorText);
        return {
          success: false,
          error: `Failed to create invoice: ${response.status}`,
        };
      }

      const data = await response.json();

      // Support both 'bolt11' and 'lightning_invoice' field names (API flexibility)
      const bolt11 = data.bolt11 || data.lightning_invoice;

      if (!bolt11) {
        console.error('[PPQAccount] Invalid invoice response:', data);
        return {
          success: false,
          error: 'No invoice returned',
        };
      }

      // Calculate expiry (default 15 minutes if not provided)
      const expiresAt = data.expires_at || Math.floor(Date.now() / 1000) + 900;

      console.log(`[PPQAccount] Invoice created: ${bolt11.slice(0, 30)}...`);
      return {
        success: true,
        bolt11: bolt11,
        invoiceId: data.invoice_id || data.id,
        expiresAt,
      };
    } catch (error) {
      console.error('[PPQAccount] Error creating invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear PPQ.AI account credentials
   */
  static async clearAccount(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([PPQ_API_KEY, PPQ_CREDIT_ID]);
      console.log('[PPQAccount] Account cleared');
    } catch (error) {
      console.error('[PPQAccount] Error clearing account:', error);
    }
  }

  /**
   * Get API key for Coach RUNSTR (internal use only)
   * This key is used locally for AI queries, never sent to our backend
   */
  static async getApiKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PPQ_API_KEY);
    } catch (error) {
      console.error('[PPQAccount] Error getting API key:', error);
      return null;
    }
  }
}

export default PPQAccountService;
