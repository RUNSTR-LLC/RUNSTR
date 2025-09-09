/**
 * NostrErrorRecoveryService - Mobile Network Error Handling & Recovery
 * Handles unstable mobile network conditions with intelligent retry strategies
 * Implements exponential backoff, circuit breaker patterns, and network-aware recovery
 */

import { nostrRelayManager } from './NostrRelayManager';
import { mobileConnectionManager } from './NostrMobileConnectionManager';

export interface ErrorRecoveryConfig {
  maxRetryAttempts: number;
  baseRetryDelay: number;
  maxRetryDelay: number;
  exponentialBackoffMultiplier: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetTime: number;
  networkTimeoutMs: number;
  enableAdaptiveRetry: boolean;
}

export interface NetworkError {
  type: 'connection' | 'timeout' | 'authentication' | 'rate_limit' | 'unknown';
  message: string;
  relayUrl: string;
  timestamp: Date;
  retryAttempt: number;
  isRecoverable: boolean;
}

export interface RelayHealth {
  url: string;
  status: 'healthy' | 'degraded' | 'circuit_open' | 'offline';
  errorCount: number;
  lastError?: NetworkError;
  lastSuccessfulConnection?: Date;
  consecutiveFailures: number;
  circuitOpenUntil?: Date;
  averageResponseTime: number;
}

export interface RecoveryMetrics {
  totalErrors: number;
  recoveredConnections: number;
  failedRecoveries: number;
  averageRecoveryTime: number;
  relayHealthMap: Map<string, RelayHealth>;
}

export class NostrErrorRecoveryService {
  private static instance: NostrErrorRecoveryService;
  private config: ErrorRecoveryConfig;
  private metrics: RecoveryMetrics;
  private activeRecoveries: Map<string, NodeJS.Timeout> = new Map();
  private errorHistory: NetworkError[] = [];
  private maxErrorHistory = 100;

  private constructor(config?: Partial<ErrorRecoveryConfig>) {
    this.config = {
      maxRetryAttempts: 5,
      baseRetryDelay: 1000, // 1 second
      maxRetryDelay: 30000, // 30 seconds
      exponentialBackoffMultiplier: 2,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTime: 60000, // 1 minute
      networkTimeoutMs: 15000, // 15 seconds
      enableAdaptiveRetry: true,
      ...config,
    };

    this.metrics = {
      totalErrors: 0,
      recoveredConnections: 0,
      failedRecoveries: 0,
      averageRecoveryTime: 0,
      relayHealthMap: new Map(),
    };

    this.initialize();
  }

  static getInstance(
    config?: Partial<ErrorRecoveryConfig>
  ): NostrErrorRecoveryService {
    if (!NostrErrorRecoveryService.instance) {
      NostrErrorRecoveryService.instance = new NostrErrorRecoveryService(
        config
      );
    }
    return NostrErrorRecoveryService.instance;
  }

  /**
   * Initialize error recovery service
   */
  private initialize(): void {
    console.log('🛡️ Initializing error recovery service...');

    // Initialize relay health tracking
    nostrRelayManager.getRelayUrls().forEach((url) => {
      this.metrics.relayHealthMap.set(url, {
        url,
        status: 'healthy',
        errorCount: 0,
        consecutiveFailures: 0,
        averageResponseTime: 0,
      });
    });

    // Set up connection monitoring
    this.setupConnectionMonitoring();

    console.log('✅ Error recovery service initialized');
  }

  /**
   * Set up connection monitoring and error handling
   */
  private setupConnectionMonitoring(): void {
    nostrRelayManager.onStatusChange(() => this.performHealthCheck());
    mobileConnectionManager.on('stateChange', (state) => {
      if (state.isActive) this.handleNetworkResume();
    });
    setInterval(() => this.performHealthCheck(), 30000);
  }

