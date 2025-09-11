/**
 * useCaptainDetection - React hook for captain status detection
 * Integrates CaptainDetectionService with React components for real-time captain UI
 */

import { useState, useEffect, useCallback } from 'react';
import { CaptainDetectionService } from '../services/team/captainDetectionService';
import { useUserStore } from '../store/userStore';

export interface CaptainDetectionState {
  isCaptain: boolean;
  isLoading: boolean;
  error: string | null;
  captainOfTeams: string[];
  lastChecked: number | null;
}

export interface CaptainDetectionHook extends CaptainDetectionState {
  checkCaptainStatus: () => Promise<void>;
  refreshCaptainStatus: () => Promise<void>;
  isCaptainOfTeam: (teamId: string) => boolean;
}

/**
 * Hook for detecting captain status with caching and real-time updates
 */
export const useCaptainDetection = (): CaptainDetectionHook => {
  const user = useUserStore((state) => state.user);
  const [state, setState] = useState<CaptainDetectionState>({
    isCaptain: false,
    isLoading: false,
    error: null,
    captainOfTeams: [],
    lastChecked: null,
  });

  const captainService = CaptainDetectionService.getInstance();

  /**
   * Check captain status for current user
   */
  const checkCaptainStatus = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ 
        ...prev, 
        isCaptain: false, 
        isLoading: false, 
        error: 'No user found',
        captainOfTeams: [],
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log(`🔍 useCaptainDetection: Checking captain status for ${user.id.slice(0, 8)}...`);
      
      const captainStatus = await captainService.getCaptainStatus(user.id);
      
      setState({
        isCaptain: captainStatus.isCaptain,
        isLoading: false,
        error: null,
        captainOfTeams: captainStatus.captainOfTeams,
        lastChecked: captainStatus.lastChecked,
      });

      console.log(`✅ useCaptainDetection: Captain status = ${captainStatus.isCaptain} (${captainStatus.captainOfTeams.length} teams)`);

    } catch (error) {
      console.error('❌ useCaptainDetection: Failed to check captain status:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check captain status',
      }));
    }
  }, [user?.id, captainService]);

  /**
   * Force refresh captain status (bypass cache)
   */
  const refreshCaptainStatus = useCallback(async () => {
    if (!user?.id) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log(`🔄 useCaptainDetection: Force refreshing captain status...`);
      
      const captainStatus = await captainService.refreshCaptainStatus(user.id);
      
      setState({
        isCaptain: captainStatus.isCaptain,
        isLoading: false,
        error: null,
        captainOfTeams: captainStatus.captainOfTeams,
        lastChecked: captainStatus.lastChecked,
      });

      console.log(`✅ useCaptainDetection: Refreshed captain status = ${captainStatus.isCaptain}`);

    } catch (error) {
      console.error('❌ useCaptainDetection: Failed to refresh captain status:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh captain status',
      }));
    }
  }, [user?.id, captainService]);

  /**
   * Check if user is captain of specific team
   */
  const isCaptainOfTeam = useCallback((teamId: string): boolean => {
    return state.captainOfTeams.includes(teamId);
  }, [state.captainOfTeams]);

  /**
   * Auto-check captain status when user changes
   */
  useEffect(() => {
    if (user?.id) {
      checkCaptainStatus();
    }
  }, [user?.id, checkCaptainStatus]);

  /**
   * Subscribe to team updates (when available)
   */
  useEffect(() => {
    if (!user?.id) return;

    let subscriptionId: string | null = null;

    const setupSubscription = async () => {
      try {
        subscriptionId = await captainService.subscribeToTeamUpdates(user.id);
        console.log(`📡 useCaptainDetection: Subscribed to team updates: ${subscriptionId}`);
      } catch (error) {
        console.warn('⚠️ useCaptainDetection: Failed to subscribe to team updates:', error);
      }
    };

    setupSubscription();

    return () => {
      if (subscriptionId) {
        console.log(`📡 useCaptainDetection: Unsubscribing from team updates: ${subscriptionId}`);
        // TODO: Implement unsubscription when CaptainDetectionService supports it
      }
    };
  }, [user?.id, captainService]);

  return {
    ...state,
    checkCaptainStatus,
    refreshCaptainStatus,
    isCaptainOfTeam,
  };
};

/**
 * Hook for captain detection with team-specific context
 */
export const useTeamCaptainDetection = (teamId?: string) => {
  const captainDetection = useCaptainDetection();
  
  return {
    ...captainDetection,
    isCaptainOfThisTeam: teamId ? captainDetection.isCaptainOfTeam(teamId) : false,
  };
};

export default useCaptainDetection;