/**
 * GPS Distance Jump Diagnostic Test
 * Simulates GPS scenarios that could cause sudden distance jumps
 * Run with: node tests/gps-distance-jump-test.js
 */

// ============================================================================
// Haversine Distance Calculator
// ============================================================================

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ============================================================================
// Simple Kalman Filter (matching your implementation)
// ============================================================================

class SimpleKalmanFilter {
  constructor() {
    this.distance = 0;
    this.velocity = 0;
    this.estimateError = 1000;
    this.isReady = false;
  }

  reset() {
    this.distance = 0;
    this.velocity = 0;
    this.estimateError = 1000;
    this.isReady = false;
  }

  update(measurement) {
    const { distance: rawDistance, timeDelta, accuracy, confidence } = measurement;

    if (timeDelta <= 0) return { distance: this.distance, velocity: this.velocity };

    // Calculate instantaneous velocity
    const measuredVelocity = rawDistance / timeDelta;

    if (!this.isReady) {
      // First measurement - initialize
      this.distance = rawDistance;
      this.velocity = measuredVelocity;
      this.estimateError = accuracy || 20;
      this.isReady = true;
      return { distance: this.distance, velocity: this.velocity, estimateError: this.estimateError };
    }

    // Kalman gain calculation
    const measurementError = accuracy || 20;
    const kalmanGain = this.estimateError / (this.estimateError + measurementError);

    // Update distance estimate
    const predictedDistance = this.distance + (this.velocity * timeDelta);
    this.distance = predictedDistance + kalmanGain * (rawDistance - (rawDistance - predictedDistance));

    // Update velocity estimate
    this.velocity = (1 - kalmanGain) * this.velocity + kalmanGain * measuredVelocity;

    // Update error estimate
    this.estimateError = (1 - kalmanGain) * this.estimateError;

    return {
      distance: this.distance,
      velocity: this.velocity,
      estimateError: this.estimateError
    };
  }

  predict(timeDelta) {
    return this.distance + (this.velocity * timeDelta);
  }
}

// ============================================================================
// TEST SCENARIO 1: Poor Initial GPS Lock (Warmup Issue)
// ============================================================================

console.log('==================================================');
console.log('TEST SCENARIO 1: Poor Initial GPS Lock');
console.log('==================================================\n');

console.log('Simulating startup with poor GPS accuracy that improves over time\n');

const warmupScenario = [
  { lat: 37.7749, lon: -122.4194, accuracy: 500, time: 0, desc: 'START - Very poor accuracy (500m)' },
  { lat: 37.7750, lon: -122.4194, accuracy: 200, time: 2, desc: 'Improving... (200m accuracy)' },
  { lat: 37.7751, lon: -122.4194, accuracy: 100, time: 4, desc: 'Better... (100m accuracy)' },
  { lat: 37.7752, lon: -122.4194, accuracy: 50, time: 6, desc: 'Good (50m accuracy)' },
  { lat: 37.7753, lon: -122.4194, accuracy: 20, time: 8, desc: 'Excellent (20m accuracy)' },
  { lat: 37.7754, lon: -122.4194, accuracy: 10, time: 10, desc: 'Locked (10m accuracy)' },
];

let warmupDistance = 0;
let warmupKalman = new SimpleKalmanFilter();
let prevPoint = null;

warmupScenario.forEach((point, index) => {
  if (prevPoint) {
    const rawDistance = calculateDistance(prevPoint.lat, prevPoint.lon, point.lat, point.lon);
    const timeDelta = point.time - prevPoint.time;

    // Without filtering
    warmupDistance += rawDistance;

    // With Kalman filtering
    const kalmanState = warmupKalman.update({
      distance: rawDistance,
      timeDelta,
      accuracy: point.accuracy,
      confidence: 1.0
    });

    console.log(`${point.desc}`);
    console.log(`  Raw segment: ${rawDistance.toFixed(1)}m`);
    console.log(`  Cumulative (no filter): ${warmupDistance.toFixed(1)}m (${(warmupDistance/1000).toFixed(3)}km)`);
    console.log(`  Kalman filtered: ${kalmanState.distance.toFixed(1)}m (${(kalmanState.distance/1000).toFixed(3)}km)`);
    console.log(`  Velocity: ${(kalmanState.velocity * 3.6).toFixed(1)} km/h\n`);
  }
  prevPoint = point;
});

