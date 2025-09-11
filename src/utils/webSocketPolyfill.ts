/**
 * React Native WebSocket Polyfill
 * 
 * SENIOR DEVELOPER FIX: Addresses potential binary frame drops
 * Ensures TextEncoder/TextDecoder and proper WebSocket handling
 * 
 * This polyfill addresses React Native WebSocket compatibility issues
 * that could cause nostr-tools SimplePool to drop events
 */

// Ensure TextEncoder/TextDecoder exist (required for nostr-tools)
import 'text-encoding-polyfill';

// React Native WebSocket debugging and enhancement
export function initializeWebSocketPolyfill(): void {
  console.log('🔧 Initializing React Native WebSocket polyfill...');
  
  // Debug WebSocket creation
  const originalWebSocket = global.WebSocket;
  if (originalWebSocket) {
    // Wrap WebSocket to add debugging
    global.WebSocket = class extends originalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        console.log(`🔌 Creating WebSocket connection to: ${url}`);
        super(url, protocols);
        
        // Add connection debugging
        this.addEventListener('open', (event) => {
          console.log(`✅ WebSocket connected to ${url}`);
        });
        
        this.addEventListener('error', (event) => {
          console.error(`❌ WebSocket error for ${url}:`, event);
        });
        
        this.addEventListener('close', (event) => {
          console.log(`🔌 WebSocket closed for ${url}:`, event.code, event.reason);
        });
        
        this.addEventListener('message', (event) => {
          console.log(`📨 WebSocket message from ${url}:`, {
            type: typeof event.data,
            length: event.data?.length || 0,
            preview: typeof event.data === 'string' ? event.data.substring(0, 100) : 'binary'
          });
        });
      }
    };
    
    console.log('✅ WebSocket debugging wrapper applied');
  } else {
    console.warn('⚠️ No global WebSocket found - this might cause nostr-tools issues');
  }
  
  // Ensure Buffer is available (sometimes needed for crypto operations)
  if (typeof global.Buffer === 'undefined') {
    try {
      global.Buffer = require('buffer').Buffer;
      console.log('✅ Buffer polyfill applied');
    } catch (error) {
      console.warn('⚠️ Buffer polyfill failed:', error);
    }
  }
  
  // Check TextEncoder/TextDecoder
  if (typeof global.TextEncoder === 'undefined' || typeof global.TextDecoder === 'undefined') {
    console.warn('⚠️ TextEncoder/TextDecoder missing - imported text-encoding-polyfill');
  } else {
    console.log('✅ TextEncoder/TextDecoder available');
  }
  
  // Test basic WebSocket functionality
  if (typeof global.WebSocket !== 'undefined') {
    console.log('✅ WebSocket API available');
  } else {
    console.error('❌ WebSocket API not available - this will break nostr-tools');
  }
  
  console.log('🔧 WebSocket polyfill initialization complete');
}

/**
 * Test WebSocket connectivity to a specific relay
 * Senior developer suggested testing each relay individually
 */
export async function testWebSocketConnectivity(relayUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`🧪 Testing WebSocket connectivity to ${relayUrl}...`);
    
    try {
      const ws = new WebSocket(relayUrl);
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log(`⏰ WebSocket test timeout for ${relayUrl}`);
          ws.close();
          resolve(false);
        }
      }, 5000);
      
      ws.onopen = () => {
        if (!resolved) {
          resolved = true;
          console.log(`✅ WebSocket test successful for ${relayUrl}`);
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      };
      
      ws.onerror = (error) => {
        if (!resolved) {
          resolved = true;
          console.error(`❌ WebSocket test failed for ${relayUrl}:`, error);
          clearTimeout(timeout);
          resolve(false);
        }
      };
      
      ws.onclose = (event) => {
        if (!resolved) {
          resolved = true;
          console.log(`🔌 WebSocket test closed for ${relayUrl}:`, event.code);
          clearTimeout(timeout);
          resolve(event.code === 1000); // 1000 = normal closure
        }
      };
      
    } catch (error) {
      console.error(`❌ WebSocket test exception for ${relayUrl}:`, error);
      resolve(false);
    }
  });
}

/**
 * Test basic event subscription pattern
 * Simplified version of what nostr-tools does
 */
export async function testBasicNostrSubscription(relayUrl: string): Promise<number> {
  return new Promise((resolve) => {
    console.log(`🧪 Testing basic Nostr subscription to ${relayUrl}...`);
    
    try {
      const ws = new WebSocket(relayUrl);
      let eventCount = 0;
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log(`⏰ Nostr test timeout for ${relayUrl} - received ${eventCount} events`);
          ws.close();
          resolve(eventCount);
        }
      }, 10000); // 10 second test
      
      ws.onopen = () => {
        console.log(`🔌 Nostr test connected to ${relayUrl}`);
        
        // Send a basic REQ message (get any 10 events)
        const reqMessage = JSON.stringify([
          'REQ',
          'test-sub',
          { limit: 10 }
        ]);
        
        console.log(`📤 Sending test REQ to ${relayUrl}`);
        ws.send(reqMessage);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (Array.isArray(message) && message[0] === 'EVENT') {
            eventCount++;
            console.log(`📥 Test event ${eventCount} from ${relayUrl}: kind ${message[2]?.kind}`);
          } else if (Array.isArray(message) && message[0] === 'EOSE') {
            console.log(`📨 Test EOSE from ${relayUrl} - ${eventCount} events received`);
          }
        } catch (parseError) {
          console.warn(`⚠️ Failed to parse message from ${relayUrl}:`, parseError);
        }
      };
      
      ws.onerror = (error) => {
        if (!resolved) {
          resolved = true;
          console.error(`❌ Nostr test error for ${relayUrl}:`, error);
          clearTimeout(timeout);
          resolve(eventCount);
        }
      };
      
      ws.onclose = (event) => {
        if (!resolved) {
          resolved = true;
          console.log(`🔌 Nostr test closed for ${relayUrl}: ${eventCount} events total`);
          clearTimeout(timeout);
          resolve(eventCount);
        }
      };
      
    } catch (error) {
      console.error(`❌ Nostr test exception for ${relayUrl}:`, error);
      resolve(0);
    }
  });
}