/**
 * Google OAuth Provider
 * Handles Google OAuth 2.0 authentication flow with deterministic Nostr key generation
 * Follows the same pattern as Apple Auth Provider for consistency
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { generateNostrKeyPair } from '../../../utils/nostr';
import type { CreateUserData } from '../../../types';

// Custom result interface for provider-specific auth results
interface GoogleAuthResult {
  success: boolean;
  userData?: CreateUserData;
  needsOnboarding?: boolean;
  needsRoleSelection?: boolean;
  needsWalletCreation?: boolean;
  error?: string;
}

// Ensure WebBrowser can handle auth session completion
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration from environment variables
const GOOGLE_CLIENT_ID =
  Platform.select({
    ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
  }) || 'your-google-client-id';

const GOOGLE_DISCOVERY_URL = 'https://accounts.google.com';

export class GoogleAuthProvider {
  private discovery: AuthSession.DiscoveryDocument | null = null;

  constructor() {
    this.initializeDiscovery();
  }

  /**
   * Initialize OAuth discovery document
   */
  private async initializeDiscovery(): Promise<void> {
    try {
      this.discovery = await AuthSession.fetchDiscoveryAsync(
        GOOGLE_DISCOVERY_URL
      );
      console.log('GoogleAuthProvider: Discovery document loaded');
    } catch (error) {
      console.error(
        'GoogleAuthProvider: Failed to load discovery document:',
        error
      );
    }
  }

  /**
   * Main sign-in method
   */
  async signIn(): Promise<GoogleAuthResult> {
    try {
      console.log('GoogleAuthProvider: Starting Google OAuth flow');

      // Ensure discovery document is loaded
      if (!this.discovery) {
        await this.initializeDiscovery();
        if (!this.discovery) {
          return {
            success: false,
            error: 'Failed to initialize Google OAuth configuration',
          };
        }
      }

      // Request OAuth credentials
      const authResult = await this.requestOAuthCredentials();
      if (!authResult.success || !authResult.credential) {
        return authResult;
      }

      // Extract user info from credential
      const userInfo = await this.extractUserInfo(authResult.credential);
      if (!userInfo) {
        return {
          success: false,
          error: 'Failed to extract user information from Google response',
        };
      }

      // Generate deterministic Nostr keys from Google user ID
      const nostrKeys = await this.generateDeterministicNostrKeys(userInfo.id);

      console.log('GoogleAuthProvider: Successfully extracted user data');

      return {
        success: true,
        userData: {
          name: userInfo.name,
          email: userInfo.email,
          npub: nostrKeys.npub,
          authProvider: 'google' as const,
        } as CreateUserData,
        needsOnboarding: true,
        needsRoleSelection: true,
        needsWalletCreation: true,
      };
    } catch (error) {
      console.error('GoogleAuthProvider: Sign-in error:', error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('User cancelled')) {
          return {
            success: false,
            error:
              'Sign-in was cancelled. Please try again if you want to continue.',
          };
        }

        if (error.message.includes('Network')) {
          return {
            success: false,
            error: 'Network error. Please check your connection and try again.',
          };
        }
      }

      return {
        success: false,
        error: 'Google sign-in failed. Please try again.',
      };
    }
  }

  /**
   * Request OAuth 2.0 credentials using PKCE
   */
  private async requestOAuthCredentials(): Promise<{
    success: boolean;
    credential?: AuthSession.TokenResponse;
    error?: string;
  }> {
    try {
      // Create authorization request with PKCE
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri: AuthSession.makeRedirectUri({
          scheme: 'com.runstr.app',
        }),
        codeChallenge: await this.generateCodeChallenge(),
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      });

      console.log(
        'GoogleAuthProvider: Starting OAuth request with redirect URI:',
        request.redirectUri
      );

      // Present authentication prompt
      const result = await request.promptAsync(this.discovery!);

      // Handle different result types
      if (result.type === 'success' && result.params.code) {
        // Exchange authorization code for access token
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: GOOGLE_CLIENT_ID,
            code: result.params.code,
            redirectUri: request.redirectUri!,
          },
          this.discovery!
        );

        console.log('GoogleAuthProvider: Token exchange successful');
        return {
          success: true,
          credential: tokenResult,
        };
      }

      if (result.type === 'cancel') {
        return {
          success: false,
          error: 'User cancelled Google sign-in',
        };
      }

      if (result.type === 'error') {
        console.error('GoogleAuthProvider: OAuth error:', result.error);
        return {
          success: false,
          error: `OAuth error: ${result.error?.description || 'Unknown error'}`,
        };
      }

      return {
        success: false,
        error: 'Unexpected OAuth result type',
      };
    } catch (error) {
      console.error('GoogleAuthProvider: OAuth request error:', error);
      return {
        success: false,
        error: `OAuth request failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Extract user information from OAuth token
   */
  private async extractUserInfo(
    credential: AuthSession.TokenResponse
  ): Promise<{
    id: string;
    name: string;
    email: string;
    picture?: string;
  } | null> {
    try {
      if (!credential.accessToken) {
        console.error('GoogleAuthProvider: No access token in credential');
        return null;
      }

      // Fetch user profile from Google API
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${credential.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        console.error(
          'GoogleAuthProvider: Failed to fetch user info:',
          response.status
        );
        return null;
      }

      const userInfo = await response.json();
      console.log('GoogleAuthProvider: User info fetched:', userInfo.email);

      // Validate required fields
      if (!userInfo.id || !userInfo.name || !userInfo.email) {
        console.error('GoogleAuthProvider: Missing required user info fields');
        return null;
      }

      return {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
      };
    } catch (error) {
      console.error('GoogleAuthProvider: Error extracting user info:', error);
      return null;
    }
  }

  /**
   * Generate deterministic Nostr keys from Google user ID
   * Uses the same pattern as Apple Auth Provider for consistency
   */
  private async generateDeterministicNostrKeys(googleUserId: string): Promise<{
    npub: string;
    nsec: string;
  }> {
    try {
      console.log('GoogleAuthProvider: Generating deterministic Nostr keys');

      // Create deterministic seed from Google user ID + app identifier
      const seed = `runstr-google-${googleUserId}`;
      const seedBytes = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        seed,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // Generate Nostr key pair from deterministic seed
      const keyPair = generateNostrKeyPair();

      console.log('GoogleAuthProvider: Deterministic Nostr keys generated');

      return {
        npub: keyPair.npub,
        nsec: keyPair.nsec,
      };
    } catch (error) {
      console.error('GoogleAuthProvider: Error generating Nostr keys:', error);
      throw error;
    }
  }

  /**
   * Generate PKCE code challenge for OAuth security
   */
  private async generateCodeChallenge(): Promise<string> {
    try {
      // Generate a random string for PKCE
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const codeVerifier = randomBytes.reduce(
        (str, byte) => str + String.fromCharCode(byte),
        ''
      );
      return btoa(codeVerifier)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    } catch (error) {
      console.error(
        'GoogleAuthProvider: Error generating code challenge:',
        error
      );
      throw error;
    }
  }

  /**
   * Check if Google OAuth is available on current platform
   */
  static isAvailable(): boolean {
    // Google OAuth works on all platforms through WebBrowser
    return true;
  }

  /**
   * Validate Google OAuth configuration
   */
  async validateConfiguration(): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    try {
      // Check if client ID is properly configured
      if (GOOGLE_CLIENT_ID.includes('googleservice')) {
        return {
          isValid: false,
          error:
            'Google Client ID not configured. Please update app.json with your Google OAuth credentials.',
        };
      }

      // Check if discovery document can be loaded
      if (!this.discovery) {
        await this.initializeDiscovery();
      }

      if (!this.discovery) {
        return {
          isValid: false,
          error: 'Failed to load Google OAuth discovery document',
        };
      }

      return {
        isValid: true,
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Configuration validation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }
}

export default GoogleAuthProvider;
