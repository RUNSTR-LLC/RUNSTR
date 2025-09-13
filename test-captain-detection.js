#!/usr/bin/env node
/**
 * Test script to verify captain detection logic and hex/npub format handling
 */

// Import required modules
const { nip19 } = require('nostr-tools');

// Mock team data based on the Nostr event structure you provided
const mockNostrTeamEvent = {
  kind: 33404,
  content: "RUNSTR - Elite running community for competitive athletes",
  tags: [
    ["d", "runstr-team-uuid-123"],
    ["name", "RUNSTR"],
    ["type", "running_club"],
    ["location", "Global"],
    ["captain", "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"], // 64-char hex
    ["member", "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"],
    ["member", "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"],
    ["public", "true"],
    ["t", "team"],
    ["t", "running"]
  ]
};

// Simulate current team utils logic (before fix)
function isTeamCaptainOld(userNpub, team) {
  if (!userNpub || !team) return false;
  
  // This is what we currently do - direct string comparison
  if ('captainNpub' in team && team.captainNpub) {
    return team.captainNpub === userNpub;
  }
  if ('captainId' in team && team.captainId) {
    return team.captainId === userNpub;
  }
  return false;
}

// Extract captain from Nostr event (current logic)
function getCaptainFromTeamEventOld(teamEvent) {
  const captainTag = teamEvent.tags.find(tag => tag[0] === 'captain');
  return captainTag ? captainTag[1] : null; // Returns hex format
}

// New logic with proper hex/npub conversion
function getCaptainFromTeamEventNew(teamEvent) {
  const captainTag = teamEvent.tags.find(tag => tag[0] === 'captain');
  if (!captainTag || !captainTag[1]) return null;
  
  const hexPubkey = captainTag[1];
  try {
    // Convert hex to npub format
    return nip19.npubEncode(hexPubkey);
  } catch (error) {
    console.error('Failed to convert hex to npub:', error);
    return null;
  }
}

// New captain detection with format handling
function isTeamCaptainNew(userNpub, team) {
  if (!userNpub || !team) return false;
  
  const captainId = 'captainNpub' in team ? team.captainNpub :
                    'captainId' in team ? team.captainId : null;
  
  if (!captainId) return false;
  
  // Handle both formats
  try {
    // If userNpub is npub format and captainId is hex, convert hex to npub
    if (userNpub.startsWith('npub1') && !captainId.startsWith('npub1') && captainId.length === 64) {
      const captainNpub = nip19.npubEncode(captainId);
      return captainNpub === userNpub;
    }
    
    // If both are same format, direct comparison
    if ((userNpub.startsWith('npub1') && captainId.startsWith('npub1')) ||
        (!userNpub.startsWith('npub1') && !captainId.startsWith('npub1'))) {
      return captainId === userNpub;
    }
    
    // If userNpub is hex and captainId is npub, convert npub to hex
    if (!userNpub.startsWith('npub1') && captainId.startsWith('npub1')) {
      const { data: userHex } = nip19.decode(captainId);
      return userHex === userNpub;
    }
  } catch (error) {
    console.error('Error in captain detection:', error);
    return false;
  }
  
  return false;
}

// Test function
function runTests() {
  console.log('🧪 Testing Captain Detection Logic\n');
  
  // Extract captain from mock event
  const captainHex = getCaptainFromTeamEventOld(mockNostrTeamEvent);
  const captainNpub = getCaptainFromTeamEventNew(mockNostrTeamEvent);
  
  console.log('📋 Team Data:');
  console.log('  Captain (hex):', captainHex);
  console.log('  Captain (npub):', captainNpub);
  console.log('');
  
  // Create mock team objects
  const teamWithHex = {
    id: 'runstr-team-uuid-123',
    name: 'RUNSTR',
    captainId: captainHex, // hex format
    description: 'Elite running community'
  };
  
  const teamWithNpub = {
    id: 'runstr-team-uuid-123',
    name: 'RUNSTR',
    captainId: captainNpub, // npub format
    description: 'Elite running community'
  };
  
  // Test scenarios
  const testScenarios = [
    {
      name: 'User npub vs Team hex (current broken logic)',
      userNpub: captainNpub,
      team: teamWithHex,
      expectedOld: false,
      expectedNew: true
    },
    {
      name: 'User npub vs Team npub (should work)',
      userNpub: captainNpub,
      team: teamWithNpub,
      expectedOld: true,
      expectedNew: true
    },
    {
      name: 'User hex vs Team hex (should work)',
      userNpub: captainHex,
      team: teamWithHex,
      expectedOld: true,
      expectedNew: true
    },
    {
      name: 'Wrong user (should fail)',
      userNpub: 'npub1wronguserhere123456789012345678901234567890123456789012345',
      team: teamWithNpub,
      expectedOld: false,
      expectedNew: false
    }
  ];
  
  console.log('🔍 Test Results:\n');
  
  testScenarios.forEach((scenario, index) => {
    const oldResult = isTeamCaptainOld(scenario.userNpub, scenario.team);
    const newResult = isTeamCaptainNew(scenario.userNpub, scenario.team);
    
    const oldStatus = oldResult === scenario.expectedOld ? '✅' : '❌';
    const newStatus = newResult === scenario.expectedNew ? '✅' : '❌';
    
    console.log(`${index + 1}. ${scenario.name}`);
    console.log(`   User: ${scenario.userNpub.slice(0, 20)}...`);
    console.log(`   Team Captain: ${scenario.team.captainId.slice(0, 20)}...`);
    console.log(`   Old Logic: ${oldResult} ${oldStatus} (expected ${scenario.expectedOld})`);
    console.log(`   New Logic: ${newResult} ${newStatus} (expected ${scenario.expectedNew})`);
    console.log('');
  });
  
  // Summary
  console.log('📊 Summary:');
  console.log('The main issue is that Nostr events store captain pubkeys in hex format,');
  console.log('but our UI expects npub format. The old logic fails when formats dont match.');
  console.log('The new logic handles format conversion automatically.');
  console.log('');
  console.log('🔧 Action needed: Update isTeamCaptain() in teamUtils.ts with format conversion logic');
}

// Run the tests
try {
  runTests();
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}