/**
 * useSeason3 — React hook for the Season III screen
 *
 * Provides bracket state, live scores, qualified clubs, and tournament phase.
 * Polls live step counts every 60s during an active matchup.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { Season3Service } from '../services/season/Season3Service';
import { Season3BracketService } from '../services/season/Season3BracketService';
import { getSeason3Status } from '../constants/season3';
import type {
  MatchupWithClubs,
  QualifiedClub,
  LiveScore,
  Season3Config,
  Season3Status,
} from '../types/season3';

interface UseSeason3Return {
  // Data
  bracket: MatchupWithClubs[];
  todaysMatchup: MatchupWithClubs | null;
  liveScores: LiveScore | null;
  qualifiedClubs: QualifiedClub[];
  notQualifiedClubs: QualifiedClub[];
  config: Season3Config | null;
  champion: string | null;
  runnerUp: string | null;

  // State
  tournamentPhase: Season3Status;
  isLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
}

export function useSeason3(): UseSeason3Return {
  const [bracket, setBracket] = useState<MatchupWithClubs[]>([]);
  const [todaysMatchup, setTodaysMatchup] = useState<MatchupWithClubs | null>(null);
  const [liveScores, setLiveScores] = useState<LiveScore | null>(null);
  const [qualifiedClubs, setQualifiedClubs] = useState<QualifiedClub[]>([]);
  const [notQualifiedClubs, setNotQualifiedClubs] = useState<QualifiedClub[]>([]);
  const [config, setConfig] = useState<Season3Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { status: tournamentPhase } = getSeason3Status();

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);

      const [configData, bracketData, clubsData] = await Promise.all([
        Season3Service.getConfig(forceRefresh),
        Season3Service.getBracket(forceRefresh).catch(() => [] as MatchupWithClubs[]),
        Season3Service.getAllClubsWithStatus(),
      ]);

      setConfig(configData);
      setBracket(bracketData);
      setQualifiedClubs(clubsData.qualified);
      setNotQualifiedClubs(clubsData.notQualified);

      const liveMatch = bracketData.find(m => m.status === 'live') ?? null;
      setTodaysMatchup(liveMatch);

      // Fetch live steps if there's an active matchup
      if (liveMatch?.club_a_id && liveMatch?.club_b_id && liveMatch?.match_date) {
        const scores = await Season3Service.getLiveSteps(
          liveMatch.club_a_id,
          liveMatch.club_b_id,
          liveMatch.match_date,
        );
        setLiveScores(scores);
      } else {
        setLiveScores(null);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load Season III data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    Season3Service.clearCache();
    await loadData(true);
  }, [loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll live scores every 60s during active matchup
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (todaysMatchup?.club_a_id && todaysMatchup?.club_b_id && todaysMatchup?.match_date) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const scores = await Season3Service.getLiveSteps(
            todaysMatchup.club_a_id!,
            todaysMatchup.club_b_id!,
            todaysMatchup.match_date!,
          );
          setLiveScores(scores);
        } catch {
          // Silent fail on poll
        }
      }, 60_000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [todaysMatchup?.id]);

  // Refresh on app foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadData(true);
      }
    });
    return () => subscription.remove();
  }, [loadData]);

  // Derive champion/runner-up
  const results = Season3BracketService.getResults(bracket);

  return {
    bracket,
    todaysMatchup,
    liveScores,
    qualifiedClubs,
    notQualifiedClubs,
    config,
    champion: results?.champion ?? null,
    runnerUp: results?.runnerUp ?? null,
    tournamentPhase: config?.status ?? tournamentPhase,
    isLoading,
    error,
    refresh,
  };
}
