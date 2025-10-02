/**
 * useLeagueRankings Hook - React integration for live league rankings
 * Seamlessly integrates LeagueRankingService with React components
 * Handles loading states, caching, and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import LeagueRankingService, {
  LeagueRankingResult,
  LeagueParameters,
  LeagueParticipant,
} from '../services/competition/leagueRankingService';
import LeagueDataBridge, { ActiveLeague } from '../services/competition/leagueDataBridge';

export interface UseLeagueRankingsOptions {
  teamId?: string;
  competitionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseLeagueRankingsResult {
  rankings: LeagueRankingResult | null;
  activeLeague: ActiveLeague | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  hasActiveLeague: boolean;
}

export function useLeagueRankings(options: UseLeagueRankingsOptions): UseLeagueRankingsResult {
  const {
    teamId,
    competitionId,
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute default
  } = options;

  const [rankings, setRankings] = useState<LeagueRankingResult | null>(null);
  const [activeLeague, setActiveLeague] = useState<ActiveLeague | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const rankingService = LeagueRankingService;
  const dataBridge = LeagueDataBridge;

  /**
   * Load active league for team
   */
  const loadActiveLeague = useCallback(async (): Promise<ActiveLeague | null> => {
    if (!teamId) return null;

    try {
      const league = await dataBridge.getActiveLeagueForTeam(teamId);
      setActiveLeague(league);
      return league;
    } catch (err) {
      console.error('❌ Failed to load active league:', err);
      return null;
    }
  }, [teamId, dataBridge]);

  /**
   * Load rankings for competition
   * Now supports force refresh to bypass 24-hour cache
   */
  const loadRankings = useCallback(async (
    targetCompetitionId: string,
    participants: LeagueParticipant[],
    parameters: LeagueParameters,
    isRefresh = false,
    forceRefresh = false // New parameter for pull-to-refresh
  ): Promise<void> => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      console.log(`🏆 Loading rankings for: ${targetCompetitionId}${forceRefresh ? ' (FORCE)' : ''}`);

      const result = await rankingService.calculateLeagueRankings(
        targetCompetitionId,
        participants,
        parameters,
        forceRefresh // Pass force flag to bypass cache
      );

      setRankings(result);
      setError(null);

    } catch (err) {
      console.error('❌ Failed to load rankings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rankings');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  }, [rankingService]);

  /**
   * Refresh rankings manually
   * Forces a fresh fetch bypassing the 24-hour cache
   */
  const refresh = useCallback(async (): Promise<void> => {
    console.log('🔄 Manual refresh triggered (force bypass cache)');

    let targetLeague = activeLeague;

    // Reload active league if using teamId
    if (teamId && !competitionId) {
      targetLeague = await loadActiveLeague();
    }

    if (targetLeague) {
      await loadRankings(
        targetLeague.competitionId,
        targetLeague.participants,
        targetLeague.parameters,
        true, // isRefresh (show loading state)
        true  // forceRefresh (bypass cache)
      );
    }
  }, [activeLeague, teamId, competitionId, loadActiveLeague, loadRankings]);

  /**
   * Initialize data loading
   */
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setError(null);

      try {
        let targetLeague: ActiveLeague | null = null;
        let targetCompetitionId: string | null = null;

        if (competitionId) {
          // Direct competition ID provided
          targetCompetitionId = competitionId;
          
          // Try to get league data from competition ID
          const parameters = await dataBridge.getLeagueParameters(competitionId);
          const participants = await dataBridge.getLeagueParticipants(competitionId);
          
          if (parameters) {
            targetLeague = {
              competitionId,
              teamId: teamId || '',
              name: 'Competition',
              description: '',
              parameters,
              participants,
              createdBy: '',
              isActive: true,
              lastUpdated: new Date().toISOString(),
            };
          }
        } else if (teamId) {
          // Load active league for team
          targetLeague = await loadActiveLeague();
          targetCompetitionId = targetLeague?.competitionId || null;
        }

        if (targetLeague && targetCompetitionId) {
          console.log(`✅ Initialized league data: ${targetLeague.name}`);
          await loadRankings(
            targetCompetitionId,
            targetLeague.participants,
            targetLeague.parameters
          );
        } else {
          console.log('📭 No active league found');
          setRankings(null);
        }

      } catch (err) {
        console.error('❌ Failed to initialize league rankings:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [teamId, competitionId, dataBridge, loadActiveLeague, loadRankings]);

  /**
   * Auto-refresh interval
   */
  useEffect(() => {
    if (!autoRefresh || !activeLeague?.isActive) {
      return;
    }

    console.log(`⏰ Setting up auto-refresh: ${refreshInterval}ms`);
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh triggered');
      refresh();
    }, refreshInterval);

    return () => {
      console.log('⏰ Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, activeLeague?.isActive, refresh]);

  return {
    rankings,
    activeLeague,
    loading,
    error,
    refreshing,
    refresh,
    hasActiveLeague: activeLeague !== null,
  };
}