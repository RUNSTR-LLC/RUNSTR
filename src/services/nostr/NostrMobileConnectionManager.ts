/**
 * NostrMobileConnectionManager - Mobile-Specific Connection Management
 * Handles React Native app lifecycle events for optimal WebSocket connection management
 * Manages background/foreground transitions, network state changes, and battery optimization
 */

import { AppState, AppStateStatus, Platform } from 'react-native';
import { nostrRelayManager } from './NostrRelayManager';

export interface MobileConnectionConfig {
  pauseInBackground: boolean;
  resumeDelay: number;
  backgroundTimeout: number;
  enableBatteryOptimization: boolean;
  minBackgroundDuration: number;
  maxReconnectAttempts: number;
}

export interface ConnectionState {
  isActive: boolean;
  appState: AppStateStatus;
  backgroundSince?: Date;
  reconnectAttempts: number;
  lastNetworkChange?: Date;
}

export class NostrMobileConnectionManager {
  private static instance: NostrMobileConnectionManager;
  private config: MobileConnectionConfig;
  private state: ConnectionState;
  private appStateSubscription: any;
  private backgroundTimer: NodeJS.Timeout | null = null;
  private resumeTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(state: ConnectionState) => void>> =
    new Map();

  private constructor(config?: Partial<MobileConnectionConfig>) {
    this.config = {
      pauseInBackground: true,
      resumeDelay: 1000, // 1 second delay when resuming
      backgroundTimeout: 30000, // 30 seconds before disconnecting in background
      enableBatteryOptimization: true,
      minBackgroundDuration: 5000, // Minimum time in background before considering disconnect
      maxReconnectAttempts: 5,
      ...config,
    };

    this.state = {
      isActive: true,
      appState: AppState.currentState,
      reconnectAttempts: 0,
    };

    this.initialize();
  }

  static getInstance(
    config?: Partial<MobileConnectionConfig>
  ): NostrMobileConnectionManager {
    if (!NostrMobileConnectionManager.instance) {
      NostrMobileConnectionManager.instance = new NostrMobileConnectionManager(
        config
      );
    }
    return NostrMobileConnectionManager.instance;
  }

  /**
   * Initialize mobile connection management
   */
  private initialize(): void {
    console.log('🔄 Initializing mobile connection management...');

    // Set up app state change listener
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );

