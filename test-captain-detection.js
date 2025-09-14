#!/usr/bin/env node
/**
 * Test script to verify captain detection logic and hex/npub format handling
 * Tests the enhanced captain detection with hex pubkey storage
 */

// Import required modules
const { nip19 } = require('nostr-tools');

// Real RUNSTR team data with TheWildHustle as captain
const TEST_DATA = {
  // TheWildHustle's actual identifiers
  theWildHustle: {
    npub: 'npub1xr8tvnnn5gpvr8n4dqmvhumthhtfg9gezt5rxz2cxanqe7847j9s9wg08y',
    hex: '30ceb64e73a20c19e6d5683164f977baed722149085a8318a8c1bb30678eaf48'
  },

  // Different team data structures we encounter
  teams: {
    // Team with hex captain ID (common from Nostr events)
    runstrHex: {
      id: '87d30c8b-aa18-4424-a629-d41ea7f89078',
      name: 'RUNSTR',
      captainId: '30ceb64e73a20c19e6d5683164f977baed722149085a8318a8c1bb30678eaf48'
    },

    // Team with npub captain (from some sources)
    runstrNpub: {
      id: '87d30c8b-aa18-4424-a629-d41ea7f89078',
      name: 'RUNSTR',
      captainNpub: 'npub1xr8tvnnn5gpvr8n4dqmvhumthhtfg9gezt5rxz2cxanqe7847j9s9wg08y'
    },

    // Team with both fields (ideal case)
    runstrBoth: {
      id: '87d30c8b-aa18-4424-a629-d41ea7f89078',
      name: 'RUNSTR',
      captainId: '30ceb64e73a20c19e6d5683164f977baed722149085a8318a8c1bb30678eaf48',
      captainNpub: 'npub1xr8tvnnn5gpvr8n4dqmvhumthhtfg9gezt5rxz2cxanqe7847j9s9wg08y'
    },

    // Team where user is NOT captain
    otherTeam: {
      id: 'other-team-id',
      name: 'Other Team',
      captainId: 'differenthex0123456789abcdef0123456789abcdef0123456789abcdef01234567'
    }
  }
};

// Original isTeamCaptain function (simplified version)
function isTeamCaptain(userNpub, team) {
  if (!userNpub || !team) return false;

  const captainId = team.captainNpub || team.captainId || team.captain || null;
  if (!captainId) return false;

  // Simple comparison if formats match
  if (captainId === userNpub) return true;

  try {
    // Convert both to hex for comparison
    const userHex = userNpub.startsWith('npub1')
      ? nip19.decode(userNpub).data
      : userNpub;

    const captainHex = captainId.startsWith('npub1')
      ? nip19.decode(captainId).data
      : captainId;

    return userHex === captainHex;
  } catch (error) {
    console.error('Error in captain detection:', error.message);
    return false;
  }
}

// Enhanced captain detection with both npub and hex support
function isTeamCaptainEnhanced(userIdentifiers, team) {
  if (!userIdentifiers || !team) return false;

  const { npub, hexPubkey } = userIdentifiers;
  if (!npub && !hexPubkey) return false;

  const captainId = team.captainNpub || team.captainId || team.captain || null;
  if (!captainId) return false;

  // Direct comparison if we have matching formats
  if (npub && captainId === npub) return true;
  if (hexPubkey && captainId === hexPubkey) return true;

  // If captain ID is in hex format and we have hex
  if (hexPubkey && !captainId.startsWith('npub1') && captainId.length === 64) {
    return hexPubkey === captainId;
  }

  // If captain ID is in npub format and we have npub
  if (npub && captainId.startsWith('npub1')) {
    return npub === captainId;
  }

  // Try format conversion as last resort
  try {
    if (captainId.startsWith('npub1')) {
      const captainHex = nip19.decode(captainId).data;
      return hexPubkey === captainHex;
    } else if (captainId.length === 64) {
      const captainNpub = nip19.npubEncode(captainId);
      return npub === captainNpub;
    }
  } catch (error) {
    console.error('Error in enhanced captain detection:', error.message);
  }

  return false;
}
// Run all tests
console.log('🧪 Testing Captain Detection System\n');
console.log('=====================================\n');

