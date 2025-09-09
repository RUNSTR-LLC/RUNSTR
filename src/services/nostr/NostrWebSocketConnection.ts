/**
 * NostrWebSocketConnection - Individual Relay WebSocket Management
 * Handles single relay connections with proper lifecycle management, error recovery, and mobile optimization
 */

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'reconnecting';
export type NostrMessage = [string, ...any[]];

export interface ConnectionStats {
  messagesReceived: number;
  messagesSent: number;
  reconnectCount: number;
  lastError?: string;
  connectedAt?: Date;
  lastActivity?: Date;
}

export interface ConnectionConfig {
  url: string;
  connectionTimeout: number;
  pingInterval: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  enablePing: boolean;
}

export interface NostrSubscription {
  id: string;
  filters: any[];
  callback: (event: any) => void;
  active: boolean;
}

export class NostrWebSocketConnection {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private config: ConnectionConfig;
  private stats: ConnectionStats;
  private subscriptions: Map<string, NostrSubscription> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private lastPong = Date.now();
  private eventListeners: Map<string, Set<Function>> = new Map();
  private messageQueue: NostrMessage[] = [];

  constructor(config: ConnectionConfig) {
    this.config = config;
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      reconnectCount: 0,
    };

    // Start connection attempt
    this.connect();
  }

  /**
   * Establish WebSocket connection
   */
  private async connect(): Promise<void> {
    if (this.state === 'connecting' || this.state === 'connected') {
      return;
    }

    console.log(`🔄 Connecting to Nostr relay: ${this.config.url}`);
    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.config.url);

      // Set connection timeout
      const timeoutTimer = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log(`⏱️ Connection timeout for ${this.config.url}`);
          this.ws.close();
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, this.config.connectionTimeout);

      this.ws.onopen = () => {
        clearTimeout(timeoutTimer);
        console.log(`✅ Connected to Nostr relay: ${this.config.url}`);
        this.handleConnection();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        clearTimeout(timeoutTimer);
        this.handleDisconnection(event.code, event.reason);
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeoutTimer);
        console.error(`❌ WebSocket error for ${this.config.url}:`, error);
        this.handleConnectionError(new Error('WebSocket error'));
      };
    } catch (error) {
      console.error(
        `❌ Failed to create WebSocket for ${this.config.url}:`,
        error
      );
      this.handleConnectionError(
        error instanceof Error ? error : new Error('Unknown connection error')
      );
    }
  }

  /**
   * Handle successful connection
   */
  private handleConnection(): void {
    this.setState('connected');
    this.stats.connectedAt = new Date();
    this.stats.lastActivity = new Date();
    this.reconnectAttempts = 0;

    // Process queued messages
    this.processMessageQueue();

    // Resubscribe to active subscriptions
    this.resubscribeAll();

    // Start ping timer if enabled
    if (this.config.enablePing) {
      this.startPingTimer();
    }

    this.emit('connected');
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    this.stats.lastError = error.message;
    this.setState('error');
    this.emit('error', error);
    this.scheduleReconnect();
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(code: number, reason: string): void {
    console.log(`🔌 Disconnected from ${this.config.url} (${code}): ${reason}`);

    this.cleanup();
    this.setState('disconnected');
    this.emit('disconnected', { code, reason });

    // Schedule reconnect unless it was intentional
    if (code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Process incoming messages
   */
  private handleMessage(data: string): void {
    this.stats.messagesReceived++;
    this.stats.lastActivity = new Date();

    try {
      const message: NostrMessage = JSON.parse(data);

      if (!Array.isArray(message) || message.length < 1) {
        console.warn(
          `⚠️ Invalid message format from ${this.config.url}:`,
          data
        );
        return;
      }

      const [type] = message;

      switch (type) {
        case 'EVENT':
          this.handleEventMessage(message);
          break;
        case 'EOSE':
          this.handleEOSEMessage(message);
          break;
        case 'NOTICE':
          this.handleNoticeMessage(message);
          break;
        case 'OK':
          this.handleOKMessage(message);
          break;
        default:
          console.log(
            `📨 Unhandled message type '${type}' from ${this.config.url}`
          );
      }

      this.emit('message', message);
    } catch (error) {
      console.error(
        `❌ Failed to parse message from ${this.config.url}:`,
        error
      );
    }
  }

  /**
   * Handle EVENT messages
   */
  private handleEventMessage(message: NostrMessage): void {
    if (message.length < 3) return;

    const [, subscriptionId, event] = message;
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription && subscription.active) {
      try {
        subscription.callback(event);
      } catch (error) {
        console.error(
          `❌ Error in subscription callback for ${subscriptionId}:`,
          error
        );
      }
    }
  }

  /**
   * Handle EOSE, NOTICE, and OK messages
   */
  private handleEOSEMessage(message: NostrMessage): void {
    this.emit('eose', message[1]);
  }

  private handleNoticeMessage(message: NostrMessage): void {
    this.emit('notice', message[1]);
  }

  private handleOKMessage(message: NostrMessage): void {
    const [, eventId, success, reason] = message;
    this.emit('ok', { eventId, success, reason });
  }

  /**
   * Send message to relay
   */
  private sendMessage(message: NostrMessage): boolean {
    if (this.state !== 'connected' || !this.ws) {
      // Queue message for later
      this.messageQueue.push(message);
      return false;
    }

    try {
      const data = JSON.stringify(message);
      this.ws.send(data);
      this.stats.messagesSent++;
      this.stats.lastActivity = new Date();
      return true;
    } catch (error) {
      console.error(`❌ Failed to send message to ${this.config.url}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to events
   */
  subscribe(
    subscriptionId: string,
    filters: any[],
    callback: (event: any) => void
  ): void {
    const subscription: NostrSubscription = {
      id: subscriptionId,
      filters,
      callback,
      active: true,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Send REQ message
    const reqMessage: NostrMessage = ['REQ', subscriptionId, ...filters];
    if (!this.sendMessage(reqMessage)) {
      console.log(
        `📤 Subscription ${subscriptionId} queued for ${this.config.url}`
      );
    } else {
      console.log(`📡 Subscribed to ${subscriptionId} on ${this.config.url}`);
    }
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    subscription.active = false;
    this.subscriptions.delete(subscriptionId);

    // Send CLOSE message
    const closeMessage: NostrMessage = ['CLOSE', subscriptionId];
    this.sendMessage(closeMessage);

    console.log(`🔕 Unsubscribed from ${subscriptionId} on ${this.config.url}`);
  }

  /**
   * Publish event
   */
  publish(event: any): void {
    const eventMessage: NostrMessage = ['EVENT', event];
    if (!this.sendMessage(eventMessage)) {
      console.log(`📤 Event publication queued for ${this.config.url}`);
    } else {
      console.log(`📮 Published event to ${this.config.url}`);
    }
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(
      `📤 Processing ${this.messageQueue.length} queued messages for ${this.config.url}`
    );

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach((message) => {
      this.sendMessage(message);
    });
  }

  /**
   * Resubscribe to all active subscriptions
   */
  private resubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      if (subscription.active) {
        const reqMessage: NostrMessage = [
          'REQ',
          subscription.id,
          ...subscription.filters,
        ];
        this.sendMessage(reqMessage);
      }
    });

    if (this.subscriptions.size > 0) {
      console.log(
        `🔄 Resubscribed to ${this.subscriptions.size} subscriptions on ${this.config.url}`
      );
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log(
        `❌ Max reconnection attempts reached for ${this.config.url}`
      );
      this.setState('error');
      return;
    }

    this.setState('reconnecting');
    this.reconnectAttempts++;
    this.stats.reconnectCount++;

    const delay =
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(
      `⏳ Reconnecting to ${this.config.url} in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay) as any;
  }

  /**
   * Start ping timer
   */
  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      if (this.state === 'connected') {
        // Check if we missed a pong
        if (Date.now() - this.lastPong > this.config.pingInterval * 2) {
          console.warn(`⚠️ Ping timeout for ${this.config.url}`);
          this.ws?.close();
          return;
        }

        // Send ping (use PING message or keep-alive)
        this.sendMessage(['PING']);
      }
    }, this.config.pingInterval) as any;
  }

  /**
   * Clean up timers and resources
   */
  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Set connection state and notify listeners
   */
  private setState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;

    if (oldState !== newState) {
      console.log(`🔄 ${this.config.url}: ${oldState} → ${newState}`);
      this.emit('stateChange', { oldState, newState });
    }
  }

  /**
   * Event emitter functionality
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Add event listener
   */
  on(event: string, listener: Function): () => void {
    const listeners = this.eventListeners.get(event) || new Set();
    listeners.add(listener);
    this.eventListeners.set(event, listeners);

    return () => {
      listeners.delete(listener);
    };
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Get relay URL
   */
  getUrl(): string {
    return this.config.url;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Get active subscription count
   */
  getSubscriptionCount(): number {
    return Array.from(this.subscriptions.values()).filter((s) => s.active)
      .length;
  }

  /**
   * Force reconnection
   */
  reconnect(): void {
    if (this.ws) {
      this.ws.close();
    } else {
      this.connect();
    }
  }

  /**
   * Close connection
   */
  disconnect(): void {
    console.log(`🔌 Disconnecting from ${this.config.url}`);

    this.cleanup();
    this.subscriptions.clear();
    this.messageQueue = [];

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.setState('disconnected');
  }
}
