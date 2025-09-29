#!/usr/bin/env npx ts-node
/**
 * Test script to verify kind 1 workout post format
 * Run with: npx ts-node src/utils/testKind1Post.ts
 */

import NDK, { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import type { PublishableWorkout } from '../services/nostr/workoutPublishingService';
import { WorkoutPublishingService } from '../services/nostr/workoutPublishingService';

// Test workout data matching the example
const testWorkout: PublishableWorkout = {
  id: 'test-workout-001',
  type: 'running',
  startTime: '2025-01-29T10:00:00Z',
  endTime: '2025-01-29T10:42:08Z',
  duration: 2528, // 42 minutes 8 seconds
  distance: 8000, // 8 km in meters
  calories: 78,
  elevationGain: 666, // meters
  unitSystem: 'metric',
  userId: 'test-user',
  source: 'healthkit',
  syncedAt: new Date().toISOString(),
  metadata: {
    title: 'Morning Run',
    notes: 'Great run through the hills',
  },
  canSyncToNostr: true,
  canPostToSocial: true,
};

async function testKind1Format() {
  console.log('🧪 Testing Kind 1 Workout Post Format\n');
  console.log('=' .repeat(50));

  try {
    // Initialize the workout publishing service
    const publishingService = WorkoutPublishingService.getInstance();

    // Generate test keys
    const secretKey = generateSecretKey();
    const pubkey = getPublicKey(secretKey);
    const privateKeyHex = Buffer.from(secretKey).toString('hex');
    const npub = nip19.npubEncode(pubkey);

    console.log(`📝 Test User: ${npub.substring(0, 20)}...`);
    console.log('\n🏃‍♂️ Test Workout Data:');
    console.log(`  - Type: ${testWorkout.type}`);
    console.log(`  - Duration: ${Math.floor(testWorkout.duration / 60)}:${(testWorkout.duration % 60).toString().padStart(2, '0')}`);
    console.log(`  - Distance: ${((testWorkout.distance || 0) / 1000).toFixed(2)} km`);
    console.log(`  - Calories: ${testWorkout.calories} kcal`);
    console.log(`  - Elevation: ${testWorkout.elevationGain} m`);

    // Use the private method directly to generate content (for testing only)
    // We'll simulate calling the generateSocialPostContent method
    const service = publishingService as any; // Type assertion to access private methods

    const postContent = await service.generateSocialPostContent(testWorkout, {
      includeStats: true,
      includeCard: false,
    });

    console.log('\n📱 Generated Kind 1 Post Content:');
    console.log('─'.repeat(50));
    console.log(postContent);
    console.log('─'.repeat(50));

    // Show what the event structure would look like
    console.log('\n📦 Nostr Event Structure:');
    const eventTemplate = {
      kind: 1,
      content: postContent,
      tags: [
        ['t', 'fitness'],
        ['t', 'running'],
        ['t', 'RUNSTR'],
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: pubkey,
    };

    console.log(JSON.stringify(eventTemplate, null, 2));

    console.log('\n✅ Test completed successfully!');
    console.log('\n💡 To publish this to Nostr for real testing:');
    console.log('   1. Set up your nsec in the app');
    console.log('   2. Complete a workout or use manual entry');
    console.log('   3. Tap "Post to Nostr" to see it live');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testKind1Format().then(() => {
  console.log('\n🎉 Format test complete!');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});