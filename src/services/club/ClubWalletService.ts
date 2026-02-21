/**
 * ClubWalletService - Client wrapper for club-wallet edge function
 *
 * Provides balance checking, wallet creation, and payout log queries
 * for club rewards pools. All CoinOS credentials stay server-side;
 * clients only see balance and Lightning address.
 */

import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import type { ClubWalletInfo, ClubPayoutResult } from '../../types/club';

// In-memory cache for balance (60-second TTL)
const balanceCache = new Map<string, { data: ClubWalletInfo; timestamp: number }>();
const BALANCE_TTL = 60 * 1000; // 60 seconds

export class ClubWalletService {
  /**
   * Create a CoinOS wallet for a club.
   * Called automatically during club creation.
   */
  static async createWallet(
    clubId: string
  ): Promise<{ success: boolean; lightning_address?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await supabase!.functions.invoke('club-wallet', {
        body: { operation: 'create_wallet', club_id: clubId },
      });

      if (error) {
        console.error('[ClubWalletService] createWallet error:', error);
        return { success: false, error: error.message };
      }

      if (data?.success) {
        console.log(`[ClubWalletService] Wallet created: ${data.lightning_address}`);
        return { success: true, lightning_address: data.lightning_address };
      }

      return { success: false, error: data?.reason || 'Unknown error' };
    } catch (err) {
      console.error('[ClubWalletService] createWallet exception:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the club's rewards pool balance and Lightning address.
   * Cached for 60 seconds to avoid excessive edge function calls.
   */
  static async getBalance(clubId: string): Promise<ClubWalletInfo> {
    const noWallet: ClubWalletInfo = {
      lightning_address: '',
      balance_sats: 0,
      has_wallet: false,
    };

    if (!isSupabaseConfigured()) return noWallet;

    // Check cache
    const cached = balanceCache.get(clubId);
    if (cached && Date.now() - cached.timestamp < BALANCE_TTL) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase!.functions.invoke('club-wallet', {
        body: { operation: 'get_balance', club_id: clubId },
      });

      if (error || !data?.success) {
        // No wallet or error — return empty
        const result: ClubWalletInfo = {
          lightning_address: '',
          balance_sats: 0,
          has_wallet: false,
        };
        return result;
      }

      const result: ClubWalletInfo = {
        lightning_address: data.lightning_address || '',
        balance_sats: data.balance_sats ?? 0,
        has_wallet: true,
      };

      // Cache result
      balanceCache.set(clubId, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      console.error('[ClubWalletService] getBalance exception:', err);
      return noWallet;
    }
  }

  /**
   * Get payout log for a specific competition.
   * Used to show payout status on ended events.
   */
  static async getPayoutLog(
    competitionId: string
  ): Promise<ClubPayoutResult | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase!
        .from('club_payout_log')
        .select('competition_id, status, total_prize_sats, total_paid_sats, results')
        .eq('competition_id', competitionId)
        .single();

      if (error || !data) return null;

      return data as ClubPayoutResult;
    } catch (err) {
      console.error('[ClubWalletService] getPayoutLog exception:', err);
      return null;
    }
  }

  /**
   * Clear balance cache for a club (call after funding)
   */
  static clearCache(clubId?: string): void {
    if (clubId) {
      balanceCache.delete(clubId);
    } else {
      balanceCache.clear();
    }
  }
}

export default ClubWalletService;
