/**
 * Shared constants for the default one-tap zap amount.
 * Single source of truth for the AsyncStorage key, fallback, and presets
 * used by the feed zap button, the external zap modal, the lightning button,
 * and the Wallet settings editor.
 */

/** AsyncStorage key holding the user's default zap amount (in sats). */
export const DEFAULT_ZAP_AMOUNT_KEY = '@runstr:default_zap_amount';

/** Fallback used when no value is stored (sats). */
export const DEFAULT_ZAP_AMOUNT_FALLBACK = 50;

/** Quick-pick presets shown in the settings editor (sats). */
export const ZAP_AMOUNT_PRESETS = [21, 50, 100, 500, 1000];

/**
 * Parse a stored zap amount into a positive integer.
 * Returns DEFAULT_ZAP_AMOUNT_FALLBACK for null/empty/non-numeric/non-positive input.
 */
export function parseStoredZapAmount(stored: string | null): number {
  if (!stored) return DEFAULT_ZAP_AMOUNT_FALLBACK;
  const parsed = parseInt(stored, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_ZAP_AMOUNT_FALLBACK;
  return parsed;
}