    // Set up network state listeners if available
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      this.setupNetworkListeners();
    }

    console.log('✅ Mobile connection management initialized');
  }

  /**
   * Handle app state changes (background/foreground)
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    const previousAppState = this.state.appState;
    console.log(`📱 App state changing: ${previousAppState} → ${nextAppState}`);

    // Clear any existing timers
    this.clearTimers();

    if (
      previousAppState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App coming to foreground
      this.handleForegroundTransition();
    } else if (
      previousAppState === 'active' &&
      nextAppState.match(/inactive|background/)
    ) {
      // App going to background
      this.handleBackgroundTransition();
    }

    this.updateState({
      appState: nextAppState,
      backgroundSince: nextAppState.match(/inactive|background/)
        ? new Date()
        : undefined,
    });
  }

  /**
   * Handle app going to background
   */
  private handleBackgroundTransition(): void {
    console.log('📱 App transitioning to background...');

    if (!this.config.pauseInBackground) {
      console.log('🔄 Background pause disabled, maintaining connections');
      return;
    }

    // Set immediate state change
    this.updateState({ isActive: false });

    // Set timer for potential disconnection
    if (this.config.backgroundTimeout > 0) {
      this.backgroundTimer = setTimeout(() => {
        this.handleBackgroundTimeout();
      }, this.config.backgroundTimeout) as any;

      console.log(
        `⏰ Background timeout set for ${this.config.backgroundTimeout}ms`
      );
    }
  }

  /**
   * Handle background timeout - disconnect from relays
   */
  private handleBackgroundTimeout(): void {
    console.log('📱 Background timeout reached, managing connections...');

    const backgroundDuration = this.state.backgroundSince
      ? Date.now() - this.state.backgroundSince.getTime()
      : 0;

    // Only disconnect if we've been in background long enough
    if (backgroundDuration >= this.config.minBackgroundDuration) {
      if (this.config.enableBatteryOptimization) {
        this.pauseConnections();
      }
    }
  }

  /**
   * Handle app coming to foreground
   */
  private handleForegroundTransition(): void {
    console.log('📱 App transitioning to foreground...');

    // Calculate how long we were in background
    const backgroundDuration = this.state.backgroundSince
      ? Date.now() - this.state.backgroundSince.getTime()
      : 0;

    console.log(`📊 Background duration: ${backgroundDuration}ms`);

    // Set resume timer to avoid rapid connection changes
    if (this.config.resumeDelay > 0) {
      this.resumeTimer = setTimeout(() => {
        this.handleForegroundResume(backgroundDuration);
      }, this.config.resumeDelay) as any;
    } else {
      this.handleForegroundResume(backgroundDuration);
    }
  }

  /**
   * Handle delayed foreground resume
   */
  private handleForegroundResume(backgroundDuration: number): void {
    console.log('📱 Resuming connections after foreground transition...');

    this.updateState({
      isActive: true,
      reconnectAttempts: 0, // Reset reconnect attempts on successful resume
    });

    // If connections were paused due to background timeout, resume them
    if (backgroundDuration >= this.config.backgroundTimeout) {
      this.resumeConnections();
    } else {
      // Just verify connections are still healthy
      this.verifyConnections();
    }
  }

  /**
   * Pause relay connections for battery optimization
   */
  private pauseConnections(): void {
    console.log('🔋 Pausing relay connections for battery optimization...');

    try {
      // Get connection stats before pausing
      const stats = nostrRelayManager.getConnectionStatus();
      console.log(`📊 Pausing ${stats.connected} connected relays`);

      // Note: We don't fully disconnect, just reduce activity
      // The WebSocket connections will handle their own keepalive management
      this.emit('connectionsPaused', stats);
    } catch (error) {
      console.error('❌ Error pausing connections:', error);
    }
  }

  /**
   * Resume relay connections after background pause
   */
  private resumeConnections(): void {
    console.log('🔋 Resuming relay connections...');

    try {
      // Check if any reconnections are needed
      const connectedRelays = nostrRelayManager.getConnectedRelays();
      const totalRelays = nostrRelayManager.getRelayUrls().length;

      console.log(
        `📊 ${connectedRelays.length}/${totalRelays} relays connected`
      );

      // If we lost connections, attempt to reconnect
      if (
        connectedRelays.length < totalRelays &&
        this.state.reconnectAttempts < this.config.maxReconnectAttempts
      ) {
        this.updateState({
          reconnectAttempts: this.state.reconnectAttempts + 1,
        });

        console.log(
          `🔄 Attempting reconnection (${this.state.reconnectAttempts}/${this.config.maxReconnectAttempts})`
        );
        nostrRelayManager.reconnectAll();
      }

      this.emit('connectionsResumed', {
        connectedRelays: connectedRelays.length,
        totalRelays,
        reconnectAttempt: this.state.reconnectAttempts,
      });
    } catch (error) {
      console.error('❌ Error resuming connections:', error);
    }
  }

  /**
   * Verify existing connections are healthy
   */
  private verifyConnections(): void {
    console.log('🔍 Verifying connection health...');

    const stats = nostrRelayManager.getConnectionStatus();

    if (stats.connected === 0) {
      console.warn('⚠️ No connected relays, attempting reconnection...');
      this.resumeConnections();
    } else {
      console.log(`✅ ${stats.connected} relays still connected`);
    }
  }

  /**
   * Set up network state listeners for mobile platforms
   */
  private setupNetworkListeners(): void {
    // Network state monitoring would be implemented here
    // Could use @react-native-community/netinfo if needed
    console.log('📶 Network state monitoring ready (placeholder)');
  }

  /**
   * Clear all active timers
   */
  private clearTimers(): void {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  }

  /**
   * Update internal state and notify listeners
   */
  private updateState(updates: Partial<ConnectionState>): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };

    console.log('📊 Connection state updated:', {
      isActive: this.state.isActive,
      appState: this.state.appState,
      reconnectAttempts: this.state.reconnectAttempts,
    });

    this.emit('stateChange', this.state);
  }

  /**
   * Emit events to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Add event listener
   */
  on(event: string, listener: (data: any) => void): () => void {
    const listeners = this.listeners.get(event) || new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);

    return () => {
      listeners.delete(listener);
    };
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Get configuration
   */
  getConfig(): MobileConnectionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MobileConnectionConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('⚙️ Mobile connection config updated');
  }

  /**
   * Force connection check
   */
  async checkConnections(): Promise<void> {
    console.log('🔍 Manual connection check requested...');
    this.verifyConnections();
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    isActive: boolean;
    appState: AppStateStatus;
    backgroundDuration?: number;
    reconnectAttempts: number;
    relayStats: any;
  } {
    const backgroundDuration = this.state.backgroundSince
      ? Date.now() - this.state.backgroundSince.getTime()
      : undefined;

    return {
      isActive: this.state.isActive,
      appState: this.state.appState,
      backgroundDuration,
      reconnectAttempts: this.state.reconnectAttempts,
      relayStats: nostrRelayManager.getConnectionStatus(),
    };
  }

  /**
   * Cleanup and disconnect
   */
  cleanup(): void {
    console.log('🧹 Cleaning up mobile connection manager...');

    this.clearTimers();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.listeners.clear();

    console.log('✅ Mobile connection manager cleanup completed');
  }
}

// Export singleton instance
export const mobileConnectionManager =
  NostrMobileConnectionManager.getInstance();
