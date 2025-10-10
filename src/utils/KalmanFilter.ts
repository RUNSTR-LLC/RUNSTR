/**
 * KalmanFilter - GPS coordinate smoothing for activity tracking
 *
 * Based on proven reference implementation from runstr-github.
 * Reduces GPS noise while preserving real movement patterns.
 *
 * Key features:
 * - Smooths coordinates to reduce jitter when stationary
 * - Speed-based process noise adjustment
 * - Acceleration validation (max 2.5 m/s²)
 * - Maximum speed limits (18 m/s for cycling support)
 * - Variance tracking for confidence estimation
 *
 * Reference: /reference/runstr-github/src/utils/kalmanFilter.js
 */

export interface FilteredPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export class KalmanFilter {
  // State estimate
  private lat: number = 0;
  private lng: number = 0;
  private variance: number = 100; // Initial estimate of position variance
  private lastTimestamp: number = 0;
  private lastSpeed: number = 0;
  private speedVariance: number = 1; // Initial speed variance

  // Kalman filter parameters - optimized for running/cycling
  private readonly Q = 0.0001; // Process noise - base value
  private readonly R_SCALE = 0.025; // Measurement noise scale
  private readonly MAX_SPEED = 18; // Maximum expected speed in m/s (~65 km/h for cycling)
  private readonly MAX_ACCELERATION = 2.5; // Maximum expected acceleration in m/s²
  private readonly MIN_VARIANCE = 10; // Minimum position variance

  /**
   * Update the filter with a new GPS measurement
   * @param lat Latitude in degrees
   * @param lng Longitude in degrees
   * @param accuracy GPS accuracy in meters
   * @param timestamp Timestamp in milliseconds
   * @returns Filtered position with smoothed coordinates
   */
  update(lat: number, lng: number, accuracy: number, timestamp: number = Date.now()): FilteredPosition {
    // Input validation
    if (typeof lat !== 'number' || typeof lng !== 'number' || typeof accuracy !== 'number') {
      console.warn('[KalmanFilter] Invalid input - returning raw values');
      return { lat, lng, accuracy };
    }

    // Initialize filter with first measurement
    if (this.lat === 0 && this.lng === 0) {
      this.lat = lat;
      this.lng = lng;
      this.variance = Math.max(accuracy * accuracy, this.MIN_VARIANCE);
      this.lastTimestamp = timestamp;
      return { lat, lng, accuracy };
    }

    // Calculate time difference (ensure positive, minimum 0.001s)
    const timeDiff = Math.max((timestamp - this.lastTimestamp) / 1000, 0.001);

    // Calculate current speed and distance
    const distance = this.calculateDistance(lat, lng);
    const currentSpeed = distance / timeDiff;

    // Check for reasonable acceleration
    const acceleration = Math.abs(currentSpeed - this.lastSpeed) / timeDiff;
    const isReasonableAcceleration = acceleration <= this.MAX_ACCELERATION;

    // Predict step with dynamic process noise
    const speedFactor = Math.min(currentSpeed / this.MAX_SPEED, 1);
    const accelerationFactor = isReasonableAcceleration ? 1 : 0.5;
    const adjustedQ = this.Q * (1 + speedFactor * 4) * accelerationFactor;

    // Update position variance
    this.variance += adjustedQ * timeDiff * (1 + this.speedVariance);

    // Update speed variance
    this.speedVariance = Math.max(
      0.1,
      this.speedVariance + (isReasonableAcceleration ? -0.1 : 0.2)
    );

    // Calculate measurement noise
    const accuracyFactor = Math.max(1, accuracy / 10);
    const speedNoiseFactor = Math.min(1 + currentSpeed / this.MAX_SPEED, 2);
    const R = Math.max(
      accuracy * accuracy * this.R_SCALE * accuracyFactor * speedNoiseFactor,
      1
    );

    // Calculate Kalman gain with limits
    const K = this.variance / (this.variance + R);
    const maxK = Math.min(0.5, 1 / (accuracyFactor * speedNoiseFactor));
    const limitedK = Math.min(K, maxK);

    // Calculate position updates with movement constraints
    const latDiff = lat - this.lat;
    const lngDiff = lng - this.lng;

    // Maximum allowed movement based on speed and acceleration
    const maxDistance = this.calculateMaxDistance(timeDiff, currentSpeed);
    const maxLatDiff = maxDistance / 111111; // Approximate degrees latitude
    const maxLngDiff = maxDistance / (111111 * Math.cos((this.lat * Math.PI) / 180));

    // Apply bounded updates
    const actualLatDiff = Math.abs(latDiff) > maxLatDiff
      ? maxLatDiff * Math.sign(latDiff)
      : latDiff;
    const actualLngDiff = Math.abs(lngDiff) > maxLngDiff
      ? maxLngDiff * Math.sign(lngDiff)
      : lngDiff;

    // Update state
    this.lat += limitedK * actualLatDiff;
    this.lng += limitedK * actualLngDiff;
    this.variance = Math.max((1 - limitedK) * this.variance, this.MIN_VARIANCE);
    this.lastTimestamp = timestamp;
    this.lastSpeed = isReasonableAcceleration ? currentSpeed : this.lastSpeed;

    return {
      lat: this.lat,
      lng: this.lng,
      accuracy: Math.sqrt(this.variance)
    };
  }

  /**
   * Calculate maximum allowed distance based on speed and acceleration
   */
  private calculateMaxDistance(timeDiff: number, currentSpeed: number): number {
    const maxSpeedIncrease = this.MAX_ACCELERATION * timeDiff;
    const maxPossibleSpeed = Math.min(
      this.MAX_SPEED,
      this.lastSpeed + maxSpeedIncrease
    );

    return Math.min(
      this.MAX_SPEED * timeDiff,
      (this.lastSpeed + maxPossibleSpeed) * 0.5 * timeDiff
    );
  }

  /**
   * Calculate distance to a new point in meters using Haversine formula
   */
  private calculateDistance(lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (this.lat * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - this.lat) * Math.PI) / 180;
    const Δλ = ((lng2 - this.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Reset the filter to initial state
   * Call this when starting a new tracking session
   */
  reset(): void {
    this.lat = 0;
    this.lng = 0;
    this.variance = 100;
    this.lastTimestamp = 0;
    this.lastSpeed = 0;
    this.speedVariance = 1;
  }

  /**
   * Get current filter state (for debugging)
   */
  getState(): {
    lat: number;
    lng: number;
    variance: number;
    lastSpeed: number;
  } {
    return {
      lat: this.lat,
      lng: this.lng,
      variance: this.variance,
      lastSpeed: this.lastSpeed
    };
  }
}
