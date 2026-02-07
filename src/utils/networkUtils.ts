/**
 * Network Utilities - Safe network operations
 *
 * Provides timeout-aware fetch and safe JSON parsing utilities
 * to prevent app freezes from slow networks or corrupted data.
 */

/**
 * Fetch with timeout - prevents app freeze on slow networks
 *
 * Wraps the native fetch with an AbortController that auto-aborts
 * after the specified timeout. Also covers the JSON parsing phase.
 *
 * @param url - URL to fetch
 * @param options - Fetch options (headers, method, body, etc.)
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns Promise resolving to the Response
 * @throws Error on timeout or network failure
 *
 * @example
 * try {
 *   const response = await fetchWithTimeout('https://api.example.com/data', {
 *     method: 'POST',
 *     body: JSON.stringify({ amount: 100 }),
 *   }, 15000);
 *   const data = await response.json();
 * } catch (error) {
 *   if (error.name === 'AbortError') {
 *     console.log('Request timed out');
 *   }
 * }
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Safe JSON parse - returns fallback on parse failure
 *
 * Wraps JSON.parse with try/catch and returns a fallback value
 * if parsing fails (corrupted data, invalid JSON, etc.)
 *
 * @param data - JSON string to parse
 * @param fallback - Value to return if parsing fails
 * @returns Parsed JSON or fallback value
 *
 * @example
 * const stored = await AsyncStorage.getItem('@runstr:milestones');
 * const milestones = safeJsonParse<number[]>(stored || '[]', []);
 */
export function safeJsonParse<T>(data: string, fallback: T): T {
  try {
    const parsed = JSON.parse(data);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Fetch JSON with timeout - convenience wrapper for JSON APIs
 *
 * Combines fetchWithTimeout with safe JSON parsing.
 * Returns null on any failure (timeout, network, parse error).
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns Promise resolving to parsed JSON or null on failure
 *
 * @example
 * const data = await fetchJsonWithTimeout<{ balance: number }>(
 *   'https://api.example.com/balance',
 *   { headers: { Authorization: 'Bearer token' } }
 * );
 * if (data) {
 *   console.log('Balance:', data.balance);
 * }
 */
export async function fetchJsonWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    // JSON parsing is also covered by the timeout
    const data = await response.json();
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
