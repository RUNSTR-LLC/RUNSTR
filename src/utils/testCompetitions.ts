/**
 * In-App Competition Testing Utilities
 * These functions can be called from the app to test competition functionality
 */

import { getAuthenticationData } from './nostrAuth';
import { nsecToPrivateKey } from './nostr';
import { NostrCompetitionService } from '../services/nostr/NostrCompetitionService';
import NostrTeamCreationService from '../services/nostr/NostrTeamCreationService';
import TeamMemberCache from '../services/team/TeamMemberCache';
import Competition1301QueryService from '../services/competition/Competition1301QueryService';

export interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

export class CompetitionTester {
  private results: TestResult[] = [];
  private testTeamId?: string;
  private captainHex?: string;

  /**
   * Run all tests in sequence
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting competition system tests...');

    await this.testAuthentication();
    await this.testTeamCreation();
    await this.testLeagueCreation();
    await this.testEventCreation();
    await this.testMemberListQuery();
    await this.testCompetitionQuery();

    console.log(`✅ Tests complete: ${this.results.filter(r => r.success).length}/${this.results.length} passed`);

    return this.results;
  }

  /**
   * Test 1: Verify authentication is working
   */
  async testAuthentication(): Promise<TestResult> {
    const test = 'Authentication';

    try {
      const authData = await getAuthenticationData();

      if (!authData || !authData.nsec) {
        const result: TestResult = {
          test,
          success: false,
          message: 'No authentication data found - user needs to log in',
        };
        this.results.push(result);
        return result;
      }

      const result: TestResult = {
        test,
        success: true,
        message: `Authenticated as ${authData.npub.slice(0, 20)}...`,
        data: { npub: authData.npub, hasNsec: true },
      };
      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        test,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * Test 2: Create a test team with member list
   */
  async testTeamCreation(): Promise<TestResult> {
    const test = 'Team Creation';

    try {
      const authData = await getAuthenticationData();
      if (!authData) {
        const result: TestResult = {
          test,
          success: false,
          message: 'Authentication required',
        };
        this.results.push(result);
        return result;
      }

      const privateKey = nsecToPrivateKey(authData.nsec);
      const timestamp = Date.now();

      const teamData = {
        name: `Test Team ${timestamp}`,
        about: 'Automated test team',
        captainNpub: authData.npub,
        captainHexPubkey: authData.hexPubkey,
        activityType: 'Running',
        isPublic: true,
      };

      const createResult = await NostrTeamCreationService.createTeam(
        teamData,
        privateKey
      );

      if (!createResult.success) {
        const result: TestResult = {
          test,
          success: false,
          message: createResult.error || 'Failed to create team',
        };
        this.results.push(result);
        return result;
      }

      this.testTeamId = createResult.teamId;
      this.captainHex = authData.hexPubkey;

      const result: TestResult = {
        test,
        success: true,
        message: `Team created: ${createResult.teamId}`,
        data: {
          teamId: createResult.teamId,
          hasTeamEvent: !!createResult.teamEvent,
          hasMemberList: !!createResult.memberListEvent,
        },
      };
      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        test,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * Test 3: Create a test league
   */
  async testLeagueCreation(): Promise<TestResult> {
    const test = 'League Creation';

    if (!this.testTeamId) {
      const result: TestResult = {
        test,
        success: false,
        message: 'Team creation required first',
      };
      this.results.push(result);
      return result;
    }

    try {
      const authData = await getAuthenticationData();
      if (!authData) {
        const result: TestResult = {
          test,
          success: false,
          message: 'Authentication required',
        };
        this.results.push(result);
        return result;
      }

      const privateKey = nsecToPrivateKey(authData.nsec);
      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const leagueData = {
        teamId: this.testTeamId,
        name: `Test League ${Date.now()}`,
        description: 'Automated test league',
        activityType: 'Running' as const,
        competitionType: 'Total Distance' as const,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        duration: 7,
        entryFeesSats: 0,
        maxParticipants: 50,
        requireApproval: false,
        allowLateJoining: true,
        scoringFrequency: 'daily' as const,
      };

      const createResult = await NostrCompetitionService.createLeague(
        leagueData,
        privateKey
      );

      if (!createResult.success) {
        const result: TestResult = {
          test,
          success: false,
          message: createResult.message || 'Failed to create league',
        };
        this.results.push(result);
        return result;
      }

      const result: TestResult = {
        test,
        success: true,
        message: `League created: ${createResult.competitionId}`,
        data: {
          competitionId: createResult.competitionId,
          eventId: createResult.eventId,
        },
      };
      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        test,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * Test 4: Create a test event
   */
  async testEventCreation(): Promise<TestResult> {
    const test = 'Event Creation';

    if (!this.testTeamId) {
      const result: TestResult = {
        test,
        success: false,
        message: 'Team creation required first',
      };
      this.results.push(result);
      return result;
    }

    try {
      const authData = await getAuthenticationData();
      if (!authData) {
        const result: TestResult = {
          test,
          success: false,
          message: 'Authentication required',
        };
        this.results.push(result);
        return result;
      }

      const privateKey = nsecToPrivateKey(authData.nsec);
      const eventDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const eventData = {
        teamId: this.testTeamId,
        name: `Test Event ${Date.now()}`,
        description: 'Automated test event',
        activityType: 'Running' as const,
        competitionType: '5K Race' as const,
        eventDate: eventDate.toISOString(),
        entryFeesSats: 0,
        maxParticipants: 30,
        requireApproval: false,
        targetValue: 5,
        targetUnit: 'km',
      };

      const createResult = await NostrCompetitionService.createEvent(
        eventData,
        privateKey
      );

      if (!createResult.success) {
        const result: TestResult = {
          test,
          success: false,
          message: createResult.message || 'Failed to create event',
        };
        this.results.push(result);
        return result;
      }

      const result: TestResult = {
        test,
        success: true,
        message: `Event created: ${createResult.competitionId}`,
        data: {
          competitionId: createResult.competitionId,
          eventId: createResult.eventId,
        },
      };
      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        test,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * Test 5: Query team member list
   */
  async testMemberListQuery(): Promise<TestResult> {
    const test = 'Member List Query';

    if (!this.testTeamId || !this.captainHex) {
      const result: TestResult = {
        test,
        success: false,
        message: 'Team creation required first',
      };
      this.results.push(result);
      return result;
    }

    try {
      const members = await TeamMemberCache.getTeamMembers(
        this.testTeamId,
        this.captainHex
      );

      if (!members || !Array.isArray(members)) {
        const result: TestResult = {
          test,
          success: false,
          message: 'Failed to retrieve member list',
        };
        this.results.push(result);
        return result;
      }

      const result: TestResult = {
        test,
        success: true,
        message: `Retrieved ${members.length} member(s)`,
        data: {
          memberCount: members.length,
          hasCaptain: members.includes(this.captainHex),
        },
      };
      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        test,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * Test 6: Query competitions for team
   */
  async testCompetitionQuery(): Promise<TestResult> {
    const test = 'Competition Query';

    if (!this.testTeamId) {
      const result: TestResult = {
        test,
        success: false,
        message: 'Team creation required first',
      };
      this.results.push(result);
      return result;
    }

    try {
      const queryResult = await NostrCompetitionService.getInstance().queryCompetitions({
        kinds: [30100, 30101],
        '#team': [this.testTeamId],
        limit: 100,
      });

      const totalCount = queryResult.leagues.length + queryResult.events.length;

      const result: TestResult = {
        test,
        success: true,
        message: `Found ${queryResult.leagues.length} leagues, ${queryResult.events.length} events`,
        data: {
          leagues: queryResult.leagues.length,
          events: queryResult.events.length,
          total: totalCount,
        },
      };
      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        test,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * Get test results summary
   */
  getResults(): TestResult[] {
    return this.results;
  }

  /**
   * Get passed/failed counts
   */
  getSummary(): { passed: number; failed: number; total: number } {
    const passed = this.results.filter((r) => r.success).length;
    return {
      passed,
      failed: this.results.length - passed,
      total: this.results.length,
    };
  }
}

/**
 * Quick test function that can be called from anywhere in the app
 */
export async function quickTestCompetitions(): Promise<void> {
  console.log('🚀 Running quick competition tests...');

  const tester = new CompetitionTester();
  const results = await tester.runAllTests();
  const summary = tester.getSummary();

  console.log('\n📊 Test Results:');
  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.message}`);
    if (result.data) {
      console.log('   Data:', result.data);
    }
  });

  console.log(`\n📈 Summary: ${summary.passed}/${summary.total} tests passed`);

  if (summary.failed > 0) {
    console.warn('⚠️ Some tests failed. Check the logs above for details.');
  } else {
    console.log('🎉 All tests passed!');
  }
}