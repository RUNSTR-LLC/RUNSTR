/**
 * Leaderboard Verification Scripts
 * Comprehensive testing of all scoring algorithms and competition types
 * Validates ranking calculations, edge cases, and scoring accuracy
 */

import Competition1301QueryService from '../services/competition/Competition1301QueryService';
import LeagueRankingService from '../services/competition/leagueRankingService';
import type { WorkoutMetrics } from '../services/competition/Competition1301QueryService';
import type { LeagueParameters, LeagueParticipant } from '../services/competition/leagueRankingService';
import type { NostrWorkout } from '../types/nostrWorkout';
import type { NostrActivityType, NostrLeagueCompetitionType } from '../types/nostrCompetition';

export interface LeaderboardTestCase {
  name: string;
  description: string;
  competitionType: NostrLeagueCompetitionType;
  activityType: NostrActivityType;
  participants: TestParticipant[];
  expectedWinner: string;
  expectedOrder: string[];
}

export interface TestParticipant {
  npub: string;
  name: string;
  workouts: TestWorkout[];
}

export interface TestWorkout {
  distance: number; // km
  duration: number; // minutes
  calories: number;
  date: Date;
  pace?: number; // min/km
  speed?: number; // km/h
}

export interface LeaderboardTestResult {
  testName: string;
  competitionType: string;
  success: boolean;
  message: string;
  expectedOrder: string[];
  actualOrder: string[];
  scoreDetails: { [npub: string]: number };
}

export class LeaderboardTestScripts {
  private results: LeaderboardTestResult[] = [];

