/**
 * QR Event Parser
 * Validates and parses QR event data from scanned codes or deep links
 */

import type { QREventData } from './QREventService';

const QR_EVENT_EXPIRY_DAYS = 90; // Events expire after 90 days

export interface ParseResult {
  success: boolean;
  data?: QREventData;
  error?: string;
}

/**
 * QR Event Parser Utility
 * Static methods for parsing and validating QR event data
 */
export class QREventParser {
  /**
   * Parse QR string (base64 JSON) to event data
   */
  public static parseQRData(qrString: string): ParseResult {
    try {
      // Decode base64 to JSON string
      const jsonString = Buffer.from(qrString, 'base64').toString('utf-8');

      // Parse JSON
      const data = JSON.parse(jsonString);

      // Validate structure
      if (!this.validateEventData(data)) {
        return {
          success: false,
          error: 'Invalid event data format',
        };
      }

      // Check expiry
      if (this.isExpired(data)) {
        return {
          success: false,
          error: 'This event has expired',
        };
      }

      return {
        success: true,
        data: data as QREventData,
      };
    } catch (error) {
      console.error('Failed to parse QR event data:', error);
      return {
        success: false,
        error: 'Failed to decode QR code data',
      };
    }
  }

  /**
   * Parse deep link URL to event data
   * Format: runstr://event/join?data={base64_encoded_json}
   */
  public static fromDeepLink(url: string): ParseResult {
    try {
      // Extract data parameter from URL
      const urlObj = new URL(url);
      const dataParam = urlObj.searchParams.get('data');

      if (!dataParam) {
        return {
          success: false,
          error: 'No event data in URL',
        };
      }

      // Decode URI component and parse
      const decodedData = decodeURIComponent(dataParam);
      return this.parseQRData(decodedData);
    } catch (error) {
      console.error('Failed to parse deep link:', error);
      return {
        success: false,
        error: 'Invalid event URL format',
      };
    }
  }

  /**
   * Validate event data structure
   * Ensures all required fields are present and valid
   */
  public static validateEventData(data: any): boolean {
    // Type check
    if (typeof data !== 'object' || data === null) {
      console.log('❌ Event validation failed: Not an object');
      return false;
    }

    // Required fields
    const requiredFields = [
      'type',
      'event_id',
      'team_id',
      'event_name',
      'event_date',
      'activity_type',
      'entry_fee',
      'captain_pubkey',
      'created_at',
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        console.log(`❌ Event validation failed: Missing field ${field}`);
        return false;
      }
    }

    // Validate type
    if (data.type !== 'paid_event' && data.type !== 'free_event') {
      console.log('❌ Event validation failed: Invalid type');
      return false;
    }

    // Validate entry_fee (must be non-negative number)
    if (typeof data.entry_fee !== 'number' || data.entry_fee < 0) {
      console.log(`❌ Event validation failed: Invalid entry_fee ${data.entry_fee}`);
      return false;
    }

    // Validate type matches entry_fee
    if (data.type === 'paid_event' && data.entry_fee === 0) {
      console.log('❌ Event validation failed: Paid event must have entry fee > 0');
      return false;
    }

    if (data.type === 'free_event' && data.entry_fee !== 0) {
      console.log('❌ Event validation failed: Free event must have entry fee = 0');
      return false;
    }

    // Validate created_at (must be positive number)
    if (typeof data.created_at !== 'number' || data.created_at <= 0) {
      console.log(`❌ Event validation failed: Invalid created_at ${data.created_at}`);
      return false;
    }

    // Validate pubkey format (hex string, 64 characters)
    if (
      typeof data.captain_pubkey !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(data.captain_pubkey)
    ) {
      console.log(`❌ Event validation failed: Invalid captain pubkey format`);
      return false;
    }

    // Validate event_date is a valid date string
    if (typeof data.event_date !== 'string' || isNaN(Date.parse(data.event_date))) {
      console.log(`❌ Event validation failed: Invalid event_date ${data.event_date}`);
      return false;
    }

    console.log('✅ Event data validation passed');
    return true;
  }

  /**
   * Check if event is expired
   * QR events expire after 90 days
   */
  public static isExpired(data: QREventData): boolean {
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const expirySeconds = QR_EVENT_EXPIRY_DAYS * 24 * 60 * 60;
    const age = nowTimestamp - data.created_at;

    return age > expirySeconds;
  }

  /**
   * Check if event date has passed
   */
  public static isEventDatePassed(data: QREventData): boolean {
    const eventDate = new Date(data.event_date);
    const now = new Date();
    return eventDate < now;
  }

  /**
   * Get human-readable expiry status
   */
  public static getExpiryStatus(data: QREventData): {
    expired: boolean;
    daysRemaining: number;
  } {
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const expirySeconds = QR_EVENT_EXPIRY_DAYS * 24 * 60 * 60;
    const age = nowTimestamp - data.created_at;
    const remainingSeconds = expirySeconds - age;
    const daysRemaining = Math.max(0, Math.ceil(remainingSeconds / (24 * 60 * 60)));

    return {
      expired: age > expirySeconds,
      daysRemaining,
    };
  }

  /**
   * Convert event data to deep link URL
   */
  public static toDeepLink(data: QREventData): string {
    const jsonString = JSON.stringify(data);
    const base64 = Buffer.from(jsonString).toString('base64');
    const encoded = encodeURIComponent(base64);
    return `runstr://event/join?data=${encoded}`;
  }
}
