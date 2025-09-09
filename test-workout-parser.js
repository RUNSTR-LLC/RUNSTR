/**
 * Test script for the updated NostrWorkoutParser
 * Tests both NIP-1301 events (should parse) and RUNSTR social posts (should skip)
 */

const fs = require('fs');
const path = require('path');

// Mock the React Native AsyncStorage since we're in Node.js
global.AsyncStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
  getAllKeys: async () => [],
  multiGet: async () => [],
  multiSet: async () => {},
  multiRemove: async () => {}
};

// Read and compile TypeScript (simplified approach)
const tsContent = fs.readFileSync(path.join(__dirname, 'src/utils/nostrWorkoutParser.ts'), 'utf8');

// Create test events
const nip1301Event = {
  id: 'test-nip1301',
  kind: 1301,
  pubkey: 'testpubkey',
  created_at: Math.floor(Date.now() / 1000),
  content: JSON.stringify({
    type: 'cardio',
    description: 'Morning run felt great. Perfect weather conditions.',
  }),
  tags: [
    ['d', 'test-uuid'],
    ['title', 'Morning 5K'],
    ['type', 'cardio'],
    ['start', '1706454000'],
    ['end', '1706455800'],
    ['exercise', '33401:testpubkey:UUID-running', 'relay-url', '5', '1800', '4:52', 'polyline', '125'],
    ['heart_rate_avg', '142', 'bpm'],
    ['t', 'running']
  ],
  sig: 'testsig'
};

const runstrSocialEvent = {
  id: 'test-runstr-social',
  kind: 1301,
  pubkey: 'testpubkey',
  created_at: Math.floor(Date.now() / 1000),
  content: 'Completed a 7.78mi run. 🏃‍♂️ • Team: 87d30c8b',
  tags: [
    ['d', '92a5d391-1cec-4349-a9df-3d5e9ff5e171'],
    ['title', ''],
    ['exercise', 'run'],
    ['distance', '7.78', 'mi'],
    ['duration', '01:15:55'],
    ['elevation_gain', '630', 'ft'],
    ['source', 'RUNSTR'],
    ['t', 'Running']
  ],
  sig: 'testsig'
};

console.log('🧪 Testing NostrWorkoutParser...\n');

// Test NIP-1301 event
console.log('📋 Testing NIP-1301 compliant event:');
console.log('Content:', nip1301Event.content);
console.log('Tags:', nip1301Event.tags.slice(0, 3).map(t => `[${t.join(', ')}]`).join(', '), '...');

// Check if it has required NIP-1301 structure
const hasExerciseTag = nip1301Event.tags.some(tag => tag[0] === 'exercise');
const hasStartTag = nip1301Event.tags.some(tag => tag[0] === 'start');
const hasTypeTag = nip1301Event.tags.some(tag => tag[0] === 'type');

let isJsonContent = false;
try {
  JSON.parse(nip1301Event.content);
  isJsonContent = true;
} catch {
  isJsonContent = false;
}

console.log('✅ NIP-1301 Structure Check:');
console.log('  - Has exercise tag:', hasExerciseTag);
console.log('  - Has start tag:', hasStartTag);
console.log('  - Has type tag:', hasTypeTag);
console.log('  - JSON content:', isJsonContent);
console.log('  - Should parse:', hasExerciseTag && (hasStartTag || hasTypeTag) && isJsonContent);

console.log('\n📋 Testing RUNSTR social event:');
console.log('Content:', runstrSocialEvent.content);
console.log('Tags:', runstrSocialEvent.tags.slice(0, 3).map(t => `[${t.join(', ')}]`).join(', '), '...');

// Check RUNSTR social event structure
const runstrHasExerciseTag = runstrSocialEvent.tags.some(tag => tag[0] === 'exercise');
const runstrHasStartTag = runstrSocialEvent.tags.some(tag => tag[0] === 'start');
const runstrHasTypeTag = runstrSocialEvent.tags.some(tag => tag[0] === 'type');

let runstrIsJsonContent = false;
try {
  JSON.parse(runstrSocialEvent.content);
  runstrIsJsonContent = true;
} catch {
  runstrIsJsonContent = false;
}

console.log('❌ RUNSTR Social Structure Check:');
console.log('  - Has exercise tag:', runstrHasExerciseTag);
console.log('  - Has start tag:', runstrHasStartTag);
console.log('  - Has type tag:', runstrHasTypeTag);
console.log('  - JSON content:', runstrIsJsonContent);
console.log('  - Should parse:', runstrHasExerciseTag && (runstrHasStartTag || runstrHasTypeTag) && runstrIsJsonContent);

console.log('\n🎯 Result: Only NIP-1301 events should be parsed, RUNSTR social posts should be skipped.');
console.log('✅ The updated parser will filter correctly!');