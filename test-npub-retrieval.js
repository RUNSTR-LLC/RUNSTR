/**
 * Test script to compare npub retrieval methods
 * Tests both the failing navigation handler approach and the working DirectNostrProfileService approach
 */

const { getNpubFromStorage } = require('./src/utils/nostr');
const { DirectNostrProfileService } = require('./src/services/user/directNostrProfileService');

console.log('🧪 Testing npub retrieval methods...\n');

async function testNpubRetrieval() {
  try {
    console.log('1. Testing getNpubFromStorage() directly (navigation handler method):');
    const directResult = await getNpubFromStorage();
    console.log('   Result:', directResult ? directResult.slice(0, 20) + '...' : 'null/undefined');
    console.log('   Type:', typeof directResult);
    console.log('   Truthy:', !!directResult);
    
    console.log('\n2. Testing DirectNostrProfileService.getStoredNpub() (working method):');
    const serviceResult = await DirectNostrProfileService.getStoredNpub();
    console.log('   Result:', serviceResult ? serviceResult.slice(0, 20) + '...' : 'null/undefined');
    console.log('   Type:', typeof serviceResult);
    console.log('   Truthy:', !!serviceResult);
    
    console.log('\n3. Comparison:');
    console.log('   Same result?', directResult === serviceResult);
    console.log('   Both null?', !directResult && !serviceResult);
    console.log('   Both have values?', !!directResult && !!serviceResult);
    
    if (directResult && serviceResult) {
      console.log('   Values match?', directResult === serviceResult);
    }
    
    console.log('\n4. Testing hasValidNostrCredentials():');
    const hasValid = await DirectNostrProfileService.hasValidNostrCredentials();
    console.log('   Has valid credentials?', hasValid);
    
    console.log('\n5. Testing DirectNostrProfileService.getCurrentUserProfile():');
    const profile = await DirectNostrProfileService.getCurrentUserProfile();
    console.log('   Profile loaded?', !!profile);
    if (profile) {
      console.log('   Profile npub:', profile.npub ? profile.npub.slice(0, 20) + '...' : 'missing');
      console.log('   Profile name:', profile.name);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testNpubRetrieval()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });