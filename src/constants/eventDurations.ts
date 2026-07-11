/**
 * Event Duration Options
 * Defines available duration options for fitness events
 * Supports both short (minutes/hours) and long (days) durations
 */

export interface DurationOption {
  value: number; // Duration value
  unit: 'minutes' | 'hours' | 'days'; // Time unit
  label: string; // Display label
  minutes: number; // Total minutes (for calculations)
}

/**
 * Short duration options for sprint events
 * 10 minutes, 2 hours
 */
export const SHORT_DURATION_OPTIONS: DurationOption[] = [
  {
    value: 10,
    unit: 'minutes',
    label: '10 Minutes',
    minutes: 10,
  },
  {
    value: 2,
    unit: 'hours',
    label: '2 Hours',
    minutes: 120,
  },
];

/**
 * Standard duration options in days
 * For traditional multi-day events
 */
export const DAY_DURATION_OPTIONS: DurationOption[] = [
  {
    value: 1,
    unit: 'days',
    label: '1 Day',
    minutes: 1440,
  },
  {
    value: 3,
    unit: 'days',
    label: '3 Days',
    minutes: 4320,
  },
  {
    value: 7,
    unit: 'days',
    label: '7 Days',
    minutes: 10080,
  },
  {
    value: 14,
    unit: 'days',
    label: '14 Days',
    minutes: 20160,
  },
  {
    value: 30,
    unit: 'days',
    label: '30 Days',
    minutes: 43200,
  },
];

/**
 * All available duration options
 */
export const ALL_DURATION_OPTIONS: DurationOption[] = [
  ...SHORT_DURATION_OPTIONS,
  ...DAY_DURATION_OPTIONS,
];

/**
 * Get duration option by minutes
 */
export function getDurationByMinutes(
  minutes: number
): DurationOption | undefined {
  return ALL_DURATION_OPTIONS.find((option) => option.minutes === minutes);
}

/**
 * Check if duration is a short duration (< 24 hours)
 */
export function isShortDuration(durationMinutes: number): boolean {
  return durationMinutes < 1440;
}
