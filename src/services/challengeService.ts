/**
 * RUNSTR Challenge Service - Nostr-Native Implementation
 * Handles challenge creation, management, and peer-to-peer challenge operations
 * Uses Nostr events for decentralized challenge tracking
 */

import { getNostrTeamService } from './nostr/NostrTeamService';
import { NostrCompetitionLeaderboardService } from './competition/nostrCompetitionLeaderboardService';
import { challengeRequestService } from './challenge/ChallengeRequestService';
import type { Challenge, ChallengeCreationData, TeammateInfo } from '../types';
import type { NostrTeam } from './nostr/NostrTeamService';
import type { ChallengeRequestData } from './challenge/ChallengeRequestService';

interface CreateChallengeResponse {
  success: boolean;
  challengeId?: string;
  error?: string;
}

export interface NostrChallenge {
  id: string;
  name: string;
  description: string;
  challengerId: string;
  challengedId: string;
  challengeType: string;
  activityType: string;
  goalType: 'distance' | 'speed' | 'duration' | 'consistency';
  goalValue?: number;
  goalUnit?: string;
  duration: number; // Duration in days
  startTime: number;
  endTime: number;
  status: 'pending' | 'accepted' | 'active' | 'completed' | 'declined' | 'expired';
  prizeAmount: number;
  createdAt: number;
  teamId?: string;
  nostrEventId?: string; // Reference to the Nostr event
}

export class ChallengeService {
  private static cachedChallenges: Map<string, NostrChallenge> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Create a new peer-to-peer challenge as a Nostr event
   * Now uses ChallengeRequestService for kind 1105 publishing
   */
  static async createChallenge(
    challengeData: ChallengeCreationData,
    currentUserId: string,
    teamId: string
  ): Promise<CreateChallengeResponse> {
    try {
      if (!challengeData.opponentInfo || !challengeData.challengeType) {
        return {
          success: false,
          error: 'Missing required challenge data',
        };
      }

      // Map ChallengeCreationData to ChallengeRequestData for Nostr protocol
      const requestData: ChallengeRequestData = {
        challengedPubkey: challengeData.opponentId || challengeData.opponentInfo.id,
        activityType: (challengeData.challengeType.category === 'race' ? 'running' :
                      challengeData.challengeType.metric) as any,
        metric: (challengeData.challengeType.metric || 'distance') as any,
        duration: (challengeData.duration || 7) as any,
        wagerAmount: challengeData.wagerAmount || 0,
      };

      // Use ChallengeRequestService to publish kind 1105 event
      const result = await challengeRequestService.createChallengeRequest(
        requestData,
        '' // TODO: Pass nsec from user auth
      );

      if (result.success && result.challengeId) {
        // Cache challenge locally for backward compatibility
        const now = Math.floor(Date.now() / 1000);
        const challenge: NostrChallenge = {
          id: result.challengeId,
          name: `${challengeData.challengeType.name} Challenge`,
          description: challengeData.challengeType.description,
          challengerId: currentUserId,
          challengedId: challengeData.opponentId || challengeData.opponentInfo.id,
          challengeType: challengeData.challengeType.name,
          activityType: requestData.activityType,
          goalType: this.mapChallengeTypeToGoalType(challengeData.challengeType.name),
          goalValue: (challengeData.challengeType as any).targetValue || 10,
          goalUnit: (challengeData.challengeType as any).targetUnit || 'km',
          duration: requestData.duration,
          startTime: now,
          endTime: now + (requestData.duration * 24 * 60 * 60),
          status: 'pending',
          prizeAmount: requestData.wagerAmount,
          createdAt: now,
          teamId,
          nostrEventId: result.challengeId,
        };

        this.cachedChallenges.set(result.challengeId, challenge);
        console.log(`Challenge created via Nostr protocol: ${result.challengeId}`);
      }

      return result;
    } catch (error) {
      console.error('Challenge creation error:', error);
      return {
        success: false,
        error: 'Failed to create challenge',
      };
    }
  }

