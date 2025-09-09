/**
 * useChallengeCreation - Custom hook for challenge creation wizard
 * Integrates data fetching, validation, and challenge creation workflow
 */

import { useState, useEffect, useCallback } from 'react';
import { ChallengeService } from '../services/challengeService';
import { validateWagerAmount, formatSats } from '../utils/bitcoinUtils';
// Removed mock data import - using real ChallengeService.getTeamMembers
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

  // Validation
  validateWager: (amount: number) => { isValid: boolean; error?: string };
  formatWagerDisplay: (amount: number) => string;

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
   * Fetch team members for challenge creation
   */
  const fetchTeammates = useCallback(async () => {
    if (!currentUser?.id || !teamId) {
      console.warn('Missing currentUser or teamId for fetching teammates');
      setTeammates([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const teammateData = await ChallengeService.getTeamMembers(
        teamId,
        currentUser.id
      );

      if (!teammateData || teammateData.length === 0) {
        throw new Error('No teammates available for challenges');
      }

      setTeammates(teammateData);
    } catch (err) {
      console.error('Failed to fetch teammates:', err);

      // Set specific error messages based on error type
      let errorMessage = 'Failed to load teammates. Please try again.';

      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage =
            'Network error. Please check your connection and try again.';
        } else if (
          err.message.includes('unauthorized') ||
          err.message.includes('403')
        ) {
          errorMessage =
            "You don't have permission to access team member data.";
        } else if (
          err.message.includes('not found') ||
          err.message.includes('404')
        ) {
          errorMessage = 'Team not found. Please contact your team captain.';
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
  }, [currentUser?.id, teamId]);

  /**
   * Validate wager amount using bitcoinUtils
   */
  const validateWager = useCallback((amount: number) => {
    return validateWagerAmount(amount);
  }, []);

  /**
   * Format wager amount for display
   */
  const formatWagerDisplay = useCallback((amount: number) => {
    return formatSats(amount);
  }, []);

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

        if (!challengeData.wagerAmount || challengeData.wagerAmount <= 0) {
          throw new Error('Please enter a valid wager amount');
        }

        // Validate wager amount using bitcoin utilities
        const wagerValidation = validateWagerAmount(challengeData.wagerAmount);
        if (!wagerValidation.isValid) {
          throw new Error(wagerValidation.error || 'Invalid wager amount');
        }

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
          } else if (err.message.includes('insufficient funds')) {
            errorMessage =
              'Insufficient balance in your wallet for this wager amount.';
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

    // Validation
    validateWager,
    formatWagerDisplay,

    // Actions
    createChallenge,
    refreshTeammates,
    clearError,
  };
};

export default useChallengeCreation;
