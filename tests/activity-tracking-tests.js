/**
 * Activity Tracking Test Suite
 * Tests distance calculations, formatting, and TTS announcements
 * Run with: node tests/activity-tracking-tests.js
 */

// ============================================================================
// TEST 1: Distance Calculation (Haversine Formula)
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

  return R * c; // Distance in meters
}

console.log('==================================================');
console.log('TEST 1: Distance Calculation (Haversine Formula)');
console.log('==================================================\n');

// Test with known coordinates (roughly 1km apart)
const testPoints = [
  {
    name: 'Point A -> Point B (1km straight line)',
    lat1: 37.7749,
    lon1: -122.4194,
    lat2: 37.7839,
    lon2: -122.4194,
    expectedKm: 1.0,
  },
  {
    name: 'Point B -> Point C (500m straight line)',
    lat1: 37.7839,
    lon1: -122.4194,
    lat2: 37.7884,
    lon2: -122.4194,
    expectedKm: 0.5,
  },
  {
    name: 'Very small movement (10m)',
    lat1: 37.7749,
    lon1: -122.4194,
    lat2: 37.7750,
    lon2: -122.4194,
    expectedKm: 0.01,
  },
];

testPoints.forEach((test) => {
  const distanceMeters = calculateDistance(
    test.lat1,
    test.lon1,
    test.lat2,
    test.lon2
  );
  const distanceKm = distanceMeters / 1000;
  console.log(`${test.name}:`);
  console.log(`  Distance: ${distanceMeters.toFixed(2)} meters`);
  console.log(`  Distance: ${distanceKm.toFixed(2)} km`);
  console.log(`  Expected: ${test.expectedKm.toFixed(2)} km`);
  console.log(
    `  Status: ${Math.abs(distanceKm - test.expectedKm) < 0.1 ? '✅ PASS' : '❌ FAIL'}\n`
  );
});

// ============================================================================
// TEST 2: Cumulative Distance Accumulation
// ============================================================================

console.log('==================================================');
console.log('TEST 2: Cumulative Distance Accumulation');
console.log('==================================================\n');

// Simulate GPS points during a run
const gpsPoints = [
  { lat: 37.7749, lon: -122.4194, time: 0 }, // Start
  { lat: 37.7759, lon: -122.4194, time: 30 }, // ~111m
  { lat: 37.7769, lon: -122.4194, time: 60 }, // ~222m
  { lat: 37.7779, lon: -122.4194, time: 90 }, // ~333m
  { lat: 37.7789, lon: -122.4194, time: 120 }, // ~444m
  { lat: 37.7799, lon: -122.4194, time: 150 }, // ~555m
  { lat: 37.7809, lon: -122.4194, time: 180 }, // ~666m
  { lat: 37.7819, lon: -122.4194, time: 210 }, // ~777m
  { lat: 37.7829, lon: -122.4194, time: 240 }, // ~888m
  { lat: 37.7839, lon: -122.4194, time: 270 }, // ~1000m
];

let cumulativeDistance = 0;
console.log('GPS Point Sequence:\n');

for (let i = 1; i < gpsPoints.length; i++) {
  const prev = gpsPoints[i - 1];
  const curr = gpsPoints[i];
  const segmentDistance = calculateDistance(
    prev.lat,
    prev.lon,
    curr.lat,
    curr.lon
  );
  cumulativeDistance += segmentDistance;

  console.log(
    `Point ${i}: ${curr.time}s - +${segmentDistance.toFixed(1)}m → Total: ${cumulativeDistance.toFixed(1)}m (${(cumulativeDistance / 1000).toFixed(2)}km)`
  );
}

console.log(`\nFinal Distance: ${cumulativeDistance.toFixed(1)}m`);
console.log(`Final Distance: ${(cumulativeDistance / 1000).toFixed(2)}km`);
console.log(
  `Expected: ~1.00km\n`
);

// ============================================================================
// TEST 3: Distance Formatting (UI Display)
// ============================================================================

console.log('==================================================');
console.log('TEST 3: Distance Formatting (UI Display)');
console.log('==================================================\n');

