// src/services/lottery/LotteryService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { calculateLotteryMultiplier, LAST_SPIN_DATE_KEY } from '../../types/lottery';
import type { LotterySpin } from '../../types/lottery';
import type { RealtimeChannel } from '@supabase/supabase-js';

export class LotteryService {
  private static instance: LotteryService;
  private activeChannel: RealtimeChannel | null = null;

  static getInstance(): LotteryService {
    if (!LotteryService.instance) {
      LotteryService.instance = new LotteryService();
    }
    return LotteryService.instance;
  }

  async canSpinToday(): Promise<boolean> {
    try {
      const lastSpin = await AsyncStorage.getItem(LAST_SPIN_DATE_KEY);
      if (!lastSpin) return true;
      const today = new Date().toISOString().split('T')[0];
      return lastSpin !== today;
    } catch {
      return true;
    }
  }

  getMillisUntilReset(): number {
    const now = new Date();
    const midnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0
    ));
    return midnight.getTime() - now.getTime();
  }

  async submitSpin(npub: string, level: number): Promise<LotterySpin | null> {
    if (!isSupabaseConfigured()) {
      console.error('[LotteryService] Supabase not configured');
      return null;
    }

    const multiplier = calculateLotteryMultiplier(level);

    const { data, error } = await supabase!
      .from('lottery_spins')
      .insert({
        npub,
        level,
        multiplier: parseFloat(multiplier.toFixed(2)),
      })
      .select()
      .single();

    if (error) {
      console.error('[LotteryService] Failed to submit spin:', error);
      return null;
    }

    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(LAST_SPIN_DATE_KEY, today);

    return data as LotterySpin;
  }

  subscribeToSpinResult(
    spinId: string,
    onResult: (spin: LotterySpin) => void
  ): () => void {
    if (!isSupabaseConfigured()) return () => {};

    this.unsubscribe();

    const channel = supabase!
      .channel(`lottery_spin:${spinId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lottery_spins',
          filter: `id=eq.${spinId}`,
        },
        (payload) => {
          const spin = payload.new as LotterySpin;
          if (spin.status !== 'pending') {
            onResult(spin);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[LotteryService] Realtime status: ${status}`);
      });

    this.activeChannel = channel;

    return () => this.unsubscribe();
  }

  async fetchSpinResult(spinId: string): Promise<LotterySpin | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase!
      .from('lottery_spins')
      .select()
      .eq('id', spinId)
      .single();

    if (error) {
      console.error('[LotteryService] Failed to fetch spin:', error);
      return null;
    }

    return data as LotterySpin;
  }

  async getTodaySpin(npub: string): Promise<LotterySpin | null> {
    if (!isSupabaseConfigured()) return null;

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const { data, error } = await supabase!
      .from('lottery_spins')
      .select()
      .eq('npub', npub)
      .gte('spun_at', `${today}T00:00:00Z`)
      .lt('spun_at', `${tomorrow}T00:00:00Z`)
      .order('spun_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[LotteryService] Failed to fetch today spin:', error);
      return null;
    }

    return data as LotterySpin | null;
  }

  private unsubscribe(): void {
    if (this.activeChannel) {
      supabase?.removeChannel(this.activeChannel);
      this.activeChannel = null;
    }
  }
}

export default LotteryService.getInstance();
