/**
 * SplitTrackingService - Kilometer split tracking for running activities
 * Monitors distance milestones and captures split times with pace analysis
 */

export interface Split {
  number: number; // Split number (1, 2, 3, etc.)
  distanceKm: number; // Distance milestone in km (1.0, 2.0, 3.0, etc.)
  elapsedTime: number; // Total elapsed time at this split (seconds)
  splitTime: number; // Time for this specific split (seconds)
  pace: number; // Pace for this split (seconds per km)
  timestamp: number; // When this split was recorded
}

export interface SplitStatistics {
  averagePace: number; // Average pace across all splits (seconds per km)
  fastestSplit: Split | null;
  slowestSplit: Split | null;
  isNegativeSplit: boolean; // True if second half faster than first half
  consistency: 'excellent' | 'good' | 'variable'; // Based on pace variance
}

export class SplitTrackingService {
  private splits: Split[] = [];
  private splitInterval: number = 1000; // 1km in meters
  private lastSplitDistance: number = 0;
  private startTime: number = 0;
  private pausedDuration: number = 0; // Total time spent paused

  /**
   * Start tracking splits for a new session
   */
  start(startTime: number): void {
    this.splits = [];
    this.lastSplitDistance = 0;
    this.startTime = startTime;
    this.pausedDuration = 0;
  }

  /**
   * Update with current distance and check for new splits
   * Returns the new split if one was just completed, null otherwise
   */
  update(
    currentDistanceMeters: number,
    currentElapsedSeconds: number,
    pausedDurationMs: number
  ): Split | null {
    // Update paused duration
    this.pausedDuration = Math.floor(pausedDurationMs / 1000);

    // Check if we've crossed a kilometer milestone
    const currentKm = Math.floor(currentDistanceMeters / this.splitInterval);
    const lastKm = Math.floor(this.lastSplitDistance / this.splitInterval);

    if (currentKm > lastKm && currentKm > 0) {
      // New split completed!
      const splitNumber = currentKm;
      const distanceKm = currentKm;

      // Calculate split time (time for this specific kilometer)
      const previousSplitTime = this.splits.length > 0
        ? this.splits[this.splits.length - 1].elapsedTime
        : 0;
      const splitTime = currentElapsedSeconds - previousSplitTime;

      // Calculate pace (seconds per km for this split)
      const pace = splitTime; // Since each split is 1km, split time = pace

      const newSplit: Split = {
        number: splitNumber,
        distanceKm,
        elapsedTime: currentElapsedSeconds,
        splitTime,
        pace,
        timestamp: Date.now(),
      };

      this.splits.push(newSplit);
      this.lastSplitDistance = currentDistanceMeters;

      console.log(`🏃 Split ${splitNumber}: ${this.formatSplitTime(splitTime)} (${this.formatPace(pace)}/km)`);

      return newSplit;
    }

    // Update last distance even if no split
    this.lastSplitDistance = currentDistanceMeters;
    return null;
  }

  /**
   * Get all recorded splits
   */
  getSplits(): Split[] {
    return [...this.splits];
  }

  /**
   * Get current split progress (distance into current kilometer)
   */
  getCurrentSplitProgress(currentDistanceMeters: number): {
    currentSplitNumber: number;
    progressMeters: number;
    progressPercent: number;
  } {
    const currentKm = Math.floor(currentDistanceMeters / this.splitInterval);
    const progressMeters = currentDistanceMeters % this.splitInterval;
    const progressPercent = (progressMeters / this.splitInterval) * 100;

    return {
      currentSplitNumber: currentKm + 1,
      progressMeters,
      progressPercent,
    };
  }

  /**
   * Get split statistics and analysis
   */
  getStatistics(): SplitStatistics | null {
    if (this.splits.length === 0) {
      return null;
    }

    // Calculate average pace
    const totalSplitTime = this.splits.reduce((sum, split) => sum + split.splitTime, 0);
    const averagePace = totalSplitTime / this.splits.length;

    // Find fastest and slowest splits
    let fastestSplit = this.splits[0];
    let slowestSplit = this.splits[0];

    for (const split of this.splits) {
      if (split.pace < fastestSplit.pace) {
        fastestSplit = split;
      }
      if (split.pace > slowestSplit.pace) {
        slowestSplit = split;
      }
    }

    // Check for negative splits (second half faster than first half)
    let isNegativeSplit = false;
    if (this.splits.length >= 4) {
      const midpoint = Math.floor(this.splits.length / 2);
      const firstHalfAvg = this.calculateAveragePace(this.splits.slice(0, midpoint));
      const secondHalfAvg = this.calculateAveragePace(this.splits.slice(midpoint));
      isNegativeSplit = secondHalfAvg < firstHalfAvg;
    }

    // Calculate consistency based on pace variance
    const paceVariance = this.calculateVariance(this.splits.map(s => s.pace));
    const consistency = this.categorizeConsistency(paceVariance);

    return {
      averagePace,
      fastestSplit,
      slowestSplit,
      isNegativeSplit,
      consistency,
    };
  }

  /**
   * Calculate average pace for a set of splits
   */
  private calculateAveragePace(splits: Split[]): number {
    if (splits.length === 0) return 0;
    const total = splits.reduce((sum, split) => sum + split.pace, 0);
    return total / splits.length;
  }

  /**
   * Calculate variance for consistency analysis
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Categorize consistency based on pace variance
   */
  private categorizeConsistency(variance: number): 'excellent' | 'good' | 'variable' {
    // Variance thresholds (in seconds squared)
    // Less than 100 = very consistent (within 10 seconds per km)
    // Less than 400 = moderately consistent (within 20 seconds per km)
    // More = variable pacing
    if (variance < 100) return 'excellent';
    if (variance < 400) return 'good';
    return 'variable';
  }

  /**
   * Format split time for display (M:SS)
   */
  formatSplitTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format pace for display (M:SS)
   */
  formatPace(paceSeconds: number): string {
    return this.formatSplitTime(paceSeconds);
  }

  /**
   * Compare split pace to average (for color coding)
   * Returns: 'faster', 'slower', or 'average'
   */
  compareSplitToAverage(split: Split): 'faster' | 'slower' | 'average' {
    const stats = this.getStatistics();
    if (!stats) return 'average';

    const diff = split.pace - stats.averagePace;
    const threshold = 5; // 5 seconds per km difference

    if (diff < -threshold) return 'faster';
    if (diff > threshold) return 'slower';
    return 'average';
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.splits = [];
    this.lastSplitDistance = 0;
    this.startTime = 0;
    this.pausedDuration = 0;
  }

  /**
   * Get split count
   */
  getSplitCount(): number {
    return this.splits.length;
  }
}

export const splitTrackingService = new SplitTrackingService();
