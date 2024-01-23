import { useEffect, useRef, useState } from "react";

// Adapted from https://github.com/uidotdev/usehooks/blob/dfa6623fcc2dcad3b466def4e0495b3f38af962b/index.js#L1241C8-L1263C1
export default function useThrottle<T>(value: T, interval = 500) {
  const [throttledValue, setThrottledValue] = useState(value);
  const [isActive, setIsActive] = useState(false);
  const lastUpdated = useRef<number | null>(null);

  useEffect(() => {
    const now = Date.now();

    if (lastUpdated.current && now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
      setIsActive(false);
    } else {
      setIsActive(true);
      const id = window.setTimeout(() => {
        lastUpdated.current = now;
        setThrottledValue(value);
        setIsActive(false);
      }, interval);

      return () => window.clearTimeout(id);
    }
  }, [value, interval]);

  return [throttledValue, isActive];
}
