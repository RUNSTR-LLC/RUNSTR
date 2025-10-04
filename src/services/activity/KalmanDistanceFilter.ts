/**
 * KalmanDistanceFilter - 1D Kalman filter for smooth GPS distance estimation
 *
 * Provides optimal distance estimation by combining:
 * - GPS measurements (with accuracy-based uncertainty)
 * - Motion model (constant velocity assumption)
 * - Recursive state estimation
 *
 * Benefits:
 * - Smoother distance updates than raw GPS
 * - Better noise reduction than simple averaging
 * - Predictive capability during GPS fluctuations
 * - Adaptive filtering based on GPS quality
 */

export interface KalmanFilterState {
  distance: number;        // Estimated distance (meters)
  velocity: number;        // Estimated velocity (meters/second)
  estimateError: number;   // Uncertainty in distance estimate
  velocityError: number;   // Uncertainty in velocity estimate
  lastUpdateTime: number;  // Timestamp of last update (ms)
}

export interface KalmanMeasurement {
  distance: number;        // Measured distance increment (meters)
  timeDelta: number;       // Time since last measurement (seconds)
  accuracy: number;        // GPS accuracy (meters) - used as measurement noise
  confidence: number;      // Confidence score (0-1) from validator
}

export interface KalmanFilterConfig {
  processNoise: number;           // How much we trust our motion model (lower = trust more)
  initialEstimateError: number;   // Initial uncertainty in distance
  initialVelocityError: number;   // Initial uncertainty in velocity
  minMeasurementNoise: number;    // Minimum measurement uncertainty
  maxMeasurementNoise: number;    // Maximum measurement uncertainty
}

const DEFAULT_CONFIG: KalmanFilterConfig = {
  processNoise: 0.1,              // Small process noise = trust constant velocity model
  initialEstimateError: 5.0,      // Start with 5m uncertainty in distance
  initialVelocityError: 1.0,      // Start with 1 m/s uncertainty in velocity
  minMeasurementNoise: 2.0,       // Even "perfect" GPS has 2m noise
  maxMeasurementNoise: 50.0,      // Cap measurement noise at 50m
};

/**
 * 1D Kalman Filter for Distance Tracking
 *
 * State vector: [distance, velocity]
 * Measurement: distance increment
 *
 * Prediction step: distance(t+1) = distance(t) + velocity(t) * dt
 * Update step: Combine prediction with GPS measurement using optimal Kalman gain
 */
export class KalmanDistanceFilter {
  private state: KalmanFilterState;
  private config: KalmanFilterConfig;
  private isInitialized: boolean = false;

