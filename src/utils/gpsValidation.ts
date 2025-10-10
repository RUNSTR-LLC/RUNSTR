/**
 * GPS Validation Utilities - Position filtering for activity tracking
 *
 * Based on proven reference implementation from runstr-github.
 * Filters out bad GPS points before they corrupt distance calculations.
 *
 * Validation criteria:
 * - Accuracy threshold: Rejects points with >20m accuracy
 * - Speed threshold: Rejects unrealistic speeds (>18 m/s for cycling)
 * - Distance threshold: Rejects micro-movements (<0.5m) and jumps (>50m)
 * - Time threshold: Rejects duplicate points (<0.2s apart)
 *
 * Reference: /reference/runstr-github/src/utils/runCalculations.js
 */

import type { LocationPoint } from '../services/activity/SimpleLocationTrackingService';

// Constants from proven reference implementation
export const GPS_VALIDATION_CONSTANTS = {
  MINIMUM_ACCURACY: 20,              // meters - reject poor GPS signals
  SPEED_THRESHOLD: 18,               // m/s (~65 km/h) - for cycling support
  MINIMUM_DISTANCE: 0.5,             // meters - filter GPS jitter
  MAXIMUM_DISTANCE_PER_POINT: 50,    // meters - reject GPS jumps
  MINIMUM_TIME_DIFF: 0.2,            // seconds - prevent duplicate points
} as const;

/**
 * Calculate distance between two points using Haversine formula
 * @param p1 First location point
 * @param p2 Second location point
 * @returns Distance in meters
 */
export function calculateDistance(p1: LocationPoint, p2: LocationPoint): number {
  // Input validation
  if (!p1 || !p2 ||
      typeof p1.latitude !== 'number' ||
      typeof p1.longitude !== 'number' ||
      typeof p2.latitude !== 'number' ||
      typeof p2.longitude !== 'number') {
    console.warn('[GPS] Invalid coordinates provided to calculateDistance');
    return 0;
  }

  // Check for identical points
  if (p1.latitude === p2.latitude && p1.longitude === p2.longitude) {
    return 0;
  }

  try {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (p1.latitude * Math.PI) / 180;
    const φ2 = (p2.latitude * Math.PI) / 180;
    const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;

    // Sanity check on the result
    if (isNaN(distance) || !isFinite(distance)) {
      console.warn('[GPS] Invalid distance calculation result');
      return 0;
    }

    return distance;
  } catch (error) {
    console.error('[GPS] Error calculating distance:', error);
    return 0;
  }
}

/**
 * Filter location data for accuracy and validity
 * Rejects points that fail validation criteria
 *
 * @param location Current GPS point to validate
 * @param lastLocation Previous GPS point (optional for first point)
 * @returns true if point should be accepted, false if rejected
 */
export function filterLocation(
  location: LocationPoint,
  lastLocation: LocationPoint | null
): boolean {
  if (!location) {
    console.warn('[GPS] Invalid location data provided to filterLocation');
    return false;
  }

  // Check for minimum accuracy (reject poor GPS signals)
  if (location.accuracy && location.accuracy > GPS_VALIDATION_CONSTANTS.MINIMUM_ACCURACY) {
    console.warn(
      `[GPS] Rejected: poor accuracy (${location.accuracy.toFixed(1)}m > ${GPS_VALIDATION_CONSTANTS.MINIMUM_ACCURACY}m)`
    );
    return false;
  }

  // Always accept first point
  if (!lastLocation) {
    return true;
  }

  // Calculate time difference
  const timeDiff = (location.timestamp - lastLocation.timestamp) / 1000; // seconds

  // Reject points that are too close in time (likely duplicates)
  if (timeDiff < GPS_VALIDATION_CONSTANTS.MINIMUM_TIME_DIFF) {
    console.log(`[GPS] Rejected: too soon (${timeDiff.toFixed(2)}s < ${GPS_VALIDATION_CONSTANTS.MINIMUM_TIME_DIFF}s)`);
    return false;
  }

  // Calculate distance and speed between points
  const distance = calculateDistance(lastLocation, location);
  const speed = distance / timeDiff; // m/s

  // Reject unrealistic speeds (GPS jumps)
  if (speed > GPS_VALIDATION_CONSTANTS.SPEED_THRESHOLD) {
    console.warn(
      `[GPS] Rejected: unrealistic speed (${speed.toFixed(1)} m/s > ${GPS_VALIDATION_CONSTANTS.SPEED_THRESHOLD} m/s, distance=${distance.toFixed(1)}m in ${timeDiff.toFixed(1)}s)`
    );
    return false;
  }

  // Reject micro-movements (GPS jitter when stationary)
  if (distance < GPS_VALIDATION_CONSTANTS.MINIMUM_DISTANCE) {
    return false; // Don't log - this is normal when stationary
  }

  // Reject large GPS jumps (teleportation)
  if (distance > GPS_VALIDATION_CONSTANTS.MAXIMUM_DISTANCE_PER_POINT) {
    console.warn(
      `[GPS] Rejected: jump too large (${distance.toFixed(1)}m > ${GPS_VALIDATION_CONSTANTS.MAXIMUM_DISTANCE_PER_POINT}m)`
    );
    return false;
  }

  return true;
}

/**
 * Validate a segment between two points
 * Used for additional validation during stats calculation
 *
 * @param distance Segment distance in meters
 * @param timeDiff Time difference in seconds
 * @param accuracy GPS accuracy in meters (optional)
 * @returns true if segment is valid, false otherwise
 */
export function validateSegment(
  distance: number,
  timeDiff: number,
  accuracy?: number
): boolean {
  // Check accuracy if provided
  if (accuracy !== undefined && accuracy > GPS_VALIDATION_CONSTANTS.MINIMUM_ACCURACY) {
    return false;
  }

  // Check time difference
  if (timeDiff < GPS_VALIDATION_CONSTANTS.MINIMUM_TIME_DIFF) {
    return false;
  }

  // Check distance bounds
  if (distance < GPS_VALIDATION_CONSTANTS.MINIMUM_DISTANCE ||
      distance > GPS_VALIDATION_CONSTANTS.MAXIMUM_DISTANCE_PER_POINT) {
    return false;
  }

  // Check speed
  const speed = timeDiff > 0 ? distance / timeDiff : 0;
  if (speed > GPS_VALIDATION_CONSTANTS.SPEED_THRESHOLD) {
    return false;
  }

  return true;
}

/**
 * Calculate speed between two points
 * @param p1 First location point
 * @param p2 Second location point
 * @returns Speed in m/s, or 0 if invalid
 */
export function calculateSpeed(p1: LocationPoint, p2: LocationPoint): number {
  const distance = calculateDistance(p1, p2);
  const timeDiff = (p2.timestamp - p1.timestamp) / 1000; // seconds

  if (timeDiff <= 0) {
    return 0;
  }

  return distance / timeDiff;
}

/**
 * Get validation statistics (for debugging)
 * Returns a summary of validation thresholds
 */
export function getValidationStats(): {
  thresholds: typeof GPS_VALIDATION_CONSTANTS;
  maxSpeedKmh: number;
  maxSpeedMph: number;
} {
  return {
    thresholds: GPS_VALIDATION_CONSTANTS,
    maxSpeedKmh: GPS_VALIDATION_CONSTANTS.SPEED_THRESHOLD * 3.6,
    maxSpeedMph: GPS_VALIDATION_CONSTANTS.SPEED_THRESHOLD * 2.23694,
  };
}
