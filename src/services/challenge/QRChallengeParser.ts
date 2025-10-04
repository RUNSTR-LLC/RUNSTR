/**
 * QR Challenge Parser
 * Validates and parses QR challenge data from scanned codes or deep links
 */

import type { QRChallengeData } from './QRChallengeService';
import type { ActivityType, MetricType, DurationOption } from '../../types/challenge';

const QR_CHALLENGE_EXPIRY_DAYS = 30; // Challenges expire after 30 days

// Valid values for validation
const VALID_ACTIVITIES: ActivityType[] = ['running', 'walking', 'cycling', 'hiking', 'swimming', 'rowing', 'workout'];
const VALID_METRICS: MetricType[] = ['distance', 'duration', 'count', 'calories', 'pace'];
const VALID_DURATIONS: DurationOption[] = [3, 7, 14, 30];

export interface ParseResult {
  success: boolean;
  data?: QRChallengeData;
  error?: string;
}

/**
 * QR Challenge Parser Utility
 * Static methods for parsing and validating QR challenge data
 */
export class QRChallengeParser {
  /**
   * Parse QR string (base64 JSON) to challenge data
   */
  public static parseQRData(qrString: string): ParseResult {
    try {
      // Decode base64 to JSON string
      const jsonString = Buffer.from(qrString, 'base64').toString('utf-8');

      // Parse JSON
      const data = JSON.parse(jsonString);

      // Validate structure
      if (!this.validateChallengeData(data)) {
        return {
          success: false,
          error: 'Invalid challenge data format',
        };
      }

      // Check expiry
      if (this.isExpired(data)) {
        return {
          success: false,
          error: 'This challenge has expired',
        };
      }

      return {
        success: true,
        data: data as QRChallengeData,
      };
    } catch (error) {
      console.error('Failed to parse QR data:', error);
      return {
        success: false,
        error: 'Failed to decode QR code data',
      };
    }
  }

  /**
   * Parse deep link URL to challenge data
   * Format: runstr://challenge/accept?data={base64_encoded_json}
   */
  public static fromDeepLink(url: string): ParseResult {
    try {
      // Extract data parameter from URL
      const urlObj = new URL(url);
      const dataParam = urlObj.searchParams.get('data');

      if (!dataParam) {
        return {
          success: false,
          error: 'No challenge data in URL',
        };
      }

      // Decode URI component and parse
      const decodedData = decodeURIComponent(dataParam);
      return this.parseQRData(decodedData);
    } catch (error) {
      console.error('Failed to parse deep link:', error);
      return {
        success: false,
        error: 'Invalid challenge URL format',
      };
    }
  }

  /**
   * Validate challenge data structure
   * Ensures all required fields are present and valid
   */
  public static validateChallengeData(data: any): boolean {
    // Type check
    if (typeof data !== 'object' || data === null) {
      console.log('❌ Validation failed: Not an object');
      return false;
    }

    // Required fields
    const requiredFields = [
      'type',
      'challenge_id',
      'creator_pubkey',
      'activity',
      'metric',
      'duration',
      'wager',
      'created_at',
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        console.log(`❌ Validation failed: Missing field ${field}`);
        return false;
      }
    }

    // Validate type
    if (data.type !== 'challenge_qr') {
      console.log('❌ Validation failed: Invalid type');
      return false;
    }

    // Validate activity
    if (!VALID_ACTIVITIES.includes(data.activity)) {
      console.log(`❌ Validation failed: Invalid activity ${data.activity}`);
      return false;
    }

    // Validate metric
    if (!VALID_METRICS.includes(data.metric)) {
      console.log(`❌ Validation failed: Invalid metric ${data.metric}`);
      return false;
    }

    // Validate duration
    if (!VALID_DURATIONS.includes(data.duration)) {
      console.log(`❌ Validation failed: Invalid duration ${data.duration}`);
      return false;
    }

    // Validate wager (must be non-negative number)
    if (typeof data.wager !== 'number' || data.wager < 0) {
      console.log(`❌ Validation failed: Invalid wager ${data.wager}`);
      return false;
    }

    // Validate created_at (must be positive number)
    if (typeof data.created_at !== 'number' || data.created_at <= 0) {
      console.log(`❌ Validation failed: Invalid created_at ${data.created_at}`);
      return false;
    }

    // Validate pubkey format (hex string, 64 characters)
    if (
      typeof data.creator_pubkey !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(data.creator_pubkey)
    ) {
      console.log(`❌ Validation failed: Invalid pubkey format`);
      return false;
    }

    console.log('✅ Challenge data validation passed');
    return true;
  }

  /**
   * Check if challenge is expired
   * QR challenges expire after 30 days
   */
  public static isExpired(data: QRChallengeData): boolean {
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const expirySeconds = QR_CHALLENGE_EXPIRY_DAYS * 24 * 60 * 60;
    const age = nowTimestamp - data.created_at;

    return age > expirySeconds;
  }

  /**
   * Get human-readable expiry status
   */
  public static getExpiryStatus(data: QRChallengeData): {
    expired: boolean;
    daysRemaining: number;
  } {
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const expirySeconds = QR_CHALLENGE_EXPIRY_DAYS * 24 * 60 * 60;
    const age = nowTimestamp - data.created_at;
    const remainingSeconds = expirySeconds - age;
    const daysRemaining = Math.max(0, Math.ceil(remainingSeconds / (24 * 60 * 60)));

    return {
      expired: age > expirySeconds,
      daysRemaining,
    };
  }

  /**
   * Convert challenge data to deep link URL
   */
  public static toDeepLink(data: QRChallengeData): string {
    const jsonString = JSON.stringify(data);
    const base64 = Buffer.from(jsonString).toString('base64');
    const encoded = encodeURIComponent(base64);
    return `runstr://challenge/accept?data=${encoded}`;
  }
}