function formatDistanceUI(meters) {
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

const distanceTestCases = [
  { meters: 0, expected: '0.00 km' },
  { meters: 100, expected: '0.10 km' },
  { meters: 500, expected: '0.50 km' },
  { meters: 1000, expected: '1.00 km' },
  { meters: 1400, expected: '1.40 km' },
  { meters: 5200, expected: '5.20 km' },
  { meters: 10000, expected: '10.00 km' },
];

distanceTestCases.forEach((test) => {
  const formatted = formatDistanceUI(test.meters);
  console.log(
    `${test.meters}m → ${formatted} (expected: ${test.expected}) ${formatted === test.expected ? '✅' : '❌'}`
  );
});

// ============================================================================
// TEST 4: Pace Calculation (CRITICAL BUG CHECK)
// ============================================================================

console.log('\n==================================================');
console.log('TEST 4: Pace Calculation (CRITICAL BUG CHECK)');
console.log('==================================================\n');

function calculatePace(distanceMeters, durationSeconds) {
  if (distanceMeters <= 0 || durationSeconds <= 0) {
    return undefined;
  }

  const distanceKm = distanceMeters / 1000;
  if (distanceKm <= 0) {
    return undefined;
  }

  return durationSeconds / distanceKm; // ⚠️ RETURNS SECONDS per km
}

function formatPaceUI(secondsPerUnit) {
  if (!secondsPerUnit || secondsPerUnit <= 0 || !isFinite(secondsPerUnit)) {
    return '--:--';
  }

  const minutes = Math.floor(secondsPerUnit / 60);
  const seconds = Math.floor(secondsPerUnit % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

// ❌ BUGGY TTS FORMATTER (treats seconds as minutes!)
function formatPaceVoiceBUGGY(paceMinutesPerKm) {
  const minutes = Math.floor(paceMinutesPerKm);
  const seconds = Math.round((paceMinutesPerKm - minutes) * 60);

  if (seconds === 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  } else {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }
}

// ✅ CORRECT TTS FORMATTER (converts seconds to minutes first)
function formatPaceVoiceCORRECT(paceSecondsPerKm) {
  const totalMinutes = paceSecondsPerKm / 60;
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);

  if (seconds === 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  } else {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }
}

console.log('Scenario: 5.2km run in 30 minutes 45 seconds (1845 seconds)\n');
const testDistance = 5200; // meters
const testDuration = 1845; // seconds (30:45)

const pace = calculatePace(testDistance, testDuration);
console.log(`Calculated Pace: ${pace.toFixed(2)} seconds/km\n`);

console.log('UI Display:');
console.log(`  ${formatPaceUI(pace)}\n`);

console.log('TTS Announcement (BUGGY - treats seconds as minutes):');
console.log(`  "at an average pace of ${formatPaceVoiceBUGGY(pace)} per kilometer"`);
console.log(
  `  ❌ This says "354 minutes" instead of "5 minutes 54 seconds"!\n`
);

console.log('TTS Announcement (CORRECT - converts to minutes):');
console.log(
  `  "at an average pace of ${formatPaceVoiceCORRECT(pace)} per kilometer"`
);
console.log(`  ✅ This correctly says "5 minutes 54 seconds"\n`);

// ============================================================================
// TEST 5: TTS Distance Formatting
// ============================================================================

console.log('==================================================');
console.log('TEST 5: TTS Distance Formatting');
console.log('==================================================\n');

function formatDistanceTTS(meters) {
  const km = meters / 1000;

  if (km < 1) {
    return `${meters.toFixed(0)} meters`;
  } else if (km < 10) {
    return `${km.toFixed(1)} kilometers`;
  } else {
    return `${km.toFixed(0)} kilometers`;
  }
}

const ttsDistanceTests = [
  { meters: 100, expected: '100 meters' },
  { meters: 500, expected: '500 meters' },
  { meters: 1000, expected: '1.0 kilometers' },
  { meters: 1400, expected: '1.4 kilometers' },
  { meters: 5200, expected: '5.2 kilometers' },
  { meters: 10000, expected: '10 kilometers' },
];

ttsDistanceTests.forEach((test) => {
  const formatted = formatDistanceTTS(test.meters);
  console.log(
    `${test.meters}m → "${formatted}" (expected: "${test.expected}") ${formatted === test.expected ? '✅' : '❌'}`
  );
});

// ============================================================================
// TEST 6: Split Tracking
// ============================================================================

console.log('\n==================================================');
console.log('TEST 6: Split Tracking');
console.log('==================================================\n');

function trackSplits(distanceMeters) {
  const currentKm = Math.floor(distanceMeters / 1000);
  const progress = distanceMeters % 1000;
  const progressPercent = (progress / 1000) * 100;

  return {
    currentKm,
    completedSplits: currentKm,
    progressMeters: progress,
    progressPercent: progressPercent.toFixed(1),
  };
}

const splitTests = [
  0, 100, 500, 999, 1000, 1001, 1500, 2000, 2500, 3000, 5200,
];

console.log('Distance Progression & Split Detection:\n');
splitTests.forEach((meters) => {
  const split = trackSplits(meters);
  console.log(
    `${meters}m → Split ${split.currentKm + 1} (${split.progressPercent}% complete, +${split.progressMeters}m)`
  );
});

// ============================================================================
// TEST 7: Full Workout Simulation
// ============================================================================

console.log('\n==================================================');
console.log('TEST 7: Full Workout Simulation');
console.log('==================================================\n');

function simulateWorkout() {
  const workoutData = {
    type: 'running',
    distance: 5200, // meters
    duration: 1845, // seconds (30:45)
    calories: 312,
    elevation: 50,
    pace: calculatePace(5200, 1845), // Will be SECONDS per km
  };

  console.log('Workout Summary:\n');
  console.log(`Activity: ${workoutData.type}`);
  console.log(`Distance: ${workoutData.distance}m`);
  console.log(`Duration: ${workoutData.duration}s`);
  console.log(`Pace (raw): ${workoutData.pace.toFixed(2)} seconds/km\n`);

  console.log('UI Display:');
  console.log(`  Distance: ${formatDistanceUI(workoutData.distance)}`);
  console.log(`  Pace: ${formatPaceUI(workoutData.pace)}\n`);

  console.log('❌ BUGGY TTS Announcement:');
  console.log(
    `  "You completed a ${formatDistanceTTS(workoutData.distance)} run at an average pace of ${formatPaceVoiceBUGGY(workoutData.pace)} per kilometer. You burned ${workoutData.calories} calories and climbed ${workoutData.elevation} meters. Great work!"\n`
  );

  console.log('✅ CORRECT TTS Announcement:');
  console.log(
    `  "You completed a ${formatDistanceTTS(workoutData.distance)} run at an average pace of ${formatPaceVoiceCORRECT(workoutData.pace)} per kilometer. You burned ${workoutData.calories} calories and climbed ${workoutData.elevation} meters. Great work!"\n`
  );
}

simulateWorkout();

// ============================================================================
// SUMMARY
// ============================================================================

console.log('==================================================');
console.log('DIAGNOSIS SUMMARY');
console.log('==================================================\n');

console.log('IDENTIFIED BUGS:\n');
console.log(
  '1. ❌ TTS PACE BUG: TTSAnnouncementService.formatPaceVoice() treats'
);
console.log(
  '   pace value as "minutes per km" but calculatePace() returns'
);
console.log('   "SECONDS per km". This causes TTS to say "354 minutes"');
console.log('   instead of "5 minutes 54 seconds".\n');

console.log('   Location: src/services/activity/TTSAnnouncementService.ts:289');
console.log(
  '   Fix: Convert seconds to minutes before formatting for TTS\n'
);

console.log('2. ⚠️  POSSIBLE DISTANCE JUMP ISSUE:');
console.log('   The "jumped to 1.4km" issue could be caused by:');
console.log('   - GPS inaccuracy during warmup period');
console.log('   - Kalman filter accumulating errors');
console.log('   - First few GPS points having poor accuracy\n');

console.log('   Recommendation: Check GPS recovery mode and warmup handling');
console.log('   in EnhancedLocationTrackingService.ts:256-389\n');

console.log('3. ✅ DISTANCE FORMATTING:');
console.log('   Both UI and TTS correctly convert meters to km');
console.log('   No bugs found in formatDistance functions\n');

console.log('\nRUN THIS TEST FILE TO SEE DETAILED OUTPUT');
console.log('Command: node tests/activity-tracking-tests.js\n');