  /**
   * Get team members for challenge creation using NostrTeamService (excluding current user)
   */
  static async getTeamMembers(
    teamId: string,
    currentUserId: string
  ): Promise<TeammateInfo[]> {
    try {
      const nostrTeamService = getNostrTeamService();
      const cachedTeams = Array.from(nostrTeamService.getDiscoveredTeams().values());
      const team = cachedTeams.find((t) => t.id === teamId);

      if (!team) {
        console.error(`Team not found: ${teamId}`);
        return [];
      }

      // Get team members from Nostr
      const memberIds = await nostrTeamService.getTeamMembers(team);
      
      // Filter out current user and create teammate info
      const teammatesWithStats = await Promise.all(
        memberIds
          .filter((memberId) => memberId !== currentUserId)
          .map(async (memberId, index) => {
            const stats = await this.getUserChallengeStats(memberId);
            return {
              id: memberId,
              name: `Member ${index + 1}`, // TODO: Get actual names from Nostr profiles
              avatar: `M${index + 1}`,
              stats,
            };
          })
      );

      console.log(`👥 Found ${teammatesWithStats.length} potential challenge opponents`);
      return teammatesWithStats;
    } catch (error) {
      console.error('Failed to fetch Nostr team members:', error);
      return [];
    }
  }

  /**
   * Get user's challenge statistics from cached Nostr challenges
   */
  static async getUserChallengeStats(
    userId: string
  ): Promise<{ challengesCount: number; winsCount: number }> {
    try {
      // Get challenges from cache (in full implementation, query from Nostr events)
      const allChallenges = Array.from(this.cachedChallenges.values());
      
      // Filter challenges involving this user
      const userChallenges = allChallenges.filter(
        (challenge) => 
          challenge.challengerId === userId || challenge.challengedId === userId
      );

      // Count completed challenges
      const completedChallenges = userChallenges.filter(
        (challenge) => challenge.status === 'completed'
      );

      // Count wins by using NostrCompetitionLeaderboardService to determine winners
      let winsCount = 0;
      
      for (const challenge of completedChallenges) {
        try {
          // Get leaderboard for this challenge to determine winner
          const leaderboardService = NostrCompetitionLeaderboardService.getInstance();
          const leaderboard = await leaderboardService.computeChallengeLeaderboard(
            challenge.id,
            challenge.challengerId,
            challenge.challengedId,
            {
              activityType: challenge.activityType,
              goalType: challenge.goalType,
              startTime: challenge.startTime,
              endTime: challenge.endTime,
              goalValue: challenge.goalValue,
              goalUnit: challenge.goalUnit,
            }
          );
          
          // Check if this user won (position 1)
          const userParticipant = leaderboard.participants.find(p => p.pubkey === userId);
          if (userParticipant && userParticipant.position === 1) {
            winsCount++;
          }
        } catch (error) {
          console.error(`Failed to determine winner for challenge ${challenge.id}:`, error);
        }
      }

      return {
        challengesCount: completedChallenges.length,
        winsCount,
      };
    } catch (error) {
      console.error('Failed to get challenge stats:', error);
      return {
        challengesCount: 0,
        winsCount: 0,
      };
    }
  }

  /**
   * Accept a pending challenge
   * Now uses ChallengeRequestService for kind 1106 publishing
   */
  static async acceptChallenge(challengeId: string): Promise<boolean> {
    try {
      // Use ChallengeRequestService to publish kind 1106 and create kind 30000 list
      const result = await challengeRequestService.acceptChallenge(challengeId);

      if (result.success) {
        const challenge = this.cachedChallenges.get(challengeId);
        if (challenge) {
          challenge.status = 'accepted';
          this.cachedChallenges.set(challengeId, challenge);
        }
        console.log(`Challenge accepted via Nostr protocol: ${challengeId}`);
        return true;
      }

      console.error(`Failed to accept challenge: ${result.error}`);
      return false;
    } catch (error) {
      console.error('Failed to accept challenge:', error);
      return false;
    }
  }

