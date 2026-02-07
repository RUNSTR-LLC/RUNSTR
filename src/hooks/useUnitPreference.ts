/**
 * useUnitPreference - Hook for managing km/miles unit preference
 * Provides unit system state and helper labels for distance display
 */

import { useState, useEffect, useCallback } from 'react';
import {
  activityMetricsService,
  UnitSystem,
} from '../services/activity/ActivityMetricsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UNIT_PREFERENCE_KEY = '@runstr:unit_preference';

export function useUnitPreference() {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('metric');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(UNIT_PREFERENCE_KEY).then((stored) => {
      if (stored === 'imperial' || stored === 'metric') {
        setUnitSystemState(stored);
      }
      setLoading(false);
    });
  }, []);

  const setUnitSystem = useCallback(async (newSystem: UnitSystem) => {
    await activityMetricsService.setUnitSystem(newSystem);
    setUnitSystemState(newSystem);
  }, []);

  return {
    unitSystem,
    loading,
    isMetric: unitSystem === 'metric',
    distanceLabel: unitSystem === 'imperial' ? 'mi' : 'km',
    paceLabel: unitSystem === 'imperial' ? '/mi' : '/km',
    speedLabel: unitSystem === 'imperial' ? 'mph' : 'km/h',
    setUnitSystem,
  };
}

export type { UnitSystem };
