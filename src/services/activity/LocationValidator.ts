/**
 * LocationValidator - GPS data validation and quality control
 * Filters out invalid data, detects anomalies, and ensures data quality
 */

import { Platform } from 'react-native';
import { LocationPoint } from './LocationTrackingService';

export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-1 confidence score
  reason?: string;
  correctedPoint?: LocationPoint;
}

export interface LocationValidationConfig {
  maxSpeedMps: number; // Maximum speed in meters per second
  maxAccelerationMps2: number; // Maximum acceleration
  maxJumpDistance: number; // Maximum teleportation distance
  minTimeBetweenPoints: number; // Minimum milliseconds between points
  maxTimeBetweenPoints: number; // Maximum milliseconds before considered stale
}

const ACTIVITY_CONFIGS: Record<string, LocationValidationConfig> = {
  running: {
    maxSpeedMps: 12, // ~43 km/h (world record pace)
    maxAccelerationMps2: 4, // Reasonable human acceleration
    maxJumpDistance: 100, // 100m max jump
    minTimeBetweenPoints: 500, // 0.5 seconds
    maxTimeBetweenPoints: 30000, // 30 seconds
  },
  walking: {
    maxSpeedMps: 3, // ~11 km/h (fast walk)
    maxAccelerationMps2: 2,
    maxJumpDistance: 50,
    minTimeBetweenPoints: 1000,
    maxTimeBetweenPoints: 60000,
  },
  cycling: {
    maxSpeedMps: 25, // ~90 km/h (professional cyclist sprint)
    maxAccelerationMps2: 5,
    maxJumpDistance: 200,
    minTimeBetweenPoints: 500,
    maxTimeBetweenPoints: 30000,
  },
};

export class LocationValidator {
  private activityType: 'running' | 'walking' | 'cycling';
  private config: LocationValidationConfig;
  private lastValidPoint: LocationPoint | null = null;
  private velocityHistory: number[] = [];
  private readonly VELOCITY_HISTORY_SIZE = 5;
  private lastValidTimestamp: number = Date.now();
  private consecutiveInvalidPoints: number = 0;
  // Hysteresis for Android: require multiple consecutive valid points
  private consecutiveValidPoints: number = 0;
  private readonly ANDROID_HYSTERESIS_THRESHOLD = 2;

  constructor(activityType: 'running' | 'walking' | 'cycling') {
    this.activityType = activityType;
    this.config = ACTIVITY_CONFIGS[activityType];
  }

