/**
 * Integration Test Script for RUNSTR Teams, Leagues, and Events
 * Run this script to verify all critical functionality is working
 *
 * Usage: node test-integration.js
 */

const chalk = require('chalk'); // npm install chalk

// Test configuration
const config = {
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.primal.net',
    'wss://nostr.wine'
  ],
  timeout: 5000,
  verbose: true
};

// Test Suite
class RunstrIntegrationTest {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  // Test 1: Verify Authentication System
  async testAuthentication() {
    console.log(chalk.blue('\n📋 Test 1: Authentication System'));

    try {
      // Check if authentication data can be retrieved
      const { getAuthenticationData } = require('./src/utils/nostrAuth');
      const authData = await getAuthenticationData();

      if (!authData) {
        this.fail('Authentication', 'No authentication data found - user needs to log in');
        return false;
      }

      if (!authData.nsec || !authData.npub || !authData.hexPubkey) {
        this.fail('Authentication', 'Incomplete authentication data');
        return false;
      }

      this.pass('Authentication', `User authenticated as ${authData.npub.slice(0, 20)}...`);
      return true;
    } catch (error) {
      this.fail('Authentication', error.message);
      return false;
    }
  }

  // Test 2: Team Creation with Member List
  async testTeamCreation() {
    console.log(chalk.blue('\n📋 Test 2: Team Creation with Kind 30000 List'));

    try {
      const NostrTeamCreationService = require('./src/services/nostr/NostrTeamCreationService').default;
      const { getAuthenticationData } = require('./src/utils/nostrAuth');
      const { nsecToPrivateKey } = require('./src/utils/nostr');

      const authData = await getAuthenticationData();
      if (!authData) {
        this.skip('Team Creation', 'Authentication required');
        return false;
      }

      const privateKey = nsecToPrivateKey(authData.nsec);

      // Test team data
      const testTeam = {
        name: `Test Team ${Date.now()}`,
        about: 'Integration test team',
        captainNpub: authData.npub,
        captainHexPubkey: authData.hexPubkey,
        activityType: 'Running',
        isPublic: true
      };

      console.log(chalk.gray(`Creating team: ${testTeam.name}`));

      const result = await NostrTeamCreationService.getInstance().createTeam(
        testTeam,
        privateKey
      );

      if (!result.success) {
        this.fail('Team Creation', result.error || 'Failed to create team');
        return false;
      }

      if (!result.teamId || !result.teamEvent || !result.memberListEvent) {
        this.fail('Team Creation', 'Incomplete team creation result');
        return false;
      }

      this.pass('Team Creation', `Team created: ${result.teamId}`);
      this.pass('Member List', 'Kind 30000 list created automatically');

      // Store team ID for later tests
      this.testTeamId = result.teamId;
      this.captainHex = authData.hexPubkey;

      return true;
    } catch (error) {
      this.fail('Team Creation', error.message);
      return false;
    }
  }

  // Test 3: League Creation
  async testLeagueCreation() {
    console.log(chalk.blue('\n📋 Test 3: League Creation (Kind 30100)'));

    if (!this.testTeamId) {
      this.skip('League Creation', 'Team creation required first');
      return false;
    }

    try {
      const { NostrCompetitionService } = require('./src/services/nostr/NostrCompetitionService');
      const { getAuthenticationData } = require('./src/utils/nostrAuth');
      const { nsecToPrivateKey } = require('./src/utils/nostr');

      const authData = await getAuthenticationData();
      if (!authData) {
        this.skip('League Creation', 'Authentication required');
        return false;
      }

      const privateKey = nsecToPrivateKey(authData.nsec);

      const leagueData = {
        teamId: this.testTeamId,
        name: `Test League ${Date.now()}`,
        description: 'Integration test league',
        activityType: 'Running',
        competitionType: 'Total Distance',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 7,
        entryFeesSats: 0,
        maxParticipants: 50,
        requireApproval: false,
        allowLateJoining: true,
        scoringFrequency: 'daily'
      };

      console.log(chalk.gray(`Creating league: ${leagueData.name}`));

      const result = await NostrCompetitionService.createLeague(
        leagueData,
        privateKey
      );

      if (!result.success) {
        this.fail('League Creation', result.message || 'Failed to create league');
        return false;
      }

      if (!result.competitionId) {
        this.fail('League Creation', 'No competition ID returned');
        return false;
      }

      this.pass('League Creation', `League created: ${result.competitionId}`);
      this.testLeagueId = result.competitionId;

      return true;
    } catch (error) {
      this.fail('League Creation', error.message);
      return false;
    }
  }

