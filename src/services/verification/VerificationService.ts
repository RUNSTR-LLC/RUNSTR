/**
 * VerificationService
 *
 * Fetches and manages workout verification codes from Supabase.
 * Codes are generated server-side using HMAC-SHA256 and cannot be forged
 * without knowing the server secret.
 *
 * Flow:
 * 1. On login, app sends { npub, version } to Supabase Edge Function
 * 2. Supabase computes: code = HMAC-SHA256(SECRET, npub:version)
 * 3. Code returned to app and stored in AsyncStorage
 * 4. Code included in kind 1301 events as ["v", code] tag
 * 5. Leaderboard validation recomputes and compares codes server-side
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const STORAGE_KEY = '@runstr:verification_code';
const STORAGE_VERSION_KEY = '@runstr:verification_version';

// Supabase configuration from environment
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

class VerificationServiceClass {
  private static instance: VerificationServiceClass;
  private cachedCode: string | null = null;
  private fetchInProgress: Promise<string | null> | null = null;

  private constructor() {}

  static getInstance(): VerificationServiceClass {
    if (!VerificationServiceClass.instance) {
      VerificationServiceClass.instance = new VerificationServiceClass();
    }
    return VerificationServiceClass.instance;
  }

  /**
   * Fetch verification code from Supabase for current user
   * Called after successful login
   *
   * @param npub - User's npub in bech32 format (npub1...)
   * @returns The verification code or null if unavailable
   */
  async fetchAndStoreCode(npub: string): Promise<string | null> {
    // Prevent duplicate concurrent fetches
    if (this.fetchInProgress) {
      console.log('[Verification] Fetch already in progress, waiting...');
      return this.fetchInProgress;
    }

    this.fetchInProgress = this._doFetchAndStore(npub);
    const result = await this.fetchInProgress;
    this.fetchInProgress = null;
    return result;
  }

  private async _doFetchAndStore(npub: string): Promise<string | null> {
    const version = this.getAppVersion();

    // Validate inputs
    if (!npub || !npub.startsWith('npub1')) {
      console.warn('[Verification] Invalid npub format:', npub?.substring(0, 10));
      return null;
    }

    // Check Supabase configuration
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('[Verification] Supabase not configured, skipping verification');
      return null;
    }

    try {
      console.log(`[Verification] Fetching code for version ${version}...`);

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-verification-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ npub, version }),
        }
      );

      if (!response.ok) {
        console.warn(
          '[Verification] Server error:',
          response.status,
          response.statusText
        );
        return null;
      }

      const data = await response.json();

      if (data.error) {
        // Version not supported is expected for old versions
        console.log('[Verification] Server response:', data.error);
        return null;
      }

      if (data.code) {
        // Store code and version in AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEY, data.code);
        await AsyncStorage.setItem(STORAGE_VERSION_KEY, version);
        this.cachedCode = data.code;

        console.log(
          `[Verification] Code fetched and stored for version ${version}:`,
          data.code.substring(0, 4) + '...'
        );
        return data.code;
      }

      console.log('[Verification] No code returned from server');
      return null;
    } catch (error) {
      console.error('[Verification] Failed to fetch code:', error);
      return null;
    }
  }

  /**
   * Get stored verification code
   * Returns null if no code stored or version mismatch
   */
  async getCode(): Promise<string | null> {
    // Return cached code if available
    if (this.cachedCode) {
      return this.cachedCode;
    }

    try {
      const [storedCode, storedVersion] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(STORAGE_VERSION_KEY),
      ]);

      // No code stored
      if (!storedCode) {
        return null;
      }

      // Version mismatch - code is stale (app was updated)
      const currentVersion = this.getAppVersion();
      if (storedVersion !== currentVersion) {
        console.log(
          `[Verification] Version mismatch: stored=${storedVersion}, current=${currentVersion}`
        );
        // Clear stale code
        await this.clearCode();
        return null;
      }

      // Cache for future calls
      this.cachedCode = storedCode;
      return storedCode;
    } catch (error) {
      console.error('[Verification] Error reading stored code:', error);
      return null;
    }
  }

  /**
   * Check if a valid verification code is available
   */
  async hasValidCode(): Promise<boolean> {
    const code = await this.getCode();
    return code !== null;
  }

  /**
   * Clear stored verification code
   * Called on logout to ensure new user gets fresh code
   */
  async clearCode(): Promise<void> {
    this.cachedCode = null;
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY, STORAGE_VERSION_KEY]);
      console.log('[Verification] Code cleared');
    } catch (error) {
      console.error('[Verification] Error clearing code:', error);
    }
  }

  /**
   * Get current app version from Expo config
   */
  private getAppVersion(): string {
    return Constants.expoConfig?.version || '1.6.5';
  }

  /**
   * Check if Supabase is configured for verification
   */
  isConfigured(): boolean {
    return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
  }
}

// Export singleton instance
const VerificationService = VerificationServiceClass.getInstance();
export default VerificationService;

// Also export the class for testing
export { VerificationServiceClass };
