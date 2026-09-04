import { useState, useEffect } from 'react';

/**
 * Custom React Hook for debouncing fast-changing values (e.g. search inputs).
 * Prevents redundant network requests and high CPU/database overhead.
 *
 * @param {any} value - The input value to debounce
 * @param {number} delay - Delay in milliseconds (default: 350ms)
 * @returns {any} - The debounced value
 */
export function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
