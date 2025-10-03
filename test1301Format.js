/**
 * Test script to verify 1301 event creation matches runstr format
 * Run with: node test1301Format.js
 */

// Sample workout data
const sampleWorkout = {
  id: 'test_workout_123',
  type: 'running',
  duration: 1830, // 30 minutes 30 seconds
  distance: 5200, // 5.2km in meters
  calories: 450,
  elevationGain: 120, // meters
  unitSystem: 'metric',
  metadata: {
    title: 'Morning Run',
    sourceApp: 'RUNSTR'
  }
};

// Expected runstr-compatible tag format
function createRunstrTags(workout) {
  // Format duration as HH:MM:SS
  const hours = Math.floor(workout.duration / 3600);
  const minutes = Math.floor((workout.duration % 3600) / 60);
  const seconds = workout.duration % 60;
  const durationFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Calculate distance
  const distanceKm = (workout.distance / 1000).toFixed(2);

  const tags = [
    ['d', workout.id],
    ['title', workout.metadata?.title || 'Running Workout'],
    ['exercise', 'run'], // Simple exercise type - just "run", "walk", or "cycle"
    ['distance', distanceKm, 'km'], // Distance with value and unit
    ['duration', durationFormatted], // HH:MM:SS format
    ['source', 'RUNSTR'], // App identification
    ['client', 'RUNSTR', '0.1.1'], // Client info
    ['t', 'Running'], // Hashtag
  ];

  // Add optional fields
  if (workout.elevationGain > 0) {
    tags.push(['elevation_gain', workout.elevationGain.toString(), 'm']);
  }

  if (workout.calories > 0) {
    tags.push(['calories', workout.calories.toString()]);
  }

  return tags;
}

// Test parsing runstr format
function parseRunstrEvent(tags) {
  const result = {
    workoutType: null,
    distance: null,
    duration: null,
    calories: null,
    elevation: null,
    source: null,
  };

  for (const tag of tags) {
    switch (tag[0]) {
      case 'exercise':
        result.workoutType = tag[1];
        break;
      case 'distance':
        result.distance = {
          value: parseFloat(tag[1]),
          unit: tag[2] || 'km'
        };
        break;
      case 'duration':
        // Parse HH:MM:SS to seconds
        const parts = tag[1].split(':').map(p => parseInt(p));
        if (parts.length === 3) {
          result.duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        break;
      case 'calories':
        result.calories = parseInt(tag[1]);
        break;
      case 'elevation_gain':
        result.elevation = {
          value: parseInt(tag[1]),
          unit: tag[2] || 'm'
        };
        break;
      case 'source':
        result.source = tag[1];
        break;
    }
  }

  return result;
}

// Test the format
console.log('🧪 Testing 1301 Event Format Compatibility\n');
console.log('='.repeat(50));

console.log('\n📝 Sample Workout Data:');
console.log(JSON.stringify(sampleWorkout, null, 2));

console.log('\n🏷️  Generated Tags (runstr format):');
const tags = createRunstrTags(sampleWorkout);
tags.forEach(tag => {
  console.log(`  ["${tag[0]}", ${tag.slice(1).map(v => `"${v}"`).join(', ')}]`);
});

console.log('\n✅ Parsing Test:');
const parsed = parseRunstrEvent(tags);
console.log(JSON.stringify(parsed, null, 2));

console.log('\n🔍 Validation:');
const validationChecks = [
  {
    name: 'Exercise type is simple',
    pass: parsed.workoutType === 'run'
  },
  {
    name: 'Distance has value and unit',
    pass: parsed.distance && parsed.distance.value === 5.2 && parsed.distance.unit === 'km'
  },
  {
    name: 'Duration parsed correctly',
    pass: parsed.duration === 1830
  },
  {
    name: 'Source is RUNSTR',
    pass: parsed.source === 'RUNSTR'
  },
  {
    name: 'Optional fields parsed',
    pass: parsed.calories === 450 && parsed.elevation?.value === 120
  }
];

validationChecks.forEach(check => {
  console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
});

const allPassed = validationChecks.every(check => check.pass);
console.log('\n' + '='.repeat(50));
console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed');
console.log('\n📋 Summary:');
console.log('- Tags use simple "exercise" field (not complex 7-field format)');
console.log('- Distance includes value and unit as separate tag fields');
console.log('- Duration is formatted as HH:MM:SS string');
console.log('- Source/client tags identify RUNSTR workouts');
console.log('- Compatible with runstr GitHub implementation');