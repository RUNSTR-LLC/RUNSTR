/**
 * NotificationCache - Tracks notification state for competitions
 * Prevents duplicate notifications and tracks leaderboard positions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@runstr_notification_cache';
const POSITION_CACHE_KEY = `${CACHE_PREFIX}_positions`;
const NOTIFIED_COMPETITIONS_KEY = `${CACHE_PREFIX}_notified_comps`;
const ENDING_ALERTS_KEY = `${CACHE_PREFIX}_ending_alerts`;

interface PositionCache {
  [competitionId: string]: {
    position: number;
    lastChecked: number;
    competitionName: string;
  };
}

interface NotifiedCompetitions {
  [competitionId: string]: {
    notifiedAt: number;
    competitionName: string;
  };
}

interface EndingAlerts {
  [competitionId: string]: {
    lastAlertAt: number;
    hoursWarned: number[];
  };
}

export class NotificationCache {
  /**
   * Store user's position in a competition
   */
  static async updatePosition(
    competitionId: string,
    competitionName: string,
    position: number
  ): Promise<number | null> {
    try {
      const cached = await AsyncStorage.getItem(POSITION_CACHE_KEY);
      const positions: PositionCache = cached ? JSON.parse(cached) : {};

      const previousPosition = positions[competitionId]?.position || null;

      positions[competitionId] = {
        position,
        lastChecked: Date.now(),
        competitionName,
      };

      await AsyncStorage.setItem(POSITION_CACHE_KEY, JSON.stringify(positions));

      return previousPosition;
    } catch (error) {
      console.error('Failed to update position cache:', error);
      return null;
    }
  }

  /**
   * Get user's last known position in a competition
   */
  static async getLastPosition(competitionId: string): Promise<number | null> {
    try {
      const cached = await AsyncStorage.getItem(POSITION_CACHE_KEY);
      if (!cached) return null;

      const positions: PositionCache = JSON.parse(cached);
      return positions[competitionId]?.position || null;
    } catch (error) {
      console.error('Failed to get position from cache:', error);
      return null;
    }
  }

  /**
   * Check if we've already notified about a competition
   */
  static async hasNotifiedCompetition(competitionId: string): Promise<boolean> {
    try {
      const cached = await AsyncStorage.getItem(NOTIFIED_COMPETITIONS_KEY);
      if (!cached) return false;

      const notified: NotifiedCompetitions = JSON.parse(cached);

      // Check if notified and if it was within last 24 hours
      const entry = notified[competitionId];
      if (!entry) return false;

      const hoursSinceNotified = (Date.now() - entry.notifiedAt) / (1000 * 60 * 60);
      return hoursSinceNotified < 24;
    } catch (error) {
      console.error('Failed to check notified competitions:', error);
      return false;
    }
  }

  /**
   * Mark competition as notified
   */
  static async markCompetitionNotified(
    competitionId: string,
    competitionName: string
  ): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(NOTIFIED_COMPETITIONS_KEY);
      const notified: NotifiedCompetitions = cached ? JSON.parse(cached) : {};

      notified[competitionId] = {
        notifiedAt: Date.now(),
        competitionName,
      };

      await AsyncStorage.setItem(NOTIFIED_COMPETITIONS_KEY, JSON.stringify(notified));
    } catch (error) {
      console.error('Failed to mark competition as notified:', error);
    }
  }

  /**
   * Check if we should send ending soon alert
   */
  static async shouldSendEndingAlert(
    competitionId: string,
    hoursLeft: number
  ): Promise<boolean> {
    try {
      const cached = await AsyncStorage.getItem(ENDING_ALERTS_KEY);
      const alerts: EndingAlerts = cached ? JSON.parse(cached) : {};

      const entry = alerts[competitionId];
      if (!entry) return true;

      // Only send alerts at specific intervals: 24h, 12h, 6h, 3h, 1h
      const alertIntervals = [24, 12, 6, 3, 1];
      const nearestInterval = alertIntervals.find(h => h <= hoursLeft) || 1;

      // Check if we've already sent alert for this interval
      return !entry.hoursWarned.includes(nearestInterval);
    } catch (error) {
      console.error('Failed to check ending alerts:', error);
      return true;
    }
  }

  /**
   * Mark ending alert as sent
   */
  static async markEndingAlertSent(
    competitionId: string,
    hoursLeft: number
  ): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(ENDING_ALERTS_KEY);
      const alerts: EndingAlerts = cached ? JSON.parse(cached) : {};

      const alertIntervals = [24, 12, 6, 3, 1];
      const nearestInterval = alertIntervals.find(h => h <= hoursLeft) || 1;

      if (!alerts[competitionId]) {
        alerts[competitionId] = {
          lastAlertAt: Date.now(),
          hoursWarned: [],
        };
      }

      if (!alerts[competitionId].hoursWarned.includes(nearestInterval)) {
        alerts[competitionId].hoursWarned.push(nearestInterval);
        alerts[competitionId].lastAlertAt = Date.now();
      }

      await AsyncStorage.setItem(ENDING_ALERTS_KEY, JSON.stringify(alerts));
    } catch (error) {
      console.error('Failed to mark ending alert as sent:', error);
    }
  }

  /**
   * Clear all notification cache
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        POSITION_CACHE_KEY,
        NOTIFIED_COMPETITIONS_KEY,
        ENDING_ALERTS_KEY,
      ]);
      console.log('Notification cache cleared');
    } catch (error) {
      console.error('Failed to clear notification cache:', error);
    }
  }

  /**
   * Clean old entries (older than 7 days)
   */
  static async cleanOldEntries(): Promise<void> {
    try {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      // Clean position cache
      const positionCache = await AsyncStorage.getItem(POSITION_CACHE_KEY);
      if (positionCache) {
        const positions: PositionCache = JSON.parse(positionCache);
        const cleaned = Object.entries(positions).reduce((acc, [key, value]) => {
          if (value.lastChecked > sevenDaysAgo) {
            acc[key] = value;
          }
          return acc;
        }, {} as PositionCache);
        await AsyncStorage.setItem(POSITION_CACHE_KEY, JSON.stringify(cleaned));
      }

      // Clean notified competitions
      const notifiedCache = await AsyncStorage.getItem(NOTIFIED_COMPETITIONS_KEY);
      if (notifiedCache) {
        const notified: NotifiedCompetitions = JSON.parse(notifiedCache);
        const cleaned = Object.entries(notified).reduce((acc, [key, value]) => {
          if (value.notifiedAt > sevenDaysAgo) {
            acc[key] = value;
          }
          return acc;
        }, {} as NotifiedCompetitions);
        await AsyncStorage.setItem(NOTIFIED_COMPETITIONS_KEY, JSON.stringify(cleaned));
      }

      console.log('Cleaned old notification cache entries');
    } catch (error) {
      console.error('Failed to clean old cache entries:', error);
    }
  }
}