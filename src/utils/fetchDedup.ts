/**
 * Fetch Deduplication Utility
 *
 * Prevents multiple simultaneous fetches for the same resource.
 * If a fetch is already in progress for a given key, subsequent calls
 * will wait for and receive the same promise result.
 *
 * This is a quick-win utility that can be used immediately while
 * migrating to UnifiedNostrCache. Eventually, this functionality
 * will be fully handled by UnifiedNostrCache.
 *
 * Usage:
 * ```typescript
 * // Instead of:
 * const teams = await fetchTeamsFromNostr();
 *
 * // Use:
 * const teams = await dedupFetch('teams', () => fetchTeamsFromNostr());
 * ```
 *
 * Multiple concurrent calls to dedupFetch with the same key will only
 * trigger ONE actual fetch, and all callers will receive the same result.
 */

// Track pending fetches by key
const pendingFetches = new Map<string, Promise<any>>();

/**
 * Deduplicate fetch operations by key
 *
 * @param key - Unique identifier for the fetch operation
 * @param fetcher - Function that performs the actual fetch
 * @returns Promise that resolves to the fetched data
 *
 * @example
 * // Multiple components requesting teams simultaneously
 * const teams1 = dedupFetch('all_teams', fetchTeams); // Triggers fetch
 * const teams2 = dedupFetch('all_teams', fetchTeams); // Reuses same fetch
 * const teams3 = dedupFetch('all_teams', fetchTeams); // Reuses same fetch
 * // Only ONE network request is made
 */
export async function dedupFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check if fetch is already in progress
  if (pendingFetches.has(key)) {
    console.log(`[FetchDedup] Deduplicating fetch for: ${key}`);
    return pendingFetches.get(key)!;
  }

  console.log(`[FetchDedup] Starting new fetch for: ${key}`);

  // Create new fetch promise
  const fetchPromise = fetcher()
    .then((result) => {
      console.log(`[FetchDedup] Fetch completed for: ${key}`);
      pendingFetches.delete(key);
      return result;
    })
    .catch((error) => {
      console.error(`[FetchDedup] Fetch failed for: ${key}`, error);
      pendingFetches.delete(key);
      throw error;
    });

  // Track the pending fetch
  pendingFetches.set(key, fetchPromise);

  return fetchPromise;
}

/**
 * Clear a specific pending fetch
 * Useful for manual cache invalidation
 */
export function clearPendingFetch(key: string): void {
  if (pendingFetches.has(key)) {
    console.log(`[FetchDedup] Clearing pending fetch for: ${key}`);
    pendingFetches.delete(key);
  }
}

/**
 * Clear all pending fetches
 * Useful on logout or app reset
 */
export function clearAllPendingFetches(): void {
  console.log(`[FetchDedup] Clearing ${pendingFetches.size} pending fetches`);
  pendingFetches.clear();
}

/**
 * Get current pending fetch statistics
 * Useful for debugging
 */
export function getPendingFetchStats(): {
  count: number;
  keys: string[];
} {
  return {
    count: pendingFetches.size,
    keys: Array.from(pendingFetches.keys())
  };
}

/**
 * Check if a fetch is currently pending for a key
 */
export function hasPendingFetch(key: string): boolean {
  return pendingFetches.has(key);
}
