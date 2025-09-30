import { useEffect, useRef } from 'react';

/**
 * Hook that polls a function at regular intervals
 * @param {Function} callback - Function to call on each interval
 * @param {number} delay - Delay in milliseconds (default: 30000 = 30 seconds)
 * @param {Array} dependencies - Dependencies that trigger refresh when changed
 */
export const useAutoRefresh = (callback, delay = 30000, dependencies = []) => {
  const savedCallback = useRef();

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay, ...dependencies]);
};