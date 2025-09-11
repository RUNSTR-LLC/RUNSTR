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

  const rankingService = new LeagueRankingService();
  const dataBridge = new LeagueDataBridge();

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
   */
  const loadRankings = useCallback(async (
    targetCompetitionId: string,
    participants: LeagueParticipant[],
    parameters: LeagueParameters,
    isRefresh = false
  ): Promise<void> => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      console.log(`🏆 Loading rankings for: ${targetCompetitionId}`);

      const result = await rankingService.calculateLeagueRankings(
        targetCompetitionId,
        participants,
        parameters
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
   */
  const refresh = useCallback(async (): Promise<void> => {
    console.log('🔄 Manual refresh triggered');

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
        true // isRefresh
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