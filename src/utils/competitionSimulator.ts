/**
 * Real-Time Competition Simulator
 * Creates realistic test scenarios with multiple concurrent users
 * Simulates workout posting, leaderboard updates, and Bitcoin rewards
 */

import { getAuthenticationData } from './nostrAuth';
import { nsecToPrivateKey } from './nostr';
import NostrTeamCreationService from '../services/nostr/NostrTeamCreationService';
import { NostrCompetitionService } from '../services/nostr/NostrCompetitionService';
import Competition1301QueryService from '../services/competition/Competition1301QueryService';
import LeagueRankingService from '../services/competition/leagueRankingService';
import type { NostrActivityType, NostrLeagueCompetitionType } from '../types/nostrCompetition';
import type { LeagueParticipant, LeagueParameters } from '../services/competition/leagueRankingService';
import type { NostrWorkout } from '../types/nostrWorkout';

export interface SimulatedUser {
  npub: string;
  name: string;
  performanceLevel: 'elite' | 'advanced' | 'intermediate' | 'beginner';
  consistency: 'daily' | 'regular' | 'sporadic';
  preferredActivity: NostrActivityType;
  workoutPattern: WorkoutPattern;
}

export interface WorkoutPattern {
  avgDistance: number; // km
  avgDuration: number; // minutes
  avgCalories: number;
  variability: number; // 0-1, how much workouts vary
  peakDays: number[]; // days of week (0=Sunday)
}

export interface SimulationConfig {
  teamSize: number;
  competitionDuration: number; // days
  activityType: NostrActivityType;
  competitionType: NostrLeagueCompetitionType;
  simulationSpeed: 'real-time' | 'accelerated' | 'instant';
  enableNotifications: boolean;
  enableZaps: boolean;
}

export interface SimulationEvent {
  timestamp: Date;
  eventType: 'workout' | 'join' | 'zap' | 'notification' | 'leaderboard_update';
  userId: string;
  data: any;
}

export interface SimulationResult {
  simulationId: string;
  config: SimulationConfig;
  startTime: Date;
  endTime: Date;
  duration: number;
  events: SimulationEvent[];
  finalLeaderboard: any[];
  statistics: SimulationStatistics;
}

export interface SimulationStatistics {
  totalWorkouts: number;
  totalDistance: number;
  totalDuration: number;
  totalCalories: number;
  totalZaps: number;
  totalSatsTransferred: number;
  avgWorkoutsPerUser: number;
  mostActiveUser: string;
  leastActiveUser: string;
  leaderboardChanges: number;
  peakActivityTime: string;
}

export class CompetitionSimulator {
  private simulatedUsers: SimulatedUser[] = [];
  private events: SimulationEvent[] = [];
  private teamId?: string;
  private competitionId?: string;
  private captainNpub?: string;
  private captainHex?: string;
  private isRunning: boolean = false;
  private startTime?: Date;
  private currentLeaderboard: any[] = [];
  private leaderboardUpdateCount: number = 0;

  /**
   * Initialize simulator with configuration
   */
  async initialize(config: SimulationConfig): Promise<void> {
    console.log('🚀 Initializing Competition Simulator');
    console.log(`📊 Config: ${config.teamSize} users, ${config.competitionDuration} days, ${config.activityType}`);

    // Generate simulated users
    this.simulatedUsers = this.generateSimulatedUsers(config.teamSize, config.activityType);

    // Setup test team and competition
    await this.setupTestEnvironment(config);

    console.log('✅ Simulator initialized successfully');
  }

