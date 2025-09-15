/**
 * React Native WebSocket Polyfill - OPTIMIZED
 * Removes debug overhead in production for faster startup
 */

import 'text-encoding-polyfill';

// Only enable debug in development
const DEBUG = __DEV__ && false; // Set to true to enable debug logs

export function initializeWebSocketPolyfill(): void {
  // Skip all logging in production
  if (!DEBUG) {
    // Just ensure polyfills are in place
    if (typeof global.Buffer === 'undefined') {
      try {
        global.Buffer = require('buffer').Buffer;
      } catch (error) {
        // Silent fail
      }
    }
    return;
  }

  // Development debugging (normally disabled)
  console.log('🔧 Initializing React Native WebSocket polyfill...');

  const originalWebSocket = global.WebSocket;
  if (originalWebSocket) {
    global.WebSocket = class extends originalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);

        if (DEBUG) {
          this.addEventListener('open', () => {
            console.log(`✅ WebSocket connected to ${url}`);
          });

          this.addEventListener('error', (event) => {
            console.error(`❌ WebSocket error for ${url}:`, event);
          });
        }
      }
    };
  }
}

/**
 * Test WebSocket connectivity (development only)
 */
export async function testWebSocketConnectivity(relayUrl: string): Promise<boolean> {
  if (!DEBUG) return true; // Skip in production

  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(relayUrl);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          resolve(false);
        }
      }, 5000);

      ws.onopen = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(false);
        }
      };

    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Test basic event subscription (development only)
 */
export async function testBasicNostrSubscription(relayUrl: string): Promise<number> {
  if (!DEBUG) return 0; // Skip in production

  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(relayUrl);
      let eventCount = 0;
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          resolve(eventCount);
        }
      }, 10000);

      ws.onopen = () => {
        const reqMessage = JSON.stringify([
          'REQ',
          'test-sub',
          { limit: 10 }
        ]);
        ws.send(reqMessage);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (Array.isArray(message) && message[0] === 'EVENT') {
            eventCount++;
          }
        } catch (parseError) {
          // Silent fail
        }
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(eventCount);
        }
      };

    } catch (error) {
      resolve(0);
    }
  });
}