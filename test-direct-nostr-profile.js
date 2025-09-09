/**
 * Test Direct Nostr Profile Service
 * Verify that our pure Nostr profile implementation can retrieve stored npub and fetch profile data
 */

// Mock React Native dependencies
global.AsyncStorage = {
  getItem: async (key) => {
    // Simulate stored npub - replace with actual stored value if testing with real data
    if (key === '@runstr:npub') {
      // Use the test npub from previous tests
      return 'npub1j8y6tcdfw3q3f3h794s6un7k97u7v0p8kkfqw4qvmwjcr5c2rng8jh8z6r';
    }
    return null;
  },
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
  getAllKeys: async () => [],
  multiGet: async () => [],
  multiSet: async () => {},
  multiRemove: async () => {}
};

async function testDirectNostrProfile() {
  console.log('🧪 Testing DirectNostrProfileService...\n');
  
  try {
    // Import the service
    const { DirectNostrProfileService } = require('./src/services/user/directNostrProfileService');
    
    console.log('Step 1: Check if user has valid stored Nostr credentials');
    console.log('=========================================================');
    
    const hasCredentials = await DirectNostrProfileService.hasValidNostrCredentials();
    console.log('✅ Has valid credentials:', hasCredentials);
    
    if (!hasCredentials) {
      console.log('❌ No valid Nostr credentials found. Make sure user is logged in with Nostr.');
      return;
    }
    
    console.log('\nStep 2: Get stored npub');
    console.log('=======================');
    
    const storedNpub = await DirectNostrProfileService.getStoredNpub();
    console.log('✅ Stored npub:', storedNpub?.slice(0, 20) + '...');
    
    if (!storedNpub) {
      console.log('❌ No stored npub found');
      return;
    }
    
    console.log('\nStep 3: Get complete user profile from DirectNostrProfileService');
    console.log('================================================================');
    
    const userProfile = await DirectNostrProfileService.getCurrentUserProfile();
    
    if (userProfile) {
      console.log('✅ DirectNostrProfileService returned complete user profile:');
      console.log('   - ID:', userProfile.id);
      console.log('   - Name:', userProfile.name);
      console.log('   - Display Name:', userProfile.displayName);
      console.log('   - Picture:', userProfile.picture ? 'Available' : 'Not available');
      console.log('   - Banner:', userProfile.banner ? 'Available' : 'Not available');  
      console.log('   - Bio:', userProfile.bio ? userProfile.bio.substring(0, 50) + '...' : 'Not available');
      console.log('   - Lightning Address:', userProfile.lud16 || 'Not available');
      console.log('   - Website:', userProfile.website || 'Not available');
      console.log('   - Role:', userProfile.role);
      console.log('   - Wallet Balance:', userProfile.walletBalance);
      console.log('   - Has Wallet Credentials:', userProfile.hasWalletCredentials);
      
      console.log('\nStep 4: Verify ProfileHeader compatibility');
      console.log('==========================================');
      
      // Check what ProfileHeader component would see
      const profileHeaderData = {
        displayName: userProfile.displayName || userProfile.name,
        picture: userProfile.picture,
        banner: userProfile.banner,
        bio: userProfile.bio,
        lud16: userProfile.lud16,
        website: userProfile.website
      };
      
      console.log('✅ Data that ProfileHeader would receive:');
      console.log('   - Display Name:', profileHeaderData.displayName);
      console.log('   - Avatar Image:', profileHeaderData.picture ? 'Yes' : 'No');
      console.log('   - Banner Image:', profileHeaderData.banner ? 'Yes' : 'No');
      console.log('   - Bio Text:', profileHeaderData.bio ? 'Yes' : 'No');
      console.log('   - Lightning Address:', profileHeaderData.lud16 ? 'Yes' : 'No');
      console.log('   - Website:', profileHeaderData.website ? 'Yes' : 'No');
      
      if (profileHeaderData.displayName && profileHeaderData.picture && profileHeaderData.bio) {
        console.log('\n🎉 SUCCESS: All profile data should be visible in the app!');
        console.log('The ProfileHeader component should display:');
        console.log(`   - Name: "${profileHeaderData.displayName}"`);
        console.log(`   - Avatar: ${profileHeaderData.picture || 'fallback'}`);
        console.log(`   - Banner: ${profileHeaderData.banner ? 'Background image' : 'No banner'}`);
        console.log(`   - Bio: "${profileHeaderData.bio?.substring(0, 100) + '...' || 'No bio'}"`);
        console.log(`   - Lightning: "${profileHeaderData.lud16 || 'No lightning address'}"`);
      } else {
        console.log('\n⚠️  WARNING: Some essential profile data is missing');
        if (!profileHeaderData.displayName) console.log('   - Missing display name');
        if (!profileHeaderData.picture) console.log('   - Missing avatar image');
        if (!profileHeaderData.bio) console.log('   - Missing bio text');
      }
      
    } else {
      console.log('❌ DirectNostrProfileService returned null');
      console.log('This indicates either:');
      console.log('   - No stored npub found');
      console.log('   - Error fetching Nostr profile data');
      console.log('   - Service implementation issue');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\nDebugging steps:');
    console.log('1. Verify user has logged in with Nostr and npub is stored');
    console.log('2. Check NostrProfileService is working correctly');
    console.log('3. Verify DirectNostrProfileService import paths');
  }
}

// Run the test
console.log('🔍 Direct Nostr Profile Service Test');
console.log('=====================================\n');
testDirectNostrProfile().catch(console.error);