  /**
   * Validate a new location point
   * @param point - The new location point to validate
   * @param previousPoint - The previous point for comparison
   * @param wasPausedResume - Whether this is the first point after resuming from pause
   */
  validatePoint(
    point: LocationPoint,
    previousPoint?: LocationPoint,
    wasPausedResume: boolean = false
  ): ValidationResult {
    // Basic accuracy check
    if (!this.isAccuracyAcceptable(point)) {
      return {
        isValid: false,
        confidence: 0,
        reason: 'Poor GPS accuracy',
      };
    }

    // First point is always valid if accuracy is good
    if (!previousPoint && !this.lastValidPoint) {
      this.lastValidPoint = point;
      this.lastValidTimestamp = Date.now();
      this.consecutiveInvalidPoints = 0;
      return {
        isValid: true,
        confidence: this.calculateConfidence(point),
      };
    }

    const referencePoint = previousPoint || this.lastValidPoint;
    if (!referencePoint) {
      this.lastValidPoint = point;
      return {
        isValid: true,
        confidence: this.calculateConfidence(point),
      };
    }

    // Transport detection: Check if user likely took transport during pause
    if (wasPausedResume) {
      const distance = this.calculateDistance(referencePoint, point);
      const timeDeltaMs = point.timestamp - referencePoint.timestamp;

      // If moved more than 200m during pause, likely transported
      // Allow up to 500m if pause was very long (>10 minutes) as user might have walked
      const maxAllowedDistance = timeDeltaMs > 600000 ? 500 : 200;

      if (distance > maxAllowedDistance) {
        console.log(`Transport detected: ${distance.toFixed(0)}m jump after pause (max allowed: ${maxAllowedDistance}m)`);
        return {
          isValid: false,
          confidence: 0,
          reason: `Transport detected - ${distance.toFixed(0)}m jump after pause`,
        };
      }
    }

    // Check time consistency
    const timeDelta = point.timestamp - referencePoint.timestamp;
    if (timeDelta < this.config.minTimeBetweenPoints) {
      return {
        isValid: false,
        confidence: 0,
        reason: 'Points too close in time',
      };
    }

    if (timeDelta > this.config.maxTimeBetweenPoints) {
      // Too much time passed, accept but with low confidence
      this.lastValidPoint = point;
      this.velocityHistory = []; // Reset velocity history
      return {
        isValid: true,
        confidence: 0.5,
        reason: 'Large time gap',
      };
    }

    // Calculate distance and speed
    const distance = this.calculateDistance(referencePoint, point);
    const speed = distance / (timeDelta / 1000); // m/s

    // Android: Use simplified validation with hysteresis to reduce GPS jitter
    if (Platform.OS === 'android') {
      // Stricter minimum distance: 1.0m instead of 0.5m to reduce oscillations
      // This filters out GPS coordinate jitter that causes distance to bounce
      if (distance < 1.0) {
        this.consecutiveValidPoints = 0; // Reset hysteresis counter
        console.log(`⚠️ [ANDROID] GPS jitter filtered: distance=${distance.toFixed(2)}m < 1.0m`);
        return {
          isValid: false,
          confidence: 0,
          reason: 'GPS jitter (< 1.0m)',
        };
      }

      // Only check for extreme teleportation (2x more lenient than iOS)
      const androidMaxJump = this.config.maxJumpDistance * 2;
      if (distance > androidMaxJump) {
        this.consecutiveValidPoints = 0; // Reset hysteresis counter
        console.log(`❌ [ANDROID] Extreme teleportation: ${distance.toFixed(0)}m > ${androidMaxJump}m`);
        return {
          isValid: false,
          confidence: 0,
          reason: `Extreme teleportation: ${distance.toFixed(0)}m jump`,
        };
      }

      // Only check for extreme speeds (2x more lenient than iOS)
      const androidMaxSpeed = this.config.maxSpeedMps * 2;
      if (speed > androidMaxSpeed) {
        this.consecutiveValidPoints = 0; // Reset hysteresis counter
        console.log(`❌ [ANDROID] Extreme speed: ${(speed * 3.6).toFixed(1)} km/h > ${(androidMaxSpeed * 3.6).toFixed(1)} km/h`);
        return {
          isValid: false,
          confidence: 0,
          reason: `Extreme speed: ${(speed * 3.6).toFixed(1)} km/h`,
        };
      }

      // Hysteresis: require 2 consecutive valid points before accepting
      // This prevents single spurious GPS points from causing distance jumps
      this.consecutiveValidPoints++;

      if (this.consecutiveValidPoints < this.ANDROID_HYSTERESIS_THRESHOLD) {
        console.log(`🔄 [ANDROID] Hysteresis buffering: ${this.consecutiveValidPoints}/${this.ANDROID_HYSTERESIS_THRESHOLD} valid points`);
        return {
          isValid: false,
          confidence: 0.5, // Partially valid
          reason: `Hysteresis: ${this.consecutiveValidPoints}/${this.ANDROID_HYSTERESIS_THRESHOLD} valid points`,
        };
      }

      // Skip acceleration checks on Android - GPS is too noisy
      console.log(`✅ [ANDROID] Point passed validation: distance=${distance.toFixed(1)}m, speed=${(speed * 3.6).toFixed(1)}km/h, consecutive=${this.consecutiveValidPoints}`);
      this.lastValidPoint = point;
      return {
        isValid: true,
        confidence: this.calculateConfidence(point, speed),
      };
    }

    // iOS: Use strict validation
    // Check for teleportation
    if (distance > this.config.maxJumpDistance) {
      return {
        isValid: false,
        confidence: 0,
        reason: `Teleportation detected: ${distance.toFixed(0)}m jump`,
      };
    }

    // Check speed limits
    if (speed > this.config.maxSpeedMps) {
      return {
        isValid: false,
        confidence: 0,
        reason: `Impossible speed: ${(speed * 3.6).toFixed(1)} km/h`,
      };
    }

    // Check acceleration if we have velocity history
    if (this.velocityHistory.length > 0) {
      const lastSpeed = this.velocityHistory[this.velocityHistory.length - 1];
      const acceleration = Math.abs(speed - lastSpeed) / (timeDelta / 1000);

      if (acceleration > this.config.maxAccelerationMps2) {
        // Smooth the point instead of rejecting
        const smoothedSpeed = this.smoothSpeed(speed);
        const correctedDistance = smoothedSpeed * (timeDelta / 1000);
        const correctedPoint = this.interpolatePoint(
          referencePoint,
          point,
          correctedDistance / distance
        );

        return {
          isValid: true,
          confidence: 0.7,
          reason: 'High acceleration - smoothed',
          correctedPoint,
        };
      }
    }

    // Update velocity history
    this.updateVelocityHistory(speed);

    // Check altitude consistency if available
    const altitudeResult = this.validateAltitude(point, referencePoint);
    if (!altitudeResult.isValid) {
      return altitudeResult;
    }

    // Point is valid
    this.lastValidPoint = point;
    return {
      isValid: true,
      confidence: this.calculateConfidence(point, speed),
    };
  }

