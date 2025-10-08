/**
 * QRCodeService
 * Service for generating and parsing QR codes for challenges and events
 */

import type { ChallengeMetadata } from '../../types/challenge';

export interface ChallengeQRData {
  type: 'challenge';
  id: string;
  creator_npub: string;
  name: string;
  activity: string;
  metric: string;
  duration: number;
  wager: number;
  startsAt: number;
  expiresAt: number;
}

export interface EventQRData {
  type: 'event';
  id: string;
  team_id: string;
  captain_npub: string;
  name: string;
  description?: string;
  starts: number;
  ends: number;
}

export type QRData = ChallengeQRData | EventQRData;

class QRCodeService {
  private static instance: QRCodeService;

  static getInstance(): QRCodeService {
    if (!QRCodeService.instance) {
      QRCodeService.instance = new QRCodeService();
    }
    return QRCodeService.instance;
  }

  /**
   * Generate QR code data for a challenge
   */
  generateChallengeQR(challenge: ChallengeMetadata): string {
    const data: ChallengeQRData = {
      type: 'challenge',
      id: challenge.id,
      creator_npub: challenge.challengerPubkey,
      name: challenge.name,
      activity: challenge.activity,
      metric: challenge.metric,
      duration: Math.floor((challenge.expiresAt - challenge.startsAt) / (24 * 60 * 60)),
      wager: challenge.wager,
      startsAt: challenge.startsAt,
      expiresAt: challenge.expiresAt,
    };
    return JSON.stringify(data);
  }

  /**
   * Generate QR code data for an event
   */
  generateEventQR(
    eventId: string,
    teamId: string,
    captainNpub: string,
    name: string,
    starts: number,
    ends: number,
    description?: string
  ): string {
    const data: EventQRData = {
      type: 'event',
      id: eventId,
      team_id: teamId,
      captain_npub: captainNpub,
      name,
      description,
      starts,
      ends,
    };
    return JSON.stringify(data);
  }

  /**
   * Parse scanned QR code data
   */
  parseQR(qrString: string): QRData | null {
    try {
      const data = JSON.parse(qrString);
      return this.validateQRData(data) ? data : null;
    } catch (error) {
      console.error('Failed to parse QR code:', error);
      return null;
    }
  }

  /**
   * Validate QR data structure
   */
  private validateQRData(data: any): data is QRData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (data.type === 'challenge') {
      return !!(
        data.id &&
        data.creator_npub &&
        data.name &&
        data.activity &&
        data.metric &&
        typeof data.duration === 'number' &&
        typeof data.wager === 'number' &&
        typeof data.startsAt === 'number' &&
        typeof data.expiresAt === 'number'
      );
    }

    if (data.type === 'event') {
      return !!(
        data.id &&
        data.team_id &&
        data.captain_npub &&
        data.name &&
        typeof data.starts === 'number' &&
        typeof data.ends === 'number'
      );
    }

    return false;
  }

  /**
   * Format duration for display
   */
  formatDuration(days: number): string {
    if (days === 1) return '1 day';
    if (days === 7) return '1 week';
    if (days === 14) return '2 weeks';
    if (days === 30) return '1 month';
    return `${days} days`;
  }

  /**
   * Format activity type for display
   */
  formatActivity(activity: string): string {
    return activity.charAt(0).toUpperCase() + activity.slice(1);
  }

  /**
   * Format metric for display
   */
  formatMetric(metric: string): string {
    const metricMap: Record<string, string> = {
      distance: 'Distance',
      duration: 'Duration',
      count: 'Count',
      calories: 'Calories',
      pace: 'Pace',
    };
    return metricMap[metric] || metric;
  }

  /**
   * Format wager amount for display
   */
  formatWager(sats: number): string {
    if (sats >= 1000) {
      return `${(sats / 1000).toFixed(1)}k sats`;
    }
    return `${sats} sats`;
  }
}

// Export class instead of instance to prevent blocking module initialization
export default QRCodeService;
export { QRCodeService };
