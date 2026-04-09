/**
 * WebSocket Debugger for NWC Connection Debugging
 * Logs WebSocket and Nostr protocol messages to help diagnose connection issues
 * Only active in development mode
 */

// Guard to prevent multiple installations
let isDebuggerInstalled = false;

/**
 * Enable WebSocket debugging by wrapping the global WebSocket
 * This helps diagnose NWC connection issues at the protocol level
 */
export function enableWebSocketDebugging(): void {
  if (!__DEV__) {
    console.log('[WS-Debug] Skipping WebSocket debugging in production');
    return;
  }

  // Prevent multiple installations (causes 5x log duplication!)
  if (isDebuggerInstalled) {
    console.log('[WS-Debug] Already installed, skipping...');
    return;
  }

  console.log('[WS-Debug] Installing WebSocket debugger...');

  const OriginalWebSocket = global.WebSocket;

  if (!OriginalWebSocket) {
    console.error('[WS-Debug] No global WebSocket found!');
    return;
  }

  // Create debug wrapper class
  class DebugWebSocket extends OriginalWebSocket {
    private _debugUrl: string;
    private startTime: number;

    constructor(url: string | URL, protocols?: string | string[]) {
      console.log(`[WS-Debug] Opening connection to: ${url}`);
      console.log(`[WS-Debug] Protocols: ${protocols || 'none'}`);

      super(url, protocols);

      this._debugUrl = typeof url === 'string' ? url : url.toString();
      this.startTime = Date.now();

      // Track connection lifecycle
      this.addEventListener('open', (event) => {
        const connectionTime = Date.now() - this.startTime;
        console.log(
          `[WS-Debug] ✅ Connected to ${this._debugUrl} (took ${connectionTime}ms)`
        );
      });

      this.addEventListener('close', (event: CloseEvent) => {
        const connectionDuration = Date.now() - this.startTime;
        console.log(`[WS-Debug] ❌ Closed ${this._debugUrl}`);
        console.log(
          `[WS-Debug] Close code: ${event.code}, reason: ${
            event.reason || 'none'
          }`
        );
        console.log(`[WS-Debug] Connection duration: ${connectionDuration}ms`);

        // Common close codes
        switch (event.code) {
          case 1000:
            console.log('[WS-Debug] Normal closure');
            break;
          case 1001:
            console.log(
              '[WS-Debug] Endpoint going away (page navigation or server shutdown)'
            );
            break;
          case 1006:
            console.log(
              '[WS-Debug] Abnormal closure (network error or server unreachable)'
            );
            break;
          case 1015:
            console.log('[WS-Debug] TLS handshake failure');
            break;
        }
      });

      this.addEventListener('error', (event) => {
        console.error(`[WS-Debug] ⚠️ Error on ${this._debugUrl}:`, event);
      });

      // Track messages for Nostr protocol debugging
      this.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          if (Array.isArray(data)) {
            const [type, ...rest] = data;

            // Log Nostr message types
            switch (type) {
              case 'EVENT':
                console.log(`[WS-Debug] ← EVENT received (sub: ${rest[0]})`);
                break;
              case 'EOSE':
                console.log(
                  `[WS-Debug] ← EOSE (End of stored events) for sub: ${rest[0]}`
                );
                break;
              case 'OK':
                console.log(
                  `[WS-Debug] ← OK response: ${
                    rest[1] ? 'success' : 'failed'
                  } - ${rest[2] || ''}`
                );
                break;
              case 'NOTICE':
                console.log(`[WS-Debug] ← NOTICE from relay: ${rest[0]}`);
                break;
              case 'AUTH':
                console.log(`[WS-Debug] ← AUTH challenge received`);
                break;
              default:
                console.log(`[WS-Debug] ← Unknown message type: ${type}`);
            }
          } else {
            console.log('[WS-Debug] ← Non-array message received');
          }
        } catch (error) {
          // Not JSON, log as-is
          if (event.data.length < 200) {
            console.log(`[WS-Debug] ← Raw message: ${event.data}`);
          } else {
            console.log(
              `[WS-Debug] ← Large message (${event.data.length} bytes)`
            );
          }
        }
      });

      // Override send to track outgoing messages
      const originalSend = this.send.bind(this);
      this.send = (
        data: string | ArrayBufferLike | Blob | ArrayBufferView
      ): void => {
        try {
          if (typeof data === 'string') {
            const parsed = JSON.parse(data);

            if (Array.isArray(parsed)) {
              const [type, ...rest] = parsed;

              // Log Nostr command types
              switch (type) {
                case 'REQ':
                  console.log(`[WS-Debug] → REQ (subscription: ${rest[0]})`);
                  break;
                case 'EVENT':
                  console.log(`[WS-Debug] → EVENT (publishing)`);
                  break;
                case 'CLOSE':
                  console.log(`[WS-Debug] → CLOSE subscription: ${rest[0]}`);
                  break;
                case 'AUTH':
                  console.log(`[WS-Debug] → AUTH response`);
                  break;
                default:
                  console.log(`[WS-Debug] → Unknown command: ${type}`);
              }
            } else {
              console.log('[WS-Debug] → Non-array message sent');
            }
          } else {
            console.log(
              `[WS-Debug] → Binary message (${
                (data as any).byteLength || 0
              } bytes)`
            );
          }
        } catch (error) {
          // Not JSON, log type
          console.log(
            `[WS-Debug] → Non-JSON message sent (type: ${typeof data})`
          );
        }

        return originalSend(data);
      };
    }
  }

  // Replace global WebSocket
  (global as any).WebSocket = DebugWebSocket;
  isDebuggerInstalled = true;
  console.log('[WS-Debug] WebSocket debugger installed successfully');
}

/**
 * Disable WebSocket debugging by restoring original WebSocket
 */
export function disableWebSocketDebugging(): void {
  console.log('[WS-Debug] Disabling WebSocket debugger');
  // Note: We can't easily restore the original since it's overwritten
  // App restart will restore the original
}

/**
 * Test WebSocket connectivity to a specific relay
 */
export async function testRelayConnection(relayUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`[WS-Debug] Testing connection to: ${relayUrl}`);

    const ws = new WebSocket(relayUrl);
    const timeout = setTimeout(() => {
      console.log('[WS-Debug] Connection test timed out');
      ws.close();
      resolve(false);
    }, 10000);

    ws.onopen = () => {
      console.log('[WS-Debug] Test connection successful');
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    };

    ws.onerror = (error) => {
      console.error('[WS-Debug] Test connection failed:', error);
      clearTimeout(timeout);
      resolve(false);
    };
  });
}
