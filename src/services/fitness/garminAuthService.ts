/**
 * GarminAuthService - OAuth 2.0 PKCE Authentication with Garmin Connect
 * Handles authorization flow, token management, and token refresh
 *
 * OAuth 2.0 PKCE Flow:
 * 1. Generate code_verifier (random 43-128 char string)
 * 2. Generate code_challenge (SHA-256 hash of verifier, base64url encoded)
 * 3. startOAuthFlow() - Opens browser to Garmin authorization page with challenge
 * 4. User authorizes app on Garmin website
 * 5. Garmin redirects to https://www.runstr.club/oauth-garmin-callback.html?code=ABC123
 * 6. Website JavaScript redirects to runstr://oauth/garmin?code=ABC123
 * 7. App deep link handler calls handleOAuthCallback(code)
 * 8. Service exchanges code + code_verifier for access/refresh tokens
 * 9. Tokens stored in AsyncStorage for persistent sessions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import type { GarminAuthTokens, GarminOAuthConfig } from '../../types/garmin';

// AsyncStorage keys for token persistence
const STORAGE_KEYS = {
  ACCESS_TOKEN: '@garmin:access_token',
  REFRESH_TOKEN: '@garmin:refresh_token',
  TOKEN_EXPIRES_AT: '@garmin:token_expires_at',
  CODE_VERIFIER: '@garmin:code_verifier', // For PKCE flow
  STATE: '@garmin:state', // For CSRF protection
};

// Garmin OAuth 2.0 PKCE endpoints (per official OAuth2PKCE_1.pdf specification)
// CRITICAL: Use /oauth2Confirm for OAuth 2.0 PKCE authorization (NOT /tools/oauth2/authorizeUser which is OAuth 1.0a)
const OAUTH_ENDPOINTS = {
  AUTHORIZE: 'https://connect.garmin.com/oauth2Confirm',
  TOKEN: 'https://diauth.garmin.com/di-oauth2-service/oauth/token',
};

export class GarminAuthService {
  private static instance: GarminAuthService;
  private isAuthenticated = false;
  private config: GarminOAuthConfig | null = null;

  private constructor() {
    this.loadConfig();
    this.loadAuthStatus();
  }

  static getInstance(): GarminAuthService {
    if (!GarminAuthService.instance) {
      GarminAuthService.instance = new GarminAuthService();
    }
    return GarminAuthService.instance;
  }

  /**
   * Load OAuth configuration from environment variables
   * Note: Silently handles missing credentials - errors shown only when OAuth is attempted
   */
  private loadConfig() {
    const clientId =
      Constants.expoConfig?.extra?.garminClientId ||
      process.env.EXPO_PUBLIC_GARMIN_CLIENT_ID;
    const clientSecret =
      Constants.expoConfig?.extra?.garminClientSecret ||
      process.env.EXPO_PUBLIC_GARMIN_CLIENT_SECRET;
    const redirectUri =
      Constants.expoConfig?.extra?.garminRedirectUri ||
      process.env.EXPO_PUBLIC_GARMIN_REDIRECT_URI ||
      'https://www.runstr.club/oauth-garmin-callback.html';

    // Silently skip if credentials not configured - will error when OAuth is actually attempted
    if (!clientId || !clientSecret) {
      return;
    }

    this.config = {
      clientId,
      clientSecret,
      redirectUri,
    };
  }

  /**
   * Load authentication status from AsyncStorage
   */
  private async loadAuthStatus() {
    try {
      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const expiresAt = await AsyncStorage.getItem(
        STORAGE_KEYS.TOKEN_EXPIRES_AT
      );

      if (accessToken && expiresAt) {
        const expiryTime = parseInt(expiresAt, 10);
        const now = Date.now();

        if (expiryTime > now) {
          this.isAuthenticated = true;
          console.log('✅ Garmin: Loaded persisted authentication');
        } else {
          console.log(
            '⚠️ Garmin: Access token expired, will refresh on next API call'
          );
          // We have tokens, even if expired - can refresh
          this.isAuthenticated = true;
        }
      }
    } catch (error) {
      console.warn('Failed to load Garmin auth status:', error);
    }
  }

  /**
   * Generate PKCE code verifier (43-128 character random string)
   * Characters: A-Z, a-z, 0-9, hyphen, period, underscore, tilde
   */
  private generateCodeVerifier(): string {
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const length = 128; // Maximum length for best security
    let verifier = '';

    // Generate random string
    const randomBytes = Crypto.getRandomBytes(length);
    for (let i = 0; i < length; i++) {
      verifier += charset[randomBytes[i] % charset.length];
    }

    return verifier;
  }

  /**
   * Generate PKCE code challenge (base64url-encoded SHA-256 hash of verifier)
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    // SHA-256 hash the verifier
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );

    // Convert base64 to base64url (URL-safe)
    const base64url = hash
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, ''); // Remove padding

    return base64url;
  }

  /**
   * Generate random state parameter for CSRF protection
   */
  private generateState(): string {
    const randomBytes = Crypto.getRandomBytes(32);
    return Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Start OAuth flow by opening browser to Garmin authorization page
   */
  async startOAuthFlow(): Promise<{ success: boolean; error?: string }> {
    if (!this.config) {
      return {
        success: false,
        error:
          'Garmin OAuth not configured. Please check environment variables.',
      };
    }

    try {
      console.log('🔐 Starting Garmin OAuth 2.0 PKCE flow...');

      // Generate PKCE parameters
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = this.generateState();

      console.log('✅ Generated PKCE parameters');
      console.log('   Code verifier length:', codeVerifier.length);
      console.log('   Code challenge:', codeChallenge.substring(0, 20) + '...');

      // Store code_verifier and state for later use in token exchange
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.CODE_VERIFIER, codeVerifier],
        [STORAGE_KEYS.STATE, state],
      ]);

      // Build authorization URL with PKCE parameters
      const authUrl = this.buildAuthorizationUrl(codeChallenge, state);
      console.log('📱 Opening browser to Garmin authorization...');

      // Open browser for authorization
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        this.config.redirectUri
      );

      if (result.type === 'success') {
        // This won't actually happen since Garmin redirects to website
        // The deep link handler will catch the callback instead
        console.log('✅ OAuth flow completed (via browser)');
        return { success: true };
      } else if (result.type === 'cancel') {
        console.log('❌ User cancelled OAuth flow');
        // Clean up stored PKCE parameters
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.CODE_VERIFIER,
          STORAGE_KEYS.STATE,
        ]);
        return { success: false, error: 'Authorization cancelled' };
      } else {
        console.log('❌ OAuth flow failed:', result.type);
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.CODE_VERIFIER,
          STORAGE_KEYS.STATE,
        ]);
        return { success: false, error: 'Authorization failed' };
      }
    } catch (error) {
      console.error('❌ Failed to start OAuth flow:', error);
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CODE_VERIFIER,
        STORAGE_KEYS.STATE,
      ]);
      return {
        success: false,
        error: `Failed to open authorization page: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Build Garmin OAuth 2.0 PKCE authorization URL
   */
  private buildAuthorizationUrl(codeChallenge: string, state: string): string {
    if (!this.config) {
      throw new Error('OAuth config not loaded');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: this.config.redirectUri,
      state: state,
      scope: 'wellness-api', // Required for Health API access to activities
    });

    const authUrl = `${OAUTH_ENDPOINTS.AUTHORIZE}?${params.toString()}`;
    console.log(
      '🔐 Garmin Auth URL:',
      authUrl.replace(this.config.clientId, 'CLIENT_ID_HIDDEN')
    );

    return authUrl;
  }

  /**
   * Handle OAuth callback with authorization code
   * Called by deep link handler after user authorizes on Garmin website
   */
  async handleOAuthCallback(
    code: string,
    returnedState?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config) {
      return {
        success: false,
        error: 'Garmin OAuth not configured',
      };
    }

    try {
      console.log('🔄 Handling OAuth callback...');
      console.log('   Received code:', code.substring(0, 20) + '...');
      console.log(
        '   Received state:',
        returnedState?.substring(0, 20) + '...'
      );

      // Verify state parameter (CSRF protection) - MANDATORY
      const storedState = await AsyncStorage.getItem(STORAGE_KEYS.STATE);

      if (!returnedState) {
        throw new Error(
          'State parameter missing from callback - security check failed'
        );
      }

      if (!storedState) {
        throw new Error(
          'Stored state not found - please restart the authorization flow'
        );
      }

      if (returnedState !== storedState) {
        throw new Error('State mismatch - possible CSRF attack detected');
      }

      console.log('✅ State verification passed');

      // Retrieve code_verifier from storage
      const codeVerifier = await AsyncStorage.getItem(
        STORAGE_KEYS.CODE_VERIFIER
      );
      if (!codeVerifier) {
        throw new Error(
          'Code verifier not found. Please restart the authorization flow.'
        );
      }

      console.log('✅ Retrieved code_verifier from storage');
      console.log('🔄 Exchanging authorization code for tokens...');

      // Exchange authorization code + code_verifier for access/refresh tokens
      const tokens = await this.exchangeCodeForTokens(code, codeVerifier);

      if (!tokens) {
        throw new Error('Failed to exchange code for tokens');
      }

      // Store tokens in AsyncStorage
      await this.storeTokens(tokens);

      // Clean up PKCE parameters
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CODE_VERIFIER,
        STORAGE_KEYS.STATE,
      ]);

      this.isAuthenticated = true;
      console.log('✅ Garmin authentication successful!');

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to handle OAuth callback:', error);
      // Clean up on error
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CODE_VERIFIER,
        STORAGE_KEYS.STATE,
      ]);
      return {
        success: false,
        error: `Authentication failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens (PKCE flow)
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<GarminAuthTokens | null> {
    if (!this.config) {
      throw new Error('OAuth config not loaded');
    }

    try {
      console.log('📤 Sending token exchange request to Garmin...');
      console.log('   Endpoint:', OAUTH_ENDPOINTS.TOKEN);
      console.log('   Grant type: authorization_code');
      console.log('   Code verifier length:', codeVerifier.length);
      console.log('   Redirect URI:', this.config.redirectUri);

      const requestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: codeVerifier, // CRITICAL: Required for PKCE
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      });

      console.log(
        '   Request body keys:',
        Array.from(requestBody.keys()).join(', ')
      );

      const response = await fetch(OAUTH_ENDPOINTS.TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody.toString(),
      });

      console.log('📥 Token exchange response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token exchange failed:');
        console.error('   Status:', response.status, response.statusText);
        console.error('   Response body:', errorText);
        console.error('   Possible causes:');
        console.error('     - Invalid client credentials');
        console.error(
          '     - Authorization code expired (codes expire quickly)'
        );
        console.error('     - Code verifier mismatch');
        console.error('     - Redirect URI mismatch');
        throw new Error(
          `Token exchange failed: ${response.status} ${errorText}`
        );
      }

      const tokens: GarminAuthTokens = await response.json();
      console.log('✅ Received tokens from Garmin');
      console.log('   Access token expires in:', tokens.expires_in, 'seconds');
      console.log(
        '   Refresh token type:',
        tokens.refresh_token ? 'present' : 'missing'
      );

      return tokens;
    } catch (error) {
      console.error('❌ Failed to exchange code for tokens:', error);
      throw error;
    }
  }

  /**
   * Store tokens in AsyncStorage
   */
  private async storeTokens(tokens: GarminAuthTokens): Promise<void> {
    try {
      const expiresAt = Date.now() + tokens.expires_in * 1000;

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token],
        [STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token],
        [STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString()],
      ]);

      console.log('✅ Tokens stored successfully');
    } catch (error) {
      console.error('❌ Failed to store tokens:', error);
      throw error;
    }
  }

  /**
   * Get valid access token (auto-refreshes if expired)
   */
  async getAccessToken(): Promise<string> {
    const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const expiresAt = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);

    if (!accessToken || !expiresAt) {
      throw new Error('Not authenticated. Please connect your Garmin account.');
    }

    const expiryTime = parseInt(expiresAt, 10);
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes before expiry

    // If token expires soon, refresh it
    if (expiryTime - now < bufferTime) {
      console.log('🔄 Access token expired or expiring soon, refreshing...');
      await this.refreshAccessToken();
      const newToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!newToken) {
        throw new Error('Failed to refresh access token');
      }
      return newToken;
    }

    return accessToken;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.config) {
      throw new Error('OAuth config not loaded');
    }

    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      throw new Error('No refresh token available. Please re-authenticate.');
    }

    try {
      console.log('🔄 Refreshing access token...');
      console.log(
        '   Using refresh token (first 20 chars):',
        refreshToken.substring(0, 20) + '...'
      );

      const response = await fetch(OAUTH_ENDPOINTS.TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }).toString(),
      });

      console.log('📥 Refresh response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token refresh failed:');
        console.error('   Status:', response.status, response.statusText);
        console.error('   Response:', errorText);
        console.error(
          '   This usually means the refresh token expired or was revoked'
        );
        throw new Error(
          `Token refresh failed: ${response.status} ${errorText}`
        );
      }

      const tokens: GarminAuthTokens = await response.json();
      await this.storeTokens(tokens);

      console.log('✅ Access token refreshed successfully');
      console.log(
        '   New access token expires in:',
        tokens.expires_in,
        'seconds'
      );
    } catch (error) {
      console.error('❌ Failed to refresh access token:', error);
      // Clear tokens on refresh failure
      await this.disconnect();
      throw new Error('Session expired. Please reconnect your Garmin account.');
    }
  }

  /**
   * Check if user is authenticated
   */
  async checkAuthentication(): Promise<boolean> {
    try {
      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await AsyncStorage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN
      );

      this.isAuthenticated = !!(accessToken && refreshToken);
      return this.isAuthenticated;
    } catch (error) {
      console.error('Failed to check authentication:', error);
      return false;
    }
  }

  /**
   * Get current authentication status (synchronous)
   */
  getAuthenticationStatus(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Disconnect Garmin account and clear tokens
   */
  async disconnect(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRES_AT,
        STORAGE_KEYS.CODE_VERIFIER,
        STORAGE_KEYS.STATE,
      ]);

      this.isAuthenticated = false;
      console.log('✅ Garmin account disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect Garmin:', error);
      throw error;
    }
  }

  /**
   * Get authentication status details
   */
  async getAuthDetails(): Promise<{
    isAuthenticated: boolean;
    hasTokens: boolean;
    tokenExpiresAt?: Date;
  }> {
    const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const expiresAt = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);

    return {
      isAuthenticated: this.isAuthenticated,
      hasTokens: !!(accessToken && refreshToken),
      tokenExpiresAt: expiresAt ? new Date(parseInt(expiresAt, 10)) : undefined,
    };
  }
}

// Lazy singleton - only initialize when actually used (e.g., OAuth callback or Garmin tab)
let _garminAuthServiceInstance: GarminAuthService | null = null;

export function getGarminAuthService(): GarminAuthService {
  if (!_garminAuthServiceInstance) {
    _garminAuthServiceInstance = GarminAuthService.getInstance();
  }
  return _garminAuthServiceInstance;
}

// For backward compatibility - use a Proxy to lazy-init on property access
const garminAuthService = new Proxy({} as GarminAuthService, {
  get(_target, prop) {
    const instance = getGarminAuthService();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export default garminAuthService;
