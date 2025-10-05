/**
 * GlobalNDKService - Centralized NDK instance management
 *
 * CRITICAL OPTIMIZATION: Ensures only ONE NDK instance exists across the entire app,
 * preventing duplicate relay connections and reducing WebSocket overhead by ~90%.
 *
 * Before: 9 services × 4 relays = 36 WebSocket connections
 * After: 1 NDK instance × 4 relays = 4 WebSocket connections
 *
 * Usage:
 * ```typescript
 * const ndk = await GlobalNDKService.getInstance();
 * const events = await ndk.fetchEvents(filter);
 * ```
 */

import NDK, { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class GlobalNDKService {
  private static instance: NDK | null = null;
  private static initPromise: Promise<NDK> | null = null;
  private static isInitialized = false;

  /**
   * Default relay configuration
   * These are fast, reliable relays used across the app
   */
  private static readonly DEFAULT_RELAYS = [
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://nos.lol',
    'wss://relay.nostr.band',
  ];

  /**
   * Get or create the global NDK instance
   *
   * THREAD-SAFE: Multiple concurrent calls will reuse the same initialization promise
   */
  static async getInstance(): Promise<NDK> {
    // Return existing instance if already initialized
    if (this.instance && this.isInitialized) {
      console.log('✅ GlobalNDK: Returning existing instance');
      return this.instance;
    }

    // Reuse existing initialization promise if in progress
    if (this.initPromise) {
      console.log('⏳ GlobalNDK: Waiting for existing initialization...');
      return this.initPromise;
    }

    // Start new initialization
    console.log('🚀 GlobalNDK: Creating new NDK instance...');
    this.initPromise = this.initializeNDK();

    try {
      this.instance = await this.initPromise;
      this.isInitialized = true;
      return this.instance;
    } finally {
      this.initPromise = null; // Clear promise after completion
    }
  }

  /**
   * Initialize NDK with default configuration
   */
  private static async initializeNDK(): Promise<NDK> {
    try {
      // Load relay URLs from storage (or use defaults)
      const storedRelays = await AsyncStorage.getItem('nostr_relays');
      const relayUrls = storedRelays
        ? JSON.parse(storedRelays)
        : this.DEFAULT_RELAYS;

      console.log(`🔗 GlobalNDK: Connecting to ${relayUrls.length} relays...`);

      // Create NDK instance with optimized settings
      const ndk = new NDK({
        explicitRelayUrls: relayUrls,
        autoConnectUserRelays: true,  // Connect to user's preferred relays
        autoFetchUserMutelist: false, // Don't auto-fetch mute lists (saves bandwidth)
      });

      // Connect to relays with timeout
      await ndk.connect(2000); // 2-second timeout

      console.log('✅ GlobalNDK: Connected successfully');
      console.log(`   📡 ${ndk.pool.relays.size} relays active`);

      // Store in global for backward compatibility (some old code checks this)
      (global as any).preInitializedNDK = ndk;

      return ndk;
    } catch (error) {
      console.error('❌ GlobalNDK: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Force reconnect to all relays
   * Useful for recovering from network issues
   */
  static async reconnect(): Promise<void> {
    if (!this.instance) {
      console.warn('⚠️ GlobalNDK: No instance to reconnect');
      return;
    }

    console.log('🔄 GlobalNDK: Reconnecting to relays...');

    try {
      // Disconnect and reconnect
      for (const relay of this.instance.pool.relays.values()) {
        relay.disconnect();
      }

      await this.instance.connect(2000);
      console.log('✅ GlobalNDK: Reconnected successfully');
    } catch (error) {
      console.error('❌ GlobalNDK: Reconnection failed:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  static getStatus(): {
    isInitialized: boolean;
    relayCount: number;
    connectedRelays: number;
  } {
    if (!this.instance) {
      return {
        isInitialized: false,
        relayCount: 0,
        connectedRelays: 0,
      };
    }

    const relays = Array.from(this.instance.pool.relays.values());
    return {
      isInitialized: this.isInitialized,
      relayCount: relays.length,
      connectedRelays: relays.filter(r => r.connectivity.status === 1).length, // 1 = connected
    };
  }

  /**
   * Cleanup - disconnect from all relays
   * Should only be called when app is shutting down
   */
  static async cleanup(): Promise<void> {
    if (!this.instance) return;

    console.log('🔌 GlobalNDK: Disconnecting from all relays...');

    for (const relay of this.instance.pool.relays.values()) {
      relay.disconnect();
    }

    this.instance = null;
    this.isInitialized = false;
    this.initPromise = null;

    console.log('✅ GlobalNDK: Cleanup complete');
  }

  /**
   * Check if instance exists and is connected
   */
  static isConnected(): boolean {
    if (!this.instance || !this.isInitialized) {
      return false;
    }

    // Check if at least one relay is connected
    for (const relay of this.instance.pool.relays.values()) {
      if (relay.connectivity.status === 1) {
        return true;
      }
    }

    return false;
  }
}

// Export singleton getter for convenience
export const getGlobalNDK = () => GlobalNDKService.getInstance();
