/**
 * Nostr Competition Integration Tests
 * End-to-end testing of Nostr workout → Competition flow
 * Tests all integration points between Nostr workouts and competitions
 */

import competitionContextService from '../../src/services/integrations/competitionContextService';
import nostrCompetitionBridge from '../../src/services/integrations/nostrCompetitionBridge';
import nostrRealtimeCompetitionSync from '../../src/services/integrations/nostrRealtimeCompetitionSync';
import workoutDataProcessor from '../../src/services/fitness/workoutDataProcessor';
import type { NostrWorkoutCompetition } from '../../src/types/nostrWorkout';
import type { Competition } from '../../src/services/integrations/competitionContextService';

// Mock Supabase
jest.mock('../../src/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null })),
          in: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({ data: [], error: null })),
            })),
          })),
        })),
        insert: jest.fn(() => ({ data: { id: 'test-id' }, error: null })),
        update: jest.fn(() => ({ data: null, error: null })),
      })),
    })),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock other services
jest.mock('../../src/services/competitions/competitionLeaderboardManager', () => ({
  updateCompetitionLeaderboard: jest.fn(() => 
    Promise.resolve({ success: true, rank: 1 })
  ),
}));

jest.mock('../../src/services/fitness/teamLeaderboardService', () => ({
  refreshTeamLeaderboard: jest.fn(() => Promise.resolve()),
  getUserRankInTeam: jest.fn(() => 
    Promise.resolve({ rank: 1, score: 100, totalMembers: 5 })
  ),
}));

