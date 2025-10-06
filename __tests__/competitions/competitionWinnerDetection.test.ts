/**
 * Competition Winner Detection Tests
 * Verifies that the competition system can properly detect winners and distribute rewards
 * Tests the end-to-end flow from leaderboard data to Bitcoin distribution
 */

// @ts-nocheck - Test needs updating for new architecture (Supabase → Nostr)

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import competitionWinnerCalculation from '../../src/services/competitions/competitionWinnerCalculation';
import competitionRewardProcessor from '../../src/services/competitions/competitionRewardProcessor';
import competitionCompletionService from '../../src/services/competitions/competitionCompletionService';

// Mock Supabase
jest.mock('../../src/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    })),
  },
}));

// Mock reward distribution service
jest.mock('../../src/services/fitness/rewardDistributionService', () => ({
  default: {
    createDistribution: jest.fn(),
    processDistribution: jest.fn(),
  },
}));

describe('Competition Winner Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Winner Calculation', () => {
    test('should calculate winners with proper prize distribution', async () => {
      // Mock event leaderboard data
      const mockLeaderboardData = [
        { user_id: 'user1', score: 1000, rank: 1, users: [{ name: 'Alice' }] },
        { user_id: 'user2', score: 800, rank: 2, users: [{ name: 'Bob' }] },
        { user_id: 'user3', score: 600, rank: 3, users: [{ name: 'Charlie' }] },
      ];

      const mockEvent = {
        id: 'event1',
        name: 'Weekly 5K Challenge',
        prizePool: 10000, // 10,000 sats
        teamId: 'team1',
        createdBy: 'captain1',
      };

      // Mock Supabase query
      const mockSupabase = require('../../src/services/supabase').supabase;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockLeaderboardData,
                error: null,
              }),
            }),
          }),
        }),
      });

      const winners = await competitionWinnerCalculation.calculateEventWinners(mockEvent as any);

      expect(winners).toHaveLength(3);
      expect(winners[0]).toEqual({
        winnerId: 'user1',
        winnerName: 'Alice',
        rank: 1,
        score: 1000,
        rewardAmount: 5000, // 50% of 10,000
      });
      expect(winners[1]).toEqual({
        winnerId: 'user2',
        winnerName: 'Bob',
        rank: 2,
        score: 800,
        rewardAmount: 3000, // 30% of 10,000
      });
      expect(winners[2]).toEqual({
        winnerId: 'user3',
        winnerName: 'Charlie',
        rank: 3,
        score: 600,
        rewardAmount: 2000, // 20% of 10,000
      });
    });

    test('should handle empty leaderboard gracefully', async () => {
      const mockEvent = {
        id: 'event2',
        name: 'Empty Event',
        prizePool: 5000,
        teamId: 'team2',
        createdBy: 'captain2',
      };

      // Mock empty leaderboard
      const mockSupabase = require('../../src/services/supabase').supabase;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const winners = await competitionWinnerCalculation.calculateEventWinners(mockEvent as any);

      expect(winners).toHaveLength(0);
    });
  });

  describe('Challenge Winner Calculation', () => {
    test('should calculate single challenge winner', async () => {
      const mockChallenge = {
        id: 'challenge1',
        name: 'Speed Demon 5K',
        prizePool: 1000,
        winnerId: 'user1',
        teamId: 'team1',
        challengerId: 'user2',
      };

      // Mock challenge leaderboard query
      const mockSupabase = require('../../src/services/supabase').supabase;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user1',
                  score: 500,
                  users: [{ name: 'Winner User' }],
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const winner = await competitionWinnerCalculation.calculateChallengeWinner(mockChallenge as any);

      expect(winner).toEqual({
        winnerId: 'user1',
        winnerName: 'Winner User',
        rank: 1,
        score: 500,
        rewardAmount: 1000,
      });
    });
  });

  describe('League Winner Calculation', () => {
    test('should calculate league top performer', async () => {
      const mockLeague = {
        id: 'league1',
        name: 'Weekly Fitness League',
        payoutAmount: 2000,
        teamId: 'team1',
        payoutFrequency: 'weekly',
      };

      // Mock league leaderboard data
      const mockSupabase = require('../../src/services/supabase').supabase;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [
                  {
                    user_id: 'user1',
                    score: 1500,
                    rank: 1,
                    users: [{ name: 'League Champion' }],
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      });

      const winners = await competitionWinnerCalculation.calculateLeagueWinners(mockLeague as any);

      expect(winners).toHaveLength(1);
      expect(winners[0]).toEqual({
        winnerId: 'user1',
        winnerName: 'League Champion',
        rank: 1,
        score: 1500,
        rewardAmount: 2000,
      });
    });
  });

  describe('End-to-End Competition Processing', () => {
    test('should process completed competitions and track results', async () => {
      // Mock completed events
      const mockCompletedEvents = [
        {
          id: 'event1',
          name: 'Test Event',
          status: 'completed',
          rewards_distributed: false,
          prize_pool: 5000,
          team_id: 'team1',
          created_by: 'captain1',
        },
      ];

      const mockSupabase = require('../../src/services/supabase').supabase;
      
      // Mock the database queries for getting completed competitions
      mockSupabase.from.mockImplementation((table: string) => {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
        };

        if (table === 'events') {
          mockQuery.gt.mockResolvedValue({
            data: mockCompletedEvents,
            error: null,
          });
        } else {
          mockQuery.gt.mockResolvedValue({
            data: [],
            error: null,
          });
        }

        return mockQuery;
      });

      // Mock reward processor success
      const mockRewardProcessor = require('../../src/services/competitions/competitionRewardProcessor').default;
      mockRewardProcessor.processBatchRewards = jest.fn().mockResolvedValue([
        {
          success: true,
          distributionsCreated: 3,
          competitionId: 'event1',
          competitionType: 'event',
        },
      ]);

      const results = await competitionCompletionService.processCompletedCompetitions();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].distributionsCreated).toBe(3);
      expect(mockRewardProcessor.processBatchRewards).toHaveBeenCalledWith(
        mockCompletedEvents,
        [],
        []
      );
    });
  });

  describe('Competition Processing Stats', () => {
    test('should return accurate processing statistics', async () => {
      // Mock database queries for stats
      const mockSupabase = require('../../src/services/supabase').supabase;
      
      mockSupabase.from.mockImplementation((table: string) => {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
        };

        if (table === 'events') {
          mockQuery.gt.mockResolvedValue({
            data: [{ id: 'event1', prizePool: 5000 }],
            error: null,
          });
        } else if (table === 'challenges') {
          mockQuery.not.mockResolvedValue({
            data: [{ id: 'challenge1', prizePool: 1000 }],
            error: null,
          });
        } else {
          mockQuery.gt.mockResolvedValue({
            data: [],
            error: null,
          });
        }

        return mockQuery;
      });

      const stats = await competitionCompletionService.getProcessingStats();

      expect(stats.pendingEvents).toBe(1);
      expect(stats.pendingChallenges).toBe(1);
      expect(stats.dueLeagues).toBe(0);
      expect(stats.totalPendingPayouts).toBe(6000);
    });
  });

  describe('Health Check', () => {
    test('should return healthy status when system is operational', async () => {
      const mockSupabase = require('../../src/services/supabase').supabase;
      
      // Mock successful database connection
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: 'test' }],
            error: null,
          }),
        }),
      });

      // Mock getProcessingStats to return low numbers
      const mockStats = {
        pendingEvents: 2,
        pendingChallenges: 1,
        dueLeagues: 0,
        totalPendingPayouts: 3000,
      };

      jest.spyOn(competitionCompletionService, 'getProcessingStats').mockResolvedValue(mockStats);

      const health = await competitionCompletionService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.message).toBe('Competition processing system is operational');
      expect(health.details).toEqual(mockStats);
    });

    test('should return degraded status with high pending competitions', async () => {
      const mockSupabase = require('../../src/services/supabase').supabase;
      
      // Mock successful database connection
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: 'test' }],
            error: null,
          }),
        }),
      });

      // Mock high pending competitions
      const mockStats = {
        pendingEvents: 30,
        pendingChallenges: 25,
        dueLeagues: 10,
        totalPendingPayouts: 50000,
      };

      jest.spyOn(competitionCompletionService, 'getProcessingStats').mockResolvedValue(mockStats);

      const health = await competitionCompletionService.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.message).toContain('High number of pending competitions: 65');
    });
  });
});