  /**
   * Handle network errors with intelligent recovery
   */
  async handleNetworkError(
    relayUrl: string,
    error: Error,
    operation: string,
    retryAttempt = 0
  ): Promise<boolean> {
    const networkError = this.categorizeError(
      relayUrl,
      error,
      operation,
      retryAttempt
    );

    console.error(
      `🚨 Network error on ${relayUrl} (attempt ${retryAttempt}):`,
      networkError.message
    );

    // Record error
    this.recordError(networkError);

    // Update relay health
    this.updateRelayHealth(relayUrl, false, networkError);

    // Check if error is recoverable
    if (!networkError.isRecoverable) {
      console.error(
        `❌ Non-recoverable error for ${relayUrl}: ${networkError.message}`
      );
      return false;
    }

    // Check circuit breaker
    const relayHealth = this.metrics.relayHealthMap.get(relayUrl);
    if (relayHealth && this.isCircuitOpen(relayHealth)) {
      console.warn(`⚡ Circuit breaker open for ${relayUrl}, skipping retry`);
      return false;
    }

    // Check retry limits
    if (retryAttempt >= this.config.maxRetryAttempts) {
      console.error(`❌ Max retry attempts reached for ${relayUrl}`);
      this.openCircuitBreaker(relayUrl);
      return false;
    }

    // Calculate retry delay
    const delay = this.calculateRetryDelay(retryAttempt, relayUrl);

    console.log(
      `🔄 Scheduling retry for ${relayUrl} in ${delay}ms (attempt ${
        retryAttempt + 1
      })`
    );

    // Schedule recovery attempt
    return new Promise((resolve) => {
      const timeoutId = setTimeout(async () => {
        this.activeRecoveries.delete(relayUrl);

        try {
          const success = await this.attemptRecovery(relayUrl, operation);
          if (success) {
            this.updateRelayHealth(relayUrl, true);
            this.metrics.recoveredConnections++;
            resolve(true);
          } else {
            // Recursive retry
            const recovered = await this.handleNetworkError(
              relayUrl,
              error,
              operation,
              retryAttempt + 1
            );
            resolve(recovered);
          }
        } catch (recoveryError) {
          console.error(
            `❌ Recovery attempt failed for ${relayUrl}:`,
            recoveryError
          );
          const recovered = await this.handleNetworkError(
            relayUrl,
            error as Error,
            operation,
            retryAttempt + 1
          );
          resolve(recovered);
        }
      }, delay);

      this.activeRecoveries.set(relayUrl, timeoutId as any);
    });
  }

  /**
   * Categorize error types for appropriate handling
   */
  private categorizeError(
    relayUrl: string,
    error: Error,
    operation: string,
    retryAttempt: number
  ): NetworkError {
    let type: NetworkError['type'] = 'unknown';
    let isRecoverable = true;

    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) {
      type = 'timeout';
    } else if (
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('enotfound') ||
      message.includes('enetunreach')
    ) {
      type = 'connection';
    } else if (message.includes('auth') || message.includes('unauthorized')) {
      type = 'authentication';
      isRecoverable = false; // Auth errors typically need user intervention
    } else if (message.includes('rate limit') || message.includes('too many')) {
      type = 'rate_limit';
    }

    return {
      type,
      message: error.message,
      relayUrl,
      timestamp: new Date(),
      retryAttempt,
      isRecoverable,
    };
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(retryAttempt: number, relayUrl: string): number {
    let delay =
      this.config.baseRetryDelay *
      Math.pow(this.config.exponentialBackoffMultiplier, retryAttempt);

    // Cap at max delay
    delay = Math.min(delay, this.config.maxRetryDelay);

    // Add jitter (±25%) to avoid thundering herd
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    delay += jitter;

    // Adaptive delay based on relay health
    if (this.config.enableAdaptiveRetry) {
      const relayHealth = this.metrics.relayHealthMap.get(relayUrl);
      if (relayHealth && relayHealth.consecutiveFailures > 2) {
        // Increase delay for problematic relays
        delay *= 1.5;
      }
    }

    return Math.max(delay, 500); // Minimum 500ms delay
  }

