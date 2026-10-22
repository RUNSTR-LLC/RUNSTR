/**
 * useHealthAppWorkouts - Apple Health (iOS) / Health Connect (Android) workouts
 * for the History list: checks permission on mount, loads cached then fresh
 * workouts, and handles the "Sync Apple Health / Health Connect" banner tap.
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import healthKitService from '../../../services/fitness/healthKitService';
import healthConnectService from '../../../services/fitness/healthConnectService';
import type { Workout } from '../../../types/workout';

export function useHealthAppWorkouts(userId: string) {
  const [healthWorkouts, setHealthWorkouts] = useState<Workout[]>([]);
  const [healthPermission, setHealthPermission] = useState(false);
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [isHealthSyncing, setIsHealthSyncing] = useState(false);

  useEffect(() => {
    checkHealthPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkHealthPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const status = healthKitService.getStatus();
        setHealthAvailable(status.available);
        if (status.authorized) {
          setHealthPermission(true);
          loadHealthWorkouts(false);
        }
      } else if (Platform.OS === 'android') {
        const status = healthConnectService.getStatus();
        setHealthAvailable(status.available);
        if (status.authorized) {
          setHealthPermission(true);
          loadHealthWorkouts(false);
        }
      }
    } catch (error) {
      console.error('[UnifiedWorkouts] Error checking health permission:', error);
    }
  };

  const loadHealthWorkouts = async (showLoading: boolean = false) => {
    if (showLoading) setIsHealthSyncing(true);
    try {
      let workouts: Workout[] = [];
      if (Platform.OS === 'ios') {
        const cached = await healthKitService.getCachedWorkouts();
        if (cached && cached.length > 0) {
          workouts = transformHealthKitWorkouts(cached);
          setHealthWorkouts(workouts);
        }
        const fresh = await healthKitService.getRecentWorkouts(userId, 30);
        if (fresh) { workouts = fresh; setHealthWorkouts(workouts); }
      } else if (Platform.OS === 'android') {
        const cached = await healthConnectService.getCachedWorkouts();
        if (cached && cached.length > 0) {
          workouts = transformHealthConnectWorkouts(cached);
          setHealthWorkouts(workouts);
        }
        const fresh = await healthConnectService.getRecentWorkouts(userId, 30);
        if (fresh) { workouts = fresh; setHealthWorkouts(workouts); }
      }
    } catch (error) {
      console.error('[UnifiedWorkouts] Failed to load health workouts:', error);
    } finally {
      setIsHealthSyncing(false);
    }
  };

  // HealthKit returns startDate/endDate as Date objects; coerce to ISO strings
  // so every Workout in the timeline carries a consistent string timestamp.
  const toIso = (d: any): string =>
    typeof d === 'string' ? d : d ? new Date(d).toISOString() : '';

  const transformHealthKitWorkouts = (cached: any[]): Workout[] =>
    cached.map((w) => ({
      id: w.UUID || w.id || `hk_${Date.now()}`,
      userId, type: (w.activityType || 'running') as Workout['type'],
      source: 'healthkit' as const, duration: w.duration,
      distance: w.totalDistance || 0, calories: w.totalEnergyBurned || 0,
      startTime: toIso(w.startDate), endTime: toIso(w.endDate), syncedAt: new Date().toISOString(),
      metadata: { sourceApp: w.sourceName, healthKitId: w.UUID },
    }));

  const transformHealthConnectWorkouts = (cached: any[]): Workout[] =>
    cached.map((w) => ({
      id: w.id, userId, type: (w.activityType || 'running') as Workout['type'],
      source: 'health_connect' as const, duration: w.duration,
      distance: w.totalDistance || 0, calories: w.totalEnergyBurned || 0,
      startTime: w.startTime, endTime: w.endTime, syncedAt: new Date().toISOString(),
      steps: w.steps, metadata: { sourceApp: w.sourceName, healthConnectId: w.id },
    }));

  const handleConnectHealth = async () => {
    const healthAppName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
    try {
      if (Platform.OS === 'ios') {
        const quickStatus = healthKitService.getStatus();
        if (!quickStatus.available) {
          Toast.show({ type: 'error', text1: 'Not Available', text2: 'Apple Health is not available' });
          return;
        }
        const result = await healthKitService.requestPermissions();
        if (!result.success) {
          Toast.show({ type: 'error', text1: 'Permission Denied', text2: result.error || 'Could not access Apple Health' });
          return;
        }
        setHealthPermission(true);
        await loadHealthWorkouts(true);
        Toast.show({ type: 'success', text1: 'Connected', text2: 'Apple Health synced' });
      } else if (Platform.OS === 'android') {
        const quickStatus = healthConnectService.getStatus();
        if (!quickStatus.available) {
          Toast.show({ type: 'error', text1: 'Not Available', text2: 'Health Connect is not available' });
          return;
        }
        const result = await healthConnectService.requestPermissions();
        if (!result.success) {
          Toast.show({ type: 'error', text1: 'Permission Denied', text2: result.error || 'Could not access Health Connect' });
          return;
        }
        setHealthPermission(true);
        await loadHealthWorkouts(true);
        Toast.show({ type: 'success', text1: 'Connected', text2: 'Health Connect synced' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Connection Failed', text2: `Could not connect to ${healthAppName}` });
    }
  };

  return {
    healthWorkouts,
    healthAvailable,
    healthPermission,
    isHealthSyncing,
    loadHealthWorkouts,
    handleConnectHealth,
  };
}
