#!/usr/bin/env node

/**
 * Test App Team Discovery - Uses EXACT same code as the Teams tab
 * This script imports and uses the actual NostrTeamService from the app
 * to verify our fixes are working correctly
 */

// Import the exact service the app uses
const { NostrTeamService } = require('./src/services/nostr/NostrTeamService');

async function testAppTeamDiscovery() {
  console.log('🧪 TESTING APP TEAM DISCOVERY - EXACT SAME CODE PATH');
  console.log('=' .repeat(60));
  
  try {
    // Create the same service instance the app uses
    const nostrTeamService = new NostrTeamService();
    
    console.log('📱 Using NostrTeamService.discoverFitnessTeams() - SAME AS TEAMS TAB');
    console.log('⏰ Starting team discovery...');
    
    // Call the EXACT same method as TeamDiscoveryScreen line 154
    const teams = await nostrTeamService.discoverFitnessTeams({
      limit: 50, // Same parameters as app
    });
    
    console.log('\n🎯 RESULTS:');
    console.log('=' .repeat(40));
    console.log(`Found ${teams.length} teams (should be 7-8 if fixes worked)`);
    
    if (teams.length === 0) {
      console.log('❌ NO TEAMS FOUND - Something is wrong');
      console.log('This suggests either:');
      console.log('  • Network/relay connectivity issues');
      console.log('  • Validation is still too restrictive');
      console.log('  • Service import/compilation issue');
    } else if (teams.length <= 3) {
      console.log('⚠️  STILL ONLY FINDING 3 TEAMS - Fixes may not be active');
      console.log('This suggests:');
      console.log('  • App needs to be restarted/rebuilt');
      console.log('  • Service caching issue');
      console.log('  • Fixes were not applied correctly');
    } else {
      console.log('✅ SUCCESS! Found more than 3 teams - fixes are working!');
    }
    
    console.log('\n📋 TEAM LIST:');
    teams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name}`);
      console.log(`   ID: ${team.id}`);
      console.log(`   Captain: ${team.captainId.substring(0, 16)}...`);
      console.log(`   Members: ${team.memberCount}`);
      console.log(`   Activity: ${team.activityType}`);
      console.log(`   Created: ${new Date(team.createdAt * 1000).toLocaleDateString()}`);
      console.log('');
    });
    
    // Test cached teams (what the app actually uses)
    console.log('\n💾 CACHED TEAMS (what app actually displays):');
    const cachedTeams = nostrTeamService.getCachedTeams();
    console.log(`Cached: ${cachedTeams.length} teams`);
    
    if (cachedTeams.length !== teams.length) {
      console.log('⚠️  Cache mismatch detected!');
    }
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Full error:', error);
  }
}

// Main execution
if (require.main === module) {
  testAppTeamDiscovery()
    .then(() => {
      console.log('\n🏁 Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}