  /**
   * Get dynamic accuracy threshold based on conditions
   */
  private getAccuracyThreshold(): number {
    // Base thresholds: Platform-aware (Android GPS typically less accurate than iOS)
    // iOS: 50m for running/walking, 75m for cycling
    // Android: 100m for running/walking, 150m for cycling (2x more lenient)
    const iosBaseThreshold = this.activityType === 'cycling' ? 75 : 50;
    const androidBaseThreshold = this.activityType === 'cycling' ? 150 : 100;
    const baseThreshold = Platform.OS === 'android' ? androidBaseThreshold : iosBaseThreshold;

    console.log(`📍 [${Platform.OS.toUpperCase()}] Base accuracy threshold: ${baseThreshold}m for ${this.activityType}`);

    // Check if we've had no valid points recently (signal degradation)
    const timeSinceLastValid = Date.now() - this.lastValidTimestamp;

    // Progressive relaxation based on time without valid points
    if (timeSinceLastValid > 60000) { // 60 seconds - very degraded signal
      const relaxedThreshold = Math.min(baseThreshold * 2, Platform.OS === 'android' ? 200 : 100);
      console.log(`📍 Signal degraded (60s+), relaxing threshold to ${relaxedThreshold}m`);
      return relaxedThreshold;
    } else if (timeSinceLastValid > 30000) { // 30 seconds - degraded signal
      const relaxedThreshold = Math.min(baseThreshold * 1.5, Platform.OS === 'android' ? 150 : 85);
      console.log(`📍 Signal degraded (30s+), relaxing threshold to ${relaxedThreshold}m`);
      return relaxedThreshold;
    } else if (this.consecutiveInvalidPoints > 5) { // Multiple rejections
      const relaxedThreshold = Math.min(baseThreshold * 1.3, Platform.OS === 'android' ? 130 : 75);
      console.log(`📍 Multiple rejections (${this.consecutiveInvalidPoints}), relaxing threshold to ${relaxedThreshold}m`);
      return relaxedThreshold;
    }

    return baseThreshold;
  }

  /**
   * Check if accuracy is acceptable
   */
  private isAccuracyAcceptable(point: LocationPoint): boolean {
    if (!point.accuracy) return false;

    const threshold = this.getAccuracyThreshold();
    const isAcceptable = point.accuracy <= threshold;

    // Track consecutive invalid points for threshold adjustment
    if (!isAcceptable) {
      this.consecutiveInvalidPoints++;
      if (Platform.OS === 'android') {
        console.log(`📍 [ANDROID] GPS accuracy ${point.accuracy.toFixed(1)}m exceeds threshold ${threshold}m (consecutive invalid: ${this.consecutiveInvalidPoints})`);
      } else {
        console.log(`GPS accuracy ${point.accuracy.toFixed(1)}m exceeds threshold ${threshold}m (consecutive invalid: ${this.consecutiveInvalidPoints})`);
      }
    } else {
      this.consecutiveInvalidPoints = 0;
      this.lastValidTimestamp = Date.now();
      if (Platform.OS === 'android') {
        console.log(`✅ [ANDROID] GPS accuracy acceptable: ${point.accuracy.toFixed(1)}m <= ${threshold}m`);
      }
    }

    return isAcceptable;
  }