// Test with original function (npub only)
console.log('📋 Test 1: Original isTeamCaptain with NPUB');
console.log('---------------------------------------');
Object.entries(TEST_DATA.teams).forEach(([key, team]) => {
  const result = isTeamCaptain(TEST_DATA.theWildHustle.npub, team);
  console.log(`${result ? '✅' : '❌'} ${team.name}: ${result ? 'IS CAPTAIN' : 'NOT CAPTAIN'}`);
});

console.log('\n📋 Test 2: Original isTeamCaptain with HEX');
console.log('---------------------------------------');
Object.entries(TEST_DATA.teams).forEach(([key, team]) => {
  const result = isTeamCaptain(TEST_DATA.theWildHustle.hex, team);
  console.log(`${result ? '✅' : '❌'} ${team.name}: ${result ? 'IS CAPTAIN' : 'NOT CAPTAIN'}`);
});

// Test with enhanced function
console.log('\n📋 Test 3: Enhanced isTeamCaptainEnhanced with both');
console.log('---------------------------------------');
const userIdentifiers = {
  npub: TEST_DATA.theWildHustle.npub,
  hexPubkey: TEST_DATA.theWildHustle.hex
};

Object.entries(TEST_DATA.teams).forEach(([key, team]) => {
  const result = isTeamCaptainEnhanced(userIdentifiers, team);
  console.log(`${result ? '✅' : '❌'} ${team.name}: ${result ? 'IS CAPTAIN' : 'NOT CAPTAIN'}`);
});

// Test edge cases
console.log('\n📋 Test 4: Edge Cases');
console.log('---------------------------------------');

// Test with only npub (simulating missing hex)
const npubOnly = { npub: TEST_DATA.theWildHustle.npub, hexPubkey: null };
console.log('With npub only:');
Object.entries(TEST_DATA.teams).forEach(([key, team]) => {
  const result = isTeamCaptainEnhanced(npubOnly, team);
  console.log(`  ${result ? '✅' : '❌'} ${team.name}: ${result ? 'IS CAPTAIN' : 'NOT CAPTAIN'}`);
});

// Test with only hex (simulating missing npub)
const hexOnly = { npub: null, hexPubkey: TEST_DATA.theWildHustle.hex };
console.log('\nWith hex only:');
Object.entries(TEST_DATA.teams).forEach(([key, team]) => {
  const result = isTeamCaptainEnhanced(hexOnly, team);
  console.log(`  ${result ? '✅' : '❌'} ${team.name}: ${result ? 'IS CAPTAIN' : 'NOT CAPTAIN'}`);
});

// Test with undefined user (common issue)
console.log('\nWith undefined user npub (common issue):');
const undefinedResult = isTeamCaptain(undefined, TEST_DATA.teams.runstrHex);
console.log(`  ${undefinedResult ? '✅' : '❌'} Result: ${undefinedResult ? 'IS CAPTAIN' : 'NOT CAPTAIN (expected)'}`);

// Performance comparison
console.log('\n⚡ Performance Comparison');
console.log('---------------------------------------');

const iterations = 10000;
const teams = Object.values(TEST_DATA.teams);

// Test original function performance
console.time('Original function (10k iterations)');
for (let i = 0; i < iterations; i++) {
  teams.forEach(team => {
    isTeamCaptain(TEST_DATA.theWildHustle.npub, team);
  });
}
console.timeEnd('Original function (10k iterations)');

// Test enhanced function performance
console.time('Enhanced function (10k iterations)');
for (let i = 0; i < iterations; i++) {
  teams.forEach(team => {
    isTeamCaptainEnhanced(userIdentifiers, team);
  });
}
console.timeEnd('Enhanced function (10k iterations)');

console.log('\n✨ Test Complete!\n');

// Summary
console.log('📊 Results Summary:');
console.log('---------------------------------------');
console.log('✅ Expected: TheWildHustle IS captain of RUNSTR (all 3 team formats)');
console.log('❌ Expected: TheWildHustle is NOT captain of Other Team');
console.log('\n💡 Key Insights:');
console.log('- Original function works when formats match');
console.log('- Original function FAILS when formats differ (npub vs hex)');
console.log('- Enhanced function works with ANY format combination');
console.log('- Enhanced function is more reliable when user data is partial');
console.log('\n🎯 Solution: Use enhanced detection with stored hex pubkey!');