/**
 * EventFinalizationService
 *
 * Handles event completion: query finishers, select winners,
 * calculate prize splits, and execute payouts via NWC.
 *
 * Winner selection modes:
 * - ranked: Top finisher by total distance wins
 * - random: Deterministic random selection using SHA256 hash
 *
 * Prize distribution modes:
 * - top3: 50% / 30% / 20% (adjusts for fewer participants)
 * - all_participants: Equal split (remainder to 1st place)
 */

import CryptoJS from 'crypto-js';
import { callEdgeFunction } from '../../utils/edgeFunctions';
import NWCWalletService from '../wallet/NWCWalletService';
import {
  Finisher,
  PayoutRecipient,
  calculateSplits as calculateSplitsPure,
} from './payoutMath';

export type { Finisher, PayoutRecipient };

export interface FinalizationResult {
  eventId: string;
  finishers: Finisher[];
  winner?: Finisher;
  winnerSelection: 'ranked' | 'random';
  prizePoolSats: number;
  payoutResults?: PayoutRecipient[];
}

class EventFinalizationServiceClass {

  /**
   * Finalize a competition — query finishers, select winner(s), and optionally pay out
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
      winner = [...finishers].sort((a, b) => b.totalDistanceKm - a.totalDistanceKm)[0];
    }

    return { eventId, finishers, winner, winnerSelection, prizePoolSats };
  }

  /**
   * Calculate prize splits based on distribution mode
   */
  calculateSplits(
    finishers: Finisher[],
    prizePoolSats: number,
    distribution: 'top3' | 'all_participants',
  ): PayoutRecipient[] {
    return calculateSplitsPure(finishers, prizePoolSats, distribution);
  }

  /**
   * Execute payouts to all recipients sequentially via NWC
   */
  async executePayout(recipients: PayoutRecipient[]): Promise<PayoutRecipient[]> {
    const results: PayoutRecipient[] = [];

    for (const recipient of recipients) {
      if (!recipient.address) {
        results.push({ ...recipient, success: false, error: 'No rewards address' });
        continue;
      }

      if (recipient.amount_sats <= 0) {
        results.push({ ...recipient, success: false, error: 'Amount is zero' });
        continue;
      }

      try {
        console.log(`[EventFinalization] Paying ${recipient.amount_sats} sats to ${recipient.address}`);
        const payResult = await NWCWalletService.payLightningAddress(
          recipient.address,
          recipient.amount_sats,
        );

        results.push({
          ...recipient,
          success: payResult.success,
          error: payResult.success ? undefined : payResult.error,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Payment failed';
        console.error(`[EventFinalization] Payment error for ${recipient.npub}:`, msg);
        results.push({ ...recipient, success: false, error: msg });
      }
    }

    return results;
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

    const hash = CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
    const hashPrefix = hash.substring(0, 8);
    const hashNumber = parseInt(hashPrefix, 16);
    const winnerIndex = hashNumber % finishers.length;

    console.log(`[EventFinalization] Random winner: index ${winnerIndex} of ${finishers.length} finishers`);
    return finishers[winnerIndex];
  }
}

export const EventFinalizationService = new EventFinalizationServiceClass();