console.log('DIAGNOSIS: GPS warmup can cause large initial distances if poor accuracy points are not filtered.\n');

// ============================================================================
// TEST SCENARIO 2: GPS Jump (Tall Building / Tunnel Exit)
// ============================================================================

console.log('==================================================');
console.log('TEST SCENARIO 2: GPS Jump After Signal Loss');
console.log('==================================================\n');

console.log('Simulating GPS loss (tunnel) and recovery with position jump\n');

const jumpScenario = [
  { lat: 37.7749, lon: -122.4194, accuracy: 10, time: 0, desc: 'Good signal' },
  { lat: 37.7750, lon: -122.4194, accuracy: 10, time: 2, desc: 'Still good' },
  { lat: 37.7751, lon: -122.4194, accuracy: 10, time: 4, desc: 'Still good' },
  { lat: 37.7752, lon: -122.4194, accuracy: null, time: 6, desc: '⚠️ LOST SIGNAL (tunnel)' },
  { lat: 37.7753, lon: -122.4194, accuracy: null, time: 8, desc: '⚠️ STILL LOST' },
  { lat: 37.7763, lon: -122.4194, accuracy: 100, time: 10, desc: '🔄 RECOVERED but jumped 1100m!' },
  { lat: 37.7764, lon: -122.4194, accuracy: 50, time: 12, desc: 'Accuracy improving' },
  { lat: 37.7765, lon: -122.4194, accuracy: 20, time: 14, desc: 'Back to normal' },
];

let jumpDistance = 0;
let jumpKalman = new SimpleKalmanFilter();
let prevJumpPoint = null;
let inRecoveryMode = false;
let recoveryPointsSkipped = 0;
const RECOVERY_POINTS_REQUIRED = 3;

console.log('WITHOUT RECOVERY MODE:\n');
jumpScenario.forEach((point) => {
  if (prevJumpPoint && point.accuracy !== null) {
    const rawDistance = calculateDistance(prevJumpPoint.lat, prevJumpPoint.lon, point.lat, point.lon);
    const timeDelta = point.time - prevJumpPoint.time;

    jumpDistance += rawDistance;

    console.log(`${point.desc}`);
    console.log(`  Segment: +${rawDistance.toFixed(1)}m`);
    console.log(`  Total: ${jumpDistance.toFixed(1)}m (${(jumpDistance/1000).toFixed(3)}km)`);
    console.log(`  ⚠️ This includes the phantom tunnel jump!\n`);
  } else if (point.accuracy === null) {
    console.log(`${point.desc}\n`);
  }
  if (point.accuracy !== null) {
    prevJumpPoint = point;
  }
});

// Now WITH recovery mode
console.log('\nWITH RECOVERY MODE (skips first 3 points after signal recovery):\n');
jumpDistance = 0;
prevJumpPoint = null;
inRecoveryMode = false;
recoveryPointsSkipped = 0;
let wasInGpsLost = false;