  /**
   * Calculate confidence score for a point
   */
  private calculateConfidence(point: LocationPoint, speed?: number): number {
    let confidence = 1.0;

    // Reduce confidence based on accuracy
    if (point.accuracy) {
      if (point.accuracy > 10) confidence *= 0.9;
      if (point.accuracy > 15) confidence *= 0.8;
      if (point.accuracy > 20) confidence *= 0.7;
    }

    // Reduce confidence for high speeds
    if (speed !== undefined) {
      const speedRatio = speed / this.config.maxSpeedMps;
      if (speedRatio > 0.8) confidence *= 0.9;
      if (speedRatio > 0.9) confidence *= 0.8;
    }

    // Reduce confidence if no altitude data
    if (!point.altitude) confidence *= 0.95;

    return Math.max(0.1, confidence);
  }

  /**
   * Validate altitude changes
   */
  private validateAltitude(
    point: LocationPoint,
    previousPoint: LocationPoint
  ): ValidationResult {
    if (!point.altitude || !previousPoint.altitude) {
      return { isValid: true, confidence: 1 };
    }

    const altitudeChange = Math.abs(point.altitude - previousPoint.altitude);
    const timeDelta = (point.timestamp - previousPoint.timestamp) / 1000;
    const verticalSpeed = altitudeChange / timeDelta;

    // Max vertical speed (m/s) - very generous for edge cases
    const maxVerticalSpeed = this.activityType === 'cycling' ? 10 : 5;

    if (verticalSpeed > maxVerticalSpeed) {
      return {
        isValid: false,
        confidence: 0,
        reason: `Impossible altitude change: ${verticalSpeed.toFixed(1)} m/s`,
      };
    }

    return { isValid: true, confidence: 1 };
  }

  /**
   * Update velocity history for smoothing
   */
  private updateVelocityHistory(speed: number) {
    this.velocityHistory.push(speed);
    if (this.velocityHistory.length > this.VELOCITY_HISTORY_SIZE) {
      this.velocityHistory.shift();
    }
  }

  /**
   * Smooth speed using velocity history
   */
  private smoothSpeed(currentSpeed: number): number {
    if (this.velocityHistory.length === 0) {
      return currentSpeed;
    }

    const weights = [0.1, 0.15, 0.2, 0.25, 0.3]; // Recent speeds weighted more
    let weightedSum = currentSpeed * 0.3;
    let totalWeight = 0.3;

    for (let i = 0; i < this.velocityHistory.length; i++) {
      const weight = weights[i] || 0.1;
      weightedSum += this.velocityHistory[i] * weight;
      totalWeight += weight;
    }

    return weightedSum / totalWeight;
  }

  /**
   * Interpolate between two points
   */
  private interpolatePoint(
    start: LocationPoint,
    end: LocationPoint,
    ratio: number
  ): LocationPoint {
    return {
      latitude: start.latitude + (end.latitude - start.latitude) * ratio,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio,
      altitude: start.altitude && end.altitude
        ? start.altitude + (end.altitude - start.altitude) * ratio
        : undefined,
      timestamp: start.timestamp + (end.timestamp - start.timestamp) * ratio,
      accuracy: end.accuracy,
      speed: end.speed,
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(point1: LocationPoint, point2: LocationPoint): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Reset validator state
   */
  reset() {
    this.lastValidPoint = null;
    this.velocityHistory = [];
    this.lastValidTimestamp = Date.now();
    this.consecutiveInvalidPoints = 0;
    this.consecutiveValidPoints = 0;
  }
}