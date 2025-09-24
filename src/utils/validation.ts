/**
 * Validation Utilities
 * Helper functions for validating various inputs across the app
 */

/**
 * Validates if a URL is a valid Shopstr or Plebeian Market shop URL
 * @param url - The URL to validate
 * @returns true if the URL is valid, false otherwise
 */
export const validateShopUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Check Shopstr format (https://shopstr.store/marketplace)
  const shopstrPattern = /^https:\/\/shopstr\.store\/marketplace/i;

  // Check Plebeian format (https://plebeian.market/community)
  const plebeianPattern = /^https:\/\/plebeian\.market\/community/i;

  return shopstrPattern.test(url) || plebeianPattern.test(url);
};

/**
 * Gets the shop platform type from a validated URL
 * @param url - The validated shop URL
 * @returns 'shopstr' | 'plebeian' | null
 */
export const getShopPlatform = (url: string): 'shopstr' | 'plebeian' | null => {
  if (!validateShopUrl(url)) {
    return null;
  }

  if (url.toLowerCase().startsWith('https://shopstr.store/')) {
    return 'shopstr';
  }

  if (url.toLowerCase().startsWith('https://plebeian.market/')) {
    return 'plebeian';
  }

  return null;
};

/**
 * Formats a shop URL for display (extracts shop name if possible)
 * @param url - The shop URL
 * @returns A display-friendly shop name or the platform name
 */
export const getShopDisplayName = (url: string): string => {
  const platform = getShopPlatform(url);

  if (!platform) {
    return 'Shop';
  }

  // Try to extract meaningful identifiers from the URL
  if (platform === 'shopstr') {
    // Extract npub from Shopstr URL if present
    const match = url.match(/\/marketplace\/(npub[a-z0-9]+)/i);
    if (match && match[1]) {
      return `Shopstr (${match[1].substring(0, 12)}...)`;
    }
    return 'Shopstr Marketplace';
  }

  if (platform === 'plebeian') {
    // Extract community identifier from Plebeian URL if present
    const match = url.match(/\/community\/[^:]+:([^/]+)/);
    if (match && match[1]) {
      return `Plebeian (${match[1]})`;
    }
    return 'Plebeian Market';
  }

  return 'Shop';
};