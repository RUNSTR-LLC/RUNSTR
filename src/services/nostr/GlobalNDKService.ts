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
   *
   * PERFORMANCE: Reduced from 4 to 3 relays (removed Primal)
   * - relay.primal.net removed to avoid EOSE hangs (based on runstr-github testing)
   * - 25% fewer WebSocket connections = faster initial load
   */
  private static readonly DEFAULT_RELAYS = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    // 'wss://relay.primal.net', // Removed: causes EOSE hangs
  ];

  /**
   * Get or create the global NDK instance
   *
   * ✅ ANDROID FIX: Now non-blocking - returns immediately with degraded instance
   * Connection happens in background without blocking app startup
   */
  static async getInstance(): Promise<NDK> {
    // If instance exists, check connection status
    if (this.instance) {
      const status = this.getStatus();
      console.log(`♻️ GlobalNDK: Reusing cached instance (${status.connectedRelays}/${status.relayCount} relays connected)`);

      // If below target threshold (2 relays), trigger background reconnection
      if (status.connectedRelays < 2 && !this.initPromise) {
        console.log(`🔄 GlobalNDK: Only ${status.connectedRelays}/3 relays connected, starting background reconnection...`);
        this.initPromise = this.connectInBackground();
      }

      return this.instance;
    }

    // Create degraded instance immediately (non-blocking)
    console.log('🚀 GlobalNDK: Creating instant degraded instance...');

    const degradedNDK = new NDK({
      explicitRelayUrls: this.DEFAULT_RELAYS,
      autoConnectUserRelays: false,
      autoFetchUserMutelist: false,
    });

    this.instance = degradedNDK;
    this.isInitialized = true;

    // ✅ ANDROID FIX: Start background connection WITHOUT awaiting
    if (!this.initPromise) {
      this.initPromise = this.connectInBackground();
    }

    return degradedNDK;
  }

  /**
   * ✅ ANDROID FIX: Background connection (non-blocking)
   * Attempts to connect to relays without blocking getInstance()
   */
  private static async connectInBackground(): Promise<void> {
    console.log('🔄 GlobalNDK: Starting background connection to relays...');

    try {
      if (!this.instance) {
        console.warn('⚠️ No NDK instance to connect');
        return;
      }

      // Attempt connection with 10s timeout
      await this.instance.connect(10000);

      const stats = this.instance.pool?.stats();
      const connectedCount = stats?.connected || 0;

      if (connectedCount > 0) {
        console.log(`✅ GlobalNDK: Background connection successful - ${connectedCount} relays connected`);
      } else {
        console.warn('⚠️ GlobalNDK: Background connection failed - no relays connected');
        // Schedule retry
        setTimeout(() => this.retryConnection(3), 5000); // Retry after 5s
      }
    } catch (error) {
      console.warn('⚠️ GlobalNDK: Background connection error:', error);
      // Schedule retry
      setTimeout(() => this.retryConnection(3), 5000); // Retry after 5s
    } finally {
      this.initPromise = null;
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
      console.log(`   Relays: ${relayUrls.join(', ')}`);

      // Create NDK instance with optimized settings
      const ndk = new NDK({
        explicitRelayUrls: relayUrls,
        autoConnectUserRelays: true,  // Connect to user's preferred relays
        autoFetchUserMutelist: false, // Don't auto-fetch mute lists (saves bandwidth)
        // Note: debug option removed - was causing "ndk.debug.extend is not a function" error
      });

      // ✅ FIX: Increased timeout from 2s → 10s
      // React Native WebSocket connections take longer than web
      console.log('⏳ GlobalNDK: Attempting relay connections (10s timeout)...');
      await ndk.connect(10000); // 10-second timeout

      // ✅ FIX: Validate connection status after connect()
      const stats = ndk.pool?.stats();
      const connectedCount = stats?.connected || 0;
      const totalRelays = ndk.pool?.relays?.size || 0;

      console.log('📊 GlobalNDK: Connection status:');
      console.log(`   📡 Connected relays: ${connectedCount}/${totalRelays}`);

      if (stats) {
        console.log(`   ✅ Connected: ${stats.connected || 0}`);
        console.log(`   ⏳ Connecting: ${stats.connecting || 0}`);
        console.log(`   ❌ Disconnected: ${stats.disconnected || 0}`);
      }

      // Verify at least one relay connected
      if (connectedCount === 0) {
        console.error('❌ GlobalNDK: No relays connected after timeout');
        throw new Error('Failed to connect to any Nostr relays');
      }

      console.log(`✅ GlobalNDK: Connected successfully to ${connectedCount} relay(s)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🔌 TOTAL WEBSOCKET CONNECTIONS: ${connectedCount} (Target: 3)`);
      console.log(`📍 This is the ONLY NDK instance - all services share these ${connectedCount} connections`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Store in global for backward compatibility (some old code checks this)
      (global as any).preInitializedNDK = ndk;

      return ndk;
    } catch (error) {
      console.error('❌ GlobalNDK: Initialization failed:', error);
      console.error('   Error details:', error instanceof Error ? error.message : String(error));
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

  /**
   * Wait for ALL relays to connect before proceeding
   *
   * CRITICAL: This prevents queries from running with partial relay connectivity,
   * which causes incomplete results and "missing data" issues.
   *
   * @param timeoutMs Maximum time to wait (default: 10 seconds)
   * @returns true if all relays connected, false if timeout occurred
   */
  static async waitForConnection(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms

    while (Date.now() - startTime < timeoutMs) {
      const status = this.getStatus();

      // Success: All relays are connected
      if (status.connectedRelays === status.relayCount && status.relayCount > 0) {
        console.log(`✅ GlobalNDK: All ${status.relayCount} relays connected, ready for queries`);
        return true;
      }

      // Still waiting
      console.log(`⏳ GlobalNDK: Waiting for relays... ${status.connectedRelays}/${status.relayCount} connected`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    // Timeout: Proceed with partial connectivity
    const finalStatus = this.getStatus();
    console.warn(
      `⚠️ GlobalNDK: Connection timeout after ${timeoutMs}ms - ` +
      `proceeding with ${finalStatus.connectedRelays}/${finalStatus.relayCount} relays connected`
    );
    return false;
  }

  /**
   * Wait for MINIMUM number of relays to connect before proceeding
   *
   * Progressive connection strategy - faster UX while maintaining good data coverage.
   * Accepts partial connectivity (e.g., 2/4 relays) instead of waiting for all relays.
   *
   * @param minRelays Minimum number of relays required (default: 2 for 50% coverage)
   * @param timeoutMs Maximum time to wait (default: 4 seconds)
   * @returns true if minimum relays connected, false if timeout occurred
   */
  static async waitForMinimumConnection(
    minRelays: number = 2,
    timeoutMs: number = 4000
  ): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms

    while (Date.now() - startTime < timeoutMs) {
      const status = this.getStatus();

      // Success: Minimum relay count met
      if (status.connectedRelays >= minRelays) {
        console.log(
          `✅ GlobalNDK: ${status.connectedRelays}/${status.relayCount} relays connected ` +
          `(minimum: ${minRelays}) - ready for queries`
        );
        return true;
      }

      // Still waiting
      if (Date.now() - startTime < timeoutMs - checkInterval) {
        console.log(
          `⏳ GlobalNDK: Waiting for minimum relays... ${status.connectedRelays}/${minRelays} connected`
        );
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    // Timeout: Check if we have ANY connectivity
    const finalStatus = this.getStatus();
    const hasMinimum = finalStatus.connectedRelays >= minRelays;

    if (hasMinimum) {
      console.log(
        `✅ GlobalNDK: Minimum threshold met - ${finalStatus.connectedRelays}/${minRelays} relays`
      );
    } else {
      console.warn(
        `⚠️ GlobalNDK: Connection timeout after ${timeoutMs}ms - ` +
        `only ${finalStatus.connectedRelays}/${minRelays} minimum relays connected`
      );
      this.logConnectionDiagnostics();
    }

    return hasMinimum;
  }

  /**
   * Log detailed connection diagnostics for debugging
   * Shows per-relay connection status and overall health
   */
  static logConnectionDiagnostics(): void {
    const status = this.getStatus();
    const relays = Array.from(this.instance?.pool?.relays?.values() || []);

    console.log('━━━━━ NOSTR RELAY DIAGNOSTICS ━━━━━');
    console.log(`Total Relays: ${status.relayCount}`);
    console.log(`Connected: ${status.connectedRelays}`);
    console.log(`Connection Rate: ${Math.round((status.connectedRelays / status.relayCount) * 100)}%`);
    console.log('');
    console.log('Per-Relay Status:');

    relays.forEach(relay => {
      const connStatus = relay.connectivity.status; // 0=disconnected, 1=connected, 2=connecting
      const statusText = ['❌ DISCONNECTED', '✅ CONNECTED', '⏳ CONNECTING'][connStatus] || '❓ UNKNOWN';
      console.log(`  ${relay.url}: ${statusText}`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * Retry connection with exponential backoff
   * Called automatically in background if initial connection fails
   */
  static async retryConnection(maxAttempts: number = 3): Promise<boolean> {
    if (this.isConnected()) {
      console.log('✅ GlobalNDK: Already connected, no retry needed');
      return true;
    }

    console.log(`🔄 GlobalNDK: Starting connection retry (max ${maxAttempts} attempts)...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 1s, 2s, 4s, max 10s

      console.log(`🔄 GlobalNDK: Retry attempt ${attempt}/${maxAttempts} after ${backoffDelay}ms delay...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));

      try {
        // Clear previous failed instance
        if (this.instance) {
          await this.cleanup();
        }

        // Try to reconnect
        await this.getInstance();

        // Check if we successfully connected
        if (this.isConnected()) {
          console.log(`✅ GlobalNDK: Reconnected successfully on attempt ${attempt}`);
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ GlobalNDK: Retry attempt ${attempt} failed:`, error);
        // Continue to next attempt
      }
    }

    console.error(`❌ GlobalNDK: All ${maxAttempts} retry attempts failed`);
    return false;
  }

  /**
   * Start background retry process
   * Non-blocking - runs in background without blocking app startup
   */
  static startBackgroundRetry(): void {
    if (this.isConnected()) {
      console.log('✅ GlobalNDK: Already connected, no background retry needed');
      return;
    }

    console.log('🔄 GlobalNDK: Starting background connection retry...');

    // Run retry in background without awaiting
    this.retryConnection(3).then(success => {
      if (success) {
        console.log('✅ GlobalNDK: Background retry succeeded - relays now connected');
      } else {
        console.warn('⚠️ GlobalNDK: Background retry failed - app will continue in offline mode');
      }
    }).catch(error => {
      console.error('❌ GlobalNDK: Background retry error:', error);
    });
  }

  /**
   * Log current connection count - useful for debugging Phase 1 implementation
   */
  static logConnectionCount(): void {
    const status = this.getStatus();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔌 WEBSOCKET CONNECTION COUNT: ${status.connectedRelays}/${status.relayCount}`);
    console.log(`📊 Status: ${this.isConnected() ? 'CONNECTED' : 'DISCONNECTED'}`);
    console.log(`✅ Expected: 3 connections (Damus, nos.lol, Nostr.band)`);
    console.log(`${status.connectedRelays === 3 ? '✅ PERFECT' : '⚠️ CHECK FOR DUPLICATE NDK INSTANCES'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// Export singleton getter for convenience
export const getGlobalNDK = () => GlobalNDKService.getInstance();