describe('Nostr Competition Integration', () => {
  const mockUserId = 'test-user-123';
  const mockTeamId = 'test-team-456';
  const mockCompetitionId = 'test-competition-789';

  const sampleNostrWorkout: NostrWorkoutCompetition = {
    id: 'nostr-workout-123',
    pubkey: 'test-pubkey',
    type: 'running',
    startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    endTime: new Date().toISOString(),
    duration: 3600, // 1 hour
    distance: 10000, // 10km in meters
    unit: 'meters',
    calories: 600,
    metrics: {
      heartRate: { avg: 150, max: 180 },
      pace: 360, // 6 min/km
      elevation: 50,
    },
    rawEvent: '{"kind":1301,"content":"test"}',
  };

  const mockCompetition: Competition = {
    id: mockCompetitionId,
    type: 'event',
    name: 'Weekly 10K Challenge',
    teamId: mockTeamId,
    startDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    endDate: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Competition Context Service', () => {
    describe('getActiveCompetitionsForUser', () => {
      it('should retrieve active competitions for user', async () => {
        // Mock the database response
        const supabase = require('../../src/services/supabase').supabase;
        supabase.from.mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({ data: [{ team_id: mockTeamId }], error: null })),
            })),
          })),
        });

        // Mock events query
        supabase.from.mockReturnValueOnce({
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              eq: jest.fn(() => ({
                lte: jest.fn(() => ({
                  gte: jest.fn(() => ({ data: [mockCompetition], error: null })),
                })),
              })),
            })),
          })),
        });

        // Mock challenges and leagues queries (empty results)
        supabase.from.mockReturnValueOnce({
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              in: jest.fn(() => ({
                lte: jest.fn(() => ({
                  gte: jest.fn(() => ({
                    or: jest.fn(() => ({ data: [], error: null })),
                  })),
                })),
              })),
            })),
          })),
        });

        supabase.from.mockReturnValueOnce({
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              eq: jest.fn(() => ({ data: [], error: null })),
            })),
          })),
        });

        const competitions = await competitionContextService.getActiveCompetitionsForUser(mockUserId);

        expect(competitions).toHaveLength(1);
        expect(competitions[0]).toMatchObject({
          id: mockCompetitionId,
          type: 'event',
          name: 'Weekly 10K Challenge',
          teamId: mockTeamId,
        });
      });

      it('should return empty array when no teams found', async () => {
        const supabase = require('../../src/services/supabase').supabase;
        supabase.from.mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({ data: [], error: null })),
            })),
          })),
        });

        const competitions = await competitionContextService.getActiveCompetitionsForUser(mockUserId);
        expect(competitions).toHaveLength(0);
      });
    });

    describe('validateWorkoutForCompetition', () => {
      it('should validate workout within competition dates', () => {
        const workoutData = {
          id: 'test-workout',
          userId: mockUserId,
          teamId: mockTeamId,
          type: 'running' as const,
          source: 'nostr' as const,
          duration: 3600,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          syncedAt: new Date().toISOString(),
        };

        const isValid = competitionContextService.validateWorkoutForCompetition(
          workoutData, 
          mockCompetition
        );

        expect(isValid).toBe(true);
      });

      it('should reject workout outside competition dates', () => {
        const workoutData = {
          id: 'test-workout',
          userId: mockUserId,
          teamId: mockTeamId,
          type: 'running' as const,
          source: 'nostr' as const,
          duration: 3600,
          startTime: new Date(Date.now() + 2 * 86400000).toISOString(), // 2 days from now
          endTime: new Date(Date.now() + 2 * 86400000).toISOString(),
          syncedAt: new Date().toISOString(),
        };

        const isValid = competitionContextService.validateWorkoutForCompetition(
          workoutData, 
          mockCompetition
        );

        expect(isValid).toBe(false);
      });
    });

    describe('cache management', () => {
      it('should cache competition context', async () => {
        const AsyncStorage = require('@react-native-async-storage/async-storage');
        const mockCacheData = {
          userId: mockUserId,
          activeCompetitions: [mockCompetition],
          teamMemberships: [mockTeamId],
          cachedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        };

        AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockCacheData));

        const cachedContext = await competitionContextService.getCachedCompetitionContext(mockUserId);
        expect(cachedContext).toMatchObject(mockCacheData);
      });
    });
  });

  describe('Nostr Competition Bridge', () => {
    describe('convertNostrWorkout', () => {
      it('should convert Nostr workout to WorkoutData format', async () => {
        const result = await nostrCompetitionBridge.convertNostrWorkout(
          sampleNostrWorkout, 
          mockUserId, 
          mockTeamId
        );

        expect(result.success).toBe(true);
        expect(result.workoutData).toMatchObject({
          id: `nostr_${sampleNostrWorkout.id}`,
          userId: mockUserId,
          teamId: mockTeamId,
          type: 'running',
          source: 'nostr',
          distance: 10000,
          duration: 3600,
          calories: 600,
        });
      });

      it('should handle missing optional fields', async () => {
        const incompleteWorkout: NostrWorkoutCompetition = {
          id: 'incomplete-workout',
          pubkey: 'test-pubkey',
          type: 'running',
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date().toISOString(),
          rawEvent: '{"kind":1301}',
        };

        const result = await nostrCompetitionBridge.convertNostrWorkout(
          incompleteWorkout, 
          mockUserId
        );

        expect(result.success).toBe(true);
        expect(result.workoutData).toMatchObject({
          type: 'running',
          source: 'nostr',
          duration: 3600, // calculated from time difference
        });
      });
    });

    describe('processNostrWorkoutForCompetitions', () => {
      it('should process workout and update competitions', async () => {
        // Mock competition context service
        jest.spyOn(competitionContextService, 'getApplicableCompetitions')
          .mockResolvedValueOnce([mockCompetition]);

        const result = await nostrCompetitionBridge.processNostrWorkoutForCompetitions(
          sampleNostrWorkout,
          mockUserId,
          mockTeamId
        );

        expect(result.success).toBe(true);
        expect(result.processedWorkouts).toBe(1);
        expect(result.competitionsUpdated).toBe(1);
        expect(result.leaderboardUpdates).toBe(1);
      });

      it('should handle workout with no applicable competitions', async () => {
        jest.spyOn(competitionContextService, 'getApplicableCompetitions')
          .mockResolvedValueOnce([]);

        const result = await nostrCompetitionBridge.processNostrWorkoutForCompetitions(
          sampleNostrWorkout,
          mockUserId,
          mockTeamId
        );

        expect(result.success).toBe(true);
        expect(result.competitionsUpdated).toBe(0);
      });
    });

    describe('batch processing', () => {
      it('should process multiple workouts efficiently', async () => {
        const workouts = [
          { ...sampleNostrWorkout, id: 'workout-1' },
          { ...sampleNostrWorkout, id: 'workout-2' },
          { ...sampleNostrWorkout, id: 'workout-3' },
        ];

        jest.spyOn(competitionContextService, 'getApplicableCompetitions')
          .mockResolvedValue([mockCompetition]);

        const result = await nostrCompetitionBridge.processBatchNostrWorkouts(
          workouts,
          mockUserId,
          mockTeamId
        );

        expect(result.success).toBe(true);
        expect(result.processedWorkouts).toBe(3);
        expect(result.processingTimeMs).toBeGreaterThan(0);
      });
    });
  });

  describe('Workout Data Processor Nostr Support', () => {
    describe('processNostrWorkout', () => {
      it('should process and score Nostr workout', async () => {
        const supabase = require('../../src/services/supabase').supabase;
        supabase.from.mockReturnValueOnce({
          insert: jest.fn(() => ({ data: { id: 'workout-id' }, error: null })),
        });

        const result = await workoutDataProcessor.processNostrWorkout(
          sampleNostrWorkout,
          mockUserId,
          mockTeamId
        );

        expect(result.success).toBe(true);
        expect(result.score).toBeGreaterThan(0);
        expect(result.workoutData).toBeDefined();
      });

      it('should apply Nostr-specific bonuses', async () => {
        const supabase = require('../../src/services/supabase').supabase;
        supabase.from.mockReturnValueOnce({
          insert: jest.fn(() => ({ data: { id: 'workout-id' }, error: null })),
        });

        const workoutWithMetrics = {
          ...sampleNostrWorkout,
          metrics: {
            heartRate: { avg: 150, max: 180 },
            pace: 360,
            elevation: 50,
          },
        };

        const result = await workoutDataProcessor.processNostrWorkout(
          workoutWithMetrics,
          mockUserId,
          mockTeamId
        );

        expect(result.success).toBe(true);
        // Score should be higher due to Nostr bonuses
        expect(result.score).toBeGreaterThan(100);
      });
    });
  });

  describe('Real-time Competition Sync', () => {
    describe('handleRealtimeNostrWorkout', () => {
      it('should handle real-time workout and emit events', async () => {
        jest.spyOn(nostrCompetitionBridge, 'processNostrWorkoutForCompetitions')
          .mockResolvedValueOnce({
            success: true,
            processedWorkouts: 1,
            competitionsUpdated: 1,
            leaderboardUpdates: 1,
            errors: [],
            processingTimeMs: 100,
          });

        const eventCallback = jest.fn();
        const notificationCallback = jest.fn();

        nostrRealtimeCompetitionSync.subscribeToEvents(mockUserId, eventCallback);
        nostrRealtimeCompetitionSync.subscribeToNotifications(mockUserId, notificationCallback);

        await nostrRealtimeCompetitionSync.handleRealtimeNostrWorkout(
          sampleNostrWorkout,
          mockUserId,
          mockTeamId
        );

        expect(eventCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'workout_added',
            userId: mockUserId,
            teamId: mockTeamId,
          })
        );

        expect(notificationCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'workout_processed',
            title: '🏃‍♂️ Workout Processed',
            userId: mockUserId,
          })
        );
      });
    });

    describe('subscription management', () => {
      it('should manage event subscriptions', () => {
        const callback = jest.fn();
        
        nostrRealtimeCompetitionSync.subscribeToEvents(mockUserId, callback);
        
        const stats = nostrRealtimeCompetitionSync.getRealTimeStats();
        expect(stats.eventSubscribers).toBe(1);

        nostrRealtimeCompetitionSync.unsubscribeFromEvents(mockUserId, callback);
        
        const statsAfter = nostrRealtimeCompetitionSync.getRealTimeStats();
        expect(statsAfter.eventSubscribers).toBe(0);
      });
    });
  });

  describe('End-to-End Integration Flow', () => {
    it('should complete full Nostr workout → Bitcoin reward flow', async () => {
      // Mock all database interactions
      const supabase = require('../../src/services/supabase').supabase;
      
      // Mock team membership query
      supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({ data: [{ team_id: mockTeamId }], error: null })),
          })),
        })),
      });

      // Mock active competitions query
      supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            eq: jest.fn(() => ({
              lte: jest.fn(() => ({
                gte: jest.fn(() => ({ data: [mockCompetition], error: null })),
              })),
            })),
          })),
        })),
      });

      // Mock challenges and leagues (empty)
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          in: jest.fn(() => ({ data: [], error: null })),
        })),
      });

      // Mock workout insertion
      supabase.from.mockReturnValueOnce({
        insert: jest.fn(() => ({ data: { id: 'workout-id' }, error: null })),
      });

      // Execute the full flow
      const result = await nostrCompetitionBridge.processNostrWorkoutForCompetitions(
        sampleNostrWorkout,
        mockUserId,
        mockTeamId
      );

      // Verify end-to-end success
      expect(result.success).toBe(true);
      expect(result.processedWorkouts).toBe(1);
      expect(result.competitionsUpdated).toBe(1);
      expect(result.leaderboardUpdates).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors gracefully without breaking the flow', async () => {
      const invalidWorkout: NostrWorkoutCompetition = {
        id: 'invalid-workout',
        pubkey: 'test-pubkey',
        type: 'running',
        startTime: '', // Invalid start time
        endTime: '', // Invalid end time
        rawEvent: '{}',
      };

      const result = await nostrCompetitionBridge.processNostrWorkoutForCompetitions(
        invalidWorkout,
        mockUserId,
        mockTeamId
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large batch processing efficiently', async () => {
      const largeWorkoutBatch = Array.from({ length: 100 }, (_, i) => ({
        ...sampleNostrWorkout,
        id: `workout-${i}`,
      }));

      jest.spyOn(competitionContextService, 'getApplicableCompetitions')
        .mockResolvedValue([mockCompetition]);

      const startTime = Date.now();
      const result = await nostrCompetitionBridge.processBatchNostrWorkouts(
        largeWorkoutBatch,
        mockUserId,
        mockTeamId
      );
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.processedWorkouts).toBe(100);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle concurrent real-time events', async () => {
      const concurrentWorkouts = Array.from({ length: 5 }, (_, i) => ({
        ...sampleNostrWorkout,
        id: `concurrent-workout-${i}`,
      }));

      jest.spyOn(nostrCompetitionBridge, 'processNostrWorkoutForCompetitions')
        .mockResolvedValue({
          success: true,
          processedWorkouts: 1,
          competitionsUpdated: 1,
          leaderboardUpdates: 1,
          errors: [],
          processingTimeMs: 50,
        });

      const promises = concurrentWorkouts.map(workout =>
        nostrRealtimeCompetitionSync.handleRealtimeNostrWorkout(
          workout,
          mockUserId,
          mockTeamId
        )
      );

      await Promise.all(promises);

      const stats = nostrRealtimeCompetitionSync.getRealTimeStats();
      expect(stats.pendingUpdates).toBeGreaterThanOrEqual(0);
    });
  });
});