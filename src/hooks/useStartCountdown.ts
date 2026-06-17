/**
 * useStartCountdown — drives the 3 → 2 → 1 → GO! pre-workout countdown.
 *
 * Why a hook: every tracker screen (Running/Cycling/Walking/Hiking) used an
 * identical chain of nested setTimeout calls with no cleanup. If the screen
 * unmounted mid-countdown (the user switches activity on the grid, backgrounds
 * the app, or navigates away), the final timeout still fired and called
 * startTracking() — launching a phantom GPS/foreground-location session with no
 * UI left to pause or stop it. This hook tracks every pending timer and clears
 * them on unmount, so the countdown can never complete after the screen is gone.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type CountdownValue = 3 | 2 | 1 | 'GO' | null;

export function useStartCountdown(onComplete: () => void): {
  countdown: CountdownValue;
  start: () => void;
} {
  const [countdown, setCountdown] = useState<CountdownValue>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Always invoke the latest onComplete without re-creating `start`.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Clear any in-flight timers when the host screen unmounts.
  useEffect(() => clear, [clear]);

  const start = useCallback(() => {
    clear();
    const t = timers.current;
    setCountdown(3);
    t.push(
      setTimeout(() => {
        setCountdown(2);
        t.push(
          setTimeout(() => {
            setCountdown(1);
            t.push(
              setTimeout(() => {
                setCountdown('GO');
                t.push(
                  setTimeout(() => {
                    setCountdown(null);
                    onCompleteRef.current();
                  }, 500) // Show "GO!" for 0.5s
                );
              }, 1000)
            );
          }, 1000)
        );
      }, 1000)
    );
  }, [clear]);

  return { countdown, start };
}