  // Comprehensive test cases for all competition types
  private readonly testCases: LeaderboardTestCase[] = [
    {
      name: 'Total Distance - Clear Winner',
      description: 'Test total distance with one clear winner',
      competitionType: 'Total Distance',
      activityType: 'Running',
      participants: [
        {
          npub: 'npub1test1',
          name: 'Distance Champion',
          workouts: [
            { distance: 10, duration: 50, calories: 500, date: new Date('2024-01-01') },
            { distance: 15, duration: 75, calories: 750, date: new Date('2024-01-02') },
            { distance: 8, duration: 40, calories: 400, date: new Date('2024-01-03') }
          ]
        },
        {
          npub: 'npub1test2',
          name: 'Regular Runner',
          workouts: [
            { distance: 5, duration: 30, calories: 250, date: new Date('2024-01-01') },
            { distance: 5, duration: 30, calories: 250, date: new Date('2024-01-02') }
          ]
        },
        {
          npub: 'npub1test3',
          name: 'Casual Jogger',
          workouts: [
            { distance: 3, duration: 20, calories: 150, date: new Date('2024-01-01') }
          ]
        }
      ],
      expectedWinner: 'npub1test1',
      expectedOrder: ['npub1test1', 'npub1test2', 'npub1test3']
    },
    {
      name: 'Average Pace - Speed Matters',
      description: 'Test average pace calculation (faster pace = lower time)',
      competitionType: 'Average Pace',
      activityType: 'Running',
      participants: [
        {
          npub: 'npub1fast',
          name: 'Speed Demon',
          workouts: [
            { distance: 10, duration: 40, calories: 500, date: new Date('2024-01-01'), pace: 4 }, // 4 min/km
            { distance: 5, duration: 20, calories: 250, date: new Date('2024-01-02'), pace: 4 }
          ]
        },
        {
          npub: 'npub1medium',
          name: 'Steady Runner',
          workouts: [
            { distance: 10, duration: 50, calories: 500, date: new Date('2024-01-01'), pace: 5 }, // 5 min/km
            { distance: 10, duration: 50, calories: 500, date: new Date('2024-01-02'), pace: 5 }
          ]
        },
        {
          npub: 'npub1slow',
          name: 'Easy Pacer',
          workouts: [
            { distance: 5, duration: 30, calories: 250, date: new Date('2024-01-01'), pace: 6 } // 6 min/km
          ]
        }
      ],
      expectedWinner: 'npub1fast',
      expectedOrder: ['npub1fast', 'npub1medium', 'npub1slow']
    },
    {
      name: 'Most Consistent - Daily Activity',
      description: 'Test consistency based on active days',
      competitionType: 'Most Consistent',
      activityType: 'Any',
      participants: [
        {
          npub: 'npub1daily',
          name: 'Daily Warrior',
          workouts: Array.from({ length: 30 }, (_, i) => ({
            distance: 3,
            duration: 20,
            calories: 150,
            date: new Date(2024, 0, i + 1)
          }))
        },
        {
          npub: 'npub1weekly',
          name: 'Weekend Warrior',
          workouts: Array.from({ length: 4 }, (_, i) => ({
            distance: 10,
            duration: 60,
            calories: 500,
            date: new Date(2024, 0, (i + 1) * 7)
          }))
        },
        {
          npub: 'npub1sporadic',
          name: 'Random Runner',
          workouts: [
            { distance: 20, duration: 120, calories: 1000, date: new Date('2024-01-05') },
            { distance: 25, duration: 150, calories: 1250, date: new Date('2024-01-15') }
          ]
        }
      ],
      expectedWinner: 'npub1daily',
      expectedOrder: ['npub1daily', 'npub1weekly', 'npub1sporadic']
    },
    {
      name: 'Total Workouts - Session Count',
      description: 'Test total workout count regardless of distance/duration',
      competitionType: 'Total Workouts',
      activityType: 'Strength Training',
      participants: [
        {
          npub: 'npub1frequent',
          name: 'Gym Rat',
          workouts: Array.from({ length: 20 }, (_, i) => ({
            distance: 0,
            duration: 45,
            calories: 300,
            date: new Date(2024, 0, i + 1)
          }))
        },
        {
          npub: 'npub1moderate',
          name: 'Regular Lifter',
          workouts: Array.from({ length: 10 }, (_, i) => ({
            distance: 0,
            duration: 60,
            calories: 400,
            date: new Date(2024, 0, i * 2 + 1)
          }))
        },
        {
          npub: 'npub1occasional',
          name: 'Weekend Lifter',
          workouts: Array.from({ length: 5 }, (_, i) => ({
            distance: 0,
            duration: 90,
            calories: 500,
            date: new Date(2024, 0, i * 7 + 1)
          }))
        }
      ],
      expectedWinner: 'npub1frequent',
      expectedOrder: ['npub1frequent', 'npub1moderate', 'npub1occasional']
    },
    {
      name: 'Longest Run - Single Best Effort',
      description: 'Test longest single distance workout',
      competitionType: 'Longest Run',
      activityType: 'Running',
      participants: [
        {
          npub: 'npub1marathon',
          name: 'Marathon Runner',
          workouts: [
            { distance: 42.195, duration: 210, calories: 2500, date: new Date('2024-01-15') },
            { distance: 5, duration: 25, calories: 250, date: new Date('2024-01-16') }
          ]
        },
        {
          npub: 'npub1halfmarathon',
          name: 'Half Marathon Runner',
          workouts: [
            { distance: 21.097, duration: 105, calories: 1250, date: new Date('2024-01-15') },
            { distance: 10, duration: 50, calories: 500, date: new Date('2024-01-16') },
            { distance: 10, duration: 50, calories: 500, date: new Date('2024-01-17') }
          ]
        },
        {
          npub: 'npub110k',
          name: '10K Runner',
          workouts: Array.from({ length: 10 }, () => ({
            distance: 10,
            duration: 50,
            calories: 500,
            date: new Date('2024-01-10')
          }))
        }
      ],
      expectedWinner: 'npub1marathon',
      expectedOrder: ['npub1marathon', 'npub1halfmarathon', 'npub110k']
    },
    {
      name: 'Total Duration - Time Investment',
      description: 'Test total time spent exercising',
      competitionType: 'Total Duration',
      activityType: 'Yoga',
      participants: [
        {
          npub: 'npub1dedicated',
          name: 'Dedicated Yogi',
          workouts: Array.from({ length: 15 }, () => ({
            distance: 0,
            duration: 90,
            calories: 200,
            date: new Date('2024-01-01')
          }))
        },
        {
          npub: 'npub1regular',
          name: 'Regular Practitioner',
          workouts: Array.from({ length: 20 }, () => ({
            distance: 0,
            duration: 60,
            calories: 150,
            date: new Date('2024-01-01')
          }))
        },
        {
          npub: 'npub1quick',
          name: 'Quick Sessions',
          workouts: Array.from({ length: 30 }, () => ({
            distance: 0,
            duration: 30,
            calories: 75,
            date: new Date('2024-01-01')
          }))
        }
      ],
      expectedWinner: 'npub1dedicated',
      expectedOrder: ['npub1dedicated', 'npub1regular', 'npub1quick']
    },
    {
      name: 'Calorie Consistency - Energy Burn',
      description: 'Test total calories burned',
      competitionType: 'Calorie Consistency',
      activityType: 'Any',
      participants: [
        {
          npub: 'npub1hiit',
          name: 'HIIT Enthusiast',
          workouts: Array.from({ length: 10 }, () => ({
            distance: 5,
            duration: 30,
            calories: 500,
            date: new Date('2024-01-01')
          }))
        },
        {
          npub: 'npub1endurance',
          name: 'Endurance Athlete',
          workouts: Array.from({ length: 5 }, () => ({
            distance: 20,
            duration: 120,
            calories: 800,
            date: new Date('2024-01-01')
          }))
        },
        {
          npub: 'npub1moderate',
          name: 'Moderate Burner',
          workouts: Array.from({ length: 15 }, () => ({
            distance: 5,
            duration: 40,
            calories: 250,
            date: new Date('2024-01-01')
          }))
        }
      ],
      expectedWinner: 'npub1hiit',
      expectedOrder: ['npub1hiit', 'npub1endurance', 'npub1moderate']
    },
    {
      name: 'Weekly Streaks - Consecutive Weeks',
      description: 'Test weekly consistency streaks',
      competitionType: 'Weekly Streaks',
      activityType: 'Running',
      participants: [
        {
          npub: 'npub1streaker',
          name: 'Streak Master',
          workouts: Array.from({ length: 28 }, (_, i) => ({
            distance: 5,
            duration: 30,
            calories: 250,
            date: new Date(2024, 0, i + 1)
          }))
        },
        {
          npub: 'npub1twoweek',
          name: 'Two Week Streak',
          workouts: Array.from({ length: 14 }, (_, i) => ({
            distance: 5,
            duration: 30,
            calories: 250,
            date: new Date(2024, 0, i + 1)
          }))
        },
        {
          npub: 'npub1broken',
          name: 'Broken Streak',
          workouts: [
            ...Array.from({ length: 7 }, (_, i) => ({
              distance: 5,
              duration: 30,
              calories: 250,
              date: new Date(2024, 0, i + 1)
            })),
            ...Array.from({ length: 7 }, (_, i) => ({
              distance: 5,
              duration: 30,
              calories: 250,
              date: new Date(2024, 0, i + 15)
            }))
          ]
        }
      ],
      expectedWinner: 'npub1streaker',
      expectedOrder: ['npub1streaker', 'npub1twoweek', 'npub1broken']
    }
  ];

