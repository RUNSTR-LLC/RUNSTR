/**
 * LNURL Utility - Lightning Address Invoice Requests
 * Implements LNURL-pay protocol for requesting invoices from Lightning addresses
 *
 * @see https://github.com/lnurl/luds/blob/luds/06.md
 */

export interface LNURLPayDetails {
  callback: string; // URL to request invoice from
  minSendable: number; // Min amount in millisatoshis
  maxSendable: number; // Max amount in millisatoshis
  metadata: string; // JSON metadata
  tag: string; // Always "payRequest"
  commentAllowed?: number; // Max comment length
}

export interface InvoiceResponse {
  pr: string; // BOLT11 Lightning invoice
  routes?: any[]; // Optional routing hints
  successAction?: {
    tag: string;
    message?: string;
    url?: string;
  };
}

function ensureHttpsUrl(urlString: string, fieldName: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`Invalid ${fieldName} URL`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${fieldName} must use HTTPS`);
  }

  return parsed;
}

/**
 * Fetch LNURL-pay details from Lightning address
 *
 * @param lightningAddress - Format: "user@domain.com"
 * @returns LNURL-pay endpoint details
 *
 * @example
 * const details = await fetchLNURLPayDetails("alice@getalby.com");
 * console.log(details.callback); // LNURL callback URL
 */
export async function fetchLNURLPayDetails(
  lightningAddress: string
): Promise<LNURLPayDetails> {
  // Validate Lightning address format
  const [name, domain] = lightningAddress.split('@');

  if (!name || !domain) {
    throw new Error(
      'Invalid Lightning address format. Expected: user@domain.com'
    );
  }

  // Construct LNURL endpoint (LUD-16)
  const lnurlUrl = `https://${domain}/.well-known/lnurlp/${name}`;

  console.log('[LNURL] Fetching details from:', lnurlUrl);

  // Create AbortController for manual timeout (React Native compatible)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(lnurlUrl, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Check for LNURL error response
    if (data.status === 'ERROR') {
      throw new Error(data.reason || 'LNURL endpoint returned error');
    }

    // Validate required fields
    if (!data.callback || !data.tag) {
      throw new Error('Invalid LNURL response: missing required fields');
    }

    // Security: LNURL callback must use HTTPS
    ensureHttpsUrl(data.callback, 'LNURL callback');

    console.log('[LNURL] ✅ Details fetched successfully');

    return data as LNURLPayDetails;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'Request timeout: Lightning address service not responding'
      );
    }

    console.error('[LNURL] ❌ Failed to fetch details:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Request invoice from LNURL callback
 *
 * @param callbackUrl - LNURL callback URL from pay details
 * @param amountMillisats - Amount in millisatoshis (sats * 1000)
 * @param comment - Optional comment/memo
 * @param zapRequest - Optional NIP-57 zap request (stringified JSON)
 * @returns Invoice response with BOLT11 payment request
 *
 * @example
 * const invoice = await requestInvoiceFromLNURL(
 *   details.callback,
 *   2100000, // 2,100 sats
 *   "Entry fee for Marathon 5K"
 * );
 */
export async function requestInvoiceFromLNURL(
  callbackUrl: string,
  amountMillisats: number,
  comment?: string,
  zapRequest?: string
): Promise<InvoiceResponse> {
  // Build callback URL with amount parameter
  const url = ensureHttpsUrl(callbackUrl, 'LNURL callback');
  url.searchParams.set('amount', amountMillisats.toString());

  if (comment) {
    url.searchParams.set('comment', comment);
  }

  // Add zap request for NIP-57
  if (zapRequest) {
    url.searchParams.set('nostr', zapRequest);
  }

  console.log('[LNURL] Requesting invoice for', amountMillisats, 'msats');

  // Create AbortController for manual timeout (React Native compatible)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Check for LNURL error response
    if (data.status === 'ERROR') {
      throw new Error(data.reason || 'Invoice request failed');
    }

    // Validate invoice
    if (!data.pr) {
      throw new Error('Invalid response: missing invoice');
    }

    console.log('[LNURL] ✅ Invoice generated');

    return data as InvoiceResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Invoice request timeout');
    }

    console.error('[LNURL] ❌ Failed to get invoice:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get invoice from Lightning address (convenience function)
 * Combines fetchLNURLPayDetails and requestInvoiceFromLNURL into one call
 *
 * @param lightningAddress - Lightning address (user@domain.com)
 * @param amountSats - Amount in satoshis
 * @param description - Optional description/comment
 * @param zapRequest - Optional NIP-57 zap request (stringified JSON)
 * @returns Invoice string and optional success message
 *
 * @example
 * const { invoice } = await getInvoiceFromLightningAddress(
 *   "captain@getalby.com",
 *   2100,
 *   "Entry fee: Marathon 5K"
 * );
 * // Show QR code with invoice
 */
export async function getInvoiceFromLightningAddress(
  lightningAddress: string,
  amountSats: number,
  description?: string,
  zapRequest?: string
): Promise<{ invoice: string; successMessage?: string }> {
  console.log(
    '[LNURL] Getting invoice from',
    lightningAddress,
    'for',
    amountSats,
    'sats'
  );

  try {
    // Step 1: Fetch LNURL-pay details
    const lnurlDetails = await fetchLNURLPayDetails(lightningAddress);

    // Step 2: Validate amount is within allowed range
    const amountMillisats = amountSats * 1000;

    if (amountMillisats < lnurlDetails.minSendable) {
      throw new Error(
        `Amount too small. Minimum: ${lnurlDetails.minSendable / 1000} sats`
      );
    }

    if (amountMillisats > lnurlDetails.maxSendable) {
      throw new Error(
        `Amount too large. Maximum: ${lnurlDetails.maxSendable / 1000} sats`
      );
    }

    // Step 3: Request invoice from callback
    const invoiceData = await requestInvoiceFromLNURL(
      lnurlDetails.callback,
      amountMillisats,
      description,
      zapRequest
    );

    console.log('[LNURL] ✅ Complete - invoice ready');

    return {
      invoice: invoiceData.pr,
      successMessage: invoiceData.successAction?.message,
    };
  } catch (error) {
    console.error('[LNURL] ❌ Failed to get invoice:', error);
    throw error;
  }
}

/**
 * Validate Lightning address format
 *
 * @param lightningAddress - Address to validate
 * @returns true if valid, false otherwise
 */
export function isValidLightningAddress(lightningAddress: string): boolean {
  const parts = lightningAddress.split('@');

  if (parts.length !== 2) {
    return false;
  }

  const [name, domain] = parts;

  // Basic validation
  if (!name || !domain) {
    return false;
  }

  // Domain should contain at least one dot
  if (!domain.includes('.')) {
    return false;
  }

  return true;
}
