/**
 * useChallengeCreation - Custom hook for challenge creation wizard
 * Integrates data fetching, validation, and challenge creation workflow
 */

import { useState, useEffect, useCallback } from 'react';
import { ChallengeService } from '../services/challengeService';
import { getNostrTeamService } from '../services/nostr/NostrTeamService';
// Removed Bitcoin utilities - no wagers in this phase
import type { TeammateInfo, ChallengeCreationData, User } from '../types';

interface UseChallengeCreationProps {
  currentUser?: User;
  teamId?: string;
  onComplete?: (challengeData: ChallengeCreationData) => Promise<void>;
}

interface UseChallengeCreationReturn {
  // Data
  teammates: TeammateInfo[];
  isLoading: boolean;
  error: string | null;

  // Actions
  createChallenge: (challengeData: ChallengeCreationData) => Promise<void>;
  refreshTeammates: () => Promise<void>;
  clearError: () => void;
}

export const useChallengeCreation = ({
  currentUser,
  teamId,
  onComplete,
}: UseChallengeCreationProps = {}): UseChallengeCreationReturn => {
  const [teammates, setTeammates] = useState<TeammateInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch team members for challenge creation using NostrTeamService
   */
  const fetchTeammates = useCallback(async () => {
    if (!currentUser?.npub || !teamId) {
      console.warn('Missing currentUser npub or teamId for fetching teammates');
      setTeammates([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nostrTeamService = getNostrTeamService();
      const cachedTeams = nostrTeamService.getCachedTeams();
      const nostrTeam = cachedTeams.find((t) => t.id === teamId);
      
      if (!nostrTeam) {
        throw new Error('Team not found in cached teams');
      }

      const memberIds = await nostrTeamService.getTeamMembers(nostrTeam);
      
      if (!memberIds || memberIds.length === 0) {
        throw new Error('No teammates available for challenges');
      }

      // Filter out current user and convert to TeammateInfo format
      const teammates: TeammateInfo[] = memberIds
        .filter((memberId) => memberId !== currentUser.npub && memberId !== currentUser.id)
        .map((memberId, index) => ({
          id: memberId,
          name: `Member ${index + 1}`, // TODO: Get actual names from Nostr profiles
          avatar: `M${index + 1}`, // First letter of name for now
          stats: {
            challengesCount: 0, // TODO: Get real challenge stats when available
            winsCount: 0, // TODO: Get real win stats when available
          },
        }));

      if (teammates.length === 0) {
        throw new Error('Your team needs at least 2 members to create challenges');
      }

      setTeammates(teammates);
    } catch (err) {
      console.error('Failed to fetch teammates:', err);

      // Set specific error messages based on error type
      let errorMessage = 'Failed to load teammates. Please try again.';

      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage =
            'Network error. Please check your connection and try again.';
        } else if (err.message.includes('Team not found')) {
          errorMessage = 'Team not found. Please refresh and try again.';
        } else if (err.message.includes('No teammates')) {
          errorMessage =
            'Your team needs at least 2 members to create challenges.';
        }
      }

      setError(errorMessage);
      setTeammates([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.npub, currentUser?.id, teamId]);

  // Removed Bitcoin validation - no wagers in this phase

  /**
   * Create challenge using ChallengeService
   */
  const createChallenge = useCallback(
    async (challengeData: ChallengeCreationData) => {
      if (!currentUser?.id || !teamId) {
        throw new Error('User not authenticated or team not selected');
      }

      setIsLoading(true);
      setError(null);

      try {
        // Comprehensive data validation
        if (!challengeData.opponentId) {
          throw new Error('Please select an opponent for the challenge');
        }

        if (!challengeData.challengeType) {
          throw new Error('Please select a challenge type');
        }

        // No wager validation needed in this phase

        // Check if opponent is still available (in case they left the team)
        const currentTeammates = teammates.find(
          (t) => t.id === challengeData.opponentId
        );
        if (!currentTeammates) {
          throw new Error(
            'Selected opponent is no longer available. Please choose another teammate.'
          );
        }

        // Create challenge via service with timeout
        const challengePromise = ChallengeService.createChallenge(
          challengeData,
          currentUser.id,
          teamId
        );

        // Add 30 second timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error('Challenge creation timed out. Please try again.')
              ),
            30000
          )
        );

        const result = (await Promise.race([
          challengePromise,
          timeoutPromise,
        ])) as any;

        if (!result || !result.success) {
          throw new Error(result?.error || 'Failed to create challenge');
        }

        // Call external completion handler if provided
        if (onComplete) {
          try {
            await onComplete(challengeData);
          } catch (completionError) {
            console.warn(
              'External completion handler failed:',
              completionError
            );
            // Don't throw here - challenge was created successfully
          }
        }

        console.log('Challenge created successfully:', result.challengeId);
      } catch (err) {
        let errorMessage = 'Challenge creation failed';

        if (err instanceof Error) {
          errorMessage = err.message;

          // Enhance error messages for common issues
          if (err.message.includes('timeout')) {
            errorMessage =
              'Challenge creation timed out. Please check your connection and try again.';
          // Removed insufficient funds error - no wagers in this phase
          } else if (
            err.message.includes('duplicate') ||
            err.message.includes('already exists')
          ) {
            errorMessage =
              'You already have an active challenge with this opponent.';
          } else if (err.message.includes('rate limit')) {
            errorMessage =
              'Too many challenge requests. Please wait a moment and try again.';
          } else if (
            err.message.includes('server') ||
            err.message.includes('500')
          ) {
            errorMessage = 'Server error. Please try again in a few minutes.';
          }
        }

        setError(errorMessage);
        console.error('Challenge creation failed:', err);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser?.id, teamId, onComplete, teammates]
  );

  /**
   * Refresh teammates data
   */
  const refreshTeammates = useCallback(async () => {
    await fetchTeammates();
  }, [fetchTeammates]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load teammates on mount and when dependencies change
  useEffect(() => {
    fetchTeammates();
  }, [fetchTeammates]);

  return {
    // Data
    teammates,
    isLoading,
    error,

    // Actions
    createChallenge,
    refreshTeammates,
    clearError,
  };
};

export default useChallengeCreation;