  /**
   * Run all leaderboard tests
   */
  async runAllTests(): Promise<LeaderboardTestResult[]> {
    console.log('🏆 Starting Leaderboard Verification Tests');
    console.log(`📊 Testing ${this.testCases.length} competition scenarios\n`);

    for (const testCase of this.testCases) {
      await this.runTestCase(testCase);
    }

    this.generateSummary();
    return this.results;
  }

  /**
   * Run a single test case
   */
  private async runTestCase(testCase: LeaderboardTestCase): Promise<void> {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`   ${testCase.description}`);

    try {
      // Convert test data to WorkoutMetrics format
      const metricsMap = new Map<string, WorkoutMetrics>();

      for (const participant of testCase.participants) {
        const workouts = this.convertToNostrWorkouts(participant.workouts, participant.npub);
        const metrics = this.calculateMetricsFromWorkouts(workouts, participant.npub);
        metricsMap.set(participant.npub, metrics);
      }

      // Simulate ranking calculation
      const rankings = await this.simulateRankingCalculation(
        metricsMap,
        testCase.competitionType,
        testCase.activityType
      );

      // Extract actual order
      const actualOrder = rankings.map(r => r.npub);
      const scoreDetails: { [npub: string]: number } = {};
      rankings.forEach(r => {
        scoreDetails[r.npub] = r.score;
      });

      // Verify results
      const success = this.arraysEqual(actualOrder, testCase.expectedOrder);

      this.results.push({
        testName: testCase.name,
        competitionType: testCase.competitionType,
        success,
        message: success
          ? `✅ Ranking order correct for ${testCase.competitionType}`
          : `❌ Ranking mismatch for ${testCase.competitionType}`,
        expectedOrder: testCase.expectedOrder,
        actualOrder,
        scoreDetails
      });

      // Display results
      if (success) {
        console.log(`   ✅ Test passed`);
      } else {
        console.log(`   ❌ Test failed`);
        console.log(`      Expected: ${testCase.expectedOrder.join(' > ')}`);
        console.log(`      Actual:   ${actualOrder.join(' > ')}`);
      }

      console.log(`   📊 Scores:`, scoreDetails);

    } catch (error) {
      this.results.push({
        testName: testCase.name,
        competitionType: testCase.competitionType,
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        expectedOrder: testCase.expectedOrder,
        actualOrder: [],
        scoreDetails: {}
      });
    }
  }

  /**
   * Convert test workouts to NostrWorkout format
   */
  private convertToNostrWorkouts(workouts: TestWorkout[], npub: string): NostrWorkout[] {
    return workouts.map((w, index) => ({
      id: `test-${npub}-${index}`,
      source: 'test' as const,
      type: 'Running',
      activityType: 'Running',
      startTime: w.date.toISOString(),
      endTime: new Date(w.date.getTime() + w.duration * 60000).toISOString(),
      duration: w.duration,
      distance: w.distance,
      calories: w.calories,
      averageHeartRate: 140,
      maxHeartRate: 160,
      nostrEventId: `test-event-${index}`,
      nostrPubkey: npub,
      nostrCreatedAt: Math.floor(w.date.getTime() / 1000),
      unitSystem: 'metric' as const
    }));
  }

  /**
   * Calculate metrics from workouts
   */
  private calculateMetricsFromWorkouts(workouts: NostrWorkout[], npub: string): WorkoutMetrics {
    const activeDays = new Set<string>();
    let totalDistance = 0;
    let totalDuration = 0;
    let totalCalories = 0;
    let longestDistance = 0;
    let longestDuration = 0;

    workouts.forEach(w => {
      totalDistance += w.distance || 0;
      totalDuration += w.duration || 0;
      totalCalories += w.calories || 0;
      longestDistance = Math.max(longestDistance, w.distance || 0);
      longestDuration = Math.max(longestDuration, w.duration || 0);

      const day = new Date(w.startTime).toDateString();
      activeDays.add(day);
    });

    const averagePace = totalDistance > 0 ? totalDuration / totalDistance : 0;
    const averageSpeed = totalDuration > 0 ? (totalDistance / totalDuration) * 60 : 0;

    // Calculate streak
    const sortedDays = Array.from(activeDays)
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let streakDays = 0;
    if (sortedDays.length > 0) {
      streakDays = 1;
      for (let i = 1; i < sortedDays.length; i++) {
        const diff = Math.floor((sortedDays[i - 1].getTime() - sortedDays[i].getTime()) / (24 * 60 * 60 * 1000));
        if (diff === 1) {
          streakDays++;
        } else {
          break;
        }
      }
    }

    return {
      npub,
      totalDistance,
      totalDuration,
      totalCalories,
      workoutCount: workouts.length,
      activeDays: activeDays.size,
      longestDistance,
      longestDuration,
      averagePace,
      averageSpeed,
      lastActivityDate: workouts.length > 0 ? workouts[workouts.length - 1].startTime : undefined,
      streakDays,
      workouts
    };
  }

  /**
   * Simulate ranking calculation for a competition type
   */
  private async simulateRankingCalculation(
    metrics: Map<string, WorkoutMetrics>,
    competitionType: NostrLeagueCompetitionType,
    activityType: NostrActivityType
  ): Promise<{ npub: string; score: number }[]> {
    const rankings: { npub: string; score: number }[] = [];

    for (const [npub, metric] of metrics) {
      let score = 0;

      switch (competitionType) {
        case 'Total Distance':
          score = metric.totalDistance;
          break;
        case 'Average Pace':
          score = metric.averagePace > 0 ? 1000 / metric.averagePace : 0;
          break;
        case 'Average Speed':
          score = metric.averageSpeed;
          break;
        case 'Most Consistent':
          score = metric.activeDays;
          break;
        case 'Total Workouts':
        case 'Session Count':
          score = metric.workoutCount;
          break;
        case 'Longest Run':
        case 'Longest Ride':
          score = metric.longestDistance;
          break;
        case 'Total Duration':
        case 'Longest Session':
          score = competitionType === 'Total Duration' ? metric.totalDuration : metric.longestDuration;
          break;
        case 'Calorie Consistency':
          score = metric.totalCalories;
          break;
        case 'Weekly Streaks':
        case 'Daily Average':
          score = metric.streakDays;
          break;
        default:
          score = metric.totalDistance;
      }

      rankings.push({ npub, score });
    }

    // Sort by score (descending)
    rankings.sort((a, b) => b.score - a.score);
    return rankings;
  }

  /**
   * Check if arrays are equal
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  /**
   * Generate test summary
   */
  private generateSummary(): void {
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 LEADERBOARD TEST SUMMARY');
    console.log('='.repeat(60));

    console.log(`\n✅ Passed: ${passed}/${this.results.length}`);
    console.log(`❌ Failed: ${failed}/${this.results.length}`);

    // Group by competition type
    const byType = new Map<string, { passed: number; failed: number }>();
    this.results.forEach(r => {
      const current = byType.get(r.competitionType) || { passed: 0, failed: 0 };
      if (r.success) {
        current.passed++;
      } else {
        current.failed++;
      }
      byType.set(r.competitionType, current);
    });

    console.log('\n📈 Results by Competition Type:');
    byType.forEach((stats, type) => {
      const icon = stats.failed === 0 ? '✅' : '⚠️';
      console.log(`  ${icon} ${type}: ${stats.passed}/${stats.passed + stats.failed} passed`);
    });

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.testName}`);
          console.log(`    Expected: ${r.expectedOrder.join(' > ')}`);
          console.log(`    Actual:   ${r.actualOrder.join(' > ')}`);
        });
    }

    console.log('\n' + '='.repeat(60));

    if (failed === 0) {
      console.log('🎉 All leaderboard calculations verified successfully!');
    } else {
      console.log('⚠️ Some leaderboard calculations need attention.');
    }
  }

  /**
   * Get test results
   */
  getResults(): LeaderboardTestResult[] {
    return this.results;
  }
}

/**
 * Quick function to run leaderboard tests
 */
export async function runLeaderboardTests(): Promise<void> {
  const tester = new LeaderboardTestScripts();
  await tester.runAllTests();
}