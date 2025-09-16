/**
 * Test Script for Captain Dashboard Navigation
 * Run this to verify captain detection and navigation works correctly
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { nip19 } from 'nostr-tools';

export class CaptainFlowTester {
  /**
   * Test 1: Verify user identity formats
   */
  static async testUserIdentity() {
    console.log('\n🧪 TEST 1: User Identity Verification');
    console.log('=====================================');

    try {
      // Check stored user data
      const storedNpub = await AsyncStorage.getItem('npub');
      const storedNsec = await AsyncStorage.getItem('nsec');

      console.log('📱 Stored npub:', storedNpub ? storedNpub.slice(0, 20) + '...' : 'NOT FOUND');
      console.log('🔑 Stored nsec:', storedNsec ? 'EXISTS' : 'NOT FOUND');

      if (storedNpub) {
        // Convert npub to hex for comparison
        const decoded = nip19.decode(storedNpub);
        const hexPubkey = decoded.data as string;
        console.log('🔄 Hex pubkey:', hexPubkey.slice(0, 20) + '...');

        return { npub: storedNpub, hex: hexPubkey };
      }

      console.log('❌ No user identity found - not logged in?');
      return null;
    } catch (error) {
      console.error('❌ Error testing user identity:', error);
      return null;
    }
  }

  /**
   * Test 2: Check team captain data
   */
  static async testTeamCaptainData(teamId: string) {
    console.log('\n🧪 TEST 2: Team Captain Data');
    console.log('=============================');

    try {
      // Check cached team data if available
      const cachedTeams = await AsyncStorage.getItem('cached_teams');
      if (cachedTeams) {
        const teams = JSON.parse(cachedTeams);
        const team = teams.find((t: any) => t.id === teamId);

        if (team) {
          console.log('📋 Team found:', team.name);
          console.log('👑 Captain ID:', team.captainId ? team.captainId.slice(0, 20) + '...' : 'NOT SET');
          console.log('📝 Captain field exists:', 'captain' in team);
          console.log('📝 CaptainId field exists:', 'captainId' in team);
          console.log('📝 CaptainNpub field exists:', 'captainNpub' in team);

          return team;
        }
      }

      console.log('❌ Team not found in cache');
      return null;
    } catch (error) {
      console.error('❌ Error testing team data:', error);
      return null;
    }
  }

  /**
   * Test 3: Verify captain status cache
   */
  static async testCaptainCache(teamId: string) {
    console.log('\n🧪 TEST 3: Captain Cache Status');
    console.log('================================');

    try {
      const cacheKey = `captain_${teamId}`;
      const cachedStatus = await AsyncStorage.getItem(cacheKey);

      console.log('💾 Cached status:', cachedStatus);
      console.log('✅ Is captain:', cachedStatus === 'true');

      // Check captain teams list
      const captainTeamsList = await AsyncStorage.getItem('captain_teams_list');
      if (captainTeamsList) {
        const teams = JSON.parse(captainTeamsList);
        console.log('📋 Captain of teams:', teams);
        console.log('🔍 Includes this team:', teams.includes(teamId));
      }

      return cachedStatus === 'true';
    } catch (error) {
      console.error('❌ Error testing captain cache:', error);
      return false;
    }
  }

  /**
   * Test 4: Compare user and captain IDs
   */
  static async testCaptainComparison(userHex: string, teamCaptainId: string) {
    console.log('\n🧪 TEST 4: Captain ID Comparison');
    console.log('=================================');

    console.log('👤 User hex:', userHex.slice(0, 20) + '...');
    console.log('👑 Team captain:', teamCaptainId.slice(0, 20) + '...');

    const isMatch = userHex === teamCaptainId;
    console.log(isMatch ? '✅ IDs MATCH - User IS captain!' : '❌ IDs DO NOT MATCH - User is NOT captain');

    if (!isMatch) {
      // Check if one might be npub format
      if (teamCaptainId.startsWith('npub1')) {
        console.log('⚠️  Team captain ID is in npub format - needs conversion');
        try {
          const decoded = nip19.decode(teamCaptainId);
          const captainHex = decoded.data as string;
          const convertedMatch = userHex === captainHex;
          console.log('🔄 After conversion:', convertedMatch ? 'MATCH!' : 'Still no match');
          return convertedMatch;
        } catch (e) {
          console.log('❌ Failed to convert npub');
        }
      }
    }

    return isMatch;
  }

  /**
   * Run all tests for a specific team
   */
  static async runFullTest(teamId: string) {
    console.log('🚀 CAPTAIN FLOW TEST SUITE');
    console.log('===========================');
    console.log('Testing team:', teamId);

    // Test 1: Get user identity
    const userIdentity = await this.testUserIdentity();
    if (!userIdentity) {
      console.log('\n❌ FAIL: User not logged in properly');
      return false;
    }

    // Test 2: Get team data
    const team = await this.testTeamCaptainData(teamId);
    if (!team) {
      console.log('\n❌ FAIL: Team data not found');
      return false;
    }

    // Test 3: Check cache
    const cachedIsCaptain = await this.testCaptainCache(teamId);

    // Test 4: Compare IDs
    const captainId = team.captain || team.captainId || team.captainNpub;
    if (!captainId) {
      console.log('\n❌ FAIL: Team has no captain ID');
      return false;
    }

    const actualIsCaptain = await this.testCaptainComparison(userIdentity.hex, captainId);

    // Final verdict
    console.log('\n📊 FINAL RESULTS');
    console.log('================');
    console.log('🔍 Cached says captain:', cachedIsCaptain);
    console.log('🔍 Actual comparison:', actualIsCaptain);
    console.log('⚠️  Cache matches reality:', cachedIsCaptain === actualIsCaptain);

    if (cachedIsCaptain !== actualIsCaptain) {
      console.log('🔧 FIXING: Updating cache to correct value...');
      await AsyncStorage.setItem(`captain_${teamId}`, actualIsCaptain.toString());
    }

    return actualIsCaptain;
  }

  /**
   * Clear all captain-related caches (for testing)
   */
  static async clearCaptainCache() {
    console.log('\n🧹 Clearing captain cache...');

    const keys = await AsyncStorage.getAllKeys();
    const captainKeys = keys.filter(k => k.startsWith('captain_'));

    if (captainKeys.length > 0) {
      await AsyncStorage.multiRemove(captainKeys);
      console.log(`✅ Cleared ${captainKeys.length} captain cache entries`);
    }

    await AsyncStorage.removeItem('captain_teams_list');
    console.log('✅ Cleared captain teams list');
  }
}

// Export test runner for console
export const testCaptainFlow = async (teamId: string) => {
  const isCaptain = await CaptainFlowTester.runFullTest(teamId);

  if (isCaptain) {
    console.log('\n✅✅✅ SUCCESS: User SHOULD see Captain Dashboard button!');
  } else {
    console.log('\n❌❌❌ User should NOT see Captain Dashboard button');
  }

  return isCaptain;
};

// Export cache cleaner
export const clearCaptainCache = () => CaptainFlowTester.clearCaptainCache();