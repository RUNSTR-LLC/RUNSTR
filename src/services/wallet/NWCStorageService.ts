/**
 * NWCStorageService - Simple NWC connection string storage
 *
 * Features:
 * - SecureStore for encrypted NWC string storage
 * - Failure counter to auto-clear after 2 failed app starts
 * - Simple connection testing with 5s timeout
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NWCClient } from '@getalby/sdk';

const NWC_KEY = 'nwc_string';
const FAILURE_KEY = '@nwc_failures';
const MAX_FAILURES = 2; // Auto-clear after 2 failed connections

/**
 * Simple NWC Storage Service
 */
class NWCStorageServiceClass {
  /**
   * Validate NWC string format (no network call)
   */
  validateFormat(nwcString: string): boolean {
    if (!nwcString || typeof nwcString !== 'string') {
      return false;
    }
    if (!nwcString.startsWith('nostr+walletconnect://')) {
      return false;
    }
    if (nwcString.length < 50) {
      return false;
    }
    return true;
  }

  /**
   * Test NWC connection with 5s timeout
   * ALWAYS force-closes client afterward
   */
  async testConnection(nwcString: string): Promise<boolean> {
    if (!this.validateFormat(nwcString)) {
      return false;
    }

    let testClient: NWCClient | null = null;

    try {
      console.log('[NWC] Testing connection...');

      testClient = new NWCClient({
        nostrWalletConnectUrl: nwcString,
        // websocketImplementation not in current NWC type defs
      });

      // 5 second timeout
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      await Promise.race([testClient.getInfo(), timeout]);
      console.log('[NWC] Connection test passed');
      return true;
    } catch (error) {
      console.error('[NWC] Connection test failed:', error);
      return false;
    } finally {
      // ALWAYS force close - don't check connected state
      if (testClient) {
        try {
          testClient.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  }

  /**
   * Save NWC string to SecureStore
   */
  async saveNWCString(nwcString: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.validateFormat(nwcString)) {
        return { success: false, error: 'Invalid NWC format' };
      }

      await SecureStore.setItemAsync(NWC_KEY, nwcString);
      await this.resetFailureCount();
      console.log('[NWC] Connection string saved');
      return { success: true };
    } catch (error) {
      console.error('[NWC] Save failed:', error);
      return { success: false, error: 'Failed to save' };
    }
  }

  /**
   * Get stored NWC string
   * Returns null if too many failures (auto-cleared)
   */
  async getNWCString(): Promise<string | null> {
    try {
      // Check failure count first
      const failures = await this.getFailureCount();
      if (failures >= MAX_FAILURES) {
        console.warn(`[NWC] ${failures} failures, auto-clearing stored NWC`);
        await this.clearNWC();
        return null;
      }

      return await SecureStore.getItemAsync(NWC_KEY);
    } catch (error) {
      console.error('[NWC] Get failed:', error);
      return null;
    }
  }

  /**
   * Check if NWC is configured
   */
  async hasNWC(): Promise<boolean> {
    try {
      const nwcString = await SecureStore.getItemAsync(NWC_KEY);
      return !!nwcString && nwcString.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Clear stored NWC and reset failures
   */
  async clearNWC(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(NWC_KEY);
      await this.resetFailureCount();
      console.log('[NWC] Cleared');
    } catch (error) {
      console.error('[NWC] Clear failed:', error);
    }
  }

  /**
   * Get failure count
   */
  async getFailureCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(FAILURE_KEY);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Increment failure count
   */
  async incrementFailureCount(): Promise<void> {
    try {
      const count = await this.getFailureCount();
      await AsyncStorage.setItem(FAILURE_KEY, String(count + 1));
      console.log(`[NWC] Failure count: ${count + 1}`);
    } catch (error) {
      console.error('[NWC] Increment failure count failed:', error);
    }
  }

  /**
   * Reset failure count (on successful connection)
   */
  async resetFailureCount(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FAILURE_KEY);
    } catch {
      // Ignore
    }
  }

  // Legacy compatibility methods - no-ops or simple wrappers

  async updateStatus(_connected: boolean, _walletInfo?: any): Promise<void> {
    // No longer used - status is determined by client presence
  }

  async getStatus(): Promise<{ connected: boolean; lastTested: number }> {
    const hasWallet = await this.hasNWC();
    return { connected: hasWallet, lastTested: Date.now() };
  }

  async refreshConnection(): Promise<boolean> {
    const nwcString = await this.getNWCString();
    if (!nwcString) return false;
    return this.testConnection(nwcString);
  }
}

// Export singleton
export const NWCStorageService = new NWCStorageServiceClass();
export default NWCStorageService;
