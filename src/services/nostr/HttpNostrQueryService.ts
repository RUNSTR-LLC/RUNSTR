/**
 * HttpNostrQueryService - HTTP-First Nostr Query Strategy
 * 
 * PROBLEM: React Native WebSocket drops 85% of events vs Node.js
 * SOLUTION: HTTP-first queries with WebSocket fallback for reliability
 * 
 * Benefits:
 * - HTTP more reliable than WebSocket on mobile platforms
 * - No connection handshake overhead
 * - Better battery life and performance
 * - Graceful fallback to WebSocket for relays without HTTP support
 */

import { Platform } from 'react-native';
import type { Event, Filter } from 'nostr-tools';

// Platform-optimized network configuration
const NETWORK_CONFIG = Platform.select({
  ios: {
    timeout: 6000, // 6s for iOS real devices
    maxRetries: 2,
    retryDelay: 1500,
  },
  android: {
    timeout: 4000, // 4s for Android
    maxRetries: 2,
    retryDelay: 1000,
  },
  default: {
    timeout: 5000,
    maxRetries: 1,
    retryDelay: 1000,
  }
});

// HTTP endpoint mappings for major relays
const HTTP_RELAY_ENDPOINTS = {
  'wss://relay.damus.io': 'https://relay.damus.io/api/v1/req',
  'wss://relay.primal.net': 'https://relay.primal.net/api/query', 
  'wss://nos.lol': 'https://nos.lol/api/req',
  'wss://nostr.wine': 'https://nostr.wine/api/req',
  'wss://relay.nostr.band': 'https://relay.nostr.band/api/req',
  'wss://relay.snort.social': 'https://relay.snort.social/api/req',
  'wss://nostr-pub.wellorder.net': 'https://nostr-pub.wellorder.net/api/req',
};

// Cache for verified HTTP endpoints
const VERIFIED_ENDPOINTS = new Map<string, boolean>();
const ENDPOINT_VERIFICATION_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export interface HttpQueryResult {
  success: boolean;
  events: Event[];
  method: 'http' | 'websocket_fallback';
  relay: string;
  responseTime: number;
  error?: string;
}

export interface HttpQueryMetrics {
  method: 'http' | 'websocket_fallback';
  relay: string;
  eventsReceived: number;
  responseTime: number;
  success: boolean;
  error?: string;
}

export interface HttpQueryOptions {
  limit?: number;
  since?: number;
  until?: number;
  timeoutMs?: number;
  useCache?: boolean;
}

export class HttpNostrQueryService {
  private static instance: HttpNostrQueryService;
  private metrics: Map<string, HttpQueryMetrics[]> = new Map();
  private endpointVerificationCache = new Map<string, { verified: boolean; timestamp: number }>();

  private constructor() {}

  static getInstance(): HttpNostrQueryService {
    if (!HttpNostrQueryService.instance) {
      HttpNostrQueryService.instance = new HttpNostrQueryService();
    }
    return HttpNostrQueryService.instance;
  }

  /**
   * MAIN QUERY METHOD: HTTP-First with WebSocket Fallback
   */
  async queryRelay(
    relayUrl: string,
    filter: Filter,
    options: HttpQueryOptions = {}
  ): Promise<HttpQueryResult> {
    const startTime = Date.now();
    
    console.log(`🌐 HttpNostrQueryService: Querying ${relayUrl.replace('wss://', '')} with HTTP-first strategy`);
    
    // Try HTTP first if endpoint exists
    const httpEndpoint = HTTP_RELAY_ENDPOINTS[relayUrl as keyof typeof HTTP_RELAY_ENDPOINTS];
    
    if (httpEndpoint) {
      const httpResult = await this.tryHttpQuery(relayUrl, httpEndpoint, filter, options, startTime);
      if (httpResult.success) {
        this.recordMetrics(httpResult);
        return httpResult;
      }
      console.log(`⚠️ HTTP failed for ${relayUrl}, falling back to WebSocket...`);
    }

    // Fallback to WebSocket
    console.log(`🔌 Falling back to WebSocket for ${relayUrl}`);
    const wsResult = await this.tryWebSocketQuery(relayUrl, filter, options, startTime);
    this.recordMetrics(wsResult);
    return wsResult;
  }