  // Test 4: Event Creation
  async testEventCreation() {
    console.log(chalk.blue('\n📋 Test 4: Event Creation (Kind 30101)'));

    if (!this.testTeamId) {
      this.skip('Event Creation', 'Team creation required first');
      return false;
    }

    try {
      const { NostrCompetitionService } = require('./src/services/nostr/NostrCompetitionService');
      const { getAuthenticationData } = require('./src/utils/nostrAuth');
      const { nsecToPrivateKey } = require('./src/utils/nostr');

      const authData = await getAuthenticationData();
      if (!authData) {
        this.skip('Event Creation', 'Authentication required');
        return false;
      }

      const privateKey = nsecToPrivateKey(authData.nsec);

      const eventData = {
        teamId: this.testTeamId,
        name: `Test Event ${Date.now()}`,
        description: 'Integration test event',
        activityType: 'Running',
        competitionType: '5K Race',
        eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        entryFeesSats: 0,
        maxParticipants: 30,
        requireApproval: false,
        targetValue: 5,
        targetUnit: 'km'
      };

      console.log(chalk.gray(`Creating event: ${eventData.name}`));

      const result = await NostrCompetitionService.createEvent(
        eventData,
        privateKey
      );

      if (!result.success) {
        this.fail('Event Creation', result.message || 'Failed to create event');
        return false;
      }

      if (!result.competitionId) {
        this.fail('Event Creation', 'No competition ID returned');
        return false;
      }

      this.pass('Event Creation', `Event created: ${result.competitionId}`);
      this.testEventId = result.competitionId;

      return true;
    } catch (error) {
      this.fail('Event Creation', error.message);
      return false;
    }
  }

  // Test 5: Member List Query
  async testMemberListQuery() {
    console.log(chalk.blue('\n📋 Test 5: Member List Query'));

    if (!this.testTeamId || !this.captainHex) {
      this.skip('Member List Query', 'Team creation required first');
      return false;
    }

    try {
      const TeamMemberCache = require('./src/services/team/TeamMemberCache').default;

      console.log(chalk.gray(`Querying members for team: ${this.testTeamId}`));

      const members = await TeamMemberCache.getTeamMembers(
        this.testTeamId,
        this.captainHex
      );

      if (!members || !Array.isArray(members)) {
        this.fail('Member List Query', 'Failed to retrieve member list');
        return false;
      }

      if (members.length === 0) {
        this.warn('Member List Query', 'Member list is empty (should have captain at least)');
        return false;
      }

      this.pass('Member List Query', `Retrieved ${members.length} member(s)`);

      // Verify captain is in the list
      if (!members.includes(this.captainHex)) {
        this.warn('Member List Query', 'Captain not found in member list');
      }

      return true;
    } catch (error) {
      this.fail('Member List Query', error.message);
      return false;
    }
  }

  // Test 6: Competition Query
  async testCompetitionQuery() {
    console.log(chalk.blue('\n📋 Test 6: Competition Query'));

    if (!this.testTeamId) {
      this.skip('Competition Query', 'Team creation required first');
      return false;
    }

    try {
      const NostrCompetitionService = require('./src/services/nostr/NostrCompetitionService').default;

      console.log(chalk.gray(`Querying competitions for team: ${this.testTeamId}`));

      const result = await NostrCompetitionService.queryCompetitions({
        kinds: [30100, 30101],
        '#team': [this.testTeamId],
        limit: 100
      });

      if (!result) {
        this.fail('Competition Query', 'Failed to query competitions');
        return false;
      }

      const totalComps = result.leagues.length + result.events.length;

      if (totalComps === 0) {
        this.warn('Competition Query', 'No competitions found (may not have propagated yet)');
      } else {
        this.pass('Competition Query', `Found ${result.leagues.length} leagues, ${result.events.length} events`);
      }

      return true;
    } catch (error) {
      this.fail('Competition Query', error.message);
      return false;
    }
  }

