/**
 * useLiveRunMetrics - Live distance/time/pace/elevation for the running tracker
 *
 * Owns the 1s metrics interval that reads SimpleRunTracker's in-memory session,
 * plus the two safeguards that keep it alive on long runs:
 * - foreground sync: restarts the interval and refreshes metrics when the app
 *   returns from the background
 * - liveness check: restarts "zombie" intervals that exist but stopped firing
 *   (Android throttling, iOS spurious background events)
 */

import { useState, useEffect, useRef, type MutableRefObject } from 'react';
import { simpleRunTracker } from '../../services/activity/SimpleRunTracker';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import type { FormattedMetrics } from '../../services/activity/ActivityMetricsService';
import { AppStateManager } from '../../services/core/AppStateManager';

const METRICS_UPDATE_INTERVAL_MS = 1000; // Update metrics every second for running

const EMPTY_METRICS: FormattedMetrics = {
  distance: '0.00 km',
  duration: '0:00',
  pace: '--:--',
  elevation: '0 m',
};

export const formatElapsedTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export function useLiveRunMetrics(
  isTracking: boolean,
  isTrackingRef: MutableRefObject<boolean>
) {
  const [metrics, setMetrics] = useState<FormattedMetrics>(EMPTY_METRICS);
  const [elapsedTime, setElapsedTime] = useState(0);
  const metricsUpdateRef = useRef<NodeJS.Timeout | null>(null);
  // Liveness detection: track when updateMetrics() last actually executed
  // This detects "zombie" intervals that exist but stopped firing (Android throttling)
  const lastMetricsUpdateRef = useRef<number>(Date.now());

  // Read the current session into display metrics. Returns the session read.
  const applySession = () => {
    const session = simpleRunTracker.getCurrentSession(); // synchronous, in-memory
    if (
      session &&
      session.distance !== undefined &&
      session.duration !== undefined
    ) {
      const formatted = activityMetricsService.getFormattedMetrics(
        {
          distance: session.distance,
          duration: session.duration,
          pace: activityMetricsService.calculatePace(session.distance, session.duration),
          elevationGain: session.elevationGain || 0,
        },
        'running'
      );
      formatted.duration = formatElapsedTime(session.duration);

      setMetrics(formatted);
      setElapsedTime(session.duration);
      return { distance: session.distance, duration: session.duration };
    }
    return null;
  };

  const updateMetrics = () => {
    // LIVENESS: Mark that updateMetrics actually executed (for zombie detection)
    lastMetricsUpdateRef.current = Date.now();
    applySession();
  };

  // Safely start the metrics interval (always clears an existing one first)
  const startMetricsInterval = () => {
    if (metricsUpdateRef.current) {
      clearInterval(metricsUpdateRef.current);
    }
    metricsUpdateRef.current = setInterval(() => {
      updateMetrics();
    }, METRICS_UPDATE_INTERVAL_MS);
  };

  const stopMetricsInterval = () => {
    if (metricsUpdateRef.current) {
      clearInterval(metricsUpdateRef.current);
      metricsUpdateRef.current = null;
    }
  };

  const resetMetrics = () => {
    setMetrics(EMPTY_METRICS);
    setElapsedTime(0);
  };

  // Cleanup the interval on unmount
  useEffect(() => {
    return () => {
      if (metricsUpdateRef.current) clearInterval(metricsUpdateRef.current);
    };
  }, []);

  // AppState listener for background/foreground transitions
  useEffect(() => {
    const appStateManager = AppStateManager;
    const unsubscribe = appStateManager.onStateChange(async (isActive) => {
      if (!isActive) {
        // FIX iOS 30-min issue: Don't clear timers on background events —
        // iOS sometimes sends spurious ones while the app is still visible
        setTimeout(() => {
          if (!appStateManager.isActive()) {
            console.log('[RunningTrackerScreen] Confirmed backgrounded');
          }
        }, 500);
      } else if (isActive && isTrackingRef.current) {
        // App returned to foreground - restart timers and sync data
        if (!metricsUpdateRef.current) {
          startMetricsInterval();
        }
        const session = applySession();
        if (session) {
          console.log(
            `[RunningTrackerScreen] ✅ Synced: ${(session.distance / 1000).toFixed(2)} km, ` +
              `${session.duration}s`
          );
        }
      }
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Subscribe only once to avoid race conditions

  // FIX iOS 30-min issue + Android throttling: health check with LIVENESS detection
  useEffect(() => {
    if (!isTracking) return;

    const healthCheckInterval = setInterval(() => {
      // Using a 10s threshold to avoid false positives from GPS delays or React lag
      const timeSinceLastUpdate = Date.now() - lastMetricsUpdateRef.current;
      const isZombieInterval = metricsUpdateRef.current && timeSinceLastUpdate > 10000;

      if (isZombieInterval) {
        console.log(
          `[RunningTrackerScreen] 🧟 ZOMBIE INTERVAL DETECTED - no update for ${(timeSinceLastUpdate / 1000).toFixed(1)}s, restarting...`
        );
        startMetricsInterval();
      }

      // Tracking but the metrics interval is completely dead (null): restart it
      if (isTracking && !metricsUpdateRef.current) {
        console.log('[RunningTrackerScreen] Metrics interval was null, restarting...');
        startMetricsInterval();
      }
    }, 5000);

    return () => {
      clearInterval(healthCheckInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTracking]);

  return {
    metrics,
    elapsedTime,
    updateMetrics,
    startMetricsInterval,
    stopMetricsInterval,
    resetMetrics,
  };
}
