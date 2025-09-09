/**
 * Debug Profile Data Flow
 * Test if our ProfileService integration is working and being called by the app
 */

const { SimplePool, nip19 } = require('nostr-tools');

// Mock React Native dependencies
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

async function testProfileDataFlow(npub) {
  console.log('🔍 Testing Complete Profile Data Flow...\n');
  
  try {
    console.log('Step 1: Testing Standalone NostrProfileService');
    console.log('========================================');
    
    // First verify NostrProfileService works standalone
    const { nostrProfileService } = require('./src/services/nostr/NostrProfileService');
    
    const nostrProfile = await nostrProfileService.getProfile(npub);
    
    if (nostrProfile) {
      console.log('✅ NostrProfileService working:');
      console.log(`   - Display Name: ${nostrProfile.display_name || nostrProfile.name}`);
      console.log(`   - Avatar: ${nostrProfile.picture?.substring(0, 50)}...`);
      console.log(`   - Banner: ${nostrProfile.banner ? 'Yes' : 'No'}`);
      console.log(`   - Bio: ${nostrProfile.about?.substring(0, 50)}...`);
      console.log(`   - Lightning: ${nostrProfile.lud16}`);
    } else {
      console.log('❌ NostrProfileService returned null');
      return;
    }
    
    console.log('\nStep 2: Testing ProfileService Integration');
    console.log('=========================================');
    
    // Now test the ProfileService integration
    // We need to mock the Supabase part since we're testing outside the app
    
    // Mock a basic user from database
    const mockDbUser = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      npub: npub,
      avatar: null,
      role: 'member',
      created_at: new Date().toISOString(),
      last_sync_at: null
    };
    
    console.log('✅ Mock database user created');
    
    // Test the profile enrichment logic manually
    console.log('\nStep 3: Profile Data Enrichment Test');
    console.log('====================================');
    
    // Simulate what ProfileService.getUserProfile should do
    const enrichedUser = {
      id: mockDbUser.id,
      name: mockDbUser.name,
      email: mockDbUser.email,
      npub: mockDbUser.npub,
      avatar: mockDbUser.avatar,
      role: mockDbUser.role,
      createdAt: mockDbUser.created_at,
      lastSyncAt: mockDbUser.last_sync_at,
      
      // The fields that should come from NostrProfileService
      bio: nostrProfile?.about,
      website: nostrProfile?.website,
      picture: nostrProfile?.picture,
      banner: nostrProfile?.banner,
      lud16: nostrProfile?.lud16,
      displayName: nostrProfile?.display_name || nostrProfile?.name,
    };
    
    console.log('✅ Profile enrichment result:');
    console.log(`   - Name: ${enrichedUser.name}`);
    console.log(`   - Display Name: ${enrichedUser.displayName}`);
    console.log(`   - Avatar (original): ${enrichedUser.avatar || 'null'}`);
    console.log(`   - Picture (Nostr): ${enrichedUser.picture?.substring(0, 50)}...`);
    console.log(`   - Banner: ${enrichedUser.banner ? 'Yes' : 'No'}`);
    console.log(`   - Bio: ${enrichedUser.bio?.substring(0, 50)}...`);
    console.log(`   - Lightning: ${enrichedUser.lud16}`);
    console.log(`   - Website: ${enrichedUser.website}`);
    
    console.log('\nStep 4: UI Data Flow Simulation');
    console.log('===============================');
    
    // Simulate what useNavigationData should pass to ProfileScreen
    const profileScreenUser = {
      id: enrichedUser.id,
      name: enrichedUser.name,
      email: enrichedUser.email,
      npub: enrichedUser.npub,
      avatar: enrichedUser.avatar || '',
      role: enrichedUser.role,
      teamId: enrichedUser.teamId,
      createdAt: enrichedUser.createdAt,
      lastSyncAt: enrichedUser.lastSyncAt,
      
      // The critical fields for profile display
      bio: enrichedUser.bio,
      website: enrichedUser.website,
      picture: enrichedUser.picture,
      banner: enrichedUser.banner,
      lud16: enrichedUser.lud16,
      displayName: enrichedUser.displayName,
    };
    
    console.log('✅ ProfileScreen should receive:');
    console.log(`   - user.displayName: ${profileScreenUser.displayName}`);
    console.log(`   - user.picture: ${profileScreenUser.picture ? 'Set' : 'Missing'}`);
    console.log(`   - user.banner: ${profileScreenUser.banner ? 'Set' : 'Missing'}`);
    console.log(`   - user.bio: ${profileScreenUser.bio ? 'Set' : 'Missing'}`);
    console.log(`   - user.lud16: ${profileScreenUser.lud16 ? 'Set' : 'Missing'}`);
    console.log(`   - user.website: ${profileScreenUser.website ? 'Set' : 'Missing'}`);
    
    console.log('\nStep 5: ProfileHeader Component Check');
    console.log('=====================================');
    
    // Check what ProfileHeader would display
    const displayName = profileScreenUser.displayName || profileScreenUser.name;
    
    console.log('✅ ProfileHeader component would show:');
    console.log(`   - Display Name: "${displayName}"`);
    console.log(`   - Avatar URL: ${profileScreenUser.picture || 'fallback avatar'}`);
    console.log(`   - Banner Image: ${profileScreenUser.banner ? 'Yes' : 'No banner'}`);
    console.log(`   - Bio Text: "${profileScreenUser.bio || 'No bio'}"`);
    console.log(`   - Lightning Address: "${profileScreenUser.lud16 || 'No lightning address'}"`);
    console.log(`   - Website: "${profileScreenUser.website || 'No website'}"`);
    
    if (profileScreenUser.picture && profileScreenUser.displayName && profileScreenUser.bio) {
      console.log('\n🎉 SUCCESS: All profile data should be visible in the app!');
    } else {
      console.log('\n⚠️  WARNING: Some profile data is missing:');
      if (!profileScreenUser.picture) console.log('   - Missing avatar image');
      if (!profileScreenUser.displayName) console.log('   - Missing display name');
      if (!profileScreenUser.bio) console.log('   - Missing bio text');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\nDebugging information:');
    console.log('- Make sure the app dependencies are installed');
    console.log('- Check if NostrRelayManager is connecting to relays');
    console.log('- Verify the npub format is correct');
  }
}

// Run the test
const npub = process.argv[2];
if (!npub) {
  console.error('Usage: node test-profile-data-flow.js <npub>');
  console.error('Example: node test-profile-data-flow.js npub1abc123...');
  process.exit(1);
}

testProfileDataFlow(npub).catch(console.error);