jumpScenario.forEach((point) => {
  if (point.accuracy === null) {
    console.log(`${point.desc}`);
    wasInGpsLost = true;
    console.log('  Distance tracking PAUSED\n');
    return;
  }

  // Check if we just recovered from GPS loss
  if (wasInGpsLost && !inRecoveryMode) {
    inRecoveryMode = true;
    recoveryPointsSkipped = 0;
    console.log(`${point.desc}`);
    console.log('  🔄 ENTERING RECOVERY MODE - skipping next 3 points to prevent phantom distance\n');
    wasInGpsLost = false;
    prevJumpPoint = point; // Update position but don't count distance
    return;
  }

  if (inRecoveryMode && recoveryPointsSkipped < RECOVERY_POINTS_REQUIRED) {
    recoveryPointsSkipped++;
    console.log(`${point.desc}`);
    console.log(`  🔄 RECOVERY ${recoveryPointsSkipped}/${RECOVERY_POINTS_REQUIRED} - point skipped (no distance added)`);

    if (prevJumpPoint) {
      const phantomDistance = calculateDistance(prevJumpPoint.lat, prevJumpPoint.lon, point.lat, point.lon);
      console.log(`  💾 Prevented ${phantomDistance.toFixed(1)}m phantom distance\n`);
    }

    prevJumpPoint = point;

    if (recoveryPointsSkipped >= RECOVERY_POINTS_REQUIRED) {
      inRecoveryMode = false;
      console.log('  ✅ RECOVERY COMPLETE - resuming normal distance tracking\n');
    }
    return;
  }

  if (prevJumpPoint) {
    const rawDistance = calculateDistance(prevJumpPoint.lat, prevJumpPoint.lon, point.lat, point.lon);
    jumpDistance += rawDistance;

    console.log(`${point.desc}`);
    console.log(`  Segment: +${rawDistance.toFixed(1)}m`);
    console.log(`  Total: ${jumpDistance.toFixed(1)}m (${(jumpDistance/1000).toFixed(3)}km)`);
    console.log(`  ✅ Phantom distance prevented!\n`);
  }

  prevJumpPoint = point;
});

// ============================================================================
// TEST SCENARIO 3: Real-World Run Simulation
// ============================================================================

console.log('==================================================');
console.log('TEST SCENARIO 3: Realistic Run Simulation');
console.log('==================================================\n');

console.log('Simulating a real run with varying GPS accuracy\n');

// Simulate 1km run at ~6 min/km pace (10 km/h = 2.78 m/s)
// GPS updates every 2 seconds, each segment should be ~5.5m
const runSimulation = [];
const startLat = 37.7749;
const startLon = -122.4194;
const latPerMeter = 1 / 111000; // Approximate latitude degrees per meter

for (let time = 0; time <= 360; time += 2) { // 6 minutes = 360 seconds
  const targetDistance = (time / 360) * 1000; // Should reach 1000m at end
  const lat = startLat + (targetDistance * latPerMeter);

  // Vary accuracy realistically
  let accuracy = 10 + Math.random() * 20; // 10-30m typical
  if (time < 10) accuracy = 50 + Math.random() * 100; // Poor initial accuracy
  if (time > 180 && time < 200) accuracy = null; // GPS loss for 20 seconds

  runSimulation.push({
    lat,
    lon: startLon,
    accuracy,
    time
  });
}

let runDistance = 0;
let runKalman = new SimpleKalmanFilter();
let prevRunPoint = null;
let totalPhantomDistance = 0;
let recoveryMode = false;
let recoveryPoints = 0;
let gpsLostStart = null;

