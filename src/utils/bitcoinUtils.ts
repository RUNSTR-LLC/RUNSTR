/**
 * Bitcoin/Lightning Network utility functions
 * Handles validation, formatting, and conversion of satoshi amounts
 */

// Constants
export const MIN_WAGER_AMOUNT = 100; // Minimum 100 sats
export const MAX_WAGER_AMOUNT = 100000; // Maximum 100k sats for peer challenges
export const DEFAULT_WAGER_AMOUNT = 1000; // Default 1k sats

// Bitcoin unit conversions
export const SATS_PER_BTC = 100000000; // 100 million sats = 1 BTC

/**
 * Validates a satoshi amount for challenge wagers
 * @param amount - Amount in satoshis
 * @returns Object with isValid flag and error message if invalid
 */
export const validateWagerAmount = (
  amount: number
): { isValid: boolean; error?: string } => {
  if (!Number.isInteger(amount)) {
    return { isValid: false, error: 'Amount must be a whole number' };
  }

  if (amount < MIN_WAGER_AMOUNT) {
    return {
      isValid: false,
      error: `Minimum wager is ${MIN_WAGER_AMOUNT} sats`,
    };
  }

  if (amount > MAX_WAGER_AMOUNT) {
    return {
      isValid: false,
      error: `Maximum wager is ${formatSats(MAX_WAGER_AMOUNT)}`,
    };
  }

  return { isValid: true };
};

/**
 * Formats satoshi amount for display
 * @param sats - Amount in satoshis
 * @param includeUnit - Whether to include "sats" unit (default: true)
 * @returns Formatted string like "1,000 sats" or "1,000"
 */
export const formatSats = (
  sats: number,
  includeUnit: boolean = true
): string => {
  const formatted = sats.toLocaleString();
  return includeUnit ? `${formatted} sats` : formatted;
};

/**
 * Parses user input into valid satoshi amount
 * @param input - User input string
 * @returns Parsed number or null if invalid
 */
export const parseSatsInput = (input: string): number | null => {
  // Remove any non-digit characters except commas and periods
  const cleaned = input.replace(/[^0-9,]/g, '');

  // Remove commas
  const withoutCommas = cleaned.replace(/,/g, '');

  const parsed = parseInt(withoutCommas, 10);

  if (isNaN(parsed)) {
    return null;
  }

  return parsed;
};

/**
 * Converts satoshis to BTC
 * @param sats - Amount in satoshis
 * @param precision - Decimal places (default: 8)
 * @returns BTC amount as number
 */
export const satsToBtc = (sats: number, precision: number = 8): number => {
  return parseFloat((sats / SATS_PER_BTC).toFixed(precision));
};

/**
 * Converts BTC to satoshis
 * @param btc - Amount in BTC
 * @returns Satoshi amount as integer
 */
export const btcToSats = (btc: number): number => {
  return Math.round(btc * SATS_PER_BTC);
};

/**
 * Formats BTC amount for display
 * @param btc - Amount in BTC
 * @param precision - Decimal places (default: 8)
 * @returns Formatted string like "0.00001000 BTC"
 */
export const formatBtc = (btc: number, precision: number = 8): string => {
  return `${btc.toFixed(precision)} BTC`;
};

/**
 * Gets suggested wager amounts based on user's activity level
 * @param userLevel - User's experience level: 'beginner' | 'intermediate' | 'advanced'
 * @returns Array of suggested amounts in sats
 */
export const getSuggestedWagers = (
  userLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
): number[] => {
  switch (userLevel) {
    case 'beginner':
      return [100, 250, 500, 1000, 2000, 5000];
    case 'intermediate':
      return [500, 1000, 2500, 5000, 10000, 25000];
    case 'advanced':
      return [2500, 5000, 10000, 25000, 50000, 100000];
    default:
      return [500, 1000, 2500, 5000, 10000, 25000];
  }
};

/**
 * Calculates percentage fees for different wager amounts
 * @param amount - Wager amount in sats
 * @returns Fee information object
 */
export const calculateWagerFees = (
  amount: number
): {
  platformFee: number;
  networkFee: number;
  total: number;
  userReceives: number;
} => {
  // Platform takes 2% fee
  const platformFee = Math.round(amount * 0.02);

  // Lightning network fees are typically 1 sat per transaction
  const networkFee = 1;

  const total = platformFee + networkFee;
  const userReceives = amount - total;

  return {
    platformFee,
    networkFee,
    total,
    userReceives: Math.max(0, userReceives),
  };
};