  // Test 7: Workout Query for Leaderboards
  async testWorkoutQuery() {
    console.log(chalk.blue('\n📋 Test 7: Workout Query (Kind 1301)'));

    if (!this.testTeamId || !this.captainHex) {
      this.skip('Workout Query', 'Team creation required first');
      return false;
    }

    try {
      const Competition1301QueryService = require('./src/services/competition/Competition1301QueryService').default;

      console.log(chalk.gray('Querying workouts for competition...'));

      const query = {
        teamId: this.testTeamId,
        captainPubkey: this.captainHex,
        activityType: 'Running',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      };

      const result = await Competition1301QueryService.queryMemberWorkouts(query);

      if (!result) {
        this.fail('Workout Query', 'Failed to query workouts');
        return false;
      }

      if (result.error) {
        this.warn('Workout Query', result.error);
        return false;
      }

      this.pass('Workout Query', `Query completed in ${result.queryTime}ms, found ${result.totalWorkouts} workouts`);

      return true;
    } catch (error) {
      this.fail('Workout Query', error.message);
      return false;
    }
  }

  // Helper methods
  pass(test, message) {
    console.log(chalk.green(`✅ ${test}: ${message}`));
    this.results.passed.push({ test, message });
  }

  fail(test, message) {
    console.log(chalk.red(`❌ ${test}: ${message}`));
    this.results.failed.push({ test, message });
  }

  warn(test, message) {
    console.log(chalk.yellow(`⚠️  ${test}: ${message}`));
    this.results.warnings.push({ test, message });
  }

  skip(test, message) {
    console.log(chalk.gray(`⏭️  ${test}: ${message}`));
  }

  // Run all tests
  async runAll() {
    console.log(chalk.bold.cyan('\n🏃 RUNSTR Integration Test Suite\n'));
    console.log(chalk.gray('Testing teams, leagues, events, and competitions...\n'));

    const startTime = Date.now();

    // Run tests in sequence
    await this.testAuthentication();
    await this.testTeamCreation();
    await this.testLeagueCreation();
    await this.testEventCreation();
    await this.testMemberListQuery();
    await this.testCompetitionQuery();
    await this.testWorkoutQuery();

    // Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(chalk.bold.cyan('\n📊 Test Summary\n'));
    console.log(chalk.green(`Passed: ${this.results.passed.length}`));
    console.log(chalk.red(`Failed: ${this.results.failed.length}`));
    console.log(chalk.yellow(`Warnings: ${this.results.warnings.length}`));
    console.log(chalk.gray(`Duration: ${duration}s`));

    if (this.results.failed.length > 0) {
      console.log(chalk.bold.red('\n❌ Failed Tests:'));
      this.results.failed.forEach(({ test, message }) => {
        console.log(chalk.red(`  - ${test}: ${message}`));
      });
    }

    if (this.results.warnings.length > 0) {
      console.log(chalk.bold.yellow('\n⚠️  Warnings:'));
      this.results.warnings.forEach(({ test, message }) => {
        console.log(chalk.yellow(`  - ${test}: ${message}`));
      });
    }

    // Exit code based on failures
    process.exit(this.results.failed.length > 0 ? 1 : 0);
  }
}

// Run the test suite
if (require.main === module) {
  const tester = new RunstrIntegrationTest();
  tester.runAll().catch(error => {
    console.error(chalk.bold.red('Fatal error:'), error);
    process.exit(1);
  });
}

module.exports = RunstrIntegrationTest;