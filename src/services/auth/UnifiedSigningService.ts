/**
 * UnifiedSigningService - Unified signing for both nsec and Amber authentication
 * Detects authentication method and provides appropriate signer
 * Maintains backward compatibility with direct nsec access
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NDKPrivateKeySigner, type NDKSigner } from '@nostr-dev-kit/ndk';
import { AmberNDKSigner } from './amber/AmberNDKSigner';
import { nsecToPrivateKey } from '../../utils/nostr';
import type { NostrEvent } from '@nostr-dev-kit/ndk';
import { GlobalNDKService } from '../nostr/GlobalNDKService';

export type AuthMethod = 'nostr' | 'amber' | null;

export interface SigningResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export class UnifiedSigningService {
  private static instance: UnifiedSigningService;
  private cachedSigner: NDKSigner | null = null;
  private cachedAuthMethod: AuthMethod = null;

  private constructor() {}

  static getInstance(): UnifiedSigningService {
    if (!UnifiedSigningService.instance) {
      UnifiedSigningService.instance = new UnifiedSigningService();
    }
    return UnifiedSigningService.instance;
  }

  /**
   * Get the current authentication method
   * Returns 'nostr' (nsec paste), 'amber' (external signer), or null (not authenticated)
   */
  async getAuthMethod(): Promise<AuthMethod> {
    try {
      // Check if we have a cached value
      if (this.cachedAuthMethod) {
        return this.cachedAuthMethod;
      }

      // Check stored auth method
      const storedMethod = await AsyncStorage.getItem('@runstr:auth_method');

      if (storedMethod === 'amber') {
        this.cachedAuthMethod = 'amber';
        return 'amber';
      }

      if (storedMethod === 'nostr') {
        this.cachedAuthMethod = 'nostr';
        return 'nostr';
      }

      // Backward compatibility: check if nsec exists (old users who don't have auth_method set)
      const nsec = await AsyncStorage.getItem('@runstr:user_nsec');
      if (nsec) {
        // Auto-upgrade: set auth method for old users
        await AsyncStorage.setItem('@runstr:auth_method', 'nostr');
        this.cachedAuthMethod = 'nostr';
        console.log('✅ UnifiedSigningService: Auto-detected nostr auth method (backward compatibility)');
        return 'nostr';
      }

      // Check if Amber pubkey exists (for Amber users)
      const amberPubkey = await AsyncStorage.getItem('@runstr:amber_pubkey');
      if (amberPubkey) {
        this.cachedAuthMethod = 'amber';
        return 'amber';
      }

      return null;
    } catch (error) {
      console.error('UnifiedSigningService: Error detecting auth method:', error);
      return null;
    }
  }

  /**
   * Get the appropriate signer based on authentication method
   * Returns NDKPrivateKeySigner for nsec or AmberNDKSigner for Amber
   */
  async getSigner(): Promise<NDKSigner | null> {
    try {
      // Return cached signer if available
      if (this.cachedSigner) {
        return this.cachedSigner;
      }

      const authMethod = await this.getAuthMethod();

      if (authMethod === 'nostr') {
        // Create NDKPrivateKeySigner from stored nsec
        const nsec = await AsyncStorage.getItem('@runstr:user_nsec');
        if (!nsec) {
          throw new Error('No nsec found for nostr authentication');
        }

        // Convert nsec to hex private key
        const hexPrivateKey = nsecToPrivateKey(nsec);

        // Create NDKPrivateKeySigner from hex key
        const signer = new NDKPrivateKeySigner(hexPrivateKey);

        this.cachedSigner = signer;

        // Set signer on GlobalNDK instance for all Nostr operations
        const ndk = await GlobalNDKService.getInstance();
        ndk.signer = signer;

        console.log('✅ UnifiedSigningService: Created NDKPrivateKeySigner from nsec and set on GlobalNDK');
        return signer;
      }

      if (authMethod === 'amber') {
        // Create AmberNDKSigner instance
        const signer = new AmberNDKSigner();

        // Initialize signer
        await signer.blockUntilReady();

        this.cachedSigner = signer;

        // Set signer on GlobalNDK instance for all Nostr operations
        const ndk = await GlobalNDKService.getInstance();
        ndk.signer = signer;

        console.log('✅ UnifiedSigningService: Created AmberNDKSigner and set on GlobalNDK');
        return signer;
      }

      console.warn('⚠️ UnifiedSigningService: No authentication method available');
      return null;
    } catch (error) {
      console.error('UnifiedSigningService: Error getting signer:', error);
      throw error;
    }
  }

  /**
   * Sign a Nostr event using the appropriate signer
   * Handles both nsec and Amber authentication automatically
   */
  async signEvent(event: NostrEvent): Promise<string> {
    try {
      const signer = await this.getSigner();

      if (!signer) {
        throw new Error('No signer available. Please login first.');
      }

      const authMethod = await this.getAuthMethod();
      console.log(`🔐 UnifiedSigningService: Signing event (kind ${event.kind}) with ${authMethod}`);

      // Sign the event
      const signature = await signer.sign(event);

      console.log(`✅ UnifiedSigningService: Event signed successfully`);
      return signature;
    } catch (error) {
      const authMethod = await this.getAuthMethod();

      if (authMethod === 'amber') {
        // Provide helpful Amber-specific error messages
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('rejected')) {
          throw new Error('Signing request rejected in Amber. Please approve the request to continue.');
        }

        if (errorMessage.includes('Could not open Amber')) {
          throw new Error('Could not connect to Amber. Please ensure Amber app is installed and try again.');
        }

        throw new Error(`Amber signing failed: ${errorMessage}`);
      }

      // Generic error for other auth methods
      throw new Error(`Event signing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if signing is available (user is authenticated)
   */
  async canSign(): Promise<boolean> {
    try {
      const authMethod = await this.getAuthMethod();
      return authMethod !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's public key (works for both nsec and Amber)
   */
  async getUserPubkey(): Promise<string | null> {
    try {
      const signer = await this.getSigner();
      if (!signer) return null;

      const user = await signer.user();
      return user.pubkey;
    } catch (error) {
      console.error('UnifiedSigningService: Error getting user pubkey:', error);
      return null;
    }
  }

  /**
   * Get user's npub (works for both nsec and Amber)
   */
  async getUserNpub(): Promise<string | null> {
    try {
      const signer = await this.getSigner();
      if (!signer) return null;

      const user = await signer.user();
      return user.npub;
    } catch (error) {
      console.error('UnifiedSigningService: Error getting user npub:', error);
      return null;
    }
  }

  /**
   * Clear cached signer (call on logout or auth method change)
   */
  clearCache(): void {
    this.cachedSigner = null;
    this.cachedAuthMethod = null;
    console.log('🗑️ UnifiedSigningService: Cache cleared');
  }

  /**
   * Get legacy hex private key (ONLY for nsec users, returns null for Amber)
   * Used for backward compatibility with services that haven't been updated yet
   */
  async getLegacyPrivateKeyHex(): Promise<string | null> {
    try {
      const authMethod = await this.getAuthMethod();

      if (authMethod === 'nostr') {
        const nsec = await AsyncStorage.getItem('@runstr:user_nsec');
        if (!nsec) return null;
        return nsecToPrivateKey(nsec);
      }

      // Amber users don't have access to private key
      if (authMethod === 'amber') {
        console.warn('⚠️ UnifiedSigningService: Cannot get private key for Amber users');
        return null;
      }

      return null;
    } catch (error) {
      console.error('UnifiedSigningService: Error getting legacy private key:', error);
      return null;
    }
  }
}

// Export class instead of instance to prevent blocking module initialization
export default UnifiedSigningService;
export { UnifiedSigningService };
