/**
 * GPSHealthMonitor - Track GPS signal quality
 *
 * Monitors GPS accuracy and signal strength to detect issues early
 * Warns users when GPS signal is poor or lost
 */

export type GPSSignalQuality = 'excellent' | 'good' | 'poor' | 'lost';

export interface GPSHealthStatus {
  quality: GPSSignalQuality;
  accuracy: number | null;
  message: string | null;
}

export class GPSHealthMonitor {
  private recentAccuracies: number[] = [];
  private lastGoodSignalTime: number = Date.now();
  private readonly MAX_HISTORY = 10; // Track last 10 readings
  private readonly SIGNAL_LOSS_THRESHOLD_MS = 30000; // 30 seconds without good signal = lost

  /**
   * Assess GPS signal quality based on accuracy reading
   */
  assessSignalQuality(accuracy: number | undefined): GPSHealthStatus {
    const now = Date.now();

    // No accuracy data = lost signal
    if (accuracy === undefined || accuracy === null) {
      return {
        quality: 'lost',
        accuracy: null,
        message: 'GPS signal lost - searching...',
      };
    }

    // Add to history
    this.recentAccuracies.push(accuracy);
    if (this.recentAccuracies.length > this.MAX_HISTORY) {
      this.recentAccuracies.shift();
    }

    // Calculate average accuracy from recent readings
    const avgAccuracy =
      this.recentAccuracies.reduce((a, b) => a + b, 0) /
      this.recentAccuracies.length;

    // Update last good signal time if accuracy is acceptable.
    // Also reset on a strong instantaneous reading so signal recovery after a tunnel
    // doesn't wait for 10 rolling-average cycles to clear (fixes ~30s false "signal lost").
    if (avgAccuracy <= 20 || accuracy <= 10) {
      this.lastGoodSignalTime = now;
    }

    // Check for signal loss (no good signal for 30+ seconds)
    const timeSinceGoodSignal = now - this.lastGoodSignalTime;
    if (timeSinceGoodSignal > this.SIGNAL_LOSS_THRESHOLD_MS) {
      return {
        quality: 'lost',
        accuracy: avgAccuracy,
        message: 'GPS signal lost - check if outdoors',
      };
    }

    // Determine quality based on average accuracy
    if (avgAccuracy <= 5) {
      return {
        quality: 'excellent',
        accuracy: avgAccuracy,
        message: null,
      };
    }

    if (avgAccuracy <= 10) {
      return {
        quality: 'good',
        accuracy: avgAccuracy,
        message: null,
      };
    }

    if (avgAccuracy <= 20) {
      return {
        quality: 'poor',
        accuracy: avgAccuracy,
        message: 'GPS accuracy reduced - distance may be less accurate',
      };
    }

    return {
      quality: 'lost',
      accuracy: avgAccuracy,
      message: 'GPS signal very weak - move to open area',
    };
  }

  /**
   * Reset monitor (call when starting new workout)
   */
  reset() {
    this.recentAccuracies = [];
    this.lastGoodSignalTime = Date.now();
  }

  /**
   * Get a user-friendly message for the current GPS state
   */
  getUserMessage(quality: GPSSignalQuality): string | null {
    const messages = {
      excellent: null, // No message needed
      good: null,
      poor: 'GPS accuracy reduced',
      lost: 'GPS signal lost',
    };
    return messages[quality];
  }

  /**
   * Check if signal quality is acceptable for tracking
   */
  isAcceptableForTracking(quality: GPSSignalQuality): boolean {
    return quality === 'excellent' || quality === 'good' || quality === 'poor';
  }
}

// Export singleton instance
export const gpsHealthMonitor = new GPSHealthMonitor();
