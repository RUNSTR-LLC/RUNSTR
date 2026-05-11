import type * as React from 'react';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface RewardLabel {
  label: string;
  icon: IconName;
}

/**
 * Renders a row label and icon for a reward_payments row.
 * Knows about: 'workout', 'steps', 'daily_bonus', 'event_bonus'.
 * Falls back to a generic label for unknown reward_type values so future
 * additions don't crash the History tab.
 */
export function rewardLabel(
  rewardType: string,
  metadata: Record<string, any> | null
): RewardLabel {
  switch (rewardType) {
    case 'workout':
      return { label: 'Workout reward', icon: 'fitness-outline' };
    case 'steps':
      return { label: 'Steps reward', icon: 'footsteps-outline' };
    case 'daily_bonus':
      return {
        label: dailyBonusLabel(metadata),
        icon: 'trophy-outline',
      };
    case 'event_bonus':
      return {
        label: eventBonusLabel(metadata),
        icon: 'flame-outline',
      };
    default:
      return { label: 'Reward', icon: 'star-outline' };
  }
}

function dailyBonusLabel(metadata: Record<string, any> | null): string {
  const lbLabel = typeof metadata?.leaderboard_label === 'string'
    ? metadata.leaderboard_label
    : null;
  const place = typeof metadata?.place === 'number' ? metadata.place : null;
  if (lbLabel !== null && place !== null) {
    return `${lbLabel} Daily — ${ordinal(place)} place`;
  }
  if (lbLabel) return `${lbLabel} Daily bonus`;
  return 'Daily bonus';
}

function eventBonusLabel(metadata: Record<string, any> | null): string {
  const name = typeof metadata?.event_name === 'string' ? metadata.event_name : null;
  const place = typeof metadata?.place === 'number' ? metadata.place : null;
  if (name !== null && place !== null) return `${name} — ${ordinal(place)} place`;
  if (name) return `${name} bonus`;
  return 'Event bonus';
}

function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}
