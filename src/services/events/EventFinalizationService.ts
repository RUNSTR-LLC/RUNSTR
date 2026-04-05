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

export interface Finisher {
  npub: string;
  totalDistanceKm: number;
  name?: string;
  lightningAddress?: string;
}

export interface PayoutRecipient {
  npub: string;
  name?: string;
  amount_sats: number;
  address: string;
  success: boolean;
  error?: string;
}

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
    if (finishers.length === 0 || prizePoolSats <= 0) return [];

    if (distribution === 'all_participants') {
      const perPerson = Math.floor(prizePoolSats / finishers.length);
      const remainder = prizePoolSats - (perPerson * finishers.length);

      return finishers.map((f, i) => ({
        npub: f.npub,
        name: f.name,
        amount_sats: perPerson + (i === 0 ? remainder : 0),
        address: f.lightningAddress || '',
        success: false,
        error: undefined,
      }));
    }

    // top3 distribution: 50/30/20 (adjusts for fewer)
    const ranked = [...finishers].sort((a, b) => b.totalDistanceKm - a.totalDistanceKm);
    const top = ranked.slice(0, 3);

    let percentages: number[];
    if (top.length === 1) {
      percentages = [100];
    } else if (top.length === 2) {
      percentages = [60, 40];
    } else {
      percentages = [50, 30, 20];
    }

    let allocated = 0;
    return top.map((f, i) => {
      const isLast = i === top.length - 1;
      const amount = isLast
        ? prizePoolSats - allocated
        : Math.floor(prizePoolSats * percentages[i] / 100);
      allocated += amount;

      return {
        npub: f.npub,
        name: f.name,
        amount_sats: amount,
        address: f.lightningAddress || '',
        success: false,
        error: undefined,
      };
    });
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