  /**
   * HTTP Query Implementation with React Native Optimizations
   */
  private async tryHttpQuery(
    relayUrl: string,
    httpEndpoint: string,
    filter: Filter,
    options: HttpQueryOptions,
    startTime: number
  ): Promise<HttpQueryResult> {
    try {
      // Verify endpoint is working (with cache)
      const isVerified = await this.verifyHttpEndpoint(httpEndpoint);
      if (!isVerified) {
        return {
          success: false,
          events: [],
          method: 'http',
          relay: relayUrl,
          responseTime: Date.now() - startTime,
          error: 'HTTP endpoint verification failed'
        };
      }

      // Build NIP-01 compatible request
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const requestBody = ["REQ", requestId, filter];

      console.log(`📤 HTTP POST to ${httpEndpoint}:`, JSON.stringify(filter, null, 2));

      // React Native fetch with timeout and error handling
      const response = await this.fetchWithTimeout(
        httpEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // Some relays need these headers
            'Origin': 'https://runstr.app',
            'User-Agent': 'RUNSTR/1.0'
          },
          body: JSON.stringify(requestBody)
        },
        options.timeoutMs || NETWORK_CONFIG!.timeout
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log(`📥 HTTP response (${responseText.length} chars):`, responseText.substring(0, 200));

      // Parse NDJSON or JSON response
      const events = this.parseHttpResponse(responseText, requestId);
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ HTTP query success: ${events.length} events in ${responseTime}ms`);

      return {
        success: true,
        events,
        method: 'http',
        relay: relayUrl,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.warn(`❌ HTTP query failed for ${relayUrl}:`, error);
      
      return {
        success: false,
        events: [],
        method: 'http',
        relay: relayUrl,
        responseTime,
        error: `HTTP query failed: ${error}`
      };
    }
  }

  /**
   * WebSocket Fallback (simplified version for reliability)
   */
  private async tryWebSocketQuery(
    relayUrl: string,
    filter: Filter,
    options: HttpQueryOptions,
    startTime: number
  ): Promise<HttpQueryResult> {
    try {
      // Import nostr-tools dynamically
      const NostrTools = require('nostr-tools');
      const { Relay } = NostrTools;

      console.log(`🔌 Connecting to WebSocket: ${relayUrl}`);
      
      const relay = await Relay.connect(relayUrl);
      const events: Event[] = [];

      return new Promise((resolve) => {
        const sub = relay.subscribe([filter], {
          onevent: (event: Event) => {
            events.push(event);
            console.log(`📥 WebSocket event from ${relayUrl}: ${event.id?.slice(0, 8)}`);
          },
          oneose: () => {
            console.log(`✅ WebSocket EOSE from ${relayUrl}: ${events.length} events`);
            sub.close();
            relay.close();
            
            const responseTime = Date.now() - startTime;
            resolve({
              success: events.length > 0,
              events,
              method: 'websocket_fallback',
              relay: relayUrl,
              responseTime
            });
          },
          onclose: () => {
            console.log(`🔌 WebSocket closed: ${relayUrl}`);
            const responseTime = Date.now() - startTime;
            resolve({
              success: events.length > 0,
              events,
              method: 'websocket_fallback',
              relay: relayUrl,
              responseTime
            });
          }
        });

        // Timeout for WebSocket
        setTimeout(() => {
          console.log(`⏰ WebSocket timeout for ${relayUrl} after ${NETWORK_CONFIG!.timeout}ms`);
          sub.close();
          relay.close();
          
          const responseTime = Date.now() - startTime;
          resolve({
            success: events.length > 0,
            events,
            method: 'websocket_fallback',
            relay: relayUrl,
            responseTime
          });
        }, NETWORK_CONFIG!.timeout);
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.warn(`❌ WebSocket fallback failed for ${relayUrl}:`, error);
      
      return {
        success: false,
        events: [],
        method: 'websocket_fallback',
        relay: relayUrl,
        responseTime,
        error: `WebSocket fallback failed: ${error}`
      };
    }
  }

  /**
   * Verify HTTP endpoint works (with caching)
   */
  private async verifyHttpEndpoint(endpoint: string): Promise<boolean> {
    // Check cache first
    const cached = this.endpointVerificationCache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < ENDPOINT_VERIFICATION_CACHE_TTL) {
      return cached.verified;
    }

    try {
      console.log(`🔍 Verifying HTTP endpoint: ${endpoint}`);
      
      // Simple ping with minimal filter
      const testFilter = { kinds: [1], limit: 1 };
      const requestBody = ["REQ", "verify", testFilter];

      const response = await this.fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        },
        3000 // Short timeout for verification
      );

      const verified = response.ok;
      
      // Cache result
      this.endpointVerificationCache.set(endpoint, {
        verified,
        timestamp: Date.now()
      });

      console.log(`${verified ? '✅' : '❌'} HTTP endpoint verification: ${endpoint}`);
      return verified;

    } catch (error) {
      console.warn(`❌ HTTP endpoint verification failed for ${endpoint}:`, error);
      
      // Cache negative result too
      this.endpointVerificationCache.set(endpoint, {
        verified: false,
        timestamp: Date.now()
      });
      
      return false;
    }
  }

  /**
   * React Native optimized fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    const fetchPromise = fetch(url, {
      ...options,
      // React Native specific optimizations
      cache: 'no-cache',
      credentials: 'omit',
    });

    return Promise.race([fetchPromise, timeoutPromise]);
  }

  /**
   * Parse HTTP response (NDJSON or JSON format)
   */
  private parseHttpResponse(responseText: string, requestId: string): Event[] {
    const events: Event[] = [];

    try {
      // Handle NDJSON format (newline-delimited JSON)
      const lines = responseText.trim().split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const parsed = JSON.parse(line);
          
          // Handle different response formats
          if (Array.isArray(parsed) && parsed[0] === 'EVENT' && parsed[1] === requestId) {
            // Standard ["EVENT", requestId, event] format
            events.push(parsed[2]);
          } else if (parsed.kind && parsed.id && parsed.pubkey) {
            // Direct event object
            events.push(parsed);
          }
        } catch (lineError) {
          console.warn('Failed to parse response line:', line.substring(0, 100));
        }
      }

      // If NDJSON parsing failed, try parsing as single JSON array
      if (events.length === 0) {
        const singleParsed = JSON.parse(responseText);
        if (Array.isArray(singleParsed)) {
          for (const item of singleParsed) {
            if (item.kind && item.id && item.pubkey) {
              events.push(item);
            }
          }
        }
      }

    } catch (error) {
      console.warn('Failed to parse HTTP response:', error);
    }

    console.log(`📊 Parsed ${events.length} events from HTTP response`);
    return events;
  }

  /**
   * Record metrics for performance analysis
   */
  private recordMetrics(result: HttpQueryResult): void {
    const metric: HttpQueryMetrics = {
      method: result.method,
      relay: result.relay,
      eventsReceived: result.events.length,
      responseTime: result.responseTime,
      success: result.success,
      error: result.error
    };

    const relayMetrics = this.metrics.get(result.relay) || [];
    relayMetrics.push(metric);
    
    // Keep only last 10 metrics per relay
    if (relayMetrics.length > 10) {
      relayMetrics.shift();
    }
    
    this.metrics.set(result.relay, relayMetrics);
  }

  /**
   * Get performance metrics for relay optimization
   */
  getMetrics(): Map<string, HttpQueryMetrics[]> {
    return new Map(this.metrics);
  }

  /**
   * Get best performing relays based on metrics
   */
  getBestRelays(): string[] {
    const relayScores = new Map<string, number>();

    for (const [relay, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.slice(-5); // Last 5 queries
      
      if (recentMetrics.length === 0) continue;

      const successRate = recentMetrics.filter(m => m.success).length / recentMetrics.length;
      const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
      const avgEvents = recentMetrics.reduce((sum, m) => sum + m.eventsReceived, 0) / recentMetrics.length;
      
      // Score: success rate (0-1) + event count boost + speed bonus
      const score = successRate + (avgEvents / 10) + (1000 / Math.max(avgResponseTime, 100));
      
      relayScores.set(relay, score);
    }

    return Array.from(relayScores.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([relay]) => relay);
  }

  /**
   * Clear metrics and cache
   */
  clearCache(): void {
    this.metrics.clear();
    this.endpointVerificationCache.clear();
    console.log('🧹 HttpNostrQueryService cache cleared');
  }
}

// Export class for React Native compatibility
export default HttpNostrQueryService;