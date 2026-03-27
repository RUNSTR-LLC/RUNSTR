export interface LotterySegment {
  segment: number;
  baseValue: number;
  probability: number;
}

export interface LotterySpin {
  id: string;
  npub: string;
  level: number;
  multiplier: number;
  segment_value: number | null;
  final_payout: number | null;
  status: 'pending' | 'completed' | 'paid';
  spun_at: string;
}

export interface LotteryConfig {
  segments: LotterySegment[];
}

/**
 * Default wheel segments — used as fallback if lottery_config table
 * is not yet set up. Server-side config takes precedence.
 */
export const DEFAULT_SEGMENTS: LotterySegment[] = [
  { segment: 1, baseValue: 10, probability: 0.35 },
  { segment: 2, baseValue: 25, probability: 0.25 },
  { segment: 3, baseValue: 50, probability: 0.18 },
  { segment: 4, baseValue: 100, probability: 0.12 },
  { segment: 5, baseValue: 250, probability: 0.06 },
  { segment: 6, baseValue: 500, probability: 0.03 },
  { segment: 7, baseValue: 1000, probability: 0.01 },
];

/**
 * Calculate lottery multiplier from user level.
 * Linear: +0.1x per level. Level 0 = 1.0x, Level 50 = 6.0x.
 */
export function calculateLotteryMultiplier(level: number): number {
  return 1.0 + level * 0.1;
}

/** AsyncStorage key for last spin date */
export const LAST_SPIN_DATE_KEY = '@runstr:last_spin_date';
