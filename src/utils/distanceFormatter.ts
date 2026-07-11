/**
 * Distance Formatting Utility
 *
 * Single source of truth for distance formatting across the app.
 * All distances are stored in meters and displayed based on user preference.
 */

export type UnitSystem = 'metric' | 'imperial';

/**
 * Formats distance in meters to user's preferred unit
 * @param meters - Distance in meters
 * @param unitSystem - 'metric' for km, 'imperial' for miles (defaults to metric)
 * @returns Formatted string like "4.59 km" or "2.85 mi" or "--" if no distance
 */
export const formatDistance = (
  meters?: number,
  unitSystem: UnitSystem = 'metric'
): string => {
  if (!meters || meters <= 0) {
    return '--';
  }

  if (unitSystem === 'imperial') {
    const miles = meters * 0.000621371;
    return `${miles.toFixed(2)} mi`;
  }

  const kilometers = meters / 1000;
  return `${kilometers.toFixed(2)} km`;
};

/**
 * Formats distance for workout card generator (returns value without unit)
 * @param meters - Distance in meters
 * @param unitSystem - 'metric' for km, 'imperial' for miles (defaults to metric)
 * @returns Formatted string like "4.59" or null if no distance
 */
export const formatDistanceValue = (
  meters?: number,
  unitSystem: UnitSystem = 'metric'
): string | null => {
  if (!meters || meters <= 0) {
    return null;
  }

  if (unitSystem === 'imperial') {
    const miles = meters * 0.000621371;
    return miles.toFixed(2);
  }

  const kilometers = meters / 1000;
  return kilometers.toFixed(2);
};

/**
 * Converts meters to user's preferred unit (returns raw number)
 * @param meters - Distance in meters
 * @param unitSystem - 'metric' for km, 'imperial' for miles
 * @returns Distance in km or miles
 */
export const convertDistance = (
  meters: number,
  unitSystem: UnitSystem = 'metric'
): number => {
  if (unitSystem === 'imperial') {
    return meters * 0.000621371;
  }
  return meters / 1000;
};

/**
 * Gets the distance unit label
 * @param unitSystem - 'metric' or 'imperial'
 * @returns 'km' or 'mi'
 */
export const getDistanceUnit = (unitSystem: UnitSystem = 'metric'): string => {
  return unitSystem === 'imperial' ? 'mi' : 'km';
};

/**
 * Formats a distance value already in km for display (e.g. leaderboard totals).
 * Use formatDistance() for raw meter values.
 */
export function formatDistanceKm(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k km`;
  if (km >= 100) return `${km.toFixed(0)} km`;
  return `${km.toFixed(1)} km`;
}
