/**
 * Web of Trust (WoT) Types
 * For NIP-85 Trusted Assertions integration with Brainstorm
 */

/**
 * Cached WoT score data stored in AsyncStorage
 */
export interface CachedWoTScore {
  /** The WoT rank value (float, e.g., 0.000168), or null if not ranked */
  score: number | null;
  /** Timestamp when the score was fetched */
  fetchedAt: number;
  /** The hex pubkey this score is for */
  pubkey: string;
}

/**
 * WoT fetch result with loading/error states
 */
export interface WoTFetchResult {
  score: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Brainstorm kind 30382 event structure
 */
export interface BrainstormTrustedAssertion {
  kind: 30382;
  pubkey: string; // Brainstorm's relay pubkey
  tags: Array<[string, string] | [string, string, string]>;
  content: string;
  created_at: number;
  id: string;
  sig: string;
}
