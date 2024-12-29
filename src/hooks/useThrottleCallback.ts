import { useRef, useCallback } from "react";

/**
 * Invoke a callback function at most one every `interval` milliseconds on both the "leading" and
 * "trailing" edge. The callback will only be invoked on the trailing edge of the timeout if invoked
 * more than once. If invoked multiple times in the window, the last invocation will be executed.
 *
 * @param callback The function to throttle
 * @param interval The number of milliseconds to throttle invocations to.
 * @returns The new throttled function
 */
export default function useThrottleCallback(
  callback: Function,
  interval = 500,
) {
  const lastUpdated = useRef(0);
  const lastTimeout = useRef<number | undefined>();

  const throttled = useCallback(
    (...args: any[]) => {
      const now = Date.now();
      let id: number | undefined;
      if (now >= lastUpdated.current + interval) {
        lastUpdated.current = now;
        callback(...args);
      } else {
        window.clearTimeout(lastTimeout.current);
        lastTimeout.current = window.setTimeout(
          () => {
            lastUpdated.current = now;
            callback(...args);
          },
          lastUpdated.current + interval - now,
        );
      }
    },
    [callback, interval],
  );

  return throttled;
}
