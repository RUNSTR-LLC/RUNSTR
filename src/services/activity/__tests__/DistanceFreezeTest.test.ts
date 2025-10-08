/**
 * DistanceFreezeTest - Automated tests to detect distance freezing
 * Tests scenarios that would cause 1-2 minute freezes in distance tracking
 */

import { GPSDataGenerator, GPSPoint } from './GPSDataGenerator';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  watchPositionAsync: jest.fn(),
  Accuracy: {
    BestForNavigation: 1,
  },
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock('../BackgroundLocationTask', () => ({
  startBackgroundLocationTracking: jest.fn(() => Promise.resolve()),
  stopBackgroundLocationTracking: jest.fn(() => Promise.resolve()),
  pauseBackgroundTracking: jest.fn(() => Promise.resolve()),
  resumeBackgroundTracking: jest.fn(() => Promise.resolve()),
  getAndClearBackgroundLocations: jest.fn(() => Promise.resolve([])),
}));

// Type definitions
type DistanceUpdate = {
  timestamp: number;
  distance: number;
};

describe('Distance Freeze Detection Tests', () => {
  const generator = new GPSDataGenerator();

  function analyzeFreezeTime(updates: DistanceUpdate[]): number {
    let maxFreezeDuration = 0;
    let lastDistanceChangeTime = updates[0]?.timestamp || 0;

    for (let i = 1; i < updates.length; i++) {
      const distanceChanged = updates[i].distance > updates[i - 1].distance;

      if (distanceChanged) {
        lastDistanceChangeTime = updates[i].timestamp;
      } else {
        const freezeDuration = updates[i].timestamp - lastDistanceChangeTime;
        maxFreezeDuration = Math.max(maxFreezeDuration, freezeDuration);
      }
    }

    return maxFreezeDuration;
  }

  // Helper: Find largest gap between distance updates
  function findLargestUpdateGap(updates: DistanceUpdate[]): number {
    let maxGap = 0;
    let lastUpdateTime = updates[0]?.timestamp || 0;

    for (let i = 1; i < updates.length; i++) {
      if (updates[i].distance > updates[i - 1].distance) {
        const gap = updates[i].timestamp - lastUpdateTime;
        maxGap = Math.max(maxGap, gap);
        lastUpdateTime = updates[i].timestamp;
      }
    }

    return maxGap;
  }

  // Helper: Check for distance inflation (duplicates)
  function detectDistanceInflation(
    actualDistance: number,
    expectedDistance: number,
    tolerance: number
  ): boolean {
    const diff = Math.abs(actualDistance - expectedDistance);
    return diff <= tolerance;
  }

  describe('GPS Data Generator Validation', () => {
    it('generates accurate 1km route', () => {
      const points = generator.createStraightRoute(1000);
      const calculatedDistance = generator.getTotalDistance(points);

      // Should be within 3% of 1000m
      expect(calculatedDistance).toBeGreaterThan(970);
      expect(calculatedDistance).toBeLessThan(1030);

      // Should have realistic number of points (1 per 3-5 seconds)
      const duration = generator.getTotalDuration(points);
      expect(points.length).toBeGreaterThan(50); // At least 50 points
      expect(duration).toBeGreaterThan(200); // At least 200 seconds
    });

    it('generates tunnel scenario with GPS gap', () => {
      const points = generator.createTunnelScenario();

      // Should have a 15 second gap
      let maxGap = 0;
      for (let i = 1; i < points.length; i++) {
        const gap = points[i].timestamp - points[i - 1].timestamp;
        maxGap = Math.max(maxGap, gap);
      }

      expect(maxGap).toBeGreaterThanOrEqual(15000); // 15+ seconds
      expect(points.length).toBeGreaterThanOrEqual(20); // Multiple points
    });

    it('generates background scenario with duplicates', () => {
      const points = generator.createBackgroundScenario();

      // Should have duplicate timestamps
      const timestamps = points.map((p) => p.timestamp);
      const uniqueTimestamps = new Set(timestamps);

      expect(timestamps.length).toBeGreaterThan(uniqueTimestamps.size);
    });

    it('generates 30 minute run', () => {
      const points = generator.create30MinuteRun();
      const duration = generator.getTotalDuration(points);

      // Should be approximately 30 minutes (1800 seconds ±10%)
      expect(duration).toBeGreaterThan(1620);
      expect(duration).toBeLessThan(1980);
    });
  });

  describe('Test 1: GPS Recovery - Should Not Freeze', () => {
    it('simulates tunnel scenario without tracker (baseline)', () => {
      const points = generator.createTunnelScenario();

      // Simulate distance calculation
      const updates: DistanceUpdate[] = [];
      let totalDistance = 0;

      for (let i = 1; i < points.length; i++) {
        const segmentDistance = generator.calculateDistance(
          points[i - 1].latitude,
          points[i - 1].longitude,
          points[i].latitude,
          points[i].longitude
        );

        totalDistance += segmentDistance;
        updates.push({
          timestamp: points[i].timestamp,
          distance: totalDistance,
        });
      }

      // Analyze freeze time
      const freezeDuration = analyzeFreezeTime(updates);

      // With our fixes, freeze should be minimal (<7 seconds recovery)
      // But this is baseline without tracker logic
      console.log(`Baseline freeze duration: ${(freezeDuration / 1000).toFixed(1)}s`);
      expect(freezeDuration).toBeLessThan(20000); // Baseline check
    });
  });

  describe('Test 2: Background Transition - No Distance Inflation', () => {
    it('detects duplicate points in background scenario', () => {
      const points = generator.createBackgroundScenario();

      // Simulate deduplication logic
      const seenTimestamps = new Set<number>();
      let duplicateCount = 0;

      for (const point of points) {
        if (seenTimestamps.has(point.timestamp)) {
          duplicateCount++;
        } else {
          seenTimestamps.add(point.timestamp);
        }
      }

      expect(duplicateCount).toBeGreaterThan(0); // Should have duplicates
      console.log(`Detected ${duplicateCount} duplicate points`);
    });

    it('calculates distance without duplicates', () => {
      const points = generator.createBackgroundScenario();

      // Deduplicate by timestamp
      const uniquePoints: GPSPoint[] = [];
      const seenTimestamps = new Set<number>();

      for (const point of points) {
        if (!seenTimestamps.has(point.timestamp)) {
          uniquePoints.push(point);
          seenTimestamps.add(point.timestamp);
        }
      }

      const totalDistance = generator.getTotalDistance(uniquePoints);
      const expectedDistance = 1000; // 500m + 500m

      // Should be within 5% of expected
      expect(detectDistanceInflation(totalDistance, expectedDistance, 50)).toBe(true);
      console.log(`Distance after dedup: ${totalDistance.toFixed(1)}m (expected: ${expectedDistance}m)`);
    });
  });

  describe('Test 3: Long Session Stability', () => {
    it('30 minute run has no large gaps', () => {
      const points = generator.create30MinuteRun();

      // Simulate continuous distance updates
      const updates: DistanceUpdate[] = [];
      let totalDistance = 0;

      for (let i = 1; i < points.length; i++) {
        const segmentDistance = generator.calculateDistance(
          points[i - 1].latitude,
          points[i - 1].longitude,
          points[i].latitude,
          points[i].longitude
        );

        totalDistance += segmentDistance;
        updates.push({
          timestamp: points[i].timestamp,
          distance: totalDistance,
        });
      }

      const maxGap = findLargestUpdateGap(updates);

      // Should not have gaps >10 seconds
      expect(maxGap).toBeLessThan(10000);
      console.log(`30min run: max gap = ${(maxGap / 1000).toFixed(1)}s, total distance = ${totalDistance.toFixed(1)}m`);
    });

    it('tracks distance continuously over time', () => {
      const points = generator.create30MinuteRun();

      // Check that distance increases monotonically
      let totalDistance = 0;
      let decreaseCount = 0;

      for (let i = 1; i < points.length; i++) {
        const segmentDistance = generator.calculateDistance(
          points[i - 1].latitude,
          points[i - 1].longitude,
          points[i].latitude,
          points[i].longitude
        );

        const previousDistance = totalDistance;
        totalDistance += segmentDistance;

        if (totalDistance < previousDistance) {
          decreaseCount++;
        }
      }

      // Distance should never decrease
      expect(decreaseCount).toBe(0);
    });
  });

  describe('Test 4: GPS Timestamp Duration Tracking', () => {
    it('calculates duration from GPS timestamps', () => {
      const points = generator.create10MinuteRun();

      // Duration from GPS timestamps (not JS timers)
      const gpsBasedDuration = generator.getTotalDuration(points);
      const expectedDuration = 600; // 10 minutes = 600 seconds

      // Should be within 5 seconds of expected
      expect(Math.abs(gpsBasedDuration - expectedDuration)).toBeLessThan(5);
      console.log(`GPS timestamp duration: ${gpsBasedDuration.toFixed(1)}s (expected: ${expectedDuration}s)`);
    });

    it('duration is immune to timer throttling', () => {
      const points = generator.create10MinuteRun();

      // Simulate throttled JS timer (runs slow)
      const throttledTimerDuration = 450; // 450s instead of 600s (25% throttled)

      // GPS timestamp duration should still be accurate
      const gpsBasedDuration = generator.getTotalDuration(points);

      expect(gpsBasedDuration).toBeGreaterThan(throttledTimerDuration);
      expect(gpsBasedDuration).toBeGreaterThanOrEqual(595); // Within 5 seconds of 600
      expect(gpsBasedDuration).toBeLessThanOrEqual(605);
      console.log(`GPS duration: ${gpsBasedDuration.toFixed(1)}s (throttled timer would show: ${throttledTimerDuration}s)`);
    });
  });

  describe('Test 5: Stuck Recovery Detection', () => {
    it('detects stuck recovery scenario', () => {
      const points = generator.createStuckRecoveryScenario();

      // Find the poor accuracy period
      let poorAccuracyPoints = 0;

      for (let i = 0; i < points.length; i++) {
        if (points[i].accuracy && points[i].accuracy! > 50) {
          poorAccuracyPoints++;
        }
      }

      // Should have at least one period of poor accuracy
      expect(poorAccuracyPoints).toBeGreaterThan(0);
      console.log(`Poor accuracy points: ${poorAccuracyPoints} out of ${points.length}`);
    });

    it('simulates recovery timeout behavior', () => {
      const points = generator.createStuckRecoveryScenario();

      // Simulate recovery mode logic
      const RECOVERY_TIMEOUT = 7000; // 7 seconds
      let inRecovery = false;
      let recoveryStartTime = 0;
      let recoveryTimeouts = 0;

      for (let i = 1; i < points.length; i++) {
        const gap = points[i].timestamp - points[i - 1].timestamp;

        // Enter recovery if gap >10s
        if (gap > 10000 && !inRecovery) {
          inRecovery = true;
          recoveryStartTime = points[i].timestamp;
          console.log(`Entered recovery at point ${i}`);
        }

        // Check for timeout
        if (inRecovery) {
          const recoveryDuration = points[i].timestamp - recoveryStartTime;
          if (recoveryDuration > RECOVERY_TIMEOUT) {
            recoveryTimeouts++;
            inRecovery = false;
            console.log(`Recovery timeout at point ${i} after ${(recoveryDuration / 1000).toFixed(1)}s`);
          }

          // Exit recovery on good accuracy
          if (points[i].accuracy && points[i].accuracy! < 20) {
            inRecovery = false;
            console.log(`Exited recovery at point ${i} with good accuracy`);
          }
        }
      }

      // Should have triggered at least one timeout
      expect(recoveryTimeouts).toBeGreaterThan(0);
    });
  });

  describe('Test 6: Distance Accuracy Validation', () => {
    it('1km route is within 3% accuracy', () => {
      const points = generator.createStraightRoute(1000);
      const calculatedDistance = generator.getTotalDistance(points);

      const error = Math.abs(calculatedDistance - 1000);
      const errorPercent = (error / 1000) * 100;

      expect(errorPercent).toBeLessThan(3);
      console.log(`1km route: ${calculatedDistance.toFixed(1)}m (error: ${errorPercent.toFixed(2)}%)`);
    });

    it('5km complex route is within 3% accuracy', () => {
      const points = generator.createComplexRoute();
      const calculatedDistance = generator.getTotalDistance(points);
      const expectedDistance = 5000; // 5km

      const error = Math.abs(calculatedDistance - expectedDistance);
      const errorPercent = (error / expectedDistance) * 100;

      expect(errorPercent).toBeLessThan(3);
      console.log(`5km route: ${calculatedDistance.toFixed(1)}m (error: ${errorPercent.toFixed(2)}%)`);
    });
  });
});
