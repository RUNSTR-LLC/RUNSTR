/**
 * CoinOSAccountService - CoinOS Wallet Account Management
 *
 * Handles CoinOS custodial wallet account creation, balance checking,
 * invoice creation, and payment sending.
 * All credentials are stored locally in AsyncStorage.
 *
 * Used when user selects CoinOS as their "team" to earn Bitcoin to a
 * Lightning wallet. Unlike PPQ.AI, CoinOS provides a Lightning address
 * (username@coinos.io) that plugs into the existing LNURL reward system.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWithTimeout } from '../../utils/networkUtils';

// Storage keys
const COINOS_USERNAME = '@runstr:coinos_username';
const COINOS_PASSWORD = '@runstr:coinos_password';
const COINOS_JWT = '@runstr:coinos_jwt';

// CoinOS API
const COINOS_API_BASE = 'https://coinos.io/api';
const COINOS_API_TIMEOUT = 15000;

function generatePassword(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class CoinOSAccountService {
  /**
   * Check if user has a CoinOS account configured locally
   */
  static async hasAccount(): Promise<boolean> {
    try {
      const [username, password] = await AsyncStorage.multiGet([
        COINOS_USERNAME,
        COINOS_PASSWORD,
      ]);
      return !!(username[1] && password[1]);
    } catch (error) {
      console.error('[CoinOS] Error checking account:', error);
      return false;
    }
  }

  /**
   * Get stored username
   */
  static async getUsername(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(COINOS_USERNAME);
    } catch (error) {
      console.error('[CoinOS] Error getting username:', error);
      return null;
    }
  }

  /**
   * Get Lightning address for this CoinOS account
   */
  static async getLightningAddress(): Promise<string | null> {
    const username = await this.getUsername();
    if (!username) return null;
    return `${username}@coinos.io`;
  }

  /**
   * Create a new CoinOS account
   * Auto-generates username from hex pubkey, random password
   */
  static async createAccount(userHexPubkey: string): Promise<{
    success: boolean;
    username?: string;
    lightningAddress?: string;
    error?: string;
  }> {
    try {
      const baseUsername = `runstr${userHexPubkey.slice(0, 8)}`;
      const password = generatePassword();

      console.log('[CoinOS] Creating account with username:', baseUsername);

      let username = baseUsername;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        const response = await fetchWithTimeout(
          `${COINOS_API_BASE}/register`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user: { username, password },
            }),
          },
          COINOS_API_TIMEOUT
        );

        if (response.ok) {
          const data = await response.json();
          const jwt = data.token;

          // Store credentials locally
          await AsyncStorage.multiSet([
            [COINOS_USERNAME, username],
            [COINOS_PASSWORD, password],
            [COINOS_JWT, jwt || ''],
          ]);

          const lightningAddress = `${username}@coinos.io`;
          console.log('[CoinOS] Account created:', lightningAddress);

          return { success: true, username, lightningAddress };
        }

        if (response.status === 409) {
          // Username taken — append random suffix
          const suffix = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0');
          username = `${baseUsername}${suffix}`;
          attempts++;
          console.log('[CoinOS] Username taken, trying:', username);
          continue;
        }

        const errorText = await response.text();
        console.error('[CoinOS] Registration failed:', response.status, errorText);
        return {
          success: false,
          error: `Registration failed: ${response.status}`,
        };
      }

      return { success: false, error: 'Could not find available username' };
    } catch (error) {
      console.error('[CoinOS] Error creating account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Login with stored credentials and refresh JWT
   */
  static async login(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const [usernameResult, passwordResult] = await AsyncStorage.multiGet([
        COINOS_USERNAME,
        COINOS_PASSWORD,
      ]);
      const username = usernameResult[1];
      const password = passwordResult[1];

      if (!username || !password) {
        return { success: false, error: 'No CoinOS credentials stored' };
      }

      const response = await fetchWithTimeout(
        `${COINOS_API_BASE}/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        },
        COINOS_API_TIMEOUT
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CoinOS] Login failed:', response.status, errorText);
        return { success: false, error: `Login failed: ${response.status}` };
      }

      const data = await response.json();
      if (data.token) {
        await AsyncStorage.setItem(COINOS_JWT, data.token);
      }

      console.log('[CoinOS] Login successful');
      return { success: true };
    } catch (error) {
      console.error('[CoinOS] Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get JWT, refreshing via login if needed
   */
  private static async getJWT(): Promise<string | null> {
    let jwt = await AsyncStorage.getItem(COINOS_JWT);
    if (jwt) return jwt;

    // Try to login to get a fresh JWT
    const loginResult = await this.login();
    if (loginResult.success) {
      return await AsyncStorage.getItem(COINOS_JWT);
    }
    return null;
  }

  /**
   * Get current wallet balance in sats
   */
  static async getBalance(): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      const jwt = await this.getJWT();
      if (!jwt) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetchWithTimeout(
        `${COINOS_API_BASE}/me`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        },
        COINOS_API_TIMEOUT
      );

      if (response.status === 401) {
        // JWT expired, try re-login
        const loginResult = await this.login();
        if (!loginResult.success) {
          return { success: false, error: 'Authentication expired' };
        }
        // Retry with new JWT
        return this.getBalance();
      }

      if (!response.ok) {
        return { success: false, error: `Balance fetch failed: ${response.status}` };
      }

      const data = await response.json();
      const balance = data.balance ?? 0;

      console.log(`[CoinOS] Balance: ${balance} sats`);
      return { success: true, balance };
    } catch (error) {
      console.error('[CoinOS] Error fetching balance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a Lightning invoice to receive payment
   */
  static async createInvoice(
    amountSats: number,
    description?: string
  ): Promise<{
    success: boolean;
    bolt11?: string;
    error?: string;
  }> {
    try {
      const jwt = await this.getJWT();
      if (!jwt) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetchWithTimeout(
        `${COINOS_API_BASE}/invoice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            invoice: {
              amount: amountSats,
              type: 'lightning',
              memo: description || 'RUNSTR deposit',
            },
          }),
        },
        COINOS_API_TIMEOUT
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Invoice creation failed: ${response.status} ${errorText}` };
      }

      const data = await response.json();
      const bolt11 = data.text || data.bolt11 || data.hash;

      if (!bolt11) {
        return { success: false, error: 'No invoice returned' };
      }

      console.log(`[CoinOS] Invoice created for ${amountSats} sats`);
      return { success: true, bolt11 };
    } catch (error) {
      console.error('[CoinOS] Error creating invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send payment to a Lightning address or bolt11 invoice
   */
  static async sendPayment(
    payreq: string,
    amountSats?: number
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const jwt = await this.getJWT();
      if (!jwt) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetchWithTimeout(
        `${COINOS_API_BASE}/bitcoin/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            payreq,
            ...(amountSats && { amount: amountSats }),
          }),
        },
        COINOS_API_TIMEOUT
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Payment failed: ${response.status} ${errorText}` };
      }

      console.log('[CoinOS] Payment sent successfully');
      return { success: true };
    } catch (error) {
      console.error('[CoinOS] Error sending payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Set account credentials manually (for users with existing CoinOS accounts)
   */
  static async setAccount(username: string, password: string): Promise<boolean> {
    try {
      await AsyncStorage.multiSet([
        [COINOS_USERNAME, username],
        [COINOS_PASSWORD, password],
      ]);
      // Try to login immediately to get JWT
      const loginResult = await this.login();
      return loginResult.success;
    } catch (error) {
      console.error('[CoinOS] Error saving account:', error);
      return false;
    }
  }

  /**
   * Clear all CoinOS credentials from local storage
   */
  static async clearAccount(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([COINOS_USERNAME, COINOS_PASSWORD, COINOS_JWT]);
      console.log('[CoinOS] Account cleared');
    } catch (error) {
      console.error('[CoinOS] Error clearing account:', error);
    }
  }
}

export default CoinOSAccountService;