  /**
   * Decline a pending challenge
   * Now uses ChallengeRequestService for kind 1107 publishing
   */
  static async declineChallenge(challengeId: string, reason?: string): Promise<boolean> {
    try {
      // Use ChallengeRequestService to publish kind 1107 decline event
      const result = await challengeRequestService.declineChallenge(challengeId, reason);

      if (result.success) {
        const challenge = this.cachedChallenges.get(challengeId);
        if (challenge) {
          challenge.status = 'declined';
          this.cachedChallenges.set(challengeId, challenge);
        }
        console.log(`Challenge declined via Nostr protocol: ${challengeId}`);
        return true;
      }

      console.error(`Failed to decline challenge: ${result.error}`);
      return false;
    } catch (error) {
      console.error('Failed to decline challenge:', error);
      return false;
    }
  }

  /**
   * Get user's pending challenges (both sent and received)
   * Now uses ChallengeRequestService to fetch from Nostr
   */
  static async getUserPendingChallenges(userId: string): Promise<Challenge[]> {
    try {
      // Get pending challenges from ChallengeRequestService
      const pendingChallenges = await challengeRequestService.getPendingChallenges();

      // Convert PendingChallenge to Challenge format
      const challenges: Challenge[] = pendingChallenges.map((challenge) => ({
        id: challenge.challengeId,
        name: `${challenge.activityType} Challenge`,
        description: `${challenge.metric} challenge for ${challenge.duration} days`,
        status: challenge.status,
        prizePool: challenge.wagerAmount,
        createdAt: new Date(challenge.requestedAt * 1000).toISOString(),
        challenger: {
          id: challenge.challengerPubkey,
          name: challenge.challengerName || `User ${challenge.challengerPubkey.substring(0, 8)}`,
        },
        challenged: {
          id: challenge.challengedPubkey,
          name: `User ${challenge.challengedPubkey.substring(0, 8)}`,
        },
        // Required Challenge properties
        teamId: '',
        challengerId: challenge.challengerPubkey,
        challengedId: challenge.challengedPubkey,
        type: 'peer_to_peer',
        // Additional challenge data
        challenge_type: challenge.activityType,
        metric: challenge.metric,
        deadline: new Date(challenge.endDate * 1000).toISOString(),
      }));

      console.log(`Found ${challenges.length} pending challenges via Nostr`);
      return challenges;
    } catch (error) {
      console.error('Failed to fetch pending challenges:', error);
      return [];
    }
  }

  /**
   * Get challenge by ID
   */
  static getChallengeById(challengeId: string): NostrChallenge | null {
    return this.cachedChallenges.get(challengeId) || null;
  }

  /**
   * Helper method to generate unique challenge ID
   */
  private static generateChallengeId(): string {
    return `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper method to map challenge type to goal type
   */
  private static mapChallengeTypeToGoalType(
    challengeType: string
  ): 'distance' | 'speed' | 'duration' | 'consistency' {
    const lowerType = challengeType.toLowerCase();

    if (lowerType.includes('distance') || lowerType.includes('km') || lowerType.includes('mile')) {
      return 'distance';
    } else if (lowerType.includes('speed') || lowerType.includes('pace') || lowerType.includes('fast')) {
      return 'speed';
    } else if (lowerType.includes('duration') || lowerType.includes('time') || lowerType.includes('minute')) {
      return 'duration';
    } else if (lowerType.includes('consistency') || lowerType.includes('streak') || lowerType.includes('daily')) {
      return 'consistency';
    }

    // Default fallback
    return 'distance';
  }

  /**
   * Clear cached challenges
   */
  static clearCache(): void {
    this.cachedChallenges.clear();
    console.log('🗑️ Cleared challenge cache');
  }

  /**
   * Get all cached challenges (for debugging)
   */
  static getCachedChallenges(): NostrChallenge[] {
    return Array.from(this.cachedChallenges.values());
  }
}
