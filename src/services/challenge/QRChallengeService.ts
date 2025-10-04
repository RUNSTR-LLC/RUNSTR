/**
 * QR Challenge Service
 * Manages creation and storage of QR-based open challenges
 * Enables users to create challenges via QR codes that can be shared/scanned
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityType, MetricType, DurationOption } from '../../types/challenge';

const QR_CHALLENGES_STORAGE_KEY = '@runstr:qr_challenges';
const QR_CHALLENGE_EXPIRY_DAYS = 30; // QR challenges expire after 30 days

export interface QRChallengeData {
  type: 'challenge_qr';
  challenge_id: string;
  creator_pubkey: string;
  creator_name?: string;
  creator_picture?: string;
  activity: ActivityType;
  metric: MetricType;
  duration: DurationOption;
  wager: number;
  created_at: number;
}

export interface ChallengeParams {
  activityType: ActivityType;
  metric: MetricType;
  duration: DurationOption;
  wagerAmount: number;
}

/**
 * QR Challenge Management Service
 * Handles QR challenge generation, encoding, and local storage
 */
export class QRChallengeService {
  private static instance: QRChallengeService;

  private constructor() {}

  public static getInstance(): QRChallengeService {
    if (!QRChallengeService.instance) {
      QRChallengeService.instance = new QRChallengeService();
    }
    return QRChallengeService.instance;
  }

  /**
   * Generate unique challenge ID
   * Format: qr_{first8chars_of_pubkey}_{timestamp}
   */
  private generateChallengeId(creatorPubkey: string): string {
    const pubkeyPrefix = creatorPubkey.slice(0, 8);
    const timestamp = Date.now();
    return `qr_${pubkeyPrefix}_${timestamp}`;
  }

  /**
   * Create QR challenge data structure
   */
  public async createQRChallenge(
    params: ChallengeParams,
    creatorPubkey: string,
    creatorName?: string,
    creatorPicture?: string
  ): Promise<QRChallengeData> {
    const challengeData: QRChallengeData = {
      type: 'challenge_qr',
      challenge_id: this.generateChallengeId(creatorPubkey),
      creator_pubkey: creatorPubkey,
      creator_name: creatorName,
      creator_picture: creatorPicture,
      activity: params.activityType,
      metric: params.metric,
      duration: params.duration,
      wager: params.wagerAmount,
      created_at: Math.floor(Date.now() / 1000),
    };

    // Save to local storage for history
    await this.saveQRChallenge(challengeData);

    return challengeData;
  }

  /**
   * Convert QR challenge data to base64 JSON string for QR code
   */
  public toQRString(data: QRChallengeData): string {
    const jsonString = JSON.stringify(data);
    return Buffer.from(jsonString).toString('base64');
  }

  /**
   * Convert QR challenge to deep link URL
   * Format: runstr://challenge/accept?data={base64_encoded_json}
   */
  public toDeepLink(data: QRChallengeData): string {
    const qrString = this.toQRString(data);
    const encoded = encodeURIComponent(qrString);
    return `runstr://challenge/accept?data=${encoded}`;
  }

  /**
   * Save QR challenge to local storage for history/tracking
   */
  private async saveQRChallenge(data: QRChallengeData): Promise<void> {
    try {
      // Load existing challenges
      const existingChallenges = await this.getStoredQRChallenges();

      // Add new challenge
      existingChallenges.push(data);

      // Save back to storage
      await AsyncStorage.setItem(
        QR_CHALLENGES_STORAGE_KEY,
        JSON.stringify(existingChallenges)
      );

      console.log(`💾 Saved QR challenge: ${data.challenge_id}`);
    } catch (error) {
      console.error('Failed to save QR challenge:', error);
      // Don't throw - saving to history is not critical
    }
  }

  /**
   * Get all stored QR challenges created by this user
   */
  private async getStoredQRChallenges(): Promise<QRChallengeData[]> {
    try {
      const stored = await AsyncStorage.getItem(QR_CHALLENGES_STORAGE_KEY);
      if (!stored) {
        return [];
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load QR challenges:', error);
      return [];
    }
  }

  /**
   * Get QR challenges created by a specific user
   * Also filters out expired challenges (>30 days old)
   */
  public async getCreatedQRChallenges(userPubkey: string): Promise<QRChallengeData[]> {
    try {
      const allChallenges = await this.getStoredQRChallenges();
      const nowTimestamp = Math.floor(Date.now() / 1000);
      const expirySeconds = QR_CHALLENGE_EXPIRY_DAYS * 24 * 60 * 60;

      // Filter by creator and expiry
      const validChallenges = allChallenges.filter((challenge) => {
        const isCreator = challenge.creator_pubkey === userPubkey;
        const isNotExpired = (nowTimestamp - challenge.created_at) < expirySeconds;
        return isCreator && isNotExpired;
      });

      return validChallenges;
    } catch (error) {
      console.error('Failed to get created QR challenges:', error);
      return [];
    }
  }

  /**
   * Check if a challenge ID already exists in storage
   * Useful for preventing duplicate accepts
   */
  public async challengeExists(challengeId: string): Promise<boolean> {
    try {
      const challenges = await this.getStoredQRChallenges();
      return challenges.some((c) => c.challenge_id === challengeId);
    } catch (error) {
      console.error('Failed to check challenge existence:', error);
      return false;
    }
  }

  /**
   * Clear old/expired QR challenges from storage
   * Call periodically to prevent storage bloat
   */
  public async cleanupExpiredChallenges(): Promise<void> {
    try {
      const allChallenges = await this.getStoredQRChallenges();
      const nowTimestamp = Math.floor(Date.now() / 1000);
      const expirySeconds = QR_CHALLENGE_EXPIRY_DAYS * 24 * 60 * 60;

      // Keep only non-expired challenges
      const validChallenges = allChallenges.filter((challenge) => {
        return (nowTimestamp - challenge.created_at) < expirySeconds;
      });

      // Save filtered list
      await AsyncStorage.setItem(
        QR_CHALLENGES_STORAGE_KEY,
        JSON.stringify(validChallenges)
      );

      const removed = allChallenges.length - validChallenges.length;
      if (removed > 0) {
        console.log(`🧹 Cleaned up ${removed} expired QR challenges`);
      }
    } catch (error) {
      console.error('Failed to cleanup expired challenges:', error);
    }
  }

  /**
   * Delete a specific QR challenge by ID
   */
  public async deleteQRChallenge(challengeId: string): Promise<boolean> {
    try {
      const challenges = await this.getStoredQRChallenges();
      const filtered = challenges.filter((c) => c.challenge_id !== challengeId);

      if (filtered.length === challenges.length) {
        // Challenge not found
        return false;
      }

      await AsyncStorage.setItem(
        QR_CHALLENGES_STORAGE_KEY,
        JSON.stringify(filtered)
      );

      console.log(`🗑️ Deleted QR challenge: ${challengeId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete QR challenge:', error);
      return false;
    }
  }
}

// Export singleton instance
export const qrChallengeService = QRChallengeService.getInstance();
