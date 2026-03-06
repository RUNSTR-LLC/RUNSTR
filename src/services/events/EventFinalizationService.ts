/**
 * EventFinalizationService
 *
 * Handles event completion: query finishers, select random winner,
 * and display results. Prize payout is organizer-initiated.
 *
 * Winner selection modes:
 * - ranked: Top finisher by total distance wins
 * - random: Deterministic random selection using SHA256 hash of
 *   (eventId + sorted npubs) — verifiable by anyone with the same inputs
 */

import CryptoJS from 'crypto-js';
import { callEdgeFunction } from '../../utils/edgeFunctions';

export interface Finisher {
  npub: string;
  totalDistanceKm: number;
  name?: string;
  lightningAddress?: string;
}

export interface FinalizationResult {
  eventId: string;
  finishers: Finisher[];
  winner?: Finisher;
  winnerSelection: 'ranked' | 'random';
  prizePoolSats: number;
}

class EventFinalizationServiceClass {

  /**
   * Finalize a ticketed event — query finishers and select winner
   */
  async finalizeEvent(
    eventId: string,
    winnerSelection: 'ranked' | 'random',
    qualifyingDistanceKm: number,
    prizePoolSats: number,
  ): Promise<FinalizationResult> {
    const finishers = await this.getFinishers(eventId, qualifyingDistanceKm);

    if (finishers.length === 0) {
      return { eventId, finishers: [], winnerSelection, prizePoolSats };
    }

    let winner: Finisher | undefined;

    if (winnerSelection === 'random') {
      winner = this.selectRandomWinner(eventId, finishers);
    } else {
      // Ranked: highest total distance wins
      winner = [...finishers].sort((a, b) => b.totalDistanceKm - a.totalDistanceKm)[0];
    }

    return { eventId, finishers, winner, winnerSelection, prizePoolSats };
  }

  /**
   * Query finishers who met the qualifying distance
   */
  async getFinishers(eventId: string, qualifyingDistanceKm: number): Promise<Finisher[]> {
    const result = await callEdgeFunction<{ finishers: Finisher[] }>('finalize-ticketed-event', {
      action: 'get_finishers',
      competition_id: eventId,
      qualifying_distance_km: qualifyingDistanceKm,
    });

    if (!result.success || !result.data?.finishers) {
      console.error('[EventFinalization] Failed to get finishers:', result.error);
      return [];
    }

    return result.data.finishers;
  }

  /**
   * Deterministic random winner selection
   * seed = SHA256(eventId + sorted npubs) — verifiable by anyone
   */
  selectRandomWinner(eventId: string, finishers: Finisher[]): Finisher {
    const sortedNpubs = finishers.map(f => f.npub).sort().join(',');
    const input = `${eventId}:${sortedNpubs}`;

    // SHA256 produces a deterministic hex string
    const hash = CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);

    // Take first 8 hex chars (32 bits) and convert to a number for index selection
    const hashPrefix = hash.substring(0, 8);
    const hashNumber = parseInt(hashPrefix, 16);
    const winnerIndex = hashNumber % finishers.length;

    console.log(`[EventFinalization] Random winner: index ${winnerIndex} of ${finishers.length} finishers`);
    console.log(`[EventFinalization] SHA256 input: "${eventId}:${sortedNpubs.substring(0, 30)}..."`);
    console.log(`[EventFinalization] Hash: ${hash.substring(0, 16)}...`);

    return finishers[winnerIndex];
  }
}

export const EventFinalizationService = new EventFinalizationServiceClass();
