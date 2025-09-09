/**
 * Apple Sign-In Provider
 * Handles Apple ID authentication for iOS devices with fallback for other platforms
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type { AuthResult, CreateUserData, AuthProvider } from '../../../types';

/**
 * Apple Authentication Provider
 * Implements Apple Sign-In using Expo's Apple Authentication module
 */
export class AppleAuthProvider {
  /**
   * Check if Apple Sign-In is available on current platform
   */
  static async isAvailable(): Promise<boolean> {
    try {
      if (Platform.OS !== 'ios') {
        return false;
      }
      return await AppleAuthentication.isAvailableAsync();
    } catch (error) {
      console.error('AppleAuthProvider: Error checking availability:', error);
      return false;
    }
  }

  /**
   * Initiate Apple Sign-In flow
   */
  async signIn(): Promise<AuthResult> {
    try {
      console.log('AppleAuthProvider: Starting Apple Sign-In...');

      // Check platform availability
      const isAvailable = await AppleAuthProvider.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error:
            'Apple Sign-In is not available on this device. Please use another sign-in method.',
        };
      }

      // Request Apple ID credential
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('AppleAuthProvider: Apple credential received:', {
        user: credential.user,
        email: credential.email,
        hasIdentityToken: !!credential.identityToken,
      });

      // Validate the credential
      const validationResult = await this.validateCredentials(credential);
      if (!validationResult.success) {
        return validationResult;
      }

      // Extract user data for account creation
      const userData = await this.extractUserData(credential);
      console.log('AppleAuthProvider: Extracted user data:', {
        name: userData.name,
        email: userData.email,
        authProvider: userData.authProvider,
      });

      return {
        success: true,
        user: {
          id: '', // Will be set by AuthService after DB insertion
          name: userData.name,
          email: userData.email,
          npub: userData.npub,
          role: userData.role || undefined,
          createdAt: new Date().toISOString(),
        } as any, // Type assertion for partial user
        needsOnboarding: true,
        needsRoleSelection: true,
        needsWalletCreation: true,
        userData, // Pass raw user data for AuthService
      } as AuthResult & { userData: CreateUserData };
    } catch (error: any) {
      console.error('AppleAuthProvider: Sign-in failed:', error);

      // Handle user cancellation gracefully
      if (
        error.code === 'ERR_CANCELED' ||
        error.message?.includes('canceled')
      ) {
        return {
          success: false,
          error: 'Sign-in was cancelled. Please try again.',
        };
      }

      // Handle other Apple-specific errors
      if (error.code === 'ERR_REQUEST_FAILED') {
        return {
          success: false,
          error:
            'Apple Sign-In request failed. Please check your internet connection and try again.',
        };
      }

      return {
        success: false,
        error: `Apple Sign-In failed: ${error.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate Apple authentication credentials
   */
  private async validateCredentials(
    credential: AppleAuthentication.AppleAuthenticationCredential
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check required fields
      if (!credential.identityToken) {
        return {
          success: false,
          error: 'Apple Sign-In failed: No identity token received',
        };
      }

      if (!credential.user) {
        return {
          success: false,
          error: 'Apple Sign-In failed: No user identifier received',
        };
      }

      // Verify identity token structure (basic validation)
      const tokenParts = credential.identityToken.split('.');
      if (tokenParts.length !== 3) {
        return {
          success: false,
          error: 'Apple Sign-In failed: Invalid identity token format',
        };
      }

      console.log('AppleAuthProvider: Credential validation successful');
      return { success: true };
    } catch (error) {
      console.error('AppleAuthProvider: Credential validation error:', error);
      return {
        success: false,
        error: `Credential validation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Extract user data from Apple credential for account creation
   */
  private async extractUserData(
    credential: AppleAuthentication.AppleAuthenticationCredential
  ): Promise<CreateUserData> {
    try {
      // Generate a display name from Apple's full name
      let displayName = 'Apple User';

      if (credential.fullName) {
        const { givenName, familyName } = credential.fullName;
        if (givenName || familyName) {
          displayName =
            [givenName, familyName].filter(Boolean).join(' ') || 'Apple User';
        }
      }

      // For Apple Sign-In, we generate a Nostr key pair since RUNSTR's core identity is built on Nostr
      // This allows Apple users to participate in the Nostr ecosystem seamlessly
      const keyPair = await this.generateNostrKeysForAppleUser(credential.user);

      return {
        name: displayName,
        email: credential.email || undefined,
        npub: keyPair.npub,
        nsec: keyPair.nsec,
        authProvider: 'apple' as AuthProvider,
      };
    } catch (error) {
      console.error('AppleAuthProvider: Error extracting user data:', error);
      throw new Error(
        `Failed to extract user data: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Generate Nostr keys for Apple user
   * Uses Apple's unique user identifier as seed for deterministic key generation
   */
  private async generateNostrKeysForAppleUser(
    appleUserId: string
  ): Promise<{ npub: string; nsec: string }> {
    try {
      // Create a deterministic seed from Apple user ID and app-specific salt
      const appSalt = 'RUNSTR_APPLE_AUTH_v1';
      const seedString = `${appleUserId}_${appSalt}`;

      // Generate a stable hash for the seed
      const seedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        seedString,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // Import nostr-tools for key generation
      const { nip19, getPublicKey } = await import('nostr-tools');

      // Use first 32 bytes of hash as private key (nsec)
      const privateKeyBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        privateKeyBytes[i] = parseInt(seedHash.substring(i * 2, i * 2 + 2), 16);
      }
      const publicKeyBytes = getPublicKey(privateKeyBytes);

      // Convert to bech32 format
      const nsec = nip19.nsecEncode(privateKeyBytes);
      const npub = nip19.npubEncode(publicKeyBytes);

      console.log(
        'AppleAuthProvider: Generated deterministic Nostr keys for Apple user'
      );

      return { npub, nsec };
    } catch (error) {
      console.error('AppleAuthProvider: Error generating Nostr keys:', error);
      throw new Error(
        `Failed to generate Nostr keys: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Handle credential state changes (for existing Apple Sign-In sessions)
   */
  static async getCredentialStateAsync(
    userID: string
  ): Promise<AppleAuthentication.AppleAuthenticationCredentialState> {
    try {
      if (Platform.OS !== 'ios') {
        return AppleAuthentication.AppleAuthenticationCredentialState.NOT_FOUND;
      }

      return await AppleAuthentication.getCredentialStateAsync(userID);
    } catch (error) {
      console.error(
        'AppleAuthProvider: Error getting credential state:',
        error
      );
      return AppleAuthentication.AppleAuthenticationCredentialState.NOT_FOUND;
    }
  }
}

export default AppleAuthProvider;