  /**
   * Run the simulation
   */
  async runSimulation(config: SimulationConfig): Promise<SimulationResult> {
    console.log('\n🏃 Starting Competition Simulation');
    this.isRunning = true;
    this.startTime = new Date();
    const simulationId = `sim-${Date.now()}`;

    try {
      // Initialize if not already done
      if (!this.teamId || !this.competitionId) {
        await this.initialize(config);
      }

      // Simulate competition lifecycle
      console.log('\n📅 Day 1: Competition Starts');
      await this.simulateCompetitionStart(config);

      // Simulate daily activities
      for (let day = 1; day <= config.competitionDuration; day++) {
        console.log(`\n📅 Day ${day}: Simulating Activities`);
        await this.simulateDay(day, config);

        // Update leaderboard
        await this.updateLeaderboard(config);

        // Simulate notifications
        if (config.enableNotifications) {
          await this.simulateNotifications(day, config);
        }

        // Add some delay for realistic simulation
        if (config.simulationSpeed === 'real-time') {
          await this.delay(1000); // 1 second per day in simulation
        } else if (config.simulationSpeed === 'accelerated') {
          await this.delay(100); // 100ms per day
        }
      }

      // Simulate competition end
      console.log(`\n🏁 Competition Ends`);
      await this.simulateCompetitionEnd(config);

      // Calculate final statistics
      const statistics = this.calculateStatistics();

      const result: SimulationResult = {
        simulationId,
        config,
        startTime: this.startTime,
        endTime: new Date(),
        duration: Date.now() - this.startTime.getTime(),
        events: this.events,
        finalLeaderboard: this.currentLeaderboard,
        statistics
      };

      this.generateSimulationReport(result);

      return result;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Setup test environment
   */
  private async setupTestEnvironment(config: SimulationConfig): Promise<void> {
    const authData = await getAuthenticationData();
    if (!authData) {
      throw new Error('Authentication required for simulation');
    }

    this.captainNpub = authData.npub;
    this.captainHex = authData.hexPubkey;

    const privateKey = nsecToPrivateKey(authData.nsec);

    // Create test team
    console.log('👥 Creating simulated team...');
    const teamData = {
      name: `Simulated Team ${Date.now()}`,
      about: 'Competition simulation test team',
      captainNpub: authData.npub,
      captainHexPubkey: authData.hexPubkey,
      activityType: config.activityType,
      isPublic: true
    };

    const teamResult = await NostrTeamCreationService.createTeam(teamData, privateKey);
    if (!teamResult.success || !teamResult.teamId) {
      throw new Error('Failed to create simulation team');
    }
    this.teamId = teamResult.teamId;

    // Create competition
    console.log('🏆 Creating simulated competition...');
    const startDate = new Date();
    const endDate = new Date(Date.now() + config.competitionDuration * 24 * 60 * 60 * 1000);

    const leagueData = {
      teamId: this.teamId,
      name: `Simulated ${config.competitionType} Competition`,
      description: 'Real-time competition simulation',
      activityType: config.activityType,
      competitionType: config.competitionType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      duration: config.competitionDuration,
      entryFeesSats: config.enableZaps ? 100 : 0,
      maxParticipants: config.teamSize * 2,
      requireApproval: false,
      allowLateJoining: true,
      scoringFrequency: 'daily' as const
    };

    const competitionResult = await NostrCompetitionService.createLeague(leagueData, privateKey);
    if (!competitionResult.success || !competitionResult.competitionId) {
      throw new Error('Failed to create simulation competition');
    }
    this.competitionId = competitionResult.competitionId;
  }

  /**
   * Generate simulated users with diverse profiles
   */
  private generateSimulatedUsers(count: number, primaryActivity: NostrActivityType): SimulatedUser[] {
    const users: SimulatedUser[] = [];
    const performanceLevels: Array<'elite' | 'advanced' | 'intermediate' | 'beginner'> =
      ['elite', 'advanced', 'intermediate', 'beginner'];
    const consistencyPatterns: Array<'daily' | 'regular' | 'sporadic'> =
      ['daily', 'regular', 'sporadic'];

    for (let i = 0; i < count; i++) {
      const performanceLevel = performanceLevels[Math.floor(Math.random() * performanceLevels.length)];
      const consistency = consistencyPatterns[Math.floor(Math.random() * consistencyPatterns.length)];

      const user: SimulatedUser = {
        npub: `npub1sim${i.toString().padStart(6, '0')}`,
        name: `Simulated User ${i + 1}`,
        performanceLevel,
        consistency,
        preferredActivity: Math.random() > 0.7 ? primaryActivity : this.randomActivity(),
        workoutPattern: this.generateWorkoutPattern(performanceLevel, consistency, primaryActivity)
      };

      users.push(user);
    }

    return users;
  }

  /**
   * Generate workout pattern based on user profile
   */
  private generateWorkoutPattern(
    level: 'elite' | 'advanced' | 'intermediate' | 'beginner',
    consistency: 'daily' | 'regular' | 'sporadic',
    activity: NostrActivityType
  ): WorkoutPattern {
    const patterns: { [key: string]: WorkoutPattern } = {
      'elite-Running': {
        avgDistance: 15 + Math.random() * 10,
        avgDuration: 60 + Math.random() * 30,
        avgCalories: 800 + Math.random() * 400,
        variability: 0.2,
        peakDays: [1, 3, 5, 6] // Mon, Wed, Fri, Sat
      },
      'advanced-Running': {
        avgDistance: 10 + Math.random() * 5,
        avgDuration: 45 + Math.random() * 15,
        avgCalories: 500 + Math.random() * 200,
        variability: 0.3,
        peakDays: [1, 3, 5]
      },
      'intermediate-Running': {
        avgDistance: 5 + Math.random() * 3,
        avgDuration: 30 + Math.random() * 10,
        avgCalories: 300 + Math.random() * 100,
        variability: 0.4,
        peakDays: [2, 4, 6]
      },
      'beginner-Running': {
        avgDistance: 2 + Math.random() * 2,
        avgDuration: 20 + Math.random() * 10,
        avgCalories: 150 + Math.random() * 50,
        variability: 0.5,
        peakDays: [0, 6] // Weekends only
      }
    };

    const key = `${level}-${activity}`;
    return patterns[key] || patterns['intermediate-Running'];
  }

  /**
   * Simulate competition start
   */
  private async simulateCompetitionStart(config: SimulationConfig): Promise<void> {
    // Simulate users joining
    for (const user of this.simulatedUsers) {
      const shouldJoin = Math.random() > 0.1; // 90% join rate
      if (shouldJoin) {
        this.recordEvent({
          timestamp: new Date(),
          eventType: 'join',
          userId: user.npub,
          data: {
            teamId: this.teamId,
            competitionId: this.competitionId
          }
        });
      }
    }

    // Initial notification
    if (config.enableNotifications) {
      this.recordEvent({
        timestamp: new Date(),
        eventType: 'notification',
        userId: 'system',
        data: {
          type: 'competition_started',
          message: `${config.competitionType} competition has begun!`
        }
      });
    }
  }

  /**
   * Simulate a single day of competition
   */
  private async simulateDay(day: number, config: SimulationConfig): Promise<void> {
    const dayOfWeek = day % 7;

    for (const user of this.simulatedUsers) {
      // Determine if user works out today
      const shouldWorkout = this.shouldUserWorkout(user, dayOfWeek);

      if (shouldWorkout) {
        const workout = this.generateWorkout(user, day);
        this.recordEvent({
          timestamp: new Date(),
          eventType: 'workout',
          userId: user.npub,
          data: workout
        });

        // Simulate zaps between users
        if (config.enableZaps && Math.random() > 0.8) {
          await this.simulateZap(user.npub);
        }
      }
    }

    console.log(`   📊 Day ${day}: ${this.getDayWorkoutCount()} workouts recorded`);
  }

  /**
   * Determine if user should workout on given day
   */
  private shouldUserWorkout(user: SimulatedUser, dayOfWeek: number): boolean {
    const baseChance = {
      'daily': 0.95,
      'regular': 0.6,
      'sporadic': 0.3
    };

    let chance = baseChance[user.consistency];

    // Increase chance on peak days
    if (user.workoutPattern.peakDays.includes(dayOfWeek)) {
      chance += 0.2;
    }

    return Math.random() < Math.min(chance, 1);
  }

  /**
   * Generate workout data for user
   */
  private generateWorkout(user: SimulatedUser, day: number): Partial<NostrWorkout> {
    const pattern = user.workoutPattern;
    const variability = pattern.variability;

    // Add some progression over time
    const progressionFactor = 1 + (day / 30) * 0.1;

    const distance = pattern.avgDistance * (1 + (Math.random() - 0.5) * variability) * progressionFactor;
    const duration = pattern.avgDuration * (1 + (Math.random() - 0.5) * variability);
    const calories = pattern.avgCalories * (1 + (Math.random() - 0.5) * variability) * progressionFactor;

    return {
      type: user.preferredActivity,
      activityType: user.preferredActivity,
      distance: Math.max(0, distance),
      duration: Math.max(10, duration),
      calories: Math.max(50, calories),
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + duration * 60000).toISOString()
    };
  }

  /**
   * Update competition leaderboard
   */
  private async updateLeaderboard(config: SimulationConfig): Promise<void> {
    const previousLeader = this.currentLeaderboard[0]?.npub;

    // Simulate leaderboard calculation
    const participants: LeagueParticipant[] = this.simulatedUsers.map(u => ({
      npub: u.npub,
      name: u.name,
      avatar: '',
      isActive: true
    }));

    const parameters: LeagueParameters = {
      activityType: config.activityType,
      competitionType: config.competitionType,
      startDate: new Date(Date.now() - config.competitionDuration * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      scoringFrequency: 'daily'
    };

    // Simulate ranking update (in real scenario, would query actual workouts)
    const mockRankings = participants
      .map(p => ({
        npub: p.npub,
        name: p.name,
        score: Math.random() * 1000,
        rank: 0
      }))
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    this.currentLeaderboard = mockRankings;

    const newLeader = this.currentLeaderboard[0]?.npub;
    if (previousLeader !== newLeader) {
      this.leaderboardUpdateCount++;
      this.recordEvent({
        timestamp: new Date(),
        eventType: 'leaderboard_update',
        userId: 'system',
        data: {
          newLeader,
          previousLeader,
          topThree: this.currentLeaderboard.slice(0, 3).map(r => r.npub)
        }
      });
    }
  }

  /**
   * Simulate notifications
   */
  private async simulateNotifications(day: number, config: SimulationConfig): Promise<void> {
    // Daily leaderboard update
    if (day % 1 === 0) {
      this.recordEvent({
        timestamp: new Date(),
        eventType: 'notification',
        userId: 'system',
        data: {
          type: 'leaderboard_update',
          message: `Day ${day} leaderboard: ${this.currentLeaderboard[0]?.name} leads!`
        }
      });
    }

    // Milestone notifications
    if (day === Math.floor(config.competitionDuration / 2)) {
      this.recordEvent({
        timestamp: new Date(),
        eventType: 'notification',
        userId: 'system',
        data: {
          type: 'halfway',
          message: 'Competition halfway point reached!'
        }
      });
    }

    // Final day notification
    if (day === config.competitionDuration - 1) {
      this.recordEvent({
        timestamp: new Date(),
        eventType: 'notification',
        userId: 'system',
        data: {
          type: 'final_day',
          message: 'Final day of competition!'
        }
      });
    }
  }

  /**
   * Simulate zap between users
   */
  private async simulateZap(fromUser: string): Promise<void> {
    const toUser = this.simulatedUsers[Math.floor(Math.random() * this.simulatedUsers.length)];
    if (toUser.npub !== fromUser) {
      const amount = [21, 100, 500, 1000][Math.floor(Math.random() * 4)];

      this.recordEvent({
        timestamp: new Date(),
        eventType: 'zap',
        userId: fromUser,
        data: {
          to: toUser.npub,
          amount,
          message: 'Great workout! ⚡'
        }
      });
    }
  }

  /**
   * Simulate competition end
   */
  private async simulateCompetitionEnd(config: SimulationConfig): Promise<void> {
    // Final leaderboard
    await this.updateLeaderboard(config);

    // Winner announcement
    const winner = this.currentLeaderboard[0];
    if (winner) {
      this.recordEvent({
        timestamp: new Date(),
        eventType: 'notification',
        userId: 'system',
        data: {
          type: 'competition_ended',
          message: `Competition ended! Winner: ${winner.name}`,
          finalRankings: this.currentLeaderboard.slice(0, 10)
        }
      });
    }

    // Distribute rewards if enabled
    if (config.enableZaps && winner) {
      this.recordEvent({
        timestamp: new Date(),
        eventType: 'zap',
        userId: this.captainNpub || 'captain',
        data: {
          to: winner.npub,
          amount: 10000, // Prize amount
          message: '🏆 Competition winner prize!'
        }
      });
    }
  }

  /**
   * Calculate simulation statistics
   */
  private calculateStatistics(): SimulationStatistics {
    const workoutEvents = this.events.filter(e => e.eventType === 'workout');
    const zapEvents = this.events.filter(e => e.eventType === 'zap');

    const userWorkoutCounts = new Map<string, number>();
    let totalDistance = 0;
    let totalDuration = 0;
    let totalCalories = 0;

    workoutEvents.forEach(event => {
      const count = userWorkoutCounts.get(event.userId) || 0;
      userWorkoutCounts.set(event.userId, count + 1);

      totalDistance += event.data.distance || 0;
      totalDuration += event.data.duration || 0;
      totalCalories += event.data.calories || 0;
    });

    const totalSatsTransferred = zapEvents.reduce((sum, e) => sum + (e.data.amount || 0), 0);

    const sortedUsers = Array.from(userWorkoutCounts.entries()).sort((a, b) => b[1] - a[1]);

    return {
      totalWorkouts: workoutEvents.length,
      totalDistance,
      totalDuration,
      totalCalories,
      totalZaps: zapEvents.length,
      totalSatsTransferred,
      avgWorkoutsPerUser: workoutEvents.length / this.simulatedUsers.length,
      mostActiveUser: sortedUsers[0]?.[0] || 'none',
      leastActiveUser: sortedUsers[sortedUsers.length - 1]?.[0] || 'none',
      leaderboardChanges: this.leaderboardUpdateCount,
      peakActivityTime: this.findPeakActivityTime()
    };
  }

  /**
   * Find peak activity time
   */
  private findPeakActivityTime(): string {
    const hourCounts = new Map<number, number>();

    this.events
      .filter(e => e.eventType === 'workout')
      .forEach(e => {
        const hour = e.timestamp.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });

    const sortedHours = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1]);
    const peakHour = sortedHours[0]?.[0] || 0;

    return `${peakHour}:00-${peakHour + 1}:00`;
  }