  constructor(config: Partial<KalmanFilterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      distance: 0,
      velocity: 0,
      estimateError: this.config.initialEstimateError,
      velocityError: this.config.initialVelocityError,
      lastUpdateTime: Date.now(),
    };
  }

  /**
   * Initialize or reset the filter
   */
  reset(): void {
    this.state = {
      distance: 0,
      velocity: 0,
      estimateError: this.config.initialEstimateError,
      velocityError: this.config.initialVelocityError,
      lastUpdateTime: Date.now(),
    };
    this.isInitialized = false;
  }

  /**
   * Update filter with new GPS measurement
   * Returns smoothed distance estimate
   */
  update(measurement: KalmanMeasurement): KalmanFilterState {
    const now = Date.now();
    const dt = measurement.timeDelta;

    // First measurement - initialize state
    if (!this.isInitialized) {
      this.state.distance = measurement.distance;
      this.state.velocity = measurement.distance / Math.max(dt, 0.1); // Avoid division by zero
      this.state.lastUpdateTime = now;
      this.isInitialized = true;
      console.log(`🔵 Kalman filter initialized: distance=${measurement.distance.toFixed(1)}m, velocity=${this.state.velocity.toFixed(2)}m/s`);
      return { ...this.state };
    }

    // === PREDICTION STEP ===
    // Predict state based on constant velocity model
    const predictedDistance = this.state.distance + this.state.velocity * dt;
    const predictedVelocity = this.state.velocity; // Constant velocity assumption

    // Predict error covariance
    // Error grows over time due to process noise
    const predictedDistanceError = this.state.estimateError + this.config.processNoise * dt;
    const predictedVelocityError = this.state.velocityError + this.config.processNoise * dt;

    // === UPDATE STEP ===
    // Calculate measurement noise based on GPS accuracy and confidence
    const baseNoise = Math.max(
      this.config.minMeasurementNoise,
      Math.min(this.config.maxMeasurementNoise, measurement.accuracy)
    );
    // Reduce trust in measurement if confidence is low
    const measurementNoise = baseNoise / Math.max(measurement.confidence, 0.1);

    // Calculate Kalman gain (how much to trust the measurement vs prediction)
    // K = predicted_error / (predicted_error + measurement_noise)
    // K close to 1 = trust measurement more
    // K close to 0 = trust prediction more
    const kalmanGain = predictedDistanceError / (predictedDistanceError + measurementNoise);

    // Update distance estimate
    // new_estimate = prediction + K * (measurement - prediction)
    const cumulativeMeasuredDistance = this.state.distance + measurement.distance;
    const innovation = cumulativeMeasuredDistance - predictedDistance;
    const updatedDistance = predictedDistance + kalmanGain * innovation;

    // Update velocity estimate (based on measurement)
    const measuredVelocity = measurement.distance / dt;
    const velocityGain = predictedVelocityError / (predictedVelocityError + measurementNoise);
    const updatedVelocity = predictedVelocity + velocityGain * (measuredVelocity - predictedVelocity);

    // Update error covariance
    // error = (1 - K) * predicted_error
    const updatedDistanceError = (1 - kalmanGain) * predictedDistanceError;
    const updatedVelocityError = (1 - velocityGain) * predictedVelocityError;

    // Update state
    this.state = {
      distance: updatedDistance,
      velocity: updatedVelocity,
      estimateError: updatedDistanceError,
      velocityError: updatedVelocityError,
      lastUpdateTime: now,
    };

    // Debug logging for significant corrections
    if (Math.abs(innovation) > 5) {
      console.log(`🔵 Kalman correction: innovation=${innovation.toFixed(1)}m, gain=${kalmanGain.toFixed(3)}, ` +
        `prediction=${predictedDistance.toFixed(1)}m, measurement=${cumulativeMeasuredDistance.toFixed(1)}m, ` +
        `updated=${updatedDistance.toFixed(1)}m`);
    }

    return { ...this.state };
  }

  /**
   * Get current filtered distance estimate
   */
  getDistance(): number {
    return this.state.distance;
  }

  /**
   * Get current velocity estimate
   */
  getVelocity(): number {
    return this.state.velocity;
  }

  /**
   * Get current uncertainty in distance estimate
   */
  getUncertainty(): number {
    return this.state.estimateError;
  }

  /**
   * Get complete filter state
   */
  getState(): KalmanFilterState {
    return { ...this.state };
  }

  /**
   * Predict future distance based on current state
   * Useful for smooth UI updates between GPS measurements
   */
  predict(timeDeltaSeconds: number): number {
    return this.state.distance + this.state.velocity * timeDeltaSeconds;
  }

  /**
   * Check if filter has been initialized with at least one measurement
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get confidence in current estimate (0-1)
   * Based on estimate error - lower error = higher confidence
   */
  getConfidence(): number {
    // Map error to confidence
    // error <= 2m -> confidence = 1.0
    // error >= 20m -> confidence = 0.0
    const maxError = 20;
    const confidence = Math.max(0, Math.min(1, 1 - this.state.estimateError / maxError));
    return confidence;
  }

  /**
   * Update process noise (how much we trust the motion model)
   * Can be adjusted based on activity type or conditions
   */
  setProcessNoise(noise: number): void {
    this.config.processNoise = Math.max(0.01, Math.min(1.0, noise));
  }
}