  /**
   * Attempt recovery for a specific relay
   */
  private async attemptRecovery(
    relayUrl: string,
    operation: string
  ): Promise<boolean> {
    console.log(`🔧 Attempting recovery for ${relayUrl} (${operation})`);

    const startTime = Date.now();

    try {
      // For connection recovery, try to reconnect the specific relay
      if (operation === 'connection') {
        const stats = nostrRelayManager.getConnectionStatus();
        const wasConnected = stats.connected;

        await nostrRelayManager.reconnectAll(); // This will reconnect all relays

        // Give it a moment to establish connection
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const newStats = nostrRelayManager.getConnectionStatus();
        const isNowConnected = newStats.connected > wasConnected;

        if (isNowConnected) {
          const recoveryTime = Date.now() - startTime;
          this.updateRecoveryMetrics(true, recoveryTime);
          console.log(
            `✅ Recovery successful for ${relayUrl} in ${recoveryTime}ms`
          );
          return true;
        }
      }

      // For other operations, verify the connection works
      const connectionTest = await this.testConnection(relayUrl);
      if (connectionTest) {
        const recoveryTime = Date.now() - startTime;
        this.updateRecoveryMetrics(true, recoveryTime);
        console.log(
          `✅ Recovery successful for ${relayUrl} in ${recoveryTime}ms`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Recovery failed for ${relayUrl}:`, error);
      this.updateRecoveryMetrics(false, Date.now() - startTime);
      return false;
    }
  }

  /**
   * Test connection to a specific relay
   */
  private async testConnection(relayUrl: string): Promise<boolean> {
    try {
      const connectedRelays = nostrRelayManager.getConnectedRelays();
      return connectedRelays.some(
        (relay) => relay.url === relayUrl && relay.status === 'connected'
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Update relay health status
   */
  private updateRelayHealth(
    relayUrl: string,
    success: boolean,
    error?: NetworkError
  ): void {
    const health = this.metrics.relayHealthMap.get(relayUrl);
    if (!health) return;

    if (success) {
      health.consecutiveFailures = 0;
      health.lastSuccessfulConnection = new Date();
      health.status = 'healthy';

      // Close circuit breaker if it was open
      if (health.circuitOpenUntil) {
        delete health.circuitOpenUntil;
        console.log(`🔌 Circuit breaker closed for ${relayUrl}`);
      }
    } else {
      health.errorCount++;
      health.consecutiveFailures++;
      health.lastError = error;

      if (health.consecutiveFailures >= this.config.circuitBreakerThreshold) {
        health.status = 'circuit_open';
      } else if (health.consecutiveFailures > 1) {
        health.status = 'degraded';
      }
    }

    this.metrics.relayHealthMap.set(relayUrl, health);
  }

  /**
   * Check if circuit breaker is open for a relay
   */
  private isCircuitOpen(relayHealth: RelayHealth): boolean {
    if (!relayHealth.circuitOpenUntil) return false;

    const now = Date.now();
    if (now > relayHealth.circuitOpenUntil.getTime()) {
      // Circuit breaker timeout expired, close it
      delete relayHealth.circuitOpenUntil;
      relayHealth.status = 'degraded';
      console.log(`🔌 Circuit breaker timeout expired for ${relayHealth.url}`);
      return false;
    }

    return true;
  }

  /**
   * Open circuit breaker for a relay
   */
  private openCircuitBreaker(relayUrl: string): void {
    const health = this.metrics.relayHealthMap.get(relayUrl);
    if (!health) return;

    health.status = 'circuit_open';
    health.circuitOpenUntil = new Date(
      Date.now() + this.config.circuitBreakerResetTime
    );

    console.warn(
      `⚡ Circuit breaker opened for ${relayUrl} until ${health.circuitOpenUntil.toISOString()}`
    );
  }

  /**
   * Record error in history
   */
  private recordError(error: NetworkError): void {
    this.errorHistory.push(error);
    this.metrics.totalErrors++;

    // Trim error history if needed
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.maxErrorHistory);
    }
  }

  /**
   * Update recovery metrics
   */
  private updateRecoveryMetrics(success: boolean, recoveryTime: number): void {
    if (success) {
      this.metrics.recoveredConnections++;

      // Update average recovery time
      const currentAverage = this.metrics.averageRecoveryTime;
      const totalRecoveries = this.metrics.recoveredConnections;
      this.metrics.averageRecoveryTime =
        (currentAverage * (totalRecoveries - 1) + recoveryTime) /
        totalRecoveries;
    } else {
      this.metrics.failedRecoveries++;
    }
  }

  /**
   * Handle network resume after mobile app comes back online
   */
  private handleNetworkResume(): void {
    setTimeout(() => this.performHealthCheck(), 2000);
  }

  /**
   * Perform health check on all relays
   */
  private performHealthCheck(): void {
    const stats = nostrRelayManager.getConnectionStatus();
    console.log(`📊 Relay status: ${stats.connected}/${stats.total} connected`);

    // Update relay health based on connection status
    const connectedRelays = nostrRelayManager.getConnectedRelays();
    this.metrics.relayHealthMap.forEach((health, url) => {
      const isConnected = connectedRelays.some((relay) => relay.url === url);
      if (!isConnected && health.status === 'healthy') {
        health.status = 'degraded';
      }
    });
  }

  /**
   * Get error recovery metrics
   */
  getMetrics(): RecoveryMetrics {
    return {
      ...this.metrics,
      relayHealthMap: new Map(this.metrics.relayHealthMap), // Return copy
    };
  }

  /**
   * Get recent error history
   */
  getRecentErrors(limit = 10): NetworkError[] {
    return this.errorHistory.slice(-limit);
  }

  /**
   * Reset metrics and error history
   */
  resetMetrics(): void {
    this.metrics = {
      totalErrors: 0,
      recoveredConnections: 0,
      failedRecoveries: 0,
      averageRecoveryTime: 0,
      relayHealthMap: new Map(),
    };

    this.errorHistory = [];

    // Reinitialize relay health
    nostrRelayManager.getRelayUrls().forEach((url) => {
      this.metrics.relayHealthMap.set(url, {
        url,
        status: 'healthy',
        errorCount: 0,
        consecutiveFailures: 0,
        averageResponseTime: 0,
      });
    });

    console.log('🔄 Error recovery metrics reset');
  }

  /**
   * Cleanup active recoveries
   */
  cleanup(): void {
    console.log('🧹 Cleaning up error recovery service...');

    // Clear all active recovery attempts
    this.activeRecoveries.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.activeRecoveries.clear();

    console.log('✅ Error recovery service cleanup completed');
  }
}

// Export singleton instance
export const errorRecoveryService = NostrErrorRecoveryService.getInstance();