  /**
   * Generate simulation report
   */
  private generateSimulationReport(result: SimulationResult): void {
    const stats = result.statistics;

    console.log('\n' + '='.repeat(60));
    console.log('🏁 COMPETITION SIMULATION COMPLETE');
    console.log('='.repeat(60));

    console.log('\n📊 Competition Overview:');
    console.log(`   Duration: ${result.config.competitionDuration} days`);
    console.log(`   Participants: ${result.config.teamSize}`);
    console.log(`   Activity: ${result.config.activityType}`);
    console.log(`   Competition Type: ${result.config.competitionType}`);

    console.log('\n📈 Activity Statistics:');
    console.log(`   Total Workouts: ${stats.totalWorkouts}`);
    console.log(`   Total Distance: ${stats.totalDistance.toFixed(1)} km`);
    console.log(`   Total Duration: ${(stats.totalDuration / 60).toFixed(1)} hours`);
    console.log(`   Total Calories: ${stats.totalCalories.toLocaleString()}`);
    console.log(`   Avg Workouts/User: ${stats.avgWorkoutsPerUser.toFixed(1)}`);

    console.log('\n⚡ Engagement Metrics:');
    console.log(`   Total Zaps: ${stats.totalZaps}`);
    console.log(`   Sats Transferred: ${stats.totalSatsTransferred.toLocaleString()}`);
    console.log(`   Leaderboard Changes: ${stats.leaderboardChanges}`);
    console.log(`   Peak Activity: ${stats.peakActivityTime}`);

    console.log('\n🏆 Final Leaderboard:');
    result.finalLeaderboard.slice(0, 5).forEach(entry => {
      const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '  ';
      console.log(`   ${medal} #${entry.rank} ${entry.name}: ${entry.score.toFixed(0)} points`);
    });

    console.log('\n👑 Competition Insights:');
    console.log(`   Most Active: ${stats.mostActiveUser}`);
    console.log(`   Least Active: ${stats.leastActiveUser}`);

    const simulationTime = (result.endTime.getTime() - result.startTime.getTime()) / 1000;
    console.log(`\n⏱️ Simulation completed in ${simulationTime.toFixed(1)} seconds`);

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Record simulation event
   */
  private recordEvent(event: SimulationEvent): void {
    this.events.push(event);
  }

  /**
   * Get day workout count
   */
  private getDayWorkoutCount(): number {
    const today = new Date().toDateString();
    return this.events.filter(
      e => e.eventType === 'workout' && e.timestamp.toDateString() === today
    ).length;
  }

  /**
   * Get random activity type
   */
  private randomActivity(): NostrActivityType {
    const activities: NostrActivityType[] = [
      'Running', 'Walking', 'Cycling', 'Strength Training',
      'Yoga', 'Meditation', 'Diet'
    ];
    return activities[Math.floor(Math.random() * activities.length)];
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get simulation events
   */
  getEvents(): SimulationEvent[] {
    return this.events;
  }

  /**
   * Get current leaderboard
   */
  getCurrentLeaderboard(): any[] {
    return this.currentLeaderboard;
  }

  /**
   * Stop simulation
   */
  stop(): void {
    this.isRunning = false;
    console.log('⏹️ Simulation stopped');
  }
}

/**
 * Quick function to run competition simulation
 */
export async function runCompetitionSimulation(
  config?: Partial<SimulationConfig>
): Promise<SimulationResult> {
  const defaultConfig: SimulationConfig = {
    teamSize: 20,
    competitionDuration: 7,
    activityType: 'Running',
    competitionType: 'Total Distance',
    simulationSpeed: 'accelerated',
    enableNotifications: true,
    enableZaps: true,
    ...config
  };

  const simulator = new CompetitionSimulator();
  return await simulator.runSimulation(defaultConfig);
}