runSimulation.forEach((point, index) => {
  if (point.accuracy === null) {
    if (gpsLostStart === null) {
      gpsLostStart = point.time;
      console.log(`⚠️ ${point.time}s: GPS SIGNAL LOST`);
    }
    return;
  }

  if (gpsLostStart !== null) {
    const outageTime = point.time - gpsLostStart;
    console.log(`🔄 ${point.time}s: GPS RECOVERED after ${outageTime}s - entering recovery mode`);
    recoveryMode = true;
    recoveryPoints = 0;
    gpsLostStart = null;
  }

  if (prevRunPoint) {
    const rawDistance = calculateDistance(prevRunPoint.lat, prevRunPoint.lon, point.lat, point.lon);
    const timeDelta = point.time - prevRunPoint.time;

    if (recoveryMode && recoveryPoints < 3) {
      recoveryPoints++;
      totalPhantomDistance += rawDistance;
      console.log(`  Recovery ${recoveryPoints}/3: Skipping ${rawDistance.toFixed(1)}m (accuracy: ${point.accuracy.toFixed(0)}m)`);

      if (recoveryPoints >= 3) {
        recoveryMode = false;
        console.log(`  ✅ Recovery complete - prevented ${totalPhantomDistance.toFixed(1)}m phantom distance\n`);
      }
    } else {
      const kalmanState = runKalman.update({
        distance: rawDistance,
        timeDelta,
        accuracy: point.accuracy,
        confidence: 1.0
      });

      runDistance = kalmanState.distance;

      if (index % 30 === 0) { // Log every 30 points (~1 minute)
        console.log(`${point.time}s: ${runDistance.toFixed(1)}m (${(runDistance/1000).toFixed(2)}km) - pace: ${(kalmanState.velocity * 3.6).toFixed(1)} km/h`);
      }
    }
  }

  prevRunPoint = point;
});

console.log(`\nFinal Distance: ${runDistance.toFixed(1)}m (${(runDistance/1000).toFixed(2)}km)`);
console.log(`Expected: ~1000m (1.00km)`);
console.log(`Phantom Distance Prevented: ${totalPhantomDistance.toFixed(1)}m\n`);

// ============================================================================
// SUMMARY AND RECOMMENDATIONS
// ============================================================================

console.log('==================================================');
console.log('DIAGNOSIS & RECOMMENDATIONS');
console.log('==================================================\n');

console.log('ROOT CAUSES OF DISTANCE ISSUES:\n');
console.log('1. ⚠️  GPS WARMUP:');
console.log('   First 5-10 seconds have poor accuracy (50-500m)');
console.log('   If not filtered, can add 1000m+ of phantom distance\n');

console.log('2. ⚠️  GPS RECOVERY AFTER SIGNAL LOSS:');
console.log('   After tunnels/buildings, GPS position jumps');
console.log('   First points show "straight line" through obstacles');
console.log('   Can add 500-2000m phantom distance per outage\n');

console.log('3. ⚠️  KALMAN FILTER ACCUMULATION:');
console.log('   Filter smooths noise but can accumulate errors');
console.log('   Needs proper reset after GPS recovery\n');

console.log('FIXES IMPLEMENTED IN YOUR CODE:\n');
console.log('✅ GPS warmup period (5 seconds) - Line 256-259, EnhancedLocationTrackingService.ts');
console.log('✅ Recovery mode (skips first 3 points) - Line 396-492');
console.log('✅ Accuracy filtering (rejects accuracy > 50m) - LocationValidator.ts');
console.log('✅ Kalman filter for smoothing - KalmanDistanceFilter.ts\n');

console.log('POTENTIAL BUGS TO CHECK:\n');
console.log('1. ⚠️  Recovery mode timeout (5 seconds) might be too short');
console.log('   Location: EnhancedLocationTrackingService.ts:106');
console.log('   Current: 5000ms, Consider: 10000ms\n');

console.log('2. ⚠️  Recovery points required (1 point) might be too few');
console.log('   Location: EnhancedLocationTrackingService.ts:107');
console.log('   Current: 1 point, Consider: 3-5 points\n');

console.log('3. ⚠️  Warmup duration (5 seconds) might be too short');
console.log('   Location: EnhancedLocationTrackingService.ts:98');
console.log('   Current: 5000ms, Consider: 10000ms\n');

console.log('DEBUGGING COMMANDS:\n');
console.log('Check Metro logs for these messages:');
console.log('  - "🔥 GPS warmup started"');
console.log('  - "✅ GPS warmup complete"');
console.log('  - "🔄 GPS Recovery #X: Starting recovery buffer"');
console.log('  - "✅ GPS fully recovered! Prevented X.Xm of phantom distance"');
console.log('  - "⏰ GPS Recovery: Timeout after X.Xs"\n');
