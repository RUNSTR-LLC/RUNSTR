/**
 * Debug script to compare team data structures between working and non-working pages
 * This will help identify why discovery page works but individual team page doesn't
 */

console.log('🔍 Team Data Structure Comparison Debug Script\n');

// Mock the team data structures we expect to see
console.log('=== EXPECTED DATA STRUCTURES ===\n');

console.log('1. WORKING: Team Discovery Page (TeamCard.tsx)');
console.log('   Data source: NostrTeamService -> DiscoveryTeam');
console.log('   Expected structure:');
const workingTeamData = {
  id: 'team_id_123',
  name: 'RUNSTR',
  captain: '30ceb64e...', // hex format
  // OR
  captainId: '30ceb64e...', // hex format
  // OR  
  captainNpub: 'npub1...', // npub format
  description: 'Team description',
  memberCount: 5,
  prizePool: 10000
};
console.log(JSON.stringify(workingTeamData, null, 2));

console.log('\n2. FAILING: Individual Team Page (EnhancedTeamScreen.tsx)');
console.log('   Data source: Navigation -> AppNavigator -> EnhancedTeamScreen');
console.log('   Current structure (suspected issue):');
const failingTeamData = {
  id: 'team_id_123',
  name: 'RUNSTR', 
  // Missing captain fields? Or wrong format?
  captain: undefined,
  captainId: undefined,
  captainNpub: undefined,
  description: 'Team description',
  memberCount: 5,
  prizePool: 10000
};
console.log(JSON.stringify(failingTeamData, null, 2));

console.log('\n=== CAPTAIN DETECTION LOGIC ANALYSIS ===\n');

// Simulate the teamUtils.ts logic
function debugIsTeamCaptain(userNpub, team, context) {
  console.log(`\n--- ${context} ---`);
  console.log('Input userNpub:', userNpub ? userNpub.slice(0, 20) + '...' : 'null/undefined');
  console.log('Input team:', team ? {
    id: team.id,
    name: team.name,
    captain: team.captain ? team.captain.slice(0, 10) + '...' : 'missing',
    captainId: team.captainId ? team.captainId.slice(0, 10) + '...' : 'missing',
    captainNpub: team.captainNpub ? team.captainNpub.slice(0, 20) + '...' : 'missing',
  } : 'null/undefined');
  
  if (!userNpub || !team) {
    console.log('❌ Early return: missing userNpub or team');
    return false;
  }
  
  const captainId = 'captainId' in team ? team.captainId : team.captain;
  console.log('Extracted captainId:', captainId ? captainId.slice(0, 10) + '...' : 'missing');
  
  if (!captainId) {
    console.log('❌ Early return: no captainId found');
    return false;
  }
  
  // Format conversion logic
  if (userNpub.startsWith('npub1') && !captainId.startsWith('npub1') && captainId.length === 64) {
    console.log('🔄 Converting hex captainId to npub format for comparison...');
    try {
      // Simulated conversion (would use nip19.npubEncode in real code)
      const captainNpub = 'npub1converted...';
      console.log('Converted captainNpub:', captainNpub.slice(0, 20) + '...');
      const matches = captainNpub === userNpub;
      console.log(matches ? '✅ MATCH after conversion' : '❌ NO MATCH after conversion');
      return matches;
    } catch (error) {
      console.log('❌ Conversion error:', error.message);
      return false;
    }
  }
  
  const directMatch = captainId === userNpub;
  console.log(directMatch ? '✅ DIRECT MATCH' : '❌ NO DIRECT MATCH');
  return directMatch;
}

// Test with working scenario
console.log('\n=== SIMULATION TESTS ===');
const testUserNpub = 'npub1xr8tvnnnr9aqt9v...';

debugIsTeamCaptain(testUserNpub, workingTeamData, 'WORKING: Discovery Page');
debugIsTeamCaptain(testUserNpub, failingTeamData, 'FAILING: Individual Page');

console.log('\n=== DEBUGGING STEPS NEEDED ===\n');
console.log('1. Add console.log to AppNavigator.tsx line ~193 to see actual team data being passed');
console.log('2. Add console.log to EnhancedTeamScreen.tsx to see team data received');  
console.log('3. Add console.log to TeamCard.tsx to see team data that works');
console.log('4. Compare the actual structures side by side');
console.log('5. Identify which captain field is missing or has wrong format');

console.log('\n=== LIKELY FIXES (in order of probability) ===\n');
console.log('A. Navigation is losing captain data - fix AppNavigator.tsx data passing');
console.log('B. Team data has captain in different field name - update teamUtils.ts');
console.log('C. Individual page gets different data source - make it use same source as discovery');
console.log('D. Multiple hooks interfering - remove extra captain detection systems');

console.log('\n✅ Debug script completed - now add actual logging to the components');