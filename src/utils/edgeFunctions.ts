/**
 * Edge Function utility — shared helper for calling Supabase Edge Functions.
 *
 * All write operations (INSERT/UPDATE/DELETE) are routed through server-side
 * Edge Functions that use the service_role key.  The client authenticates
 * with the public anon key (same as submitWorkoutSimple).
 */

interface EdgeFunctionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * POST to a Supabase Edge Function with JSON body.
 *
 * @param functionName  e.g. 'manage-club', 'manage-competition'
 * @param body          JSON-serialisable payload
 * @param timeoutMs     abort after this many ms (default 10 000)
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  timeoutMs: number = 10_000,
): Promise<EdgeFunctionResult<T>> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Backend not configured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );

    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    let result: EdgeFunctionResult<T>;
    try {
      result = await response.json();
    } catch {
      return { success: false, error: 'Invalid JSON response from server' };
    }

    return result;
  } catch (err: unknown) {
    clearTimeout(timer);

    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'Request timed out' };
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
